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
