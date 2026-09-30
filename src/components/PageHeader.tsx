import type { ReactNode } from 'react';

/** Intestazione comune delle pagine: parola ebraica, separatore, kicker e titolo; a destra i controlli di pagina. */
export function PageHeader({ he, kicker, title, children }: { he: string; kicker?: string; title: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="ph-main">
        <span className="ph-he" lang="he" dir="rtl">{he}</span>
        <span className="ph-sep" aria-hidden="true" />
        <div className="ph-text">
          {kicker && <span className="ph-kicker">{kicker}</span>}
          <h1>{title}</h1>
        </div>
      </div>
      {children && <div className="ph-side">{children}</div>}
    </header>
  );
}
