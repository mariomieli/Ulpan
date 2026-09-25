import { useMemo } from 'react';
import { badges } from '../lib/badges';
import { useAppState } from '../lib/store';

/** Medaglione esagonale: colorato se ottenuto, in scala di grigi con l'avanzamento se no. */
function Medal({ glyph, tone, earned, progress }: { glyph: string; tone: string; earned: boolean; progress: number }) {
  const len = [...glyph.replace(/[֑-ׇ]/g, '')].length;
  const hex = 'M32 3l25 14.5v29L32 61 7 46.5v-29z';
  return (
    <svg className={`medal medal-${tone} ${earned ? 'earned' : 'locked'}`} viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <path d={hex} className="medal-bg" />
      <path d="M32 9l20 11.6v22.8L32 55 12 43.4V20.6z" className="medal-inner" />
      {!earned && progress > 0 && (
        <path d={hex} className="medal-progress" pathLength={100} strokeDasharray={`${progress * 100} 100`} />
      )}
      <text x="32" y="34" textAnchor="middle" dominantBaseline="middle" className="medal-glyph"
        fontSize={len >= 3 ? 13 : len === 2 ? 17 : 22}>{glyph}</text>
    </svg>
  );
}

export function Badges() {
  const state = useAppState();
  const list = useMemo(() => badges(state), [state]);
  const earned = list.filter((b) => b.earned).length;
  return (
    <div className="card">
      <div className="card-title"><h2>Traguardi</h2><span className="pill pill-accent">{earned}/{list.length}</span></div>
      <ul className="badge-grid">
        {list.map((b) => (
          <li key={b.id} className={b.earned ? 'earned' : ''} title={b.description}>
            <Medal glyph={b.glyph} tone={b.tone} earned={b.earned} progress={b.progress} />
            <b>{b.title}</b>
            <span className="small muted">{b.earned ? 'Ottenuto' : b.description}</span>
            {!b.earned && <span className="sr-only">Avanzamento {Math.round(b.progress * 100)}%</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
