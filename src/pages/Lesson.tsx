import { LEAVE_MESSAGE } from '../lib/focus';
import { recentQuestions } from '../lib/recent';
import { listeningEnabled } from '../lib/speech';
import { useMemo, useState, type ReactNode } from 'react';
import { LESSON_BY_ID, LESSONS, coreWordsOfLesson, wordsOfLesson, wordsUpTo, glyphsUpTo, type TheoryBlock } from '../data/curriculum';
import { GLYPH_BY_ID, type Glyph } from '../data/alphabet';
import { VOWEL_BY_ID, type Vowel } from '../data/nikud';
import type { Word } from '../data/words';
import { requirements } from '../lib/hebrew';
import { buildLessonQuiz, canCombine, syllable, PASS_THRESHOLD, vowelDisplay } from '../lib/quiz';
import { actions, isLessonUnlocked, useAppState } from '../lib/store';
import { He, Rich, SpeakButton } from '../components/Hebrew';
import { Icon } from '../components/Icon';
import { QuizResults, QuizRunner, type QuizResult } from '../components/Quiz';
import { navigate } from '../lib/router';
import { JUST_PASSED_KEY, lessonKind } from '../components/LessonArt';
import { SyllableReader, TraceTile } from '../components/LessonVisuals';
import { showLogin, useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/supabase';

type Tab = 'teoria' | 'studio' | 'esercizi' | 'test';

const KIND_LABEL = { vowels: 'le vocali', letters: 'le lettere', rules: 'regole di lettura' } as const;

export function Theory({ blocks }: { blocks: TheoryBlock[] }) {
  const text = blocks.filter((b) => b.type !== 'example');
  const examples = blocks.filter((b): b is Extract<TheoryBlock, { type: 'example' }> => b.type === 'example');
  return (
    <>
      <div className="card theory">
        {text.map((b, i) => {
          switch (b.type) {
            case 'p': return <p key={i}><Rich text={b.text} /></p>;
            case 'tip': return <div key={i} className="tip"><span className="wiggle star-tip"><Icon name="star" size={20} className="star-icon" /></span><span><Rich text={b.text} /></span></div>;
            case 'list': return <ul key={i}>{b.items.map((it, j) => <li key={j}><Rich text={it} /></li>)}</ul>;
            default: return null;
          }
        })}
      </div>
      {examples.length > 0 && (
        <div className="syl-grid-2">
          {examples.map((b, i) => <SyllableReader key={i} he={b.he} translit={b.translit} note={b.note && <Rich text={b.note} />} />)}
        </div>
      )}
    </>
  );
}

/** Le novità della lezione come tessere che si disegnano (lettere, oppure vocali sulla א). */
function TraceTiles({ lesson }: { lesson: { glyphs: string[]; vowels: string[] } }) {
  const glyphs = lesson.glyphs.map((id) => GLYPH_BY_ID[id]).filter((g) => g.id !== 'alef' || !lesson.vowels.length);
  const tiles = glyphs.length
    ? glyphs.map((g) => ({ key: g.id, text: g.char, sound: g.sound, name: `${g.name}${g.finalOf ? ' · forma finale' : ''}`, speak: g.hebrewName }))
    : lesson.vowels.map((id) => VOWEL_BY_ID[id]).map((v) => ({ key: v.id, text: vowelDisplay(v), sound: v.sound, name: v.name, speak: vowelDisplay(v) }));
  if (!tiles.length) return null;
  return (
    <div className="trace-grid">
      {tiles.map((t, i) => <TraceTile key={t.key} text={t.text} sound={t.sound} name={t.name} speakText={t.speak} delay={i * 0.5} />)}
    </div>
  );
}

function examplesFor(filter: (w: Word) => boolean, lesson: number, n = 4): Word[] {
  return wordsUpTo(lesson).filter(filter).slice(0, n);
}

function GlyphStudy({ g, lesson }: { g: Glyph; lesson: number }) {
  const examples = examplesFor((w) => requirements(w.he).glyphs.has(g.id), Math.max(lesson, 10));
  return (
    <div className="study-card">
      <He size="xl">{g.char}</He>
      <h2 style={{ marginBottom: 0 }}>{g.name} <span className="he-inline muted">{g.hebrewName}</span></h2>
      <p className="muted">Suono: <b style={{ color: 'var(--primary)' }}>{g.sound}</b>{g.finalOf && ' · forma finale'}</p>
      <div className="row" style={{ justifyContent: 'center' }}>
        <SpeakButton text={g.hebrewName} label="Nome" />
        {!g.finalOf && g.id !== 'alef' && g.id !== 'ayin' && <SpeakButton text={g.char + 'ָ'} label="Suono" />}
      </div>
      <dl className="kv">
        <dt>Pronuncia</dt><dd><Rich text={g.description} /></dd>
        <dt>Come riconoscerla</dt><dd><Rich text={g.tip} /></dd>
        {g.finalForm && <><dt>Forma finale</dt><dd><He size="sm">{GLYPH_BY_ID[g.finalForm].char}</He></dd></>}
        <dt>Valore numerico</dt><dd>{g.gematria}</dd>
      </dl>
      {examples.length > 0 && (
        <>
          <hr />
          <p className="muted small">Parole che la contengono{lesson < 10 ? ' (alcune le leggerai più avanti)' : ''}:</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            {examples.map((w) => (
              <div className="variant" key={w.id}><He>{w.he}</He><small>{w.translit} · {w.it}</small></div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function VowelStudy({ v, lesson }: { v: Vowel; lesson: number }) {
  const consonants = glyphsUpTo(lesson).filter((g) => canCombine(g, v)).slice(0, 8);
  return (
    <div className="study-card">
      <He size="xl">{vowelDisplay(v)}</He>
      <h2 style={{ marginBottom: 0 }}>{v.name} <span className="he-inline muted">{v.hebrewName}</span></h2>
      <p className="muted">Si legge: <b style={{ color: 'var(--primary)' }}>{v.sound}</b></p>
      <p><Rich text={v.description} /></p>
      {consonants.length > 0 && (
        <>
          <p className="muted small">Con le lettere che conosci:</p>
          <div className="syl-grid" style={{ maxWidth: 520, margin: '0 auto' }}>
            {consonants.map((g) => {
              const s = syllable(g, v);
              return (
                <div key={g.id} className="syl"><He>{s.text}</He><small>{s.translit}</small></div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function WordsStudy({ words, extra }: { words: Word[]; extra: number }) {
  return (
    <div>
      <h2 className="center">Parole da leggere</h2>
      <p className="center muted">Le parole da imparare di questa lezione: prova a leggerle in autonomia, poi controlla la traslitterazione.</p>
      <div className="word-grid">
        {words.map((w) => <WordReveal key={w.id} w={w} />)}
      </div>
      {extra > 0 && <p className="center small muted" style={{ marginTop: 12 }}>Con le lettere che conosci puoi già leggere altre {extra} parole: le trovi nella sezione Lettura e negli esercizi di lettura.</p>}
    </div>
  );
}

function WordReveal({ w }: { w: Word }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="word-card" onClick={() => setShown(true)} role="button" tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && setShown(true)}>
      <He>{w.he}</He>
      <span className={`tr ${shown ? '' : 'hidden'}`}>{w.translit}</span>
      <span className={`it ${shown ? '' : 'hidden'}`}>{w.it}</span>
      {shown && <div><SpeakButton text={w.he} className="btn btn-sm btn-ghost" /></div>}
    </div>
  );
}

function Study({ lessonId, onDone }: { lessonId: number; onDone: () => void }) {
  const lesson = LESSON_BY_ID[lessonId];
  const words = coreWordsOfLesson(lessonId);
  const extraWords = wordsOfLesson(lessonId).length - words.length;
  const cards = useMemo(() => {
    const c: { key: string; node: ReactNode }[] = [
      ...lesson.glyphs.map((id) => ({ key: id, node: <GlyphStudy g={GLYPH_BY_ID[id]} lesson={lessonId} /> })),
      ...lesson.vowels.map((id) => ({ key: id, node: <VowelStudy v={VOWEL_BY_ID[id]} lesson={lessonId} /> })),
    ];
    const list = words.length ? words : wordsUpTo(lessonId).filter((w) => w.core).slice(-16);
    if (list.length) c.push({ key: 'words', node: <WordsStudy words={list} extra={extraWords} /> });
    return c;
  }, [lesson, lessonId, words]);
  const [i, setI] = useState(0);
  const last = i === cards.length - 1;

  return (
    <div className="card">
      <div className="dots" style={{ marginBottom: 16 }}>
        {cards.map((c, j) => <span key={c.key} className={j <= i ? 'on' : ''} />)}
      </div>
      <div key={cards[i].key} className="fade-in">{cards[i].node}</div>
      <div className="study-nav">
        <button className="btn" disabled={i === 0} onClick={() => setI(i - 1)}>
          <Icon name="arrowLeft" size={18} className="" /> Indietro
        </button>
        <span className="muted small">{i + 1} / {cards.length}</span>
        {last ? (
          <button className="btn btn-primary" onClick={onDone}>Agli esercizi <Icon name="arrowRight" size={18} className="" /></button>
        ) : (
          <button className="btn btn-primary" onClick={() => setI(i + 1)}>Avanti <Icon name="arrowRight" size={18} className="" /></button>
        )}
      </div>
    </div>
  );
}

function Practice({ lessonId, onTest }: { lessonId: number; onTest: () => void }) {
  const { settings } = useAppState();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const questions = useMemo(
    () => buildLessonQuiz(lessonId, 10, Math.random, { audio: listeningEnabled(settings.audio), typing: settings.typing, avoid: recentQuestions() }),
    [lessonId, round],
  );
  if (result) {
    return (
      <QuizResults result={result} title="Esercizio completato" onRetry={() => { setResult(null); setRound(round + 1); }}>
        <button className="btn btn-primary" onClick={onTest}>Vai al test <Icon name="arrowRight" size={18} className="" /></button>
      </QuizResults>
    );
  }
  return <QuizRunner key={round} questions={questions} mode="practice" onFinish={setResult} title={`Esercizi · lezione ${lessonId}`} />;
}

function LessonTest({ lessonId }: { lessonId: number }) {
  const state = useAppState();
  const auth = useAuth();
  const [phase, setPhase] = useState<'intro' | 'run' | 'done'>('intro');
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const questions = useMemo(
    () => buildLessonQuiz(lessonId, 20, Math.random, { audio: listeningEnabled(state.settings.audio), typing: state.settings.typing, avoid: recentQuestions() }, 'test'),
    [lessonId, round],
  );
  const p = state.lessons[lessonId];
  const nextLesson = LESSONS.find((l) => l.id === lessonId + 1);

  if (phase === 'run') {
    return (
      <QuizRunner key={round} questions={questions} mode="exam" title={`Test · lezione ${lessonId}`} onExit={() => { if (confirm(LEAVE_MESSAGE)) setPhase('intro'); }}
        onFinish={(r) => {
          actions.lessonTest(lessonId, r.pct, PASS_THRESHOLD); setResult(r); setPhase('done');
          // il percorso farà saltare la tappa appena superata
          if (r.pct >= PASS_THRESHOLD) { try { sessionStorage.setItem(JUST_PASSED_KEY, String(lessonId)); } catch { /* niente */ } }
        }} />
    );
  }
  if (phase === 'done' && result) {
    const passed = result.pct >= PASS_THRESHOLD;
    return (
      <QuizResults result={result} title={`Test della lezione ${lessonId}`} passThreshold={PASS_THRESHOLD}
        onRetry={() => { setRound(round + 1); setPhase('run'); }}>
        {passed && nextLesson && (
          <button className="btn" onClick={() => navigate(`/lezioni/${nextLesson.id}`)}>
            Lezione {nextLesson.id} <Icon name="arrowRight" size={18} className="" />
          </button>
        )}
        {passed && !nextLesson && <a className="btn btn-primary" href="#/test/finale">Esame finale</a>}
        {passed && <a className="btn btn-primary" href="#/lezioni">Continua il percorso <Icon name="arrowRight" size={18} className="" /></a>}
        {passed && cloudEnabled && auth.status === 'guest' && (
          <button className="btn" onClick={showLogin} title="Salva i progressi su tutti i dispositivi">
            Crea un account gratuito per salvare i progressi
          </button>
        )}
      </QuizResults>
    );
  }
  return (
    <div className="card center">
      <Icon name="test" size={40} className="" />
      <h2 style={{ marginTop: 8 }}>Test della lezione {lessonId}</h2>
      <p className="muted">{questions.length} domande · correzione alla fine · soglia {PASS_THRESHOLD}%</p>
      {p?.attempts ? <p>Miglior punteggio: <b>{p.bestScore}%</b> {p.passed && <span className="pill pill-ok">Superato</span>}</p> : null}
      <p className="small muted">Superando il test gli elementi della lezione entrano nel tuo ripasso quotidiano.</p>
      <button className="btn btn-primary btn-lg" onClick={() => { setRound(round + 1); setPhase('run'); }}>Inizia il test</button>
    </div>
  );
}

export function LessonPage({ id }: { id: number }) {
  const state = useAppState();
  const lesson = LESSON_BY_ID[id];
  const [tab, setTab] = useState<Tab>('teoria');
  const [lastId, setLastId] = useState(id);
  if (lastId !== id) { setLastId(id); setTab('teoria'); }

  if (!lesson) return <div className="empty">Lezione non trovata. <a href="#/lezioni">Torna alle lezioni</a></div>;
  if (!isLessonUnlocked(state, id)) {
    return (
      <div className="card empty">
        <Icon name="lock" size={36} className="" />
        <h2>Lezione bloccata</h2>
        <p>Supera il test della lezione {id - 1} per sbloccarla (oppure attiva “Sblocca tutte le lezioni” nelle impostazioni).</p>
        <a className="btn btn-primary" href={`#/lezioni/${id - 1}`}>Vai alla lezione {id - 1}</a>
      </div>
    );
  }
  const p = state.lessons[id];
  const tabs: { id: Tab; label: string; done?: boolean }[] = [
    { id: 'teoria', label: '1 · Teoria' },
    { id: 'studio', label: '2 · Studio', done: p?.studied },
    { id: 'esercizi', label: '3 · Esercizi' },
    { id: 'test', label: '4 · Test', done: p?.passed },
  ];

  return (
    <div className="fade-in">
      <div className="lesson-top">
        <a href="#/lezioni" className="quiz-close" aria-label="Torna al percorso" title="Torna al percorso"><Icon name="x" size={20} className="" /></a>
        <div className="segments" role="tablist" aria-label="Fasi della lezione">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={`seg ${tab === t.id ? 'active' : ''} ${t.done ? 'done' : ''}`} onClick={() => setTab(t.id)}>
              <span className="seg-bar"><i key={tab === t.id ? 'on' : 'off'} /></span>
              <span className="seg-label">{t.label.replace(/^\d · /, '')}{t.done && ' ✓'}</span>
            </button>
          ))}
        </div>
      </div>
      <span className="kicker">Lezione {id} · {KIND_LABEL[lessonKind(lesson)]}</span>
      <h1 className="lesson-title">{lesson.title}</h1>

      {tab === 'teoria' && (
        <div className="stack">
          <TraceTiles lesson={lesson} />
          <Theory blocks={lesson.theory} />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-gold btn-xl" onClick={() => setTab('studio')}>Studia {lesson.glyphs.length + lesson.vowels.length ? 'le novità' : 'le parole'} <Icon name="arrowRight" size={18} className="" /></button>
          </div>
        </div>
      )}
      {tab === 'studio' && <Study lessonId={id} onDone={() => { actions.studied(id); setTab('esercizi'); }} />}
      {tab === 'esercizi' && <Practice lessonId={id} onTest={() => setTab('test')} />}
      {tab === 'test' && <LessonTest lessonId={id} />}
    </div>
  );
}
