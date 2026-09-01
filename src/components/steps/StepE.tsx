import React from 'react';
import { useRSAStore } from '../../stores/useRSAStore';
import '../StepInput.css';

const StepE: React.FC = () => {
  const { currentEntry, setEffect, setAction } = useRSAStore();

  return (
    <div className="step-input">
      <div className="prompt-box">
        <p>
          <strong>How do things look now?</strong> With your new thoughts, how do you feel? What would you do differently?
        </p>
      </div>

      <label>
        <span className="label-text">How do you feel and think about it now?</span>
        <textarea
          className="input-textarea"
          value={currentEntry.effect}
          onChange={(e) => setEffect(e.target.value)}
          placeholder="With the rewritten beliefs, what's your emotional state now? Does it feel different?"
          rows={4}
        />
      </label>

      <label>
        <span className="label-text">What would you do or say differently?</span>
        <textarea
          className="input-textarea"
          value={currentEntry.action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="With this new thinking, how might you act or respond? What would change?"
          rows={4}
        />
      </label>

      <div className="input-hint">
        <p>
          When you think differently, your feelings and actions change too. This is why we do this work.
        </p>
      </div>
    </div>
  );
};

export default StepE;
