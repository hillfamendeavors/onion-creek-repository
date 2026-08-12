import { createClient } from '@supabase/supabase-js';

// Public anon key — safe to ship in client code. Row Level Security on the
// Supabase side (not this key) is what actually restricts access.
// Replace with your project's values from Supabase → Project Settings → API.
const SUPABASE_URL = 'https://dktjutawxktwhuhuwbit.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_mlELgE-THem4tud6GIQaZA_NjT9D2ZM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
