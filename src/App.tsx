import { useEffect, useState } from 'react';
import { useRSAStore } from './stores/useRSAStore';
import { Auth } from './components/Auth';
import { ResetPassword } from './components/ResetPassword';
import { Setup } from './components/Setup';
import { ProfileOnboarding } from './components/ProfileOnboarding';
import { CheckIn } from './components/CheckIn';
import { Landing } from './components/Landing';
import { Crisis } from './components/Crisis';
import { StepFlow } from './components/StepFlow';
import { Summary } from './components/Summary';
import { Journal } from './components/Journal';
import { FamilyProfile } from './components/FamilyProfile';
import { Header } from './components/Header';
import { getSession, onAuthStateChange, getProfile } from './services/supabase';
import { decryptData } from './services/encryption';
import './App.css';

function App() {
  const { view, currentUser, setUser, clearUser, setView } = useRSAStore();
  const [loading, setLoading] = useState(true);

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
        console.log('[App] VITE_BACKEND_URL:', import.meta.env.VITE_BACKEND_URL);
        const session = await getSession();
        console.log('[App] Session:', session?.user?.id ? 'exists' : 'null');

        if (session?.user) {
          // Derive recovery code from user ID for consistency across sessions
          const recoveryCode = btoa(session.user.id).substring(0, 20);
          console.log('[App] Setting user:', session.user.id);
          setUser(session.user.id, recoveryCode);

          // Setup user in database if not already done
          try {
            console.log('[App] Calling /api/user/setup with backend URL:', import.meta.env.VITE_BACKEND_URL);
            const backendUrl = import.meta.env.VITE_BACKEND_URL;
            if (!backendUrl) {
              console.error('[App] VITE_BACKEND_URL is not set!');
              throw new Error('Backend URL not configured');
            }
            const setupUrl = `${backendUrl}/api/user/setup`;
            console.log('[App] Setup URL:', setupUrl);
            const setupResponse = await fetch(setupUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: session.user.id,
                recoveryCode,
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
            console.log('[App] Loading profile');
            const encryptedProfile = await getProfile(session.user.id);
            console.log('[App] Profile found:', !!encryptedProfile);
            if (encryptedProfile) {
              const decrypted = await decryptData(encryptedProfile, recoveryCode);
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

  if (loading) {
    return (
      <div className="app">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      {!currentUser ? (
        <>
          {view === 'setup' ? <Setup /> : null}
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
          {view === 'family' && <FamilyProfile />}
        </>
      )}
    </div>
  );
}

export default App;
