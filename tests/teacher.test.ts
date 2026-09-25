import { describe, expect, it } from 'vitest';
import { summarize, classWeakItems, assignmentStatus, classCsv, itemLabel, type StudentRow } from '../src/lib/teacher';
import { applyAnswer, applyLessonTest, initialState, type AppState } from '../src/lib/store';

const d = (s: string) => new Date(`${s}T12:00:00`);
const today = d('2026-09-25');

function student(name: string, build: (s: AppState) => AppState): StudentRow {
  return { user_id: name, display_name: name, role: 'student', joined_at: '2026-09-01', progress: build(initialState()) };
}

const anna = student('Anna', (s) => {
  s = applyLessonTest(s, 1, 95, 80);
  s = applyLessonTest(s, 2, 70, 80);
  for (let i = 0; i < 4; i++) s = applyAnswer(s, ['g:chet'], i === 0, d('2026-09-24'));
  s = applyAnswer(s, ['g:bet'], true, d('2026-09-25'));
  return s;
});
const ben = student('Ben', (s) => {
  for (let i = 0; i < 3; i++) s = applyAnswer(s, ['g:chet'], false, d('2026-09-10'));
  return s;
});

describe('pannello insegnante', () => {
  it('riassume i progressi di uno studente', () => {
    const s = summarize(anna.progress, today);
    expect(s.lessonsPassed).toBe(1);
    expect(s.lessonScores).toEqual({ 1: 95, 2: 70 });
    expect(s.activeDays7).toBe(2);
    expect(s.answers7).toBe(5);
    expect(s.accuracy7).toBeCloseTo(2 / 5);
    expect(s.weak.map((w) => w.id)).toEqual(['g:chet']);
    expect(s.activity14).toHaveLength(14);
  });

  it('studente senza progressi', () => {
    const s = summarize({}, today);
    expect(s).toMatchObject({ lessonsPassed: 0, answers7: 0, accuracy7: null, weak: [] });
  });

  it('punti deboli della classe', () => {
    const w = classWeakItems([anna, ben]);
    expect(w[0]).toMatchObject({ id: 'g:chet', students: 2, hebrew: 'ח' });
  });

  it('stato dei compiti', () => {
    const lessons = (anna.progress as AppState).lessons;
    expect(assignmentStatus({ lesson_id: 1, due_date: '2026-09-20' }, lessons, today)).toBe('fatto');
    expect(assignmentStatus({ lesson_id: 2, due_date: '2026-09-20' }, lessons, today)).toBe('in ritardo');
    expect(assignmentStatus({ lesson_id: 2, due_date: '2026-09-30' }, lessons, today)).toBe('da fare');
    expect(assignmentStatus({ lesson_id: 3, due_date: null }, lessons, today)).toBe('da fare');
  });

  it('CSV per Excel', () => {
    const csv = classCsv([anna, ben, { ...ben, user_id: 't', display_name: 'Prof', role: 'teacher' }],
      [{ id: 'a', group_id: 'g', lesson_id: 1, note: '', due_date: '2026-09-30', created_at: '' }], today);
    const lines = csv.replace('﻿', '').split('\n');
    expect(lines).toHaveLength(3); // intestazione + 2 studenti, l'insegnante escluso
    expect(lines[0].split(';')[0]).toBe('Studente');
    expect(lines[1]).toContain('Anna;1;');
    expect(lines[1]).toContain('fatto');
  });

  it('etichette leggibili', () => {
    expect(itemLabel('g:shin')).toEqual({ label: 'Shin', hebrew: 'שׁ' });
    expect(itemLabel('w:shalom').label).toContain('shalom');
  });
});
