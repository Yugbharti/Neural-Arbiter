"""
main.py — FastAPI + WebSocket entry point.

The WebSocket handler streams every LangGraph state snapshot to the frontend
as it is produced. Now includes a pacing delay to ensure the UI transition 
feels smooth and readable.
"""

import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from graph import debate_graph
from config import TEST_MODE

app = FastAPI(title="Debate Agent API")

# Allow the React dev server to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "status": "Debate Agent backend running",
        "test_mode": TEST_MODE,
    }


@app.websocket("/ws/debate")
async def debate_websocket(websocket: WebSocket):
    await websocket.accept()
    print("[ws] Client connected.")

    try:
        # ── Receive debate config from the client ──────────────────────────────
        data  = await websocket.receive_json()
        topic = data.get("topic", "The theoretical realization of Antigravity")
        is_human_mode = data.get("human_in_loop", False)

        print(f"[ws] Starting: '{topic}' | TEST_MODE={TEST_MODE} | Human Mode={is_human_mode}")

        initial_state = {
            "topic":              topic,
            "current_speaker":    "Agent A",
            "transcript":         [],
            "argument_nodes":     [],
            "credibility_scores": {"Agent A": [], "Agent B": []},
            "web_context":        [],
            "rounds_completed":   0,
            "latest_bias":        None,
            "round_summary":      None,
            "final_verdict":      None,   # Initialized for structured JSON output
        }

        # ── Stream graph execution ─────────────────────────────────────────────
        # stream_mode="values" yields the full merged state after every node.
        async for state_snapshot in debate_graph.astream(
            initial_state, stream_mode="values"
        ):
            # Ensure the snapshot is fully JSON-serializable.
            serialized = _serialize_state(state_snapshot)

            await websocket.send_json({
                "type":  "state_update",
                "state": serialized,
            })

            # ── SMOOTHING DELAY ──
            # Increased from 0.4 to 1.2 seconds so the frontend can animate 
            # each step (charts, nodes, chat) in a way that is human-readable.
            await asyncio.sleep(1.2)

        # ── Debate complete ────────────────────────────────────────────────────
        await websocket.send_json({"type": "debate_ended"})
        print("[ws] Debate complete. Connection closing.")

    except WebSocketDisconnect:
        print("[ws] Client disconnected.")

    except Exception as exc:
        import traceback
        print(f"[ws] Unhandled error: {exc}")
        traceback.print_exc()
        try:
            await websocket.send_json({
                "type":    "error",
                "message": str(exc),
            })
        except Exception:
            pass


def _serialize_state(state: dict) -> dict:
    """
    Converts a LangGraph state snapshot into a plain JSON-serializable dict.
    Handles Pydantic models, operator.add lists, and nested structures.
    """
    def _coerce(obj):
        if obj is None:
            return None
        if isinstance(obj, (str, int, float, bool)):
            return obj
        if isinstance(obj, dict):
            return {k: _coerce(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):
            return [_coerce(i) for i in obj]
        # Pydantic v2
        if hasattr(obj, "model_dump"):
            return _coerce(obj.model_dump())
        # Pydantic v1 / dataclasses
        if hasattr(obj, "__dict__"):
            return _coerce(vars(obj))
        # Last resort
        return str(obj)

    return _coerce(state)


if __name__ == "__main__":
    import uvicorn
    # reload=True ensures the server restarts when you save backend files
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)