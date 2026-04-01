from langgraph.graph import StateGraph, END
from models import DebateState
from search_node import search_node
from debater_node import debater_node
from judge_node import judge_node, final_verdict_node

# 1. Define the Router Logic
def debate_router(state: DebateState):
    """
    Determines if we should continue the loop or go to the final verdict.
    """
    # Set this to 2 to get A -> B -> A -> B (2 full rounds)
    # Each 'round' in our logic usually consists of both agents speaking once.
    if state["rounds_completed"] >= 2:
        return "finalize"
    return "continue"

# 2. Build the Graph
workflow = StateGraph(DebateState)

# Add Nodes
workflow.add_node("search", search_node)
workflow.add_node("debater", debater_node)
workflow.add_node("judge", judge_node)
workflow.add_node("final_verdict", final_verdict_node)

# Define the Flow
workflow.set_entry_point("search")

# Search leads to the first debater
workflow.add_edge("search", "debater")

# After a debater speaks, the Judge MUST evaluate them
workflow.add_edge("debater", "judge")

# ─── THE KEY LOOP LOGIC ───
# After the Judge evaluates, we decide: more debate or finish?
workflow.add_conditional_edges(
    "judge",
    debate_router,
    {
        "continue": "debater",   # Goes back to the next agent
        "finalize": "final_verdict" # Ends the debate and shows the dashboard
    }
)

workflow.add_edge("final_verdict", END)

debate_graph = workflow.compile()