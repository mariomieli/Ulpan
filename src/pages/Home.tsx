import { lazy, Suspense, useMemo, useState } from 'react';
import { dayKey, dueItems, isLessonUnlocked, useAppState } from '../lib/store';
import { LESSONS, wordsUpTo, type Lesson } from '../data/curriculum';
import { GLYPHS, GLYPH_BY_ID } from '../data/alphabet';
import { VOWELS, VOWEL_BY_ID } from '../data/nikud';
import { WORDS } from '../data/words';
import { mastery } from '../lib/srs';
import { useAuth } from '../lib/auth';
import { lessonKind, lessonGlyphText, type LessonKind } from '../components/LessonArt';
import { PageHeader } from '../components/PageHeader';
import { Rich } from '../components/Hebrew';
import { canCombine, syllable } from '../lib/quiz';
import { ktivMale } from '../lib/ktiv';
import { speak } from '../lib/speech';

const HomeAssignments = lazy(() => import('../components/HomeAssignments'));

const KIND_NAME: Record<LessonKind, string> = { vowels: 'Vocali', letters: 'Lettere', rules: 'Regole', grammar: 'Grammatica' };
const PHASES: LessonKind[] = ['vowels', 'letters', 'rules', 'grammar'];
const MARKS = /[֑-ׇ]/g;

/** Primo segno (lettera con i suoi punti) del simbolo di una lezione. */
function firstGlyph(l: Lesson): string {
  return lessonGlyphText(l).match(/[א-ת][֑-ׇ]*/u)?.[0] ?? 'א';
}

interface Part { he: string; plain: string; sound: string }

/** Tre esempi leggibili della lezione: sillabe (lettere e vocali) oppure parole. */
function sampleParts(l: Lesson): Part[] {
  if (l.glyphs.length || l.vowels.length) {
    const g = (l.glyphs.map((id) => GLYPH_BY_ID[id]).find((x) => x && !x.finalOf && x.id !== 'alef') ?? GLYPH_BY_ID.alef);
    const pool = l.vowels.length
      ? l.vowels.map((id) => VOWEL_BY_ID[id])
      : VOWELS.filter((v) => v.lesson <= l.id);
    const vs = pool.filter((v) => v && canCombine(g, v)).slice(0, 3);
    if (vs.length) {
      return vs.map((v) => { const s = syllable(g, v); return { he: s.text, plain: g.char.replace(MARKS, ''), sound: s.translit }; });
    }
  }
  return wordsUpTo(l.id).filter((w) => w.core).slice(-3).map((w) => ({ he: w.he, plain: ktivMale(w.he), sound: `${w.translit} · ${w.it}` }));
}

function Ring({ value, max, size, inner, label }: { value: number; max: number; size: number; inner: number; label: string }) {
  const deg = `${Math.min(100, max ? (value / max) * 100 : 0)}%`;
  return (
    <div className="goal-ring" role="img" aria-label={`${label}: ${value} su ${max}`} style={{ width: size, height: size, background: `conic-gradient(var(--okfill) ${deg}, var(--sf2) 0)` }}>
      <div style={{ width: inner, height: inner }}><b>{Math.min(value, 999)}</b><span>su {max}</span></div>
    </div>
  );
}

export function HomePage() {
  const state = useAppState();
  const auth = useAuth();
  const [nikud, setNikud] = useState(true);
  const [sel, setSel] = useState(0);
  const today = state.days[dayKey()] ?? { answered: 0, correct: 0 };
  const goal = state.settings.dailyGoal;
  const due = dueItems(state, Date.now()).length;

  const next = LESSONS.find((l) => isLessonUnlocked(state, l.id) && !state.lessons[l.id]?.passed);
  const done = LESSONS.filter((l) => state.lessons[l.id]?.passed).length;
  const parts = useMemo(() => (next ? sampleParts(next) : []), [next]);
  const part = parts[Math.min(sel, parts.length - 1)];

  const learned = useMemo(() => {
    const count = (prefix: string, ids: string[]) => ids.filter((id) => mastery(state.srs[`${prefix}:${id}`]) >= 2).length;
    return [
      { label: 'Lettere', v: count('g', GLYPHS.map((g) => g.id)), max: GLYPHS.length },
      { label: 'Vocali (nikud)', v: count('v', VOWELS.map((v) => v.id)), max: VOWELS.length },
      { label: 'Parole', v: count('w', WORDS.map((w) => w.id)), max: WORDS.length },
    ];
  }, [state.srs]);

  const week = useMemo(() => {
    const out: { key: string; label: string; n: number; isToday: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      out.push({ key: k, label: d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '').slice(0, 3), n: state.days[k]?.answered ?? 0, isToday: i === 0 });
    }
    return out;
  }, [state.days]);

  const dateLabel = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  const kicker = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);
  const goalText = today.answered >= goal ? 'Raggiunto!' : `${goal - today.answered} risposte`;

  return (
    <div className="home">
      <PageHeader he="שָׁלוֹם" kicker={kicker} title={`Ciao${auth.user ? `, ${auth.user.name}` : ''}`}>
        {next && <a className="ph-chip" href={`#/lezioni/${next.id}`}><span>Oggi</span><b>Lezione {next.id}</b></a>}
        <a className="ph-chip" href="#/ripasso"><span>Da ripassare</span><b>{due} {due === 1 ? 'parola' : 'parole'}</b></a>
      </PageHeader>

      <div className="home-grid">
        <div className="home-left">
          <section className="hcard hero-card u-rise" style={{ animationDelay: '.06s' }}>
            {next ? (
              <>
                <div className="hero-text">
                  <span className="kicker-up">Lezione {next.id} di {LESSONS.length} · {KIND_NAME[lessonKind(next)]}</span>
                  <h2>{next.title}</h2>
                  <p><Rich text={next.subtitle} /></p>
                  <div className="bar-row">
                    <div className="bar-track"><div style={{ width: `${(done / LESSONS.length) * 100}%` }} /></div>
                    <span>{done}/{LESSONS.length}</span>
                  </div>
                  <div className="hero-actions">
                    <a className="hero-btn" href={`#/lezioni/${next.id}`}>{state.lessons[next.id]?.studied ? 'Continua la lezione' : 'Inizia la lezione'}</a>
                    <a className="hero-link" href="#/lezioni">Vedi il percorso</a>
                  </div>
                </div>
                {part && (
                  <div className="syl-panel">
                    <div className="syl-top">
                      <span>Leggi da destra →</span>
                      <button type="button" className={`mini-pill ${nikud ? 'on' : ''}`} aria-pressed={nikud} onClick={() => setNikud((v) => !v)}>{nikud ? 'Con nikud' : 'Senza nikud'}</button>
                    </div>
                    <div className="syl-row" dir="rtl" lang="he">
                      {parts.map((p, i) => (
                        <button key={i} type="button" className={i === sel ? 'on' : ''} aria-pressed={i === sel}
                          onClick={() => { setSel(i); if (state.settings.audio) speak(p.he, state.settings.speechRate); }}>{nikud ? p.he : p.plain}</button>
                      ))}
                    </div>
                    <div className="syl-sound">“{part.sound}”</div>
                    <span className="syl-hint">Tocca una lettera</span>
                  </div>
                )}
              </>
            ) : (
              <div className="hero-text">
                <span className="kicker-up">Percorso completato</span>
                <h2>Hai completato tutte le lezioni!</h2>
                <p>Metti alla prova le tue abilità con l’esame finale e continua il ripasso quotidiano.</p>
                <div className="hero-actions"><a className="hero-btn" href="#/test/finale">Esame finale</a></div>
              </div>
            )}
          </section>

          {auth.status === 'signedIn' && <Suspense fallback={null}><HomeAssignments /></Suspense>}

          <section className="hcard path-card u-rise" style={{ animationDelay: '.12s' }}>
            <div className="path-head"><b>Il percorso</b><span>{done} di {LESSONS.length} lezioni superate</span></div>
            <div className="path-phases">
              {PHASES.map((k) => {
                const ls = LESSONS.filter((l) => lessonKind(l) === k);
                if (!ls.length) return null;
                return (
                  <div key={k} className="path-phase" style={{ flex: ls.length }}>
                    <span className="phase-name">{KIND_NAME[k]}</span>
                    <div className="phase-nodes">
                      {ls.map((l) => {
                        const isDone = !!state.lessons[l.id]?.passed;
                        const isNow = next?.id === l.id;
                        return (
                          <a key={l.id} href={`#/lezioni/${l.id}`} lang="he" className={`node ${isDone ? 'done' : isNow ? 'now' : ''}`}
                            aria-label={`Lezione ${l.id}: ${l.title}${isDone ? ', superata' : ''}`} title={`${l.id}. ${l.title}`}>{firstGlyph(l)}</a>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="home-tiles u-rise" style={{ animationDelay: '.18s' }}>
            {[
              { g: 'אבג', t: 'Alfabeto', d: '22 lettere e 5 forme finali', href: '#/alfabeto' },
              { g: 'אָ', t: 'Nikud (Punteggiatura)', d: 'Le vocali, sillaba per sillaba', href: '#/nikud' },
              { g: 'שָׁלוֹם', t: 'Lettura', d: 'Parole e frasi, con e senza vocali', href: '#/lettura' },
              { g: 'הוּא', t: 'Lingua e cultura', d: 'Numeri, calendario e luoghi', href: '#/grammatica' },
            ].map((t) => (
              <a key={t.t} className="home-tile" href={t.href}>
                <span className="tile-he" lang="he">{t.g}</span>
                <span className="tile-text"><b>{t.t}</b><span>{t.d}</span></span>
              </a>
            ))}
          </div>
        </div>

        <aside className="home-aside">
          <div className="acard goal-card u-rise" style={{ animationDelay: '.1s' }}>
            <Ring value={today.answered} max={goal} size={84} inner={66} label="Obiettivo giornaliero" />
            <div className="goal-text">
              <span>Obiettivo di oggi</span>
              <b>{goalText}</b>
              <small>{today.answered ? `${Math.round((today.correct / today.answered) * 100)}% corrette` : 'Nessuna attività oggi'}</small>
            </div>
          </div>
          <div className="acard streak-card u-rise" style={{ animationDelay: '.14s' }}>
            <div className="streak-top"><b>{state.streak}</b><span>{state.streak === 1 ? 'giorno di fila' : 'giorni di fila'}</span><em>{state.xp} XP</em></div>
            <div className="streak-days">
              {week.map((d) => (
                <div key={d.key} title={`${d.n} risposte`}>
                  <span className={d.n ? 'ok' : d.isToday ? 'today' : ''}>{d.n ? '✓' : ''}</span>{d.label}
                </div>
              ))}
            </div>
          </div>
          <div className="acard review-card u-rise" style={{ animationDelay: '.18s' }}>
            <span className="rv-k">Ripasso intelligente</span>
            <div className="rv-n"><b>{due}</b><span>{due === 1 ? 'da ripassare oggi' : 'da ripassare oggi'}</span></div>
            <a href="#/ripasso/oggi">Inizia<span className="lg-only"> la sessione</span></a>
          </div>
          <div className="acard mast-card u-rise" style={{ animationDelay: '.22s' }}>
            <b>Padronanza</b>
            {learned.map((m) => (
              <div key={m.label} className="mast-row">
                <div><span>{m.label}</span><em>{m.v}/{m.max}</em></div>
                <div className="bar-track thin"><div style={{ width: `${Math.max(m.v ? 3 : 0, (m.v / m.max) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
