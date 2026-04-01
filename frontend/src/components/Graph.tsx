import React, { useMemo } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  BackgroundVariant, 
  Handle, 
  Position, 
  type NodeProps, 
  type Node, 
  type Edge 
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { DebateState } from '../types';

// 1. Custom Node Component
const CustomDebateNode = ({ data }: NodeProps) => {
  const isAgentA = data.speaker === 'Agent A';
  const isHuman = data.speaker === 'Human';

  // Dynamic colors based on speaker
  const bgClass = isAgentA 
    ? 'bg-blue-950/90 border-blue-800 shadow-[0_0_15px_rgba(30,58,138,0.3)]' 
    : isHuman 
      ? 'bg-emerald-950/90 border-emerald-800 shadow-[0_0_15px_rgba(6,78,59,0.3)]' 
      : 'bg-red-950/90 border-red-800 shadow-[0_0_15px_rgba(127,29,29,0.3)]';
      
  const badgeClass = isAgentA 
    ? 'bg-blue-900 text-blue-200' 
    : isHuman 
      ? 'bg-emerald-900 text-emerald-200' 
      : 'bg-red-900 text-red-200';

  return (
    <div className={`px-4 py-4 rounded-xl border ${bgClass} backdrop-blur-md min-w-[280px] max-w-[320px] transition-all duration-500`}>
      <Handle type="target" position={Position.Top} className="w-2 h-2 !bg-gray-500 border-none" />
      
      <div className="flex justify-between items-center mb-3 gap-2 border-b border-gray-700/50 pb-2">
        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded tracking-widest ${badgeClass}`}>
          {data.type as string}
        </span>
        <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
          {data.speaker as string}
        </span>
      </div>
      
      <div className="text-xs text-gray-100 leading-relaxed whitespace-pre-wrap font-medium">
        {data.content as string}
      </div>

      <div className="mt-3 pt-2 border-t border-gray-800/50 flex justify-between items-center">
        <span className="text-[9px] text-gray-500 uppercase font-bold">Strength</span>
        <span className={`text-[9px] font-bold uppercase ${data.strength === 'strong' ? 'text-emerald-400' : 'text-amber-400'}`}>
          {data.strength as string}
        </span>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2 !bg-gray-500 border-none" />
    </div>
  );
};

const nodeTypes = {
  custom: CustomDebateNode,
};

interface GraphProps {
  state: DebateState | null;
}

export const Graph: React.FC<GraphProps> = ({ state }) => {
  
  // 2. Map State to Nodes
  const nodes: Node[] = useMemo(() => {
    if (!state?.argument_nodes) return [];
    
    return state.argument_nodes.map((n, i) => {
      const isAgentA = n.speaker === 'Agent A';
      
      return {
        id: n.id,
        type: 'custom',
        position: { 
          x: isAgentA ? 50 : 450, 
          y: i * 220 + 50 
        },
        data: { 
          // IMPORTANT: Mapping 'fallacy' from backend to 'type' for the badge
          type: n.fallacy && n.fallacy !== 'none' ? n.fallacy : 'Core Argument', 
          speaker: n.speaker, 
          // IMPORTANT: Mapping 'claim' from backend to 'content' for the display
          content: n.claim || "Synthesizing point...",
          strength: n.strength || "moderate"
        },
      };
    });
  }, [state?.argument_nodes]);

  // 3. Map State to Edges
  const edges: Edge[] = useMemo(() => {
    if (!state?.argument_nodes || state.argument_nodes.length < 2) return [];
    
    const result: Edge[] = [];
    for (let i = 1; i < state.argument_nodes.length; i++) {
      result.push({
        id: `e-${state.argument_nodes[i-1].id}-${state.argument_nodes[i].id}`,
        source: state.argument_nodes[i-1].id,
        target: state.argument_nodes[i].id,
        animated: true,
        type: 'smoothstep', // Cleaner look for side-to-side transitions
        style: { stroke: '#4b5563', strokeWidth: 2, opacity: 0.4 }
      });
    }
    return result;
  }, [state?.argument_nodes]);

  if (!state) return <div className="h-full bg-gray-900 rounded-xl border border-gray-800 animate-pulse"></div>;

  return (
    <div className="h-full w-full bg-[#0d1117] rounded-xl border border-gray-800 flex flex-col shadow-2xl overflow-hidden relative group">
      <div className="absolute z-10 p-4 w-full bg-gradient-to-b from-gray-900 to-transparent pointer-events-none">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
          Argument Validation Flow
        </h3>
      </div>

      <div className="flex-1 w-full relative">
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          nodeTypes={nodeTypes}
          fitView 
          fitViewOptions={{ padding: 0.3 }}
          colorMode="dark"
        >
          <Background variant={BackgroundVariant.Dots} gap={30} size={1} color="#1f2937" />
          <Controls className="bg-gray-800 border-gray-700 fill-gray-400 rounded-lg shadow-xl" />
          
        </ReactFlow>
      </div>
    </div>
  );
};