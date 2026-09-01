import React, { useState } from 'react';
import { updatePassword } from '../services/supabase';
import './Auth.css';

export function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await updatePassword(newPassword);
      setSuccess(true);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err) {
      setError((err as Error).message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Reset Your Password</h1>
        <p className="auth-subtitle">Enter your new password below</p>

        {success && (
          <div className="auth-message">
            Password updated successfully! Redirecting...
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleResetPassword} className="auth-form">
          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading || success}
              autoFocus
            />
            <small>Must be at least 6 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="confirm-new-password">Confirm Password</label>
            <input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading || success}
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading || success}>
            {loading ? 'Updating password...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
