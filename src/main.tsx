import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Caratteri ospitati sull'app (nessuna richiesta a Google): si scaricano solo i sottoinsiemi usati
import '@fontsource/frank-ruhl-libre/hebrew-400.css';
import '@fontsource/frank-ruhl-libre/hebrew-500.css';
import '@fontsource/frank-ruhl-libre/hebrew-700.css';
import '@fontsource/noto-sans-hebrew/hebrew-400.css';
import '@fontsource/noto-sans-hebrew/hebrew-700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import './styles.css';
import { initAuth } from './lib/auth';

initAuth();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Dopo un aggiornamento una scheda aperta può chiedere file che non esistono più: si ricarica (una volta)
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault();
  if (!sessionStorage.getItem('ulpan:reloaded')) {
    sessionStorage.setItem('ulpan:reloaded', '1');
    location.reload();
  }
});
window.addEventListener('load', () => setTimeout(() => sessionStorage.removeItem('ulpan:reloaded'), 10000));

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* offline non disponibile */ });
  });
}
