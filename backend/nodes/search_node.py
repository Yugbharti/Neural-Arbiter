import asyncio
from typing import Dict, Any
from models import DebateState
from config import TEST_MODE

async def search_node(state: DebateState) -> Dict[str, Any]:
    if TEST_MODE:
        await asyncio.sleep(0.5)
        topic = state.get("topic", "the subject")
        # Mock web context returning strings
        mock_context = [
            f"Mock article 1 about {topic}: Several sources verify the facts.",
            f"Mock snippet 2: Studies show a strong correlation in recent years.",
            f"Mock news 3: Experts debate the nuances of {topic} globally."
        ]
        return {"web_context": mock_context}
        
    # Real duckduckgo-search logic here later
    return {}
