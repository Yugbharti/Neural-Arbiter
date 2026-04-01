"""
nodes/search_node.py

Fetches real-time web context for the current debate topic using DuckDuckGo.
Returns the top SEARCH_MAX_RESULTS snippets as a list of plain strings so
they can be injected verbatim into the debater and judge prompts.

In TEST_MODE the node returns hardcoded context so the rest of the graph
can be exercised without network calls.
"""

from models import DebateState
from config import TEST_MODE, SEARCH_MAX_RESULTS


# ── TEST MODE mock ─────────────────────────────────────────────────────────────
_MOCK_CONTEXT = [
    (
        "[Mock Source 1] General Relativity predicts that mass curves spacetime. "
        "Negative mass, if it exists, would curve spacetime in the opposite direction, "
        "potentially enabling repulsive gravitational effects — the theoretical basis for antigravity."
    ),
    (
        "[Mock Source 2] The Casimir effect demonstrates that quantum vacuum fluctuations "
        "produce measurable forces between uncharged plates. Some theorists propose analogous "
        "mechanisms could, in principle, modulate gravitational coupling constants."
    ),
    (
        "[Mock Source 3] Alcubierre's 1994 paper outlined a metric allowing faster-than-light "
        "travel by contracting spacetime ahead and expanding it behind a vessel — "
        "requiring exotic matter with negative energy density, making antigravity adjacent."
    ),
]


def _live_search(topic: str) -> list[str]:
    """Runs a DuckDuckGo text search and returns clean snippet strings."""
    from duckduckgo_search import DDGS

    snippets: list[str] = []
    query = f"antigravity {topic} theoretical physics research 2024"

    with DDGS() as ddgs:
        for result in ddgs.text(query, max_results=SEARCH_MAX_RESULTS):
            title = result.get("title", "Unknown Source")
            body  = result.get("body",  "").strip()
            url   = result.get("href",  "")
            if body:
                snippets.append(f"[{title}] {body}  (source: {url})")

    return snippets if snippets else ["[Search] No results returned for this query."]


def search_node(state: DebateState) -> dict:
    """
    LangGraph node.  Updates `web_context` in state.
    Called once per round before the debaters speak.
    """
    topic = state["topic"]

    if TEST_MODE:
        print("[search_node] TEST_MODE — returning mock context.")
        web_context = _MOCK_CONTEXT
    else:
        print(f"[search_node] Searching web for: '{topic}'")
        try:
            web_context = _live_search(topic)
            print(f"[search_node] Retrieved {len(web_context)} snippets.")
        except Exception as exc:
            print(f"[search_node] Search failed ({exc}); falling back to mock context.")
            web_context = _MOCK_CONTEXT

    # We replace the full web_context list each round (latest context wins).
    return {"web_context": web_context}