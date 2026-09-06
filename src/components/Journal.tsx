import React, { useEffect } from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { resumeEntry, getAllEntries, deleteProgressEntry } from '../services/entries';
import { Layout } from './Layout';
import './Journal.css';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Journal: React.FC = () => {
  const { entries, deleteEntry, setView, resetEntry, setCurrentEntry, setEntries, currentUser } = useRSAStore();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  console.log('[Journal] Component mounted/rendered, currentUser:', currentUser?.userId);

  useEffect(() => {
    console.log('[Journal] useEffect triggered, currentUser:', currentUser?.userId);
    const loadEntries = async () => {
      if (!currentUser) {
        console.log('[Journal] currentUser is null, skipping load');
        return;
      }
      try {
        console.log('[Journal] Loading entries for user:', currentUser.userId);
        const dbEntries = await getAllEntries(currentUser.userId, currentUser.recoveryCode);
        console.log('[Journal] Received entries:', dbEntries.length);
        setEntries(dbEntries);
      } catch (error) {
        console.error('[Journal] Error loading entries:', error);
      }
    };

    loadEntries();
  }, [currentUser?.userId, currentUser?.recoveryCode, setEntries]);

  const selected = entries.find(e => e.id === selectedId);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this check-in? This cannot be undone.')) return;
    if (!currentUser) return;
    try {
      // Delete server-side first. Removing it only from the store made the
      // entry reappear on the next load, so "cannot be undone" was a lie.
      // Ids like "rsa-1725..." never reached the database (the row id is a
      // uuid), so those are local-only and there is nothing to delete there.
      if (UUID_RE.test(id)) {
        await deleteProgressEntry(currentUser.userId, id);
      }
      deleteEntry(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (error) {
      console.error('[Journal] Error deleting entry:', error);
      alert('Could not delete that check-in. Please try again.');
    }
  };

  const handleNewCheckIn = () => {
    resetEntry();
    setView('landing');
  };

  const handleBack = () => {
    setView('checkin');
  };

  const handleResume = async (entryId: string) => {
    try {
      const entry = await resumeEntry('', entryId, currentUser?.recoveryCode);
      if (entry) {
        setCurrentEntry(entry);
        setView('ai-rsa');
      } else {
        alert('Failed to resume entry.');
      }
    } catch (error) {
      console.error('[Journal] Error resuming entry:', error);
      alert('Failed to resume entry. Please try again.');
    }
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
    <Layout title="Decision Log" subtitle="Saved check-ins from your practice">
      <div className="journal-container">
        {entries.length === 0 ? (
          <div className="empty-journal">
            <p>No entries yet. Complete a check-in to save it to your Decision Log.</p>
            <button className="button button-primary" onClick={handleNewCheckIn}>
              Start a New Check-In
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
                    className={`entry-button ${selectedId === entry.id ? 'active' : ''} ${entry.status === 'in_progress' ? 'in-progress' : 'completed'}`}
                    onClick={() => setSelectedId(entry.id)}
                  >
                    <div className="entry-date">{formatDate(entry.timestamp)}</div>
                    <div className="entry-status">
                      {entry.status === 'in_progress' ? '⏸ In Progress' : '✓ Completed'}
                    </div>
                    <div className="entry-preview">
                      {entry.situation
                        ? `${entry.situation.substring(0, 50)}${entry.situation.length > 50 ? '…' : ''}`
                        : 'No situation recorded yet'}
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
                    <div>
                      <h2>{formatDate(selected.timestamp)}</h2>
                      {selected.status === 'in_progress' && (
                        <p style={{ margin: '4px 0 0 0', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                          ⏸ In Progress
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                      {selected.status === 'in_progress' && (
                        <button
                          className="button button-primary"
                          onClick={() => handleResume(selected.id)}
                        >
                          Resume
                        </button>
                      )}
                      <button
                        className="button button-ghost"
                        onClick={() => handleDelete(selected.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="detail-section">
                    <h3>Situation</h3>
                    <p>{selected.situation}</p>
                  </div>

                  <div className="detail-section">
                    <h3>Facts (Step A)</h3>
                    <p>{selected.a}</p>
                  </div>

                  {(selected.beliefs?.length ?? 0) > 0 && (
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

                  {(selected.emotions?.length ?? 0) > 0 && (
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

        <div style={{ marginTop: 'var(--space-2xl)', display: 'flex', gap: 'var(--space-md)', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="button button-secondary" onClick={handleBack}>
            Back
          </button>
          <button className="button button-primary" onClick={handleNewCheckIn}>
            Start a New Check-In
          </button>
          <button className="button button-accent" onClick={() => setView('ai-chat')}>
            💬 Speak with AI
          </button>
        </div>
      </div>
    </Layout>
  );
};
