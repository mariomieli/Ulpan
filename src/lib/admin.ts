import { getSupabase } from './supabase';
import { useEffect, useSyncExternalStore } from 'react';
import { useAuth } from './auth';

export interface AdminUser {
  user_id: string;
  email: string;
  display_name: string;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  synced_at: string | null;
  last_active: string | null;
  xp: number;
  streak: number;
  lessons_passed: number;
  max_lesson_passed: number;
}

/** Vero se l'utente collegato è nell'elenco degli amministratori (tabella `admins` su Supabase). */
export async function checkAdmin(): Promise<boolean> {
  try {
    const { data, error } = await (await getSupabase()).rpc('is_admin');
    return !error && data === true;
  } catch {
    return false;
  }
}

export async function adminUsers(): Promise<AdminUser[]> {
  const { data, error } = await (await getSupabase()).rpc('admin_users');
  if (error) {
    if (/not authorized/i.test(error.message)) throw new Error('Non sei autorizzato a vedere questa pagina.');
    if (/PGRST202|could not find/i.test(`${error.code} ${error.message}`)) throw new Error('Funzioni amministratore non ancora installate su Supabase (esegui supabase/admin.sql).');
    throw new Error(error.message);
  }
  return (data ?? []).map((r: AdminUser) => ({
    ...r, xp: Number(r.xp) || 0, streak: Number(r.streak) || 0,
    lessons_passed: Number(r.lessons_passed) || 0, max_lesson_passed: Number(r.max_lesson_passed) || 0,
  }));
}

/* Stato amministratore in cache: una sola verifica per utente collegato. */
let adminOf: string | null = null;
let isAdminNow = false;
let checking: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useIsAdmin(): boolean {
  const auth = useAuth();
  const id = auth.status === 'signedIn' ? auth.user?.id ?? null : null;
  useEffect(() => {
    if (!id) {
      if (adminOf !== null || isAdminNow) { adminOf = null; isAdminNow = false; emit(); }
      return;
    }
    if (adminOf === id || checking === id) return;
    checking = id;
    void checkAdmin().then((ok) => {
      if (checking !== id) return;
      checking = null; adminOf = id; isAdminNow = ok; emit();
    });
  }, [id]);
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => isAdminNow && adminOf === id,
    () => false,
  );
}
