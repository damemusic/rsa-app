import React from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { Layout } from './Layout';
import './Journal.css';

export const Journal: React.FC = () => {
  const { entries, deleteEntry, setView, reset } = useRSAStore();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selected = entries.find(e => e.id === selectedId);

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this RSA? This cannot be undone.')) {
      deleteEntry(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    }
  };

  const handleNewRSA = () => {
    reset();
    setView('landing');
  };

  const handleBack = () => {
    setView('checkin');
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Layout title="Your Journal" subtitle="Saved RSAs from your practice">
      <div className="journal-container">
        {entries.length === 0 ? (
          <div className="empty-journal">
            <p>No entries yet. Complete an RSA to save it to your journal.</p>
            <button className="button button-primary" onClick={handleNewRSA}>
              Start a New RSA
            </button>
          </div>
        ) : (
          <div className="journal-layout">
            {/* List of entries */}
            <div className="entries-list">
              <h2>Entries ({entries.length})</h2>
              <div className="entries-scroll">
                {entries.map(entry => (
                  <button
                    key={entry.id}
                    className={`entry-button ${selectedId === entry.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <div className="entry-date">{formatDate(entry.timestamp)}</div>
                    <div className="entry-preview">
                      {entry.situation.substring(0, 50)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="entry-detail">
              {selected ? (
                <>
                  <div className="detail-header">
                    <h2>{formatDate(selected.timestamp)}</h2>
                    <button
                      className="button button-ghost"
                      onClick={() => handleDelete(selected.id)}
                    >
                      Delete
                    </button>
                  </div>

                  <div className="detail-section">
                    <h3>Situation</h3>
                    <p>{selected.situation}</p>
                  </div>

                  <div className="detail-section">
                    <h3>Facts (Step A)</h3>
                    <p>{selected.a}</p>
                  </div>

                  {selected.beliefs.length > 0 && (
                    <div className="detail-section">
                      <h3>Beliefs & Rewrites (Steps B & D)</h3>
                      {selected.beliefs.map((belief, idx) => (
                        <div key={belief.id} className="belief-detail">
                          <p>
                            <strong>Belief {idx + 1}:</strong> "{belief.text}"
                          </p>
                          {belief.rewrite && (
                            <p>
                              <strong>Rewrite:</strong> "{belief.rewrite}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selected.emotions.length > 0 && (
                    <div className="detail-section">
                      <h3>Emotions (Step C)</h3>
                      <p>{selected.emotions.join(', ')}</p>
                    </div>
                  )}

                  {selected.effect && (
                    <div className="detail-section">
                      <h3>New Perspective (Step E)</h3>
                      <p>{selected.effect}</p>
                    </div>
                  )}

                  {selected.action && (
                    <div className="detail-section">
                      <h3>What's Different</h3>
                      <p>{selected.action}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="no-selection">
                  <p>Select an entry to view details.</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: 'var(--space-2xl)', display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
          <button className="button button-secondary" onClick={handleBack}>
            Back
          </button>
          <button className="button button-primary" onClick={handleNewRSA}>
            Start a New RSA
          </button>
        </div>
      </div>
    </Layout>
  );
};
