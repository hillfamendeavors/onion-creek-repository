import { supabase } from './supabase.js';

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
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

export async function signUp(email, password) {
  const invalid = checkCredentials(email, password);
  if (invalid) return invalid;
  return supabase.auth.signUp({ email, password });
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
