/**
 * DashboardNav.tsx — Simplified top bar for the debate dashboard.
 *
 * Shows: topic, connection status, round progress, "View Verdict" (when available),
 * and "New Topic" to go back to the prompt page.
 * Does NOT include: API Keys, Mock/Live toggle, Mode selector (those are on PromptPage).
 */

import { ReadyState } from 'react-use-websocket';
import { Shield, RotateCcw, FileText, Loader, Bug } from 'lucide-react';
import './DashboardNav.css';

interface DashboardNavProps {
  readyState:     ReadyState;
  topic:          string;
  roundsCompleted: number;
  hasVerdict:     boolean;
  isDevMode:      boolean;
  onViewVerdict:  () => void;
  onNewTopic:     () => void;
  onDevModeToggle: () => void;
}

export function DashboardNav({
  readyState,
  topic,
  roundsCompleted,
  hasVerdict,
  isDevMode,
  onViewVerdict,
  onNewTopic,
  onDevModeToggle,
}: DashboardNavProps) {
  const isConnected = readyState === ReadyState.OPEN;
  const isDebating  = roundsCompleted > 0 && !hasVerdict;

  return (
    <header className="dash-nav">
      {/* Left: Brand + topic */}
      <div className="dash-nav__left">
        <div className="dash-nav__logo">
          <Shield size={18} />
        </div>
        <div className="dash-nav__info">
          <div className="dash-nav__title-row">
            <span className="dash-nav__brand">Neural Arbiter</span>
            <span className={`dash-nav__conn ${isConnected ? 'dash-nav__conn--on' : ''}`} />
          </div>
          <p className="dash-nav__topic" title={topic}>
            {topic || 'No topic'}
          </p>
        </div>
      </div>

      {/* Center: Progress */}
      <div className="dash-nav__center">
        {isDebating && (
          <div className="dash-nav__progress">
            <Loader size={13} className="dash-nav__spin" />
            <span>Round {roundsCompleted} / 3</span>
          </div>
        )}
        {hasVerdict && (
          <div className="dash-nav__completed">
            <span>✓ Debate Complete</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="dash-nav__right">
        {hasVerdict && (
          <button onClick={onViewVerdict} className="dash-nav__btn dash-nav__btn--verdict">
            <FileText size={14} />
            <span>View Verdict</span>
          </button>
        )}

        <button onClick={onNewTopic} className="dash-nav__btn dash-nav__btn--new">
          <RotateCcw size={14} />
          <span>New Topic</span>
        </button>

        <button
          onClick={onDevModeToggle}
          className={`dash-nav__icon-btn ${isDevMode ? 'dash-nav__icon-btn--active' : ''}`}
          title="Dev Inspector (Shift+D)"
        >
          <Bug size={15} />
        </button>
      </div>
    </header>
  );
}
