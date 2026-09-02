import { useState } from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import { callClaude } from '../services/ai';
import { encryptData } from '../services/encryption';
import { saveAIProfile } from '../services/supabase';
import './ProfileOnboarding.css';

interface ProfileQuestion {
  id: string;
  question: string;
  answer: string;
}

const PROFILE_QUESTIONS = [
  "What are 1–2 situations or people that trigger stress for you?",
  "Who do you turn to when things are difficult? (family, friends, counselor, etc.)",
  "What activities or habits help you feel calmer?",
  "Are there any warning signs that stress is building? (sleep loss, irritability, etc.)",
  "What does success look like for you in the next 3 months?",
];

export function ProfileOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<ProfileQuestion[]>(
    PROFILE_QUESTIONS.map((q, i) => ({
      id: `q${i}`,
      question: q,
      answer: '',
    }))
  );
  const [loading, setLoading] = useState(false);
  const [profileGenerated, setProfileGenerated] = useState<Record<string, unknown> | null>(null);
  const { currentUser, setProfile, addScenarioResponse } = useRSAStore();

  const current = answers[currentStep];

  const handleAnswerChange = (text: string) => {
    const updated = [...answers];
    updated[currentStep].answer = text;
    setAnswers(updated);
  };

  const handleNext = () => {
    if (currentStep < answers.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const profileText = answers.map(a => `${a.question}\n${a.answer}`).join('\n\n');

      const systemPrompt = `You are a compassionate advisor creating a user profile for RSA. Based on their answers, generate a JSON profile with keys: triggers, supports, calmingActivities, warningSigns, goals. Each value should be a concise string or array. Be insightful but respectful.`;

      const response = await callClaude(systemPrompt, profileText);

      // Parse Claude's response
      let profile;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        profile = jsonMatch ? JSON.parse(jsonMatch[0]) : { rawAnswers: answers };
      } catch {
        profile = { rawAnswers: answers };
      }

      setProfileGenerated(profile);

      // Add questionnaire responses to aiProfile for persistence
      answers.forEach((answer) => {
        addScenarioResponse(answer.question, answer.answer);
      });

      // Explicitly save aiProfile to database immediately
      try {
        const updatedStore = useRSAStore.getState();
        const aiProfileData = JSON.stringify(updatedStore.aiProfile);
        await saveAIProfile(currentUser.userId, aiProfileData);
        console.log('[ProfileOnboarding] AI profile saved:', aiProfileData);
      } catch (aiErr) {
        console.error('[ProfileOnboarding] Failed to save AI profile:', aiErr);
      }

      // Encrypt and save profile
      const encrypted = await encryptData(profile, currentUser.recoveryCode);
      console.log('[ProfileOnboarding] About to save profile:', { userId: currentUser.userId, encryptedLength: encrypted.length });
      const saveRes = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          encryptedProfile: encrypted,
        }),
      });
      console.log('[ProfileOnboarding] Save response status:', saveRes.status);
      if (!saveRes.ok) {
        const err = await saveRes.json();
        console.error('[ProfileOnboarding] Save response error:', err);
        throw new Error(err.error || 'Failed to save profile');
      }

      console.log('[ProfileOnboarding] Profile saved successfully');
      setProfile(profile);
    } catch (err) {
      console.error('Profile error:', err);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (profileGenerated) {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <h1>Profile Created</h1>
          <p>Your personal profile has been securely saved. It will help the app understand your context.</p>

          <div className="profile-display">
            {Object.entries(profileGenerated).map(([key, value]) => (
              <div key={key} className="profile-item">
                <strong>{key}:</strong>
                <p>{typeof value === 'string' ? value : JSON.stringify(value)}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              const { setView } = useRSAStore.getState();
              setView('checkin');
            }}
            className="btn-primary"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="progress">
          <div className="progress-bar" style={{ width: `${((currentStep + 1) / answers.length) * 100}%` }}></div>
        </div>

        <h2>Getting to Know You</h2>
        <p className="step-counter">
          Question {currentStep + 1} of {answers.length}
        </p>

        <div className="question-section">
          <label htmlFor="answer">{current.question}</label>
          <textarea
            id="answer"
            value={current.answer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder="Your answer..."
            rows={4}
          />
        </div>

        <div className="button-group">
          <button onClick={handleBack} disabled={currentStep === 0} className="btn-secondary">
            Back
          </button>

          {currentStep < answers.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!current.answer}
              className="btn-primary"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!current.answer || loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : 'Finish'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
