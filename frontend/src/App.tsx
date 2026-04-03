/**
 * App.tsx — Neural Arbiter root component.
 *
 * Flow:
 * 1. PromptPage (Gemini/Claude-style) — user enters a debate topic & settings.
 * 2. On submit → smooth transition → Dashboard with live debate analytics.
 * 3. ALL components receive syncedState from useSyncedReveal, ensuring
 * chat, graph, chart, sidebar, and navbar update in perfect time-sync.
 * 4. Verdict is persistent — can be re-opened via "View Verdict" button.
 * 5. "New Topic" returns to the PromptPage.
 */

import { useState, useEffect, useCallback } from 'react';
import { ReadyState } from 'react-use-websocket';
import { useDebate } from './hooks/useDebate';
import { useSyncedReveal } from './hooks/useSyncedReveal';
import { PromptPage } from './components/PromptPage';
import './components/PromptPage.css';
import { DashboardNav } from './components/DashboardNav';
import { ApiModal } from './components/ApiModal.tsx';
import type { UserKeys } from './components/ApiModal.tsx';
import { Chart } from './components/Chart';
import { Graph } from './components/Graph';
import { Chat } from './components/Chat';
import { Sidebar } from './components/Sidebar';
import { FinalVerdict } from './components/FinalVerdict';
import { Bug, X, Cpu, ArrowRight } from 'lucide-react';

// ── Dev Mode Panel ────────────────────────────────────────────────────────────
function DevModePanel({
  state,
  readyState,
  isWaitingForHuman,
  savedKeys,
  onClose,
}: {
  state: any;
  readyState: ReadyState;
  isWaitingForHuman: boolean;
  savedKeys: UserKeys | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[620px] max-h-[70vh] overflow-auto bg-[#0d1117] border border-yellow-500/40 rounded-2xl shadow-2xl font-mono text-xs">
      <div className="flex items-center justify-between px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/30 sticky top-0">
        <div className="flex items-center gap-2 text-yellow-400 font-bold">
          <Bug size={14} />
          <span>DEV MODE — internal state snapshot</span>
          <span className="text-yellow-600 font-normal">(Shift+D to close)</span>
        </div>
        <button onClick={onClose} className="text-yellow-600 hover:text-yellow-300 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-4 px-4 py-2 border-b border-gray-800 text-[10px]">
        <span>WS: <span className={readyState === ReadyState.OPEN ? 'text-emerald-400' : 'text-red-400'}>{ReadyState[readyState]}</span></span>
        <span>Rounds: <span className="text-blue-400">{state?.rounds_completed ?? 0}</span></span>
        <span>Speaker: <span className="text-purple-400">{state?.current_speaker ?? '—'}</span></span>
        <span>HITL: <span className={isWaitingForHuman ? 'text-yellow-400' : 'text-gray-500'}>{String(isWaitingForHuman)}</span></span>
        <span>Transcript: <span className="text-cyan-400">{state?.transcript?.length ?? 0}</span></span>
        <span>BYOK: <span className={savedKeys ? 'text-emerald-400' : 'text-gray-500'}>{savedKeys ? (savedKeys.isTestMode ? 'test-mode' : 'active') : 'none'}</span></span>
      </div>

      <pre className="px-4 py-3 text-gray-400 leading-relaxed whitespace-pre-wrap break-all">
        {JSON.stringify({ ...state, _byok: savedKeys ? { isTestMode: savedKeys.isTestMode, hasGoogleKey: !!savedKeys.googleApiKey, hasGroqKey: !!savedKeys.groqApiKey } : null }, null, 2)}
      </pre>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
function App() {
  const [currentView, setCurrentView]     = useState<'intro' | 'prompt' | 'exiting' | 'dashboard'>('intro');
  const [isSystemLoading, setIsSystemLoading] = useState(false);
  const [showVerdict, setShowVerdict]     = useState(false);
  const [topic, setTopic]                 = useState('');
  const [isHumanMode, setIsHumanMode]     = useState(false);
  const [isDevMode, setIsDevMode]         = useState(false);
  const [isMockMode, setIsMockMode]       = useState(false);

  // ── BYOK state ──────────────────────────────────────────────────────────────
  const [savedKeys, setSavedKeys]           = useState<UserKeys | null>(null);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  const { state, readyState, startDebate, submitArgument, isWaitingForHuman } = useDebate();

  // ── Synced reveal: ALL dashboard components use this instead of raw state ──
  const {
    syncedState,
    isThinking,
    thinkingSpeaker,
    totalMessages,
    revealedMessages,
  } = useSyncedReveal(state);

  // Shift+D → toggle dev mode
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.shiftKey && e.key === 'D') setIsDevMode((p) => !p);
  }, []);
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // FIX: Auto-show verdict with a 2-second delay so it doesn't feel abrupt
  useEffect(() => {
    if (syncedState?.final_verdict) {
      const timer = setTimeout(() => {
        setShowVerdict(true);
      }, 2000); // 2 second delay to let the user absorb the final UI state
      return () => clearTimeout(timer);
    }
  }, [syncedState?.final_verdict]);

  // ── Start debate from PromptPage ────────────────────────────────────────────
  const handleStartFromPrompt = (submittedTopic: string) => {
    setTopic(submittedTopic);
    setShowVerdict(false);

    const effectiveKeys: UserKeys | null = isMockMode
      ? { googleApiKey: 'TEST_KEY', groqApiKey: 'TEST_KEY', isTestMode: true }
      : savedKeys;

    startDebate(submittedTopic, isHumanMode, effectiveKeys);

    // Start exit animation, then switch to dashboard view
    setCurrentView('exiting');
    setTimeout(() => {
      setCurrentView('dashboard');
    }, 450);
  };

  // ── Return to prompt page ───────────────────────────────────────────────────
  const handleNewTopic = () => {
    setShowVerdict(false);
    setCurrentView('prompt');
  };

  const handleSaveKeys = (keys: UserKeys) => {
    setSavedKeys(keys);
  };

  // ── Handle intro → prompt transition ────────────────────────────────────────
  const handleInitialize = () => {
    setIsSystemLoading(true);
    setTimeout(() => {
      setIsSystemLoading(false);
      setCurrentView('prompt');
    }, 2500);
  };

  // ── 0. INTRO / LANDING SCREEN ─────────────────────────────────────────────
  if (currentView === 'intro') {
    return (
      <div className="h-screen w-full bg-[#05080a] flex flex-col items-center justify-center relative overflow-hidden font-sans">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <div className="mb-8 p-4 bg-gray-900/50 border border-gray-800 rounded-3xl backdrop-blur-xl shadow-2xl animate-bounce">
            <Cpu className="text-blue-400" size={48} />
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
            NEURAL ARBITER <span className="text-blue-500">v1.0</span>
          </h1>
          <p className="max-w-xl text-gray-400 text-lg mb-12 leading-relaxed">
            A next-generation Multi-Agent system for hyper-rigorous scientific debate synthesis.
            Powered by LangGraph, Gemini, and Groq.
          </p>
          {!isSystemLoading ? (
            <button
              onClick={handleInitialize}
              className="group relative px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(37,99,235,0.4)] flex items-center gap-3"
            >
              INITIALIZE CORE SYSTEM <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-64 h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                <div className="h-full bg-blue-500 animate-[loading_2.5s_ease-in-out]" style={{ width: '100%' }} />
              </div>
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.3em] animate-pulse">
                Loading LangGraph Manifest... 100%
              </p>
            </div>
          )}
        </div>
        <div className="absolute bottom-8 text-[10px] text-gray-600 font-mono tracking-widest uppercase">
         ORCA v1.0
        </div>
      </div>
    );
  }

  // ── 1. PROMPT PAGE ─────────────────────────────────────────────────────────
  if (currentView === 'prompt' || currentView === 'exiting') {
    return (
      <>
        <div className={currentView === 'exiting' ? 'prompt-page--exiting' : ''}>
          <PromptPage
            readyState={readyState}
            isHumanMode={isHumanMode}
            isMockMode={isMockMode}
            savedKeys={isMockMode ? { googleApiKey: 'TEST_KEY', groqApiKey: 'TEST_KEY', isTestMode: true } : savedKeys}
            onHumanModeToggle={setIsHumanMode}
            onMockModeToggle={() => setIsMockMode((p) => !p)}
            onOpenApiModal={() => setIsApiModalOpen(true)}
            onDevModeToggle={() => setIsDevMode((p) => !p)}
            isDevMode={isDevMode}
            onStartDebate={handleStartFromPrompt}
          />
        </div>

        {/* Dev mode overlay on prompt page */}
        {isDevMode && (
          <DevModePanel
            state={state}
            readyState={readyState}
            isWaitingForHuman={isWaitingForHuman}
            savedKeys={savedKeys}
            onClose={() => setIsDevMode(false)}
          />
        )}

        {/* BYOK Modal */}
        <ApiModal
          isOpen={isApiModalOpen}
          onClose={() => setIsApiModalOpen(false)}
          onSave={handleSaveKeys}
          savedKeys={savedKeys}
        />
      </>
    );
  }

  // ── 2. MAIN DASHBOARD ─────────────────────────────────────────────────────
  // IMPORTANT: All components below use `syncedState` — NOT raw `state`.
  // This ensures chat, graph, chart, sidebar, and navbar update in sync.
  const hasVerdict = !!syncedState?.final_verdict;

  return (
    <div className="h-screen w-full bg-[#05080a] p-4 flex flex-col gap-3 overflow-hidden font-sans relative dashboard--entering">

      {/* Dev mode badge */}
      {isDevMode && (
        <button
          onClick={() => setIsDevMode(false)}
          className="fixed bottom-6 left-6 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-400 text-[10px] font-mono font-bold hover:bg-yellow-500/30 transition-colors"
        >
          <Bug size={12} /> DEV MODE ON
        </button>
      )}

      {/* Dev mode panel — shows RAW state for debugging */}
      {isDevMode && (
        <DevModePanel
          state={state}
          readyState={readyState}
          isWaitingForHuman={isWaitingForHuman}
          savedKeys={savedKeys}
          onClose={() => setIsDevMode(false)}
        />
      )}

      {/* ── Simplified Dashboard Nav — uses syncedState ── */}
      <DashboardNav
        readyState={readyState}
        topic={topic}
        roundsCompleted={syncedState?.rounds_completed ?? 0}
        hasVerdict={hasVerdict}
        isDevMode={isDevMode}
        onViewVerdict={() => setShowVerdict(true)}
        onNewTopic={handleNewTopic}
        onDevModeToggle={() => setIsDevMode((p) => !p)}
      />

      {/* ── Main content: 3-column layout — ALL use syncedState ── */}
      <div className="flex-1 min-h-0 flex gap-3 z-10">

        {/* Left column: Chat */}
        <div className="w-[30%] flex flex-col min-h-0">
          <Chat
            state={syncedState}
            isWaitingForHuman={isWaitingForHuman}
            onSubmitArgument={submitArgument}
            isThinking={isThinking}
            thinkingSpeaker={thinkingSpeaker}
            totalMessages={totalMessages}
            revealedMessages={revealedMessages}
          />
        </div>

        {/* Center column: Graph (largest) */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-0">
            <Graph state={syncedState} />
          </div>
        </div>

        {/* Right column: Chart + Sidebar stacked */}
        <div className="w-[25%] flex flex-col gap-3 min-h-0">
          <div className="h-[45%] min-h-0">
            <Chart state={syncedState} />
          </div>
          <div className="flex-1 min-h-0">
            <Sidebar state={syncedState} />
          </div>
        </div>
      </div>

      {/* Final Verdict Overlay — only appears when syncedState reveals it */}
      {showVerdict && syncedState?.final_verdict && (
        <FinalVerdict
          verdict={syncedState.final_verdict}
          transcript={syncedState.transcript}
          onClose={() => setShowVerdict(false)}
          onNewTopic={handleNewTopic}
        />
      )}

      {/* BYOK Modal */}
      <ApiModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        onSave={handleSaveKeys}
        savedKeys={savedKeys}
      />
    </div>
  );
}

export default App;