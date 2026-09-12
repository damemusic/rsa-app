import { useRSAStore } from '../stores/useRSAStore';
import { signOut } from '../services/supabase';
import './Header.css';

export function Header() {
  const { clearUser, currentUser } = useRSAStore();

  const handleSignOut = async () => {
    try {
      await signOut();
      clearUser();
    } catch (err) {
      console.error('Sign out failed:', err);
      alert('Failed to sign out. Please try again.');
    }
  };

  if (!currentUser) return null;

  return (
    <header className="app-header">
      <div className="header-content">
        <h1>Real Talk</h1>
        <div className="header-actions">
          {/* The consent gate used to carry these links. With the gate gone
              they still have to be reachable: the app sends check-in content
              to a third party and holds the key to what it stores, and saying
              so is not contingent on selling anything. */}
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="header-link"
          >
            Privacy
          </a>
          <button onClick={handleSignOut} className="sign-out-btn">
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
