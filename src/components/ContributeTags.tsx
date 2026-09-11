import { useEffect, useState } from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { getConsent } from '../services/consent';
import {
  NEED_CATEGORIES,
  SUPPORT_OPTIONS,
  OUTCOME_OPTIONS,
  contributeCheckInFact,
} from '../services/analytics';
import './ContributeTags.css';

type Phase = 'checking' | 'asking' | 'sending';

/**
 * Shown once after a completed check-in, and only to users who opted in.
 *
 * The three answers are the entire contribution. They are picked by the user
 * rather than inferred from what they wrote, which is what keeps their writing
 * out of the dataset and keeps the categories honest — a classifier guessing
 * at someone's private narrative would be both worse data and a broken
 * promise.
 *
 * Skipping is a first-class option, not a dark pattern: consent to the
 * programme is not consent to answer every time.
 */
export function ContributeTags() {
  const { setView } = useRSAStore();
  const [phase, setPhase] = useState<Phase>('checking');
  const [need, setNeed] = useState('');
  const [support, setSupport] = useState('');
  const [outcome, setOutcome] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const consent = await getConsent();
        if (cancelled) return;
        // Not opted in (or opted back out): this screen has no business
        // appearing at all.
        if (!consent.analyticsGranted) {
          setView('journal');
          return;
        }
        setPhase('asking');
      } catch {
        // If we cannot confirm consent, contribute nothing and move on.
        if (!cancelled) setView('journal');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setView]);

  const submit = async () => {
    setPhase('sending');
    await contributeCheckInFact({
      need_category: need,
      support_accessed: support,
      outcome_signal: outcome,
    });
    // A failed contribution is not the user's problem — they are done either
    // way, and contributeCheckInFact has already logged it.
    setView('journal');
  };

  if (phase === 'checking') return null;

  const complete = need && support && outcome;

  return (
    <div className="contribute-container">
      <div className="contribute-card">
        <h1>Three quick questions</h1>
        <p className="contribute-intro">
          These become part of the anonymous counts you opted into. Your
          check-in itself is never included. Skip any time.
        </p>

        <fieldset className="contribute-group">
          <legend>What was this mostly about?</legend>
          <div className="contribute-options">
            {NEED_CATEGORIES.map((option) => (
              <button
                key={option.code}
                type="button"
                className={`contribute-option ${need === option.code ? 'selected' : ''}`}
                onClick={() => setNeed(option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="contribute-group">
          <legend>Did you turn to anyone?</legend>
          <div className="contribute-options">
            {SUPPORT_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                className={`contribute-option ${support === option.code ? 'selected' : ''}`}
                onClick={() => setSupport(option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="contribute-group">
          <legend>Where did it land?</legend>
          <div className="contribute-options">
            {OUTCOME_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                className={`contribute-option ${outcome === option.code ? 'selected' : ''}`}
                onClick={() => setOutcome(option.code)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="contribute-actions">
          <button
            onClick={submit}
            disabled={!complete || phase === 'sending'}
            className="btn-primary"
          >
            {phase === 'sending' ? 'Sending...' : 'Send'}
          </button>
          <button onClick={() => setView('journal')} className="btn-secondary">
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
