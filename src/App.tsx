import { useEffect, useRef, useState } from 'react';
import { useRSAStore } from './stores/useRSAStore';
import type { AIProfile } from './stores/useRSAStore';
import { Auth } from './components/Auth';
import { ResetPassword } from './components/ResetPassword';
import { ProfileOnboarding } from './components/ProfileOnboarding';
import { CheckIn } from './components/CheckIn';
import { Landing } from './components/Landing';
import { Crisis } from './components/Crisis';
import { StepFlow } from './components/StepFlow';
import { Summary } from './components/Summary';
import { Journal } from './components/Journal';
import { FamilyProfile } from './components/FamilyProfile';
import { AIChat } from './components/AIChat';
import { AIGuidedRSA } from './components/AIGuidedRSA';
import { Header } from './components/Header';
import { getSession, onAuthStateChange, getProfile } from './services/supabase';
import { getAIProfile, getAllEntries } from './services/entries';
import { apiFetch } from './services/api';
import { ConsentGate } from './components/ConsentGate';
import { ContributeTags } from './components/ContributeTags';
import { getConsent } from './services/consent';
import { decryptData } from './services/encryption';
import './App.css';

function App() {
  const { view, currentUser, setUser, clearUser, setView } = useRSAStore();
  const [loading, setLoading] = useState(true);
  // Whose consent this is, so a signed-out user's answer is never read as the
  // next user's. Null until the first fetch lands.
  const [consentFor, setConsentFor] = useState<{
    userId: string;
    termsAccepted: boolean;
  } | null>(null);
  // Force deployment test

  useEffect(() => {
    // Check if we're on the reset password page
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setView('reset-password');
    }
  }, [setView]);

  useEffect(() => {
    // Check for existing session on mount
    const checkAuth = async () => {
      try {
        console.log('[App] checkAuth starting');
        const session = await getSession();
        console.log('[App] Session:', session?.user?.id ? 'exists' : 'null');

        if (session?.user) {
          // Derive recovery code from user ID for consistency across sessions
          const recoveryCode = btoa(session.user.id).substring(0, 20);
          console.log('[App] Setting user:', session.user.id);
          setUser(session.user.id, recoveryCode);
        }
      } catch (err) {
        console.error('[App] Failed to check auth:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes (logout only - login is handled by checkAuth)
    const subscription = onAuthStateChange(async (user) => {
      if (!user) {
        clearUser();
      }
    });

    return () => {
      subscription?.unsubscribe?.();
    };
  }, [setUser, clearUser]);

  // Which userId we have already hydrated. setUser() builds a new object on
  // every auth event (token refresh, tab focus), so without this guard the
  // whole load ran again on each one.
  const hydratedUserIdRef = useRef<string | null>(null);
  const userId = currentUser?.userId ?? null;
  const recoveryCode = currentUser?.recoveryCode ?? null;

  // Consent is checked on its own, not as part of profile hydration: a profile
  // that fails to load must not leave the gate open, and the gate must not wait
  // on an unrelated fetch.
  //
  // The answer is stored against the user it was fetched for, and read back
  // below only when those ids match. Resetting it in an effect on sign-out
  // would leave one render in which the previous user's answer still applied
  // to the new one — brief, but that render is the whole gate.
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    (async () => {
      try {
        const consent = await getConsent();
        if (!cancelled) setConsentFor({ userId, termsAccepted: consent.termsAccepted });
      } catch (err) {
        // Fail closed. If we cannot tell whether the terms were accepted, show
        // the gate rather than letting the app through on an unknown.
        console.error('[App] Failed to read consent:', err);
        if (!cancelled) setConsentFor({ userId, termsAccepted: false });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // null means "not known yet for this user", which keeps the app from
  // rendering behind the gate on a stale or missing answer.
  const termsAccepted =
    consentFor && consentFor.userId === userId ? consentFor.termsAccepted : null;

  useEffect(() => {
    if (!userId || !recoveryCode) {
      hydratedUserIdRef.current = null;
      return;
    }
    if (hydratedUserIdRef.current === userId) {
      console.log('[App] Profile already hydrated for', userId, '- skipping');
      return;
    }
    hydratedUserIdRef.current = userId;

    console.log('[App] Hydrating profile for user:', userId);
    const currentUser = { userId, recoveryCode };

    const loadUserProfile = async () => {
      try {
        // Setup user in database if not already done
        try {
          const setupResponse = await apiFetch('/api/user/setup', {
            method: 'POST',
            body: JSON.stringify({
              userId: currentUser.userId,
              recoveryCode: currentUser.recoveryCode,
            }),
          });
          console.log('[App] /api/user/setup responded:', setupResponse.status);
          if (!setupResponse.ok) {
            const error = await setupResponse.json();
            console.error('[App] /api/user/setup error:', error);
          } else {
            console.log('[App] /api/user/setup success');
          }
        } catch (setupErr) {
          console.error('[App] /api/user/setup exception:', setupErr);
          // Non-fatal, continue anyway
        }

        // Try to load existing profile
        try {
          console.log('[App] Loading profile for user:', currentUser.userId);
          const profileData = await getProfile(currentUser.userId);
          console.log('[App] Profile found:', !!profileData.encryptedData, 'encryptedData length:', profileData.encryptedData?.length);

          if (profileData.encryptedData) {
            const decrypted = await decryptData(profileData.encryptedData, currentUser.recoveryCode);
            const { setProfile } = useRSAStore.getState();
            setProfile(decrypted as Record<string, unknown>);
            console.log('[App] Profile loaded and decrypted');
          } else {
            // No profile found, navigate to profile creation
            const { setView } = useRSAStore.getState();
            setView('profile');
          }
        } catch (profileErr) {
          console.error('[App] Failed to load profile:', profileErr);
          // Navigate to profile creation if decryption fails (e.g., old format incompatible)
          const { setView } = useRSAStore.getState();
          setView('profile');
        }

        // Load the AI profile independently of the encrypted questionnaire —
        // a failure on one must not leave the other unhydrated.
        try {
          const aiProfileData = await getAIProfile(currentUser.userId);
          // setAIProfile replaces wholesale and marks the profile hydrated.
          // Passing null (no stored profile yet) still marks it hydrated so
          // FamilyProfile is allowed to start saving.
          useRSAStore.getState().setAIProfile(
            (aiProfileData as Partial<AIProfile> | null) ?? null
          );
          console.log(
            '[App] AI profile hydrated:',
            useRSAStore.getState().aiProfile.familyMembers.length, 'family members,',
            useRSAStore.getState().aiProfile.scenarioResponses.length, 'scenario responses'
          );
        } catch (aiErr) {
          console.error('[App] Failed to load AI profile:', aiErr);
          // Leave aiProfileLoaded false: we do not know what is on the server,
          // so saving now could overwrite it with an empty profile.
        }

        // Load saved check-ins at sign-in. They were only ever loaded by the
        // Journal's mount effect, so the AI's "Recent Check-Ins" context was
        // empty for anyone who had not opened the Decision Log this session.
        try {
          const savedEntries = await getAllEntries(
            currentUser.userId,
            currentUser.recoveryCode
          );
          useRSAStore.getState().setEntries(savedEntries);
          console.log('[App] Entries hydrated:', savedEntries.length);
        } catch (entriesErr) {
          console.error('[App] Failed to load entries:', entriesErr);
        }
      } catch (err) {
        console.error('[App] Failed to load user profile:', err);
      }
    };

    loadUserProfile();
  }, [userId, recoveryCode]);

  if (loading) {
    return (
      <div className="app">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Signed in but the current terms are not accepted: nothing else renders.
  if (currentUser && termsAccepted === false) {
    return (
      <div className="app">
        <Header />
        <ConsentGate
          onAccepted={() =>
            setConsentFor({ userId: currentUser.userId, termsAccepted: true })
          }
        />
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      {!currentUser ? (
        <>
          {view === 'auth' && <Auth />}
          {view === 'reset-password' && <ResetPassword />}
        </>
      ) : (
        <>
          {view === 'profile' && <ProfileOnboarding />}
          {view === 'checkin' && <CheckIn />}
          {view === 'landing' && <Landing />}
          {view === 'crisis' && <Crisis />}
          {view === 'flow' && <StepFlow />}
          {view === 'summary' && <Summary />}
          {view === 'journal' && <Journal />}
          {view === 'contribute' && <ContributeTags />}
          {view === 'family' && <FamilyProfile />}
          {view === 'ai-chat' && <AIChat />}
          {view === 'ai-rsa' && <AIGuidedRSA />}
        </>
      )}
    </div>
  );
}

export default App;
