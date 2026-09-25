import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { dayKey, dueItems, isLessonUnlocked, useAppState } from '../lib/store';
import { LESSONS } from '../data/curriculum';
import { GLYPHS } from '../data/alphabet';
import { VOWELS } from '../data/nikud';
import { WORDS } from '../data/words';
import { mastery } from '../lib/srs';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';
import { LessonCover } from '../components/LessonArt';
import { Rich } from '../components/Hebrew';

const HomeAssignments = lazy(() => import('../components/HomeAssignments'));

function Ring({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(1, max ? value / max : 0);
  const r = 36;
  const c = 2 * Math.PI * r;
  // l'anello si riempie all'apertura della pagina
  const [on, setOn] = useState(false);
  useEffect(() => { const f = requestAnimationFrame(() => setOn(true)); return () => cancelAnimationFrame(f); }, []);
  return (
    <div className="ring" role="img" aria-label={`${label}: ${value} su ${max}`}>
      <svg width="84" height="84" aria-hidden="true">
        <circle cx="42" cy="42" r={r} stroke="var(--surface-2)" strokeWidth="8" fill="none" />
        <circle cx="42" cy="42" r={r} stroke={pct >= 1 ? 'var(--ok)' : 'var(--primary)'} strokeWidth="8" fill="none"
          className="ring-fill" strokeDasharray={c} strokeDashoffset={on ? c * (1 - pct) : c} strokeLinecap="round" />
      </svg>
      <div className={`ring-label ${value >= max ? 'pop-in' : ''}`} aria-hidden="true">{value >= max ? '✓' : `${value}/${max}`}</div>
    </div>
  );
}

export function HomePage() {
  const state = useAppState();
  const auth = useAuth();
  const today = state.days[dayKey()] ?? { answered: 0, correct: 0 };
  const due = dueItems(state, Date.now()).length;

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
    <div className="stack fade-in">
      <div className="page-head">
        <div>
          <h1><span className="he-inline" lang="he">שָׁלוֹם</span> · Ciao{auth.user ? `, ${auth.user.name}` : ''}!</h1>
          <p>Il tuo percorso per leggere l’ebraico, una lettera alla volta.</p>
        </div>
      </div>

      <div className="card hero">
        {next ? (
          <>
            <div className="hero-main">
              <LessonCover lesson={next} size="lg" />
              <div style={{ minWidth: 0 }}>
                <p className="hero-kicker">Lezione {next.id} di {LESSONS.length}</p>
                <h2>{next.title}</h2>
                <p className="hero-sub"><Rich text={next.subtitle} /></p>
              </div>
            </div>
            <div className="hero-path" aria-label={`${done} lezioni superate su ${LESSONS.length}`}>
              <div className="progress"><div className="progress-fill" style={{ transform: `scaleX(${done / LESSONS.length})` }} /></div>
              <span>{done}/{LESSONS.length}</span>
            </div>
            {isNew && (
              <ol className="hero-steps" aria-label="Come funziona">
                <li>Teoria</li><li>Studio</li><li>Esercizi</li><li>Test</li><li>Ripasso</li>
              </ol>
            )}
            <div className="row">
              <a className="btn btn-lg" href={`#/lezioni/${next.id}`}>
                {state.lessons[next.id]?.studied ? 'Continua' : 'Inizia'} la lezione <Icon name="arrowRight" size={18} className="" />
              </a>
              {isNew && <a className="hero-link" href="#/test/ingresso">Sai già un po’ di ebraico? Test d’ingresso</a>}
            </div>
          </>
        ) : (
          <div>
            <h2><Icon name="trophy" size={22} className="" /> Hai completato tutte le lezioni!</h2>
            <p>Metti alla prova le tue abilità con l’esame finale e continua il ripasso quotidiano.</p>
            <a className="btn btn-lg" href="#/test/finale">Esame finale <Icon name="arrowRight" size={18} className="" /></a>
          </div>
        )}
      </div>

      {auth.status === 'signedIn' && <Suspense fallback={null}><HomeAssignments /></Suspense>}

      <div className="grid grid-3">
        <div className="card row">
          <Ring value={today.answered} max={state.settings.dailyGoal} label="Obiettivo giornaliero" />
          <div className="stat">
            <span className="stat-label">Obiettivo di oggi</span>
            <span className="stat-value">{today.answered >= state.settings.dailyGoal ? `Raggiunto! (${today.answered} risposte)` : `${state.settings.dailyGoal - today.answered} risposte`}</span>
            <span className="stat-label">{today.answered ? `${Math.round((today.correct / today.answered) * 100)}% corrette` : 'Nessuna attività oggi'}</span>
          </div>
        </div>
        <div className="card">
          <div className="card-title"><h3>Ripasso</h3><Icon name="repeat" /></div>
          <div className="stat">
            <span className="stat-value">{due}</span>
            <span className="stat-label">{due === 1 ? 'elemento da ripassare' : 'elementi da ripassare'}</span>
          </div>
          <a className={`btn btn-block ${due ? 'btn-primary' : ''}`} style={{ marginTop: 12 }} href="#/ripasso">
            {due ? 'Ripassa ora' : 'Ripasso libero'}
          </a>
        </div>
        <div className="card">
          <div className="card-title"><h3>Serie</h3><Icon name="flame" /></div>
          <div className="stat">
            <span className="stat-value">{state.streak} {state.streak === 1 ? 'giorno' : 'giorni'}</span>
            <span className="stat-label">{state.xp} XP totali · {done}/{LESSONS.length} lezioni superate</span>
          </div>
          {week.some((d) => d.n) ? (
            <div className="bars" style={{ marginTop: 10 }}>
              {week.map((d, i) => (
                <div key={d.key} title={`${d.n} risposte`}>
                  <div className={`bar ${d.n ? '' : 'is-zero'}`} style={{ height: `${Math.max(4, (d.n / maxDay) * 100)}%`, ['--i' as string]: i }} />
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
            { label: 'Lettere', v: learned.glyphs, max: GLYPHS.length },
            { label: 'Vocali (nikud)', v: learned.vowels, max: VOWELS.length },
            { label: 'Parole', v: learned.words, max: WORDS.length },
          ].map((x) => (
            <div key={x.label}>
              <div className="row small" style={{ marginBottom: 6 }}><b>{x.label}</b><span className="spacer" /><span className="muted">{x.v}/{x.max}</span></div>
              <div className="progress ok"><div style={{ width: `${(x.v / x.max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 12, marginBottom: 0 }}>
          Un elemento è “consolidato” quando lo riconosci correttamente per più giorni di seguito nel ripasso.
        </p>
      </div>

      <div className="grid grid-3">
        <a className="card feature" href="#/alfabeto">
          <span className="feature-glyph" lang="he" aria-hidden="true">אבג</span>
          <h3>Alfabeto</h3>
          <p className="muted small">Tutte le 22 lettere, le forme finali e come distinguerle.</p>
        </a>
        <a className="card feature" href="#/nikud">
          <span className="feature-glyph" lang="he" aria-hidden="true">אָ</span>
          <h3>Nikud</h3>
          <p className="muted small">I segni vocalici e una tabella interattiva delle sillabe.</p>
        </a>
        <a className="card feature" href="#/lettura">
          <span className="feature-glyph" lang="he" aria-hidden="true">שָׁלוֹם</span>
          <h3>Lettura</h3>
          <p className="muted small">Parole e frasi da leggere, con e senza vocali.</p>
        </a>
      </div>
    </div>
  );
}
