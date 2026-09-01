import React from 'react';
import { useRSAStore } from '../../stores/useRSAStore';
import '../StepInput.css';

const StepC: React.FC = () => {
  const { currentEntry, setEmotions, setBehavior } = useRSAStore();
  const [emotionInput, setEmotionInput] = React.useState('');

  const handleAddEmotion = () => {
    if (emotionInput.trim()) {
      setEmotions([...currentEntry.emotions, emotionInput.trim()]);
      setEmotionInput('');
    }
  };

  const handleRemoveEmotion = (idx: number) => {
    setEmotions(currentEntry.emotions.filter((_, i) => i !== idx));
  };

  const commonEmotions = ['Angry', 'Sad', 'Anxious', 'Ashamed', 'Frustrated', 'Confused', 'Disappointed'];

  return (
    <div className="step-input">
      <div className="prompt-box">
        <p>
          <strong>How did you react?</strong> Because of these thoughts, what did you feel? What did you do or say?
        </p>
      </div>

      {/* Emotions */}
      <div>
        <h3 style={{ margin: '0 0 var(--space-md) 0' }}>Emotions you felt:</h3>

        {currentEntry.emotions.length > 0 && (
          <div className="belief-list">
            {currentEntry.emotions.map((emotion, idx) => (
              <div key={idx} className="belief-item">
                <div className="belief-text">{emotion}</div>
                <button className="button-small" onClick={() => handleRemoveEmotion(idx)}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
          <input
            type="text"
            className="input-textarea"
            value={emotionInput}
            onChange={(e) => setEmotionInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddEmotion()}
            placeholder="Type an emotion..."
            style={{ flex: 1, minHeight: 'auto', padding: 'var(--space-md)' }}
          />
          <button className="button button-primary" onClick={handleAddEmotion}>
            Add
          </button>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-md)', flexWrap: 'wrap' }}>
          {commonEmotions.map((emotion) => (
            <button
              key={emotion}
              className="suggestion-chip"
              onClick={() => {
                if (!currentEntry.emotions.includes(emotion)) {
                  setEmotions([...currentEntry.emotions, emotion]);
                }
              }}
              style={{ margin: 0 }}
            >
              {emotion}
            </button>
          ))}
        </div>
      </div>

      {/* Behavior */}
      <div>
        <label>
          <span className="label-text">What did you do or say? (as a result)</span>
          <textarea
            className="input-textarea"
            value={currentEntry.behavior}
            onChange={(e) => setBehavior(e.target.value)}
            placeholder="Did you withdraw, lash out, avoid something, apologize, etc.?"
            rows={4}
          />
        </label>
      </div>

      <div className="input-hint">
        <p>
          This shows the chain: Thought → Feeling → Action. Understanding this helps us see what to change.
        </p>
      </div>
    </div>
  );
};

export default StepC;
