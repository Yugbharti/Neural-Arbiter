/**
 * Chart.tsx — Credibility trajectory with smooth animated lines.
 */

import React from 'react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import type { DebateState } from '../types';

interface ChartProps {
  state: DebateState | null;
}

export const Chart: React.FC<ChartProps> = ({ state }) => {
  if (!state) {
    return (
      <div className="h-full flex items-center justify-center text-gray-600 bg-[#0a0f18]/70 rounded-2xl border border-gray-800/50 backdrop-blur-sm">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <span className="text-sm font-medium">Waiting for data...</span>
        </div>
      </div>
    );
  }

  const data = [];
  const scoresA = state.credibility_scores?.['Agent A'] || [];
  const scoresB = state.credibility_scores?.['Agent B'] || [];
  const maxLen = Math.max(scoresA.length, scoresB.length);

  for (let i = 0; i < maxLen; i++) {
    data.push({ round: `R${i + 1}`, AgentA: scoresA[i] ?? null, AgentB: scoresB[i] ?? null });
  }

  return (
    <div className="h-full w-full bg-[#0a0f18]/70 rounded-2xl p-5 flex flex-col border border-gray-800/50 backdrop-blur-sm gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider">Credibility Trajectory</h3>
        <div className="flex items-center gap-4 text-[11px] font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-gray-400">Agent A</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-gray-400">Agent B</span>
          </span>
        </div>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="round"
              stroke="transparent"
              tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke="transparent"
              tick={{ fill: '#334155', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                borderColor: 'rgba(255,255,255,0.08)',
                color: '#f1f5f9',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                fontSize: '12px',
                fontWeight: 500,
                backdropFilter: 'blur(12px)',
              }}
            />
            <Area
              type="monotone"
              dataKey="AgentA"
              name="Agent A"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fill="url(#gradA)"
              dot={{ r: 4, fill: '#3b82f6', stroke: '#0a0f18', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#60a5fa', stroke: '#3b82f6', strokeWidth: 2 }}
              animationDuration={1200}
              animationEasing="ease-in-out"
            />
            <Area
              type="monotone"
              dataKey="AgentB"
              name="Agent B"
              stroke="#ef4444"
              strokeWidth={2.5}
              fill="url(#gradB)"
              dot={{ r: 4, fill: '#ef4444', stroke: '#0a0f18', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#f87171', stroke: '#ef4444', strokeWidth: 2 }}
              animationDuration={1200}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};