import { useEffect, useState } from 'react';
import { GLYPH_BY_ID } from '../data/alphabet';
import { VOWEL_BY_ID } from '../data/nikud';
import { WORDS } from '../data/words';
import { vowelDisplay } from '../lib/quiz';
import { actions, useAppState } from '../lib/store';
import { speak } from '../lib/speech';
import { confetti, feedback, reducedMotion } from '../lib/fx';
import { Icon } from './Icon';

const XP_CARD = 5;
const WORD_BY_ID = Object.fromEntries(WORDS.map((w) => [w.id, w]));

interface Card { id: string; he: string; translit: string; meaning: string; say: string }

/** Contenuto della carta per un elemento del mazzo (lettera, vocale o parola). */
export function cardFor(id: string): Card | null {
  const key = id.slice(2);
  if (id.startsWith('g:')) {
    const g = GLYPH_BY_ID[key];
    return g && { id, he: g.char, translit: g.sound, meaning: `${g.name} · ${g.hebrewName}`, say: g.hebrewName };
  }
  if (id.startsWith('v:')) {
    const v = VOWEL_BY_ID[key];
    return v && { id, he: vowelDisplay(v), translit: v.sound, meaning: `${v.name} · ${v.hebrewName}`, say: v.hebrewName };
  }
  if (id.startsWith('w:')) {
    const w = WORD_BY_ID[key];
    return w && { id, he: w.he, translit: w.translit, meaning: w.it, say: w.he };
  }
  return null;
}

type Vote = 'again' | 'hard' | 'easy';

/**
 * Ripasso a carte: si legge, si gira la carta e ci si autovaluta (Ancora · Difficile · Facile).
 * "Ancora" riporta la carta in fondo al mazzo; ogni carta ricordata vale qualche XP.
 */
export function ReviewDeck({ ids, title, onExit, children }: { ids: string[]; title: string; onExit: () => void; children?: React.ReactNode }) {
  const { settings } = useAppState();
  const [deck, setDeck] = useState<Card[]>(() => ids.map(cardFor).filter((c): c is Card => !!c));
  const [total] = useState(deck.length);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState<'L' | 'R' | null>(null);
  const [tally, setTally] = useState({ again: 0, hard: 0, easy: 0, xp: 0 });
  const done = i >= deck.length;
  const c = deck[i];
  const say = () => c && settings.audio && speak(c.say, settings.speechRate);

  useEffect(() => { if (done && total) { feedback('win'); confetti(80); } }, [done, total]);

  const vote = (v: Vote) => {
    if (!c || leaving) return;
    const ok = v !== 'again';
    actions.answer([c.id], ok, { selfRated: true, hard: v === 'hard', reward: XP_CARD });
    feedback(ok ? 'ok' : 'bad');
    setTally((t) => ({ ...t, [v]: t[v] + 1, xp: t.xp + (ok ? XP_CARD : 0) }));
    setLeaving(ok ? 'R' : 'L');
    setTimeout(() => {
      setLeaving(null);
      setFlipped(false);
      // una carta da rivedere torna in fondo al mazzo (una sola volta)
      if (!ok && deck.filter((d) => d.id === c.id).length < 2) setDeck((d) => [...d, c]);
      setI((n) => n + 1);
    }, reducedMotion() ? 0 : 400);
  };

  if (!total) return <div className="card empty">Nessuna carta da ripassare.</div>;

  if (done) {
    return (
      <div className="card deck-end fade-in">
        <div className="deck-check" aria-hidden="true">
          <svg viewBox="0 0 52 52" width="44" height="44"><path d="M14 27l8 8 16-17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2>Ripasso completato!</h2>
        <p className="muted">{total} carte · <b className="ok-text">{tally.easy} facili</b> · <b className="gold-text">{tally.hard} difficili</b> · <b className="bad-text">{tally.again} da rivedere</b></p>
        <p className="deck-xp">+{tally.xp} XP</p>
        <div className="row" style={{ justifyContent: 'center' }}>{children}</div>
      </div>
    );
  }

  return (
    <div className="deck">
      <div className="lesson-top">
        <button className="quiz-close" onClick={onExit} aria-label="Esci dal ripasso"><Icon name="x" className="" /></button>
        <div className="deck-title"><b>{title}</b><span className="small muted">{Math.min(i + 1, deck.length)} / {deck.length}</span></div>
      </div>
      <div className="deck-dots" aria-hidden="true">
        {deck.map((_, k) => <span key={k} className={k < i ? 'done' : k === i ? 'active' : ''} />)}
      </div>
      <div className={`flash-scene deck-scene ${leaving ? `fly${leaving}` : ''}`} key={`${c.id}-${i}`}>
        <div className={`flash-inner ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(true)} role="button" tabIndex={0}
          aria-label={flipped ? undefined : 'Gira la carta'}
          onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setFlipped(true)}>
          <div className="card flash flash-face deck-front" aria-hidden={flipped}>
            <span className="deck-kicker">Come si legge?</span>
            <span className="he deck-he" lang="he">{c.he}</span>
            <span className="small muted">Tocca per girare</span>
          </div>
          <div className="card flash flash-face flash-back" aria-hidden={!flipped}>
            <span className="he" lang="he">{c.he}</span>
            <h2 dir="ltr">{c.translit || '—'}</h2>
            <p className="muted">{c.meaning}</p>
          </div>
        </div>
      </div>
      {!flipped ? (
        <div className="deck-actions">
          <button className="round-btn deck-speak" onClick={say} aria-label="Ascolta"><Icon name="speaker" size={22} className="" /></button>
          <button className="btn btn-primary btn-lg deck-show" onClick={() => setFlipped(true)}>Mostra la risposta</button>
        </div>
      ) : (
        <div className="deck-actions deck-votes">
          <button className="btn btn-bad btn-lg" disabled={!!leaving} onClick={() => vote('again')}>Ancora</button>
          <button className="btn btn-gold btn-lg" disabled={!!leaving} onClick={() => vote('hard')}>Difficile</button>
          <button className="btn btn-ok btn-lg" disabled={!!leaving} onClick={() => vote('easy')}>Facile</button>
        </div>
      )}
    </div>
  );
}
