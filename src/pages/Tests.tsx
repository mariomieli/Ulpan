import { recentQuestions } from '../lib/recent';
import { useMemo, useState } from 'react';
import { EXAMS, PASS_THRESHOLD, buildPlacementBlock, shuffle } from '../lib/quiz';
import { LESSONS, LESSON_BY_ID } from '../data/curriculum';
import { actions, isLessonUnlocked, useAppState } from '../lib/store';
import { QuizResults, QuizRunner, type QuizResult } from '../components/Quiz';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { navigate } from '../lib/router';

function examUnlocked(state: ReturnType<typeof useAppState>, requires: number) {
  return state.settings.unlockAll || !!state.lessons[requires]?.passed;
}

const EXAM_GLYPH: Record<string, string> = { alfabeto: 'א', nikud: 'אָ', lettura: 'ק', 'senza-nikud': 'ס', corsivo: 'ג', finale: 'ת' };

export function TestsPage() {
  const state = useAppState();
  const passed = LESSONS.filter((l) => state.lessons[l.id]?.passed).length;
  const current = LESSONS.find((l) => isLessonUnlocked(state, l.id) && !state.lessons[l.id]?.passed)?.id;
  return (
    <div className="tests-page">
      <PageHeader he="מִבְחָן" kicker="Verifica cosa hai imparato" title="Test ed esami">
        <span className="ph-note">I test di lezione sbloccano il percorso; gli esami certificano le tue abilità complessive.</span>
      </PageHeader>

      <div className="ts-list">
        <a className="ts-entry" href="#/test/ingresso">
          <span className="ts-ic" lang="he">א</span>
          <span className="ts-et"><b>Test d’ingresso</b><span>Sai già un po’ di ebraico? Scopri da quale lezione partire e sblocca quelle che conosci.</span></span>
          <span className="ts-arrow" aria-hidden="true">→</span>
        </a>

        <section className="ts-sec">
          <b className="ts-h">Esami</b>
          <div className="ts-exams">
            {EXAMS.map((e) => {
              const r = state.exams[e.id];
              const unlocked = examUnlocked(state, e.requires);
              const pill = r ? `Migliore: ${r.bestScore}%` : unlocked ? 'Da fare' : `Lezione ${e.requires}`;
              const tone = r ? (r.bestScore >= PASS_THRESHOLD ? 'ok' : 'warn') : '';
              return (
                <a key={e.id} href={`#/test/${e.id}`} className={`ts-exam ${unlocked ? '' : 'locked'}`}>
                  <div className="ts-eh"><b>{e.title}</b><span className={`pill ${tone ? `pill-${tone}` : ''}`}>{!unlocked && <Icon name="lock" size={12} className="" />}{pill}</span></div>
                  <span className="ts-ed">{e.description}</span>
                  <span className="ts-em">{e.count} domande{e.minutes ? ` · ${e.minutes} minuti` : ''}{r ? ` · ${r.attempts} ${r.attempts === 1 ? 'tentativo' : 'tentativi'}` : ''}</span>
                </a>
              );
            })}
          </div>
        </section>

        <section className="ts-sec">
          <div className="ts-hh"><b className="ts-h">Test delle lezioni</b><span>{passed} di {LESSONS.length} superati</span></div>
          <div className="ts-lessons">
            {LESSONS.map((l) => {
              const p = state.lessons[l.id];
              const unlocked = isLessonUnlocked(state, l.id);
              const cls = p?.passed ? 'done' : l.id === current ? 'now' : unlocked ? 'todo' : 'locked';
              const inner = (
                <>
                  <div className="tl-top"><b>{l.id}</b><span aria-hidden="true">{p?.passed ? '✓' : !unlocked ? '–' : ''}</span></div>
                  <span className="tl-t">{l.title}</span>
                </>
              );
              return unlocked
                ? <a key={l.id} className={`ts-lesson ${cls}`} href={`#/lezioni/${l.id}`} aria-label={`Lezione ${l.id}: ${l.title}${p?.passed ? ', superata' : ''}`} title={p?.attempts ? `Migliore ${p.bestScore}%` : undefined}>{inner}</a>
                : <div key={l.id} className={`ts-lesson ${cls}`} aria-label={`Lezione ${l.id}: ${l.title}, bloccata`}>{inner}</div>;
            })}
          </div>
        </section>
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
      <div className="exam-intro">
        <a href="#/test" className="gram-back">← Test ed esami</a>
        <div className="ex-card">
          <span className="ex-ic" lang="he">{EXAM_GLYPH[exam.id] ?? 'א'}</span>
          <b className="ex-t">{exam.title}</b>
          <span className="ex-d">{exam.description}</span>
          <div className="ex-stats">
            <div><b>{exam.count}</b><span>domande</span></div>
            <div><b>{exam.minutes ? `${exam.minutes}′` : '—'}</b><span>tempo limite</span></div>
            <div><b>{PASS_THRESHOLD}%</b><span>per superarlo</span></div>
          </div>
          <span className="ex-lock"><Icon name="lock" size={16} className="" /> Completa la lezione {exam.requires} per sbloccarlo</span>
          <a className="btn btn-primary" href="#/lezioni">Vai alle lezioni</a>
        </div>
      </div>
    );
  }

  if (phase === 'run') {
    return (
      <QuizRunner key={round} questions={questions} mode="exam" title={exam.title} timeLimitSec={exam.minutes ? exam.minutes * 60 : undefined}
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
    <div className="exam-intro">
      <a href="#/test" className="gram-back">← Test ed esami</a>
      <div className="ex-card">
        <span className="ex-ic" lang="he">{EXAM_GLYPH[exam.id] ?? 'א'}</span>
        <b className="ex-t">{exam.title}</b>
        <span className="ex-d">{exam.description}</span>
        <div className="ex-stats">
          <div><b>{exam.count}</b><span>domande</span></div>
          <div><b>{exam.minutes ? `${exam.minutes}′` : '—'}</b><span>tempo limite</span></div>
          <div><b>{PASS_THRESHOLD}%</b><span>per superarlo</span></div>
        </div>
        {r && <span className="ex-n">Miglior risultato: <b>{r.bestScore}%</b> · ultimo: {r.lastScore}% ({r.lastDate})</span>}
        <span className="ex-n">Le risposte vengono corrette alla fine. Nessun suggerimento durante la prova.</span>
        <button type="button" className="ex-go" onClick={() => { setRound(round + 1); setPhase('run'); }}>{r ? 'Riprova l’esame' : 'Inizia l’esame'}</button>
      </div>
    </div>
  );
}

const PLACEMENT_PASS = 75;

/** Test d'ingresso: blocchi brevi (due lezioni per blocco), fino al primo blocco non superato. */
export function PlacementPage() {
  const state = useAppState();
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro');
  const [block, setBlock] = useState(0);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [reached, setReached] = useState(0);
  const blocks = useMemo(() => {
    const withItems = LESSONS.filter((l) => l.glyphs.length || l.vowels.length);
    const out: number[][] = [];
    for (let i = 0; i < withItems.length; i += 2) out.push(withItems.slice(i, i + 2).map((l) => l.id));
    return out;
  }, []);
  const ids = blocks[block];
  const questions = useMemo(
    () => (phase === 'run' ? shuffle(ids.flatMap((id) => buildPlacementBlock(id, Math.random).slice(0, 4)), Math.random) : []),
    [phase, ids],
  );

  const finishBlock = (r: QuizResult) => {
    const next = { ...scores };
    for (const id of ids) next[id] = r.pct;
    setScores(next);
    if (r.pct >= PLACEMENT_PASS && block < blocks.length - 1) {
      setBlock(block + 1);
      return;
    }
    const passedUpTo = r.pct >= PLACEMENT_PASS ? ids[ids.length - 1] : ids[0] - 1;
    setReached(passedUpTo);
    if (passedUpTo > 0) actions.placement(passedUpTo, next);
    setPhase('done');
  };

  if (phase === 'run') {
    const title = ids.map((id) => LESSON_BY_ID[id].title).join(' · ');
    return (
      <div className="stack">
        <QuizRunner key={block} questions={questions} mode="exam" onFinish={finishBlock}
          title={`Test d’ingresso · blocco ${block + 1} di ${blocks.length}: ${title}`}
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
              <p>Nessun problema: la lezione 1 ti guida passo passo, partendo dalle vocali.</p>
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
        <p className="muted">Sai già un po’ di ebraico? Rispondi a brevi blocchi di domande, dalle vocali in su.
          Ci fermiamo al primo blocco difficile e sblocchiamo tutte le lezioni che conosci già.</p>
        <p className="small muted">Circa 5–10 minuti · correzione alla fine di ogni blocco · soglia {PLACEMENT_PASS}%</p>
        {already && <p className="small">Le lezioni già superate restano tali: il test può solo sbloccarne altre.</p>}
        <button className="btn btn-primary btn-lg" onClick={() => { setBlock(0); setScores({}); setPhase('run'); }}>Inizia</button>
      </div>
    </div>
  );
}
