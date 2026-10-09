import { useEffect, useState, type CSSProperties } from 'react';
import { LESSONS, type Lesson } from '../data/curriculum';
import { isLessonUnlocked, useAppState } from '../lib/store';
import { JUST_PASSED_KEY, lessonFirstGlyph, lessonGlyphText, lessonKind, type LessonKind } from '../components/LessonArt';
import { PageHeader } from '../components/PageHeader';
import { Rich } from '../components/Hebrew';
import { navigate } from '../lib/router';

/** Spostamento orizzontale delle tappe: il sentiero ondeggia a serpentina. */
const OFF = [0, 60, 90, 60, 0, -60, -90, -60];

interface Geo { W: number; T: number; S: number; k: number; F: number; X: number; LF: number }
const DESKTOP: Geo = { W: 340, T: 78, S: 118, k: 1, F: 32, X: 110, LF: 15 };
const MOBILE: Geo = { W: 320, T: 64, S: 100, k: 0.78, F: 26, X: 9, LF: 14 };

/** Lezione conclusiva del corso: la lettura senza nikud viene dopo la grammatica. */
const isFinalReading = (l: Lesson) => l.id === LAST_LESSON;
const UNITS: { key: string; has: (l: Lesson) => boolean; title: string; glyph: string }[] = [
  { key: 'vowels', has: (l) => lessonKind(l) === 'vowels', title: 'Le vocali', glyph: 'אָ' },
  { key: 'letters', has: (l) => lessonKind(l) === 'letters', title: 'Le lettere', glyph: 'אב' },
  { key: 'rules', has: (l) => lessonKind(l) === 'rules' && !isFinalReading(l), title: 'Regole di lettura', glyph: 'בְּ' },
  { key: 'grammar', has: (l) => lessonKind(l) === 'grammar', title: 'Grammatica di base', glyph: 'הַ' },
  { key: 'plain', has: isFinalReading, title: 'Leggere senza nikud', glyph: 'ספר' },
];
const PHASE_NAME: Record<LessonKind, string> = { vowels: 'Vocali', letters: 'Lettere', rules: 'Regole di lettura', grammar: 'Grammatica' };

function toast(msg: string) {
  window.dispatchEvent(new CustomEvent('ulpan-toast', { detail: msg }));
}

function useIsMobile(): boolean {
  const q = '(max-width: 860px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

function UnitPath({ lessons, geo, offset, current, selected, justPassed, onPick }: {
  lessons: Lesson[]; geo: Geo; offset: number; current?: number; selected: number; justPassed: number | null; onPick: (l: Lesson) => void;
}) {
  const state = useAppState();
  const [shaking, setShaking] = useState<number | null>(null);
  const { W, T, S, k, F, X, LF } = geo;
  const cx = (i: number) => W / 2 + OFF[i % OFF.length] * k;
  const cy = (i: number) => i * S + T / 2;
  let d = `M ${cx(0)} ${cy(0)}`;
  for (let i = 1; i < lessons.length; i++) d += ` C ${cx(i - 1)} ${cy(i - 1) + S / 2}, ${cx(i)} ${cy(i) - S / 2}, ${cx(i)} ${cy(i)}`;
  const height = (lessons.length - 1) * S + T + 10;

  return (
    <div className="pth-wrap" style={{ width: W, height }}>
      <svg width={W} height={height} className="pth-line" aria-hidden="true">
        <path d={d} className="pth-base" />
        <path d={d} className="pth-dash" />
      </svg>
      {lessons.map((l, i) => {
        const unlocked = isLessonUnlocked(state, l.id);
        const passed = !!state.lessons[l.id]?.passed;
        const isNow = l.id === current;
        const isSel = l.id === selected;
        const tileLeft = OFF[i % OFF.length] * k <= 0;
        const lw = Math.round(tileLeft ? W + X - (cx(i) + T / 2) - 14 : cx(i) - T / 2 + X - 14);
        const cls = passed ? 'done' : isNow ? 'now' : 'todo';
        const pick = () => {
          // la tappa "INIZIA" e quella già selezionata aprono subito la lezione
          if (unlocked) { if (isNow || isSel) navigate(`/lezioni/${l.id}`); else onPick(l); return; }
          setShaking(l.id);
          setTimeout(() => setShaking(null), 500);
          toast(`Bloccata: supera prima il test della lezione ${l.id - 1}`);
        };
        const stopStyle = { left: cx(i) - T / 2, top: i * S, width: T, height: T, animationDelay: `${(offset + i) * 45}ms` } as CSSProperties;
        const labelStyle: CSSProperties = { width: lw, textAlign: tileLeft ? 'left' : 'right', [tileLeft ? 'left' : 'right']: T + 14 };
        return (
          <div key={l.id} className="pth-stop" style={stopStyle}>
            {isNow && <span className="pth-bubble" aria-hidden="true">INIZIA</span>}
            <button type="button" lang="he"
              className={`pth-tile ${cls} ${isSel ? 'sel' : ''} ${!unlocked ? 'locked' : ''} ${shaking === l.id ? 'shake' : ''} ${justPassed === l.id ? 'just-passed' : ''}`}
              style={{ width: T, height: T, borderRadius: Math.round(T * 0.3), fontSize: F }}
              onClick={pick} aria-label={`Lezione ${l.id}: ${l.title}${passed ? ', superata' : unlocked ? '' : ', bloccata'}`}
              aria-current={isNow ? 'step' : undefined} aria-pressed={isSel}>{lessonFirstGlyph(l)}</button>
            {(passed || !unlocked) && <span className={`pth-badge ${passed ? 'ok' : ''}`} aria-hidden="true">{passed ? '✓' : '–'}</span>}
            <div className="pth-label" style={labelStyle}>
              <span>Lezione {l.id}</span>
              <b style={{ fontSize: LF, color: passed || isNow ? 'var(--ink)' : 'var(--mute)' }}>{l.title}</b>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LessonsPage() {
  const state = useAppState();
  const isMobile = useIsMobile();
  const geo = isMobile ? MOBILE : DESKTOP;
  const done = LESSONS.filter((l) => state.lessons[l.id]?.passed).length;
  // la tappa a cui sei arrivato: la prima sbloccata non ancora superata
  const current = LESSONS.find((l) => isLessonUnlocked(state, l.id) && !state.lessons[l.id]?.passed)?.id;
  const [selId, setSelId] = useState<number | null>(null);
  const [justPassed, setJustPassed] = useState<number | null>(null);
  useEffect(() => {
    try {
      const v = Number(sessionStorage.getItem(JUST_PASSED_KEY));
      if (v) { setJustPassed(v); sessionStorage.removeItem(JUST_PASSED_KEY); }
    } catch { /* archiviazione non disponibile */ }
  }, []);

  const selected = LESSONS.find((l) => l.id === (selId ?? current ?? LESSONS[LESSONS.length - 1].id)) ?? LESSONS[0];
  const sPassed = !!state.lessons[selected.id]?.passed;
  const sNow = selected.id === current;
  const kind = lessonKind(selected);
  const status = sPassed ? 'Completata' : sNow ? 'In corso · prossima da fare' : 'Da fare';
  const stColor = sPassed ? 'var(--ok)' : sNow ? 'var(--gold-ink)' : 'var(--mute)';
  const cta = sPassed ? 'Rivedi la lezione' : sNow ? 'Continua la lezione' : 'Apri la lezione';
  const totalDeg = `${(done / LESSONS.length) * 100}%`;

  let offset = 0;
  return (
    <div className="path-page">
      <PageHeader he="דֶּרֶךְ" kicker={isMobile ? `${LESSONS.length} lezioni · ${UNITS.length} tappe` : `${LESSONS.length} tappe · ${UNITS.length} unità`} title="Il percorso">
        <div className="legend" aria-hidden="true">
          <span><i className="dot done" />Completata</span>
          <span><i className="dot now" />In corso</span>
          <span><i className="dot todo" />Da fare</span>
        </div>
      </PageHeader>
      <div className="path-mprog">
        <div className="bar-track"><div style={{ width: totalDeg }} /></div><span>{done} su {LESSONS.length}</span>
      </div>

      <div className="path-layout">
        <div className="path-units">
          {UNITS.map((u, ui) => {
            const lessons = LESSONS.filter(u.has);
            if (!lessons.length) return null;
            const doneHere = lessons.filter((l) => state.lessons[l.id]?.passed).length;
            const start = offset;
            offset += lessons.length;
            return (
              <section key={u.key} className="pth-unit" aria-label={`Unità ${ui + 1}: ${u.title}`}>
                <div className="pth-banner">
                  <span className="stripe" />
                  <div className="pth-bt">
                    <span className="k">Unità {ui + 1}</span>
                    <b>{u.title}</b>
                    <div className="pth-bp"><div className="bar-track thin"><div style={{ width: `${(doneHere / lessons.length) * 100}%` }} /></div><span>{doneHere} di {lessons.length} lezioni</span></div>
                  </div>
                  <span className="pth-bg" lang="he" dir="rtl">{u.glyph}</span>
                </div>
                <UnitPath lessons={lessons} geo={geo} offset={start} current={current} selected={selected.id} justPassed={justPassed}
                  onPick={(l) => setSelId(l.id)} />
              </section>
            );
          })}
        </div>

        <aside className="path-aside">
          <div className="pth-detail">
            <div className="pth-dg" dir="rtl" lang="he">{lessonGlyphText(selected)}</div>
            <div className="pth-dt">
              <span className="k">{PHASE_NAME[kind]} · {isMobile ? selected.id : `Lezione ${selected.id}`}</span>
              <h2>{selected.title}</h2>
              <span className="sub"><Rich text={selected.subtitle} /></span>
              <span className="st" style={{ color: stColor }}>{status}</span>
              <a className="pth-cta" href={`#/lezioni/${selected.id}`}>{cta}</a>
            </div>
          </div>
          <div className="pth-total">
            <div className="goal-ring" style={{ width: 64, height: 64, background: `conic-gradient(var(--okfill) ${totalDeg}, var(--sf2) 0)` }} role="img" aria-label={`${done} lezioni su ${LESSONS.length}`}>
              <div style={{ width: 50, height: 50 }}><b style={{ fontSize: 20 }}>{done}</b><span style={{ fontSize: 10 }}>su {LESSONS.length}</span></div>
            </div>
            <span className="pt"><b>Percorso totale</b><span>{LESSONS.length - done} lezioni al traguardo</span></span>
          </div>
        </aside>
      </div>
    </div>
  );
}
