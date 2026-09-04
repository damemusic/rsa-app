import { useState, useEffect } from 'react';
import { useRSAStore } from '../stores/useRSAStore';
import './CheckIn.css';

interface CheckInSchedule {
  frequency: 'daily' | 'weekly';
  nextCheckInDate: string;
  daysActive: number;
  lastCheckIn: string | null;
}

export function CheckIn() {
  const [schedule, setSchedule] = useState<CheckInSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDue, setIsDue] = useState(false);
  const { currentUser, setView } = useRSAStore();

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!currentUser) return;

      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/check-in/schedule/${currentUser.userId}`
        );

        if (!response.ok) throw new Error('Failed to fetch schedule');

        const data = await response.json();
        setSchedule(data.schedule);

        // Check if check-in is due
        if (data.schedule) {
          const nextDate = new Date(data.schedule.nextCheckInDate);
          setIsDue(new Date() >= nextDate);
        }
      } catch (err) {
        console.error('Schedule fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [currentUser]);

  const handleCheckIn = async () => {
    if (!currentUser) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.userId,
          stepCompleted: null,
        }),
      });

      if (!response.ok) throw new Error('Check-in failed');

      // Proceed to RSA flow
      setView('flow');
    } catch (err) {
      console.error('Check-in error:', err);
      alert('Failed to log check-in. Please try again.');
    }
  };

  const handleSkip = () => {
    setView('journal');
  };

  if (loading) {
    return (
      <div className="checkin-container">
        <div className="checkin-card">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="checkin-container">
        <div className="checkin-card">
          <h1>Check In</h1>
          <p>Let's set up your check-in schedule.</p>
          <button onClick={() => setView('profile')} className="btn-primary">
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  const lastCheckInDate = schedule.lastCheckIn ? new Date(schedule.lastCheckIn) : null;
  const nextCheckInDate = new Date(schedule.nextCheckInDate);
  const daysUntilNext = Math.ceil((nextCheckInDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="checkin-container">
      <div className="checkin-card">
        <h1>Check In</h1>

        {isDue ? (
          <>
            <p className="checkin-message">
              It's time for your {schedule.frequency} check-in! How are you doing?
            </p>

            <div className="checkin-options">
              <button onClick={handleCheckIn} className="btn-primary">
                Start My Reality Check
              </button>
              <button onClick={handleSkip} className="btn-secondary">
                I'm Doing OK (Skip for now)
              </button>
              <button onClick={() => setView('family')} className="btn-secondary">
                Manage Family Profile
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="checkin-status">
              You're on track! Your next {schedule.frequency} check-in is in{' '}
              <strong>{Math.max(0, daysUntilNext)} days</strong>.
            </p>

            {lastCheckInDate && (
              <p className="last-checkin">
                Last check-in: {lastCheckInDate.toLocaleDateString()}
              </p>
            )}

            <div className="checkin-stats">
              <div className="stat">
                <span className="label">Active Since</span>
                <span className="value">{schedule.daysActive} days</span>
              </div>
              <div className="stat">
                <span className="label">Frequency</span>
                <span className="value">{schedule.frequency}</span>
              </div>
            </div>

            <div className="checkin-options">
              <button onClick={() => setView('journal')} className="btn-secondary">
                View Journal
              </button>
              <button onClick={() => setView('family')} className="btn-secondary">
                Manage Family Profile
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
