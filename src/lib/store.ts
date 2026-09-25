import { useSyncExternalStore } from 'react';
import { newSrsState, review, isDue, type SrsState } from './srs';
import { LESSON_BY_ID, coreWordsOfLesson, LAST_LESSON } from '../data/curriculum';
import { GLYPH_BY_ID } from '../data/alphabet';
import { VOWEL_BY_ID } from '../data/nikud';
import { WORDS } from '../data/words';

const WORD_IDS = new Set(WORDS.map((w) => w.id));

export type Theme = 'system' | 'light' | 'dark';
export type HebrewFont = 'serif' | 'sans';

export interface Settings {
  theme: Theme;
  font: HebrewFont;
  fontScale: number;
  audio: boolean;
  speechRate: number;
  typing: boolean;
  dailyGoal: number;
  unlockAll: boolean;
}

export interface LessonProgress {
  studied: boolean;
  bestScore: number;
  passed: boolean;
  attempts: number;
}

export interface ExamResult {
  bestScore: number;
  lastScore: number;
  attempts: number;
  lastDate: string;
  bestTimeSec?: number;
}

export interface DayStats {
  answered: number;
  correct: number;
}

export interface DeviceContrib {
  xp: number;
  days: Record<string, DayStats>;
}

export interface AppState {
  version: 1;
  /** Versione dell'ordine del corso (3 = 19 lezioni: vocali, lettere in ordine alfabetico, regole). */
  curriculum?: 3;
  settings: Settings;
  lessons: Record<number, LessonProgress>;
  exams: Record<string, ExamResult>;
  srs: Record<string, SrsState>;
  xp: number;
  streak: number;
  lastActive: string | null;
  days: Record<string, DayStats>;
  /** Testi di lettura completati: id → data. */
  texts: Record<string, string>;
  /**
   * Contributi di ogni dispositivo a XP e attività giornaliera. Ogni dispositivo
   * incrementa solo i propri contatori: così, unendo due copie, i progressi fatti
   * in parallelo si sommano invece di sovrascriversi. `xp` e `days` sono i totali.
   */
  contrib: Record<string, DeviceContrib>;
  /** Ultima modifica delle impostazioni (per unirle tra dispositivi). */
  settingsUpdatedAt?: number;
  /** Ultima modifica (ms): serve a scegliere le impostazioni più recenti in sincronizzazione. */
  updatedAt?: number;
  /** Momento dell'ultimo azzeramento/importazione: le copie più vecchie vengono scartate. */
  resetAt?: number;
}

const BASE_KEY = 'ulpan:v1';

/** Chiave di archiviazione locale: una per utente, più quella dell'ospite. */
export function storageKeyFor(userId: string | null): string {
  return userId ? `${BASE_KEY}:${userId}` : BASE_KEY;
}

let storageKey = BASE_KEY;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  font: 'serif',
  fontScale: 1,
  audio: true,
  speechRate: 0.8,
  typing: true,
  dailyGoal: 30,
  unlockAll: false,
};

export function initialState(): AppState {
  return {
    version: 1, curriculum: 3, settings: { ...DEFAULT_SETTINGS }, lessons: {}, exams: {}, srs: {},
    xp: 0, streak: 0, lastActive: null, days: {}, texts: {}, contrib: {},
  };
}

export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function yesterdayKey(now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/* ------------------------------------------------------------------ */
/* Validazione (dati da localStorage, cloud o file importati)          */
/* ------------------------------------------------------------------ */

const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function num(x: unknown, def = 0, min = 0, max = 1e12): number {
  return typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : def;
}

/** Copia sicura di una mappa: solo chiavi valide, niente chiavi pericolose. */
function mapOf<T>(x: unknown, keyRe: RegExp, value: (v: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!x || typeof x !== 'object' || Array.isArray(x)) return out;
  for (const [k, v] of Object.entries(x)) {
    if (BAD_KEYS.has(k) || !keyRe.test(k)) continue;
    const val = value(v);
    if (val !== null) out[k] = val;
  }
  return out;
}

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null);

const dayStats = (v: unknown): DayStats | null => {
  const o = obj(v);
  return o ? { answered: num(o.answered, 0, 0, 1e7), correct: num(o.correct, 0, 0, 1e7) } : null;
};
const daysMap = (v: unknown) => mapOf(v, DATE_RE, dayStats);

function sanitizeSettings(v: unknown): Settings {
  const o = obj(v) ?? {};
  const d = DEFAULT_SETTINGS;
  return {
    theme: o.theme === 'light' || o.theme === 'dark' || o.theme === 'system' ? o.theme : d.theme,
    font: o.font === 'sans' || o.font === 'serif' ? o.font : d.font,
    fontScale: num(o.fontScale, d.fontScale, 0.5, 2),
    audio: typeof o.audio === 'boolean' ? o.audio : d.audio,
    speechRate: num(o.speechRate, d.speechRate, 0.3, 2),
    typing: typeof o.typing === 'boolean' ? o.typing : d.typing,
    dailyGoal: num(o.dailyGoal, d.dailyGoal, 1, 1000),
    unlockAll: typeof o.unlockAll === 'boolean' ? o.unlockAll : d.unlockAll,
  };
}

/** Totali di XP e attività ricavati dai contributi dei dispositivi. */
function totals(contrib: Record<string, DeviceContrib>): { xp: number; days: Record<string, DayStats> } {
  let xp = 0;
  const days: Record<string, DayStats> = {};
  for (const c of Object.values(contrib)) {
    xp += c.xp;
    for (const [k, d] of Object.entries(c.days)) {
      const t = days[k] ?? { answered: 0, correct: 0 };
      days[k] = { answered: t.answered + d.answered, correct: t.correct + d.correct };
    }
  }
  return { xp, days };
}

/** Rende valido qualsiasi dato in ingresso: tipi controllati, chiavi filtrate, limiti. */
export function sanitize(raw: unknown): AppState {
  const r = obj(raw);
  if (!r) return initialState();
  const lessons = mapOf(r.lessons, /^\d{1,3}$/, (v) => {
    const o = obj(v);
    return o ? {
      studied: o.studied === true, passed: o.passed === true,
      bestScore: num(o.bestScore, 0, 0, 100), attempts: num(o.attempts, 0, 0, 1e6),
    } : null;
  }) as unknown as AppState['lessons'];
  const exams = mapOf(r.exams, /^[a-z-]{1,30}$/, (v) => {
    const o = obj(v);
    return o ? {
      bestScore: num(o.bestScore, 0, 0, 100), lastScore: num(o.lastScore, 0, 0, 100),
      attempts: num(o.attempts, 0, 0, 1e6), lastDate: typeof o.lastDate === 'string' && DATE_RE.test(o.lastDate) ? o.lastDate : '',
      bestTimeSec: o.bestTimeSec === undefined ? undefined : num(o.bestTimeSec, 0, 0, 1e7),
    } : null;
  });
  const srs = mapOf(r.srs, /^[gvw]:[\w-]{1,60}$/, (v) => {
    const o = obj(v);
    return o ? {
      reps: num(o.reps, 0, 0, 1e4), interval: num(o.interval, 0, 0, 1e5), ease: num(o.ease, 2.5, 1.3, 3),
      due: num(o.due, 0, 0, 1e14), lapses: num(o.lapses, 0, 0, 1e6), seen: num(o.seen, 0, 0, 1e7),
      correct: num(o.correct, 0, 0, 1e7),
    } : null;
  });
  const texts = mapOf(r.texts, /^[\w-]{1,40}$/, (v) => (typeof v === 'string' && DATE_RE.test(v) ? v : null));
  let contrib = mapOf(r.contrib, /^[\w-]{1,40}$/, (v) => {
    const o = obj(v);
    return o ? { xp: num(o.xp, 0, 0, 1e9), days: daysMap(o.days) } : null;
  });
  // Dati precedenti ai contributi per dispositivo: diventano un unico contributo "storico"
  if (!Object.keys(contrib).length && (r.xp || r.days)) {
    contrib = { legacy: { xp: num(r.xp, 0, 0, 1e9), days: daysMap(r.days) } };
  }
  return {
    version: 1,
    curriculum: 3,
    settings: sanitizeSettings(r.settings),
    // progressi salvati con un ordine delle lezioni precedente: si convertono
    lessons: r.version === 1 && r.curriculum !== 3 ? migrateLessons(lessons, r.curriculum === 2 ? 2 : 1) : lessons,
    exams, srs, texts, contrib,
    ...totals(contrib),
    streak: num(r.streak, 0, 0, 1e5),
    lastActive: typeof r.lastActive === 'string' && DATE_RE.test(r.lastActive) ? r.lastActive : null,
    updatedAt: r.updatedAt === undefined ? undefined : num(r.updatedAt),
    resetAt: r.resetAt === undefined ? undefined : num(r.resetAt),
    settingsUpdatedAt: r.settingsUpdatedAt === undefined ? undefined : num(r.settingsUpdatedAt),
  };
}

/** In quale lezione si studiava ogni lettera e vocale negli ordini precedenti del corso. */
const OLD_LESSONS: Record<1 | 2, Record<string, number>> = {
  // 1: ordine originale (10 lezioni, lettere e vocali mescolate)
  1: {
    'g:alef': 1, 'g:bet': 1, 'g:vet': 1, 'g:lamed': 1, 'g:mem': 1, 'g:mem-sofit': 1,
    'g:shin': 2, 'g:tav': 2, 'g:dalet': 2,
    'g:yod': 3, 'g:nun': 3, 'g:nun-sofit': 3, 'g:gimel': 3,
    'g:he': 4, 'g:vav': 4,
    'g:resh': 5, 'g:kaf': 5, 'g:khaf': 5, 'g:khaf-sofit': 5,
    'g:samekh': 6, 'g:kuf': 6, 'g:sin': 6,
    'g:chet': 7, 'g:ayin': 7,
    'g:zayin': 8, 'g:tet': 8, 'g:tsadi': 8, 'g:tsadi-sofit': 8,
    'g:pe': 9, 'g:fe': 9, 'g:fe-sofit': 9,
    'v:kamatz': 1, 'v:patach': 1, 'v:hiriq': 2, 'v:hiriq-male': 3, 'v:sheva': 3,
    'v:holam': 4, 'v:holam-male': 4, 'v:tsere': 5, 'v:tsere-male': 5, 'v:segol': 5,
    'v:kubutz': 6, 'v:shuruk': 6, 'v:hataf-patach': 7, 'v:hataf-segol': 7, 'v:hataf-kamatz': 7,
  },
  // 2: 10 lezioni (tutte le vocali nella 1, lettere in ordine alfabetico, regole nella 10)
  2: {
    'g:alef': 1, 'g:bet': 2, 'g:vet': 2, 'g:gimel': 2, 'g:dalet': 2,
    'g:he': 3, 'g:vav': 3, 'g:zayin': 3, 'g:chet': 3,
    'g:tet': 4, 'g:yod': 4, 'g:kaf': 4, 'g:khaf': 4, 'g:khaf-sofit': 4,
    'g:lamed': 5, 'g:mem': 5, 'g:mem-sofit': 5,
    'g:nun': 6, 'g:nun-sofit': 6, 'g:samekh': 6, 'g:ayin': 6,
    'g:pe': 7, 'g:fe': 7, 'g:fe-sofit': 7, 'g:tsadi': 7, 'g:tsadi-sofit': 7,
    'g:kuf': 8, 'g:resh': 8, 'g:shin': 9, 'g:sin': 9, 'g:tav': 9,
    'v:kamatz': 1, 'v:patach': 1, 'v:hiriq': 1, 'v:hiriq-male': 1, 'v:sheva': 1,
    'v:holam': 1, 'v:holam-male': 1, 'v:tsere': 1, 'v:tsere-male': 1, 'v:segol': 1,
    'v:kubutz': 1, 'v:shuruk': 1, 'v:hataf-patach': 1, 'v:hataf-segol': 1, 'v:hataf-kamatz': 1,
  },
};
/** In entrambi gli ordini precedenti le regole di lettura erano nella lezione 10. */
const OLD_RULES_LESSON = 10;

/**
 * Ordine precedente → attuale: una lezione risulta superata (o studiata) se tutte le sue
 * lettere e vocali stavano in lezioni già superate (o studiate) nell'ordine precedente.
 */
export function migrateLessons(old: AppState['lessons'], from: 1 | 2 = 1): AppState['lessons'] {
  const map = OLD_LESSONS[from];
  const out: AppState['lessons'] = {};
  for (const lesson of Object.values(LESSON_BY_ID)) {
    const oldIds = lesson.glyphs.length + lesson.vowels.length
      ? [...new Set([...lesson.glyphs.map((g) => map[`g:${g}`]), ...lesson.vowels.map((v) => map[`v:${v}`])])]
      : [OLD_RULES_LESSON];
    const prev = oldIds.map((n) => old[n]);
    if (!prev.every((p) => p?.studied || p?.passed)) continue;
    const passed = prev.every((p) => p?.passed);
    out[lesson.id] = {
      studied: true, passed,
      bestScore: passed ? Math.min(...prev.map((p) => p!.bestScore)) : 0,
      attempts: passed ? 1 : 0,
    };
  }
  return out;
}

/** Controlla che un file importato sia davvero un backup di Ulpan. */
export function isBackup(raw: unknown): boolean {
  const r = obj(raw);
  return !!r && r.version === 1 && typeof r.xp === 'number' && !!obj(r.srs) && !!obj(r.settings);
}

/* ------------------------------------------------------------------ */
/* Dispositivo                                                          */
/* ------------------------------------------------------------------ */

let cachedDevice: string | null = null;

/** Identificativo casuale di questo dispositivo (per i contatori per dispositivo). */
export function deviceId(): string {
  if (cachedDevice) return cachedDevice;
  try {
    let id = localStorage.getItem('ulpan:device');
    if (!id) {
      id = Math.random().toString(36).slice(2, 12);
      localStorage.setItem('ulpan:device', id);
    }
    cachedDevice = id;
  } catch {
    cachedDevice = 'local';
  }
  return cachedDevice;
}

/** Aggiunge XP (ed eventualmente una risposta del giorno) ai contatori di un dispositivo. */
function addContrib(s: AppState, dev: string, xp: number, day?: string, correct?: boolean): Pick<AppState, 'contrib' | 'xp' | 'days'> {
  const c = s.contrib[dev] ?? { xp: 0, days: {} };
  const days = { ...c.days };
  if (day) {
    const d = days[day] ?? { answered: 0, correct: 0 };
    days[day] = { answered: d.answered + 1, correct: d.correct + (correct ? 1 : 0) };
  }
  const contrib = { ...s.contrib, [dev]: { xp: c.xp + xp, days } };
  return { contrib, ...totals(contrib) };
}

function load(key: string = storageKey): AppState {
  try {
    const raw = localStorage.getItem(key);
    return raw ? sanitize(JSON.parse(raw)) : initialState();
  } catch {
    return initialState();
  }
}

let state: AppState = typeof localStorage === 'undefined' ? initialState() : load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    /* archiviazione non disponibile: si continua in memoria */
  }
}

function set(next: AppState) {
  state = { ...next, updatedAt: Date.now() };
  persist();
  listeners.forEach((l) => l());
}

export function getState(): AppState {
  return state;
}

export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Stato completo dell'app (riferimento stabile finché non cambia). */
export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Passa ai progressi di un altro utente (null = ospite). */
export function switchUser(userId: string | null) {
  storageKey = storageKeyFor(userId);
  state = load();
  listeners.forEach((l) => l());
}

/** Sostituisce lo stato corrente (es. dopo una sincronizzazione). */
export function replaceState(next: AppState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

/** Legge i progressi salvati localmente per un utente, senza attivarli. */
export function readStored(userId: string | null): AppState {
  return load(storageKeyFor(userId));
}

export function hasProgress(s: AppState): boolean {
  return s.xp > 0 || Object.keys(s.srs).length > 0 || Object.keys(s.lessons).length > 0;
}

/**
 * Unisce due copie dei progressi (es. telefono e computer) senza perdere nulla:
 * per ogni elemento tiene il risultato migliore o più recente.
 */
export function mergeStates(a: AppState, b: AppState): AppState {
  // Un azzeramento successivo all'ultima modifica dell'altra copia vince
  if ((b.resetAt ?? 0) > (a.updatedAt ?? 0)) return b;
  if ((a.resetAt ?? 0) > (b.updatedAt ?? 0)) return a;
  const newerSettings = (b.settingsUpdatedAt ?? b.updatedAt ?? 0) > (a.settingsUpdatedAt ?? a.updatedAt ?? 0) ? b : a;

  const lessons: AppState['lessons'] = { ...a.lessons };
  for (const [k, l] of Object.entries(b.lessons)) {
    const p = lessons[Number(k)];
    lessons[Number(k)] = p ? {
      studied: p.studied || l.studied,
      passed: p.passed || l.passed,
      bestScore: Math.max(p.bestScore, l.bestScore),
      attempts: Math.max(p.attempts, l.attempts),
    } : l;
  }

  const exams: AppState['exams'] = { ...a.exams };
  for (const [k, e] of Object.entries(b.exams)) {
    const p = exams[k];
    if (!p) { exams[k] = e; continue; }
    const later = e.lastDate > p.lastDate ? e : p;
    const best = e.bestScore > p.bestScore ? e : e.bestScore < p.bestScore ? p
      : (e.bestTimeSec ?? Infinity) < (p.bestTimeSec ?? Infinity) ? e : p;
    exams[k] = {
      bestScore: best.bestScore, bestTimeSec: best.bestTimeSec,
      lastScore: later.lastScore, lastDate: later.lastDate,
      attempts: Math.max(p.attempts, e.attempts),
    };
  }

  const srs: AppState['srs'] = { ...a.srs };
  for (const [k, x] of Object.entries(b.srs)) {
    const p = srs[k];
    srs[k] = !p || x.seen > p.seen || (x.seen === p.seen && x.due > p.due) ? x : p;
  }

  // Contatori per dispositivo: ognuno cresce solo, quindi per ogni dispositivo si tiene il massimo
  const contrib: AppState['contrib'] = { ...a.contrib };
  for (const [dev, c] of Object.entries(b.contrib)) {
    const p = contrib[dev];
    if (!p) { contrib[dev] = c; continue; }
    const days = { ...p.days };
    for (const [k, d] of Object.entries(c.days)) {
      const q = days[k];
      days[k] = q ? { answered: Math.max(q.answered, d.answered), correct: Math.max(q.correct, d.correct) } : d;
    }
    contrib[dev] = { xp: Math.max(p.xp, c.xp), days };
  }

  const recent = (b.lastActive ?? '') > (a.lastActive ?? '') ? b
    : (a.lastActive ?? '') > (b.lastActive ?? '') ? a
    : b.streak > a.streak ? b : a;

  return {
    version: 1,
    curriculum: 3,
    settings: { ...newerSettings.settings },
    settingsUpdatedAt: Math.max(a.settingsUpdatedAt ?? 0, b.settingsUpdatedAt ?? 0) || undefined,
    lessons, exams, srs, contrib, ...totals(contrib),
    texts: { ...b.texts, ...a.texts },
    streak: recent.streak,
    lastActive: recent.lastActive,
    updatedAt: Math.max(a.updatedAt ?? 0, b.updatedAt ?? 0),
    resetAt: Math.max(a.resetAt ?? 0, b.resetAt ?? 0) || undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Azioni (pure: stato → stato, per poterle testare)                   */
/* ------------------------------------------------------------------ */

export function applyAnswer(
  s: AppState, itemIds: string[], correct: boolean, now: Date, dev: string = deviceId(), selfRated = false,
): AppState {
  const t = now.getTime();
  const today = dayKey(now);
  const srs = { ...s.srs };
  for (const id of itemIds) srs[id] = review(srs[id] ?? newSrsState(t), correct, t);

  let { streak } = s;
  if (s.lastActive !== today) streak = s.lastActive === yesterdayKey(now) ? streak + 1 : 1;

  // Autovalutazione (flashcard "lo sapevo"): aggiorna il ripasso ma non dà XP né punti in classifica
  if (selfRated) return { ...s, srs, streak, lastActive: today };
  return {
    ...s,
    srs,
    streak,
    lastActive: today,
    ...addContrib(s, dev, correct ? 10 : 0, today, correct),
  };
}

export function lessonItemIds(lessonId: number): string[] {
  const l = LESSON_BY_ID[lessonId];
  return [
    ...l.glyphs.map((g) => `g:${g}`),
    ...l.vowels.map((v) => `v:${v}`),
    // solo le parole di base: le altre restano nella "banca di lettura"
    ...coreWordsOfLesson(lessonId).map((w) => `w:${w.id}`),
  ];
}

/** Aggiunge al mazzo del ripasso gli elementi della lezione non ancora presenti. */
/** Nuove parole che entrano nel ripasso ogni giorno (le lettere e le vocali entrano subito). */
export const NEW_WORDS_PER_DAY = 15;

export function applyStudied(s: AppState, lessonId: number, now: Date): AppState {
  const srs = { ...s.srs };
  const t = now.getTime();
  // Le parole nuove vengono scaglionate: al massimo NEW_WORDS_PER_DAY al giorno,
  // per non trovarsi centinaia di ripassi dopo una lezione ricca di vocaboli.
  const pendingWords = Object.entries(srs).filter(([id, x]) => id.startsWith('w:') && x.seen === 0 && x.due > t).length;
  let n = pendingWords;
  for (const id of lessonItemIds(lessonId)) {
    if (srs[id]) continue;
    const delayDays = id.startsWith('w:') ? Math.floor(n++ / NEW_WORDS_PER_DAY) : 0;
    srs[id] = { ...newSrsState(t), due: t + delayDays * 24 * 60 * 60 * 1000 };
  }
  const prev = s.lessons[lessonId] ?? { studied: false, bestScore: 0, passed: false, attempts: 0 };
  return { ...s, srs, lessons: { ...s.lessons, [lessonId]: { ...prev, studied: true } } };
}

/**
 * Risultato del test d'ingresso: le lezioni superate risultano completate e i loro
 * elementi entrano nel ripasso con un intervallo iniziale già più lungo (3 giorni).
 */
export function applyPlacement(s: AppState, maxLesson: number, scores: Record<number, number>, now: Date): AppState {
  const t = now.getTime();
  const lessons = { ...s.lessons };
  const srs = { ...s.srs };
  for (let id = 1; id <= maxLesson; id++) {
    const prev = lessons[id] ?? { studied: false, bestScore: 0, passed: false, attempts: 0 };
    lessons[id] = { studied: true, passed: true, bestScore: Math.max(prev.bestScore, scores[id] ?? 80), attempts: prev.attempts + 1 };
    for (const item of lessonItemIds(id)) {
      srs[item] ??= { ...newSrsState(t), reps: 2, interval: 3, due: t + 3 * 24 * 60 * 60 * 1000 };
    }
  }
  return { ...s, lessons, srs };
}

export function applyLessonTest(s: AppState, lessonId: number, score: number, passThreshold: number): AppState {
  const prev = s.lessons[lessonId] ?? { studied: false, bestScore: 0, passed: false, attempts: 0 };
  return {
    ...s,
    ...addContrib(s, deviceId(), score >= passThreshold && !prev.passed ? 100 : 0),
    lessons: {
      ...s.lessons,
      [lessonId]: {
        ...prev,
        bestScore: Math.max(prev.bestScore, score),
        passed: prev.passed || score >= passThreshold,
        attempts: prev.attempts + 1,
      },
    },
  };
}

export function applyExam(s: AppState, examId: string, score: number, timeSec: number, now: Date): AppState {
  const prev = s.exams[examId];
  const best = Math.max(prev?.bestScore ?? 0, score);
  return {
    ...s,
    exams: {
      ...s.exams,
      [examId]: {
        bestScore: best,
        lastScore: score,
        attempts: (prev?.attempts ?? 0) + 1,
        lastDate: dayKey(now),
        bestTimeSec: score > (prev?.bestScore ?? -1)
          ? timeSec
          : score === prev?.bestScore ? Math.min(prev.bestTimeSec ?? Infinity, timeSec) : prev?.bestTimeSec,
      },
    },
  };
}

export function isLessonUnlocked(s: AppState, lessonId: number): boolean {
  if (s.settings.unlockAll || lessonId === 1 || s.lessons[lessonId]?.passed) return true;
  return !!s.lessons[lessonId - 1]?.passed;
}

/** Ultima lezione sbloccata: determina quali elementi sono "conosciuti". */
export function maxUnlockedLesson(s: AppState): number {
  if (s.settings.unlockAll) return LAST_LESSON;
  let n = 1;
  while (n < LAST_LESSON && s.lessons[n]?.passed) n++;
  return n;
}

/** L'elemento esiste ancora nei contenuti? (parole rinominate o rimosse restano orfane) */
export function isKnownItem(id: string): boolean {
  const key = id.slice(2);
  if (id.startsWith('g:')) return !!GLYPH_BY_ID[key];
  if (id.startsWith('v:')) return !!VOWEL_BY_ID[key];
  if (id.startsWith('w:')) return WORD_IDS.has(key);
  return false;
}

export function dueItems(s: AppState, now: number): string[] {
  return Object.entries(s.srs)
    .filter(([id, st]) => isDue(st, now) && isKnownItem(id))
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id);
}

/** Elementi più deboli (per il ripasso libero quando nulla è in scadenza). */
export function weakestItems(s: AppState, n: number): string[] {
  // prima gli elementi sbagliati almeno una volta, poi quelli meno consolidati
  return Object.entries(s.srs)
    .filter(([id, x]) => isKnownItem(id) && x.seen > 0)
    .sort((a, b) => {
      const ra = a[1].seen ? a[1].correct / a[1].seen : 0;
      const rb = b[1].seen ? b[1].correct / b[1].seen : 0;
      const ea = a[1].correct < a[1].seen ? 0 : 1;
      const eb = b[1].correct < b[1].seen ? 0 : 1;
      return ea - eb || ra - rb || a[1].interval - b[1].interval;
    })
    .slice(0, n)
    .map(([id]) => id);
}

/* ------------------------------------------------------------------ */
/* API usata dall'interfaccia                                          */
/* ------------------------------------------------------------------ */

export const actions = {
  answer(itemIds: string[], correct: boolean, opts: { selfRated?: boolean } = {}) {
    set(applyAnswer(state, itemIds, correct, new Date(), deviceId(), opts.selfRated));
  },
  placement(maxLesson: number, scores: Record<number, number>) {
    set(applyPlacement(state, maxLesson, scores, new Date()));
  },
  studied(lessonId: number) {
    set(applyStudied(state, lessonId, new Date()));
  },
  lessonTest(lessonId: number, score: number, pass: number) {
    let next = applyLessonTest(state, lessonId, score, pass);
    if (score >= pass) next = applyStudied(next, lessonId, new Date());
    set(next);
  },
  textRead(textId: string) {
    if (state.texts[textId]) return;
    set({ ...state, ...addContrib(state, deviceId(), 20), texts: { ...state.texts, [textId]: dayKey() } });
  },
  exam(examId: string, score: number, timeSec: number) {
    set(applyExam(state, examId, score, timeSec, new Date()));
  },
  settings(patch: Partial<Settings>) {
    set({ ...state, settings: { ...state.settings, ...patch }, settingsUpdatedAt: Date.now() });
  },
  reset() {
    set({ ...initialState(), settings: state.settings, resetAt: Date.now() });
  },
  exportJson(): string {
    return JSON.stringify(state, null, 2);
  },
  /** Sostituisce i progressi con un backup (lancia un errore se il file non è valido). */
  importJson(json: string) {
    if (json.length > 5_000_000) throw new Error('file troppo grande');
    const raw = JSON.parse(json);
    if (!isBackup(raw)) throw new Error('non è un backup di Ulpan');
    set({ ...sanitize(raw), resetAt: Date.now() });
  },
};
