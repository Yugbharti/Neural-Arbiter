"""
main.py — FastAPI + WebSocket entry point for Neural Arbiter.

BYOK additions:
  • The initial JSON payload from the client may include a `user_keys` dict:
      { "GOOGLE_API_KEY": "...", "GROQ_API_KEY": "...", "is_test_mode": bool }
  • If present it is injected directly into `initial_state` and carried
    through the LangGraph thread so every node can access it from `state`.
  • Keys are NEVER logged at full value or persisted — they live only in the
    ephemeral in-memory MemorySaver for the duration of one debate thread.
  • user_keys is STRIPPED from every outbound state_update before it reaches
    the client, so keys are never echoed back over the wire.

WebSocket protocol
──────────────────
Client → Server (start):
  {
    "topic":         "...",
    "human_in_loop": true|false,
    "user_keys": {                        ← optional BYOK block
      "GOOGLE_API_KEY": "...",
      "GROQ_API_KEY":   "...",
      "is_test_mode":   true|false
    }
  }

Server → Client (during debate):
  { "type": "state_update", "state": { ...DebateState (no user_keys)... } }

Client → Server (HITL turn):
  { "type": "human_input", "text": "..." }

Server → Client (finished):
  { "type": "debate_ended" }
"""

import asyncio
import uuid
import os

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from graph import debate_graph
from config import TEST_MODE

app = FastAPI(title="Neural Arbiter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── WebSocket handler ────────────────────────────────────────────────────────
@app.websocket("/ws/debate")
async def debate_websocket(websocket: WebSocket):
    await websocket.accept()
    print("[ws] Client connected.")

    try:
        # ── 1. Receive start message ──────────────────────────────────────────
        data          = await websocket.receive_json()
        topic         = data.get("topic", "The theoretical realisation of Antigravity")
        is_human_mode = data.get("human_in_loop", False)

        # ── 2. Extract BYOK keys (log presence only, never the values) ────────
        user_keys: dict | None = data.get("user_keys", None)

        if user_keys:
            _google_present = bool(user_keys.get("GOOGLE_API_KEY", ""))
            _groq_present   = bool(user_keys.get("GROQ_API_KEY",   ""))
            _is_test        = bool(user_keys.get("is_test_mode",   False))
            print(
                f"[ws] BYOK payload received — "
                f"google_key={'present' if _google_present else 'ABSENT'} | "
                f"groq_key={'present' if _groq_present else 'ABSENT'} | "
                f"is_test_mode={_is_test}"
            )
        else:
            print("[ws] No BYOK keys in payload — nodes will use server env keys.")

        # Effective test mode: server flag OR client requested it
        effective_test_mode = TEST_MODE or (
            user_keys is not None and user_keys.get("is_test_mode", False)
        )

        print(
            f"[ws] Debate: '{topic}' | server TEST_MODE={TEST_MODE} | "
            f"effective={effective_test_mode} | human_mode={is_human_mode}"
        )

        # ── 3. Build initial state ────────────────────────────────────────────
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
            "final_verdict":      None,
            "is_human_mode":      is_human_mode,
            "human_input":        "",
            "user_keys":          user_keys,  # None or the dict from the client
        }

        # ── 4. Unique thread for isolated MemorySaver checkpoints ─────────────
        thread_id     = str(uuid.uuid4())
        thread_config = {"configurable": {"thread_id": thread_id}}
        current_input = initial_state

        # ── 5. Main streaming loop ────────────────────────────────────────────
        while True:

            async for state_snapshot in debate_graph.astream(
                current_input,
                config=thread_config,
                stream_mode="values",
            ):
                serialized = _serialize_state(state_snapshot)

                # ⚠️  SECURITY: strip keys from every outbound payload
                serialized.pop("user_keys", None)

                graph_state   = debate_graph.get_state(thread_config)
                is_human_turn = "human_node" in (graph_state.next or [])

                serialized["is_human_turn"] = is_human_turn
                if is_human_turn:
                    serialized["current_speaker"] = "Human"

                await websocket.send_json({
                    "type":  "state_update",
                    "state": serialized,
                })

                await asyncio.sleep(1.2)  # UI smoothing delay

            # ── 6. Post-stream routing ────────────────────────────────────────
            graph_state = debate_graph.get_state(thread_config)

            if not graph_state.next:
                print("[ws] Debate complete — sending debate_ended.")
                break

            if "human_node" in graph_state.next:
                print("[ws] Graph paused — awaiting human input via WebSocket...")

                human_text = ""
                while True:
                    resp = await websocket.receive_json()
                    if resp.get("type") == "human_input":
                        human_text = resp.get("text", "").strip()
                        print(f"[ws] Human input received ({len(human_text)} chars).")
                        break
                    print(f"[ws] Ignored unexpected msg type: {resp.get('type')}")

                # Inject human's text and resume from checkpoint (input=None)
                debate_graph.update_state(thread_config, {"human_input": human_text})
                current_input = None
                continue

            print(f"[ws] Unexpected graph.next={graph_state.next} — stopping.")
            break

        await websocket.send_json({"type": "debate_ended"})

    except WebSocketDisconnect:
        print("[ws] Client disconnected.")
    except Exception as exc:
        import traceback
        print(f"[ws] Unhandled error: {exc}")
        traceback.print_exc()
        try:
            await websocket.send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass


# ─── State serialiser ─────────────────────────────────────────────────────────
def _serialize_state(state: dict) -> dict:
    def _coerce(obj):
        if obj is None:                              return None
        if isinstance(obj, (str, int, float, bool)): return obj
        if isinstance(obj, dict):                    return {k: _coerce(v) for k, v in obj.items()}
        if isinstance(obj, (list, tuple)):           return [_coerce(i) for i in obj]
        if hasattr(obj, "model_dump"):               return _coerce(obj.model_dump())
        if hasattr(obj, "__dict__"):                 return _coerce(vars(obj))
        return str(obj)
    return _coerce(state)


# ─── Entrypoint ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"[main] Starting server on port {port} | TEST_MODE={TEST_MODE}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)