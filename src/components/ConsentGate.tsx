import { useState } from 'react';
import { saveConsent } from '../services/consent';
import './ConsentGate.css';

interface ConsentGateProps {
  /** Called once the terms have been accepted and the app may proceed. */
  onAccepted: () => void;
}

/**
 * Shown after sign-in until the current terms are accepted. The app does not
 * render behind it.
 *
 * Two decisions, deliberately not one checkbox:
 *
 *   Accepting the terms is required — that is an ordinary condition of use.
 *
 *   Contributing to the aggregate dataset is optional, defaults to off, and
 *   declining it changes nothing about access. That separation is the point:
 *   consent that is a condition of receiving the service is not freely given,
 *   and some of these users are directed here by the same agencies that buy
 *   the aggregates, so a forced grant would not be consent at all.
 */
export function ConsentGate({ onAccepted }: ConsentGateProps) {
  const [termsChecked, setTermsChecked] = useState(false);
  const [shareChecked, setShareChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!termsChecked) return;
    setSaving(true);
    setError('');
    try {
      await saveConsent({ acceptTerms: true, grantAnalytics: shareChecked });
      onAccepted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your choices');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="consent-container">
      <div className="consent-card">
        <h1>Before you start</h1>

        <section className="consent-section">
          <h2>How your check-ins are stored</h2>
          <p>
            Your check-ins and profile are encrypted before they leave your
            device. They are stored on our servers so you can get them back on
            any device you sign in from.
          </p>
          <p className="consent-plain">
            Being straight with you: we hold the key, so we are technically able
            to read what you write. We do not, and nothing you write is shown to
            anyone else.
          </p>
          <p>
            When you use the AI conversation, what you write — along with your
            profile and recent check-ins — is sent to Anthropic, the company
            that runs the AI, so it can respond to your actual situation. The
            step-by-step check-in works without it.
          </p>
          <p className="consent-plain">
            No agency can see your account or your check-ins — including a
            supervision agency, if you happen to have one.
          </p>
        </section>

        <label className="consent-choice consent-required">
          <input
            type="checkbox"
            checked={termsChecked}
            onChange={(e) => setTermsChecked(e.target.checked)}
          />
          <span>
            I accept the{' '}
            <a
              href="/terms.html"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              Privacy Policy
            </a>
            . <strong>Required to use the app.</strong>
          </span>
        </label>

        <section className="consent-section">
          <h2>Helping agencies see where support is needed</h2>
          <p>
            Agencies and community programs — reentry and supervision
            agencies among them — can pay us for <strong>counts only</strong>,
            showing what people in their area need help with so they can put
            resources there.
          </p>
          <ul className="consent-list">
            <li>
              <strong>What is shared:</strong> which category a check-in was
              about, who you turned to, and how it turned out — chosen by you
              from a list, after each check-in.
            </li>
            <li>
              <strong>What is never shared:</strong> anything you wrote. Not
              your check-in text, not names, not your profile, not your account.
            </li>
            <li>
              <strong>Counts, never records.</strong> Nothing is published
              unless at least 20 different people are behind it, so no number
              can point at you.
            </li>
            <li>
              <strong>No one can see your activity.</strong> Buyers receive
              totals for an area, never anything about a person.
            </li>
          </ul>
          <p className="consent-plain">
            You can turn this off at any time in settings, and we delete what
            you have contributed. Totals we already published cannot be
            recalled.
          </p>
        </section>

        <label className="consent-choice">
          <input
            type="checkbox"
            checked={shareChecked}
            onChange={(e) => setShareChecked(e.target.checked)}
          />
          <span>
            Yes, include my check-ins in those counts.{' '}
            <strong>Optional</strong> — the app works exactly the same either
            way.
          </span>
        </label>

        {error && <p className="consent-error">{error}</p>}

        <button
          onClick={handleContinue}
          disabled={!termsChecked || saving}
          className="btn-primary consent-continue"
        >
          {saving ? 'Saving...' : 'Continue'}
        </button>

        {!termsChecked && (
          <p className="consent-hint">
            Accept the terms to continue. The second box is yours to leave
            unchecked.
          </p>
        )}
      </div>
    </div>
  );
}
