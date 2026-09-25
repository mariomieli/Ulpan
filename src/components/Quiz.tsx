import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Question } from '../lib/quiz';
import { gradeLabel } from '../lib/quiz';
import { translitMatches } from '../lib/hebrew';
import { actions, useAppState } from '../lib/store';
import { speak } from '../lib/speech';
import { He, SpeakButton } from './Hebrew';
import { Icon } from './Icon';

export interface AnswerRecord {
  question: Question;
  given: string | null;
  correct: boolean;
}

export interface QuizResult {
  answers: AnswerRecord[];
  correct: number;
  total: number;
  pct: number;
  timeSec: number;
}

interface Props {
  questions: Question[];
  /** practice: correzione immediata; exam: correzione alla fine. */
  mode: 'practice' | 'exam';
  timeLimitSec?: number;
  onFinish: (r: QuizResult) => void;
  onExit?: () => void;
}

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function QuizRunner({ questions, mode, timeLimitSec, onFinish, onExit }: Props) {
  const { settings } = useAppState();
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const startRef = useRef(Date.now());
  const [now, setNow] = useState(Date.now());
  const finishedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = questions[idx];
  const isLast = idx === questions.length - 1;
  const elapsed = (now - startRef.current) / 1000;
  const remaining = timeLimitSec ? Math.max(0, timeLimitSec - elapsed) : undefined;

  const finish = useCallback((all: AnswerRecord[]) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    // le domande senza risposta (tempo scaduto) contano come errori
    const answered = new Set(all.map((a) => a.question.key));
    const full = [
      ...all,
      ...questions.filter((x) => !answered.has(x.key)).map((x) => ({ question: x, given: null, correct: false })),
    ];
    const correct = full.filter((a) => a.correct).length;
    onFinish({
      answers: full, correct, total: questions.length,
      pct: questions.length ? Math.round((correct / questions.length) * 100) : 0,
      timeSec: Math.round((Date.now() - startRef.current) / 1000),
    });
  }, [questions, onFinish]);

  // timer
  useEffect(() => {
    if (!timeLimitSec) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [timeLimitSec]);

  useEffect(() => {
    if (remaining === 0) finish(answers);
  }, [remaining, answers, finish]);

  // audio automatico per le domande di ascolto
  useEffect(() => {
    if (q?.audioOnly && q.speak && settings.audio) speak(q.speak, settings.speechRate);
    if (q && !q.options) setTimeout(() => inputRef.current?.focus(), 30);
  }, [q, settings.audio, settings.speechRate]);

  const evaluate = useCallback((given: string): boolean => {
    if (!q) return false;
    if (q.accepted) return translitMatches(given, q.accepted);
    return given === q.answer;
  }, [q]);

  const commit = useCallback((given: string) => {
    if (!q) return;
    const correct = evaluate(given);
    actions.answer(q.itemIds, correct);
    const rec: AnswerRecord = { question: q, given, correct };
    const next = [...answers, rec];
    setAnswers(next);
    return next;
  }, [q, answers, evaluate]);

  const goNext = useCallback((all: AnswerRecord[]) => {
    if (isLast) { finish(all); return; }
    setIdx((i) => i + 1);
    setSelected(null);
    setTyped('');
    setPicked([]);
    setChecked(false);
  }, [isLast, finish]);

  const choose = useCallback((value: string) => {
    if (checked) return;
    if (mode === 'practice') {
      setSelected(value);
      setChecked(true);
      commit(value);
      if (q?.speak && settings.audio && !q.audioOnly) speak(q.speak, settings.speechRate);
    } else {
      setSelected(value);
    }
  }, [checked, mode, commit, q, settings.audio, settings.speechRate]);

  const submitTyped = useCallback(() => {
    if (!typed.trim() || checked) return;
    if (mode === 'practice') {
      setChecked(true);
      commit(typed);
    } else {
      const all = commit(typed);
      if (all) goNext(all);
    }
  }, [typed, checked, mode, commit, goNext]);

  const composed = q?.compose ? picked.map((i) => q.compose!.tiles[i]).join('') : '';

  const submitCompose = useCallback(() => {
    if (!picked.length || checked) return;
    if (mode === 'practice') {
      setChecked(true);
      commit(composed);
      if (q?.speak && settings.audio) speak(q.speak, settings.speechRate);
    } else {
      const all = commit(composed);
      if (all) goNext(all);
    }
  }, [picked, checked, mode, commit, composed, goNext, q, settings.audio, settings.speechRate]);

  const pickTile = useCallback((i: number) => {
    if (checked || !q?.compose || picked.includes(i) || i >= q.compose.tiles.length) return;
    setPicked((p) => [...p, i]);
  }, [checked, q, picked]);

  const confirmExam = useCallback(() => {
    if (selected === null) return;
    const all = commit(selected);
    if (all) goNext(all);
  }, [selected, commit, goNext]);

  // scorciatoie da tastiera
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') return;
      if (q.compose && !checked) {
        if (/^[1-9]$/.test(e.key)) pickTile(Number(e.key) - 1);
        else if (e.key === 'Backspace') setPicked((p) => p.slice(0, -1));
        else if (e.key === 'Enter') { e.preventDefault(); submitCompose(); }
        return;
      }
      if (q.options && /^[1-9]$/.test(e.key)) {
        const o = q.options[Number(e.key) - 1];
        if (o) choose(o.value);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'practice' && checked) goNext(answers);
        else if (mode === 'exam') confirmExam();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [q, choose, mode, checked, goNext, answers, confirmExam, pickTile, submitCompose]);

  if (!q) return null;
  const last = answers[answers.length - 1];
  const showFeedback = mode === 'practice' && checked && last?.question.key === q.key;

  const optionClass = (value: string) => {
    if (!showFeedback) return selected === value ? 'option selected' : 'option';
    if (value === q.answer) return 'option correct';
    if (value === selected) return 'option wrong';
    return 'option';
  };

  const correctLabel = q.options?.find((o) => o.value === q.answer);

  return (
    <div className="quiz fade-in" key={q.key}>
      <div className="quiz-top">
        {onExit && (
          <button className="btn btn-ghost btn-icon" onClick={onExit} aria-label="Esci dal quiz" title="Esci">
            <Icon name="x" size={20} className="" />
          </button>
        )}
        <div className="progress" role="progressbar" aria-valuenow={idx} aria-valuemax={questions.length}>
          <div style={{ width: `${(idx / questions.length) * 100}%` }} />
        </div>
        <span className="quiz-count">{idx + 1}/{questions.length}</span>
        {remaining !== undefined && (
          <span className={`timer ${remaining < 60 ? 'low' : ''}`}><Icon name="clock" size={16} className="" /> {fmtTime(remaining)}</span>
        )}
      </div>

      <div className="card quiz-card">
        <div className="quiz-prompt">{q.prompt}</div>

        {q.stimulus && (
          <div className="stimulus">
            <He size={q.stimulus.size}>{q.stimulus.text}</He>
            {q.speak && mode === 'practice' && showFeedback && <SpeakButton text={q.speak} label="Ascolta" />}
          </div>
        )}
        {q.audioOnly && q.speak && (
          <div className="stimulus">
            <button className="btn btn-primary btn-lg" onClick={() => speak(q.speak!, settings.speechRate)}>
              <Icon name="speaker" size={22} className="" /> Ascolta di nuovo
            </button>
          </div>
        )}

        {q.compose ? (
          <div className="compose">
            <div className={`compose-answer ${showFeedback ? (last.correct ? 'correct' : 'wrong') : ''}`} aria-live="polite">
              {composed ? <He size="lg">{composed}</He> : <span className="muted small">Tocca le tessere nell’ordine giusto (da destra a sinistra)</span>}
            </div>
            <div className="compose-tiles">
              {q.compose.tiles.map((t, i) => (
                <button key={i} className="option tile" disabled={showFeedback || picked.includes(i)} onClick={() => pickTile(i)}>
                  <span className="key">{i + 1}</span>
                  <He>{t}</He>
                </button>
              ))}
            </div>
            {!showFeedback && (
              <div className="quiz-actions">
                <button className="btn" disabled={!picked.length} onClick={() => setPicked((p) => p.slice(0, -1))}>⌫ Cancella</button>
                <button className="btn btn-primary" disabled={!picked.length} onClick={submitCompose}>
                  {mode === 'exam' ? (isLast ? 'Consegna' : 'Conferma') : 'Verifica'}
                </button>
              </div>
            )}
          </div>
        ) : q.options ? (
          <div className="options">
            {q.options.map((o, i) => (
              <button key={o.value} className={optionClass(o.value)} onClick={() => choose(o.value)}
                disabled={showFeedback} aria-pressed={selected === o.value}>
                <span className="key">{i + 1}</span>
                {o.hebrew ? <He>{o.label}</He> : o.label}
              </button>
            ))}
          </div>
        ) : (
          <form className="type-answer" onSubmit={(e) => { e.preventDefault(); if (showFeedback) goNext(answers); else submitTyped(); }}>
            <input
              ref={inputRef} type="text" value={typed} onChange={(e) => setTyped(e.target.value)}
              placeholder="es. shalom" autoComplete="off" autoCapitalize="off" spellCheck={false}
              readOnly={showFeedback} aria-label="La tua risposta"
              className={showFeedback ? (last.correct ? 'correct' : 'wrong') : ''}
            />
            {!showFeedback && <button className="btn btn-primary" type="submit" disabled={!typed.trim()}>Verifica</button>}
          </form>
        )}

        {showFeedback && (
          <div className={`feedback fade-in ${last.correct ? 'ok' : 'bad'}`}>
            <div>
              <strong>{last.correct ? 'Esatto!' : 'Non proprio…'}</strong>
              {!last.correct && (
                <div>Risposta corretta: {correctLabel?.hebrew || q.compose ? <He size="sm">{correctLabel?.label ?? q.answer}</He> : <b>{correctLabel?.label ?? q.answer}</b>}</div>
              )}
              <div className="small">{q.explanation}</div>
            </div>
            <button className="btn btn-primary" onClick={() => goNext(answers)} autoFocus>
              {isLast ? 'Risultati' : 'Continua'} <Icon name="arrowRight" size={18} className="" />
            </button>
          </div>
        )}

        {mode === 'exam' && q.options && (
          <div className="quiz-actions">
            <button className="btn btn-primary btn-lg" disabled={selected === null} onClick={confirmExam}>
              {isLast ? 'Consegna' : 'Conferma'} <Icon name="arrowRight" size={18} className="" />
            </button>
          </div>
        )}
      </div>
      <p className="center muted small" style={{ marginTop: 12 }}>
        Suggerimento: usa i tasti 1–4 per rispondere e Invio per continuare.
      </p>
    </div>
  );
}

export function QuizResults({ result, title, passThreshold, onRetry, children }: {
  result: QuizResult;
  title: string;
  passThreshold?: number;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  const grade = gradeLabel(result.pct);
  const passed = passThreshold === undefined ? undefined : result.pct >= passThreshold;
  const wrong = useMemo(() => result.answers.filter((a) => !a.correct), [result]);
  const labelOf = (a: AnswerRecord, value: string | null) => {
    if (value === null) return <i>nessuna risposta</i>;
    if (a.question.compose) return <span className="he-inline">{value}</span>;
    const o = a.question.options?.find((x) => x.value === value);
    if (o?.hebrew) return <span className="he-inline">{o.label}</span>;
    return <b>{o?.label ?? value}</b>;
  };

  return (
    <div className="quiz fade-in">
      <div className="card result-head">
        <p className="muted">{title}</p>
        <div className="result-score" style={{ color: `var(--${grade.tone})` }}>{result.pct}%</div>
        <p style={{ marginTop: 8 }}>
          <span className={`pill pill-${grade.tone}`}>{grade.label}</span>
          {passed !== undefined && (
            <span className={`pill ${passed ? 'pill-ok' : 'pill-bad'}`} style={{ marginLeft: 8 }}>
              {passed ? 'Test superato' : `Serve almeno ${passThreshold}%`}
            </span>
          )}
        </p>
        <p className="muted">{result.correct} risposte corrette su {result.total} · tempo {fmtTime(result.timeSec)}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {onRetry && <button className="btn" onClick={onRetry}><Icon name="repeat" size={18} className="" /> Riprova</button>}
          {children}
        </div>
      </div>

      {wrong.length > 0 && (
        <div className="card">
          <h3>Da rivedere ({wrong.length})</h3>
          <div className="review-list">
            {wrong.map((a) => (
              <div className="review-item" key={a.question.key}>
                {a.question.stimulus ? <He>{a.question.stimulus.text}</He> : a.question.audioOnly && a.question.speak ? <He>{a.question.speak}</He> : null}
                <div className="ans">
                  <div className="muted small">{a.question.prompt}</div>
                  <div>La tua risposta: {labelOf(a, a.given)}</div>
                  <div>Corretta: {a.question.accepted ? <b>{a.question.answer}</b> : labelOf(a, a.question.answer)}</div>
                  <div className="small muted">{a.question.explanation}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
