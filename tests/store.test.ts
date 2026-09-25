import { describe, expect, it } from 'vitest';
import {
  initialState, applyAnswer, applyLessonTest, applyStudied, applyExam, isLessonUnlocked,
  maxUnlockedLesson, dueItems, lessonItemIds,
} from '../src/lib/store';
import { review, newSrsState, mastery } from '../src/lib/srs';

const d = (s: string) => new Date(`${s}T12:00:00`);

describe('srs', () => {
  it('intervalli crescenti e reset su errore', () => {
    const t = Date.now();
    const DAY = 86400000;
    let s = newSrsState(t);
    s = review(s, true, t); expect(s.interval).toBe(1);
    s = review(s, true, t + DAY); expect(s.interval).toBe(3);
    s = review(s, true, t + 4 * DAY); expect(s.interval).toBeGreaterThan(3);
    expect(mastery(s)).toBe(2);
    s = review(s, false, t);
    expect(s.interval).toBe(0);
    expect(s.lapses).toBe(1);
    expect(s.ease).toBeLessThan(2.6);
  });
});

describe('store', () => {
  it('streak: giorni consecutivi e interruzione', () => {
    let s = initialState();
    s = applyAnswer(s, ['g:bet'], true, d('2026-01-01'));
    expect(s.streak).toBe(1);
    s = applyAnswer(s, ['g:bet'], true, d('2026-01-01'));
    expect(s.streak).toBe(1);
    s = applyAnswer(s, ['g:bet'], false, d('2026-01-02'));
    expect(s.streak).toBe(2);
    s = applyAnswer(s, ['g:bet'], true, d('2026-01-05'));
    expect(s.streak).toBe(1);
    expect(s.days['2026-01-02']).toEqual({ answered: 1, correct: 0 });
    expect(s.xp).toBe(32);
  });

  it('sblocco lezioni', () => {
    let s = initialState();
    expect(isLessonUnlocked(s, 1)).toBe(true);
    expect(isLessonUnlocked(s, 2)).toBe(false);
    s = applyLessonTest(s, 1, 70, 80);
    expect(isLessonUnlocked(s, 2)).toBe(false);
    s = applyLessonTest(s, 1, 85, 80);
    expect(isLessonUnlocked(s, 2)).toBe(true);
    expect(maxUnlockedLesson(s)).toBe(2);
    s = applyLessonTest(s, 1, 60, 80);
    expect(s.lessons[1]).toMatchObject({ passed: true, bestScore: 85, attempts: 3 });
  });

  it('studiare una lezione aggiunge gli elementi al ripasso', () => {
    const now = d('2026-01-01');
    const s = applyStudied(initialState(), 1, now);
    const ids = lessonItemIds(1);
    expect(ids).toContain('g:bet');
    expect(ids).toContain('v:kamatz');
    expect(dueItems(s, now.getTime()).sort()).toEqual([...ids].sort());
  });

  it('esami: miglior punteggio', () => {
    let s = applyExam(initialState(), 'finale', 70, 600, d('2026-01-01'));
    s = applyExam(s, 'finale', 90, 700, d('2026-01-02'));
    s = applyExam(s, 'finale', 50, 300, d('2026-01-03'));
    expect(s.exams.finale).toMatchObject({ bestScore: 90, lastScore: 50, attempts: 3, bestTimeSec: 700 });
  });
});

describe('sincronizzazione', () => {
  it('unisce due dispositivi tenendo il meglio di ciascuno', async () => {
    const { mergeStates } = await import('../src/lib/store');
    let a = applyLessonTest(initialState(), 1, 90, 80);
    a = applyAnswer(a, ['g:bet'], true, d('2026-01-01'));
    a = { ...a, updatedAt: 100 };
    let b = applyLessonTest(initialState(), 2, 85, 80);
    b = applyAnswer(b, ['g:bet'], true, d('2026-01-02'));
    b = applyAnswer(b, ['g:bet'], true, d('2026-01-02'));
    b = applyExam(b, 'finale', 70, 500, d('2026-01-02'));
    b = { ...b, updatedAt: 200, settings: { ...b.settings, theme: 'dark' } };
    const m = mergeStates(a, b);
    expect(m.lessons[1].passed && m.lessons[2].passed).toBe(true);
    expect(m.srs['g:bet'].seen).toBe(2);
    expect(m.days['2026-01-01'].answered).toBe(1);
    expect(m.days['2026-01-02'].answered).toBe(2);
    expect(m.exams.finale.bestScore).toBe(70);
    expect(m.settings.theme).toBe('dark');
    expect(m.lastActive).toBe('2026-01-02');
    expect(mergeStates(b, a)).toMatchObject({ lessons: m.lessons, xp: m.xp });
  });

  it('un azzeramento non viene annullato da una copia più vecchia', async () => {
    const { mergeStates } = await import('../src/lib/store');
    const old = { ...applyLessonTest(initialState(), 1, 90, 80), updatedAt: 100 };
    const reset = { ...initialState(), updatedAt: 300, resetAt: 300 };
    expect(mergeStates(old, reset).lessons).toEqual({});
    expect(mergeStates(reset, old).lessons).toEqual({});
    const later = { ...applyLessonTest(initialState(), 3, 90, 80), updatedAt: 400 };
    expect(mergeStates(reset, later).lessons[3].passed).toBe(true);
  });
});

describe('punti deboli', () => {
  it('il ripasso libero mette prima gli elementi sbagliati', async () => {
    const { weakestItems } = await import('../src/lib/store');
    let s = initialState();
    for (let i = 0; i < 3; i++) s = applyAnswer(s, ['g:bet'], true, d('2026-01-01'));
    s = applyAnswer(s, ['g:chet'], true, d('2026-01-01'));
    s = applyAnswer(s, ['g:chet'], false, d('2026-01-01'));
    expect(weakestItems(s, 1)).toEqual(['g:chet']);
  });
});

describe('fase 1: ripasso e sincronizzazione', () => {
  it('più risposte giuste nello stesso giorno non gonfiano l’intervallo', () => {
    const t = Date.now();
    let s = newSrsState(t);
    for (let i = 0; i < 5; i++) s = review(s, true, t + i * 60000);
    expect(s.interval).toBe(1);
    expect(s.seen).toBe(5);
    expect(s.correct).toBe(5);
    expect(mastery(s)).toBe(1);
  });

  it('un errore riporta sempre in ripasso, anche prima della scadenza', () => {
    const t = Date.now();
    let s = review(newSrsState(t), true, t);
    s = review(s, false, t + 1000);
    expect(s.interval).toBe(0);
    expect(s.due).toBeLessThan(t + 3600000);
  });

  it('le parole nuove di una lezione vengono scaglionate', () => {
    const now = d('2026-01-01');
    const s = applyStudied(initialState(), 7, now);
    const due = dueItems(s, now.getTime());
    const newWordsDue = due.filter((id) => id.startsWith('w:'));
    expect(newWordsDue.length).toBeLessThanOrEqual(15);
    expect(due.filter((id) => id.startsWith('g:')).length).toBeGreaterThan(0);
  });

  it('due dispositivi nello stesso giorno: le risposte si sommano', async () => {
    const { mergeStates } = await import('../src/lib/store');
    const a = applyAnswer(applyAnswer(initialState(), ['g:bet'], true, d('2026-01-01'), 'tel'), ['g:bet'], true, d('2026-01-01'), 'tel');
    const b = applyAnswer(initialState(), ['g:mem'], true, d('2026-01-01'), 'pc');
    const m = mergeStates(a, b);
    expect(m.days['2026-01-01']).toEqual({ answered: 3, correct: 3 });
    expect(m.xp).toBe(30);
    // unire di nuovo non cambia nulla (idempotente)
    expect(mergeStates(m, a).xp).toBe(30);
    expect(mergeStates(m, m).days).toEqual(m.days);
  });

  it('elementi orfani esclusi dal ripasso', () => {
    let s = initialState();
    s = { ...s, srs: { 'w:parola-inesistente': newSrsState(0), 'g:bet': newSrsState(0) } };
    expect(dueItems(s, Date.now())).toEqual(['g:bet']);
  });
});

describe('fase 1: validazione dei dati', () => {
  it('scarta tipi sbagliati e chiavi pericolose', async () => {
    const { sanitize, isBackup } = await import('../src/lib/store');
    const s = sanitize(JSON.parse('{"version":1,"xp":"5","srs":{"__proto__":{"seen":1},"g:bet":{"seen":"x","due":5}},"days":{"2026-01-01":{"answered":3,"correct":2},"bad":{}},"settings":{"theme":"rosa","dailyGoal":20}}'));
    expect(s.xp).toBe(0);
    expect(Object.keys(s.srs)).toEqual(['g:bet']);
    expect(s.srs['g:bet'].seen).toBe(0);
    expect(s.days).toEqual({ '2026-01-01': { answered: 3, correct: 2 } });
    expect(s.settings.theme).toBe('system');
    expect(s.settings.dailyGoal).toBe(20);
    expect(isBackup([])).toBe(false);
    expect(isBackup({ name: 'package' })).toBe(false);
    expect(isBackup({ version: 1, xp: 0, srs: {}, settings: {} })).toBe(true);
  });

  it('i vecchi dati senza contatori per dispositivo vengono conservati', async () => {
    const { sanitize } = await import('../src/lib/store');
    const s = sanitize({ version: 1, xp: 120, days: { '2026-01-01': { answered: 5, correct: 4 } }, srs: {}, settings: {} });
    expect(s.xp).toBe(120);
    expect(s.days['2026-01-01']).toEqual({ answered: 5, correct: 4 });
  });
});
