/**
 * Navbar.tsx
 * Top navigation bar for Neural Arbiter.
 *
 * Additions for BYOK:
 *  • "API Keys" button that opens the ApiModal.
 *  • Active-key status pill — shows green "Keys Active" when user keys are
 *    loaded, yellow "Test Mode" when the TEST_KEY sentinel is in use,
 *    and an unobtrusive red "No Keys" state when nothing is configured.
 *  • All existing header logic (topic input, mode toggle, deploy button,
 *    dev-mode bug icon) is preserved verbatim.
 */

import { ReadyState } from 'react-use-websocket';
import { Play, Shield, Bug, KeyRound, CheckCircle2, FlaskConical, AlertTriangle } from 'lucide-react';
import type { UserKeys } from './ApiModal';

interface NavbarProps {
  readyState:       ReadyState;
  topic:            string;
  isHumanMode:      boolean;
  isDevMode:        boolean;
  isMockMode:       boolean;
  savedKeys:        UserKeys | null;
  onTopicChange:    (t: string) => void;
  onHumanModeToggle:(v: boolean) => void;
  onDevModeToggle:  () => void;
  onMockModeToggle: () => void;
  onOpenApiModal:   () => void;
  onStart:          () => void;
}

const CONNECTION_LABEL: Record<number, string> = {
  [ReadyState.CONNECTING]:     'Connecting',
  [ReadyState.OPEN]:           'Online',
  [ReadyState.CLOSING]:        'Closing',
  [ReadyState.CLOSED]:         'Offline',
  [ReadyState.UNINSTANTIATED]: 'Offline',
};

// ── Key-status pill ───────────────────────────────────────────────────────────
function KeyStatusPill({ savedKeys }: { savedKeys: UserKeys | null }) {
  if (!savedKeys) {
    return (
      <div
        title="No API keys configured — enter keys via the API Keys button"
        className="flex items-center gap-1.5 px-2.5 py-1 bg-red-950/40 border border-red-800/40 rounded-full cursor-default"
      >
        <AlertTriangle size={10} className="text-red-500" />
        <span className="text-[9px] font-mono font-bold text-red-500 uppercase tracking-wider">
          No Keys
        </span>
      </div>
    );
  }

  if (savedKeys.isTestMode) {
    return (
      <div
        title="TEST_KEY sentinel active — backend TEST_MODE forced on, no real API calls"
        className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-950/40 border border-yellow-700/40 rounded-full cursor-default"
      >
        <FlaskConical size={10} className="text-yellow-400" />
        <span className="text-[9px] font-mono font-bold text-yellow-400 uppercase tracking-wider">
          Test Mode
        </span>
      </div>
    );
  }

  return (
    <div
      title="User-supplied API keys active for this session"
      className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/40 border border-emerald-800/40 rounded-full cursor-default"
    >
      <CheckCircle2 size={10} className="text-emerald-400" />
      <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
        Keys Active
      </span>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────────
export function Navbar({
  readyState,
  topic,
  isHumanMode,
  isDevMode,
  isMockMode,
  savedKeys,
  onTopicChange,
  onHumanModeToggle,
  onDevModeToggle,
  onMockModeToggle,
  onOpenApiModal,
  onStart,
}: NavbarProps) {
  return (
    <header className="flex justify-between items-center bg-gray-900/40 backdrop-blur-md border border-gray-800/50 rounded-2xl px-6 py-4 shadow-2xl z-10">

      {/* ── Left: Brand + connection status ────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
          <Shield className="text-blue-400" size={24} />
        </div>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight uppercase">Neural Arbiter</h1>
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                readyState === ReadyState.OPEN
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                  : 'bg-red-500'
              }`}
            />
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
              {CONNECTION_LABEL[readyState] ?? 'Offline'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Right: controls ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">

        {/* Key status pill */}
        <KeyStatusPill savedKeys={savedKeys} />

        {/* API Keys button */}
        <button
          onClick={onOpenApiModal}
          title="Configure your API keys (BYOK)"
          className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
            savedKeys
              ? 'bg-gray-900/60 border-gray-700/60 text-gray-300 hover:bg-gray-800 hover:text-white'
              : 'bg-blue-600/20 border-blue-500/40 text-blue-400 hover:bg-blue-600/30 animate-pulse'
          }`}
        >
          <KeyRound size={13} />
          API Keys
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-800" />

        {/* Mode toggle */}
        <div className="flex bg-black/40 p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => onHumanModeToggle(false)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              !isHumanMode
                ? 'bg-gray-800 text-white shadow-xl'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            AI vs AI
          </button>
          <button
            onClick={() => onHumanModeToggle(true)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              isHumanMode
                ? 'bg-blue-600 text-white shadow-xl'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Human vs AI
          </button>
        </div>

        {/* Topic input */}
        <input
          value={topic}
          onChange={(e) => onTopicChange(e.target.value)}
          placeholder="Enter a debate topic (e.g., Quantum Computing vs General AI)..."
          className="bg-black/40 border border-gray-800 text-sm rounded-xl px-4 py-2.5 w-72 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-600"
        />

        {/* Deploy button */}
        <button
          onClick={onStart}
          disabled={readyState !== ReadyState.OPEN}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
        >
          <Play size={16} fill="white" /> DEPLOY AGENTS
        </button>

        {/* Mock Mode toggle — clearly visible */}
        <button
          onClick={onMockModeToggle}
          title={isMockMode ? 'Mock Mode ON — click to switch to Live Mode' : 'Live Mode — click to switch to Mock Mode (no API calls)'}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
            isMockMode
              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.15)]'
              : 'bg-gray-900/60 border-gray-700/60 text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          <FlaskConical size={13} />
          {isMockMode ? 'MOCK' : 'LIVE'}
        </button>

        {/* Dev inspector toggle (subtle) */}
        <button
          onClick={onDevModeToggle}
          title="Toggle Dev Inspector (Shift+D)"
          className={`p-2 rounded-xl transition-all ${
            isDevMode
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
              : 'text-gray-700 hover:text-gray-500 border border-transparent'
          }`}
        >
          <Bug size={16} />
        </button>
      </div>
    </header>
  );
}