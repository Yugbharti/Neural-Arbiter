"""
models.py — LangGraph state schema for the Debate Agent.

operator.add fields accumulate across graph steps (delta-based updates).
All other fields are replaced wholesale on each node return.
"""

from typing import TypedDict, List, Dict, Any, Optional, Annotated
import operator


class DebateState(TypedDict):
    topic:              str

    # Which agent speaks next: "Agent A" | "Agent B" | "Human"
    current_speaker:    str

    # Full conversation history — each node appends its delta
    transcript:         Annotated[List[Dict[str, str]], operator.add]

    # Argument graph nodes — appended by the judge each round
    argument_nodes:     Annotated[List[Dict[str, Any]], operator.add]

    # { "Agent A": [72, 68, ...], "Agent B": [65, 71, ...] }
    credibility_scores: Dict[str, List[int]]

    # Latest web search snippets — replaced each round
    web_context:        List[str]

    # Counter incremented by judge_node
    rounds_completed:   int

    # One-line bias/fallacy observation from the judge — replaced each round
    latest_bias:        Optional[str]

    # Two-sentence round summary from the judge — replaced each round
    # (new field — frontend may display this below the scoreboard)
    round_summary:      Optional[str]

 

    # The new structured final verdict dictionary
    final_verdict:      Optional[Dict[str, Any]]