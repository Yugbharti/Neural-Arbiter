"""
nodes/debater_node.py

Routes the current speaking turn to the correct LLM:
  Agent A  →  Google Gemini 1.5 Flash
  Agent B  →  Groq  Llama 3  8B

Both agents receive:
  • The shared system prompt (dynamic expert persona + debate rules)
  • The full transcript so far (for rebuttals)
  • The latest web search context (for grounding)

The node appends a new entry to `transcript` and flips `current_speaker`
so the graph alternates naturally on every call.

In TEST_MODE both agents return static mock arguments.
"""

from models import DebateState
from config import (
    TEST_MODE,
    GOOGLE_API_KEY, GROQ_API_KEY,
    GEMINI_MODEL, GROQ_MODEL,
    LLM_TEMPERATURE,
)

# ── Dynamic, Role-Agnostic System Prompt ──────────────────────────────────────
_SYSTEM_PROMPT = """You are an elite, world-class expert and a relentless debater. \
Your persona, vocabulary, and analytical framework must automatically adapt to the \
specific DEBATE TOPIC provided by the user. Whether the topic is scientific, \
philosophical, political, or cultural, you must argue with academic rigor, brutal \
logic, and deep domain expertise. 

RULES:
1. Ground every argument in established facts, logic, and the provided WEB RESEARCH CONTEXT.
2. Directly attack your opponent's premises and expose their logical fallacies ruthlessly.
3. Do not use fluff, filler words, or introductory pleasantries.
4. Keep your response to 3–5 dense, high-impact sentences — prioritize quality and structural soundness over length."""


# ── TEST MODE mocks (Updated to be generic) ───────────────────────────────────
_MOCK_ARGS = {
    "Agent A": (
        "The foundational premise of my opponent's argument ignores the primary empirical data. "
        "When we analyze the core variables within the provided context, the systemic constraints "
        "clearly dictate an alternative outcome. The established theoretical models support this trajectory "
        "without requiring the logical leaps my opponent is making. Therefore, the position holds strong "
        "under rigorous scrutiny."
    ),
    "Agent B": (
        "Your reliance on those specific models represents a fundamental category error. "
        "By selectively interpreting the available context, you are ignoring the secondary cascading effects "
        "that inevitably undermine your conclusion. A truly rigorous analysis of the boundary conditions "
        "reveals that your proposed framework is fundamentally unsustainable. This is not a matter of interpretation; "
        "it is a structural failure in your logic."
    ),
}


def _build_human_prompt(agent_name: str, topic: str, transcript: list, web_context: list) -> str:
    """Assembles the full user-turn message the LLM will respond to."""

    # Format transcript history
    if transcript:
        history_lines = "\n".join(
            f"  [{entry['speaker']}]: {entry['argument']}"
            for entry in transcript[-6:]  # last 3 full exchanges keeps context tight
        )
        history_block = f"--- TRANSCRIPT (most recent exchanges) ---\n{history_lines}\n"
    else:
        history_block = "--- TRANSCRIPT ---\n(You are opening the debate. Set a strong foundation for your position.)\n"

    # Format web context
    if web_context:
        context_lines = "\n".join(f"  • {snippet}" for snippet in web_context)
        context_block = f"--- WEB RESEARCH CONTEXT ---\n{context_lines}\n"
    else:
        context_block = ""

    opponent = "Agent B" if agent_name == "Agent A" else "Agent A"

    return (
        f"DEBATE TOPIC: {topic}\n\n"
        f"You are {agent_name}. Your opponent is {opponent}.\n\n"
        f"{history_block}\n"
        f"{context_block}\n"
        "Deliver your next argument. Attack the opponent's last point directly "
        "if one exists. Be precise, cite the context where relevant, and make "
        "every sentence count."
    )


def _call_gemini(human_prompt: str) -> str:
    """Agent A — Google Gemini 1.5 Flash."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.messages import SystemMessage, HumanMessage

    llm = ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        temperature=LLM_TEMPERATURE,
        google_api_key=GOOGLE_API_KEY,
    )
    response = llm.invoke([
        SystemMessage(content=_SYSTEM_PROMPT),
        HumanMessage(content=human_prompt),
    ])
    return response.content.strip()


def _call_groq(human_prompt: str) -> str:
    """Agent B — Llama 3 8B via Groq."""
    from langchain_groq import ChatGroq
    from langchain_core.messages import SystemMessage, HumanMessage

    llm = ChatGroq(
        model=GROQ_MODEL,
        temperature=LLM_TEMPERATURE,
        groq_api_key=GROQ_API_KEY,
    )
    response = llm.invoke([
        SystemMessage(content=_SYSTEM_PROMPT),
        HumanMessage(content=human_prompt),
    ])
    return response.content.strip()


def debater_node(state: DebateState) -> dict:
    """
    LangGraph node.
    Reads `current_speaker`, generates the argument, appends to `transcript`,
    and flips the speaker for the next round.
    """
    agent     = state["current_speaker"]
    topic     = state["topic"]
    transcript  = state.get("transcript", [])
    web_context = state.get("web_context", [])

    next_speaker = "Agent B" if agent == "Agent A" else "Agent A"

    if TEST_MODE:
        print(f"[debater_node] TEST_MODE — {agent} returns mock argument.")
        argument = _MOCK_ARGS.get(agent, f"[{agent}] Mock argument placeholder.")
    else:
        human_prompt = _build_human_prompt(agent, topic, transcript, web_context)
        print(f"[debater_node] Calling LLM for {agent}...")

        try:
            argument = _call_gemini(human_prompt) if agent == "Agent A" else _call_groq(human_prompt)
            print(f"[debater_node] {agent} responded ({len(argument)} chars).")
        except Exception as exc:
            print(f"[debater_node] LLM call failed for {agent}: {exc}")
            argument = f"[{agent}] Error generating argument: {exc}"

    new_entry = {"speaker": agent, "argument": argument}

    # `transcript` uses operator.add reducer — return the delta only
    return {
        "transcript":       [new_entry],
        "current_speaker":  next_speaker,
    }