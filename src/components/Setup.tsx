import { useState } from 'react';
import { generateRecoveryCode } from '../services/encryption';
import { useRSAStore } from '../stores/useRSAStore';
import './Setup.css';

export function Setup() {
  const [recoveryCode, setRecoveryCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const { setUser } = useRSAStore();

  const handleGenerateCode = () => {
    const code = generateRecoveryCode();
    setRecoveryCode(code);
    setCopied(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    if (!recoveryCode || !confirmed) return;

    try {
      const userId = `user_${Date.now()}`;

      // Save to backend
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/user/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, recoveryCode }),
      });

      if (!response.ok) throw new Error('Setup failed');

      setUser(userId, recoveryCode);
    } catch (err) {
      console.error('Setup error:', err);
      alert('Failed to set up. Please try again.');
    }
  };

  if (!recoveryCode) {
    return (
      <div className="setup-container">
        <div className="setup-card">
          <h1>Welcome to RSA</h1>
          <p>Your data is yours alone. Let's create a recovery code to protect it.</p>

          <button onClick={handleGenerateCode} className="btn-primary">
            Generate Recovery Code
          </button>

          <div className="setup-info">
            <h3>Why a recovery code?</h3>
            <ul>
              <li>Your entries are encrypted — only you can read them</li>
              <li>Your recovery code is the key to your data</li>
              <li>Save it somewhere safe (you'll need it on other devices)</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h1>Your Recovery Code</h1>
        <p className="warning">⚠️ Save this in a safe place. You'll need it to access your data on other devices.</p>

        <div className="recovery-code-display">
          <code>{recoveryCode}</code>
        </div>

        <button onClick={handleCopyCode} className="btn-secondary">
          {copied ? '✓ Copied!' : 'Copy Code'}
        </button>

        <div className="setup-info">
          <h3>What to do:</h3>
          <ul>
            <li>Copy this code</li>
            <li>Save it in a password manager, email, or write it down</li>
            <li>Do NOT share it with anyone (not even support)</li>
          </ul>
        </div>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          I've saved my recovery code in a safe place
        </label>

        <button
          onClick={handleConfirm}
          disabled={!confirmed}
          className="btn-primary"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
