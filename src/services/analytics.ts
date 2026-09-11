import { apiFetch } from './api';

/**
 * The de-identified contribution a consented user can make after a check-in.
 *
 * Only taxonomy codes travel — never the check-in text, and nothing derived
 * from it. The codes come from the user picking them on the summary screen, so
 * nothing is inferred from their private writing by a classifier.
 */

export const NEED_CATEGORIES = [
  { code: 'housing', label: 'Housing' },
  { code: 'employment', label: 'Work or job hunting' },
  { code: 'transportation', label: 'Getting around' },
  { code: 'family_conflict', label: 'Family or relationships' },
  { code: 'substance_use', label: 'Substance use' },
  { code: 'mental_health', label: 'Mental health' },
  { code: 'finances', label: 'Money' },
  { code: 'legal', label: 'Legal or court' },
  { code: 'healthcare', label: 'Health care' },
  { code: 'childcare', label: 'Childcare' },
  { code: 'education', label: 'School or training' },
  { code: 'food_security', label: 'Food' },
  { code: 'social_isolation', label: 'Feeling isolated' },
  { code: 'other', label: 'Something else' },
] as const;

export const SUPPORT_OPTIONS = [
  { code: 'none', label: 'No one' },
  { code: 'family', label: 'Family' },
  { code: 'friend', label: 'A friend' },
  { code: 'counselor', label: 'A counselor or therapist' },
  { code: 'faith_community', label: 'Faith community' },
  { code: 'program_staff', label: 'Program staff' },
  { code: 'probation_officer', label: 'Probation officer' },
  { code: 'peer_support', label: 'Peer support' },
  { code: 'hotline', label: 'A hotline' },
  { code: 'other', label: 'Someone else' },
] as const;

export const OUTCOME_OPTIONS = [
  { code: 'resolved', label: 'It got sorted out' },
  { code: 'plan_made', label: 'I made a plan' },
  { code: 'still_stuck', label: "I'm still stuck" },
  { code: 'escalated', label: 'It got worse' },
] as const;

export interface CheckInFact {
  need_category: string;
  support_accessed: string;
  outcome_signal: string;
}

/**
 * Submit one fact. Safe to call without checking consent first: the backend
 * re-reads consent on every call and refuses with 403 if it is not current,
 * which is also why a revocation takes effect immediately.
 *
 * Never throws into the check-in flow — a failed contribution must not cost the
 * user their check-in.
 */
export async function contributeCheckInFact(fact: CheckInFact): Promise<boolean> {
  try {
    const response = await apiFetch('/api/analytics/checkin', {
      method: 'POST',
      body: JSON.stringify(fact),
    });
    if (!response.ok) {
      console.warn('[analytics] Contribution not recorded:', response.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[analytics] Contribution failed:', err);
    return false;
  }
}
