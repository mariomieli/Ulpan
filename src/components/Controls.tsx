import type { ReactNode } from 'react';

/** Controllo a segmenti: una sola voce attiva. */
export function Segmented<T extends string | number>({ options, value, onChange, label }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="seg-ctl" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Interruttore 46×26 (casella di controllo nativa, stilizzata). */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="sw">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
      <i aria-hidden="true" />
    </label>
  );
}

/** Riga di impostazione: etichetta e descrizione a sinistra, controllo a destra. */
export function SettingRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="set-row">
      <span className="set-l"><span>{label}</span>{hint && <span className="h">{hint}</span>}</span>
      <div className="set-c">{children}</div>
    </div>
  );
}
