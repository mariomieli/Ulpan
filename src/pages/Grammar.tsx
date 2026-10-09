import { useMemo, useState } from 'react';
import { LESSONS } from '../data/curriculum';
import { GRAMMAR_BY_ID, GRAMMAR_GROUP_LABELS, GRAMMAR_UNITS, type GrammarGroup } from '../data/grammar';
import { buildGrammarQuiz } from '../lib/grammar';
import { actions, useAppState } from '../lib/store';
import { PASS_THRESHOLD } from '../lib/quiz';
import { QuizResults, QuizRunner, type QuizResult } from '../components/Quiz';
import { He, SpeakButton } from '../components/Hebrew';
import { PageHeader } from '../components/PageHeader';
import { Theory } from './Lesson';

/** La grammatica di base è nel percorso delle lezioni (dalla 19): qui restano numeri, tempo e luoghi. */
const GROUPS: GrammarGroup[] = ['numeri', 'tempo', 'luoghi'];
const QUESTIONS = 12;

/** Prima espressione ebraica del sottotitolo di un'unità (es. "אֶפֶס · אַחַת" → "אֶפֶס"). */
const firstHe = (subtitle: string) => subtitle.split(' · ')[0].trim();

export function GrammarPage() {
  const { exams } = useAppState();
  return (
    <div className="gram-page">
      <PageHeader he="תַּרְבּוּת" kicker="Dopo aver imparato a leggere" title="Lingua e cultura">
        <span className="ph-note">Numeri, giorni, calendario e feste, luoghi e nomi. Ogni unità ha teoria, parole ed esercizi. La grammatica di base è nel <a href="#/lezioni">percorso</a>, dalla lezione 19.</span>
      </PageHeader>
      <div className="gram-groups">
        {GROUPS.map((g) => {
          const units = GRAMMAR_UNITS.filter((u) => u.group === g);
          return (
            <section key={g} className="gram-group">
              <div className="gram-gh"><b>{GRAMMAR_GROUP_LABELS[g]}</b><span>{units.length} {units.length === 1 ? 'unità' : 'unità'}</span></div>
              <div className="gram-tiles">
                {units.map((u) => {
                  const r = exams[u.id];
                  return (
                    <a key={u.id} href={`#/grammatica/${u.id}`} className="gram-tile">
                      <span className="gt-he" lang="he" dir="rtl">{firstHe(u.subtitle)}</span>
                      <b>{u.title}</b>
                      <span className="gt-n">{u.items.length} parole ed espressioni</span>
                      {r && <span className={`pill gt-badge ${r.bestScore >= PASS_THRESHOLD ? 'pill-ok' : 'pill-warn'}`}>{r.bestScore}%</span>}
                    </a>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
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
    <div className="gram-page">
      <PageHeader he={firstHe(unit.subtitle)} kicker={GRAMMAR_GROUP_LABELS[unit.group]} title={unit.title}>
        {best !== undefined && <span className={`pill ${best >= PASS_THRESHOLD ? 'pill-ok' : 'pill-warn'}`}>Migliore: {best}%</span>}
      </PageHeader>
      <div className="gram-bar">
        <a href="#/grammatica" className="gram-back">← Lingua e cultura</a>
        <div className="tabs" role="tablist" style={{ margin: 0 }}>
          {tabs.map(([t, label]) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{label}</button>
          ))}
        </div>
      </div>

      {tab === 'teoria' && <Theory blocks={unit.theory} />}

      {tab === 'parole' && (
        <div className="gram-words">
          {unit.items.map((it) => (
            <div key={it.he} className="gram-word">
              <He size="md">{it.he}</He>
              <div className="gw-t"><b>{it.translit}</b><span>{it.it}</span></div>
              <SpeakButton text={it.he} />
            </div>
          ))}
        </div>
      )}

      {tab === 'esercizi' && (
        <div className="gram-try">
          <b>Mettiti alla prova</b>
          <span>{QUESTIONS} domande con correzione immediata: significato, lettura e riconoscimento delle espressioni di questa unità.</span>
          <button type="button" onClick={() => { setRound(round + 1); setRunning(true); }}>Inizia</button>
        </div>
      )}
    </div>
  );
}
