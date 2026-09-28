import { describe, expect, it } from 'vitest';
import { buildHebrewTyping, gradeHebrew, seededRng } from '../src/lib/quiz';

describe('scrivere in ebraico', () => {
  it('valuta esatto, forma finale sbagliata e sbagliato', () => {
    expect(gradeHebrew('שלום', 'שלום')).toBe('exact');
    expect(gradeHebrew('שלומ', 'שלום')).toBe('close');
    expect(gradeHebrew('סלום', 'שלום')).toBe('wrong');
    expect(gradeHebrew('', 'שלום')).toBe('wrong');
  });
  it('propone parole leggibili e brevi, con risposta senza vocali', () => {
    const qs = buildHebrewTyping(10, 10, seededRng(2));
    expect(qs).toHaveLength(10);
    for (const q of qs) {
      expect(q.keyboard).toBe(true);
      expect(q.answer).toMatch(/^[א-ת]{2,6}$/);
    }
  });
});
