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
        <h1>RSA</h1>
        <button onClick={handleSignOut} className="sign-out-btn">
          Sign Out
        </button>
      </div>
    </header>
  );
}
