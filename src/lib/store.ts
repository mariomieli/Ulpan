import { useSyncExternalStore } from 'react';
import { newSrsState, review, isDue, type SrsState } from './srs';
import { LESSON_BY_ID, wordsOfLesson, LAST_LESSON } from '../data/curriculum';

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

export interface AppState {
  version: 1;
  settings: Settings;
  lessons: Record<number, LessonProgress>;
  exams: Record<string, ExamResult>;
  srs: Record<string, SrsState>;
  xp: number;
  streak: number;
  lastActive: string | null;
  days: Record<string, DayStats>;
}

const STORAGE_KEY = 'ulpan:v1';

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
    version: 1, settings: { ...DEFAULT_SETTINGS }, lessons: {}, exams: {}, srs: {},
    xp: 0, streak: 0, lastActive: null, days: {},
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

function sanitize(raw: unknown): AppState {
  const base = initialState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppState>;
  return {
    ...base,
    ...r,
    version: 1,
    settings: { ...DEFAULT_SETTINGS, ...(r.settings ?? {}) },
    lessons: r.lessons ?? {},
    exams: r.exams ?? {},
    srs: r.srs ?? {},
    days: r.days ?? {},
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : initialState();
  } catch {
    return initialState();
  }
}

let state: AppState = typeof localStorage === 'undefined' ? initialState() : load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* archiviazione non disponibile: si continua in memoria */
  }
}

function set(next: AppState) {
  state = next;
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

/* ------------------------------------------------------------------ */
/* Azioni (pure: stato → stato, per poterle testare)                   */
/* ------------------------------------------------------------------ */

export function applyAnswer(s: AppState, itemIds: string[], correct: boolean, now: Date): AppState {
  const t = now.getTime();
  const today = dayKey(now);
  const srs = { ...s.srs };
  for (const id of itemIds) srs[id] = review(srs[id] ?? newSrsState(t), correct, t);

  let { streak } = s;
  if (s.lastActive !== today) streak = s.lastActive === yesterdayKey(now) ? streak + 1 : 1;

  const d = s.days[today] ?? { answered: 0, correct: 0 };
  return {
    ...s,
    srs,
    streak,
    lastActive: today,
    xp: s.xp + (correct ? 10 : 2),
    days: { ...s.days, [today]: { answered: d.answered + 1, correct: d.correct + (correct ? 1 : 0) } },
  };
}

export function lessonItemIds(lessonId: number): string[] {
  const l = LESSON_BY_ID[lessonId];
  return [
    ...l.glyphs.map((g) => `g:${g}`),
    ...l.vowels.map((v) => `v:${v}`),
    ...wordsOfLesson(lessonId).map((w) => `w:${w.id}`),
  ];
}

/** Aggiunge al mazzo del ripasso gli elementi della lezione non ancora presenti. */
export function applyStudied(s: AppState, lessonId: number, now: Date): AppState {
  const srs = { ...s.srs };
  for (const id of lessonItemIds(lessonId)) srs[id] ??= newSrsState(now.getTime());
  const prev = s.lessons[lessonId] ?? { studied: false, bestScore: 0, passed: false, attempts: 0 };
  return { ...s, srs, lessons: { ...s.lessons, [lessonId]: { ...prev, studied: true } } };
}

export function applyLessonTest(s: AppState, lessonId: number, score: number, passThreshold: number): AppState {
  const prev = s.lessons[lessonId] ?? { studied: false, bestScore: 0, passed: false, attempts: 0 };
  return {
    ...s,
    xp: s.xp + (score >= passThreshold && !prev.passed ? 100 : 0),
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
  if (s.settings.unlockAll || lessonId === 1) return true;
  return !!s.lessons[lessonId - 1]?.passed;
}

/** Ultima lezione sbloccata: determina quali elementi sono "conosciuti". */
export function maxUnlockedLesson(s: AppState): number {
  if (s.settings.unlockAll) return LAST_LESSON;
  let n = 1;
  while (n < LAST_LESSON && s.lessons[n]?.passed) n++;
  return n;
}

export function dueItems(s: AppState, now: number): string[] {
  return Object.entries(s.srs)
    .filter(([, st]) => isDue(st, now))
    .sort((a, b) => a[1].due - b[1].due)
    .map(([id]) => id);
}

/** Elementi più deboli (per il ripasso libero quando nulla è in scadenza). */
export function weakestItems(s: AppState, n: number): string[] {
  return Object.entries(s.srs)
    .sort((a, b) => {
      const ra = a[1].seen ? a[1].correct / a[1].seen : 0;
      const rb = b[1].seen ? b[1].correct / b[1].seen : 0;
      return ra - rb || a[1].interval - b[1].interval;
    })
    .slice(0, n)
    .map(([id]) => id);
}

/* ------------------------------------------------------------------ */
/* API usata dall'interfaccia                                          */
/* ------------------------------------------------------------------ */

export const actions = {
  answer(itemIds: string[], correct: boolean) {
    set(applyAnswer(state, itemIds, correct, new Date()));
  },
  studied(lessonId: number) {
    set(applyStudied(state, lessonId, new Date()));
  },
  lessonTest(lessonId: number, score: number, pass: number) {
    let next = applyLessonTest(state, lessonId, score, pass);
    if (score >= pass) next = applyStudied(next, lessonId, new Date());
    set(next);
  },
  exam(examId: string, score: number, timeSec: number) {
    set(applyExam(state, examId, score, timeSec, new Date()));
  },
  settings(patch: Partial<Settings>) {
    set({ ...state, settings: { ...state.settings, ...patch } });
  },
  reset() {
    set({ ...initialState(), settings: state.settings });
  },
  exportJson(): string {
    return JSON.stringify(state, null, 2);
  },
  importJson(json: string) {
    set(sanitize(JSON.parse(json)));
  },
};
