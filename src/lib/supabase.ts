import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Gli account online sono attivi solo se il progetto Supabase è configurato. */
export const cloudEnabled = Boolean(url && key);

export const supabase: SupabaseClient | null = cloudEnabled
  ? createClient(url!, key!, {
    auth: {
      // PKCE: il codice torna in "?code=" e non interferisce con il router basato su "#"
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  : null;
