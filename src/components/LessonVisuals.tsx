import { useEffect, useRef, useState } from 'react';
import { syllabify, SYLLABLE_SEP } from '../lib/syllables';
import { speak } from '../lib/speech';
import { useAppState } from '../lib/store';
import { reducedMotion } from '../lib/fx';
import { Icon } from './Icon';

/** Una lettera (o una sillaba) che si disegna: prima il contorno, poi il riempimento. */
export function TraceGlyph({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <svg className="trace" viewBox="0 0 200 180" role="img" aria-label={text}>
      <line x1="30" y1="140" x2="170" y2="140" className="trace-base" />
      <text x="100" y="138" textAnchor="middle" className="trace-text" style={{ animationDelay: `${delay}s, ${delay + 1.4}s` }}>{text}</text>
    </svg>
  );
}

/** Tessera della teoria: lettera che si disegna, suono, nome, ascolto e "ridisegna". */
export function TraceTile({ text, sound, name, speakText, delay = 0 }: { text: string; sound: string; name: string; speakText: string; delay?: number }) {
  const { settings } = useAppState();
  const [k, setK] = useState(0);
  return (
    <div className="card trace-tile">
      <TraceGlyph key={k} text={text} delay={k ? 0 : delay} />
      <div className="trace-meta">
        <span className="pill pill-primary">{sound}</span>
        <span className="muted">{name}</span>
      </div>
      <div className="row" style={{ justifyContent: 'center' }}>
        <button className="btn btn-sm" onClick={() => settings.audio && speak(speakText, settings.speechRate)}><Icon name="speaker" size={16} className="" /> Ascolta</button>
        <button className="btn btn-sm" onClick={() => setK(k + 1)}>Ridisegna</button>
      </div>
    </div>
  );
}

/**
 * Lettore di sillabe: la parola divisa in sillabe; "Leggi piano" le illumina una alla volta
 * (da destra a sinistra), poi pronuncia la parola intera.
 */
export function SyllableReader({ he, translit, note }: { he: string; translit: string; note?: React.ReactNode }) {
  const { settings } = useAppState();
  const words = syllabify(he).split(/\s+/).map((w) => w.split(SYLLABLE_SEP));
  const flat = words.flat();
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const play = () => {
    if (timer.current) clearTimeout(timer.current);
    const step = reducedMotion() ? 250 : 650;
    const tick = (i: number) => {
      setActive(i);
      if (i < flat.length) {
        if (settings.audio) speak(flat[i], settings.speechRate);
        timer.current = setTimeout(() => tick(i + 1), step);
      } else if (settings.audio) {
        speak(he, settings.speechRate);
      }
    };
    tick(0);
  };

  let n = -1;
  return (
    <div className="card syl-reader">
      <div className="syl-words" dir="rtl" lang="he">
        {words.map((w, wi) => (
          <span key={wi} className="syl-word">
            {w.map((s, si) => {
              n++;
              const state = n === active ? 'on' : n < active ? 'read' : '';
              return <span key={`${si}-${state}`} className={`rsyl ${state}`}>{s}</span>;
            })}
          </span>
        ))}
      </div>
      <div className="syl-foot">
        <span><b>{translit}</b></span>
        <button className="btn btn-primary btn-sm" onClick={play}><Icon name="speaker" size={16} className="" /> Leggi piano</button>
      </div>
      {note && <p className="small muted" style={{ margin: '8px 0 0' }}>{note}</p>}
    </div>
  );
}
