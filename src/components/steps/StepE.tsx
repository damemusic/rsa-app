import React from 'react';
import { useRSAStore } from '../../stores/useRSAStore';
import '../StepInput.css';

const StepE: React.FC = () => {
  const { currentEntry, setEffect, setAction } = useRSAStore();

  return (
    <div className="step-input">
      <div className="prompt-box">
        <p>
          <strong>What's different now?</strong> With your rational rewrites in mind, how do you feel? What would you
          do or say differently?
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
          <strong>This is the point of the whole exercise:</strong> When you change your thinking, your feelings and
          actions follow. You don't have to believe the old thoughts anymore.
        </p>
      </div>
    </div>
  );
};

export default StepE;
