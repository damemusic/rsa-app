import React, { useState, useEffect, useRef } from 'react';
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
    aiProfileLoaded,
    currentUser,
    addFamilyMember,
    deleteFamilyMember,
    addScenarioResponse,
    setView,
  } = useRSAStore();

  const userId = currentUser?.userId;

  const [activeTab, setActiveTab] = useState<Tab>('family');
  const [showForm, setShowForm] = useState(false);
  const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
  const [scenarioResponses, setScenarioResponses] = useState<Record<string, string>>({});
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const scenariosTabOpen = activeTab === 'scenarios';

  // Load cached questions and jump to the first unanswered question when the
  // assessment tab opens. Deliberately keyed on the tab and user only: keying it
  // on aiProfile.scenarioResponses (as it used to be) re-ran the whole thing
  // after every single answer and yanked the user back to an earlier question.
  useEffect(() => {
    if (!scenariosTabOpen || !userId) return;
    let cancelled = false;

    const openAssessment = async () => {
      setQuestionsLoading(true);
      let cached: GeneratedQuestion[] = [];
      try {
        console.log('[FamilyProfile] Loading cached generated questions');
        cached = await getCachedQuestions(userId, 20);
      } catch (err) {
        console.error('[FamilyProfile] Failed to load cached questions:', err);
      }
      if (cancelled) return;
      setGeneratedQuestions(cached);
      setQuestionsLoading(false);

      // Read the store directly so this effect does not have to depend on it.
      const answered = new Set(
        useRSAStore.getState().aiProfile.scenarioResponses.map((r) => r.scenario)
      );

      let targetIdx = SCENARIO_QUESTIONS.findIndex((q) => !answered.has(q.description));
      if (targetIdx < 0) {
        // Every base question is answered — continue into the generated
        // follow-ups instead of bouncing back to question 1.
        const genIdx = cached.findIndex((q) => !answered.has(q.title));
        if (cached.length === 0) {
          targetIdx = Math.max(SCENARIO_QUESTIONS.length - 1, 0);
        } else {
          targetIdx =
            SCENARIO_QUESTIONS.length + (genIdx >= 0 ? genIdx : cached.length - 1);
        }
      }

      setCurrentScenarioIdx(targetIdx);
      setScenarioResponses({});
      console.log(
        '[FamilyProfile] Assessment opened at index', targetIdx,
        '-', answered.size, 'question(s) already answered,',
        cached.length, 'follow-up(s) cached'
      );
    };

    openAssessment();
    return () => {
      cancelled = true;
    };
  }, [scenariosTabOpen, userId]);

  // Persist the AI profile whenever it actually changes.
  //
  // Two guards matter here. Saving before hydration finishes would POST an empty
  // profile over the stored one, and re-POSTing the freshly hydrated profile is
  // pure noise, so the first post-hydration value is recorded as a baseline
  // rather than sent.
  const lastSavedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userId) {
      console.log('[FamilyProfile] No currentUser, skipping save');
      return;
    }
    if (!aiProfileLoaded) {
      console.log('[FamilyProfile] AI profile not hydrated yet, skipping save');
      return;
    }

    const payload = JSON.stringify(aiProfile);
    if (lastSavedRef.current === null) {
      lastSavedRef.current = payload;
      console.log('[FamilyProfile] Recorded hydrated profile as save baseline');
      return;
    }
    if (lastSavedRef.current === payload) return;

    const previous = lastSavedRef.current;
    lastSavedRef.current = payload;
    setSaveState('saving');
    saveAIProfile(userId, aiProfile)
      .then(() => {
        console.log('[FamilyProfile] AI profile saved successfully');
        setSaveState('saved');
      })
      .catch((err) => {
        console.error('[FamilyProfile] Failed to save AI profile:', err);
        // Roll the baseline back so the next change retries instead of
        // assuming this payload made it to the server.
        lastSavedRef.current = previous;
        setSaveState('error');
      });
  }, [aiProfile, aiProfileLoaded, userId]);

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
  // Questions are stored under their description (base) or title (generated).
  const currentQuestionLabel = currentQuestion
    ? isShowingGenerated
      ? currentQuestion.title
      : currentQuestion.description
    : '';
  const savedResponse =
    aiProfile.scenarioResponses.find((r) => r.scenario === currentQuestionLabel)
      ?.userResponse || '';
  // Fall back to the stored answer so previously saved responses are shown back
  // to the user instead of an empty box.
  const draftResponse = currentQuestion ? scenarioResponses[currentQuestion.id] : undefined;
  const currentResponse = draftResponse !== undefined ? draftResponse : savedResponse;
  const totalQuestions = SCENARIO_QUESTIONS.length + generatedQuestions.length;
  const questionNumber = isShowingGenerated
    ? SCENARIO_QUESTIONS.length + displayIdx + 1
    : currentScenarioIdx + 1;
  const isLastQuestion = questionNumber >= totalQuestions;

  // Append new follow-ups, skipping ids already in the list. Appending (rather
  // than prepending) keeps the indexes of questions already on screen stable.
  const mergeGeneratedQuestions = (
    prev: GeneratedQuestion[],
    incoming: GeneratedQuestion[]
  ): GeneratedQuestion[] => {
    const seen = new Set(prev.map((q) => q.id));
    const additions = incoming.filter((q) => {
      if (!q?.id || seen.has(q.id)) return false;
      seen.add(q.id);
      return true;
    });
    return additions.length ? [...prev, ...additions] : prev;
  };

  const handleScenarioResponse = (response: string) => {
    setScenarioResponses({
      ...scenarioResponses,
      [currentQuestion?.id || '']: response,
    });
  };

  const handleNextScenario = async () => {
    if (!currentQuestion?.id || !currentResponse.trim()) {
      return;
    }

    const userResponse = currentResponse;
    const questionLabel = currentQuestionLabel;
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
          aiProfile as unknown as Record<string, unknown>
        );
        console.log('[FamilyProfile] Received', newQuestions.length, 'follow-up questions');
        if (newQuestions.length > 0) {
          setGeneratedQuestions((prev) => mergeGeneratedQuestions(prev, newQuestions));
        }
      } catch (err) {
        console.error('[FamilyProfile] Error generating follow-up questions:', err);
      } finally {
        setIsGeneratingQuestions(false);
      }
    } else {
      console.log('[FamilyProfile] Skipping follow-up generation - conditions not met');
    }

    // Always move forward. If we run past the end of the list the render falls
    // through to the completion panel (or a "preparing" state while follow-ups
    // are still being generated) instead of silently bouncing to question 1.
    setCurrentScenarioIdx((idx) => idx + 1);
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
        aiProfile as unknown as Record<string, unknown>
      );
      if (newQuestions.length > 0) {
        // Same merge as handleNextScenario. The old `.slice(0, 10)` here fought
        // the growth logic in handleNextScenario and dropped questions mid-flow,
        // which is what made the progress counter jump around.
        setGeneratedQuestions((prev) => mergeGeneratedQuestions(prev, newQuestions));
      }
      setIsGeneratingQuestions(false);
    }

    setCurrentScenarioIdx((idx) => idx + 1);
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

        {/* Persistence is invisible otherwise: without this the user cannot tell
            a stored profile from one that silently failed to save. */}
        <div className="save-status" role="status" aria-live="polite">
          {!aiProfileLoaded && '⏳ Loading your saved profile…'}
          {aiProfileLoaded && saveState === 'saving' && '💾 Saving…'}
          {aiProfileLoaded && saveState === 'saved' && '✓ Saved'}
          {aiProfileLoaded && saveState === 'error' && (
            <span className="save-status-error">
              ⚠️ Could not save — your last change is not stored. Check your connection and try
              again.
            </span>
          )}
          {aiProfileLoaded && saveState === 'idle' && (
            <span className="save-status-muted">
              {aiProfile.familyMembers.length} member
              {aiProfile.familyMembers.length === 1 ? '' : 's'} ·{' '}
              {aiProfile.scenarioResponses.length} answer
              {aiProfile.scenarioResponses.length === 1 ? '' : 's'} saved
            </span>
          )}
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
              <button
                className="button button-primary"
                onClick={() => setShowForm(true)}
                // Adding before hydration completes would be dropped by the save
                // guard, so the member would appear on screen and never persist.
                disabled={!aiProfileLoaded}
              >
                {aiProfileLoaded ? '+ Add Family Member' : 'Loading profile…'}
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
                    width: `${Math.min(100, (Math.min(questionNumber, totalQuestions) / (totalQuestions || SCENARIO_QUESTIONS.length)) * 100)}%`,
                  }}
                />
              </div>
              <p className="progress-text">
                {currentQuestion
                  ? `${Math.min(questionNumber, totalQuestions)} of ${totalQuestions || SCENARIO_QUESTIONS.length}`
                  : `${aiProfile.scenarioResponses.length} answered`}
                {isShowingGenerated && currentQuestion && <span style={{ marginLeft: '8px', fontSize: '0.9em', color: '#888' }}>(follow-ups)</span>}
              </p>
            </div>

            {!currentQuestion ? (
              <div className="scenario-question">
                {questionsLoading || isGeneratingQuestions ? (
                  <>
                    <h3>Preparing your next question…</h3>
                    <p className="scenario-text">One moment while we tailor a follow-up to your answers.</p>
                  </>
                ) : (
                  <>
                    <h3>You're all caught up</h3>
                    <p className="scenario-text">
                      {aiProfile.scenarioResponses.length} answer
                      {aiProfile.scenarioResponses.length === 1 ? '' : 's'} saved. The AI uses these
                      to understand how you react.
                    </p>
                    <div className="scenario-actions">
                      <button
                        className="button button-secondary"
                        onClick={() => setCurrentScenarioIdx(0)}
                      >
                        Review my answers
                      </button>
                      <button className="button button-primary" onClick={() => setActiveTab('family')}>
                        Done
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
            <div className="scenario-question">
              <h3>{currentQuestion.title}</h3>
              <p className="scenario-text">{currentQuestion.description}</p>

              <div className="form-group">
                <label>Your reaction:</label>
                {savedResponse && (
                  <p className="progress-text" style={{ margin: '0 0 6px' }}>
                    ✓ Saved answer loaded — edit it to update.
                  </p>
                )}
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
                  {isLastQuestion ? 'Done' : 'Skip'}
                </button>
                <button
                  className="button button-primary"
                  onClick={handleNextScenario}
                  disabled={!currentResponse.trim()}
                >
                  {isLastQuestion ? 'Finish' : 'Next Question'}
                </button>
              </div>
            </div>
            )}

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
