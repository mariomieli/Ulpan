import { useEffect, useMemo, useRef, useState } from 'react';
import { BASE_LETTERS, CONFUSABLES, GLYPH_BY_ID, LETTER_VARIANTS, type Glyph } from '../data/alphabet';
import { WORDS } from '../data/words';
import { requirements } from '../lib/hebrew';
import { mastery } from '../lib/srs';
import { buildLetterNameQuiz } from '../lib/quiz';
import { recentQuestions } from '../lib/recent';
import { QuizResults, QuizRunner, type QuizResult } from '../components/Quiz';
import { useAppState } from '../lib/store';
import { He, Rich, SpeakButton } from '../components/Hebrew';
import { Icon } from '../components/Icon';

const MASTERY_COLORS = ['var(--m0)', 'var(--m1)', 'var(--m2)', 'var(--m3)'];

function LetterModal({ letterId, onClose }: { letterId: string; onClose: () => void }) {
  const ids = [letterId, ...(LETTER_VARIANTS[letterId] ?? [])];
  const [sel, setSel] = useState(letterId);
  const g = GLYPH_BY_ID[sel];
  const examples = WORDS.filter((w) => requirements(w.he).glyphs.has(g.id)).slice(0, 6);
  const similar = (CONFUSABLES[g.id] ?? []).map((id) => GLYPH_BY_ID[id]);

  // Dialogo nativo: Esc chiude, il focus resta dentro e torna alla lettera alla chiusura
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog ref={ref} className="modal-dialog" aria-labelledby="letter-title" onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal fade-in">
        <div className="modal-head">
          <h2 id="letter-title" style={{ margin: 0 }}>{GLYPH_BY_ID[letterId].name}{ids.length > 1 ? ' e varianti' : ''}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Chiudi"><Icon name="x" className="" /></button>
        </div>
        {ids.length > 1 && (
          <div className="chips" style={{ marginBottom: 8 }}>
            {ids.map((id) => (
              <button key={id} className={`chip ${sel === id ? 'active' : ''}`} onClick={() => setSel(id)}>
                <span className="he-inline" lang="he">{GLYPH_BY_ID[id].char}</span> {GLYPH_BY_ID[id].name}
              </button>
            ))}
          </div>
        )}
        <div className="center">
          <He size="xl">{g.char}</He>
          <h3 style={{ marginBottom: 2 }}>{g.name} · <span className="he-inline" lang="he">{g.hebrewName}</span></h3>
          <p className="muted">Suono <b style={{ color: 'var(--primary)' }}>{g.sound}</b> · valore numerico {g.gematria}</p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <SpeakButton text={g.hebrewName} label="Ascolta il nome" />
          </div>
        </div>
        <dl className="kv">
          <dt>Pronuncia</dt><dd><Rich text={g.description} /></dd>
          <dt>Riconoscerla</dt><dd><Rich text={g.tip} /></dd>
          <dt>Lezione</dt><dd><a href={`#/lezioni/${g.lesson}`}>Lezione {g.lesson}</a></dd>
        </dl>
        <div className="variant-row">
          <div className="variant"><He>{g.char}</He><small>stampatello (serif)</small></div>
          <div className="variant"><span className="he" style={{ fontFamily: "'Noto Sans Hebrew', sans-serif", fontSize: '2.4rem', display: 'block' }}>{g.char}</span><small>moderno (sans)</small></div>
        </div>
        {similar.length > 0 && (
          <>
            <h3>Da non confondere con</h3>
            <div className="row">
              {similar.map((s) => (
                <div className="variant" key={s.id}><He>{s.char}</He><small>{s.name} · {s.sound}</small></div>
              ))}
            </div>
          </>
        )}
        {examples.length > 0 && (
          <>
            <h3 style={{ marginTop: 16 }}>Esempi</h3>
            <div className="row">
              {examples.map((w) => (
                <div className="variant" key={w.id}><He>{w.he}</He><small>{w.translit} · {w.it}</small></div>
              ))}
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}

function LetterNamesPractice({ onClose }: { onClose: () => void }) {
  const { settings } = useAppState();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const questions = useMemo(() => {
    const recent = recentQuestions();
    const qs = buildLetterNameQuiz(Math.random, { typing: settings.typing });
    return [...qs.filter((q) => !recent.has(q.key)), ...qs.filter((q) => recent.has(q.key))];
  }, [round, settings.typing]);
  if (result) {
    return <QuizResults result={result} title="Nomi delle lettere" onRetry={() => { setResult(null); setRound(round + 1); }}>
      <button className="btn" onClick={onClose}>Torna all’alfabeto</button>
    </QuizResults>;
  }
  return <QuizRunner key={round} questions={questions} mode="practice" onFinish={setResult} onExit={onClose} />;
}

export function AlphabetPage() {
  const { srs } = useAppState();
  const [open, setOpen] = useState<string | null>(null);
  const [showVariants, setShowVariants] = useState(true);
  const [names, setNames] = useState(false);

  const tiles: Glyph[] = BASE_LETTERS.flatMap((id) =>
    showVariants ? [GLYPH_BY_ID[id], ...(LETTER_VARIANTS[id] ?? []).map((v) => GLYPH_BY_ID[v])] : [GLYPH_BY_ID[id]]);
  const baseOf = (g: Glyph) => BASE_LETTERS.find((b) => b === g.id || LETTER_VARIANTS[b]?.includes(g.id)) ?? g.id;

  if (names) {
    return (
      <div className="fade-in">
        <button className="link-btn" onClick={() => setNames(false)}>← Alfabeto</button>
        <h1 style={{ marginTop: 6 }}>Leggi i nomi delle lettere</h1>
        <LetterNamesPractice onClose={() => setNames(false)} />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1>Alfabeto · <span className="he-inline" lang="he">אָלֶף־בֵּית</span></h1>
          <p>22 lettere, 5 forme finali e 4 varianti con puntino. Si legge da destra a sinistra. Tocca una lettera per i dettagli.</p>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={showVariants} onChange={(e) => setShowVariants(e.target.checked)} />
          Mostra varianti e forme finali
        </label>
      </div>
      <div className="letter-grid">
        {tiles.map((g) => (
          <button key={g.id} className="letter-tile" onClick={() => setOpen(baseOf(g))} aria-label={`${g.name}, suono ${g.sound}`}>
            <span className="mdot" style={{ background: MASTERY_COLORS[mastery(srs[`g:${g.id}`])] }} title="Padronanza" />
            <span className="num">{g.gematria}</span>
            <He>{g.char}</He>
            <div className="name">{g.name}</div>
            <div className="snd">{g.sound}</div>
          </button>
        ))}
      </div>
      <div className="card row" style={{ marginTop: 20 }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ margin: 0 }}>Leggi i nomi delle lettere</h3>
          <p className="muted small" style={{ margin: 0 }}><Rich text="Il primo esercizio di lettura dei metodi tradizionali: אָלֶף, בֵּית, גִּימֶל… Ideale quando conosci tutte le lettere." /></p>
        </div>
        <button className="btn btn-primary" onClick={() => setNames(true)}>Inizia</button>
      </div>
      <div className="card" style={{ marginTop: 20 }}>
        <h3>Da sapere</h3>
        <ul className="theory" style={{ margin: 0 }}>
          <li><Rich text="Le lettere בּ כּ פּ con il puntino (dagesh) si leggono b, k, p; senza puntino ב כ פ si leggono v, ch, f." /></li>
          <li><Rich text="Cinque lettere cambiano forma a fine parola: כ→ך, מ→ם, נ→ן, פ→ף, צ→ץ." /></li>
          <li><Rich text="שׁ con il punto a destra è “sh”, שׂ con il punto a sinistra è “s”." /></li>
          <li><Rich text="Suoni uguali, lettere diverse: ת/ט = t · כּ/ק = k · ח/כ = ch · ב/ו = v · ס/שׂ = s · א/ע = mute." /></li>
          <li>Il numero in alto a destra è il valore numerico (ghematria): le lettere si usano anche come numeri.</li>
        </ul>
      </div>
      {open && <LetterModal letterId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
