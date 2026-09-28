import { describe, expect, it } from 'vitest';
import { glossWord, lineTokens } from '../src/lib/gloss';

describe('parole nei testi', () => {
  it('trova la parola nel vocabolario, anche con punteggiatura', () => {
    expect(glossWord('שָׁלוֹם!').word?.translit).toBe('shalom');
  });
  it('stacca un prefisso', () => {
    const g = glossWord('הַכֶּלֶב');
    expect(g.word?.translit).toBe('kelev');
    expect(g.prefix?.it).toContain('il');
  });
  it('abbina la traslitterazione quando le parole corrispondono', () => {
    const t = lineTokens('אֲנִי יֶלֶד.', 'Ani yeled.');
    expect(t.map((x) => x.translit)).toEqual(['Ani', 'yeled']);
  });
});
