/**
 * useSyncedReveal.ts — Centralized delayed reveal for all dashboard components.
 *
 * All dashboard components consume the filtered state from this hook
 * so chat, graph, chart, sidebar update in perfect sync.
 *
 * BUG FIX: Previous version had a race condition where setIsThinking(true)
 * triggered a re-render → useEffect cleanup cleared the setTimeout before
 * it could fire, causing the reveal to freeze forever on "thinking".
 *
 * FIX: Use refs for mutable tracking and only use state for render-triggering
 * values. The timer is managed independently of React's render cycle.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { DebateState } from '../types';

interface SyncedRevealResult {
  syncedState: DebateState | null;
  isThinking: boolean;
  thinkingSpeaker: string | null;
  totalMessages: number;
  revealedMessages: number;
}

export function useSyncedReveal(
  rawState: DebateState | null,
  delayMin = 2000,
  delayMax = 4000,
): SyncedRevealResult {
  const [revealedCount, setRevealedCount] = useState(0);
  const [thinkingFor, setThinkingFor]     = useState<string | null>(null);

  // Refs for mutable tracking (don't trigger re-renders, don't get stale)
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessing  = useRef(false);
  const revealedRef   = useRef(0);

  const transcript = rawState?.transcript || [];
  const transcriptLen = transcript.length;

  // Keep ref in sync
  revealedRef.current = revealedCount;

  // ── Reveal next message ─────────────────────────────────────────────────
  const revealNext = useCallback(() => {
    const currentRevealed = revealedRef.current;

    if (currentRevealed >= transcriptLen) {
      // All caught up — nothing to reveal
      isProcessing.current = false;
      setThinkingFor(null);
      return;
    }

    // Show "thinking" for this speaker
    const nextSpeaker = transcript[currentRevealed]?.speaker || 'Agent A';
    setThinkingFor(nextSpeaker);
    isProcessing.current = true;

    // Realistic delay — varies by message position for natural feel
    //  First message: shorter (agent starts quick)
    //  Later messages: slightly longer (deeper analysis)
    const progress = currentRevealed / Math.max(transcriptLen, 1);
    const baseDelay = delayMin + progress * (delayMax - delayMin) * 0.5;
    const jitter = Math.random() * 800;
    const delay = baseDelay + jitter;

    timerRef.current = setTimeout(() => {
      setRevealedCount((prev) => {
        const next = prev + 1;
        revealedRef.current = next;
        return next;
      });
      setThinkingFor(null);
      isProcessing.current = false;
      // Don't call revealNext here — let the effect handle the next cycle
    }, delay);
  }, [transcriptLen, transcript, delayMin, delayMax]);

  // ── Drive the reveal loop ───────────────────────────────────────────────
  // This effect fires when revealedCount changes or new messages arrive.
  // It kicks off the next reveal cycle if there's work to do.
  useEffect(() => {
    if (transcriptLen > revealedCount && !isProcessing.current) {
      revealNext();
    }
  }, [transcriptLen, revealedCount, revealNext]);

  // ── Reset on new debate ─────────────────────────────────────────────────
  useEffect(() => {
    if (transcriptLen === 0 && revealedCount > 0) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      isProcessing.current = false;
      setRevealedCount(0);
      revealedRef.current = 0;
      setThinkingFor(null);
    }
  }, [transcriptLen, revealedCount]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ── Build the synced (filtered) state ───────────────────────────────────
  const syncedState = useMemo<DebateState | null>(() => {
    if (!rawState) return null;

    const visibleTranscript = rawState.transcript.slice(0, revealedCount);
    const visibleNodes = rawState.argument_nodes.slice(0, revealedCount);

    // Credibility scores — each round ≈ 2 transcript entries
    const revealedRounds = Math.ceil(revealedCount / 2);
    const visibleScoresA = (rawState.credibility_scores?.['Agent A'] || []).slice(0, revealedRounds);
    const visibleScoresB = (rawState.credibility_scores?.['Agent B'] || []).slice(0, revealedRounds);

    const visibleRoundsCompleted = Math.min(rawState.rounds_completed, revealedRounds);

    const visibleSpeaker = visibleTranscript.length > 0
      ? visibleTranscript[visibleTranscript.length - 1].speaker
      : rawState.current_speaker;

    // Bias — show after a few messages
    const visibleBias = revealedCount >= 2 ? rawState.latest_bias : null;

    // Final verdict — ONLY after ALL messages revealed
    const allRevealed = revealedCount >= transcriptLen && transcriptLen > 0;
    const visibleVerdict = allRevealed ? rawState.final_verdict : null;

    return {
      ...rawState,
      transcript: visibleTranscript,
      argument_nodes: visibleNodes,
      credibility_scores: {
        'Agent A': visibleScoresA,
        'Agent B': visibleScoresB,
      },
      rounds_completed: visibleRoundsCompleted,
      current_speaker: visibleSpeaker,
      latest_bias: visibleBias,
      final_verdict: visibleVerdict,
    };
  }, [rawState, revealedCount, transcriptLen]);

  return {
    syncedState,
    isThinking: thinkingFor !== null,
    thinkingSpeaker: thinkingFor,
    totalMessages: transcriptLen,
    revealedMessages: revealedCount,
  };
}
