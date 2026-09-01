import React, { useState } from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { Layout } from './Layout';
import { SCENARIO_QUESTIONS, FAMILY_ROLES, RELATIONSHIP_QUALITIES, INTERACTION_FREQUENCIES } from '../services/scenarios';
import type { FamilyMember } from '../stores/useRSAStore';
import './FamilyProfile.css';

type Tab = 'family' | 'scenarios';

export const FamilyProfile: React.FC = () => {
  const {
    aiProfile,
    addFamilyMember,
    deleteFamilyMember,
    addScenarioResponse,
    setView,
  } = useRSAStore();

  const [activeTab, setActiveTab] = useState<Tab>('family');
  const [showForm, setShowForm] = useState(false);
  const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
  const [scenarioResponses, setScenarioResponses] = useState<Record<string, string>>({});

  // Family form state
  const [formData, setFormData] = useState<Omit<FamilyMember, 'id'>>({
    name: '',
    role: 'parent',
    relationshipQuality: 'neutral',
    interactionFrequency: 'weekly',
    anxietyTriggers: '',
  });

  const handleAddFamilyMember = () => {
    if (formData.name.trim()) {
      addFamilyMember(formData);
      setFormData({
        name: '',
        role: 'parent',
        relationshipQuality: 'neutral',
        interactionFrequency: 'weekly',
        anxietyTriggers: '',
      });
      setShowForm(false);
    }
  };

  const handleDeleteMember = (id: string) => {
    if (window.confirm('Remove this family member from your profile?')) {
      deleteFamilyMember(id);
    }
  };

  const handleScenarioResponse = (response: string) => {
    setScenarioResponses({
      ...scenarioResponses,
      [SCENARIO_QUESTIONS[currentScenarioIdx].id]: response,
    });
  };

  const handleNextScenario = () => {
    const currentQ = SCENARIO_QUESTIONS[currentScenarioIdx];
    if (scenarioResponses[currentQ.id]) {
      addScenarioResponse(currentQ.description, scenarioResponses[currentQ.id]);
    }

    if (currentScenarioIdx < SCENARIO_QUESTIONS.length - 1) {
      setCurrentScenarioIdx(currentScenarioIdx + 1);
    } else {
      // Quiz complete
      setActiveTab('family');
      setCurrentScenarioIdx(0);
    }
  };

  const handleSkipScenario = () => {
    if (currentScenarioIdx < SCENARIO_QUESTIONS.length - 1) {
      setCurrentScenarioIdx(currentScenarioIdx + 1);
    } else {
      setActiveTab('family');
      setCurrentScenarioIdx(0);
    }
  };

  const currentQuestion = SCENARIO_QUESTIONS[currentScenarioIdx];
  const currentResponse = scenarioResponses[currentQuestion.id] || '';

  return (
    <Layout title="Family & AI Profile" subtitle="Help us get to know how you respond to situations">
      <div className="family-profile-container">
        <div className="profile-tabs">
          <button
            className={`tab-button ${activeTab === 'family' ? 'active' : ''}`}
            onClick={() => setActiveTab('family')}
          >
            Family Members
          </button>
          <button
            className={`tab-button ${activeTab === 'scenarios' ? 'active' : ''}`}
            onClick={() => setActiveTab('scenarios')}
          >
            Reaction Assessment
          </button>
        </div>

        {activeTab === 'family' && (
          <div className="tab-content">
            <p className="section-description">
              Tell us about important people in your life. This helps the AI understand your relationships and give more personalized advice.
            </p>

            {/* Family Members List */}
            {aiProfile.familyMembers.length > 0 && (
              <div className="family-list">
                <h3>Your Family & People ({aiProfile.familyMembers.length})</h3>
                <div className="members-grid">
                  {aiProfile.familyMembers.map((member) => (
                    <div key={member.id} className="member-card">
                      <div className="member-header">
                        <h4>{member.name}</h4>
                        <button
                          className="icon-button delete-btn"
                          onClick={() => handleDeleteMember(member.id)}
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="member-info">
                        <p><span className="label">Role:</span> {member.role}</p>
                        <p><span className="label">Relationship:</span> {member.relationshipQuality}</p>
                        <p><span className="label">Interaction:</span> {member.interactionFrequency}</p>
                        {member.anxietyTriggers && (
                          <p><span className="label">Triggers:</span> {member.anxietyTriggers}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add Family Member Form */}
            {!showForm ? (
              <button className="button button-primary" onClick={() => setShowForm(true)}>
                + Add Family Member
              </button>
            ) : (
              <div className="family-form">
                <h3>Add a Family Member or Important Person</h3>

                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Mom, Alex, Sarah"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Role *</label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          role: e.target.value as typeof formData.role,
                        })
                      }
                    >
                      {FAMILY_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Relationship Quality</label>
                    <select
                      value={formData.relationshipQuality}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          relationshipQuality: e.target.value as typeof formData.relationshipQuality,
                        })
                      }
                    >
                      {RELATIONSHIP_QUALITIES.map((q) => (
                        <option key={q} value={q}>
                          {q.charAt(0).toUpperCase() + q.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>How Often You Interact</label>
                    <select
                      value={formData.interactionFrequency}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          interactionFrequency: e.target.value as typeof formData.interactionFrequency,
                        })
                      }
                    >
                      {INTERACTION_FREQUENCIES.map((freq) => (
                        <option key={freq} value={freq}>
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>What about this person triggers anxiety? (optional)</label>
                  <textarea
                    value={formData.anxietyTriggers}
                    onChange={(e) => setFormData({ ...formData, anxietyTriggers: e.target.value })}
                    placeholder="e.g., They're critical, they cancel plans, they remind me of my failure..."
                    rows={3}
                  />
                </div>

                <div className="form-actions">
                  <button className="button button-secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button className="button button-primary" onClick={handleAddFamilyMember}>
                    Add Member
                  </button>
                </div>
              </div>
            )}

            <div className="profile-actions">
              <button className="button button-secondary" onClick={() => setView('checkin')}>
                Back
              </button>
            </div>
          </div>
        )}

        {activeTab === 'scenarios' && (
          <div className="tab-content scenario-quiz">
            <p className="section-description">
              Answer these scenario-based questions to help the AI understand how you typically react to challenging situations.
            </p>

            <div className="scenario-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${((currentScenarioIdx + 1) / SCENARIO_QUESTIONS.length) * 100}%`,
                  }}
                />
              </div>
              <p className="progress-text">
                {currentScenarioIdx + 1} of {SCENARIO_QUESTIONS.length}
              </p>
            </div>

            <div className="scenario-question">
              <h3>{currentQuestion.title}</h3>
              <p className="scenario-text">{currentQuestion.description}</p>

              <div className="form-group">
                <label>Your reaction:</label>
                <textarea
                  value={currentResponse}
                  onChange={(e) => handleScenarioResponse(e.target.value)}
                  placeholder="Describe how you would realistically respond..."
                  rows={4}
                  autoFocus
                />
              </div>

              <div className="scenario-actions">
                <button
                  className="button button-secondary"
                  onClick={handleSkipScenario}
                >
                  {currentScenarioIdx === SCENARIO_QUESTIONS.length - 1 ? 'Done' : 'Skip'}
                </button>
                <button
                  className="button button-primary"
                  onClick={handleNextScenario}
                  disabled={!currentResponse.trim()}
                >
                  {currentScenarioIdx === SCENARIO_QUESTIONS.length - 1 ? 'Finish' : 'Next Question'}
                </button>
              </div>
            </div>

            <div className="profile-actions">
              <button className="button button-secondary" onClick={() => setView('checkin')}>
                Exit Assessment
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
