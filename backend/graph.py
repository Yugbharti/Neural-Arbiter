"""
graph.py — LangGraph workflow definition for Neural Arbiter.

Turn structure (MAX 4 agent turns before finalize):
  search → debater (A) → judge → debater (B) [or human_node] → judge
         → debater (A) → judge → debater (B) [or human_node] → judge
         → final_verdict → END

debate_router runs after every judge step and decides:
  • "debater"    — AI continues (rounds_completed < 4, next speaker is A or B in AI mode)
  • "human_node" — Human's turn (next speaker is B AND is_human_mode=True)
  • "finalize"   — rounds_completed >= 4 → go to final_verdict

The graph is compiled with interrupt_before=["human_node"] so LangGraph
pauses execution there and the main.py WebSocket loop can inject
human_input before resuming.
"""

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from models import DebateState
from search_node import search_node
from debater_node import debater_node
from judge_node import judge_node, final_verdict_node


# ─── Human Node ───────────────────────────────────────────────────────────────
def human_node(state: DebateState) -> dict:
    """
    Consumes the human_input injected by main.py after the interrupt fires.
    Appends it to the transcript as speaker "Human" and hands the turn back
    to Agent A for the next AI round.
    """
    human_text = state.get("human_input") or "(no input provided)"
    print(f"[human_node] Consuming human input: '{human_text[:80]}...'")

    return {
        "transcript":      [{"speaker": "Human", "argument": human_text}],
        "current_speaker": "Agent A",   # AI picks up from here
        "human_input":     "",          # clear so it isn't re-consumed
    }


# ─── Router ───────────────────────────────────────────────────────────────────
def debate_router(state: DebateState) -> str:
    """
    Called after every judge step.

    Returns one of:
      "finalize"   — 4 agent turns complete
      "human_node" — it's Agent B's turn and human mode is active
      "debater"    — normal AI turn
    """
    rounds_done   = state.get("rounds_completed", 0)
    current       = state.get("current_speaker", "Agent A")
    is_human_mode = state.get("is_human_mode", False)

    print(
        f"[debate_router] rounds_completed={rounds_done} | "
        f"next_speaker={current} | human_mode={is_human_mode}"
    )

    # ── Termination condition: 4 full agent turns have been judged ────────────
    # rounds_completed is incremented by judge_node after EACH turn, so
    # >= 4 means A, B, A, B have all spoken and been scored.
    if rounds_done >= 4:
        print("[debate_router] → finalize")
        return "finalize"

    # ── Human-in-the-Loop: route B's turn to the human_node interrupt ────────
    if current == "Agent B" and is_human_mode:
        print("[debate_router] → human_node (HITL interrupt)")
        return "human_node"

    # ── Default: next AI turn ─────────────────────────────────────────────────
    print("[debate_router] → debater")
    return "debater"


# ─── Graph assembly ───────────────────────────────────────────────────────────
workflow = StateGraph(DebateState)

workflow.add_node("search",         search_node)
workflow.add_node("debater",        debater_node)
workflow.add_node("human_node",     human_node)
workflow.add_node("judge",          judge_node)
workflow.add_node("final_verdict",  final_verdict_node)

# Entry point
workflow.set_entry_point("search")

# Fixed edges
workflow.add_edge("search",     "debater")   # after search, Agent A opens
workflow.add_edge("debater",    "judge")     # every AI turn → judge
workflow.add_edge("human_node", "judge")     # human turn → judge

# Dynamic routing after each judge evaluation
workflow.add_conditional_edges(
    "judge",
    debate_router,
    {
        "debater":    "debater",
        "human_node": "human_node",
        "finalize":   "final_verdict",
    },
)

workflow.add_edge("final_verdict", END)

# ─── Compile ──────────────────────────────────────────────────────────────────
# interrupt_before=["human_node"] pauses graph execution BEFORE the human_node
# runs, giving main.py a chance to await human input and inject it via
# debate_graph.update_state() before calling astream(None, ...) to resume.
memory = MemorySaver()
debate_graph = workflow.compile(
    checkpointer=memory,
    interrupt_before=["human_node"],
)

print("[graph] Debate graph compiled ✓  (interrupt_before=['human_node'])")