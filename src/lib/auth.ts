import { useSyncExternalStore } from 'react';
import type { User } from '@supabase/supabase-js';
import { cloudEnabled, supabase } from './supabase';
import {
  getState, hasProgress, mergeStates, readStored, replaceState, sanitize, subscribe as subscribeStore, switchUser,
} from './store';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn' | 'guest' | 'recovery';
export type SyncStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  sync: SyncStatus;
}

const GUEST_FLAG = 'ulpan:guest';
let auth: AuthState = { status: cloudEnabled ? 'loading' : 'guest', user: null, sync: 'idle' };
const listeners = new Set<() => void>();

function setAuth(patch: Partial<AuthState>) {
  auth = { ...auth, ...patch };
  listeners.forEach((l) => l());
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => auth,
    () => auth,
  );
}

function toUser(u: User): AuthUser {
  const email = u.email ?? '';
  const name = (u.user_metadata?.name as string | undefined)?.trim() || email.split('@')[0];
  return { id: u.id, email, name };
}

/* ------------------------------------------------------------------ */
/* Sincronizzazione                                                    */
/* ------------------------------------------------------------------ */

let pushTimer: ReturnType<typeof setTimeout> | undefined;
let pulling = false;

async function push() {
  if (!supabase || auth.status !== 'signedIn' || !auth.user) return;
  if (!navigator.onLine) { setAuth({ sync: 'offline' }); return; }
  setAuth({ sync: 'saving' });
  const { error } = await supabase.from('progress').upsert({
    user_id: auth.user.id,
    state: getState(),
    updated_at: new Date().toISOString(),
  });
  setAuth({ sync: error ? 'error' : 'saved' });
}

function schedulePush() {
  if (auth.status !== 'signedIn' || pulling) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 1500);
}

/** Scarica i progressi dal cloud e li unisce a quelli locali. */
export async function pull() {
  if (!supabase || auth.status !== 'signedIn' || !auth.user) return;
  if (!navigator.onLine) { setAuth({ sync: 'offline' }); return; }
  const { data, error } = await supabase.from('progress').select('state').eq('user_id', auth.user.id).maybeSingle();
  if (error) { setAuth({ sync: 'error' }); return; }
  let next = getState();
  if (data?.state) {
    next = mergeStates(next, sanitize(data.state));
  } else if (!hasProgress(next)) {
    // Primo accesso: propone di portare nell'account i progressi fatti come ospite
    const guest = readStored(null);
    if (hasProgress(guest) && confirm('Su questo dispositivo ci sono progressi salvati senza account. Vuoi trasferirli nel tuo account?')) {
      next = mergeStates(next, guest);
    }
  }
  pulling = true;
  replaceState(next);
  pulling = false;
  await push();
}

/* ------------------------------------------------------------------ */
/* Autenticazione                                                      */
/* ------------------------------------------------------------------ */

async function activate(u: User) {
  if (auth.user?.id === u.id && auth.status === 'signedIn') return;
  localStorage.removeItem(GUEST_FLAG);
  switchUser(u.id);
  setAuth({ status: 'signedIn', user: toUser(u), sync: 'idle' });
  await pull();
}

let started = false;
let recovering = false;

export function initAuth() {
  if (started || !supabase) return;
  started = true;

  subscribeStore(schedulePush);
  window.addEventListener('online', () => void pull());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void pull();
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      recovering = true;
      if (session?.user) setAuth({ status: 'recovery', user: toUser(session.user) });
      return;
    }
    if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      if (recovering) return; // prima si imposta la nuova password
      // evita chiamate a Supabase dentro il callback
      setTimeout(() => void activate(session.user), 0);
    } else if (event === 'SIGNED_OUT') {
      switchUser(null);
      setAuth({ status: 'signedOut', user: null, sync: 'idle' });
    } else if (event === 'INITIAL_SESSION' && !session) {
      if (localStorage.getItem(GUEST_FLAG)) { switchUser(null); setAuth({ status: 'guest' }); }
      else setAuth({ status: 'signedOut' });
    } else if (event === 'USER_UPDATED' && session?.user) {
      setAuth({ user: toUser(session.user) });
    }
  });

  // Pulisce "?code=..." dall'indirizzo dopo conferma email o recupero password
  if (new URLSearchParams(location.search).has('code')) {
    setTimeout(() => history.replaceState(null, '', location.pathname + location.hash), 1500);
  }
}

const ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, 'Email o password non corretti.'],
  [/email not confirmed/i, 'Devi prima confermare l’email: controlla la posta (anche lo spam).'],
  [/already registered|already been registered/i, 'Esiste già un account con questa email.'],
  [/password should be at least/i, 'La password deve avere almeno 6 caratteri.'],
  [/unable to validate email|invalid format/i, 'Indirizzo email non valido.'],
  [/rate limit|too many/i, 'Troppi tentativi: riprova tra qualche minuto.'],
  [/network|fetch/i, 'Connessione assente: controlla internet e riprova.'],
  [/same.*password|different from the old/i, 'La nuova password deve essere diversa dalla precedente.'],
];

function italian(message: string): string {
  return ERRORS.find(([re]) => re.test(message))?.[1] ?? message;
}

const redirectTo = () => location.origin + location.pathname;

export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
  return error ? italian(error.message) : null;
}

/** Restituisce un errore oppure `confirm: true` se serve confermare l'email. */
export async function signUp(name: string, email: string, password: string): Promise<{ error?: string; confirm?: boolean }> {
  const { data, error } = await supabase!.auth.signUp({
    email: email.trim(), password,
    options: { data: { name: name.trim() }, emailRedirectTo: redirectTo() },
  });
  if (error) return { error: italian(error.message) };
  return { confirm: !data.session };
}

export async function resetPassword(email: string): Promise<string | null> {
  const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo() });
  return error ? italian(error.message) : null;
}

export async function updatePassword(password: string): Promise<string | null> {
  const { data, error } = await supabase!.auth.updateUser({ password });
  if (error) return italian(error.message);
  recovering = false;
  if (data.user) await activate(data.user);
  return null;
}

export async function updateName(name: string): Promise<string | null> {
  const { error } = await supabase!.auth.updateUser({ data: { name: name.trim() } });
  return error ? italian(error.message) : null;
}

export async function signOut() {
  clearTimeout(pushTimer);
  await push();
  await supabase?.auth.signOut();
}

export function continueAsGuest() {
  localStorage.setItem(GUEST_FLAG, '1');
  switchUser(null);
  setAuth({ status: 'guest', user: null });
}

export function showLogin() {
  localStorage.removeItem(GUEST_FLAG);
  setAuth({ status: 'signedOut' });
}
