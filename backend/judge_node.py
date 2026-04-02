"""
nodes/judge_node.py

The Judge evaluates arguments and outputs structured JSON.
Primary LLM is Gemini, with an automatic fallback to Groq (Llama 3).

Test mode is triggered by EITHER:
  1. config.py TEST_MODE = True  (server-side .env)
  2. state["user_keys"]["is_test_mode"] = True  (client-side debug button)
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field

from models import DebateState
from config import (
    TEST_MODE as SERVER_TEST_MODE,
    GOOGLE_API_KEY, GEMINI_MODEL,
    GROQ_API_KEY, GROQ_MODEL,
    JUDGE_TEMPERATURE,
)

# ── Pydantic schema for ROUNDS ───────────────────────────────
class ArgumentNode(BaseModel):
    id:        str = Field(description="Unique node id, e.g. 'A-R1' for Agent A round 1")
    speaker:   str = Field(description="'Agent A' or 'Agent B'")
    claim:     str = Field(description="One-sentence summary of the core claim")
    strength:  str = Field(description="One of: 'strong' | 'moderate' | 'weak'")
    fallacy:   str = Field(description="Name of any logical fallacy used, or 'none'")

class JudgeVerdict(BaseModel):
    score_agent_a: int = Field(ge=0, le=100, description="Credibility score 0-100 for Agent A")
    score_agent_b: int = Field(ge=0, le=100, description="Credibility score 0-100 for Agent B")
    bias_detected: str = Field(description="One-sentence observation about rhetorical bias.")
    argument_nodes: List[ArgumentNode] = Field(description="Exactly two nodes.")
    round_summary: str = Field(description="Two-sentence academic summary of this round's exchange")


# ── Pydantic schema for FINAL VERDICT ────────────────────────
class FinalVerdictOutput(BaseModel):
    analysis: str = Field(description="Comprehensive final analysis summarizing the strongest points made by both sides.")
    confidence: int = Field(description="Confidence score (0-100) in the final conclusion based on the evidence presented.")
    bias: str = Field(description="An overarching analysis of the biases, fallacies, or rhetorical leans exhibited during the debate.")
    conclusion: str = Field(description="The definitive, bottom-line answer to the debate topic.")


# ── Effective test mode check (respects BOTH server + client flags) ────────────
def _is_test_mode(state: DebateState) -> bool:
    """
    Returns True if test mode is active from ANY source:
      1. Server-side: config.py TEST_MODE = True
      2. Client-side: state["user_keys"]["is_test_mode"] = True
    """
    if SERVER_TEST_MODE:
        return True
    user_keys = state.get("user_keys")
    if user_keys and user_keys.get("is_test_mode", False):
        return True
    return False


# ── TEST MODE mocks ────────────────────────────────────────────────────────────
def _mock_verdict(round_num: int) -> JudgeVerdict:
    return JudgeVerdict(
        score_agent_a=72,
        score_agent_b=65,
        bias_detected="Agent B employed a minor 'appeal to incredulity' regarding the proposed framework.",
        argument_nodes=[
            ArgumentNode(id=f"A-R{round_num}", speaker="Agent A", claim="The proposed model is structurally viable based on current data.", strength="moderate", fallacy="none"),
            ArgumentNode(id=f"B-R{round_num}", speaker="Agent B", claim="Historical precedents suggest the implementation is unfeasible.", strength="strong", fallacy="appeal to incredulity"),
        ],
        round_summary=f"Round {round_num} saw Agent A advance a logically sound proposal, while Agent B countered by highlighting practical constraints."
    )


# ── THE FALLBACK ENGINE ────────────────────────────────────────────────────────
def _invoke_with_fallback(prompt_messages, schema_class, state: DebateState):
    """
    Attempts Gemini first, falls back to Groq if it fails.
    Uses BYOK keys from state["user_keys"] if available, otherwise env keys.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_groq import ChatGroq

    # Resolve keys — prefer BYOK, fall back to env
    user_keys = state.get("user_keys")
    google_key = (user_keys.get("GOOGLE_API_KEY", "") if user_keys else "") or GOOGLE_API_KEY
    groq_key   = (user_keys.get("GROQ_API_KEY", "")   if user_keys else "") or GROQ_API_KEY

    try:
        print("[judge] Attempting Primary LLM (Gemini)...")
        llm_gemini = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            temperature=JUDGE_TEMPERATURE,
            google_api_key=google_key,
        )
        structured_llm = llm_gemini.with_structured_output(schema_class)
        return structured_llm.invoke(prompt_messages)

    except Exception as e1:
        print(f"[judge] Gemini failed: {e1}. Initiating Groq Fallback...")

        try:
            llm_groq = ChatGroq(
                model=GROQ_MODEL,
                temperature=JUDGE_TEMPERATURE,
                groq_api_key=groq_key,
            )
            structured_llm = llm_groq.with_structured_output(schema_class)
            return structured_llm.invoke(prompt_messages)

        except Exception as e2:
            print(f"[judge] Groq fallback also failed: {e2}")
            raise Exception("Both Gemini and Groq failed to generate structured output.")


# ── Round-by-Round Judge Node ──────────────────────────────────────────────────
_JUDGE_SYSTEM = """You are an elite, impartial analytical judge. \
Your sole function is to rigorously evaluate arguments on logical coherence, \
structural soundness, and evidential support, automatically adapting your analytical \
framework to the specific domain of the debate."""

def _build_judge_prompt(state: DebateState, round_num: int) -> str:
    transcript = state.get("transcript", [])
    recent = transcript[-2:] if len(transcript) >= 2 else transcript
    exchange = "\n".join(f"[{e['speaker']}]: {e['argument']}" for e in recent)
    return f"DEBATE TOPIC: {state['topic']}\nROUND: {round_num}\n\n--- THIS ROUND'S EXCHANGE ---\n{exchange}\n\nEvaluate both arguments."

def judge_node(state: DebateState) -> dict:
    rounds_completed = state.get("rounds_completed", 0)
    round_num = rounds_completed + 1
    test_mode = _is_test_mode(state)

    # Determine source for logging
    user_keys = state.get("user_keys")
    source = (
        "server .env"   if SERVER_TEST_MODE else
        "client BYOK"   if (user_keys and user_keys.get("is_test_mode")) else
        "LIVE"
    )

    if test_mode:
        print(f"[judge_node] ✅✅✅ MOCK MODE (via {source}) — returning mock verdict for round {round_num}. NO LLM call. ✅✅✅")
        verdict = _mock_verdict(round_num)
    else:
        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            print(f"[judge_node] 🔴 LIVE — calling LLM for round {round_num} verdict...")
            messages = [
                SystemMessage(content=_JUDGE_SYSTEM),
                HumanMessage(content=_build_judge_prompt(state, round_num)),
            ]
            verdict: JudgeVerdict = _invoke_with_fallback(messages, JudgeVerdict, state)
            print(f"[judge_node] Verdict received: A={verdict.score_agent_a}, B={verdict.score_agent_b}")
        except Exception as exc:
            print(f"[judge_node] Fallback chain failed completely: {exc}. Using mock fallback.")
            verdict = _mock_verdict(round_num)

    existing_scores = dict(state.get("credibility_scores", {"Agent A": [], "Agent B": []}))
    existing_scores["Agent A"] = existing_scores.get("Agent A", []) + [verdict.score_agent_a]
    existing_scores["Agent B"] = existing_scores.get("Agent B", []) + [verdict.score_agent_b]

    new_argument_nodes = [node.model_dump() for node in verdict.argument_nodes]

    return {
        "credibility_scores": existing_scores,
        "argument_nodes":     new_argument_nodes,
        "latest_bias":        verdict.bias_detected,
        "rounds_completed":   round_num,
        "round_summary":      verdict.round_summary,
    }


# ── FINAL VERDICT NODE ─────────────────────────────────────────────────────────
def final_verdict_node(state: DebateState) -> dict:
    test_mode = _is_test_mode(state)

    # Determine source for logging
    user_keys = state.get("user_keys")
    source = (
        "server .env"   if SERVER_TEST_MODE else
        "client BYOK"   if (user_keys and user_keys.get("is_test_mode")) else
        "LIVE"
    )

    if test_mode:
        print(f"[final_verdict_node] ✅✅✅ MOCK MODE (via {source}) — returning mock verdict. NO LLM call. ✅✅✅")
        verdict_data = {
            "analysis": "Agent A provided strong theoretical frameworks, while Agent B successfully grounded the debate in practical limitations.",
            "confidence": 88,
            "bias": "Agent A leaned towards theoretical idealism, whereas Agent B anchored their arguments in empirical skepticism.",
            "conclusion": "While the proposed model holds conceptual promise, the practical implementation remains highly improbable under current constraints."
        }
    else:
        print("[final_verdict_node] 🔴 LIVE — calling LLM for final verdict...")
        try:
            from langchain_core.messages import SystemMessage, HumanMessage

            transcript = state.get("transcript", [])
            full_debate = "\n".join(f"[{e['speaker']}]: {e['argument']}" for e in transcript)

            prompt = (
                f"DEBATE TOPIC: {state['topic']}\n\n"
                f"--- FULL DEBATE TRANSCRIPT ---\n{full_debate}\n\n"
                "The debate has concluded. As the impartial Judge, provide a definitive FINAL VERDICT "
                "by filling out the required schema perfectly."
            )

            messages = [
                SystemMessage(content=_JUDGE_SYSTEM),
                HumanMessage(content=prompt),
            ]

            result: FinalVerdictOutput = _invoke_with_fallback(messages, FinalVerdictOutput, state)
            verdict_data = result.model_dump()
            print("[final_verdict_node] Structured Final Verdict generated successfully.")

        except Exception as exc:
            print(f"[final_verdict_node] Fallback chain failed: {exc}")
            verdict_data = {
                "analysis": "Error generating analysis due to API failure.",
                "confidence": 0,
                "bias": "Error.",
                "conclusion": "Failed to synthesize final output."
            }

    return {
        "final_verdict": verdict_data
    }