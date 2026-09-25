import { useMemo } from 'react';
import { BASE_LETTERS, GLYPHS, GLYPH_BY_ID, LETTER_VARIANTS } from '../data/alphabet';
import { VOWELS } from '../data/nikud';
import { WORDS } from '../data/words';
import { LESSONS } from '../data/curriculum';
import { EXAMS } from '../lib/quiz';
import { MASTERY_LABELS, mastery } from '../lib/srs';
import { dayKey, useAppState } from '../lib/store';
import { vowelDisplay } from '../lib/quiz';

function Legend() {
  return (
    <div className="legend">
      {MASTERY_LABELS.map((l, i) => <span key={l}><i className={`m${i}`} />{l}</span>)}
    </div>
  );
}

/** Sotto questa percentuale di risposte giuste un elemento è un punto debole. */
const WEAK_THRESHOLD = 0.8;

export function ProgressPage() {
  const state = useAppState();
  const totals = useMemo(() => {
    const days = Object.values(state.days);
    const answered = days.reduce((s, d) => s + d.answered, 0);
    const correct = days.reduce((s, d) => s + d.correct, 0);
    return { answered, correct, activeDays: days.filter((d) => d.answered > 0).length };
  }, [state.days]);

  const hardest = useMemo(() => Object.entries(state.srs)
    .filter(([, s]) => s.seen >= 3 && s.correct / s.seen < WEAK_THRESHOLD)
    .map(([id, s]) => ({ id, rate: s.correct / s.seen, seen: s.seen }))
    .sort((a, b) => a.rate - b.rate || b.seen - a.seen)
    .slice(0, 8), [state.srs]);
  const answeredEnough = Object.values(state.srs).some((s) => s.seen >= 3);

  const labelOf = (id: string) => {
    const [t, k] = [id[0], id.slice(2)];
    if (t === 'g') return { he: GLYPH_BY_ID[k]?.char ?? k, it: GLYPH_BY_ID[k]?.name ?? k };
    if (t === 'v') { const v = VOWELS.find((x) => x.id === k); return { he: v ? vowelDisplay(v) : k, it: v?.name ?? k }; }
    const w = WORDS.find((x) => x.id === k);
    return { he: w?.he ?? k, it: w ? `${w.translit} · ${w.it}` : k };
  };

  const last30 = useMemo(() => {
    const out: { k: string; n: number; label: string }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dayKey(d);
      out.push({ k, n: state.days[k]?.answered ?? 0, label: String(d.getDate()) });
    }
    return out;
  }, [state.days]);
  const max = Math.max(10, ...last30.map((d) => d.n));

  const wordsByLevel = [0, 1, 2, 3].map((lvl) => WORDS.filter((w) => mastery(state.srs[`w:${w.id}`]) === lvl).length);

  return (
    <div className="fade-in stack">
      <div className="page-head">
        <div><h1>Progressi</h1><p>Il quadro completo del tuo apprendimento.</p></div>
      </div>

      <div className="grid grid-4">
        <div className="card stat"><span className="stat-value">{state.xp}</span><span className="stat-label">XP totali</span></div>
        <div className="card stat"><span className="stat-value">{state.streak}</span><span className="stat-label">{state.streak === 1 ? 'giorno' : 'giorni'} di fila</span></div>
        <div className="card stat"><span className="stat-value">{totals.answered}</span><span className="stat-label">risposte date</span></div>
        <div className="card stat"><span className="stat-value">{totals.answered ? Math.round((totals.correct / totals.answered) * 100) : 0}%</span><span className="stat-label">precisione</span></div>
      </div>

      <div className="card">
        <div className="card-title"><h2>Attività (30 giorni)</h2><span className="muted small">{totals.activeDays} giorni attivi in totale</span></div>
        <div className="bars" style={{ height: 120 }}>
          {last30.map((d, i) => (
            <div key={d.k} title={`${d.k}: ${d.n} risposte`}>
              <div className={`bar ${d.n ? '' : 'empty'}`} style={{ height: `${Math.max(3, (d.n / max) * 100)}%` }} />
              <span>{i % 5 === 4 ? d.label : ' '}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title"><h2>Lettere</h2></div>
        <div className="mastery-grid">
          {BASE_LETTERS.flatMap((b) => [b, ...(LETTER_VARIANTS[b] ?? [])]).map((id) => (
            <div key={id} className={`mcell m${mastery(state.srs[`g:${id}`])}`} title={GLYPH_BY_ID[id].name}>{GLYPH_BY_ID[id].char}</div>
          ))}
        </div>
        <Legend />
        <p className="small muted" style={{ marginTop: 8, marginBottom: 0 }}>
          {GLYPHS.filter((g) => mastery(state.srs[`g:${g.id}`]) >= 2).length} di {GLYPHS.length} lettere consolidate.
        </p>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title"><h2>Vocali</h2></div>
          <div className="mastery-grid">
            {VOWELS.map((v) => (
              <div key={v.id} className={`mcell m${mastery(state.srs[`v:${v.id}`])}`} title={v.name}>{vowelDisplay(v)}</div>
            ))}
          </div>
          <Legend />
        </div>
        <div className="card">
          <div className="card-title"><h2>Vocabolario</h2></div>
          {MASTERY_LABELS.map((l, i) => (
            <div key={l} style={{ marginBottom: 10 }}>
              <div className="row small"><span><i className={`m${i}`} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, marginRight: 6 }} />{l}</span><span className="spacer" /><b>{wordsByLevel[i]}</b></div>
              <div className="progress"><div style={{ width: `${(wordsByLevel[i] / WORDS.length) * 100}%`, background: `var(--m${i})` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-title"><h2>Lezioni ed esami</h2></div>
          <table className="data">
            <tbody>
              {LESSONS.map((l) => (
                <tr key={l.id}><td>Lezione {l.id}</td><td>{state.lessons[l.id]?.passed ? <span className="pill pill-ok">{state.lessons[l.id].bestScore}%</span> : state.lessons[l.id]?.attempts ? `${state.lessons[l.id].bestScore}%` : '—'}</td></tr>
              ))}
              {EXAMS.map((e) => (
                <tr key={e.id}><td>{e.title}</td><td>{state.exams[e.id] ? <span className={`pill ${state.exams[e.id].bestScore >= 80 ? 'pill-ok' : 'pill-warn'}`}>{state.exams[e.id].bestScore}%</span> : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-title"><h2>Punti deboli</h2></div>
          {hardest.length === 0 ? <p className="muted">{answeredEnough
            ? 'Nessun punto debole: rispondi correttamente ad almeno l’80% su tutto. Ottimo lavoro!'
            : 'Rispondi a qualche domanda in più per vedere dove sbagli di più.'}</p> : (
            <div className="review-list">
              {hardest.map((h) => {
                const l = labelOf(h.id);
                return (
                  <div className="review-item" key={h.id}>
                    <span className="he" style={{ fontSize: '1.8rem' }}>{l.he}</span>
                    <div className="ans"><b>{l.it}</b><div className="small muted">{Math.round(h.rate * 100)}% corrette su {h.seen}</div></div>
                  </div>
                );
              })}
            </div>
          )}
          {hardest.length > 0 && <a className="btn btn-sm" href="#/ripasso" style={{ marginTop: 12 }}>Allenati sui punti deboli</a>}
        </div>
      </div>
    </div>
  );
}
