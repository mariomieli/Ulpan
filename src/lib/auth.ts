import { useSyncExternalStore } from 'react';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { cloudEnabled, getSupabase, sessionStorageKey } from './supabase';
import { publicStats } from './leaderboard';
import {
  getState, hasProgress, mergeStates, readStored, replaceState, sanitize, storageKeyFor, subscribe as subscribeStore, switchUser,
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
const USER_CACHE = 'ulpan:user';
/** Impostato solo da un'uscita esplicita: al primo accesso si entra subito come ospite, senza muro di login. */
const LOGGED_OUT = 'ulpan:loggedout';
let supabase: SupabaseClient | null = null;
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
let applyingRemote = false;
let inflight: Promise<void> | null = null;
let migrationOffered = false;

/**
 * Sincronizza con il cloud: legge la copia online, la unisce a quella locale
 * e scrive il risultato. Mai sovrascrivere senza unire: un altro dispositivo
 * potrebbe aver salvato progressi nel frattempo.
 * Le chiamate concorrenti si accodano in un'unica sincronizzazione.
 */
export function sync(): Promise<void> {
  inflight ??= doSync().finally(() => { inflight = null; });
  return inflight;
}

async function doSync() {
  if (!supabase || auth.status !== 'signedIn' || !auth.user) return;
  if (!navigator.onLine) { setAuth({ sync: 'offline' }); return; }
  const client = supabase;
  const uid = auth.user.id;
  setAuth({ sync: 'saving' });
  const { data, error } = await client.from('progress').select('state').eq('user_id', uid).maybeSingle();
  // l'utente è cambiato durante l'attesa (logout, cambio account): non mescolare i dati
  if (auth.user?.id !== uid) return;
  if (error) { setAuth({ sync: 'error' }); return; }

  let next = getState();
  if (data?.state) {
    next = mergeStates(next, sanitize(data.state));
  } else if (!hasProgress(next) && !migrationOffered) {
    // Primo accesso: propone (una volta) di portare nell'account i progressi fatti come ospite
    migrationOffered = true;
    const guest = readStored(null);
    if (hasProgress(guest) && confirm('Su questo dispositivo ci sono progressi salvati senza account. Vuoi trasferirli nel tuo account?')) {
      next = mergeStates(next, guest);
    }
  }
  applyingRemote = true;
  replaceState(next);
  applyingRemote = false;

  const now = new Date().toISOString();
  const { error: upErr } = await client.from('progress').upsert({ user_id: uid, state: next, updated_at: now });
  if (auth.user?.id !== uid) return;
  setAuth({ sync: upErr ? 'error' : 'saved' });
  // Statistiche per le classifiche dei gruppi (se la tabella non esiste ancora, si ignora)
  void client.from('public_stats').upsert({
    user_id: uid,
    display_name: auth.user.name.slice(0, 40),
    ...publicStats(next),
    updated_at: now,
  }).then(() => undefined);
}

/** Salva subito (unendo con il cloud). */
export const push = sync;
/** Scarica e unisce i progressi dal cloud. */
export const pull = sync;

function schedulePush() {
  if (auth.status !== 'signedIn' || applyingRemote) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void sync(), 4000);
}

/** Salva le modifiche in sospeso quando l'app va in background o si chiude. */
function flushPending() {
  if (pushTimer === undefined) return;
  clearTimeout(pushTimer);
  pushTimer = undefined;
  void sync();
}

/* ------------------------------------------------------------------ */
/* Autenticazione                                                      */
/* ------------------------------------------------------------------ */

async function activate(u: User) {
  const user = toUser(u);
  localStorage.setItem(USER_CACHE, JSON.stringify(user));
  localStorage.removeItem(GUEST_FLAG);
  localStorage.removeItem(LOGGED_OUT);
  // Se l'utente era già attivo (avvio rapido dalla cache) basta sincronizzare
  if (!(auth.user?.id === u.id && auth.status === 'signedIn')) switchUser(u.id);
  setAuth({ status: 'signedIn', user });
  await pull();
}

function cachedUser(): AuthUser | null {
  try {
    const u = JSON.parse(localStorage.getItem(USER_CACHE) ?? 'null') as AuthUser | null;
    return u?.id && localStorage.getItem(sessionStorageKey) ? u : null;
  } catch {
    return null;
  }
}

let started = false;
let recovering = false;

export function initAuth() {
  if (started || !cloudEnabled) return;
  started = true;

  // Avvio immediato senza aspettare la rete: utente già collegato, ospite o nuovo visitatore.
  const hasCode = new URLSearchParams(location.search).has('code');
  // Link di recupero password: supabase-js lo segna nel "code verifier" salvato
  if (hasCode && (localStorage.getItem(`${sessionStorageKey}-code-verifier`) ?? '').includes('PASSWORD_RECOVERY')) {
    recovering = true;
  }
  const cached = cachedUser();
  if (cached && !hasCode) {
    switchUser(cached.id);
    setAuth({ status: 'signedIn', user: cached });
  } else if (localStorage.getItem(GUEST_FLAG) && !hasCode) {
    switchUser(null);
    setAuth({ status: 'guest' });
  } else if (!localStorage.getItem(sessionStorageKey) && !hasCode) {
    startWithoutSession();
  }

  const load = () => getSupabase().then((client) => {
    supabase = client;
    listen(client);
  }).catch(() => {
    // libreria non scaricabile (offline): si riprova al ritorno della connessione
    if (auth.status === 'loading') startWithoutSession();
    window.addEventListener('online', () => void load(), { once: true });
  });
  void load();
}

function listen(client: SupabaseClient) {
  subscribeStore(schedulePush);
  window.addEventListener('online', () => void pull());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void sync();
    else flushPending();
  });
  window.addEventListener('pagehide', flushPending);

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      recovering = true;
      if (session?.user) setAuth({ status: 'recovery', user: toUser(session.user) });
      return;
    }
    if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      if (recovering) return; // prima si imposta la nuova password
      // evita chiamate a Supabase dentro il callback; ricontrolla: PASSWORD_RECOVERY può arrivare subito dopo
      setTimeout(() => { if (!recovering) void activate(session.user); }, 0);
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem(USER_CACHE);
      localStorage.setItem(LOGGED_OUT, '1');
      switchUser(null);
      setAuth({ status: 'signedOut', user: null, sync: 'idle' });
    } else if (event === 'INITIAL_SESSION' && !session) {
      localStorage.removeItem(USER_CACHE);
      startWithoutSession();
    } else if (event === 'USER_UPDATED' && session?.user) {
      localStorage.setItem(USER_CACHE, JSON.stringify(toUser(session.user)));
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
  const { error } = await (await getSupabase()).auth.signInWithPassword({ email: email.trim(), password });
  return error ? italian(error.message) : null;
}

/** Restituisce un errore oppure `confirm: true` se serve confermare l'email. */
export async function signUp(name: string, email: string, password: string): Promise<{ error?: string; confirm?: boolean }> {
  const { data, error } = await (await getSupabase()).auth.signUp({
    email: email.trim(), password,
    // consensi registrati sul server insieme all'account (età / genitore e informativa)
    options: { data: { name: name.trim(), age_confirmed_at: new Date().toISOString(), privacy_accepted_at: new Date().toISOString() }, emailRedirectTo: redirectTo() },
  });
  if (error) return { error: italian(error.message) };
  return { confirm: !data.session };
}

export async function resetPassword(email: string): Promise<string | null> {
  const { error } = await (await getSupabase()).auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo() });
  return error ? italian(error.message) : null;
}

export async function updatePassword(password: string): Promise<string | null> {
  const { data, error } = await (await getSupabase()).auth.updateUser({ password });
  if (error) return italian(error.message);
  recovering = false;
  if (data.user) await activate(data.user);
  return null;
}

export async function updateName(name: string): Promise<string | null> {
  const { error } = await (await getSupabase()).auth.updateUser({ data: { name: name.trim() } });
  if (error) return italian(error.message);
  if (auth.user) setAuth({ user: { ...auth.user, name: name.trim() } });
  await push();
  return null;
}

export async function signOut() {
  clearTimeout(pushTimer);
  await push();
  localStorage.removeItem(USER_CACHE);
  await (await getSupabase()).auth.signOut();
}

/** Elimina definitivamente l'account e i progressi online; cancella anche la copia locale. */
export async function deleteAccount(): Promise<string | null> {
  if (!supabase || !auth.user) return 'Nessun account attivo.';
  const id = auth.user.id;
  clearTimeout(pushTimer);
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    return /could not find|does not exist|PGRST202/i.test(error.message + error.code)
      ? 'Funzione di eliminazione non ancora configurata sul server.'
      : italian(error.message);
  }
  localStorage.removeItem(storageKeyFor(id));
  localStorage.removeItem(USER_CACHE);
  await supabase.auth.signOut({ scope: 'local' });
  switchUser(null);
  setAuth({ status: 'signedOut', user: null, sync: 'idle' });
  return null;
}

/** Nessuna sessione: ospite, a meno che l'utente sia appena uscito esplicitamente. */
function startWithoutSession() {
  if (localStorage.getItem(LOGGED_OUT) && !localStorage.getItem(GUEST_FLAG)) {
    setAuth({ status: 'signedOut', user: null });
    return;
  }
  continueAsGuest();
}

export function continueAsGuest() {
  localStorage.setItem(GUEST_FLAG, '1');
  localStorage.removeItem(LOGGED_OUT);
  switchUser(null);
  setAuth({ status: 'guest', user: null });
}

export function showLogin() {
  localStorage.removeItem(GUEST_FLAG);
  setAuth({ status: 'signedOut' });
}
