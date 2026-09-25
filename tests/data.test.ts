import { describe, expect, it } from 'vitest';
import { GLYPHS, BASE_LETTERS, GLYPH_BY_ID, CONFUSABLES } from '../src/data/alphabet';
import { VOWELS } from '../src/data/nikud';
import { WORDS, SENTENCES } from '../src/data/words';
import { TEXTS } from '../src/data/texts';
import { LESSONS, lessonForText, textLevel, wordLesson, wordsOfLesson } from '../src/data/curriculum';
import { clusters, glyphOf, requirements } from '../src/lib/hebrew';

describe('alfabeto', () => {
  it('ha 22 lettere e 31 glifi con id unici', () => {
    expect(BASE_LETTERS).toHaveLength(22);
    expect(GLYPHS).toHaveLength(31);
    expect(new Set(GLYPHS.map((g) => g.id)).size).toBe(GLYPHS.length);
  });

  it('ogni glifo viene riconosciuto dal parser', () => {
    for (const g of GLYPHS) {
      const [c] = clusters(g.char);
      expect(glyphOf(c)).toBe(g.id);
    }
  });

  it('forme finali coerenti', () => {
    for (const g of GLYPHS) {
      if (g.finalForm) expect(GLYPH_BY_ID[g.finalForm].finalOf).toBeDefined();
      if (g.finalOf) expect(GLYPH_BY_ID[g.finalOf]).toBeDefined();
    }
  });

  it('le lettere simili esistono', () => {
    for (const [k, v] of Object.entries(CONFUSABLES)) {
      expect(GLYPH_BY_ID[k]).toBeDefined();
      for (const id of v) expect(GLYPH_BY_ID[id]).toBeDefined();
    }
  });
});

describe('curriculum', () => {
  it('ogni glifo e ogni vocale sono introdotti in una lezione', () => {
    const glyphs = LESSONS.flatMap((l) => l.glyphs);
    const vowels = LESSONS.flatMap((l) => l.vowels);
    expect(new Set(glyphs)).toEqual(new Set(GLYPHS.map((g) => g.id)));
    expect(new Set(vowels)).toEqual(new Set(VOWELS.map((v) => v.id)));
  });

  it('gli esempi di teoria sono leggibili entro la loro lezione (tranne kamatz katan)', () => {
    for (const l of LESSONS) {
      for (const b of l.theory) {
        if (b.type === 'example') expect(lessonForText(b.he), `${b.he} in lezione ${l.id}`).toBeLessThanOrEqual(l.id);
      }
    }
  });
});

describe('vocabolario', () => {
  it('id unici', () => {
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(WORDS.length);
    expect(new Set(WORDS.map((w) => w.he)).size).toBe(WORDS.length);
  });

  it('ogni parola è vocalizzata e usa solo lettere/vocali note', () => {
    for (const w of [...WORDS, ...SENTENCES]) {
      const req = requirements(w.he);
      expect(req.glyphs.size, w.he).toBeGreaterThan(0);
      expect(req.vowels.size, `${w.he} senza nikud`).toBeGreaterThan(0);
      expect(Number.isFinite(lessonForText(w.he)), w.he).toBe(true);
    }
  });

  it('ogni lettera ha almeno una lettera per parola', () => {
    for (const w of WORDS) {
      for (const c of clusters(w.he)) expect(glyphOf(c), `${w.he}`).toBeDefined();
    }
  });

  it('dal livello 3 ogni lezione con lettere nuove ha parole da leggere', () => {
    for (const l of LESSONS.filter((x) => x.id >= 3 && x.glyphs.length)) {
      expect(wordsOfLesson(l.id).length, `lezione ${l.id}`).toBeGreaterThan(0);
    }
  });

  it('assegna le lezioni corrette ad alcune parole note', () => {
    const find = (t: string) => WORDS.find((w) => w.translit === t)!;
    expect(wordLesson(find('aba'))).toBe(1);
    expect(wordLesson(find('shabat'))).toBe(2);
    expect(wordLesson(find('shalom'))).toBe(4);
    expect(wordLesson(find('sus'))).toBe(6);
    expect(wordLesson(find('kafe'))).toBe(9);
  });
});

describe('testi di lettura', () => {
  it('id unici, righe vocalizzate e livello calcolabile', () => {
    expect(new Set(TEXTS.map((t) => t.id)).size).toBe(TEXTS.length);
    for (const t of TEXTS) {
      expect(t.lines.length).toBeGreaterThan(0);
      for (const l of t.lines) {
        const req = requirements(l.he);
        expect(req.vowels.size, l.he).toBeGreaterThan(0);
        for (const c of clusters(l.he)) expect(glyphOf(c), l.he).toBeDefined();
        expect(l.translit.length && l.it.length).toBeTruthy();
      }
      expect(Number.isFinite(textLevel(t)), t.id).toBe(true);
    }
  });
});

describe('frasi', () => {
  it('id e testi unici, più di 200 frasi', () => {
    expect(SENTENCES.length).toBeGreaterThanOrEqual(200);
    expect(new Set(SENTENCES.map((s) => s.id)).size).toBe(SENTENCES.length);
    expect(new Set(SENTENCES.map((s) => s.he)).size).toBe(SENTENCES.length);
  });

  it('vocabolario ampio: almeno 1000 parole', () => {
    expect(WORDS.length).toBeGreaterThanOrEqual(1000);
  });
});
