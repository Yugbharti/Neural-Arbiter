/**
 * Chat.tsx — Real-time debate chat with modern chat bubble UI.
 *
 * The delay/reveal logic is now handled by useSyncedReveal at the App level.
 * This component simply renders whatever `state.transcript` it receives,
 * plus shows a "thinking" bubble when `isThinking` + `thinkingSpeaker` are set.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { DebateState } from '../types';
import { Send, Bot, Gavel, User } from 'lucide-react';
import './Chat.css';

interface ChatProps {
  state: DebateState | null;
  isWaitingForHuman?: boolean;
  onSubmitArgument?: (text: string) => void;
  /** Whether the next message is in "thinking" phase (from useSyncedReveal) */
  isThinking?: boolean;
  /** The speaker who is "thinking" */
  thinkingSpeaker?: string | null;
  /** Total messages from backend (including unrevealed) */
  totalMessages?: number;
  /** Number of currently revealed messages */
  revealedMessages?: number;
}

function AgentAvatar({ speaker }: { speaker: string }) {
  if (speaker === 'Agent A') {
    return (
      <div className="chat-avatar chat-avatar--a">
        <Bot size={14} />
      </div>
    );
  }
  if (speaker === 'Agent B') {
    return (
      <div className="chat-avatar chat-avatar--b">
        <Bot size={14} />
      </div>
    );
  }
  if (speaker === 'Judge') {
    return (
      <div className="chat-avatar chat-avatar--judge">
        <Gavel size={14} />
      </div>
    );
  }
  return (
    <div className="chat-avatar chat-avatar--human">
      <User size={14} />
    </div>
  );
}

/* ── Thinking indicator bubble ─────────────────────────────────────────────── */
const THINKING_PHASES = [
  'is analyzing arguments',
  'is cross-referencing sources',
  'is formulating response',
  'is evaluating counter-points',
  'is synthesizing evidence',
];

function ThinkingBubble({ speaker }: { speaker: string }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const isA     = speaker === 'Agent A';
  const isB     = speaker === 'Agent B';
  const isJudge = speaker === 'Judge';

  // Cycle through thinking phases every 800ms
  useEffect(() => {
    const startIdx = Math.floor(Math.random() * THINKING_PHASES.length);
    setPhaseIdx(startIdx);
    const interval = setInterval(() => {
      setPhaseIdx((prev) => (prev + 1) % THINKING_PHASES.length);
    }, 800);
    return () => clearInterval(interval);
  }, [speaker]);

  const alignClass = isA ? 'chat-row--left'
    : isB ? 'chat-row--right'
    : isJudge ? 'chat-row--center'
    : 'chat-row--left';

  const bubbleClass = isA ? 'chat-bubble--a'
    : isB ? 'chat-bubble--b'
    : isJudge ? 'chat-bubble--judge'
    : 'chat-bubble--human';

  return (
    <div className={`chat-row ${alignClass}`}>
      {(isA || isJudge || (!isB)) && <AgentAvatar speaker={speaker} />}

      <div className={`chat-bubble ${bubbleClass} chat-bubble--thinking`}>
        <div className="chat-thinking-label">
          <span className="chat-thinking-name">{speaker}</span>
          <span className="chat-thinking-text"> {THINKING_PHASES[phaseIdx]}...</span>
        </div>
        <div className="chat-typing">
          <span /><span /><span />
        </div>
      </div>

      {isB && <AgentAvatar speaker={speaker} />}
    </div>
  );
}


export const Chat: React.FC<ChatProps> = ({
  state,
  isWaitingForHuman,
  onSubmitArgument,
  isThinking = false,
  thinkingSpeaker = null,
  totalMessages = 0,
  revealedMessages = 0,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');

  const transcript = state?.transcript || [];

  // Auto-scroll when messages change or thinking state changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [transcript.length, isThinking]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && onSubmitArgument) {
      onSubmitArgument(inputValue);
      setInputValue('');
    }
  };

  const isAgentA = (speaker: string) => speaker === 'Agent A';
  const isAgentB = (speaker: string) => speaker === 'Agent B';
  const isJudge  = (speaker: string) => speaker === 'Judge';

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header__left">
          <div className="chat-header__dot" />
          <h3 className="chat-header__title">Live Debate</h3>
        </div>
        <span className="chat-header__count">
          {revealedMessages} / {totalMessages} {totalMessages === 1 ? 'message' : 'messages'}
        </span>
      </div>

      {/* Messages */}
      <div className="chat-messages" ref={scrollRef}>
        {transcript.length === 0 && !isThinking ? (
          <div className="chat-empty">
            <div className="chat-empty__icon">
              <Bot size={24} />
            </div>
            <p>Waiting for the debate to begin...</p>
            <span>Agents are preparing their arguments</span>
          </div>
        ) : (
          <>
            {/* Revealed messages (from syncedState — already filtered) */}
            {transcript.map((entry, index) => {
              const text = (entry as any).argument || entry.text || '...';
              const alignClass = isAgentA(entry.speaker)
                ? 'chat-row--left'
                : isAgentB(entry.speaker)
                  ? 'chat-row--right'
                  : isJudge(entry.speaker)
                    ? 'chat-row--center'
                    : 'chat-row--left';

              const bubbleClass = isAgentA(entry.speaker)
                ? 'chat-bubble--a'
                : isAgentB(entry.speaker)
                  ? 'chat-bubble--b'
                  : isJudge(entry.speaker)
                    ? 'chat-bubble--judge'
                    : 'chat-bubble--human';

              return (
                <div
                  key={index}
                  className={`chat-row ${alignClass}`}
                  style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}
                >
                  {(isAgentA(entry.speaker) || isJudge(entry.speaker)) && (
                    <AgentAvatar speaker={entry.speaker} />
                  )}

                  <div className={`chat-bubble ${bubbleClass}`}>
                    <div className="chat-bubble__speaker">{entry.speaker}</div>
                    <div className="chat-bubble__text">{text}</div>
                    <div className="chat-bubble__meta">
                      Round {Math.ceil((index + 1) / 2)}
                    </div>
                  </div>

                  {isAgentB(entry.speaker) && (
                    <AgentAvatar speaker={entry.speaker} />
                  )}
                </div>
              );
            })}

            {/* Thinking indicator — driven by App-level useSyncedReveal */}
            {isThinking && thinkingSpeaker && (
              <ThinkingBubble speaker={thinkingSpeaker} />
            )}
          </>
        )}
      </div>

      {/* Human Input */}
      {isWaitingForHuman && (
        <div className="chat-input-area">
          <form onSubmit={handleSubmit} className="chat-input-form">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your rebuttal..."
              className="chat-input"
            />
            <button type="submit" disabled={!inputValue.trim()} className="chat-send-btn">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};