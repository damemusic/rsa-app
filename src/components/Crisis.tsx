import React from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { Layout } from './Layout';
import './Crisis.css';

export const Crisis: React.FC = () => {
  const { setView } = useRSAStore();

  return (
    <Layout title="Support is Available" subtitle="You don't have to go through this alone.">
      <div className="crisis-container">
        <div className="crisis-banner">
          <h2>If you're thinking about harming yourself</h2>
          <p>Please reach out to someone right now. These resources are free, private, and available 24/7.</p>
        </div>

        <div className="crisis-resources">
          <div className="resource-card">
            <h3>988 Suicide & Crisis Lifeline</h3>
            <p className="resource-number">Call or text <strong>988</strong></p>
            <p className="resource-desc">Free, confidential support. Available in the US 24/7.</p>
          </div>

          <div className="resource-card">
            <h3>Crisis Text Line</h3>
            <p className="resource-number">Text <strong>HOME</strong> to 741741</p>
            <p className="resource-desc">Trained crisis counselors, available 24/7.</p>
          </div>

          <div className="resource-card">
            <h3>Emergency Services</h3>
            <p className="resource-number">Call <strong>911</strong></p>
            <p className="resource-desc">For immediate danger. Immediate response.</p>
          </div>
        </div>

        <div className="crisis-continue">
          <p>If this was a misunderstanding, you can continue with the RSA below.</p>
          <button className="button button-secondary" onClick={() => setView('flow')}>
            Continue to RSA
          </button>
        </div>
      </div>
    </Layout>
  );
};
