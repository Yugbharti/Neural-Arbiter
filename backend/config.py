"""
config.py — Central configuration for the Debate Agent backend.

Set TEST_MODE = True  →  nodes return hardcoded mock data (no API calls).
Set TEST_MODE = False →  nodes use live LLM + DuckDuckGo calls.

Keys are loaded from a .env file at the project root via python-dotenv.
A missing key in live mode raises immediately at import time so the error
is obvious rather than surfacing mid-stream inside a WebSocket handler.

⚠️  DEV NOTE: TEST_MODE defaults to True UNCONDITIONALLY unless the env var
    TEST_MODE=false is explicitly set. This prevents accidental live API calls
    during development even if API keys happen to be present in the environment.
"""

import os
from dotenv import load_dotenv

load_dotenv()  # reads .env from the current working directory (project root)

# ── Master toggle ──────────────────────────────────────────────────────────────
# SAFE DEFAULT: True. You must explicitly opt-in to live mode via .env
_raw = os.getenv("TEST_MODE", "true").strip().lower()
TEST_MODE: bool = _raw != "false"

# ── LOUD STARTUP BANNER — impossible to miss ──────────────────────────────────
if TEST_MODE:
    print("\n" + "=" * 70)
    print("  ███╗   ███╗ ██████╗  ██████╗██╗  ██╗    ███╗   ███╗ ██████╗ ██████╗ ███████╗")
    print("  ████╗ ████║██╔═══██╗██╔════╝██║ ██╔╝    ████╗ ████║██╔═══██╗██╔══██╗██╔════╝")
    print("  ██╔████╔██║██║   ██║██║     █████╔╝     ██╔████╔██║██║   ██║██║  ██║█████╗  ")
    print("  ██║╚██╔╝██║██║   ██║██║     ██╔═██╗     ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  ")
    print("  ██║ ╚═╝ ██║╚██████╔╝╚██████╗██║  ██╗    ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗")
    print("  ╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝    ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝")
    print("=" * 70)
    print("  ✅  TEST_MODE = True")
    print("  ✅  ALL LLM calls → MOCK data (no API usage)")
    print("  ✅  ALL web searches → MOCK snippets")
    print("  ✅  Judge verdicts → MOCK scores")
    print(f"  📄  .env value read: TEST_MODE = '{_raw}'")
    print("=" * 70 + "\n")
else:
    print("\n" + "!" * 70)
    print("  ⚠️  ██╗     ██╗██╗   ██╗███████╗    ███╗   ███╗ ██████╗ ██████╗ ███████╗")
    print("  ⚠️  ██║     ██║██║   ██║██╔════╝    ████╗ ████║██╔═══██╗██╔══██╗██╔════╝")
    print("  ⚠️  ██║     ██║██║   ██║█████╗      ██╔████╔██║██║   ██║██║  ██║█████╗  ")
    print("  ⚠️  ██║     ██║╚██╗ ██╔╝██╔══╝      ██║╚██╔╝██║██║   ██║██║  ██║██╔══╝  ")
    print("  ⚠️  ███████╗██║ ╚████╔╝ ███████╗    ██║ ╚═╝ ██║╚██████╔╝██████╔╝███████╗")
    print("  ⚠️  ╚══════╝╚═╝  ╚═══╝  ╚══════╝    ╚═╝     ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝")
    print("!" * 70)
    print("  🔴  TEST_MODE = False — REAL API CALLS ARE ACTIVE")
    print("  🔴  LLM calls WILL consume API quota")
    print("  🔴  Web searches WILL hit DuckDuckGo")
    print(f"  📄  .env value read: TEST_MODE = '{_raw}'")
    print("!" * 70 + "\n")


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

# ── Debug helpers (importable by other modules) ───────────────────────────────
def assert_test_mode(caller: str) -> None:
    """
    Raise if TEST_MODE is False. Call this at the top of any mock-only code path
    to make accidental live-mode intrusion loudly obvious.
    """
    if not TEST_MODE:
        raise RuntimeError(
            f"[{caller}] assert_test_mode() failed — "
            f"this code path must only run in TEST_MODE. "
            f"Set TEST_MODE=false in .env to enable live calls."
        )

def assert_live_mode(caller: str) -> None:
    """
    Raise if TEST_MODE is True. Attach this guard immediately before any real
    API call to ensure it can never be reached while mocking is active.
    """
    if TEST_MODE:
        raise RuntimeError(
            f"[{caller}] assert_live_mode() failed — "
            f"a real API call was attempted while TEST_MODE=True. "
            f"This is a bug. Check your conditional logic."
        )