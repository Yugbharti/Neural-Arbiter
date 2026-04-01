import React from 'react';
import { X, ShieldCheck, AlertTriangle, Zap, Target } from 'lucide-react';
import type { FinalVerdictData } from '../types';

interface FinalVerdictProps {
  verdict: FinalVerdictData;
  onClose: () => void;
}

export const FinalVerdict: React.FC<FinalVerdictProps> = ({ verdict, onClose }) => {
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
      
      <div className="relative w-full max-w-4xl bg-[#0d1117] border border-gray-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Top Glowing Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500" />

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <ShieldCheck className="text-purple-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Arbiter System Synthesis</h2>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Post-Debate Analytical Report</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content - Grid Layout */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto max-h-[70vh]">
          
          {/* Left Column: Metrics & Confidence */}
          <div className="space-y-6">
            <div className="bg-gray-950/50 border border-gray-800 p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-4 text-emerald-400">
                <Target size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">System Confidence</span>
              </div>
              <div className="relative flex items-center justify-center h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="50%" cy="50%" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-gray-800" />
                  <circle cx="50%" cy="50%" r="45" fill="none" stroke="currentColor" strokeWidth="8" 
                    strokeDasharray="283" 
                    strokeDashoffset={283 - (283 * verdict.confidence) / 100}
                    className="text-purple-500 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]" 
                  />
                </svg>
                <span className="absolute text-3xl font-black text-white">{verdict.confidence}%</span>
              </div>
            </div>

            <div className="bg-gray-950/50 border border-gray-800 p-5 rounded-xl">
              <div className="flex items-center gap-2 mb-3 text-amber-400">
                <AlertTriangle size={18} />
                <span className="text-xs font-bold uppercase tracking-wider">Bias Audit</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed italic">
                "{verdict.bias}"
              </p>
            </div>
          </div>

          {/* Right Column: Detailed Analysis & Conclusion */}
          <div className="md:col-span-2 space-y-6">
            <section>
              <h3 className="flex items-center gap-2 text-blue-400 text-xs font-black uppercase tracking-widest mb-3">
                <Zap size={14} /> Core Analysis
              </h3>
              <div className="bg-gray-950/30 border border-gray-800 p-6 rounded-xl text-gray-200 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                {verdict.analysis}
              </div>
            </section>

            <section className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 blur opacity-50" />
              <div className="relative bg-gray-900 border border-purple-500/30 p-6 rounded-xl">
                <h3 className="text-xs font-black text-purple-400 uppercase tracking-[0.2em] mb-3">Final Conclusion</h3>
                <p className="text-lg font-bold text-white leading-snug">
                  {verdict.conclusion}
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-gray-900/30 border-t border-gray-800 flex justify-end">
          <button 
            onClick={onClose}
            className="px-8 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all transform active:scale-95 shadow-lg"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};