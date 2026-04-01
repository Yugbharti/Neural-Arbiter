"""
config.py — Central configuration for the Debate Agent backend.

Set TEST_MODE = True  →  nodes return hardcoded mock data (no API calls).
Set TEST_MODE = False →  nodes use live LLM + DuckDuckGo calls.

Keys are loaded from a .env file at the project root via python-dotenv.
A missing key in live mode raises immediately at import time so the error
is obvious rather than surfacing mid-stream inside a WebSocket handler.
"""

import os
from dotenv import load_dotenv

load_dotenv()  # reads .env from the current working directory (project root)

# ── Master toggle ──────────────────────────────────────────────────────────────
TEST_MODE: bool = os.getenv("TEST_MODE", "True").strip().lower() != "false"

# ── Key accessors (raise at startup if a required key is absent in live mode) ──
def _require(key: str) -> str:
    value = os.getenv(key, "").strip()
    if not value and not TEST_MODE:
        raise EnvironmentError(
            f"[config] '{key}' is not set. "
            f"Add it to your .env file or set TEST_MODE=True to use mock data."
        )
    return value

GOOGLE_API_KEY:    str = _require("GOOGLE_API_KEY")
GROQ_API_KEY:      str = _require("GROQ_API_KEY")
ANTHROPIC_API_KEY: str = _require("ANTHROPIC_API_KEY")

# ── Model identifiers (change here, nowhere else) ─────────────────────────────
GEMINI_MODEL  = "gemini-2.5-flash"
GROQ_MODEL    = "llama-3.1-8b-instant"
CLAUDE_MODEL  = "claude-3-haiku-20240307"

# ── Debate settings ────────────────────────────────────────────────────────────
MAX_ROUNDS           = 3
SEARCH_MAX_RESULTS   = 3
LLM_TEMPERATURE      = 0.85   # higher = more combative / creative debaters
JUDGE_TEMPERATURE    = 0.0    # judge must be deterministic for structured output