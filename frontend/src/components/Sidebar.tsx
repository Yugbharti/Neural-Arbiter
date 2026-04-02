/**
 * Sidebar.tsx — Judge overview panel with polished styling.
 */

import React from 'react';
import type { DebateState } from '../types';
import { Scale, AlertTriangle, Info, Shield, Layers } from 'lucide-react';

interface SidebarProps {
  state: DebateState | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  return (
    <div className="h-full bg-[#0a0f18]/70 rounded-2xl border border-gray-800/50 backdrop-blur-sm flex flex-col p-4 gap-3 overflow-y-auto text-sm">

      <div className="flex items-center gap-2 pb-3 border-b border-gray-800/50">
        <Scale size={16} className="text-purple-400" />
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Judge Overview</h3>
      </div>

      <div className="bg-white/[0.02] rounded-xl p-3.5 border border-gray-800/50">
        <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-semibold">
          <Info size={13} /> Topic
        </div>
        <p className="text-gray-200 text-[13px] leading-relaxed">
          {state?.topic || 'No active debate'}
        </p>
      </div>

      <div className="bg-white/[0.02] rounded-xl p-3.5 border border-gray-800/50">
        <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-semibold">
          <AlertTriangle size={13} className={state?.latest_bias ? 'text-amber-500' : ''} /> Bias Detection
        </div>
        <p className={`text-[13px] leading-relaxed ${state?.latest_bias ? 'text-amber-200/90 italic' : 'text-gray-500 italic'}`}>
          {state?.latest_bias || 'Analysis pending...'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <div className="bg-white/[0.02] rounded-xl p-3 border border-gray-800/50 flex flex-col items-center justify-center text-center">
          <Layers size={14} className="text-indigo-400 mb-1" />
          <span className="text-gray-500 text-[10px] uppercase font-semibold mb-0.5">Rounds</span>
          <span className="text-lg font-bold text-gray-200">
            {state?.rounds_completed || 0}
            <span className="text-xs text-gray-500 font-normal"> / 3</span>
          </span>
        </div>
        <div className="bg-white/[0.02] rounded-xl p-3 border border-gray-800/50 flex flex-col items-center justify-center text-center">
          <Shield size={14} className="text-emerald-400 mb-1" />
          <span className="text-gray-500 text-[10px] uppercase font-semibold mb-0.5">Speaker</span>
          <span className="text-xs font-bold text-gray-200 truncate w-full">
            {state?.current_speaker || 'None'}
          </span>
        </div>
      </div>
    </div>
  );
};
