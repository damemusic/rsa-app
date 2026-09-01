import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Auth features will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signUp(email: string, password: string) {
  console.log('[Auth] Starting signup for:', email);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Signup error:', error.message, error);
      throw error;
    }

    console.log('[Auth] Signup successful for user:', data.user?.id);
    return data;
  } catch (error) {
    console.error('[Auth] Signup exception:', error);
    throw error;
  }
}

export async function signIn(email: string, password: string) {
  console.log('[Auth] Starting signin for:', email);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth] Signin error:', error.message, error);
      throw error;
    }

    console.log('[Auth] Signin successful for user:', data.user?.id);
    return data;
  } catch (error) {
    console.error('[Auth] Signin exception:', error);
    throw error;
  }
}

export async function signOut() {
  console.log('[Auth] Starting signout');

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Auth] Signout error:', error.message);
      throw error;
    }
    console.log('[Auth] Signout successful');
  } catch (error) {
    console.error('[Auth] Signout exception:', error);
    throw error;
  }
}

export async function resetPassword(email: string) {
  console.log('[Auth] Starting password reset for:', email);

  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      console.error('[Auth] Password reset error:', error.message);
      throw error;
    }

    console.log('[Auth] Password reset email sent');
    return data;
  } catch (error) {
    console.error('[Auth] Password reset exception:', error);
    throw error;
  }
}

export async function updatePassword(newPassword: string) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
  return data;
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthStateChange(callback: (user: any) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });

  return data.subscription;
}

export async function saveProfile(userId: string, encryptedData: string) {
  const { data, error } = await supabase
    .from('rsa_profiles')
    .upsert(
      {
        user_id: userId,
        encrypted_data: encryptedData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select();

  if (error) throw error;
  return data;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('rsa_profiles')
    .select('encrypted_data')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data?.encrypted_data || null;
}

export async function setupUser(userId: string, recoveryCode: string) {
  console.log('[Setup] Creating user:', userId);
  try {
    const { data, error } = await supabase
      .from('rsa_users')
      .upsert(
        {
          id: userId,
          recovery_code_hash: btoa(recoveryCode),
          created_at: new Date().toISOString(),
          last_check_in: null,
        },
        { onConflict: 'id' }
      )
      .select();

    if (error) {
      console.error('[Setup] Error creating user:', error);
      throw error;
    }
    console.log('[Setup] User created successfully:', data);
    return data;
  } catch (err) {
    console.error('[Setup] Exception creating user:', err);
    throw err;
  }
}
