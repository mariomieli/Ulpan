import { lazy, Suspense, useMemo } from 'react';
import { dayKey, dueItems, isLessonUnlocked, useAppState } from '../lib/store';
import { LESSONS } from '../data/curriculum';
import { GLYPHS } from '../data/alphabet';
import { VOWELS } from '../data/nikud';
import { WORDS } from '../data/words';
import { mastery } from '../lib/srs';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/auth';

const HomeAssignments = lazy(() => import('../components/HomeAssignments'));

function Ring({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(1, max ? value / max : 0);
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`${label}: ${value} su ${max}`}>
      <svg width="84" height="84" aria-hidden="true">
        <circle cx="42" cy="42" r={r} stroke="var(--surface-2)" strokeWidth="8" fill="none" />
        <circle cx="42" cy="42" r={r} stroke={pct >= 1 ? 'var(--ok)' : 'var(--primary)'} strokeWidth="8" fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
      </svg>
      <div className="ring-label" aria-hidden="true">{value >= max ? '✓' : `${value}/${max}`}</div>
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
        <div>
          {next ? (
            <>
              <p style={{ margin: 0 }}>Lezione {next.id} di {LESSONS.length}</p>
              <h2>{next.title}</h2>
              <p>{next.subtitle}</p>
              <a className="btn btn-lg" href={`#/lezioni/${next.id}`}>
                {state.lessons[next.id]?.studied ? 'Continua' : 'Inizia'} la lezione <Icon name="arrowRight" size={18} className="" />
              </a>
            </>
          ) : (
            <>
              <h2>Hai completato tutte le lezioni! 🎉</h2>
              <p>Metti alla prova le tue abilità con l’esame finale e continua il ripasso quotidiano.</p>
              <a className="btn btn-lg" href="#/test/finale">Esame finale <Icon name="arrowRight" size={18} className="" /></a>
            </>
          )}
        </div>
        <div className="hero-letter" aria-hidden="true">אב</div>
      </div>

      {auth.status === 'signedIn' && <Suspense fallback={null}><HomeAssignments /></Suspense>}

      {done === 0 && Object.keys(state.srs).length === 0 && (
        <div className="card welcome">
          <h2 style={{ marginTop: 0 }}>Benvenuto! Ecco come funziona</h2>
          <ol>
            <li><b>Teoria</b>: ogni lezione spiega poche lettere o vocali alla volta.</li>
            <li><b>Studio</b>: le schede con suono ed esempi, da ascoltare.</li>
            <li><b>Esercizi</b>: domande brevi finché le riconosci senza esitare.</li>
            <li><b>Test</b>: con almeno l’80% si sblocca la lezione successiva.</li>
            <li><b>Ripasso</b>: ogni giorno ripeti ciò che stai per dimenticare.</li>
          </ol>
          <div className="row">
            <a className="btn btn-primary" href="#/lezioni/1">Inizia la lezione 1</a>
            <a className="btn" href="#/test/ingresso">Sai già un po’ di ebraico? Test d’ingresso</a>
          </div>
        </div>
      )}

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
          <div className="bars" style={{ marginTop: 10 }}>
            {week.map((d) => (
              <div key={d.key} title={`${d.n} risposte`}>
                <div className={`bar ${d.n ? '' : 'is-zero'}`} style={{ height: `${Math.max(4, (d.n / maxDay) * 100)}%` }} />
                <span>{d.label}</span>
              </div>
            ))}
          </div>
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
        <a className="card" href="#/alfabeto" style={{ color: 'inherit' }}>
          <h3>Alfabeto</h3>
          <p className="muted small">Tutte le 22 lettere, le forme finali e come distinguerle.</p>
        </a>
        <a className="card" href="#/nikud" style={{ color: 'inherit' }}>
          <h3>Nikud</h3>
          <p className="muted small">I segni vocalici e una tabella interattiva delle sillabe.</p>
        </a>
        <a className="card" href="#/lettura" style={{ color: 'inherit' }}>
          <h3>Lettura</h3>
          <p className="muted small">Parole e frasi da leggere, con e senza vocali.</p>
        </a>
      </div>
    </div>
  );
}
