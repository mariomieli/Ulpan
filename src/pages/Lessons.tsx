import { useEffect, useState, type CSSProperties } from 'react';
import { LESSONS, type Lesson } from '../data/curriculum';
import { isLessonUnlocked, useAppState } from '../lib/store';
import { JUST_PASSED_KEY, lessonGlyphText, lessonKind, type LessonKind } from '../components/LessonArt';
import { Icon } from '../components/Icon';
import { navigate } from '../lib/router';

/** Spostamento orizzontale delle tappe: il sentiero ondeggia a serpentina. */
const OFF = [0, 60, 90, 60, 0, -60, -90, -60];
const STEP = 118;
const W = 340;
const TILE = 78;

const UNITS: { kind: LessonKind; title: string; glyph: string }[] = [
  { kind: 'vowels', title: 'Le vocali', glyph: 'אָ' },
  { kind: 'letters', title: 'Le lettere', glyph: 'אב' },
  { kind: 'rules', title: 'Regole di lettura', glyph: 'ספר' },
  { kind: 'grammar', title: 'Grammatica di base', glyph: 'הַ' },
];


function toast(msg: string) {
  window.dispatchEvent(new CustomEvent('ulpan-toast', { detail: msg }));
}

function UnitPath({ lessons, offset, current, justPassed }: { lessons: Lesson[]; offset: number; current?: number; justPassed: number | null }) {
  const state = useAppState();
  const [shaking, setShaking] = useState<number | null>(null);
  const cx = (i: number) => W / 2 + OFF[i % OFF.length];
  const cy = (i: number) => i * STEP + TILE / 2;
  let d = `M ${cx(0)} ${cy(0)}`;
  for (let i = 1; i < lessons.length; i++) d += ` C ${cx(i - 1)} ${cy(i - 1) + STEP / 2}, ${cx(i)} ${cy(i) - STEP / 2}, ${cx(i)} ${cy(i)}`;
  const height = (lessons.length - 1) * STEP + TILE + 10;

  return (
    <div className="path-wrap" style={{ height }}>
      <svg className="path-line" width={W} height={height} aria-hidden="true">
        <path d={d} className="path-base" />
        <path d={d} className="path-dash" />
      </svg>
      {lessons.map((l, i) => {
        const unlocked = isLessonUnlocked(state, l.id);
        const passed = !!state.lessons[l.id]?.passed;
        const isCurrent = l.id === current;
        const left = cx(i) - TILE / 2;
        const labelRight = OFF[i % OFF.length] <= 0;
        const text = lessonGlyphText(l);
        const style = { left, top: i * STEP, animationDelay: `${(offset + i) * 60}ms` } as CSSProperties;
        const open = () => {
          if (unlocked) { navigate(`/lezioni/${l.id}`); return; }
          setShaking(l.id);
          setTimeout(() => setShaking(null), 500);
          toast(`Bloccata: supera prima il test della lezione ${l.id - 1}`);
        };
        return (
          <div key={l.id} className="stop" style={style}>
            {isCurrent && <span className="stop-bubble" aria-hidden="true">INIZIA</span>}
            <button type="button"
              className={`stop-tile kind-${lessonKind(l)} ${unlocked ? '' : 'locked'} ${isCurrent ? 'current' : ''} ${shaking === l.id ? 'shake' : ''} ${justPassed === l.id ? 'just-passed' : ''}`}
              onClick={open} aria-label={`Lezione ${l.id}: ${l.title}${passed ? ', superata' : unlocked ? '' : ', bloccata'}`}
              aria-current={isCurrent ? 'step' : undefined}>
              <span className="stop-glyph" lang="he" data-long={[...text.replace(/[֑-ׇ]/g, '')].length > 2 || undefined}>{text}</span>
              {passed && <span className="stop-badge ok" aria-hidden="true"><Icon name="check" size={14} className="" /></span>}
              {!unlocked && <span className="stop-badge lock" aria-hidden="true"><Icon name="lock" size={12} className="" /></span>}
            </button>
            <div className={`stop-label ${labelRight ? 'right' : 'left'} kind-${lessonKind(l)}`} aria-hidden="true">
              <span>Lezione {l.id}</span>
              <b>{l.title}</b>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LessonsPage() {
  const state = useAppState();
  const done = LESSONS.filter((l) => state.lessons[l.id]?.passed).length;
  // la tappa a cui sei arrivato: la prima sbloccata non ancora superata
  const current = LESSONS.find((l) => isLessonUnlocked(state, l.id) && !state.lessons[l.id]?.passed)?.id;
  const [justPassed, setJustPassed] = useState<number | null>(null);
  useEffect(() => {
    try {
      const v = Number(sessionStorage.getItem(JUST_PASSED_KEY));
      if (v) { setJustPassed(v); sessionStorage.removeItem(JUST_PASSED_KEY); }
    } catch { /* archiviazione non disponibile */ }
  }, []);

  let offset = 0;
  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1>Il percorso</h1>
          <p>{LESSONS.length} tappe. Supera il test finale di ogni lezione (almeno 80%) per sbloccare la successiva.</p>
        </div>
        <span className="pill pill-primary">{done}/{LESSONS.length} completate</span>
      </div>
      {UNITS.map((u, ui) => {
        const lessons = LESSONS.filter((l) => lessonKind(l) === u.kind);
        const doneHere = lessons.filter((l) => state.lessons[l.id]?.passed).length;
        const start = offset;
        offset += lessons.length + 3;
        return (
          <section key={u.kind} className="unit" aria-label={`Unità ${ui + 1}: ${u.title}`}>
            <div className={`unit-banner kind-${u.kind}`} style={{ animationDelay: `${start * 60}ms` }}>
              <div>
                <span className="unit-kicker">Unità {ui + 1}</span>
                <h2>{u.title}</h2>
                <span className="unit-count">{doneHere}/{lessons.length} lezioni</span>
              </div>
              <span className="unit-glyph" lang="he" aria-hidden="true">{u.glyph}</span>
            </div>
            <UnitPath lessons={lessons} offset={start + 2} current={current} justPassed={justPassed} />
          </section>
        );
      })}
    </div>
  );
}
