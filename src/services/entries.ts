import type { RSAEntry } from './rsa';
import { encryptData } from './encryption';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export async function saveProgressEntry(
  userId: string,
  entry: RSAEntry,
  recoveryCode: string,
  status: 'in_progress' | 'completed' = 'in_progress'
): Promise<RSAEntry> {
  try {
    const entryToSave = {
      ...entry,
      status,
      lastUpdated: Date.now(),
    };

    console.log('[entries] Encrypting entry before save...');
    const encryptedData = await encryptData(entryToSave, recoveryCode);
    console.log('[entries] Entry encrypted, sending to backend');

    const response = await fetch(`${BACKEND_URL}/api/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        encryptedData,
        status,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save entry: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[entries] Entry saved successfully:', result.entry?.id);
    return result.entry;
  } catch (error) {
    console.error('[entries] Error saving progress:', error);
    throw error;
  }
}

export async function getInProgressEntries(userId: string): Promise<RSAEntry[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/entries/in-progress/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch in-progress entries: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[entries] Error fetching in-progress entries:', error);
    return [];
  }
}

export async function resumeEntry(_userId: string, entryId: string): Promise<RSAEntry | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to resume entry: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[entries] Error resuming entry:', error);
    return null;
  }
}

export async function deleteProgressEntry(userId: string, entryId: string): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/entries/${entryId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to delete entry: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[entries] Error deleting entry:', error);
    throw error;
  }
}

export async function getAllEntries(userId: string): Promise<RSAEntry[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/entries/user/${userId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch entries: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[entries] Error fetching entries:', error);
    return [];
  }
}
