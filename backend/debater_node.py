"""
nodes/debater_node.py

Key-priority contract (evaluated in this order on every call):
  1. If state["user_keys"]["is_test_mode"] is True  → force TEST_MODE; return mock.
  2. If state["user_keys"] contains real API keys    → use them to instantiate LLMs.
  3. If state["user_keys"] is None                   → fall back to config.py env vars.
  4. If config.py TEST_MODE is True                  → return mock (server-side toggle).

A RuntimeError tripwire sits directly above every real LLM call. If execution
reaches it while any form of test-mode is active, the process crashes loudly.

Mock messages are prefixed with [MOCK ROUND X — AGENT A/B] for visual confirmation
in the chat panel that no real API is being called.
"""

from models import DebateState
from config import (
    TEST_MODE as SERVER_TEST_MODE,
    GOOGLE_API_KEY as ENV_GOOGLE_KEY,
    GROQ_API_KEY   as ENV_GROQ_KEY,
    GEMINI_MODEL,
    GROQ_MODEL,
    LLM_TEMPERATURE,
)

_TEST_SENTINEL = "TEST_KEY"

# ── System prompt (shared) ────────────────────────────────────────────────────
_SYSTEM_PROMPT = """You are an elite, world-class expert and a relentless debater. \
Your persona, vocabulary, and analytical framework must automatically adapt to the \
specific DEBATE TOPIC provided by the user. Whether the topic is scientific, \
philosophical, political, or cultural, you must argue with academic rigor, brutal \
logic, and deep domain expertise.

RULES:
1. Ground every argument in established facts, logic, and the provided WEB RESEARCH CONTEXT.
2. Directly attack your opponent's premises and expose their logical fallacies ruthlessly.
3. Do not use fluff, filler words, or introductory pleasantries.
4. Keep your response to 3–5 dense, high-impact sentences — prioritise quality and \
structural soundness over length."""


# ── Key resolution ────────────────────────────────────────────────────────────
def _resolve_keys(user_keys: dict | None) -> tuple[bool, str, str]:
    """
    Returns (is_test_mode, google_key, groq_key).

    Priority:
      1. user_keys["is_test_mode"] == True  → test mode ON
      2. user_keys contains valid keys      → use them
      3. user_keys is None                  → fall back to env vars
      4. SERVER_TEST_MODE                   → test mode ON
    """
    if user_keys is not None:
        if user_keys.get("is_test_mode", False):
            return True, _TEST_SENTINEL, _TEST_SENTINEL

        g_key = user_keys.get("GOOGLE_API_KEY", "").strip()
        q_key = user_keys.get("GROQ_API_KEY",   "").strip()

        # Guard: if sentinel leaked into a non-test-mode path, treat as test mode
        if g_key == _TEST_SENTINEL or q_key == _TEST_SENTINEL:
            return True, _TEST_SENTINEL, _TEST_SENTINEL

        if g_key and q_key:
            return False, g_key, q_key

        # Partial keys — fall through to env
        print("[debater_node] ⚠️  Partial BYOK keys — falling back to env vars.")

    # No user_keys → server env
    if SERVER_TEST_MODE:
        return True, _TEST_SENTINEL, _TEST_SENTINEL

    return False, ENV_GOOGLE_KEY, ENV_GROQ_KEY


# ── Prompt builder ────────────────────────────────────────────────────────────
def _build_human_prompt(
    agent_name: str, topic: str, transcript: list, web_context: list
) -> str:
    if transcript:
        history_lines = "\n".join(
            f"  [{e['speaker']}]: {e['argument']}" for e in transcript[-6:]
        )
        history_block = f"--- TRANSCRIPT (most recent exchanges) ---\n{history_lines}\n"
    else:
        history_block = "--- TRANSCRIPT ---\n(You are opening the debate.)\n"

    context_block = "\n".join(f"  • {s}" for s in web_context) if web_context else ""

    return (
        f"TOPIC: {topic}\n\n"
        f"{history_block}\n"
        f"{context_block}\n"
        f"Deliver your next argument."
    )


# ── LLM wrappers ─────────────────────────────────────────────────────────────
def _call_gemini(human_prompt: str, api_key: str) -> str:
    # ⚠️  TRIPWIRE — must never be called in any test-mode path
    if api_key == _TEST_SENTINEL or SERVER_TEST_MODE:
        raise RuntimeError(
            "[_call_gemini] TRIPWIRE: called with TEST_SENTINEL or SERVER_TEST_MODE=True. "
            "This is a bug — check _resolve_keys()."
        )

    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import SystemMessage, HumanMessage

    llm = ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        temperature=LLM_TEMPERATURE,
        google_api_key=api_key,
    )
    return llm.invoke(
        [SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=human_prompt)]
    ).content.strip()


def _call_groq(human_prompt: str, api_key: str) -> str:
    # ⚠️  TRIPWIRE — must never be called in any test-mode path
    if api_key == _TEST_SENTINEL or SERVER_TEST_MODE:
        raise RuntimeError(
            "[_call_groq] TRIPWIRE: called with TEST_SENTINEL or SERVER_TEST_MODE=True. "
            "This is a bug — check _resolve_keys()."
        )

    from langchain_groq import ChatGroq
    from langchain_core.messages import SystemMessage, HumanMessage

    llm = ChatGroq(
        model=GROQ_MODEL,
        temperature=LLM_TEMPERATURE,
        groq_api_key=api_key,
    )
    return llm.invoke(
        [SystemMessage(content=_SYSTEM_PROMPT), HumanMessage(content=human_prompt)]
    ).content.strip()


# ── Main node function ────────────────────────────────────────────────────────
def debater_node(state: DebateState) -> dict:
    agent       = state["current_speaker"]
    topic       = state["topic"]
    transcript  = state.get("transcript",  [])
    web_context = state.get("web_context", [])
    user_keys   = state.get("user_keys",   None)

    turn_num     = state.get("rounds_completed", 0) + 1
    next_speaker = "Agent B" if agent == "Agent A" else "Agent A"

    # ── Resolve which key source / mode to use ────────────────────────────────
    is_test_mode, google_key, groq_key = _resolve_keys(user_keys)

    key_source = (
        "BYOK-test-sentinel" if (user_keys is not None and is_test_mode) else
        "server-TEST_MODE"   if (user_keys is None     and is_test_mode) else
        "BYOK-user-keys"     if (user_keys is not None) else
        "server-env-keys"
    )

    # ── TEST MODE BRANCH — returns immediately ────────────────────────────────
    if is_test_mode:
        print(
            f"[debater_node] 🟡 TEST_MODE ({key_source}) — {agent} "
            f"returning MOCK argument for Turn {turn_num}. No API call made."
        )

        if agent == "Agent A":
            argument = (
                f"[MOCK ROUND {turn_num} — AGENT A | src:{key_source}] "
                f"The foundational premise of '{topic}' exposes a core structural "
                f"inefficiency in the opposing framework. Established theoretical "
                f"models unambiguously support my trajectory: empirical data shows "
                f"a 3-sigma deviation favouring the pro-position. Your counter-claim "
                f"relies on an unfalsifiable axiom and collapses under Popperian scrutiny."
            )
        else:
            argument = (
                f"[MOCK ROUND {turn_num} — AGENT B | src:{key_source}] "
                f"I must counter your analysis directly. By cherry-picking theoretical "
                f"models you systematically ignore secondary cascading effects documented "
                f"in peer-reviewed literature. The causal chain you propose conflates "
                f"correlation with causation — a classic post hoc fallacy that invalidates "
                f"your entire line of reasoning."
            )

        return {
            "transcript":      [{"speaker": agent, "argument": argument}],
            "current_speaker": next_speaker,
        }

    # ── LIVE BRANCH ───────────────────────────────────────────────────────────
    print(
        f"[debater_node] 🟢 LIVE ({key_source}) — calling LLM for {agent} "
        f"(Turn {turn_num})..."
    )

    try:
        prompt   = _build_human_prompt(agent, topic, transcript, web_context)
        argument = (
            _call_gemini(prompt, google_key) if agent == "Agent A"
            else _call_groq(prompt, groq_key)
        )
    except Exception as exc:
        argument = f"[{agent}] ⚠️  Error generating argument: {exc}"
        print(f"[debater_node] ERROR: {exc}")

    return {
        "transcript":      [{"speaker": agent, "argument": argument}],
        "current_speaker": next_speaker,
    }