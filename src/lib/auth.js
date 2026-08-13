import { supabase } from './supabase.js';

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session) {
        const maxAge = 100 * 365 * 24 * 60 * 60; // 100 years
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
        document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=${maxAge}; SameSite=Lax; secure`;
      }
    } else if (event === 'SIGNED_OUT') {
      document.cookie = 'sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'sb-refresh-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  });
}

function checkCredentials(email, password) {
  if (!email || !password) {
    return { error: { message: 'Please enter an email and password.' } };
  }
  return null;
}

export async function signIn(email, password) {
  const invalid = checkCredentials(email, password);
  if (invalid) return invalid;
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email, password, metadata = {}) {
  const invalid = checkCredentials(email, password);
  if (invalid) return invalid;
  const redirectTo = typeof window !== 'undefined'
    ? `${window.location.origin}/account/`
    : 'https://trustedneighbors.net/account/';

  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: metadata.full_name || '',
        phone: metadata.phone || '',
      },
    },
  });
}

export async function updateProfile(metadata = {}) {
  return supabase.auth.updateUser({
    data: {
      full_name: metadata.full_name,
      phone: metadata.phone,
    },
  });
}

export async function requestPasswordReset(email) {
  if (!email) {
    return { error: { message: 'Please enter your email first.' } };
  }
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password/`,
  });
}

export async function updatePassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    return { error: { message: 'Password must be at least 6 characters.' } };
  }
  return supabase.auth.updateUser({ password: newPassword });
}
