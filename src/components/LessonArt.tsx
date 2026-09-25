import { GLYPH_BY_ID } from '../data/alphabet';
import { VOWEL_BY_ID } from '../data/nikud';
import type { Lesson } from '../data/curriculum';
import { vowelDisplay } from '../lib/quiz';

export type LessonKind = 'vowels' | 'letters' | 'rules';

/** Glifo simbolo delle lezioni di sole regole. */
const RULE_GLYPHS: Record<number, string> = { 16: 'בּ', 17: 'בְ', 18: 'חַ', 19: 'ספר' };

export function lessonKind(l: Lesson): LessonKind {
  if (l.glyphs.length && l.glyphs.some((g) => g !== 'alef')) return 'letters';
  if (l.vowels.length) return 'vowels';
  return 'rules';
}

/** Le lettere (o i segni) che rappresentano una lezione. */
export function lessonGlyphText(l: Lesson): string {
  const kind = lessonKind(l);
  if (kind === 'letters') {
    return l.glyphs.map((g) => GLYPH_BY_ID[g]).filter((g) => !g.finalOf).slice(0, 2).map((g) => g.char).join('');
  }
  if (kind === 'vowels') return l.vowels.slice(0, 2).map((v) => vowelDisplay(VOWEL_BY_ID[v])).join('');
  return RULE_GLYPHS[l.id] ?? 'א';
}

/**
 * Copertina di una lezione: le sue lettere in grande su un fondo del colore dell'unità
 * (vocali oro, lettere tekhelet, regole verde).
 */
export function LessonCover({ lesson, size = 'sm', done = false }: { lesson: Lesson; size?: 'sm' | 'md' | 'lg'; done?: boolean }) {
  const text = lessonGlyphText(lesson);
  return (
    <div className={`cover cover-${size} cover-${lessonKind(lesson)} ${done ? 'cover-done' : ''}`} aria-hidden="true">
      <span className="cover-glyph" lang="he" data-len={Math.min(3, [...text.replace(/[֑-ׇ]/g, '')].length)}>{text}</span>
    </div>
  );
}

/**
 * Piccola illustrazione per gli stati vuoti e il benvenuto: tessere-lettera sovrapposte.
 */
export function LetterArt({ letters = 'אבג', label }: { letters?: string; label?: string }) {
  return (
    <div className="letter-art" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {[...letters].slice(0, 3).map((c, i) => <span key={i} className={`la-tile la-${i}`} lang="he">{c}</span>)}
    </div>
  );
}
