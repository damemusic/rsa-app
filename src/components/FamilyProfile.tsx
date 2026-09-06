import React, { useState, useEffect } from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { Layout } from './Layout';
import { SCENARIO_QUESTIONS, FAMILY_ROLES, RELATIONSHIP_QUALITIES, INTERACTION_FREQUENCIES } from '../services/scenarios';
import type { FamilyMember } from '../stores/useRSAStore';
import { saveAIProfile } from '../services/entries';
import { generateFollowUpQuestions, getCachedQuestions, type GeneratedQuestion } from '../services/questionGeneration';
import './FamilyProfile.css';

type Tab = 'family' | 'scenarios';

export const FamilyProfile: React.FC = () => {
  console.log('[FamilyProfile] Component loaded - v2b116e7');

  const {
    aiProfile,
    currentUser,
    addFamilyMember,
    deleteFamilyMember,
    addScenarioResponse,
    setView,
  } = useRSAStore();

  const [activeTab, setActiveTab] = useState<Tab>('family');
  const [showForm, setShowForm] = useState(false);
  const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
  const [scenarioResponses, setScenarioResponses] = useState<Record<string, string>>({});
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // Load cached questions and auto-skip to first unanswered when scenarios tab opens
  useEffect(() => {
    if (activeTab === 'scenarios' && currentUser?.userId) {
      // Load cached generated questions
      const loadCachedQuestions = async () => {
        console.log('[FamilyProfile] Loading cached generated questions');
        const cached = await getCachedQuestions(currentUser.userId, 20);
        setGeneratedQuestions(cached);
      };
      loadCachedQuestions();

      const answeredQuestionIds = new Set(
        aiProfile.scenarioResponses.map((r: any) => {
          const q = SCENARIO_QUESTIONS.find(sq => sq.description === r.scenario);
          return q?.id;
        })
      );

      const firstUnansweredIdx = SCENARIO_QUESTIONS.findIndex(
        (q) => !answeredQuestionIds.has(q.id)
      );

      const targetIdx = firstUnansweredIdx >= 0 ? firstUnansweredIdx : 0;
      setCurrentScenarioIdx(targetIdx);
      setScenarioResponses({});
      console.log('[FamilyProfile] Auto-skip active: Jumping to question', targetIdx + 1, 'of', SCENARIO_QUESTIONS.length);
    }
  }, [activeTab, aiProfile.scenarioResponses, currentUser?.userId]);

  // Save aiProfile whenever it changes
  useEffect(() => {
    console.log('[FamilyProfile] useEffect triggered, aiProfile:', aiProfile, 'currentUser:', currentUser);
    const saveProfile = async () => {
      if (!currentUser?.userId) {
        console.log('[FamilyProfile] No currentUser, skipping save');
        return;
      }
      try {
        console.log('[FamilyProfile] Saving AI profile');
        await saveAIProfile(currentUser.userId, aiProfile);
        console.log('[FamilyProfile] AI profile saved successfully');
      } catch (err) {
        console.error('[FamilyProfile] Failed to save AI profile:', err);
      }
    };

    saveProfile();
  }, [aiProfile, currentUser]);

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

  // Determine which questions to display (base or generated) - moved before handlers
  const isShowingGenerated = currentScenarioIdx >= SCENARIO_QUESTIONS.length;
  const questionsToShow = isShowingGenerated ? generatedQuestions : SCENARIO_QUESTIONS;
  const displayIdx = isShowingGenerated ? currentScenarioIdx - SCENARIO_QUESTIONS.length : currentScenarioIdx;
  const currentQuestion = questionsToShow[displayIdx];
  const currentResponse = scenarioResponses[currentQuestion?.id || ''] || '';
  const totalQuestions = SCENARIO_QUESTIONS.length + generatedQuestions.length;
  const questionNumber = isShowingGenerated
    ? SCENARIO_QUESTIONS.length + displayIdx + 1
    : currentScenarioIdx + 1;

  const handleScenarioResponse = (response: string) => {
    setScenarioResponses({
      ...scenarioResponses,
      [currentQuestion?.id || '']: response,
    });
  };

  const handleNextScenario = async () => {
    if (!currentQuestion?.id || !scenarioResponses[currentQuestion.id]) {
      return;
    }

    const userResponse = scenarioResponses[currentQuestion.id];

    // For base questions, use the description; for generated questions, use the title
    const questionLabel = isShowingGenerated ? currentQuestion.title : currentQuestion.description;
    addScenarioResponse(questionLabel, userResponse);

    // Capture currentUser value to ensure we have it for the async call
    const userId = currentUser?.userId;
    console.log('[FamilyProfile] handleNextScenario - userId:', userId, 'isGeneratingQuestions:', isGeneratingQuestions, 'isShowingGenerated:', isShowingGenerated);
    if (userId && !isGeneratingQuestions && !isShowingGenerated) {
      console.log('[FamilyProfile] Triggering follow-up question generation');
      setIsGeneratingQuestions(true);
      try {
        const newQuestions = await generateFollowUpQuestions(
          userId,
          userResponse,
          currentQuestion.id,
          aiProfile
        );
        console.log('[FamilyProfile] Received', newQuestions.length, 'follow-up questions');
        if (newQuestions.length > 0) {
          setGeneratedQuestions((prev) => [
            ...newQuestions.slice(0, 2),
            ...prev.filter((q) => q.id !== newQuestions[0]?.id),
          ]);
        }
      } catch (err) {
        console.error('[FamilyProfile] Error generating follow-up questions:', err);
      } finally {
        setIsGeneratingQuestions(false);
      }
    } else {
      console.log('[FamilyProfile] Skipping follow-up generation - conditions not met');
    }

    // Progress to next question
    if (questionNumber < totalQuestions) {
      setCurrentScenarioIdx(currentScenarioIdx + 1);
    } else {
      setActiveTab('family');
      setCurrentScenarioIdx(0);
    }
  };

  const handleSkipScenario = async () => {
    const currentQ = questionsToShow[displayIdx];

    // Generate follow-up questions on skip too (helps with adaptive learning)
    if (currentUser?.userId && !isGeneratingQuestions && !isShowingGenerated) {
      setIsGeneratingQuestions(true);
      console.log('[FamilyProfile] Generating follow-up after skip for:', currentQ?.id);
      const newQuestions = await generateFollowUpQuestions(
        currentUser.userId,
        '[User skipped this question]',
        currentQ?.id || '',
        aiProfile
      );
      if (newQuestions.length > 0) {
        setGeneratedQuestions((prev) => [...newQuestions, ...prev].slice(0, 10));
      }
      setIsGeneratingQuestions(false);
    }

    if (questionNumber < totalQuestions) {
      setCurrentScenarioIdx(currentScenarioIdx + 1);
    } else {
      setActiveTab('family');
      setCurrentScenarioIdx(0);
    }
  };

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
                    width: `${(questionNumber / totalQuestions) * 100}%`,
                  }}
                />
              </div>
              <p className="progress-text">
                {questionNumber} of {totalQuestions || SCENARIO_QUESTIONS.length}
                {isShowingGenerated && <span style={{ marginLeft: '8px', fontSize: '0.9em', color: '#888' }}>(follow-ups)</span>}
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
