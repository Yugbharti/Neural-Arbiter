"""
nodes/judge_node.py

The Judge evaluates arguments and outputs structured JSON.
Updated: Primary LLM is Gemini 1.5 Flash, with an automatic fallback to Groq (Llama 3).
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field

from models import DebateState
from config import (
    TEST_MODE,
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


# ── TEST MODE mocks (Updated to be generic) ────────────────────────────────────
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
def _invoke_with_fallback(prompt_messages, schema_class):
    """Attempts Gemini first, falls back to Groq if it fails."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_groq import ChatGroq

    try:
        # Try Primary: Gemini
        print("[judge] Attempting Primary LLM (Gemini)...")
        llm_gemini = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            temperature=JUDGE_TEMPERATURE,
            google_api_key=GOOGLE_API_KEY,
        )
        structured_llm = llm_gemini.with_structured_output(schema_class)
        return structured_llm.invoke(prompt_messages)
        
    except Exception as e1:
        print(f"[judge] Gemini failed: {e1}. Initiating Groq Fallback...")
        
        # Try Fallback: Groq
        try:
            llm_groq = ChatGroq(
                model=GROQ_MODEL,
                temperature=JUDGE_TEMPERATURE,
                groq_api_key=GROQ_API_KEY,
            )
            structured_llm = llm_groq.with_structured_output(schema_class)
            return structured_llm.invoke(prompt_messages)
            
        except Exception as e2:
            print(f"[judge] Groq fallback also failed: {e2}")
            raise Exception("Both Gemini and Groq failed to generate structured output.")


# ── Round-by-Round Judge Node ──────────────────────────────────────────────────
# Updated to be a generic, domain-agnostic arbiter
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

    if TEST_MODE:
        print(f"[judge_node] TEST_MODE — returning mock verdict for round {round_num}.")
        verdict = _mock_verdict(round_num)
    else:
        try:
            from langchain_core.messages import SystemMessage, HumanMessage
            messages = [
                SystemMessage(content=_JUDGE_SYSTEM),
                HumanMessage(content=_build_judge_prompt(state, round_num)),
            ]
            verdict: JudgeVerdict = _invoke_with_fallback(messages, JudgeVerdict)
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
    if TEST_MODE:
        print("[final_verdict_node] TEST_MODE — returning mock structured verdict.")
        verdict_data = {
            "analysis": "Agent A provided strong theoretical frameworks, while Agent B successfully grounded the debate in practical limitations.",
            "confidence": 88,
            "bias": "Agent A leaned towards theoretical idealism, whereas Agent B anchored their arguments in empirical skepticism.",
            "conclusion": "While the proposed model holds conceptual promise, the practical implementation remains highly improbable under current constraints."
        }
    else:
        print("[final_verdict_node] Requesting Final Verdict...")
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
            
            result: FinalVerdictOutput = _invoke_with_fallback(messages, FinalVerdictOutput)
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