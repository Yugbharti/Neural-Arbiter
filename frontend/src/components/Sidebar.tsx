import React from 'react';
import type { DebateState } from '../types';
import { Scale, AlertTriangle, Info, Shield, Layers } from 'lucide-react';

interface SidebarProps {
  state: DebateState | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  return (
    <div className="h-full bg-gray-900 rounded-lg border border-gray-800 shadow-xl flex flex-col p-4 gap-4 overflow-y-auto text-sm">
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        <Scale size={20} className="text-purple-500" />
        <h3 className="text-lg font-semibold text-gray-200">Judge Overview</h3>
      </div>
      
      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 shadow-inner">
        <div className="flex items-center gap-2 mb-2 text-gray-400 font-medium">
          <Info size={16} /> Topic
        </div>
        <p className="text-gray-200">
          {state?.topic || "No active debate"}
        </p>
      </div>

      <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 shadow-inner">
        <div className="flex items-center gap-2 mb-2 text-gray-400 font-medium">
          <AlertTriangle size={16} className={state?.latest_bias ? 'text-amber-500' : ''}/> Bias Detection
        </div>
        <p className={`text-gray-300 ${state?.latest_bias ? 'text-amber-200/90' : 'text-gray-500'} italic`}>
          {state?.latest_bias || "Analysis pending..."}
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-auto">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-800 flex flex-col items-center justify-center">
          <Layers size={18} className="text-indigo-400 mb-1" />
          <span className="text-gray-500 text-xs uppercase mb-1">Rounds</span>
          <span className="text-xl font-bold text-gray-200">{state?.rounds_completed || 0} <span className="text-sm text-gray-500 font-normal">/ 3</span></span>
        </div>
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-800 flex flex-col items-center justify-center text-center">
          <Shield size={18} className="text-emerald-400 mb-1" />
          <span className="text-gray-500 text-xs uppercase mb-1">Speaker</span>
          <span className="text-sm font-bold text-gray-200 truncate w-full">{state?.current_speaker || "None"}</span>
        </div>
      </div>
    </div>
  );
};
