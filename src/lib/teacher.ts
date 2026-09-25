import { dayKey, sanitize, type AppState } from './store';
import type { SrsState } from './srs';
import { mastery } from './srs';
import { GLYPH_BY_ID } from '../data/alphabet';
import { VOWEL_BY_ID } from '../data/nikud';
import { WORDS } from '../data/words';
import { LESSONS } from '../data/curriculum';
import { vowelDisplay } from './quiz';

export interface StudentRow {
  user_id: string;
  display_name: string;
  role: 'student' | 'teacher';
  joined_at: string;
  progress: Partial<AppState>;
}

export interface Assignment {
  id: string;
  group_id: string;
  lesson_id: number;
  note: string;
  due_date: string | null;
  created_at: string;
  groups?: { name: string } | null;
}

export interface WeakItem {
  id: string;
  label: string;
  hebrew: string;
  accuracy: number;
  seen: number;
}

export interface StudentSummary {
  lessonsPassed: number;
  lessonScores: Record<number, number>;
  examScores: Record<string, number>;
  lastActive: string | null;
  activeDays7: number;
  answers7: number;
  accuracy7: number | null;
  xp: number;
  mastered: number;
  weak: WeakItem[];
  activity14: { day: string; answered: number }[];
}

function daysAgo(today: Date, n: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

/** Etichetta leggibile di un elemento del ripasso ("g:bet", "v:kamatz", "w:shalom"). */
export function itemLabel(id: string): { label: string; hebrew: string } {
  const [t, k] = [id[0], id.slice(2)];
  if (t === 'g' && GLYPH_BY_ID[k]) return { label: GLYPH_BY_ID[k].name, hebrew: GLYPH_BY_ID[k].char };
  if (t === 'v' && VOWEL_BY_ID[k]) return { label: VOWEL_BY_ID[k].name, hebrew: vowelDisplay(VOWEL_BY_ID[k]) };
  const w = WORDS.find((x) => x.id === k);
  if (t === 'w' && w) return { label: `${w.translit} (${w.it})`, hebrew: w.he };
  return { label: k, hebrew: '' };
}

function weakItems(srs: Record<string, SrsState>, n: number): WeakItem[] {
  return Object.entries(srs)
    .filter(([, s]) => s.seen >= 3 && s.correct / s.seen < 0.8)
    .map(([id, s]) => ({ id, ...itemLabel(id), accuracy: s.correct / s.seen, seen: s.seen }))
    .sort((a, b) => a.accuracy - b.accuracy || b.seen - a.seen)
    .slice(0, n);
}

export function summarize(progress: Partial<AppState>, today: Date = new Date()): StudentSummary {
  const s = sanitize(progress);
  let answers7 = 0;
  let correct7 = 0;
  let activeDays7 = 0;
  for (let i = 0; i < 7; i++) {
    const d = s.days[daysAgo(today, i)];
    if (d?.answered) { activeDays7++; answers7 += d.answered; correct7 += d.correct; }
  }
  const activity14 = [...Array(14).keys()].reverse().map((i) => {
    const day = daysAgo(today, i);
    return { day, answered: s.days[day]?.answered ?? 0 };
  });
  return {
    lessonsPassed: Object.values(s.lessons).filter((l) => l.passed).length,
    lessonScores: Object.fromEntries(Object.entries(s.lessons).filter(([, l]) => l.attempts > 0).map(([k, l]) => [Number(k), l.bestScore])),
    examScores: Object.fromEntries(Object.entries(s.exams).map(([k, e]) => [k, e.bestScore])),
    lastActive: s.lastActive,
    activeDays7,
    answers7,
    accuracy7: answers7 ? correct7 / answers7 : null,
    xp: s.xp,
    mastered: Object.values(s.srs).filter((x) => mastery(x) >= 2).length,
    weak: weakItems(s.srs, 6),
    activity14,
  };
}

/** Elementi su cui sbagliano più studenti della classe. */
export function classWeakItems(students: StudentRow[], n = 8): (WeakItem & { students: number })[] {
  const agg = new Map<string, { students: number; seen: number; correct: number }>();
  for (const st of students) {
    const srs = sanitize(st.progress).srs;
    for (const [id, x] of Object.entries(srs)) {
      if (x.seen < 3 || x.correct / x.seen >= 0.8) continue;
      const a = agg.get(id) ?? { students: 0, seen: 0, correct: 0 };
      a.students++; a.seen += x.seen; a.correct += x.correct;
      agg.set(id, a);
    }
  }
  return [...agg.entries()]
    .map(([id, a]) => ({ id, ...itemLabel(id), students: a.students, seen: a.seen, accuracy: a.correct / a.seen }))
    .sort((a, b) => b.students - a.students || a.accuracy - b.accuracy)
    .slice(0, n);
}

export type AssignmentStatus = 'fatto' | 'in ritardo' | 'da fare';

export function assignmentStatus(a: Pick<Assignment, 'lesson_id' | 'due_date'>, lessons: AppState['lessons'], today: Date = new Date()): AssignmentStatus {
  if (lessons[a.lesson_id]?.passed) return 'fatto';
  if (a.due_date && a.due_date < dayKey(today)) return 'in ritardo';
  return 'da fare';
}

export function lessonTitle(id: number): string {
  const l = LESSONS.find((x) => x.id === id);
  return l ? `Lezione ${l.id}: ${l.title}` : `Lezione ${id}`;
}

function csvCell(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Esporta i risultati della classe in CSV (separatore ";" per Excel in italiano). */
export function classCsv(students: StudentRow[], assignments: Assignment[], today: Date = new Date()): string {
  const header = [
    'Studente', 'Lezioni superate', 'XP', 'Ultima attività', 'Giorni attivi (7 gg)', 'Risposte (7 gg)', 'Precisione (7 gg)',
    'Elementi consolidati', ...LESSONS.map((l) => `Lezione ${l.id} (%)`), ...assignments.map((a) => `Compito: lezione ${a.lesson_id}${a.due_date ? ` entro ${a.due_date}` : ''}`),
    'Punti deboli',
  ];
  const rows = students.filter((s) => s.role === 'student').map((st) => {
    const sum = summarize(st.progress, today);
    const lessons = sanitize(st.progress).lessons;
    return [
      st.display_name, sum.lessonsPassed, sum.xp, sum.lastActive ?? '', sum.activeDays7, sum.answers7,
      sum.accuracy7 === null ? '' : `${Math.round(sum.accuracy7 * 100)}%`, sum.mastered,
      ...LESSONS.map((l) => sum.lessonScores[l.id] ?? ''),
      ...assignments.map((a) => assignmentStatus(a, lessons, today)),
      sum.weak.map((w) => w.label).join(', '),
    ];
  });
  return '﻿' + [header, ...rows].map((r) => r.map(csvCell).join(';')).join('\n');
}
