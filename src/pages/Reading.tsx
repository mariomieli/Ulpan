import { useMemo, useState } from 'react';
import { WORDS, type Word, type WordCategory } from '../data/words';
import { LESSONS, sentencesUpTo, wordLesson } from '../data/curriculum';
import { stripNikud } from '../lib/hebrew';
import { actions, maxUnlockedLesson, useAppState } from '../lib/store';
import { He, SpeakButton } from '../components/Hebrew';
import { Icon } from '../components/Icon';

type Mode = 'parole' | 'frasi' | 'flashcard';

const CATEGORIES = [...new Set(WORDS.map((w) => w.category))] as WordCategory[];

export function ReadingPage() {
  const state = useAppState();
  const unlocked = maxUnlockedLesson(state);
  const [mode, setMode] = useState<Mode>('parole');
  const [level, setLevel] = useState<number>(unlocked);
  const [cat, setCat] = useState<WordCategory | 'tutte'>('tutte');
  const [q, setQ] = useState('');
  const [nikud, setNikud] = useState(true);
  const [translit, setTranslit] = useState(false);
  const [meaning, setMeaning] = useState(true);

  const words = useMemo(() => WORDS.filter((w) =>
    wordLesson(w) <= level &&
    (cat === 'tutte' || w.category === cat) &&
    (!q || w.it.toLowerCase().includes(q.toLowerCase()) || w.translit.includes(q.toLowerCase()) || stripNikud(w.he).includes(stripNikud(q)))),
  [level, cat, q]);

  const show = (w: string) => (nikud ? w : stripNikud(w));

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1>Lettura</h1>
          <p>Allenati a leggere parole e frasi. Nascondi la traslitterazione per metterti alla prova, togli il nikud per la sfida finale.</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {(['parole', 'frasi', 'flashcard'] as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={`tab ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
            {m === 'parole' ? 'Parole' : m === 'frasi' ? 'Frasi' : 'Flashcard'}
          </button>
        ))}
      </div>

      <div className="toolbar">
        <div className="field" style={{ gridAutoFlow: 'column', alignItems: 'center' }}>
          <label htmlFor="lvl">Fino alla lezione</label>
          <select id="lvl" value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            {LESSONS.map((l) => <option key={l.id} value={l.id}>{l.id} · {l.title}</option>)}
          </select>
        </div>
        <label className="toggle"><input type="checkbox" checked={nikud} onChange={(e) => setNikud(e.target.checked)} /> Nikud</label>
        {mode !== 'flashcard' && <>
          <label className="toggle"><input type="checkbox" checked={translit} onChange={(e) => setTranslit(e.target.checked)} /> Traslitterazione</label>
          <label className="toggle"><input type="checkbox" checked={meaning} onChange={(e) => setMeaning(e.target.checked)} /> Significato</label>
        </>}
      </div>
      {level > unlocked && <p className="small muted">Nota: stai guardando parole con lettere che non hai ancora studiato.</p>}

      {mode === 'parole' && (
        <>
          <div className="toolbar">
            <input type="search" placeholder="Cerca (italiano, traslitterazione o ebraico)…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="chips" style={{ marginBottom: 16 }}>
            <button className={`chip ${cat === 'tutte' ? 'active' : ''}`} onClick={() => setCat('tutte')}>Tutte</button>
            {CATEGORIES.map((c) => (
              <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          {words.length === 0 ? (
            <div className="card empty">Nessuna parola con questi filtri.</div>
          ) : (
            <div className="word-grid">
              {words.map((w) => <WordCard key={w.id} w={w} he={show(w.he)} translit={translit} meaning={meaning} />)}
            </div>
          )}
          <p className="small muted" style={{ marginTop: 12 }}>{words.length} parole · tocca una parola coperta per scoprirla.</p>
        </>
      )}

      {mode === 'frasi' && (
        <div className="card">
          {sentencesUpTo(level).length === 0 && <div className="empty">Le frasi compaiono man mano che impari nuove lettere.</div>}
          {sentencesUpTo(level).map((s) => (
            <div className="sentence" key={s.id}>
              <He>{show(s.he)}</He>
              <div style={{ minWidth: 160 }}>
                {translit && <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{s.translit}</div>}
                {meaning && <div className="muted small">{s.it}</div>}
              </div>
              <SpeakButton text={s.he} />
            </div>
          ))}
        </div>
      )}

      {mode === 'flashcard' && <Flashcards key={level} words={WORDS.filter((w) => wordLesson(w) <= level)} nikud={nikud} />}
    </div>
  );
}

function WordCard({ w, he, translit, meaning }: { w: Word; he: string; translit: boolean; meaning: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const r = revealed;
  return (
    <div className="word-card" role="button" tabIndex={0} onClick={() => setRevealed((x) => !x)}
      onKeyDown={(e) => e.key === 'Enter' && setRevealed((x) => !x)}>
      <He>{he}</He>
      <span className={`tr ${translit || r ? '' : 'hidden'}`}>{w.translit}</span>
      <span className={`it ${meaning || r ? '' : 'hidden'}`}>{w.it}</span>
      <div><SpeakButton text={w.he} className="btn btn-sm btn-ghost" /></div>
    </div>
  );
}

function Flashcards({ words, nikud }: { words: Word[]; nikud: boolean }) {
  const [order, setOrder] = useState(() => shuffleIdx(words.length));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [score, setScore] = useState({ ok: 0, ko: 0 });
  if (!words.length) return <div className="card empty">Nessuna parola disponibile.</div>;
  const w = words[(order[i % order.length] ?? 0) % words.length];

  const next = (known: boolean) => {
    actions.answer([`w:${w.id}`], known);
    setScore((s) => (known ? { ...s, ok: s.ok + 1 } : { ...s, ko: s.ko + 1 }));
    setFlipped(false);
    setI(i + 1);
  };

  return (
    <div className="quiz">
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="pill pill-ok">Lo sapevo: {score.ok}</span>
        <span className="pill pill-bad">Da rivedere: {score.ko}</span>
        <span className="spacer" />
        <button className="btn btn-sm" onClick={() => { setOrder(shuffleIdx(words.length)); setI(0); }}>
          <Icon name="shuffle" size={16} className="" /> Mescola
        </button>
      </div>
      <div className="card flash" onClick={() => setFlipped(true)} role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setFlipped(true)}>
        <He>{nikud ? w.he : stripNikud(w.he)}</He>
        {flipped ? (
          <div className="fade-in">
            <h2 style={{ color: 'var(--primary)', margin: '8px 0 0' }}>{w.translit}</h2>
            <p className="muted">{w.it}</p>
            <SpeakButton text={w.he} label="Ascolta" />
          </div>
        ) : (
          <p className="muted">Leggila ad alta voce, poi tocca per controllare</p>
        )}
      </div>
      {flipped && (
        <div className="quiz-actions">
          <button className="btn btn-lg" onClick={() => next(false)}>Non la sapevo</button>
          <button className="btn btn-primary btn-lg" onClick={() => next(true)}>La sapevo</button>
        </div>
      )}
    </div>
  );
}

function shuffleIdx(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
