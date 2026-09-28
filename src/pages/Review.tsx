import { recentQuestions } from '../lib/recent';
import { listeningEnabled } from '../lib/speech';
import { useEffect, useState } from 'react';
import { buildConfusableQuiz, buildReview, pickDailyItems, type Question } from '../lib/quiz';
import { dueItems, isLessonUnlocked, lessonItemIds, maxUnlockedLesson, useAppState, weakestItems } from '../lib/store';
import { LESSONS, glyphsUpTo } from '../data/curriculum';
import { QuizResults, QuizRunner, type QuizResult } from '../components/Quiz';
import { LetterArt } from '../components/LessonArt';
import { Icon } from '../components/Icon';
import { ReviewDeck } from '../components/ReviewDeck';

const SESSION = 20;

/** Sceglie a caso tra i punti deboli, mettendo in fondo quelli appena ripassati. */
function practicePick(ids: string[], n: number): string[] {
  const recent = recentQuestions();
  const seen = (id: string) => [...recent].some((k) => k.endsWith(`:${id.slice(2)}`) || k.includes(`:${id.slice(2)}+`) || k.includes(`+${id.slice(2)}`));
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  return [...shuffled.filter((id) => !seen(id)), ...shuffled.filter(seen)].slice(0, n);
}

export function ReviewPage({ autoStart }: { autoStart?: 'oggi' }) {
  const state = useAppState();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [title, setTitle] = useState('Sessione di ripasso completata');
  const [result, setResult] = useState<QuizResult | null>(null);
  const [deckIds, setDeckIds] = useState<string[] | null>(null);
  const [round, setRound] = useState(0);
  const due = dueItems(state, Date.now());
  const deckSize = Object.keys(state.srs).length;
  const opts = () => ({ audio: listeningEnabled(state.settings.audio), typing: state.settings.typing, avoid: recentQuestions() });

  // Il ripasso si fa a carte: si legge, si gira e ci si autovaluta
  const start = (ids: string[], doneTitle = 'Ripasso') => {
    setResult(null);
    setQuestions(null);
    setTitle(doneTitle);
    setRound((r) => r + 1);
    setDeckIds(ids.slice(0, SESSION));
  };
  // Le stesse carte come domande a scelta multipla
  const startQuiz = (ids: string[]) => {
    setDeckIds(null);
    setResult(null);
    setTitle('Ripasso con domande completato');
    setQuestions(buildReview(ids.slice(0, SESSION), maxUnlockedLesson(state), Math.random, opts()));
  };

  // Sessione di oggi: scadenze + punti deboli + qualche novità della lezione in corso
  const current = LESSONS.find((l) => isLessonUnlocked(state, l.id) && !state.lessons[l.id]?.passed);
  const fresh = current ? lessonItemIds(current.id).filter((id) => !state.srs[id]) : [];
  const todayIds = pickDailyItems(due, practicePick(weakestItems(state, 40), 10), fresh, 15);
  const startToday = () => start(todayIds, 'Sessione di oggi');

  // Lettere che si confondono, tra quelle già studiate
  const known = glyphsUpTo(maxUnlockedLesson(state));
  const confusable = buildConfusableQuiz(known, 12, Math.random);
  const startConfusable = () => {
    setResult(null);
    setTitle('Allenamento sulle lettere simili');
    setQuestions(buildConfusableQuiz(known, 12, Math.random));
  };

  useEffect(() => {
    if (autoStart === 'oggi' && todayIds.length) startToday();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart]);

  if (deckIds) {
    const quiz = deckIds;
    return (
      <div className="fade-in">
        <ReviewDeck key={round} ids={deckIds} title={title} onExit={() => setDeckIds(null)}>
          {due.length > 0
            ? <button className="btn btn-primary" onClick={() => start(due)}>Continua ({due.length})</button>
            : <button className="btn btn-primary" onClick={() => setDeckIds(null)}>Fatto</button>}
          <button className="btn" onClick={() => startQuiz(quiz)}>Mettiti alla prova con le domande</button>
        </ReviewDeck>
      </div>
    );
  }
  if (questions && !result) {
    return <QuizRunner questions={questions} mode="practice" onFinish={setResult} onExit={() => setQuestions(null)} title={title.replace(/ complet.*$/, '').replace('Sessione di ripasso', 'Ripasso')} />;
  }
  if (result) {
    return (
      <QuizResults result={result} title={title}>
        {due.length > 0
          ? <button className="btn btn-primary" onClick={() => start(due)}>Continua ({due.length})</button>
          : <button className="btn btn-primary" onClick={() => { setResult(null); setQuestions(null); }}>Fatto</button>}
      </QuizResults>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1>Ripasso</h1>
          <p>La ripetizione dilazionata ti ripropone ogni elemento proprio quando stai per dimenticarlo: pochi minuti al giorno bastano.</p>
        </div>
      </div>
      {deckSize === 0 ? (
        <div className="card empty">
          <LetterArt letters="אבג" />
          <h2>Il tuo mazzo è vuoto</h2>
          <p>Studia la prima lezione: lettere, vocali e parole entreranno automaticamente nel ripasso.</p>
          <a className="btn btn-primary" href="#/lezioni/1">Inizia la lezione 1</a>
        </div>
      ) : (
        <>
        <div className="card today-card">
          <div className="card-title"><h2>Sessione di oggi</h2><Icon name="star" /></div>
          <p className="muted" style={{ marginTop: 0 }}>Circa 10 minuti: ciò che è in scadenza, i tuoi punti deboli e qualche elemento nuovo{current ? ` della lezione ${current.id}` : ''}. Leggi la carta, girala e di’ quanto è stato facile.</p>
          <button className="btn btn-primary btn-lg" disabled={!todayIds.length} onClick={startToday}>
            Inizia la sessione ({todayIds.length} carte)
          </button>
        </div>
        <div className="grid grid-2" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="card-title"><h2>Da ripassare oggi</h2><Icon name="repeat" /></div>
            <div className="stat"><span className="stat-value">{due.length}</span><span className="stat-label">elementi in scadenza su {deckSize} nel mazzo</span></div>
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }} disabled={!due.length} onClick={() => start(due)}>
              {due.length ? `Inizia (${Math.min(SESSION, due.length)} carte)` : 'Tutto in pari per oggi ✓'}
            </button>
          </div>
          <div className="card">
            <div className="card-title"><h2>Ripasso libero</h2><Icon name="star" /></div>
            <p className="muted">Allenati sugli elementi in cui sbagli di più, anche se non sono in scadenza.</p>
            <button className="btn btn-block btn-lg" onClick={() => start(practicePick(weakestItems(state, 40), 15))}>Allenati sui punti deboli</button>
          </div>
          <div className="card">
            <div className="card-title"><h2>Lettere simili</h2><span className="he-inline" lang="he" aria-hidden="true">ב כ · ד ר</span></div>
            <p className="muted">Domande mirate sulle lettere che si confondono: ב/כ, ד/ר, ה/ח/ת, ו/ז/ן, ס/ם…</p>
            <button className="btn btn-block btn-lg" disabled={!confusable.length} onClick={startConfusable}>
              {confusable.length ? 'Allenati sulle lettere simili' : 'Disponibile quando conosci più lettere'}
            </button>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
