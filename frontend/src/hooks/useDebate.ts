/**
 * useDebate.ts
 * Core WebSocket hook for Neural Arbiter.
 *
 * BYOK additions:
 *  • `startDebate` accepts an optional `userKeys` argument that is
 *    serialised into the initial JSON payload under the `user_keys` key.
 *  • If `userKeys` is null/undefined the backend falls back to its own
 *    environment-variable keys (or TEST_MODE if that is set server-side).
 *  • Keys never touch any persistent storage in this hook — they are
 *    passed in from React state owned by App.tsx / ApiModal and transmitted
 *    once over the WSS connection.
 */

import { useState, useCallback } from 'react';
import _useWebSocket, { ReadyState } from 'react-use-websocket';
import type { DebateState } from '../types';
import type { UserKeys } from '../components/ApiModal';

// Vite ESM/CJS interop fallback
const useWebSocket =
  typeof _useWebSocket === 'function'
    ? _useWebSocket
    : (_useWebSocket as any).default;

// ── Dynamic WS URL ────────────────────────────────────────────────────────────
// VITE_WS_URL  →  set this in your Render / Vercel env to the deployed WSS
//                 address, e.g.  wss://neural-arbiter-api.onrender.com/ws/debate
// Fallback     →  localhost for local development
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/debate';

// ── Wire-format type sent to the backend ─────────────────────────────────────
interface StartPayload {
  topic:         string;
  human_in_loop: boolean;
  /** Omitted entirely when no BYOK keys are provided. */
  user_keys?: {
    GOOGLE_API_KEY: string;
    GROQ_API_KEY:   string;
    /** Sentinel flag so the backend can detect TEST_KEY without string comparison in every node. */
    is_test_mode:   boolean;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
export const useDebate = () => {
  const [state, setState]                     = useState<DebateState | null>(null);
  const [isWaitingForHuman, setIsWaitingForHuman] = useState(false);

  const { sendMessage, readyState } = useWebSocket(WS_URL, {
    onMessage: (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'state_update') {
          setState(data.state);
          setIsWaitingForHuman(
            !!data.state.is_human_turn ||
            data.state.current_speaker === 'Human',
          );
        } else if (data.type === 'debate_ended') {
          console.log('[useDebate] Debate finished.');
          setIsWaitingForHuman(false);
        } else if (data.type === 'error') {
          console.error('[useDebate] Backend error:', data.message);
        }
      } catch (err) {
        console.error('[useDebate] Error parsing WebSocket message:', err);
      }
    },
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 3000,
  });

  /**
   * startDebate
   * Sends the initial payload to the backend.
   *
   * @param topic        — Debate topic string
   * @param isHumanMode  — Whether Human-in-the-Loop mode is active
   * @param userKeys     — Optional BYOK keys from ApiModal state.
   *                       When null, the backend uses its own env keys.
   *                       When keys contain "TEST_KEY", backend forces TEST_MODE.
   */
  const startDebate = useCallback(
    (topic: string, isHumanMode: boolean, userKeys: UserKeys | null = null) => {
      setState(null);
      setIsWaitingForHuman(false);

      const payload: StartPayload = {
        topic,
        human_in_loop: isHumanMode,
      };

      // Only attach user_keys when the caller has actually provided them.
      // Never send null/undefined keys — let the backend decide its fallback.
      if (userKeys) {
        payload.user_keys = {
          GOOGLE_API_KEY: userKeys.googleApiKey,
          GROQ_API_KEY:   userKeys.groqApiKey,
          is_test_mode:   userKeys.isTestMode,
        };
      }

      console.log(
        '[useDebate] startDebate →',
        `topic="${topic}"`,
        `human_mode=${isHumanMode}`,
        userKeys
          ? `BYOK=${userKeys.isTestMode ? 'TEST_MODE_SENTINEL' : 'user-supplied-keys'}`
          : 'BYOK=none (server env fallback)',
      );

      sendMessage(JSON.stringify(payload));
    },
    [sendMessage],
  );

  /**
   * submitArgument
   * Sends the human's typed argument during a HITL interrupt.
   */
  const submitArgument = useCallback(
    (text: string) => {
      setIsWaitingForHuman(false);
      sendMessage(JSON.stringify({ type: 'human_input', text }));
    },
    [sendMessage],
  );

  return {
    state,
    readyState,
    startDebate,
    submitArgument,
    isWaitingForHuman,
    ReadyState, // re-exported so consumers don't need a separate import
  };
};