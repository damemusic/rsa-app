import React from 'react';
import { useRSAStore } from '../../stores/useRSAStore';
import { suggestBeliefs } from '../../services/ai';
import '../StepInput.css';

const StepB: React.FC = () => {
  const {
    currentEntry,
    addBelief,
    beliefSuggestions,
    suggestLoading,
    suggestError,
    setBeliefSuggestions,
  } = useRSAStore();

  const [inputValue, setInputValue] = React.useState('');

  const handleAddBelief = (text: string) => {
    if (text.trim()) {
      addBelief(text.trim());
      setInputValue('');
      setBeliefSuggestions([], false, ''); // Clear suggestions after adding
    }
  };

  const handleGetSuggestions = async () => {
    if (!currentEntry.situation || !currentEntry.a) {
      setBeliefSuggestions([], false, 'Please fill in Step A first.');
      return;
    }

    setBeliefSuggestions([], true, '');
    const suggestions = await suggestBeliefs(currentEntry.situation, currentEntry.a);
    setBeliefSuggestions(suggestions, false, suggestions.length === 0 ? 'No suggestions — try writing your own.' : '');
  };

  return (
    <div className="step-input">
      <div className="prompt-box">
        <p>
          <strong>What were you thinking?</strong> What words went through your head? Your inner voice. (Not facts—just thoughts.)
        </p>
      </div>

      {currentEntry.beliefs.length > 0 && (
        <div className="belief-list">
          <h3>Your beliefs so far:</h3>
          {currentEntry.beliefs.map((belief, idx) => (
            <div key={belief.id} className="belief-item">
              <div className="belief-text">"{belief.text}"</div>
              <div className="belief-actions">
                <button className="button-small" onClick={() => useRSAStore.getState().removeBelief(idx)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="suggestions-container">
        <label>
          <span className="label-text">Add your own belief:</span>
          <textarea
            className="input-textarea"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Examples: 'I'm going to fail', 'I'm not good enough', 'Everyone is mad at me'"
            rows={3}
          />
          <button className="button button-primary" onClick={() => handleAddBelief(inputValue)}>
            Add Belief
          </button>
        </label>

        <div style={{ textAlign: 'center', paddingTop: 'var(--space-lg)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>or</p>
        </div>

        <button
          className={`button button-secondary ${suggestLoading ? 'loading' : ''}`}
          onClick={handleGetSuggestions}
          disabled={suggestLoading}
        >
          {suggestLoading ? (
            <>
              <span className="loading-spinner"></span>
              Getting suggestions...
            </>
          ) : (
            'Get AI Suggestions'
          )}
        </button>

        {suggestError && <p style={{ color: 'var(--error)', fontSize: 'var(--text-sm)' }}>{suggestError}</p>}

        {beliefSuggestions.length > 0 && (
          <div className="suggestions-container">
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--space-md) 0' }}>
              Click to add:
            </p>
            {beliefSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="suggestion-chip"
                onClick={() => handleAddBelief(suggestion)}
              >
                "{suggestion}"
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="input-hint">
        <p>
          You might have several beliefs. Add each one separately, and you'll test them all in Step D.
        </p>
      </div>
    </div>
  );
};

export default StepB;
