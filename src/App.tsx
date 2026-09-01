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
import { getSession, onAuthStateChange } from './services/supabase';
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
        const session = await getSession();
        if (session?.user) {
          const recoveryCode = Math.random().toString(36).substring(2, 15);
          setUser(session.user.id, recoveryCode);

          // Try to load existing profile
          try {
            const profileResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/profile?userId=${session.user.id}`, {
              headers: { 'Content-Type': 'application/json' },
            });

            if (profileResponse.ok) {
              try {
                const { encryptedProfile } = await profileResponse.json();
                const decrypted = await decryptData(encryptedProfile, recoveryCode);
                const { setProfile } = useRSAStore.getState();
                setProfile(decrypted as Record<string, unknown>);
              } catch (decryptErr) {
                console.error('Failed to decrypt profile:', decryptErr);
              }
            }
            // If profile not found (404) or other errors, user will go through onboarding
          } catch (profileErr) {
            console.error('Failed to load profile:', profileErr);
            // Network error is ok, user will go through onboarding
          }
        }
      } catch (err) {
        console.error('Failed to check auth:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const subscription = onAuthStateChange(async (user) => {
      if (user) {
        const recoveryCode = Math.random().toString(36).substring(2, 15);
        setUser(user.id, recoveryCode);

        // Try to load existing profile
        try {
          const profileResponse = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/profile?userId=${user.id}`, {
            headers: { 'Content-Type': 'application/json' },
          });

          if (profileResponse.ok) {
            try {
              const { encryptedProfile } = await profileResponse.json();
              const decrypted = await decryptData(encryptedProfile, recoveryCode);
              const { setProfile } = useRSAStore.getState();
              setProfile(decrypted as Record<string, unknown>);
            } catch (decryptErr) {
              console.error('Failed to decrypt profile:', decryptErr);
            }
          }
        } catch (profileErr) {
          console.error('Failed to load profile:', profileErr);
        }
      } else {
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
