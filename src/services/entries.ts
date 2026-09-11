import type { RSAEntry } from './rsa';
import { encryptData, decryptData } from './encryption';
import { apiFetch } from './api';

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

    // Send the existing row id (if this entry has already been saved) so a
    // "Save Progress" followed by a completion updates the same row instead of
    // scattering duplicates through the Decision Log.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const existingId = UUID_RE.test(entry.id || '') ? entry.id : undefined;

    const response = await apiFetch('/api/entries', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        encryptedData,
        status,
        ...(existingId ? { entryId: existingId } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save entry: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('[entries] Entry saved successfully:', result.entry?.id);
    // Hand back the entry the caller passed in, carrying the database row id so
    // the next save updates this row rather than creating another one.
    return { ...entryToSave, id: result.entry?.id || entry.id };
  } catch (error) {
    console.error('[entries] Error saving progress:', error);
    throw error;
  }
}

export async function getInProgressEntries(userId: string): Promise<RSAEntry[]> {
  try {
    const response = await apiFetch(`/api/entries/in-progress/${userId}`, {
      method: 'GET',
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

export async function resumeEntry(
  _userId: string,
  entryId: string,
  recoveryCode?: string
): Promise<RSAEntry | null> {
  try {
    const response = await apiFetch(`/api/entries/${entryId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to resume entry: ${response.statusText}`);
    }

    const row = await response.json();
    // The endpoint returns the stored row; entries are saved encrypted, so the
    // payload has to be decrypted here rather than used as-is.
    const entry = await decodeStoredEntry(row, recoveryCode);
    return entry;
  } catch (error) {
    console.error('[entries] Error resuming entry:', error);
    return null;
  }
}

export async function deleteProgressEntry(userId: string, entryId: string): Promise<void> {
  try {
    const response = await apiFetch(`/api/entries/${entryId}`, {
      method: 'DELETE',
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

interface StoredEntryRow {
  id: string;
  status?: string;
  encrypted_data?: unknown;
  created_at?: string;
  updated_at?: string;
}

/**
 * Turn one rsa_entries row into an RSAEntry.
 *
 * The column holds two shapes: the ciphertext string that saveProgressEntry
 * writes today, and a legacy plaintext object. Only the object case was ever
 * handled — string rows became all-blank stubs, which is why saved check-ins
 * showed up in the Decision Log with empty text and never reached the AI.
 */
async function decodeStoredEntry(
  row: StoredEntryRow,
  recoveryCode?: string
): Promise<RSAEntry | null> {
  const status = (row.status as 'in_progress' | 'completed') ?? 'in_progress';
  const timestamp = row.created_at ? new Date(row.created_at).getTime() : Date.now();
  const lastUpdated = row.updated_at ? new Date(row.updated_at).getTime() : timestamp;

  if (typeof row.encrypted_data === 'string') {
    if (!recoveryCode) {
      console.warn('[entries] No recoveryCode supplied, cannot decrypt entry', row.id);
      return null;
    }
    try {
      const decrypted = await decryptData<Partial<RSAEntry>>(row.encrypted_data, recoveryCode);
      return {
        situation: '',
        a: '',
        beliefs: [],
        emotions: [],
        behavior: '',
        effect: '',
        action: '',
        timestamp,
        lastUpdated,
        ...decrypted,
        status,
        id: row.id,
      } as RSAEntry;
    } catch (err) {
      // A row we cannot decrypt is not a blank check-in — dropping it keeps
      // empty placeholders out of both the Decision Log and the AI context.
      console.error('[entries] Failed to decrypt entry', row.id, err);
      return null;
    }
  }

  if (row.encrypted_data && typeof row.encrypted_data === 'object') {
    return {
      situation: '',
      a: '',
      beliefs: [],
      emotions: [],
      behavior: '',
      effect: '',
      action: '',
      timestamp,
      lastUpdated,
      ...(row.encrypted_data as Partial<RSAEntry>),
      status,
      id: row.id,
    } as RSAEntry;
  }

  return null;
}

export async function getAllEntries(userId: string, recoveryCode?: string): Promise<RSAEntry[]> {
  try {
    console.log('[entries] getAllEntries called for userId:', userId);
    // Every entry, not just in-progress ones: completed check-ins are the whole
    // point of the Decision Log.
    const response = await apiFetch(`/api/entries/all/${userId}`, {
      method: 'GET',
    });

    console.log('[entries] getAllEntries response status:', response.status);
    if (!response.ok) {
      throw new Error(`Failed to fetch entries: ${response.statusText}`);
    }

    const data = await response.json();
    const dbEntries: StoredEntryRow[] = Array.isArray(data) ? data : (data.entries || []);
    console.log('[entries] getAllEntries received:', dbEntries.length, 'db records');

    const decoded = await Promise.all(
      dbEntries.map((row) => decodeStoredEntry(row, recoveryCode))
    );
    const entries = decoded.filter((e): e is RSAEntry => e !== null);

    console.log('[entries] getAllEntries returning:', entries.length, 'entries');
    return entries;
  } catch (error) {
    console.error('[entries] Error fetching entries:', error);
    return [];
  }
}

export async function saveAIProfile(userId: string, profileData: unknown): Promise<void> {
  try {
    console.log('[entries] saveAIProfile called for userId:', userId);
    const response = await apiFetch(`/api/ai-profile/${userId}`, {
      method: 'POST',
      body: JSON.stringify(profileData),
    });

    if (!response.ok) {
      throw new Error(`Failed to save AI profile: ${response.statusText}`);
    }

    // A 200 is not proof of a write: the backend UPDATE can match zero rows.
    // Treat a zero-row write as the failure it is instead of logging success.
    const result = await response.json().catch(() => null);
    if (result && typeof result.rowsAffected === 'number' && result.rowsAffected === 0) {
      throw new Error('AI profile save affected 0 rows — nothing was persisted');
    }

    console.log('[entries] AI profile saved successfully');
  } catch (error) {
    console.error('[entries] Error saving AI profile:', error);
    throw error;
  }
}

export async function getAIProfile(userId: string): Promise<Record<string, unknown> | null> {
  try {
    console.log('[entries] getAIProfile called for userId:', userId);
    const response = await apiFetch(`/api/ai-profile/${userId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[entries] No AI profile found (404)');
        return null;
      }
      throw new Error(`Failed to fetch AI profile: ${response.statusText}`);
    }

    const data = await response.json();
    const profile = data.profile || data;
    console.log('[entries] AI profile loaded');
    return profile;
  } catch (error) {
    // Rethrow. Returning null here would be indistinguishable from "this user
    // has no profile yet", and the caller would then mark the profile hydrated
    // and let an empty local profile overwrite the stored one.
    console.error('[entries] Error fetching AI profile:', error);
    throw error;
  }
}
