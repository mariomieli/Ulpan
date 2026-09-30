import { useMemo } from 'react';
import { badges } from '../lib/badges';
import { useAppState } from '../lib/store';

/** Medaglione esagonale: colorato se ottenuto, in scala di grigi con l'avanzamento se no. */
function Medal({ glyph, tone, earned, progress }: { glyph: string; tone: string; earned: boolean; progress: number }) {
  const len = [...glyph.replace(/[֑-ׇ]/g, '')].length;
  const hex = 'M32 4a28 28 0 1 1 0 56a28 28 0 1 1 0-56z';
  return (
    <svg className={`medal medal-${tone} ${earned ? 'earned' : 'locked'}`} viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <path d={hex} className="medal-bg" />
      <circle cx="32" cy="32" r="22" className="medal-inner" />
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
    <div className="pg-card">
      <div className="pg-ch"><b>Traguardi</b><span>{earned} di {list.length} ottenuti</span></div>
      <ul className="badge-grid">
        {list.map((b, i) => (
          <li key={b.id} className={b.earned ? 'earned' : ''} title={b.description} style={{ animationDelay: `${i * 70}ms` }}>
            <Medal glyph={b.glyph} tone={b.tone} earned={b.earned} progress={b.progress} />
            <b>{b.title}</b>
            <span className="small muted">{b.earned ? 'Ottenuto' : b.description}</span>
            {!b.earned && b.progress > 0 && <span className="badge-progress" aria-hidden="true"><i style={{ width: `${b.progress * 100}%` }} /></span>}
            {!b.earned && <span className="sr-only">Avanzamento {Math.round(b.progress * 100)}%</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
