import { useEffect, useMemo, useRef, useState } from 'react';
import { BASE_LETTERS, CONFUSABLES, GLYPH_BY_ID, LETTER_VARIANTS, type Glyph } from '../data/alphabet';
import { WORDS } from '../data/words';
import { requirements } from '../lib/hebrew';
import { mastery } from '../lib/srs';
import { buildLetterNameQuiz } from '../lib/quiz';
import { recentQuestions } from '../lib/recent';
import { QuizResults, QuizRunner, type QuizResult } from '../components/Quiz';
import { TraceGlyph } from '../components/LessonVisuals';
import { speak } from '../lib/speech';
import { useAppState } from '../lib/store';
import { He, Rich, SpeakButton } from '../components/Hebrew';
import { Icon } from '../components/Icon';


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
  return <QuizRunner key={round} questions={questions} mode="practice" onFinish={setResult} onExit={onClose} title="Nomi delle lettere" />;
}

export function AlphabetPage() {
  const { srs, settings } = useAppState();
  const [open, setOpen] = useState<string | null>(null);
  const [showVariants, setShowVariants] = useState(false);
  const [names, setNames] = useState(false);
  const [sel, setSel] = useState('alef');
  const [drawKey, setDrawKey] = useState(0);

  const tiles: Glyph[] = BASE_LETTERS.flatMap((id) =>
    showVariants ? [GLYPH_BY_ID[id], ...(LETTER_VARIANTS[id] ?? []).map((v) => GLYPH_BY_ID[v])] : [GLYPH_BY_ID[id]]);
  const baseOf = (g: Glyph) => BASE_LETTERS.find((b) => b === g.id || LETTER_VARIANTS[b]?.includes(g.id)) ?? g.id;
  const g = GLYPH_BY_ID[sel];
  const pick = (x: Glyph) => {
    setSel(x.id);
    setDrawKey((k) => k + 1);
    if (settings.audio) speak(x.hebrewName, settings.speechRate);
  };

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
          <p>22 lettere, da destra a sinistra. Tocca una lettera per vederla disegnarsi e sentirne il nome.</p>
        </div>
        <label className="toggle">
          <input type="checkbox" checked={showVariants} onChange={(e) => setShowVariants(e.target.checked)} />
          Mostra varianti e forme finali
        </label>
      </div>
      <div className="alpha-layout">
        <aside className="card alpha-panel" aria-live="polite">
          <div className="alpha-trace"><TraceGlyph key={`${sel}-${drawKey}`} text={g.char} /></div>
          <div className="row" style={{ alignItems: 'center' }}>
            <h2 className="alpha-name">{g.name}</h2>
            <span className="pill pill-primary">{g.sound}</span>
            <span className="spacer" />
            <button className="round-btn" onClick={() => settings.audio && speak(g.hebrewName, settings.speechRate)} aria-label={`Ascolta il nome ${g.name}`}>
              <Icon name="speaker" size={20} className="" />
            </button>
          </div>
          <p className="alpha-desc"><Rich text={g.description} /></p>
          <div className="alpha-facts">
            <div className="fact gold"><span>Valore</span><b>{g.gematria}</b></div>
            <div className="fact green"><span>Si studia</span><b>Lez. {g.lesson}</b></div>
          </div>
          <button className="link-btn" onClick={() => setOpen(baseOf(g))}>Esempi e lettere simili →</button>
        </aside>
        <div className="alpha-grid" dir="rtl">
          {tiles.map((x, i) => {
            const studied = (srs[`g:${x.id}`]?.seen ?? 0) > 0;
            return (
              <button key={x.id} className={`atile ${sel === x.id ? 'sel' : studied ? 'studied' : ''}`} style={{ animationDelay: `${i * 25}ms` }}
                onClick={() => pick(x)} aria-pressed={sel === x.id} aria-label={`${x.name}, suono ${x.sound}${studied ? `, ${['nuova', 'in apprendimento', 'consolidata', 'padroneggiata'][mastery(srs[`g:${x.id}`])]}` : ''}`}>
                <span className="atile-char" lang="he">{x.char}</span>
                <span className="atile-name" dir="ltr">{x.name}</span>
              </button>
            );
          })}
        </div>
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
          <li>Il valore numerico (ghematria): le lettere si usano anche come numeri.</li>
        </ul>
      </div>
      {open && <LetterModal letterId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
