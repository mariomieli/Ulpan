import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
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
