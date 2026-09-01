import React from 'react';
import { useRSAStore } from '../../stores/useRSAStore';
import { RULES, checkBelief } from '../../services/rsa';
import { checkRewrite } from '../../services/ai';
import '../StepInput.css';

const StepD: React.FC = () => {
  const { currentEntry, setBelief, setActiveBeliefIdx, activeBeliefIdx } = useRSAStore();

  if (currentEntry.beliefs.length === 0) {
    return (
      <div className="step-input">
        <div className="prompt-box">
          <p>
            <strong>No beliefs to dispute yet.</strong> Go back to Step B and add at least one belief first.
          </p>
        </div>
      </div>
    );
  }

  const belief = currentEntry.beliefs[activeBeliefIdx];

  if (!belief) {
    // No active belief selected, show list
    return (
      <div className="step-input">
        <div className="prompt-box">
          <p>
            <strong>Test your beliefs against 5 Rules for Rational Thinking.</strong> Pick a belief to dispute, then
            answer each rule. If it fails a rule, rewrite it.
          </p>
        </div>

        <div className="belief-list">
          {currentEntry.beliefs.map((b, idx) => (
            <button
              key={b.id}
              className={`belief-item ${b.rewrite ? 'completed' : ''}`}
              onClick={() => setActiveBeliefIdx(idx)}
              style={{ cursor: 'pointer', textAlign: 'left', background: 'var(--slate-light)', border: 'none' }}
            >
              <div className="belief-text">"{b.text}"</div>
              <div className="belief-actions">
                {b.rewrite && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--success)' }}>✓ Done</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const failedRules = checkBelief(belief.ruleAnswers);
  const needsRewrite = failedRules.length > 0;

  const handleCheckRewrite = async () => {
    if (!belief.rewrite.trim()) return;

    const ruleMap = Object.fromEntries(RULES.map(r => [r.id, r.label]));
    const feedback = await checkRewrite(belief.text, failedRules, belief.rewrite, ruleMap);

    setBelief(activeBeliefIdx, {
      aiFeedback: feedback,
      aiFeedbackLoading: false,
    });
  };

  return (
    <div className="step-input">
      <div className="prompt-box">
        <p>
          <strong>Disputing "{belief.text}"</strong>
        </p>
        <p style={{ marginBottom: 0 }}>
          Does this belief pass the 5 Rules for Rational Thinking? Answer yes or no for each.
        </p>
      </div>

      {/* Rules checkboxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {RULES.map((rule) => (
          <label key={rule.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={belief.ruleAnswers[rule.id] || false}
              onChange={(e) => {
                setBelief(activeBeliefIdx, {
                  ruleAnswers: {
                    ...belief.ruleAnswers,
                    [rule.id]: e.target.checked,
                  },
                });
              }}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: 'var(--text-base)' }}>{rule.label}</span>
          </label>
        ))}
      </div>

      {/* Rewrite section (if any rules failed) */}
      {needsRewrite && (
        <div style={{ marginTop: 'var(--space-xl)', paddingTop: 'var(--space-xl)', borderTop: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 var(--space-md) 0', color: 'var(--brick)', fontWeight: 500 }}>
            ⚠️ This belief failed some rules. Rewrite it:
          </p>

          <div className="prompt-box">
            <p style={{ margin: 0 }}>
              Failed: {failedRules.map(rid => RULES.find(r => r.id === rid)?.label).join(', ')}
            </p>
          </div>

          <textarea
            className="input-textarea"
            value={belief.rewrite}
            onChange={(e) => {
              setBelief(activeBeliefIdx, { rewrite: e.target.value });
            }}
            placeholder="Rewrite this belief to pass the rules..."
            rows={3}
          />

          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button
              className={`button button-secondary ${belief.aiFeedbackLoading ? 'loading' : ''}`}
              onClick={handleCheckRewrite}
              disabled={!belief.rewrite.trim() || belief.aiFeedbackLoading}
            >
              {belief.aiFeedbackLoading ? 'Checking...' : 'Check My Rewrite'}
            </button>
          </div>

          {belief.aiFeedback && (
            <div
              style={{
                marginTop: 'var(--space-lg)',
                padding: 'var(--space-lg)',
                backgroundColor: 'var(--teal-light)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{belief.aiFeedback}</p>
            </div>
          )}

          {belief.aiFeedbackError && (
            <p style={{ color: 'var(--error)', fontSize: 'var(--text-sm)' }}>{belief.aiFeedbackError}</p>
          )}
        </div>
      )}

      {!needsRewrite && belief.rewrite && (
        <div style={{ marginTop: 'var(--space-lg)', padding: 'var(--space-lg)', backgroundColor: 'var(--teal-light)', borderRadius: 'var(--radius-md)' }}>
          <p style={{ margin: '0 0 var(--space-md) 0', color: 'var(--success)', fontWeight: 500 }}>✓ This belief passes all rules!</p>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>Your rewrite: "{belief.rewrite}"</p>
        </div>
      )}

      {/* Navigation between beliefs */}
      <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border)', display: 'flex', gap: 'var(--space-lg)' }}>
        <button
          className="button-small"
          onClick={() => setActiveBeliefIdx(Math.max(0, activeBeliefIdx - 1))}
          disabled={activeBeliefIdx === 0}
        >
          ← Previous
        </button>
        <button
          className="button button-secondary"
          onClick={() => setActiveBeliefIdx(-1)}
        >
          Back to list
        </button>
        <button
          className="button-small"
          onClick={() => setActiveBeliefIdx(Math.min(currentEntry.beliefs.length - 1, activeBeliefIdx + 1))}
          disabled={activeBeliefIdx === currentEntry.beliefs.length - 1}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default StepD;
