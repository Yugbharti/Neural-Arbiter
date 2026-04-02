/**
 * PromptPage.tsx — Gemini / ChatGPT / Claude-style landing prompt page.
 *
 * Features:
 *  • Time-of-day greeting with animated gradient text
 *  • Centered, minimal textarea input (like Gemini's prompt bar)
 *  • Animated suggestion chips for quick topic selection
 *  • Mode toggles (AI vs AI / Human vs AI) + API key controls
 *  • Subtle ambient animations and glassmorphism
 *  • "Coming Soon" roadmap section with futuristic feature cards
 */

import { useState, useRef, useEffect, useMemo } from 'react';
import { ReadyState } from 'react-use-websocket';
import {
  ArrowUp,
  Sparkles,
  Swords,
  Brain,
  Atom,
  Scale,
  Shield,
  KeyRound,
  FlaskConical,
  Bug,
  Zap,
  Rocket,
  RefreshCcw,
  FileSearch,
  Users,
  Globe,
  ChevronDown,
} from 'lucide-react';
import type { UserKeys } from './ApiModal';

/* ── Suggestion chips ──────────────────────────────────────────────────────── */
const SUGGESTIONS = [
  { icon: <Atom size={16} />,   label: 'Quantum Computing vs Classical Computing' },
  { icon: <Brain size={16} />,  label: 'Is AGI an Existential Risk?' },
  { icon: <Scale size={16} />,  label: 'Open Source vs Proprietary AI' },
  { icon: <Swords size={16} />, label: 'Nuclear Energy: Savior or Threat?' },
  { icon: <Zap size={16} />,    label: 'Remote Work vs Office Culture' },
  { icon: <Sparkles size={16} />, label: 'Should AI Have Legal Rights?' },
];

/* ── Coming Soon features ──────────────────────────────────────────────────── */
const COMING_SOON = [
  {
    id: 1,
    icon: <RefreshCcw size={20} />,
    featureName: 'Recursive Self-Correction',
    technicalPitch:
      "Agents will be able to 'think twice' before speaking, using a hidden Reflection Node to fact-check their own logic before it hits the transcript.",
    color: '#60a5fa',
  },
  {
    id: 2,
    icon: <FileSearch size={20} />,
    featureName: 'Multi-Modal Evidence',
    technicalPitch:
      'Moving beyond text: Agents will be able to analyze PDFs, medical scans, and live charts to provide data-backed rebuttals.',
    color: '#a78bfa',
  },
  {
    id: 3,
    icon: <Users size={20} />,
    featureName: "The 'Jury of Peers'",
    technicalPitch:
      'Transitioning from 1 Judge to a consensus-based panel of 3 specialized LLMs (Logic Expert, Fact Expert, and Ethics Expert).',
    color: '#f472b6',
  },
  {
    id: 4,
    icon: <Globe size={20} />,
    featureName: 'Real-Time Web Synthesis',
    technicalPitch:
      'Integration with Perplexity or Tavily for deep-web crawling, allowing agents to cite news that happened only minutes ago.',
    color: '#34d399',
  },
  {
    id: 5,
    icon: <Swords size={20} />,
    featureName: 'Human-Agent Tag Team',
    technicalPitch:
      "A 'Co-pilot' mode where you and an AI agent can team up against another AI-Human pair in a 2-vs-2 logical battle.",
    color: '#fb923c',
  },
];

/* ── Time-of-day greeting ──────────────────────────────────────────────────── */
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Props ─────────────────────────────────────────────────────────────────── */
interface PromptPageProps {
  readyState:       ReadyState;
  isHumanMode:      boolean;
  isMockMode:       boolean;
  savedKeys:        UserKeys | null;
  onHumanModeToggle: (v: boolean) => void;
  onMockModeToggle: () => void;
  onOpenApiModal:   () => void;
  onDevModeToggle:  () => void;
  isDevMode:        boolean;
  onStartDebate:    (topic: string) => void;
}

/* ── Component ─────────────────────────────────────────────────────────────── */
export function PromptPage({
  readyState,
  isHumanMode,
  isMockMode,
  savedKeys,
  onHumanModeToggle,
  onMockModeToggle,
  onOpenApiModal,
  onDevModeToggle,
  isDevMode,
  onStartDebate,
}: PromptPageProps) {
  const [topic, setTopic]             = useState('');
  const [isFocused, setIsFocused]     = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);
  const greeting                      = useMemo(() => getGreeting(), []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, [topic]);

  const handleSubmit = () => {
    if (!topic.trim()) return;
    onStartDebate(topic.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isConnected = readyState === ReadyState.OPEN;

  return (
    <div className="prompt-page">
      {/* ── Ambient background orbs ────────────────────────────────────────── */}
      <div className="prompt-page__orb prompt-page__orb--1" />
      <div className="prompt-page__orb prompt-page__orb--2" />
      <div className="prompt-page__orb prompt-page__orb--3" />

      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <header className="prompt-page__header">
        <div className="prompt-page__brand">
          <div className="prompt-page__logo-icon">
            <Shield size={20} />
          </div>
          <span className="prompt-page__brand-name">Neural Arbiter</span>
          <span className={`prompt-page__conn-dot ${isConnected ? 'prompt-page__conn-dot--on' : ''}`} />
        </div>

        <div className="prompt-page__header-actions">
          {/* API Keys button */}
          <button
            onClick={onOpenApiModal}
            className={`prompt-page__btn-subtle ${!savedKeys ? 'prompt-page__btn-subtle--pulse' : ''}`}
            title="Configure API Keys"
          >
            <KeyRound size={14} />
            <span>{savedKeys ? (savedKeys.isTestMode ? 'Test Keys' : 'Keys Set') : 'API Keys'}</span>
          </button>

          {/* Mock / Live toggle */}
          <button
            onClick={onMockModeToggle}
            className={`prompt-page__btn-subtle ${isMockMode ? 'prompt-page__btn-subtle--mock' : ''}`}
            title={isMockMode ? 'Mock Mode ON' : 'Live Mode'}
          >
            <FlaskConical size={14} />
            <span>{isMockMode ? 'Mock' : 'Live'}</span>
          </button>

          {/* Dev toggle */}
          <button
            onClick={onDevModeToggle}
            className={`prompt-page__btn-icon ${isDevMode ? 'prompt-page__btn-icon--active' : ''}`}
            title="Dev Inspector (Shift+D)"
          >
            <Bug size={15} />
          </button>
        </div>
      </header>

      {/* ── Central content ────────────────────────────────────────────────── */}
      <main className="prompt-page__main">
        {/* Greeting */}
        <div className="prompt-page__greeting-wrapper">
          <h1 className="prompt-page__greeting">{greeting}</h1>
          <p className="prompt-page__subtitle">
            What topic should the AI agents debate today?
          </p>
        </div>

        {/* ── Prompt bar ───────────────────────────────────────────────────── */}
        <div className={`prompt-page__input-container ${isFocused ? 'prompt-page__input-container--focused' : ''}`}>
          <textarea
            ref={textareaRef}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Enter a debate topic..."
            rows={1}
            className="prompt-page__textarea"
          />
          <div className="prompt-page__input-actions">
            {/* Mode selector — compact pills inside the input */}
            <div className="prompt-page__mode-pills">
              <button
                onClick={() => onHumanModeToggle(false)}
                className={`prompt-page__mode-pill ${!isHumanMode ? 'prompt-page__mode-pill--active' : ''}`}
              >
                AI vs AI
              </button>
              <button
                onClick={() => onHumanModeToggle(true)}
                className={`prompt-page__mode-pill ${isHumanMode ? 'prompt-page__mode-pill--active-human' : ''}`}
              >
                Human vs AI
              </button>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!topic.trim() || !isConnected}
              className="prompt-page__send-btn"
              title={!isConnected ? 'Waiting for connection...' : 'Start Debate'}
            >
              <ArrowUp size={18} />
            </button>
          </div>
        </div>

        {/* ── Suggestion chips ─────────────────────────────────────────────── */}
        <div className="prompt-page__suggestions">
          {SUGGESTIONS.map((s, i) => (
            <button
              key={i}
              onClick={() => setTopic(s.label)}
              className="prompt-page__chip"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="prompt-page__chip-icon">{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </main>

      {/* ── Coming Soon Roadmap ─────────────────────────────────────────────── */}
      <section className="roadmap">
        <button
          className={`roadmap__toggle ${showRoadmap ? 'roadmap__toggle--open' : ''}`}
          onClick={() => setShowRoadmap((p) => !p)}
        >
          <div className="roadmap__toggle-left">
            <Rocket size={14} />
            <span>Coming Soon — Future Roadmap</span>
          </div>
          <ChevronDown size={16} className={`roadmap__chevron ${showRoadmap ? 'roadmap__chevron--open' : ''}`} />
        </button>

        {showRoadmap && (
          <div className="roadmap__cards">
            {COMING_SOON.map((f, i) => (
              <div
                key={f.id}
                className="roadmap__card"
                style={{
                  animationDelay: `${i * 100}ms`,
                  '--card-accent': f.color,
                } as React.CSSProperties}
              >
                <div className="roadmap__card-header">
                  <div className="roadmap__card-icon" style={{ color: f.color, borderColor: `${f.color}30`, background: `${f.color}10` }}>
                    {f.icon}
                  </div>
                  <span className="roadmap__badge">Coming Soon</span>
                </div>
                <h4 className="roadmap__card-title">{f.featureName}</h4>
                <p className="roadmap__card-desc">{f.technicalPitch}</p>
                <div className="roadmap__card-glow" style={{ background: `${f.color}08` }} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="prompt-page__footer">
        <span>Powered by LangGraph · Gemini · Groq</span>
        <span className="prompt-page__footer-sep">•</span>
        <span>Autonomous Reasoning Engine v1.0</span>
      </footer>
    </div>
  );
}
