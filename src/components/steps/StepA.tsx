import React from 'react';
import { useRSAStore } from '../../stores/useRSAStore';
import '../StepInput.css';

const StepA: React.FC = () => {
  const { currentEntry, setStepA } = useRSAStore();

  return (
    <div className="step-input">
      <div className="prompt-box">
        <p>
          <strong>Fact check yourself:</strong> What are the objective facts? Who was there? What was actually said
          or done? Avoid interpretations, judgments, or what you <em>think</em> it meant.
        </p>
      </div>

      <textarea
        className="input-textarea large"
        value={currentEntry.a}
        onChange={(e) => setStepA(e.target.value)}
        placeholder="Write the facts as clearly and objectively as you can..."
        rows={8}
      />

      <div className="input-hint">
        <p>
          For example: <em>"I made a mistake in the meeting and my boss frowned at me."</em> (not: "My boss thinks I'm
          incompetent")
        </p>
      </div>
    </div>
  );
};

export default StepA;
