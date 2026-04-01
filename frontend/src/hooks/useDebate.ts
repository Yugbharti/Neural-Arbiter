import { useState, useCallback } from 'react';
import _useWebSocket from 'react-use-websocket';
import type { DebateState } from '../types';

// Vite ESM/CJS interop fallback
const useWebSocket = typeof _useWebSocket === 'function' ? _useWebSocket : (_useWebSocket as any).default;

export const useDebate = () => {
  const [state, setState] = useState<DebateState | null>(null);
  const [isWaitingForHuman, setIsWaitingForHuman] = useState(false);

  const { sendMessage, readyState } = useWebSocket('ws://localhost:8000/ws/debate', {
    onMessage: (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'state_update') {
        setState(data.state);
        // Check if the backend has paused for the human
        setIsWaitingForHuman(!!data.state.is_human_turn || data.state.current_speaker === 'Human');
      } else if (data.type === 'debate_ended') {
        console.log('Debate finished.');
        setIsWaitingForHuman(false);
      }
    },
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  const startDebate = useCallback((topic: string, isHumanMode: boolean) => {
    setState(null);
    setIsWaitingForHuman(false);
    // Send the human_in_loop flag to the backend
    sendMessage(JSON.stringify({ type: 'start', topic, human_in_loop: isHumanMode }));
  }, [sendMessage]);

  const submitArgument = useCallback((text: string) => {
    setIsWaitingForHuman(false); // Optimistically hide the input box
    // Send human input back to the backend
    sendMessage(JSON.stringify({ type: 'human_input', text }));
  }, [sendMessage]);

  return { state, readyState, startDebate, submitArgument, isWaitingForHuman };
};