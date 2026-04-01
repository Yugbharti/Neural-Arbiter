import asyncio
import random
from typing import Dict, Any
from models import DebateState
from config import TEST_MODE
import uuid

async def judge_node(state: DebateState) -> Dict[str, Any]:
    speaker = state.get("current_speaker", "Agent A")
    transcript = state.get("transcript", [])
    
    if TEST_MODE:
        await asyncio.sleep(0.5)
        last_statement = transcript[-1]["text"][:30] + "..." if transcript else "Unknown statement"
        
        # Generate mock credibility score
        score = random.randint(60, 95)
        scores = state.get("credibility_scores", {"Agent A": [], "Agent B": []})
        scores_copy = {k: list(v) for k, v in scores.items()}
        # Add the score for the current speaker
        if speaker in scores_copy:
            scores_copy[speaker].append(score)
            
        # Mock bias detected
        bias = f"Bias Analysis ({speaker}): Detected mild emotional appeal in latest statement."
        
        # Mock Argument Node to add to the graph
        node_type = "Premise" if len(state.get("argument_nodes", [])) % 2 == 0 else "Rebuttal"
        node_id = f"node_{uuid.uuid4().hex[:8]}"
        new_node = {
            "id": node_id,
            "type": node_type,
            "content": f"{node_type} based on: '{last_statement}'",
            "speaker": speaker
        }
        
        # Switch speaker and increment rounds if B finished
        if speaker == "Agent A":
            next_speaker = "Agent B"
            rounds = state.get("rounds_completed", 0)
        else:
            next_speaker = "Agent A"
            rounds = state.get("rounds_completed", 0) + 1
            
        return {
            "credibility_scores": scores_copy,
            "latest_bias": bias,
            "argument_nodes": [new_node], # operator.add will append this list
            "current_speaker": next_speaker,
            "rounds_completed": rounds
        }
        
    # Real Claude 3 Haiku logic later
    return {}
