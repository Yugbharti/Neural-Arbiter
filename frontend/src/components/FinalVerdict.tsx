/**
 * FinalVerdict.tsx — Post-debate analytical report overlay.
 * Rebuilt for a modern, human-centric, premium SaaS aesthetic.
 */

import React from 'react';
import { X, ShieldCheck, AlertTriangle, Zap, Target, RotateCcw, Download } from 'lucide-react';
import type { FinalVerdictData } from '../types';

interface FinalVerdictProps {
  verdict: FinalVerdictData;
  transcript?: any[]; // Passed down to generate the export file
  onClose: () => void;
  onNewTopic?: () => void;
}

export const FinalVerdict: React.FC<FinalVerdictProps> = ({ verdict, transcript, onClose, onNewTopic }) => {

  // Function to convert the transcript array into a text file and download it
  const handleDownloadTranscript = () => {
    if (!transcript || transcript.length === 0) return;
    
    const date = new Date().toLocaleDateString();
    let fileContent = `====================================================\n`;
    fileContent += `NEURAL ARBITER - OFFICIAL DEBATE TRANSCRIPT\n`;
    fileContent += `Date: ${date}\n`;
    fileContent += `====================================================\n\n`;

    transcript.forEach((msg, index) => {
      fileContent += `[Round ${Math.floor(index/2) + 1}] ${msg.speaker.toUpperCase()}:\n`;
      fileContent += `${msg.argument}\n\n`;
      fileContent += `----------------------------------------------------\n\n`;
    });

    fileContent += `\nFINAL VERDICT SYNTHESIS:\n`;
    fileContent += `${verdict.conclusion}\n`;

    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Neural_Arbiter_Transcript_${date.replace(/\//g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    // FIX: Slower fade-in animation (duration-1000)
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-1000">

      {/* Main Container - Slower zoom-in animation (duration-1000) */}
      <div className="relative w-full max-w-4xl bg-[#1A1D24] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-1000">

        {/* Header - Clean layout */}
        <div className="flex justify-between items-center p-8 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <ShieldCheck className="text-indigo-400" size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white tracking-tight">Debate Summary</h2>
              <p className="text-sm text-gray-400 font-medium mt-1">Comprehensive analytical report</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body Content - Grid Layout */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 overflow-y-auto max-h-[70vh]">

          {/* Left Column: Metrics & Confidence */}
          <div className="space-y-6">
            
            {/* Confidence Ring - Apple Health Style */}
            <div className="bg-white/5 border border-white/5 p-6 rounded-3xl flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-6 text-indigo-400">
                <Target size={18} />
                <span className="text-sm font-semibold tracking-wide">Confidence Score</span>
              </div>
              <div className="relative flex items-center justify-center w-36 h-36">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background Track */}
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/5" />
                  {/* Progress Track */}
                  <circle cx="50%" cy="50%" r="45%" fill="none" stroke="currentColor" strokeWidth="8"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * verdict.confidence) / 100}
                    strokeLinecap="round" 
                    className="text-indigo-500 transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-bold text-white tracking-tighter">{verdict.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Bias Audit - Softer colors */}
            <div className="bg-amber-500/10 border border-amber-500/10 p-6 rounded-3xl">
              <div className="flex items-center gap-2 mb-3 text-amber-400">
                <AlertTriangle size={18} />
                <span className="text-sm font-semibold tracking-wide">Bias Observation</span>
              </div>
              <p className="text-sm text-amber-100/70 leading-relaxed font-medium">
                "{verdict.bias}"
              </p>
            </div>
          </div>

          {/* Right Column: Detailed Analysis & Conclusion */}
          <div className="md:col-span-2 space-y-6 flex flex-col">
            
            {/* FIX: Core Analysis now supports long text with internal scrolling */}
            <section className="bg-white/5 border border-white/5 p-8 rounded-3xl flex-1 flex flex-col">
              <h3 className="flex items-center gap-2 text-gray-300 text-sm font-semibold tracking-wide mb-4">
                <Zap size={16} className="text-indigo-400" /> Core Analysis
              </h3>
              {/* Internal scrollbox for long paragraphs */}
              <div className="text-gray-300 text-[15px] leading-relaxed whitespace-pre-wrap font-medium overflow-y-auto max-h-[220px] pr-4 custom-scrollbar">
                {verdict.analysis}
              </div>
            </section>

            <section className="bg-indigo-500/10 border border-indigo-500/20 p-8 rounded-3xl relative overflow-hidden shrink-0">
              {/* Soft background glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
              
              <h3 className="text-sm font-semibold text-indigo-300 tracking-wide mb-3 relative z-10">
                Final Conclusion
              </h3>
              <p className="text-lg font-medium text-indigo-50 leading-snug relative z-10">
                {verdict.conclusion}
              </p>
            </section>
          </div>
        </div>

        {/* Footer Action - Added Download Button */}
        <div className="p-6 px-8 bg-[#14161A] border-t border-white/5 flex items-center gap-4 rounded-b-[2rem]">
          {onNewTopic && (
            <button
              onClick={onNewTopic}
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-gray-400 hover:text-white bg-transparent hover:bg-white/5 rounded-full transition-all transform active:scale-95"
            >
              <RotateCcw size={16} />
              Start New Topic
            </button>
          )}

          {transcript && transcript.length > 0 && (
            <button
              onClick={handleDownloadTranscript}
              className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-full transition-all transform active:scale-95"
            >
              <Download size={16} />
              Export Transcript
            </button>
          )}

          <button
            onClick={onClose}
            className="px-8 py-3 text-sm font-semibold bg-white text-black rounded-full hover:bg-gray-200 transition-all transform active:scale-95 ml-auto shadow-lg shadow-white/10"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};