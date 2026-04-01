import { useState, useCallback } from 'react';
import _useWebSocket, { ReadyState } from 'react-use-websocket'; // Added ReadyState import
import type { DebateState } from '../types';

// Vite ESM/CJS interop fallback
const useWebSocket = typeof _useWebSocket === 'function' ? _useWebSocket : (_useWebSocket as any).default;

// ── DYNAMIC URL LOGIC ──
// This looks for the VITE_WS_URL you set in Render. 
// If it doesn't find it (like on your laptop), it defaults to localhost.
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/debate';

export const useDebate = () => {
  const [state, setState] = useState<DebateState | null>(null);
  const [isWaitingForHuman, setIsWaitingForHuman] = useState(false);

  // We use the dynamic WS_URL variable here instead of the hardcoded string
  const { sendMessage, readyState } = useWebSocket(WS_URL, {
    onMessage: (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'state_update') {
          setState(data.state);
          setIsWaitingForHuman(!!data.state.is_human_turn || data.state.current_speaker === 'Human');
        } else if (data.type === 'debate_ended') {
          console.log('Debate finished.');
          setIsWaitingForHuman(false);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    },
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  const startDebate = useCallback((topic: string, isHumanMode: boolean) => {
    setState(null);
    setIsWaitingForHuman(false);
    sendMessage(JSON.stringify({ topic, human_in_loop: isHumanMode }));
  }, [sendMessage]);

  const submitArgument = useCallback((text: string) => {
    setIsWaitingForHuman(false); 
    sendMessage(JSON.stringify({ type: 'human_input', text }));
  }, [sendMessage]);

  // We export ReadyState so App.tsx can use it for the "Online/Offline" indicator
  return { state, readyState, startDebate, submitArgument, isWaitingForHuman, ReadyState };
};