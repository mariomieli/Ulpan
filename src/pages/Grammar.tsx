import { useMemo, useState } from 'react';
import { LESSONS } from '../data/curriculum';
import { GRAMMAR_BY_ID, GRAMMAR_GROUP_LABELS, GRAMMAR_UNITS, type GrammarGroup } from '../data/grammar';
import { buildGrammarQuiz } from '../lib/grammar';
import { actions, useAppState } from '../lib/store';
import { PASS_THRESHOLD } from '../lib/quiz';
import { QuizResults, QuizRunner, type QuizResult } from '../components/Quiz';
import { He, SpeakButton } from '../components/Hebrew';
import { Icon } from '../components/Icon';
import { Theory } from './Lesson';

/** La grammatica di base è nel percorso delle lezioni (dalla 20): qui restano numeri, tempo e luoghi. */
const GROUPS: GrammarGroup[] = ['numeri', 'tempo', 'luoghi'];
const QUESTIONS = 12;

export function GrammarPage() {
  const { exams } = useAppState();
  return (
    <div className="fade-in stack">
      <div className="page-head">
        <div>
          <h1>Lingua e cultura</h1>
          <p>Dopo aver imparato a leggere: numeri, giorni, calendario e feste, luoghi e nomi. Ogni unità ha teoria, parole ed esercizi. La grammatica di base è nel <a href="#/lezioni">percorso</a>, dalla lezione 20.</p>
        </div>
      </div>
      {GROUPS.map((g) => (
        <section key={g}>
          <h2>{GRAMMAR_GROUP_LABELS[g]}</h2>
          <div className="grid grid-2">
            {GRAMMAR_UNITS.filter((u) => u.group === g).map((u) => {
              const r = exams[u.id];
              return (
                <a key={u.id} href={`#/grammatica/${u.id}`} className="card text-card" style={{ color: 'inherit' }}>
                  <div className="row">
                    <h3 style={{ margin: 0 }}>{u.title}</h3>
                    <span className="spacer" />
                    {r && <span className={`pill ${r.bestScore >= PASS_THRESHOLD ? 'pill-ok' : 'pill-warn'}`}>{r.bestScore}%</span>}
                  </div>
                  <He size="sm" className="text-preview">{u.subtitle}</He>
                  <p className="muted small" style={{ margin: 0 }}>{u.items.length} parole ed espressioni</p>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

type Tab = 'teoria' | 'parole' | 'esercizi';

export function GrammarUnitPage({ id }: { id: string }) {
  const { exams } = useAppState();
  const unit = GRAMMAR_BY_ID[id];
  const [tab, setTab] = useState<Tab>('teoria');
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const questions = useMemo(() => (unit ? buildGrammarQuiz(unit, QUESTIONS, Math.random) : []), [unit, round]);

  if (!unit) return <div className="empty">Unità non trovata. <a href="#/grammatica">Torna a Lingua e cultura</a></div>;

  const lesson = LESSONS.find((l) => l.grammar === unit.id);
  if (lesson) return <div className="card empty"><h2>{unit.title}</h2><p>Questa unità fa parte del percorso di studio.</p><a className="btn btn-primary" href={`#/lezioni/${lesson.id}`}>Vai alla lezione {lesson.id}</a></div>;

  if (result) {
    return (
      <QuizResults result={result} title={unit.title} passThreshold={PASS_THRESHOLD}
        onRetry={() => { setResult(null); setRound(round + 1); setRunning(true); }}>
        <a className="btn" href="#/grammatica">Tutte le unità</a>
      </QuizResults>
    );
  }
  if (running) {
    return (
      <QuizRunner key={round} questions={questions} mode="practice" title={unit.title}
        onExit={() => setRunning(false)}
        onFinish={(r) => { actions.exam(unit.id, r.pct, r.timeSec); setRunning(false); setResult(r); }} />
    );
  }

  const best = exams[unit.id]?.bestScore;
  const tabs: [Tab, string][] = [['teoria', 'Teoria'], ['parole', 'Parole'], ['esercizi', 'Esercizi']];
  return (
    <div className="fade-in stack">
      <a href="#/grammatica" className="small">← Lingua e cultura</a>
      <div className="page-head">
        <div>
          <h1>{unit.title}</h1>
          <p><He size="sm">{unit.subtitle}</He></p>
        </div>
        {best !== undefined && <span className={`pill ${best >= PASS_THRESHOLD ? 'pill-ok' : 'pill-warn'}`}>Migliore: {best}%</span>}
      </div>
      <div className="tabs" role="tablist">
        {tabs.map(([t, label]) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{label}</button>
        ))}
      </div>

      {tab === 'teoria' && <Theory blocks={unit.theory} />}

      {tab === 'parole' && (
        <div className="card">
          {unit.items.map((it) => (
            <div key={it.he} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--border, #0001)' }}>
              <He size="md">{it.he}</He>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div><b>{it.translit}</b></div>
                <div className="muted small">{it.it}</div>
              </div>
              <SpeakButton text={it.he} />
            </div>
          ))}
        </div>
      )}

      {tab === 'esercizi' && (
        <div className="card center">
          <Icon name="test" size={36} className="" />
          <h2>Mettiti alla prova</h2>
          <p className="muted">{QUESTIONS} domande con correzione immediata: significato, lettura e riconoscimento delle espressioni di questa unità.</p>
          <button className="btn btn-primary btn-lg" onClick={() => { setRound(round + 1); setRunning(true); }}>Inizia</button>
        </div>
      )}
    </div>
  );
}
