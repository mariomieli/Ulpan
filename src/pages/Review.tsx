import { listeningEnabled } from '../lib/speech';
import { useState } from 'react';
import { buildReview, type Question } from '../lib/quiz';
import { dueItems, maxUnlockedLesson, useAppState, weakestItems } from '../lib/store';
import { QuizResults, QuizRunner, type QuizResult } from '../components/Quiz';
import { Icon } from '../components/Icon';

const SESSION = 20;

export function ReviewPage() {
  const state = useAppState();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const due = dueItems(state, Date.now());
  const deckSize = Object.keys(state.srs).length;

  const start = (ids: string[]) => {
    setResult(null);
    setQuestions(buildReview(ids.slice(0, SESSION), maxUnlockedLesson(state), Math.random,
      { audio: listeningEnabled(state.settings.audio), typing: state.settings.typing }));
  };

  if (questions && !result) {
    return <QuizRunner questions={questions} mode="practice" onFinish={setResult} onExit={() => setQuestions(null)} />;
  }
  if (result) {
    return (
      <QuizResults result={result} title="Sessione di ripasso completata">
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
          <span className="he">א</span>
          <h2>Il tuo mazzo è vuoto</h2>
          <p>Studia la prima lezione: lettere, vocali e parole entreranno automaticamente nel ripasso.</p>
          <a className="btn btn-primary" href="#/lezioni/1">Inizia la lezione 1</a>
        </div>
      ) : (
        <div className="grid grid-2">
          <div className="card">
            <div className="card-title"><h2>Da ripassare oggi</h2><Icon name="repeat" /></div>
            <div className="stat"><span className="stat-value">{due.length}</span><span className="stat-label">elementi in scadenza su {deckSize} nel mazzo</span></div>
            <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 16 }} disabled={!due.length} onClick={() => start(due)}>
              {due.length ? `Inizia (${Math.min(SESSION, due.length)} domande)` : 'Tutto in pari per oggi ✓'}
            </button>
          </div>
          <div className="card">
            <div className="card-title"><h2>Ripasso libero</h2><Icon name="star" /></div>
            <p className="muted">Allenati sugli elementi in cui sbagli di più, anche se non sono in scadenza.</p>
            <button className="btn btn-block btn-lg" onClick={() => start(weakestItems(state, 15))}>Allenati sui punti deboli</button>
          </div>
        </div>
      )}
    </div>
  );
}
