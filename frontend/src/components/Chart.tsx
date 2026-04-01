import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { DebateState } from '../types';

interface ChartProps {
  state: DebateState | null;
}

export const Chart: React.FC<ChartProps> = ({ state }) => {
  if (!state) return <div className="h-full flex items-center justify-center text-gray-500 bg-gray-900 rounded-lg shadow-xl border border-gray-800">Waiting for data...</div>;

  const data = [];
  const scoresA = state.credibility_scores?.['Agent A'] || [];
  const scoresB = state.credibility_scores?.['Agent B'] || [];
  const maxLen = Math.max(scoresA.length, scoresB.length);
  
  for (let i = 0; i < maxLen; i++) {
    data.push({ round: i + 1, AgentA: scoresA[i] ?? null, AgentB: scoresB[i] ?? null });
  }

  return (
    <div className="h-full w-full bg-gray-900 rounded-lg p-4 flex flex-col shadow-xl border border-gray-800 gap-2">
      <h3 className="text-lg font-semibold text-gray-200">Credibility Trajectory</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="round" stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} />
            <YAxis domain={[0, 100]} stroke="#6b7280" tick={{fill: '#9ca3af', fontSize: 12}} />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '8px' }} />
            <Legend wrapperStyle={{ color: '#d1d5db', paddingTop: '10px' }}/>
            <Line type="monotone" dataKey="AgentA" name="Agent A (Flash)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="AgentB" name="Agent B (Llama3)" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};