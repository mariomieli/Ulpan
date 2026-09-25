import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Gli account online sono attivi solo se il progetto Supabase è configurato. */
export const cloudEnabled = Boolean(url && key);

/** Chiave in cui supabase-js salva la sessione: indica se c'è un utente collegato. */
export const sessionStorageKey = url ? `sb-${new URL(url).hostname.split('.')[0]}-auth-token` : '';

let clientPromise: Promise<SupabaseClient> | null = null;

/** Carica la libreria Supabase solo quando serve (alleggerisce il primo caricamento). */
export function getSupabase(): Promise<SupabaseClient> {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(url!, key!, {
    auth: {
      // PKCE: il codice torna in "?code=" e non interferisce con il router basato su "#"
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })).catch((e) => {
    clientPromise = null; // permette di riprovare invece di restare bloccati sull'errore
    throw e;
  });
  return clientPromise;
}
