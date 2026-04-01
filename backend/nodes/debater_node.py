import asyncio
from typing import Dict, Any
from models import DebateState
from config import TEST_MODE

async def debater_node(state: DebateState) -> Dict[str, Any]:
    speaker = state.get("current_speaker", "Agent A")
    topic = state.get("topic", "default topic")
    
    if TEST_MODE:
        await asyncio.sleep(0.5)
        # Mocking argument text
        argument_text = (f"As {speaker}, I believe {topic} deserves our utmost scrutiny. "
                         f"Lorem ipsum dolor sit amet, consectetur adipiscing elit. "
                         f"The provided web context supports my assertion.")
        
        # Updating the transcript
        new_transcript_entry = {"speaker": speaker, "text": argument_text}
        
        # We append to the transcript
        return {"transcript": [new_transcript_entry]}
        
    # Real LLM calling logic (Google, Groq, depending on speaker) later
    return {}
