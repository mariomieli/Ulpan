import { useMemo } from 'react';
import { BASE_LETTERS, GLYPHS, GLYPH_BY_ID, LETTER_VARIANTS } from '../data/alphabet';
import { VOWELS } from '../data/nikud';
import { WORDS } from '../data/words';
import { LESSONS } from '../data/curriculum';
import { EXAMS } from '../lib/quiz';
import { MASTERY_LABELS, mastery } from '../lib/srs';
import { dayKey, useAppState } from '../lib/store';

import { Badges } from '../components/Badges';
import { PageHeader } from '../components/PageHeader';
import { useCountUp } from '../lib/fx';
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
  const xpShown = useCountUp(state.xp, 1100);
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

  const passedCount = LESSONS.filter((l) => state.lessons[l.id]?.passed).length;
  const consolidated = GLYPHS.filter((g) => mastery(state.srs[`g:${g.id}`]) >= 2).length;

  return (
    <div className="progress-page">
      <PageHeader he="הִתְקַדְּמוּת" kicker="Il quadro completo del tuo apprendimento" title="Progressi" />

      <div className="pg-stats">
        <div className="pg-stat gold" style={{ animationDelay: '0s' }}><span>XP totali</span><b>{xpShown}</b></div>
        <div className="pg-stat" style={{ animationDelay: '.08s' }}><span>Serie</span><b>{state.streak} {state.streak === 1 ? 'giorno' : 'giorni'}</b></div>
        <div className="pg-stat" style={{ animationDelay: '.16s' }}><span>Lezioni</span><b>{passedCount}/{LESSONS.length}</b></div>
        <div className="pg-stat blue" style={{ animationDelay: '.24s' }}><span>Precisione</span><b>{totals.answered ? Math.round((totals.correct / totals.answered) * 100) : 0}%</b></div>
      </div>

      <div className="pg-row">
        <div className="pg-card">
          <div className="pg-ch"><b>Attività · 30 giorni</b><span>{totals.activeDays} giorni attivi in totale</span></div>
          <div className="pg-chart">
            <div className="pg-bars">
              {last30.map((d, i) => (
                <div key={d.k} title={`${d.k}: ${d.n} risposte`}>
                  <div className={`pg-bar ${d.n ? '' : 'zero'}`} style={{ height: `${Math.max(3, (d.n / max) * 100)}%`, animationDelay: `${i * 18}ms` }} />
                  <span>{i % 5 === 4 ? d.label : ' '}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="pg-card pg-weak">
          <b className="pg-t">Punti deboli</b>
          {hardest.length === 0 ? <p className="muted small" style={{ margin: 0 }}>{answeredEnough
            ? 'Nessun punto debole: rispondi correttamente ad almeno l’80% su tutto. Ottimo lavoro!'
            : 'Rispondi a qualche domanda in più per vedere dove sbagli di più.'}</p> : (
            <>
              {hardest.slice(0, 5).map((h) => {
                const l = labelOf(h.id);
                return (
                  <div className="pg-wk" key={h.id}>
                    <span className="he" lang="he">{l.he}</span>
                    <span className="wt"><b>{l.it}</b><span>{Math.round(h.rate * 100)}% corrette su {h.seen}</span></span>
                    <span className="wb"><i style={{ width: `${Math.round(h.rate * 100)}%` }} /></span>
                  </div>
                );
              })}
              <a className="pg-cta" href="#/ripasso">Allenati sui punti deboli</a>
            </>
          )}
        </div>
      </div>

      <div className="pg-card">
        <div className="pg-ch"><b>Lettere</b><span>{consolidated} di {GLYPHS.length} consolidate</span><Legend /></div>
        <div className="mastery-grid" dir="rtl">
          {BASE_LETTERS.flatMap((b) => [b, ...(LETTER_VARIANTS[b] ?? [])]).map((id, i) => (
            <div key={id} style={{ animationDelay: `${Math.min(30, i) * 20}ms` }} className={`mcell m${mastery(state.srs[`g:${id}`])}`} title={GLYPH_BY_ID[id].name} lang="he" role="img" aria-label={`${GLYPH_BY_ID[id].name}: ${MASTERY_LABELS[mastery(state.srs[`g:${id}`])]}`}>{GLYPH_BY_ID[id].char}</div>
          ))}
        </div>
      </div>

      <div className="pg-two">
        <div className="pg-card">
          <b className="pg-t">Vocali</b>
          <div className="mastery-grid vowels" dir="rtl">
            {VOWELS.map((v) => (
              <div key={v.id} className={`mcell m${mastery(state.srs[`v:${v.id}`])}`} title={v.name} lang="he" role="img" aria-label={`${v.name}: ${MASTERY_LABELS[mastery(state.srs[`v:${v.id}`])]}`}>{vowelDisplay(v)}</div>
            ))}
          </div>
        </div>
        <div className="pg-card">
          <b className="pg-t">Vocabolario</b>
          {MASTERY_LABELS.map((l, i) => (
            <div key={l} className="pg-vb">
              <div><span><i className={`m${i}`} />{l}</span><b>{wordsByLevel[i]}</b></div>
              <div className="bar-track"><div className={`m${i}`} style={{ width: `${(wordsByLevel[i] / WORDS.length) * 100}%`, minWidth: wordsByLevel[i] ? 6 : 0 }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="pg-card">
        <b className="pg-t">Lezioni ed esami</b>
        {(() => {
          // solo ciò che hai già provato: niente elenco di trattini
          const lessons = LESSONS.filter((l) => state.lessons[l.id]?.attempts || state.lessons[l.id]?.passed);
          const exams = EXAMS.filter((e) => state.exams[e.id]);
          if (!lessons.length && !exams.length) return <p className="muted small" style={{ margin: 0 }}>Nessun test ancora: i risultati compariranno qui dopo il primo test di lezione.</p>;
          return (
            <div className="pg-results">
              {lessons.map((l) => (
                <div key={l.id}>Lezione {l.id} · {l.title}<span className={`pill ${state.lessons[l.id]?.passed ? 'pill-solid-ok' : 'pill-warn'}`}>{state.lessons[l.id].bestScore}%</span></div>
              ))}
              {exams.map((e) => (
                <div key={e.id}>{e.title}<span className={`pill ${state.exams[e.id].bestScore >= 80 ? 'pill-solid-ok' : 'pill-warn'}`}>{state.exams[e.id].bestScore}%</span></div>
              ))}
            </div>
          );
        })()}
      </div>

      <Badges />
    </div>
  );
}
