import { recentQuestions, rememberQuestion } from '../lib/recent';
import { useEffect, useMemo, useState } from 'react';
import { WORDS, type Word, type WordCategory } from '../data/words';
import { LESSONS, sentencesUpTo, textLevel, wordLesson } from '../data/curriculum';
import { TEXTS, TEXT_CATEGORY_LABELS, type ReadingText, type TextCategory } from '../data/texts';
import { buildDictation, shuffle } from '../lib/quiz';
import { flashcardOrder } from '../lib/flashcards';
import { listeningEnabled } from '../lib/speech';
import { QuizResults, QuizRunner, type QuizResult } from '../components/Quiz';
import { stripNikud } from '../lib/hebrew';
import { ktivMale } from '../lib/ktiv';
import { syllabify } from '../lib/syllables';
import { actions, maxUnlockedLesson, useAppState } from '../lib/store';
import { He, Rich, SpeakButton } from '../components/Hebrew';
import { Icon } from '../components/Icon';

type Mode = 'parole' | 'frasi' | 'testi' | 'flashcard' | 'dettato';

const MODE_LABELS: Record<Mode, string> = { parole: 'Parole', frasi: 'Frasi', testi: 'Testi', flashcard: 'Flashcard', dettato: 'Dettato' };

const PAGE = 60;

const CATEGORIES = [...new Set(WORDS.map((w) => w.category))] as WordCategory[];

export function ReadingPage() {
  const state = useAppState();
  const unlocked = maxUnlockedLesson(state);
  const [mode, setMode] = useState<Mode>('parole');
  const [level, setLevel] = useState<number>(unlocked);
  const [cat, setCat] = useState<WordCategory | 'tutte'>('tutte');
  const [q, setQ] = useState('');
  const [nikud, setNikud] = useState(true);
  const [syl, setSyl] = useState(false);
  const [translit, setTranslit] = useState(false);
  const [meaning, setMeaning] = useState(true);
  const [shown, setShown] = useState(PAGE);
  // nuovi filtri: si riparte dal primo blocco
  const [filterKey, setFilterKey] = useState('');
  const key = `${level}|${cat}|${q}|${mode}`;
  if (key !== filterKey) { setFilterKey(key); setShown(PAGE); }

  const words = useMemo(() => WORDS.filter((w) =>
    wordLesson(w) <= level &&
    (cat === 'tutte' || w.category === cat) &&
    (!q || w.it.toLowerCase().includes(q.toLowerCase()) || w.translit.includes(q.toLowerCase()) || stripNikud(w.he).includes(stripNikud(q)))),
  [level, cat, q]);

  const show = (w: string) => (!nikud ? ktivMale(w) : syl ? syllabify(w) : w);
  const matches = (it: string, tr: string, he: string) =>
    !q || it.toLowerCase().includes(q.toLowerCase()) || tr.toLowerCase().includes(q.toLowerCase()) || stripNikud(he).includes(stripNikud(q));
  const sentences = sentencesUpTo(level).filter((x) => matches(x.it, x.translit, x.he));

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1>Lettura</h1>
          <p>Allenati a leggere parole, frasi e testi, e prova il dettato. Nascondi la traslitterazione per metterti alla prova, togli il nikud per la sfida finale.</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
          <button key={m} role="tab" aria-selected={mode === m} className={`tab ${mode === m ? 'active' : ''}`} onClick={() => setMode(m)}>
            {MODE_LABELS[m]}
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
        {mode !== 'dettato' && <label className="toggle"><input type="checkbox" checked={nikud} onChange={(e) => setNikud(e.target.checked)} /> Nikud</label>}
        {mode !== 'dettato' && nikud && <label className="toggle"><input type="checkbox" checked={syl} onChange={(e) => setSyl(e.target.checked)} /> Dividi in sillabe</label>}
        {mode !== 'flashcard' && mode !== 'dettato' && <>
          <label className="toggle"><input type="checkbox" checked={translit} onChange={(e) => setTranslit(e.target.checked)} /> Traslitterazione</label>
          <label className="toggle"><input type="checkbox" checked={meaning} onChange={(e) => setMeaning(e.target.checked)} /> Significato</label>
        </>}
      </div>
      {!nikud && mode !== 'dettato' && <p className="small muted">Senza nikud l’ebraico si scrive in <b>grafia piena</b>: si aggiungono ו per “o/u” e י per “i” (שֻׁלְחָן → שולחן), come su giornali e cartelli.</p>}
      {level > unlocked && <p className="small muted">Nota: stai guardando parole con lettere che non hai ancora studiato.</p>}

      {(mode === 'parole' || mode === 'frasi') && (
        <div className="toolbar">
          <input type="search" placeholder="Cerca (italiano, traslitterazione o ebraico)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      {mode === 'parole' && (
        <>
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
              {words.slice(0, shown).map((w) => <WordCard key={w.id} w={w} he={show(w.he)} translit={translit} meaning={meaning} />)}
            </div>
          )}
          {words.length > shown && (
            <div className="center" style={{ marginTop: 16 }}>
              <button className="btn" onClick={() => setShown(shown + PAGE)}>Mostra altre {Math.min(PAGE, words.length - shown)} parole</button>
            </div>
          )}
          <p className="small muted" style={{ marginTop: 12 }}>{words.length} parole · tocca una parola coperta per scoprirla.</p>
        </>
      )}

      {mode === 'frasi' && (
        <div className="card">
          {sentences.length === 0 && <div className="empty">{q ? 'Nessuna frase trovata.' : 'Le frasi compaiono man mano che impari nuove lettere.'}</div>}
          {sentences.slice(0, shown).map((s) => (
            <div className="sentence" key={s.id}>
              <He>{show(s.he)}</He>
              <div style={{ minWidth: 160 }}>
                {translit && <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{s.translit}</div>}
                {meaning && <div className="muted small">{s.it}</div>}
              </div>
              <SpeakButton text={s.he} />
            </div>
          ))}
          {sentences.length > shown && (
            <div className="center" style={{ marginTop: 12 }}>
              <button className="btn" onClick={() => setShown(shown + PAGE)}>Mostra altre frasi</button>
            </div>
          )}
          <p className="small muted" style={{ margin: '12px 0 0' }}>{sentences.length} frasi</p>
        </div>
      )}

      {mode === 'testi' && <TextsView level={level} fmt={show} translit={translit} meaning={meaning} />}
      {mode === 'dettato' && <Dictation key={level} level={level} />}
      {mode === 'flashcard' && <Flashcards key={level} words={WORDS.filter((w) => wordLesson(w) <= level)} fmt={show} />}
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

function Flashcards({ words, fmt }: { words: Word[]; fmt: (he: string) => string }) {
  const { srs } = useAppState();
  const build = () => flashcardOrder(words, srs, recentQuestions(), Date.now(), Math.random);
  const [deck, setDeck] = useState<Word[]>(build);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reverse, setReverse] = useState(false);
  const [score, setScore] = useState({ ok: 0, ko: 0 });
  const w = deck[i];

  // la carta mostrata diventa "vista di recente": la prossima sessione partirà da altre parole
  useEffect(() => { if (w) rememberQuestion(`flash:${w.id}`); }, [w]);

  if (!words.length || !w) return <div className="card empty">Nessuna parola disponibile.</div>;

  const next = (known: boolean) => {
    actions.answer([`w:${w.id}`], known, { selfRated: true });
    setScore((s) => (known ? { ...s, ok: s.ok + 1 } : { ...s, ko: s.ko + 1 }));
    setFlipped(false);
    let d = deck;
    // una parola sbagliata torna qualche carta più avanti, non subito
    if (!known) { d = [...deck]; d.splice(Math.min(deck.length, i + 6), 0, w); }
    if (i + 1 >= d.length) { setDeck(build()); setI(0); } else { setDeck(d); setI(i + 1); }
  };

  const hebrew = <He>{fmt(w.he)}</He>;

  return (
    <div className="quiz">
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="pill pill-ok">Lo sapevo: {score.ok}</span>
        <span className="pill pill-bad">Da rivedere: {score.ko}</span>
        <span className="spacer" />
        <span className="small muted">{i + 1}/{deck.length}</span>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="chips" role="radiogroup" aria-label="Direzione">
          <button type="button" role="radio" aria-checked={!reverse} className={`chip ${!reverse ? 'active' : ''}`} onClick={() => { setReverse(false); setFlipped(false); }}>Ebraico → italiano</button>
          <button type="button" role="radio" aria-checked={reverse} className={`chip ${reverse ? 'active' : ''}`} onClick={() => { setReverse(true); setFlipped(false); }}>Italiano → ebraico</button>
        </div>
        <span className="spacer" />
        <button className="btn btn-sm" onClick={() => { setDeck(build()); setI(0); setFlipped(false); }}>
          <Icon name="shuffle" size={16} className="" /> Nuovo mazzo
        </button>
      </div>
      <div className="card flash" onClick={() => setFlipped(true)} role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && setFlipped(true)}>
        {reverse ? <h2 style={{ margin: 0 }}>{w.it}</h2> : hebrew}
        {flipped ? (
          <div className="fade-in">
            {reverse && hebrew}
            <h2 style={{ color: 'var(--primary)', margin: '8px 0 0' }}>{w.translit}</h2>
            {!reverse && <p className="muted">{w.it}</p>}
            <SpeakButton text={w.he} label="Ascolta" />
          </div>
        ) : (
          <p className="muted">{reverse ? 'Come si dice in ebraico? Pensaci, poi tocca per controllare' : 'Leggila ad alta voce, poi tocca per controllare'}</p>
        )}
      </div>
      {flipped && (
        <div className="quiz-actions">
          <button className="btn btn-lg" onClick={() => next(false)}>Non la sapevo</button>
          <button className="btn btn-primary btn-lg" onClick={() => next(true)}>La sapevo</button>
        </div>
      )}
      <p className="center small muted">Prima le parole su cui sbagli, poi quelle nuove; quelle viste di recente arrivano per ultime.</p>
    </div>
  );
}

function TextsView({ level, fmt, translit, meaning }: { level: number; fmt: (he: string) => string; translit: boolean; meaning: boolean }) {
  const state = useAppState();
  const [open, setOpen] = useState<ReadingText | null>(null);
  const [cat, setCat] = useState<TextCategory | 'tutti'>('tutti');

  if (open) return <TextReader t={open} fmt={fmt} translit={translit} meaning={meaning} onBack={() => setOpen(null)} />;

  const list = TEXTS.filter((t) => cat === 'tutti' || t.category === cat)
    .sort((a, b) => textLevel(a) - textLevel(b));
  return (
    <>
      <div className="chips" style={{ marginBottom: 16 }}>
        <button className={`chip ${cat === 'tutti' ? 'active' : ''}`} onClick={() => setCat('tutti')}>Tutti</button>
        {(Object.keys(TEXT_CATEGORY_LABELS) as TextCategory[]).map((c) => (
          <button key={c} className={`chip ${cat === c ? 'active' : ''}`} onClick={() => setCat(c)}>{TEXT_CATEGORY_LABELS[c]}</button>
        ))}
      </div>
      <div className="grid grid-2">
        {list.map((t) => {
          const lvl = textLevel(t);
          const done = state.texts[t.id];
          return (
            <button key={t.id} className="card text-card" onClick={() => setOpen(t)}>
              <div className="row">
                <h3 style={{ margin: 0 }}>{t.title}</h3>
                <span className="spacer" />
                {done && <span className="pill pill-ok">Letto ✓</span>}
              </div>
              <He size="sm" className="text-preview">{t.lines[0].he}</He>
              <div className="row small">
                <span className="pill">{TEXT_CATEGORY_LABELS[t.category]}</span>
                <span className={`pill ${lvl <= level ? 'pill-primary' : 'pill-warn'}`}>{lvl <= level ? `Lezione ${lvl}` : `Dalla lezione ${lvl}`}</span>
                <span className="muted">{t.lines.length} righe</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function TextReader({ t, fmt, translit, meaning, onBack }: {
  t: ReadingText; fmt: (he: string) => string; translit: boolean; meaning: boolean; onBack: () => void;
}) {
  const state = useAppState();
  const [shown, setShown] = useState<Set<number>>(new Set());
  const done = state.texts[t.id];
  const toggle = (i: number) => setShown((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  return (
    <div className="fade-in">
      <button className="link-btn" onClick={onBack}>← Tutti i testi</button>
      <div className="card" style={{ marginTop: 8 }}>
        <div className="row">
          <h2 style={{ margin: 0 }}>{t.title}</h2>
          <span className="spacer" />
          <span className="pill">{TEXT_CATEGORY_LABELS[t.category]}</span>
        </div>
        {t.intro && <p className="muted small" style={{ marginTop: 8 }}><Rich text={t.intro} /></p>}
        <p className="small muted">Leggi ad alta voce, poi tocca una riga per controllare.</p>
        {t.lines.map((l, i) => {
          const open = shown.has(i);
          return (
            <div key={i} className="sentence text-line" role="button" tabIndex={0} onClick={() => toggle(i)}
              onKeyDown={(e) => e.key === 'Enter' && toggle(i)}>
              <He>{fmt(l.he)}</He>
              <div style={{ minWidth: 160 }}>
                {(translit || open) && <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{l.translit}</div>}
                {(meaning || open) && <div className="muted small">{l.it}</div>}
              </div>
              <SpeakButton text={l.he} />
            </div>
          );
        })}
        {t.questions && <Comprehension key={t.id} t={t} />}
        <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end' }}>
          {done
            ? <span className="pill pill-ok">Letto il {done.split('-').reverse().join('/')}</span>
            : <button className="btn btn-primary" onClick={() => actions.textRead(t.id)}>Ho finito di leggere (+20 XP)</button>}
        </div>
      </div>
    </div>
  );
}

function Comprehension({ t }: { t: ReadingText }) {
  // ordine delle risposte mescolato una volta per lettura; la giusta è sempre options[0] nei dati
  const orders = useMemo(() => t.questions!.map((q) => shuffle(q.options.map((_, i) => i), Math.random)), [t]);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const answered = Object.keys(picked).length;
  const right = Object.values(picked).filter((v) => v === 0).length;
  return (
    <section className="comprehension" aria-labelledby={`cq-${t.id}`}>
      <h3 id={`cq-${t.id}`}>Hai capito?</h3>
      {t.questions!.map((q, qi) => (
        <fieldset key={qi} className="cq">
          <legend><Rich text={q.q} /></legend>
          <div className="cq-options">
            {orders[qi].map((oi) => {
              const chosen = picked[qi] !== undefined;
              const state = !chosen ? '' : oi === 0 ? 'correct' : picked[qi] === oi ? 'wrong' : '';
              return (
                <button key={oi} type="button" className={`option ${state}`} disabled={chosen}
                  onClick={() => setPicked((p) => ({ ...p, [qi]: oi }))}>
                  <Rich text={q.options[oi]} />
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {answered === t.questions!.length && (
        <p className={`feedback ${right === answered ? 'ok' : 'bad'}`} role="status">
          {right === answered ? 'Perfetto, hai capito tutto!' : `${right === 1 ? '1 risposta giusta' : `${right} risposte giuste`} su ${answered}: rileggi il testo e tocca le righe per controllare.`}
        </p>
      )}
    </section>
  );
}

function Dictation({ level }: { level: number }) {
  const { settings } = useAppState();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const questions = useMemo(
    () => buildDictation(level, 10, Math.random, { audio: listeningEnabled(settings.audio), avoid: recentQuestions() }),
    [level, round, settings.audio],
  );
  if (result) {
    return <QuizResults result={result} title="Dettato completato" onRetry={() => { setResult(null); setRound(round + 1); }} />;
  }
  return (
    <>
      <p className="small muted center">
        {listeningEnabled(settings.audio)
          ? 'Ascolta la parola e ricomponila scegliendo le tessere giuste: attenzione a vocali e lettere simili!'
          : 'Ricomponi la parola scegliendo le tessere giuste. (Con una voce ebraica installata il dettato diventa ad ascolto.)'}
      </p>
      <QuizRunner key={round} questions={questions} mode="practice" onFinish={setResult} />
    </>
  );
}
