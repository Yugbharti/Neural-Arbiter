import React, { useEffect, useRef, useState } from 'react';
import type { DebateState } from '../types';
import { Send } from 'lucide-react';

interface ChatProps {
  state: DebateState | null;
  isWaitingForHuman?: boolean;
  onSubmitArgument?: (text: string) => void;
}

export const Chat: React.FC<ChatProps> = ({ state, isWaitingForHuman, onSubmitArgument }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");

  // Auto-scroll to the bottom whenever the transcript updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state?.transcript]);

  const transcript = state?.transcript || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && onSubmitArgument) {
      onSubmitArgument(inputValue);
      setInputValue("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden shadow-lg relative">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 bg-gray-900/80 sticky top-0 z-10">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
          Live Transcript
        </h3>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {transcript.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 italic text-sm">
            Waiting for debate to begin...
          </div>
        ) : (
          transcript.map((entry, index) => {
            // Determine styling based on the speaker
            let bubbleStyle = "bg-gray-800 border-gray-700 text-gray-200";
            let nameStyle = "text-gray-400";

            if (entry.speaker === "Agent A") {
              bubbleStyle = "bg-blue-950/40 border-blue-900/50 text-blue-50";
              nameStyle = "text-blue-400";
            } else if (entry.speaker === "Agent B") {
              bubbleStyle = "bg-red-950/40 border-red-900/50 text-red-50";
              nameStyle = "text-red-400";
            } else if (entry.speaker === "Judge") {
              bubbleStyle = "bg-purple-950/40 border-purple-900/50 text-purple-50";
              nameStyle = "text-purple-400";
            }

            return (
              <div key={index} className={`p-4 rounded-xl border ${bubbleStyle} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`text-xs font-bold uppercase tracking-wider mb-1.5 ${nameStyle}`}>
                  {entry.speaker}
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {/* Safely fallback: render 'argument' first, then 'text' if argument is missing */}
                  {(entry as any).argument || entry.text || "..."}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Human Input Area (Only visible in Human Mode when it's your turn) */}
      {isWaitingForHuman && (
        <div className="p-3 border-t border-gray-800 bg-gray-900/80">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your rebuttal..."
              className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-4 py-2 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};