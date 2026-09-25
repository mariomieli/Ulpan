import { recentQuestions } from '../lib/recent';
import { useMemo, useState } from 'react';
import { EXAMS, PASS_THRESHOLD, buildPlacementBlock } from '../lib/quiz';
import { LESSONS, LESSON_BY_ID } from '../data/curriculum';
import { actions, isLessonUnlocked, useAppState } from '../lib/store';
import { QuizResults, QuizRunner, type QuizResult } from '../components/Quiz';
import { Icon } from '../components/Icon';
import { navigate } from '../lib/router';

function examUnlocked(state: ReturnType<typeof useAppState>, requires: number) {
  return state.settings.unlockAll || !!state.lessons[requires]?.passed;
}

export function TestsPage() {
  const state = useAppState();
  return (
    <div className="fade-in stack">
      <div className="page-head">
        <div>
          <h1>Test ed esami</h1>
          <p>Verifica cosa hai imparato. I test di lezione sbloccano il percorso; gli esami certificano le tue abilità complessive.</p>
        </div>
      </div>

      <a className="card row" href="#/test/ingresso" style={{ color: 'inherit' }}>
        <Icon name="test" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0 }}>Test d’ingresso</h3>
          <p className="muted small" style={{ margin: 0 }}>Sai già un po’ di ebraico? Scopri da quale lezione partire e sblocca quelle che conosci.</p>
        </div>
        <Icon name="arrowRight" />
      </a>

      <div className="card">
        <div className="card-title"><h2>Esami</h2><Icon name="trophy" /></div>
        <div className="grid grid-2">
          {EXAMS.map((e) => {
            const r = state.exams[e.id];
            const unlocked = examUnlocked(state, e.requires);
            return (
              <div key={e.id} className="card" style={{ margin: 0, boxShadow: 'none' }}>
                <div className="row">
                  <h3 style={{ margin: 0 }}>{e.title}</h3>
                  <span className="spacer" />
                  {r && <span className={`pill ${r.bestScore >= PASS_THRESHOLD ? 'pill-ok' : 'pill-warn'}`}>Migliore: {r.bestScore}%</span>}
                </div>
                <p className="muted small" style={{ margin: '6px 0 10px' }}>{e.description}</p>
                <p className="small muted">{e.count} domande{e.minutes ? ` · ${e.minutes} minuti` : ''}{r ? ` · ${r.attempts} tentativi` : ''}</p>
                {unlocked
                  ? <a className="btn btn-primary btn-sm" href={`#/test/${e.id}`}>Inizia</a>
                  : <span className="pill"><Icon name="lock" size={14} className="" /> Completa la lezione {e.requires}</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-title"><h2>Test delle lezioni</h2></div>
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Lezione</th><th>Stato</th><th>Migliore</th><th /></tr></thead>
            <tbody>
              {LESSONS.map((l) => {
                const p = state.lessons[l.id];
                const unlocked = isLessonUnlocked(state, l.id);
                return (
                  <tr key={l.id}>
                    <td><b>{l.id}.</b> {l.title}</td>
                    <td>{p?.passed ? <span className="pill pill-ok">Superato</span> : unlocked ? <span className="pill">Da fare</span> : <span className="pill"><Icon name="lock" size={12} className="" /> Bloccato</span>}</td>
                    <td>{p?.attempts ? `${p.bestScore}%` : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{unlocked && <a className="btn btn-sm" href={`#/lezioni/${l.id}`}>Apri</a>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ExamPage({ id }: { id: string }) {
  const state = useAppState();
  const exam = EXAMS.find((e) => e.id === id);
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro');
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const questions = useMemo(
    () => (exam ? exam.build(Math.random, { audio: false, typing: state.settings.typing, avoid: recentQuestions() }) : []),
    [exam, round, state.settings.typing],
  );

  if (!exam) return <div className="empty">Esame non trovato. <a href="#/test">Torna ai test</a></div>;
  if (!examUnlocked(state, exam.requires)) {
    return (
      <div className="card empty">
        <Icon name="lock" size={36} className="" />
        <h2>{exam.title}</h2>
        <p>Completa la lezione {exam.requires} per sbloccare questo esame.</p>
        <a className="btn btn-primary" href="#/lezioni">Vai alle lezioni</a>
      </div>
    );
  }

  if (phase === 'run') {
    return (
      <QuizRunner key={round} questions={questions} mode="exam" timeLimitSec={exam.minutes ? exam.minutes * 60 : undefined}
        onExit={() => { if (confirm('Vuoi davvero abbandonare l’esame?')) setPhase('intro'); }}
        onFinish={(r) => { actions.exam(exam.id, r.pct, r.timeSec); setResult(r); setPhase('done'); }} />
    );
  }
  if (phase === 'done' && result) {
    return (
      <QuizResults result={result} title={exam.title} passThreshold={PASS_THRESHOLD}
        onRetry={() => { setRound(round + 1); setPhase('run'); }}>
        <button className="btn" onClick={() => navigate('/test')}>Tutti i test</button>
      </QuizResults>
    );
  }
  const r = state.exams[exam.id];
  return (
    <div className="quiz fade-in">
      <a href="#/test" className="small">← Test ed esami</a>
      <div className="card center" style={{ marginTop: 10 }}>
        <Icon name="trophy" size={40} className="" />
        <h1 style={{ marginTop: 8 }}>{exam.title}</h1>
        <p className="muted">{exam.description}</p>
        <div className="grid grid-3" style={{ margin: '18px 0' }}>
          <div className="stat"><span className="stat-value">{exam.count}</span><span className="stat-label">domande</span></div>
          <div className="stat"><span className="stat-value">{exam.minutes ? `${exam.minutes}′` : '—'}</span><span className="stat-label">tempo limite</span></div>
          <div className="stat"><span className="stat-value">{PASS_THRESHOLD}%</span><span className="stat-label">per superarlo</span></div>
        </div>
        {r && <p>Miglior risultato: <b>{r.bestScore}%</b> · ultimo: {r.lastScore}% ({r.lastDate})</p>}
        <p className="small muted">Le risposte vengono corrette alla fine. Nessun suggerimento durante la prova.</p>
        <button className="btn btn-primary btn-lg" onClick={() => { setRound(round + 1); setPhase('run'); }}>Inizia l’esame</button>
      </div>
    </div>
  );
}

const PLACEMENT_PASS = 75;

/** Test d'ingresso: blocchi brevi dalla lezione 1 in su, fino al primo blocco non superato. */
export function PlacementPage() {
  const state = useAppState();
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro');
  const [lesson, setLesson] = useState(1);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [reached, setReached] = useState(0);
  const blocks = LESSONS.filter((l) => l.glyphs.length || l.vowels.length);
  const questions = useMemo(() => (phase === 'run' ? buildPlacementBlock(lesson, Math.random) : []), [phase, lesson]);

  const finishBlock = (r: QuizResult) => {
    const next = { ...scores, [lesson]: r.pct };
    setScores(next);
    const idx = blocks.findIndex((l) => l.id === lesson);
    if (r.pct >= PLACEMENT_PASS && idx < blocks.length - 1) {
      setLesson(blocks[idx + 1].id);
      return;
    }
    const passedUpTo = r.pct >= PLACEMENT_PASS ? lesson : lesson - 1;
    setReached(passedUpTo);
    if (passedUpTo > 0) actions.placement(passedUpTo, next);
    setPhase('done');
  };

  if (phase === 'run') {
    const idx = blocks.findIndex((l) => l.id === lesson);
    return (
      <div className="stack">
        <p className="center muted small" style={{ margin: 0 }}>Test d’ingresso · blocco {idx + 1} di {blocks.length}: {LESSON_BY_ID[lesson].title}</p>
        <QuizRunner key={lesson} questions={questions} mode="exam" onFinish={finishBlock}
          onExit={() => { if (confirm('Interrompere il test d’ingresso?')) setPhase('intro'); }} />
      </div>
    );
  }

  if (phase === 'done') {
    const nextLesson = Math.min(reached + 1, LESSONS[LESSONS.length - 1].id);
    return (
      <div className="quiz fade-in">
        <div className="card result-head">
          <Icon name="trophy" size={40} className="" />
          {reached > 0 ? (
            <>
              <h1 style={{ marginTop: 8 }}>Ottimo punto di partenza!</h1>
              <p>Hai dimostrato di conoscere il contenuto delle lezioni 1–{reached}: le trovi già completate, e i loro elementi entrano nel ripasso.</p>
            </>
          ) : (
            <>
              <h1 style={{ marginTop: 8 }}>Partiamo dall’inizio</h1>
              <p>Nessun problema: la lezione 1 ti guida passo passo, dalle prime lettere.</p>
            </>
          )}
          <a className="btn btn-primary btn-lg" href={`#/lezioni/${nextLesson}`}>Vai alla lezione {nextLesson}</a>
        </div>
      </div>
    );
  }

  const already = Object.values(state.lessons).some((l) => l.passed);
  return (
    <div className="quiz fade-in">
      <a href="#/test" className="small">← Test ed esami</a>
      <div className="card center" style={{ marginTop: 10 }}>
        <Icon name="test" size={40} className="" />
        <h1 style={{ marginTop: 8 }}>Test d’ingresso</h1>
        <p className="muted">Sai già un po’ di ebraico? Rispondi a brevi blocchi di domande, dalle prime lettere in su.
          Ci fermiamo al primo blocco difficile e sblocchiamo tutte le lezioni che conosci già.</p>
        <p className="small muted">Circa 5–10 minuti · correzione alla fine di ogni blocco · soglia {PLACEMENT_PASS}%</p>
        {already && <p className="small">Le lezioni già superate restano tali: il test può solo sbloccarne altre.</p>}
        <button className="btn btn-primary btn-lg" onClick={() => { setLesson(blocks[0].id); setScores({}); setPhase('run'); }}>Inizia</button>
      </div>
    </div>
  );
}
