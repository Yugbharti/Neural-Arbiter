import { useState, useEffect } from 'react';
import { ReadyState } from 'react-use-websocket';
import { useDebate } from './hooks/useDebate';
import { Chart } from './components/Chart';
import { Graph } from './components/Graph';
import { Chat } from './components/Chat';
import { Sidebar } from './components/Sidebar';
import { FinalVerdict } from './components/FinalVerdict';
import {  Play, Shield, Cpu,  ArrowRight } from 'lucide-react';

function App() {
  // --- UI STATES ---
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSystemLoading, setIsSystemLoading] = useState(false);
  const [showVerdict, setShowVerdict] = useState(false);
  const [topic, setTopic] = useState("The Simulation Hypothesis");
  const [isHumanMode, setIsHumanMode] = useState(false);

  const { state, readyState, startDebate, submitArgument, isWaitingForHuman } = useDebate();

// 1. Your dictionary (already defined)
const connectionStatusMap: Record<number, string> = {
  [ReadyState.CONNECTING]: 'Connecting',
  [ReadyState.OPEN]: 'Online',
  [ReadyState.CLOSING]: 'Closing',
  [ReadyState.CLOSED]: 'Offline',
  [ReadyState.UNINSTANTIATED]: 'Offline',
};

// 2. Perform the lookup to get a single string
// const statusLabel = connectionStatusMap[readyState as keyof typeof connectionStatusMap] || 'Offline';

  useEffect(() => {
    if (state?.final_verdict) setShowVerdict(true);
  }, [state?.final_verdict]);

  const handleInitialize = () => {
    setIsSystemLoading(true);
    // Simulate high-tech system check
    setTimeout(() => {
      setIsInitializing(false);
      setIsSystemLoading(false);
    }, 2500);
  };

  const handleStart = () => {
    setShowVerdict(false);
    startDebate(topic, isHumanMode);
  };

  // ─── 1. LANDING / LOADER SCREEN ───
  if (isInitializing) {
    return (
      <div className="h-screen w-full bg-[#05080a] flex flex-col items-center justify-center relative overflow-hidden font-sans">
        {/* Animated Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center text-center px-6">
          <div className="mb-8 p-4 bg-gray-900/50 border border-gray-800 rounded-3xl backdrop-blur-xl shadow-2xl animate-bounce">
            <Cpu className="text-blue-400" size={48} />
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
            NEURAL ARBITER <span className="text-blue-500">v3.0</span>
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
                <div className="h-full bg-blue-500 animate-[loading_2.5s_ease-in-out]" style={{width: '100%'}} />
              </div>
              <p className="text-[10px] font-mono text-blue-400 uppercase tracking-[0.3em] animate-pulse">
                Loading LangGraph Manifest... 100%
              </p>
            </div>
          )}
        </div>

        {/* Footer Credits */}
        <div className="absolute bottom-8 text-[10px] text-gray-600 font-mono tracking-widest uppercase">
          Autonomous Reasoning Engine // Protocol v.3.14
        </div>
      </div>
    );
  }

  // ─── 2. MAIN DASHBOARD SCREEN ───
  return (
    <div className="h-screen w-full bg-[#0a0f18] p-4 flex flex-col gap-4 overflow-hidden font-sans animate-in fade-in zoom-in-95 duration-700">
      
      {/* Header */}
      <header className="flex justify-between items-center bg-gray-900/40 backdrop-blur-md border border-gray-800/50 rounded-2xl px-6 py-4 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
            <Shield className="text-blue-400" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-white tracking-tight uppercase">Neural Arbiter</h1>
            <div className="flex items-center gap-2">
               <span className={`h-1.5 w-1.5 rounded-full ${readyState === ReadyState.OPEN ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
<p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
  {connectionStatusMap[readyState as keyof typeof connectionStatusMap] || 'Offline'}
</p>            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Topic & Mode Toggles (Same as before but polished) */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-gray-800">
             <button onClick={() => setIsHumanMode(false)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${!isHumanMode ? 'bg-gray-800 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}>AI vs AI</button>
             <button onClick={() => setIsHumanMode(true)} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${isHumanMode ? 'bg-blue-600 text-white shadow-xl' : 'text-gray-500 hover:text-gray-300'}`}>Human vs AI</button>
          </div>
          
          <input 
            value={topic} 
            onChange={(e) => setTopic(e.target.value)}
            className="bg-black/40 border border-gray-800 text-sm rounded-xl px-4 py-2.5 w-80 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
          
          <button 
            onClick={handleStart}
            disabled={readyState !== ReadyState.OPEN}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <Play size={16} fill="white" /> DEPLOY AGENTS
          </button>
        </div>
      </header>

      {/* Main Content (Grid) */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <div className="h-1/2 flex gap-4 min-h-0">
          <div className="flex-[3]"><Chart state={state} /></div>
          <div className="flex-[2]"><Graph state={state} /></div>
        </div>
        <div className="h-1/2 flex gap-4 min-h-0">
          <div className="flex-[3]"><Chat state={state} isWaitingForHuman={isWaitingForHuman} onSubmitArgument={submitArgument} /></div>
          <div className="flex-[2]"><Sidebar state={state} /></div>
        </div>
      </div>

      {/* Final Verdict Overlay */}
      {showVerdict && state?.final_verdict && (
        <FinalVerdict verdict={state.final_verdict} onClose={() => setShowVerdict(false)} />
      )}
    </div>
  );
}

export default App;