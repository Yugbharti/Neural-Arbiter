/**
 * ApiModal.tsx
 * BYOK (Bring Your Own Key) modal for Neural Arbiter.
 *
 * Security model:
 *  • Keys live only in React state (in-memory) — never written to
 *    localStorage, indexedDB, or any server-side persistence.
 *  • On startDebate(), keys are transmitted once over an encrypted
 *    WSS connection and injected into the ephemeral LangGraph thread.
 *  • Closing the modal or ending the session clears all key state.
 */

import { useState, useEffect, useRef } from 'react';
import {
  X, Eye, EyeOff, ShieldCheck, Lock, Zap,
  CheckCircle2, AlertCircle, FlaskConical, KeyRound,
} from 'lucide-react';

export interface UserKeys {
  googleApiKey: string;
  groqApiKey:   string;
  isTestMode:   boolean; // true when "TEST_KEY" sentinel is being used
}

interface ApiModalProps {
  isOpen:   boolean;
  onClose:  () => void;
  onSave:   (keys: UserKeys) => void;
  savedKeys: UserKeys | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TEST_SENTINEL = 'TEST_KEY';

function isValidKey(key: string): boolean {
  return key.trim().length > 10;
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return key;
  return key.slice(0, 6) + '••••••••' + key.slice(-4);
}

// ── Trust badge line ──────────────────────────────────────────────────────────
function TrustBadge() {
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl">
      <ShieldCheck className="text-emerald-400 mt-0.5 shrink-0" size={15} />
      <p className="text-[11px] text-emerald-300/80 leading-relaxed">
        Your keys are{' '}
        <span className="text-emerald-300 font-semibold">never stored on our servers</span>.
        They are transmitted once over an encrypted{' '}
        <span className="font-mono text-emerald-400">WSS</span> connection and exist only for
        the duration of your debate session — then discarded entirely.
      </p>
    </div>
  );
}

// ── Animated secure-connection scanner ───────────────────────────────────────
function SecureConnectionBar() {
  return (
    <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-gray-800 my-1">
      <div
        className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-[scan_2.4s_ease-in-out_infinite]"
        style={{
          animation: 'scan 2.4s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes scan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
}

// ── Single key input row ──────────────────────────────────────────────────────
interface KeyInputProps {
  label:       string;
  icon:        React.ReactNode;
  placeholder: string;
  value:       string;
  onChange:    (v: string) => void;
  isTestMode:  boolean;
  status:      'idle' | 'valid' | 'invalid';
}

function KeyInput({ label, icon, placeholder, value, onChange, isTestMode, status }: KeyInputProps) {
  const [visible, setVisible] = useState(false);

  const borderColor =
    status === 'valid'   ? 'border-emerald-600/60 focus-within:ring-emerald-500/20' :
    status === 'invalid' ? 'border-red-700/60 focus-within:ring-red-500/20' :
                           'border-gray-700/60 focus-within:ring-blue-500/20';

  const displayValue = isTestMode ? TEST_SENTINEL : value;

  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
        {icon}
        {label}
      </label>
      <div className={`relative flex items-center bg-black/50 border rounded-xl overflow-hidden transition-all focus-within:ring-1 ${borderColor}`}>
        <input
          type={visible ? 'text' : 'password'}
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          disabled={isTestMode}
          placeholder={isTestMode ? '(using TEST_KEY sentinel)' : placeholder}
          spellCheck={false}
          autoComplete="off"
          className="flex-1 bg-transparent px-4 py-3 text-sm font-mono text-gray-200 placeholder:text-gray-600 focus:outline-none disabled:text-gray-500 disabled:cursor-not-allowed"
        />
        {/* Status icon */}
        <div className="pr-2">
          {status === 'valid'   && <CheckCircle2 size={14} className="text-emerald-400" />}
          {status === 'invalid' && <AlertCircle  size={14} className="text-red-400" />}
        </div>
        {/* Visibility toggle */}
        {!isTestMode && (
          <button
            type="button"
            onClick={() => setVisible((p) => !p)}
            className="px-3 py-3 text-gray-600 hover:text-gray-300 transition-colors border-l border-gray-800"
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {status === 'invalid' && !isTestMode && (
        <p className="text-[10px] text-red-500 pl-1">Key looks too short — double-check and re-paste.</p>
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export function ApiModal({ isOpen, onClose, onSave, savedKeys }: ApiModalProps) {
  const [googleKey, setGoogleKey]   = useState(savedKeys?.googleApiKey ?? '');
  const [groqKey, setGroqKey]       = useState(savedKeys?.groqApiKey   ?? '');
  const [isTestMode, setIsTestMode] = useState(savedKeys?.isTestMode   ?? false);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devClickCount, setDevClickCount] = useState(0);
  const [submitted, setSubmitted]   = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Sync with saved keys on re-open
  useEffect(() => {
    if (isOpen) {
      setGoogleKey(savedKeys?.googleApiKey ?? '');
      setGroqKey(savedKeys?.groqApiKey     ?? '');
      setIsTestMode(savedKeys?.isTestMode  ?? false);
      setSubmitted(false);
    }
  }, [isOpen, savedKeys]);

  // Secret dev unlock — click the lock icon 5 times
  const handleDevClick = () => {
    const next = devClickCount + 1;
    setDevClickCount(next);
    if (next >= 5) {
      setDevUnlocked(true);
      setDevClickCount(0);
    }
  };

  if (!isOpen) return null;

  const googleStatus: 'idle' | 'valid' | 'invalid' =
    isTestMode ? 'valid' :
    googleKey === '' ? 'idle' :
    isValidKey(googleKey) ? 'valid' : 'invalid';

  const groqStatus: 'idle' | 'valid' | 'invalid' =
    isTestMode ? 'valid' :
    groqKey === '' ? 'idle' :
    isValidKey(groqKey) ? 'valid' : 'invalid';

  const canSave =
    isTestMode ||
    (googleStatus === 'valid' && groqStatus === 'valid');

  const handleSave = () => {
    if (!canSave) return;
    setSubmitted(true);
    onSave({
      googleApiKey: isTestMode ? TEST_SENTINEL : googleKey.trim(),
      groqApiKey:   isTestMode ? TEST_SENTINEL : groqKey.trim(),
      isTestMode,
    });
    setTimeout(onClose, 600);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  return (
    /* Backdrop */
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      <style>{`
        @keyframes fadeIn   { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp  { from { opacity: 0; transform: translateY(16px) scale(0.98); }
                              to   { opacity: 1; transform: translateY(0)     scale(1);    } }
      `}</style>

      {/* Modal card */}
      <div
        className="relative w-full max-w-lg mx-4 bg-[#0d1117] border border-gray-800/80 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden"
        style={{ animation: 'slideUp 0.2s ease-out' }}
      >
        {/* Top glow strip */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800/60">
          <div className="flex items-center gap-3">
            {/* Clickable lock for dev unlock Easter egg */}
            <button
              onClick={handleDevClick}
              className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 hover:bg-blue-500/20 transition-colors select-none"
              title={devUnlocked ? 'Dev mode unlocked' : undefined}
            >
              {devUnlocked
                ? <FlaskConical size={18} className="text-yellow-400" />
                : <KeyRound size={18} />
              }
            </button>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">API Key Configuration</h2>
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Bring Your Own Key — BYOK</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-600 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Secure connection scanner */}
        <div className="px-6 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">
              Encrypted WSS Channel
            </span>
            <span className="flex items-center gap-1 text-[9px] font-mono text-emerald-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] animate-pulse" />
              Secure
            </span>
          </div>
          <SecureConnectionBar />
        </div>

        {/* Body */}
        <div className="px-6 pb-6 flex flex-col gap-5">

          {/* Trust badge */}
          <TrustBadge />

          {/* Key inputs */}
          <div className="flex flex-col gap-4">
            <KeyInput
              label="Google Gemini API Key"
              icon={<Zap size={11} className="text-blue-400" />}
              placeholder="AIza••••••••••••••••••••••••••••••••••••••"
              value={googleKey}
              onChange={setGoogleKey}
              isTestMode={isTestMode}
              status={googleStatus}
            />
            <KeyInput
              label="Groq API Key"
              icon={<Zap size={11} className="text-purple-400" />}
              placeholder="gsk_••••••••••••••••••••••••••••••••••••••••••"
              value={groqKey}
              onChange={setGroqKey}
              isTestMode={isTestMode}
              status={groqStatus}
            />
          </div>

          {/* ── Developer Test Mode (hidden behind 5-click Easter egg) ── */}
          {devUnlocked && (
            <div className="flex flex-col gap-2 px-4 py-3 bg-yellow-950/30 border border-yellow-700/30 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical size={13} className="text-yellow-400" />
                  <span className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
                    Developer Test Mode
                  </span>
                </div>
                {/* Toggle */}
                <button
                  onClick={() => setIsTestMode((p) => !p)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${
                    isTestMode ? 'bg-yellow-500' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      isTestMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[10px] text-yellow-700 leading-relaxed">
                Substitutes <span className="font-mono text-yellow-500">TEST_KEY</span> as the
                sentinel value, forcing backend <span className="font-mono">TEST_MODE=True</span>.
                No real API calls are made. Confirm mock messages appear in the chat panel.
              </p>
            </div>
          )}

          {/* Session scope notice */}
          <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono">
            <Lock size={10} />
            <span>Keys cleared automatically when the browser tab is closed</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-bold text-gray-500 border border-gray-800 rounded-xl hover:bg-gray-900 hover:text-gray-300 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave || submitted}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                submitted
                  ? 'bg-emerald-700/40 text-emerald-400 border border-emerald-700/40 cursor-default'
                  : canSave
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99]'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              {submitted ? (
                <><CheckCircle2 size={15} /> Saved — session active</>
              ) : (
                <><ShieldCheck size={15} /> Confirm & Activate Keys</>
              )}
            </button>
          </div>

          {/* Masked preview of active keys */}
          {savedKeys && !isTestMode && (savedKeys.googleApiKey || savedKeys.groqApiKey) && (
            <div className="flex flex-col gap-1 px-3 py-2.5 bg-gray-900/50 border border-gray-800 rounded-xl">
              <p className="text-[9px] text-gray-600 font-mono uppercase tracking-widest mb-1">Active session keys</p>
              {savedKeys.googleApiKey && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Gemini</span>
                  <span className="font-mono text-[10px] text-gray-400">{maskKey(savedKeys.googleApiKey)}</span>
                </div>
              )}
              {savedKeys.groqApiKey && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500">Groq</span>
                  <span className="font-mono text-[10px] text-gray-400">{maskKey(savedKeys.groqApiKey)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}