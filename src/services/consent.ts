import { apiFetch } from './api';

export interface ConsentState {
  /** Accepting the terms gates the app. */
  termsAccepted: boolean;
  termsVersion: string;
  /** Contributing to the aggregate dataset. Separable — never gates the app. */
  analyticsGranted: boolean;
  analyticsPolicyVersion: string;
}

export async function getConsent(): Promise<ConsentState> {
  const response = await apiFetch('/api/consent', { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Failed to read consent: ${response.statusText}`);
  }
  return response.json();
}

/**
 * Record one or both decisions. Omitted fields are left untouched, so the
 * analytics choice can be changed later without re-accepting the terms.
 *
 * Passing grantAnalytics: false also deletes the contributions already made.
 */
export async function saveConsent(decisions: {
  acceptTerms?: boolean;
  grantAnalytics?: boolean;
}): Promise<{ termsAccepted: boolean; analyticsGranted: boolean; contributionsDeleted: number }> {
  const response = await apiFetch('/api/consent', {
    method: 'POST',
    body: JSON.stringify(decisions),
  });
  if (!response.ok) {
    throw new Error(`Failed to save consent: ${response.statusText}`);
  }
  return response.json();
}
