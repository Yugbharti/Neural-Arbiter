"""
models.py — LangGraph state schema for the Debate Agent.

Key design decisions:
  - transcript uses Annotated[list, operator.add] so each node APPENDS
    its new entry rather than replacing the whole list. Without this,
    LangGraph's reducer would overwrite state on every step and you'd
    only ever see the last two messages.
  - argument_nodes follows the same pattern so the graph visualisation
    accumulates nodes across rounds.
  - HITL fields (is_human_mode, human_input) are plain values that the
    main.py WebSocket loop writes via debate_graph.update_state().
"""

from typing import TypedDict, List, Dict, Any, Optional, Annotated
import operator


class DebateState(TypedDict):
    # ── Core debate fields ────────────────────────────────────────────────────
    topic:              str
    current_speaker:    str

    # operator.add reducer: every node returns a *list of new entries*.
    # LangGraph concatenates rather than replaces, so history is preserved
    # across all 4 turns (Agent A → B → A → B).
    transcript:         Annotated[List[Dict[str, str]], operator.add]
    argument_nodes:     Annotated[List[Dict[str, Any]], operator.add]

    # ── Scoring / analysis ────────────────────────────────────────────────────
    credibility_scores: Dict[str, List[int]]   # {"Agent A": [7, 8, ...], ...}
    web_context:        List[str]              # snippets from search_node
    rounds_completed:   int
    latest_bias:        Optional[str]
    round_summary:      Optional[str]
    final_verdict:      Optional[Dict[str, Any]]

    # ── Human-in-the-Loop (HITL) ──────────────────────────────────────────────
    # is_human_mode: when True, "Agent B" turns are replaced by a human_node
    #   interrupt so the user can type their own argument via the WebSocket.
    # human_input:   the raw text injected by main.py after the interrupt fires.
    #   Cleared back to "" by human_node once consumed.
    is_human_mode:      bool
    human_input:        str

    # ── Bring Your Own Key (BYOK) ─────────────────────────────────────────────
    # Populated from the WebSocket start payload; None when the client sends
    # no keys (server falls back to env-var config).
    # Shape: { "GOOGLE_API_KEY": str, "GROQ_API_KEY": str, "is_test_mode": bool }
    user_keys:          Optional[Dict[str, Any]]