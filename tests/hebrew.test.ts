import { describe, expect, it } from 'vitest';
import { requirements, stripNikud, normalizeTranslit, translitMatches } from '../src/lib/hebrew';

describe('parser', () => {
  it('distingue dagesh e punti', () => {
    expect([...requirements('בָּב').glyphs].sort()).toEqual(['bet', 'vet']);
    expect([...requirements('שׁשׂ').glyphs].sort()).toEqual(['shin', 'sin']);
    expect([...requirements('כֶּלֶב').glyphs].sort()).toEqual(['bet', 'kaf', 'lamed'].map((x) => x === 'bet' ? 'vet' : x).sort());
  });

  it('riconosce shuruk e cholam', () => {
    expect(requirements('סוּס').vowels.has('shuruk')).toBe(true);
    expect(requirements('שָׁלוֹם').vowels.has('holam')).toBe(true);
  });

  it('rimuove il nikud', () => {
    expect(stripNikud('שָׁלוֹם')).toBe('שלום');
  });
});

describe('traslitterazione', () => {
  it('normalizza varianti comuni', () => {
    expect(normalizeTranslit('Shabbat')).toBe(normalizeTranslit('shabat'));
    expect(normalizeTranslit('lekhem')).toBe(normalizeTranslit('lechem'));
    expect(normalizeTranslit('Todah')).toBe('toda');
    expect(normalizeTranslit('etz')).toBe('ets');
  });

  it('confronta con le risposte accettate', () => {
    expect(translitMatches('  Ima ', ['ima'])).toBe(true);
    expect(translitMatches('aba', ['ima'])).toBe(false);
    expect(translitMatches('', ['ima'])).toBe(false);
  });
});
