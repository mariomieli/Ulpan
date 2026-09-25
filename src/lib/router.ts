import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { isFocusMode, LEAVE_MESSAGE } from './focus';
import { reducedMotion } from './fx';

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => unknown };

/** Router minimale basato sull'hash (funziona anche su hosting statico). */
function current(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}

let skipNext = false;

export function useRoute(): string {
  const [path, setPath] = useState(current);
  useEffect(() => {
    const on = () => {
      if (skipNext) { skipNext = false; return; }
      // Durante una prova si chiede conferma prima di cambiare pagina (anche con "Indietro")
      if (isFocusMode() && !confirm(LEAVE_MESSAGE)) {
        skipNext = true;
        window.location.hash = path;
        return;
      }
      const go = () => { setPath(current()); window.scrollTo(0, 0); };
      // cambio di pagina con dissolvenza (View Transitions API) dove supportata
      const doc = document as ViewTransitionDoc;
      if (doc.startViewTransition && !reducedMotion()) doc.startViewTransition(() => flushSync(go));
      else go();
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, [path]);
  return path;
}

export function navigate(path: string) {
  window.location.hash = path;
}

/** Confronta un percorso con uno schema tipo "/lezioni/:id". */
export function match(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split('/').filter(Boolean);
  const a = path.split('?')[0].split('/').filter(Boolean);
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}
