import React from 'react';
import { useRSAStore } from '../../stores/useRSAStore';
import '../StepInput.css';

const StepA: React.FC = () => {
  const { currentEntry, setStepA } = useRSAStore();

  return (
    <div className="step-input">
      <div className="prompt-box">
        <p>
          <strong>What happened?</strong> Just the facts. Who was there? What did you see or hear? Don't guess what people were thinking or why.
        </p>
      </div>

      <textarea
        className="input-textarea large"
        value={currentEntry.a}
        onChange={(e) => setStepA(e.target.value)}
        placeholder="Example: 'My boss said my report had mistakes and looked frustrated.'"
        rows={8}
      />

      <div className="input-hint">
        <p>
          Stick to what you SAW or HEARD. Don't add "I know they think..." or "This means..."
        </p>
      </div>
    </div>
  );
};

export default StepA;
