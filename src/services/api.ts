import { supabase } from './supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Call the RSA backend with the signed-in user's access token attached.
 *
 * Every /api route verifies that token and checks the user id in the request
 * against it, so a call made without one comes back 401. Going through this
 * helper rather than bare fetch() is what keeps that from happening.
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!BACKEND_URL) {
    throw new Error('VITE_BACKEND_URL is not configured');
  }

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    // Better to say so here than to let the backend answer 401 and have the
    // caller report it as a save failure.
    throw new Error('Not signed in');
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const url = path.startsWith('http') ? path : `${BACKEND_URL}${path}`;
  return fetch(url, { ...init, headers });
}
