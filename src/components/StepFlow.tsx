import React from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { STEPS, STEP_LABELS, STEP_DESCRIPTIONS } from '../services/rsa';
import { Layout } from './Layout';
import StepA from './steps/StepA';
import StepB from './steps/StepB';
import StepC from './steps/StepC';
import StepD from './steps/StepD';
import StepE from './steps/StepE';
import './StepFlow.css';

const STEP_COMPONENTS = [StepA, StepB, StepC, StepD, StepE];

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--brick)' }}>
          <p>Something went wrong. Please try again.</p>
          <button className="button button-primary" onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export const StepFlow: React.FC = () => {
  const { step, nextStep, previousStep, setView } = useRSAStore();

  if (step === undefined || step < 0 || step >= STEP_COMPONENTS.length) {
    return (
      <div style={{ padding: 'var(--space-xl)', textAlign: 'center', color: 'var(--brick)' }}>
        <p>Something went wrong. Please try again.</p>
        <button className="button button-primary" onClick={() => window.location.reload()}>
          Reload Page
        </button>
      </div>
    );
  }

  const CurrentStepComponent = STEP_COMPONENTS[step];
  const currentStepLabel = STEPS[step] as keyof typeof STEP_LABELS;

  return (
    <Layout
      title={`Step ${currentStepLabel}: ${STEP_LABELS[currentStepLabel]}`}
      subtitle={STEP_DESCRIPTIONS[currentStepLabel]}
    >
      <div className="step-flow">
        {/* Progress indicator */}
        <div className="progress-bar">
          {STEPS.map((s, idx) => (
            <div
              key={s}
              className={`progress-dot ${idx < step ? 'completed' : idx === step ? 'active' : ''}`}
              title={`Step ${s}`}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Current step content */}
        <div className="step-content">
          <ErrorBoundary>
            <CurrentStepComponent />
          </ErrorBoundary>
        </div>

        {/* Navigation buttons */}
        <div className="step-navigation">
          {step > 0 && (
            <button className="button button-secondary" onClick={previousStep}>
              ← Previous
            </button>
          )}

          {step < STEPS.length - 1 ? (
            <button className="button button-primary" onClick={nextStep}>
              Next →
            </button>
          ) : (
            <button className="button button-primary" onClick={() => setView('summary')}>
              Review & Save
            </button>
          )}

          {step > 0 && (
            <button
              className="button button-ghost"
              onClick={() => {
                if (window.confirm('Discard this check-in and start over?')) {
                  useRSAStore.getState().reset();
                  setView('landing');
                }
              }}
            >
              Exit
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
};
