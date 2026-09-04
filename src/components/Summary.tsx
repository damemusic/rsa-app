import React from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { Layout } from './Layout';
import './Summary.css';

export const Summary: React.FC = () => {
  const { currentEntry, setView, saveEntry, reset } = useRSAStore();

  const handleSave = () => {
    saveEntry();
    setView('journal');
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

        {/* Actions */}
        <div className="summary-actions">
          <button className="button button-primary" onClick={handleSave}>
            Save to Decision Log
          </button>
          <button className="button button-secondary" onClick={handleNewCheckIn}>
            Start Another Check-In
          </button>
        </div>
      </div>
    </Layout>
  );
};
