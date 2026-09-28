import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { dayKey, dueItems, isLessonUnlocked, useAppState } from '../lib/store';
import { LESSONS } from '../data/curriculum';
import { GLYPHS } from '../data/alphabet';
import { VOWELS } from '../data/nikud';
import { WORDS } from '../data/words';
import { mastery } from '../lib/srs';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';
import { lessonGlyphText } from '../components/LessonArt';
import { useCountUp } from '../lib/fx';
import { Rich } from '../components/Hebrew';

const HomeAssignments = lazy(() => import('../components/HomeAssignments'));

function Ring({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(1, max ? value / max : 0);
  const r = 38;
  const c = 2 * Math.PI * r;
  // l'anello si riempie all'apertura della pagina
  const [on, setOn] = useState(false);
  useEffect(() => { const f = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(f); }, []);
  return (
    <div className="ring ring-96" role="img" aria-label={`${label}: ${value} su ${max}`}>
      <svg width="96" height="96" aria-hidden="true">
        <circle cx="48" cy="48" r={r} stroke="var(--surface-2)" strokeWidth="10" fill="none" />
        <circle cx="48" cy="48" r={r} stroke={pct >= 1 ? 'var(--ok)' : 'var(--primary)'} strokeWidth="10" fill="none"
          className="ring-fill" strokeDasharray={c} strokeDashoffset={on ? c * (1 - pct) : c} strokeLinecap="round" />
      </svg>
      <div className={`ring-label ${value >= max ? 'pop-in' : ''}`} aria-hidden="true">{value >= max ? '✓' : `${value}/${max}`}</div>
    </div>
  );
}

/** Lettere decorative che fluttuano nel riquadro principale. */
const DRIFT = [
  { c: 'ש', x: 6, y: 12, s: 70, d: 9 }, { c: 'ל', x: 84, y: 8, s: 90, d: 11 }, { c: 'ו', x: 60, y: 70, s: 60, d: 8 },
  { c: 'ם', x: 92, y: 62, s: 54, d: 12 }, { c: 'א', x: 30, y: 78, s: 64, d: 10 }, { c: 'ב', x: 46, y: 4, s: 48, d: 7.5 },
  { c: 'ג', x: 72, y: 36, s: 44, d: 13 }, { c: 'ד', x: 16, y: 50, s: 58, d: 9.5 },
];

export function HomePage() {
  const state = useAppState();
  const auth = useAuth();
  const today = state.days[dayKey()] ?? { answered: 0, correct: 0 };
  const due = dueItems(state, Date.now()).length;
  const dueShown = useCountUp(due, 900);
  const xpShown = useCountUp(state.xp, 1100);

  const next = LESSONS.find((l) => isLessonUnlocked(state, l.id) && !state.lessons[l.id]?.passed);
  const done = LESSONS.filter((l) => state.lessons[l.id]?.passed).length;
  const isNew = done === 0 && Object.keys(state.srs).length === 0;

  const learned = useMemo(() => {
    const count = (prefix: string, ids: string[]) =>
      ids.filter((id) => mastery(state.srs[`${prefix}:${id}`]) >= 2).length;
    return {
      glyphs: count('g', GLYPHS.map((g) => g.id)),
      vowels: count('v', VOWELS.map((v) => v.id)),
      words: count('w', WORDS.map((w) => w.id)),
    };
  }, [state.srs]);

  const week = useMemo(() => {
    const out: { key: string; label: string; n: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = dayKey(d);
      out.push({ key: k, label: d.toLocaleDateString('it-IT', { weekday: 'short' }).slice(0, 3), n: state.days[k]?.answered ?? 0 });
    }
    return out;
  }, [state.days]);
  const maxDay = Math.max(10, ...week.map((d) => d.n));

  return (
    <div className="home fade-in">
      <div className="home-head">
        <div>
          <h1>
            <span className="shalom" dir="rtl" lang="he">
              {['שָׁ', 'ל', 'וֹ', 'ם'].map((c, i) => <span key={i} style={{ animationDelay: `${0.05 + i * 0.1}s` }}>{c}</span>)}
            </span>{' '}
            Ciao{auth.user ? `, ${auth.user.name}` : ''}!
          </h1>
          <p className="home-sub">Il tuo percorso per leggere l’ebraico, una lettera alla volta.</p>
        </div>
        <div className="home-chips">
          <span className="stat-chip flame"><Icon name="flame" size={20} className="flame-icon" /> {state.streak} {state.streak === 1 ? 'giorno' : 'giorni'}</span>
          <span className="stat-chip xp"><Icon name="star" size={20} className="star-icon" /> {xpShown} XP</span>
        </div>
      </div>

      <div className="hero2">
        {DRIFT.map((d, i) => (
          <span key={i} className="drift" aria-hidden="true" lang="he"
            style={{ left: `${d.x}%`, top: `${d.y}%`, fontSize: d.s, animationDuration: `${d.d}s` }}>{d.c}</span>
        ))}
        {next ? (
          <>
            <div className="hero2-cover" aria-hidden="true"><span lang="he">{lessonGlyphText(next)}</span></div>
            <div className="hero2-body">
              <span className="kicker gold">Lezione {next.id} di {LESSONS.length}</span>
              <h2>{next.title}</h2>
              <p className="hero2-sub"><Rich text={next.subtitle} /></p>
              <div className="hero2-path" aria-label={`${done} lezioni superate su ${LESSONS.length}`}>
                <div className="hero2-bar"><div style={{ width: `${(done / LESSONS.length) * 100}%` }} /></div>
                <span>{done}/{LESSONS.length}</span>
              </div>
              {isNew && (
                <ol className="hero-steps" aria-label="Come funziona">
                  <li>Teoria</li><li>Studio</li><li>Esercizi</li><li>Test</li><li>Ripasso</li>
                </ol>
              )}
            </div>
            <div className="hero2-cta">
              <a className="btn btn-gold btn-xl" href={`#/lezioni/${next.id}`}>
                {state.lessons[next.id]?.studied ? 'Continua' : 'Inizia'} la lezione <Icon name="arrowRight" size={18} className="" />
              </a>
              <a className="hero-link" href="#/lezioni">Vedi tutto il percorso</a>
              {isNew && <a className="hero-link" href="#/test/ingresso">Sai già un po’ di ebraico? Test d’ingresso</a>}
            </div>
          </>
        ) : (
          <div className="hero2-body">
            <span className="kicker gold">Percorso completato</span>
            <h2>Hai completato tutte le lezioni!</h2>
            <p className="hero2-sub">Metti alla prova le tue abilità con l’esame finale e continua il ripasso quotidiano.</p>
            <a className="btn btn-gold btn-xl" href="#/test/finale">Esame finale <Icon name="arrowRight" size={18} className="" /></a>
          </div>
        )}
      </div>

      {auth.status === 'signedIn' && <Suspense fallback={null}><HomeAssignments /></Suspense>}

      <div className="home-cards">
        <div className="card row goal-card" style={{ animationDelay: '.1s' }}>
          <Ring value={today.answered} max={state.settings.dailyGoal} label="Obiettivo giornaliero" />
          <div className="stat">
            <span className="stat-label">Obiettivo di oggi</span>
            <span className="stat-value">{today.answered >= state.settings.dailyGoal ? 'Raggiunto!' : `${state.settings.dailyGoal - today.answered} risposte`}</span>
            <span className="stat-label">{today.answered ? `${Math.round((today.correct / today.answered) * 100)}% corrette` : 'Nessuna attività oggi'}</span>
          </div>
        </div>
        <div className="card" style={{ animationDelay: '.18s' }}>
          <div className="card-title"><h3>Ripasso</h3><span className="wiggle"><Icon name="repeat" /></span></div>
          <div className="stat stat-inline">
            <span className="stat-value big">{dueShown}</span>
            <span className="stat-label">{due === 1 ? 'elemento da ripassare' : 'elementi da ripassare'}</span>
          </div>
          <a className="btn btn-block btn-primary" style={{ marginTop: 12 }} href="#/ripasso/oggi">Sessione di oggi</a>
          <a className="btn btn-block btn-ghost small" style={{ marginTop: 6 }} href="#/ripasso">Altri allenamenti</a>
        </div>
        <div className="card" style={{ animationDelay: '.26s' }}>
          <div className="card-title"><h3>Serie</h3><Icon name="flame" size={24} className="flame-icon" /></div>
          <span className="stat-value">{state.streak} {state.streak === 1 ? 'giorno' : 'giorni'}</span>
          {week.some((d) => d.n) ? (
            <div className="bars bars-74">
              {week.map((d, i) => (
                <div key={d.key} title={`${d.n} risposte`}>
                  <div className={`bar ${d.n ? '' : 'is-zero'} ${i === 6 ? 'today' : ''}`} style={{ height: `${Math.max(6, (d.n / maxDay) * 100)}%`, ['--i' as string]: i }} />
                  <span>{d.label}</span>
                </div>
              ))}
            </div>
          ) : <p className="small muted" style={{ margin: '10px 0 0' }}>Rispondi ad almeno una domanda al giorno per far crescere la serie.</p>}
        </div>
      </div>

      <div className="card">
        <div className="card-title"><h3>Padronanza</h3><a href="#/progressi" className="small">Dettagli →</a></div>
        <div className="grid grid-3">
          {[
            { label: 'Lettere', v: learned.glyphs, max: GLYPHS.length, cls: 'blue' },
            { label: 'Vocali (nikud)', v: learned.vowels, max: VOWELS.length, cls: 'gold' },
            { label: 'Parole', v: learned.words, max: WORDS.length, cls: 'green' },
          ].map((x, i) => (
            <div key={x.label}>
              <div className="row small" style={{ marginBottom: 6 }}><b>{x.label}</b><span className="spacer" /><span className="muted">{x.v}/{x.max}</span></div>
              <div className={`mbar ${x.cls}`}><div style={{ width: `${Math.max(x.v ? 3 : 0, (x.v / x.max) * 100)}%`, animationDelay: `${0.2 + i * 0.12}s` }} /></div>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
          Un elemento è “consolidato” quando lo riconosci correttamente per più giorni di seguito nel ripasso.
        </p>
      </div>

      <div className="home-cards">
        <a className="card feature" href="#/alfabeto">
          <span className="feature-glyph blue" lang="he" aria-hidden="true">אבג</span>
          <h3>Alfabeto</h3>
          <p className="muted small">Tutte le 22 lettere, le forme finali e come distinguerle.</p>
        </a>
        <a className="card feature" href="#/nikud">
          <span className="feature-glyph gold" lang="he" aria-hidden="true">אָ</span>
          <h3>Nikud</h3>
          <p className="muted small">I segni vocalici e una tabella interattiva delle sillabe.</p>
        </a>
        <a className="card feature" href="#/lettura">
          <span className="feature-glyph green" lang="he" aria-hidden="true">שָׁלוֹם</span>
          <h3>Lettura</h3>
          <p className="muted small">Parole e frasi da leggere, con e senza vocali.</p>
        </a>
      </div>
    </div>
  );
}
