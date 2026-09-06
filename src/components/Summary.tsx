import React, { useState } from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { saveProgressEntry } from '../services/entries';
import { Layout } from './Layout';
import './Summary.css';

export const Summary: React.FC = () => {
  const { currentEntry, setView, setCurrentEntry, setSavedEntry, reset, currentUser } = useRSAStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSave = async () => {
    if (!currentUser) {
      setError('User not logged in');
      return;
    }

    setSaving(true);
    setError('');

    try {
      console.log('[Summary] Saving entry with encryption...');
      const saved = await saveProgressEntry(currentUser.userId, currentEntry, currentUser.recoveryCode, 'completed');

      console.log('[Summary] Entry saved successfully');
      // Carry the database row id into the store before setSavedEntry() copies
      // currentEntry into the log, so completing a resumed check-in updates the
      // existing row instead of leaving an in-progress duplicate behind.
      setCurrentEntry(saved);
      setSavedEntry();
      setView('journal');
    } catch (err) {
      console.error('[Summary] Error saving entry:', err);
      setError(err instanceof Error ? err.message : 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleNewCheckIn = () => {
    reset();
    setView('landing');
  };

  return (
    <Layout title="Check-In Complete" subtitle="Review before saving to Decision Log">
      <div className="summary-container">
        {/* Situation */}
        <div className="summary-section">
          <h2>A: Activating Event</h2>
          <p>{currentEntry.situation}</p>
          <div className="summary-box">
            <p><strong>Facts:</strong></p>
            <p>{currentEntry.a || '(No entry)'}</p>
          </div>
        </div>

        {/* Beliefs */}
        <div className="summary-section">
          <h2>B: Beliefs & D: Disputation</h2>
          {currentEntry.beliefs.length === 0 ? (
            <p>(No beliefs recorded)</p>
          ) : (
            <div className="beliefs-summary">
              {currentEntry.beliefs.map((belief, idx) => (
                <div key={belief.id} className="belief-summary">
                  <div className="belief-header">
                    <strong>Belief {idx + 1}:</strong>
                    <span className="rule-status">
                      {belief.rewrite ? '✓ Rewritten' : '○ Not rewritten'}
                    </span>
                  </div>
                  <p className="belief-original">"{belief.text}"</p>
                  {belief.rewrite && (
                    <p className="belief-rewrite">
                      <strong>Rewrite:</strong> "{belief.rewrite}"
                    </p>
                  )}
                  {belief.aiFeedback && (
                    <p className="belief-feedback">
                      <strong>AI feedback:</strong> {belief.aiFeedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consequences */}
        <div className="summary-section">
          <h2>C: Consequences</h2>
          {currentEntry.emotions.length > 0 && (
            <div>
              <p><strong>Emotions:</strong> {currentEntry.emotions.join(', ')}</p>
            </div>
          )}
          {currentEntry.behavior && (
            <div>
              <p><strong>Behavior:</strong> {currentEntry.behavior}</p>
            </div>
          )}
        </div>

        {/* Effect */}
        <div className="summary-section">
          <h2>E: Effect (New Thinking)</h2>
          {currentEntry.effect && (
            <div className="summary-box">
              <p><strong>How you feel now:</strong></p>
              <p>{currentEntry.effect}</p>
            </div>
          )}
          {currentEntry.action && (
            <div className="summary-box">
              <p><strong>What you'd do differently:</strong></p>
              <p>{currentEntry.action}</p>
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="summary-error">
            <p style={{ color: 'var(--brick)' }}>Error: {error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="summary-actions">
          <button
            className="button button-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save to Decision Log'}
          </button>
          <button
            className="button button-secondary"
            onClick={handleNewCheckIn}
            disabled={saving}
          >
            Start Another Check-In
          </button>
        </div>
      </div>
    </Layout>
  );
};
