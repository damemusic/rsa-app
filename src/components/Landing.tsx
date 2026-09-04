import React from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { detectCrisis } from '../services/rsa';
import { Layout } from './Layout';
import './Landing.css';

export const Landing: React.FC = () => {
  const { setSituation, setView, currentEntry, reset } = useRSAStore();
  const [inputValue, setInputValue] = React.useState('');

  const handleBegin = () => {
    if (!inputValue.trim()) return;

    // Check for crisis language
    if (detectCrisis(inputValue)) {
      setSituation(inputValue);
      setView('crisis');
    } else {
      setSituation(inputValue);
      setView('ai-rsa');
    }
  };

  const handleNewSession = () => {
    reset();
    setInputValue('');
  };

  const handleQuickCrisis = () => {
    setSituation('I need immediate support for a crisis situation.');
    setView('crisis');
  };

  return (
    <Layout title="My Reality Check" subtitle="Talk through what's on your mind">
      <div className="landing">
        <div className="landing-intro">
          <p>
            My Reality Check helps you think through difficult situations by examining what you're telling yourself
            and testing it against real facts.
          </p>
          <p>
            <strong>You</strong> do the thinking. The app guides you through each step and offers
            support when you need it.
          </p>
        </div>

        <div className="landing-crisis-banner">
          <button className="button button-crisis" onClick={handleQuickCrisis}>
            🆘 I'm in Crisis — Get Help Now
          </button>
        </div>

        <div className="landing-form">
          <label htmlFor="situation-input">
            <span className="label-text">What's on your mind? Describe the situation in a few sentences.</span>
          </label>
          <textarea
            id="situation-input"
            className="input-textarea"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Include only the facts—what happened, who was there, what was said. No opinions yet."
            rows={6}
          />
          <button
            className="button button-primary"
            onClick={handleBegin}
            disabled={!inputValue.trim()}
          >
            Start Talking
          </button>
        </div>

        {currentEntry.situation && (
          <div className="landing-actions">
            <button className="button button-secondary" onClick={handleNewSession}>
              Start Over
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
};
