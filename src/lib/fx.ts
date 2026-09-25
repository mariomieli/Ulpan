/**
 * Effetti di feedback: movimento ridotto, vibrazione, suoni sintetizzati e coriandoli.
 * Tutto fatto a mano (nessuna libreria, nessun file audio): compatibile con la CSP dell'app.
 */
import { useEffect, useState } from 'react';
import { getState } from './store';

const REDUCE_MQ = '(prefers-reduced-motion: reduce)';

/** Movimento ridotto: dalle impostazioni dell'app o, in automatico, da quelle del sistema. */
export function reducedMotion(): boolean {
  const pref = getState().settings.motion;
  if (pref === 'reduced') return true;
  if (pref === 'full') return false;
  return typeof window !== 'undefined' && !!window.matchMedia?.(REDUCE_MQ).matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(reducedMotion);
  useEffect(() => {
    const mq = window.matchMedia?.(REDUCE_MQ);
    const on = () => setReduced(reducedMotion());
    mq?.addEventListener('change', on);
    return () => mq?.removeEventListener('change', on);
  }, []);
  return reduced;
}

export type FxKind = 'ok' | 'bad' | 'win' | 'combo';

const VIBRATION: Record<FxKind, number | number[]> = {
  ok: 12,
  bad: [30, 50, 30],
  combo: [10, 30, 10],
  win: [20, 40, 20, 40, 60],
};

/** Vibrazione breve (Android; su iOS non fa nulla). */
export function haptic(kind: FxKind) {
  const s = getState().settings;
  if (!s.haptics || reducedMotion()) return;
  try { navigator.vibrate?.(VIBRATION[kind]); } catch { /* non supportato */ }
}

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Una nota con inviluppo morbido (niente clic). */
function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.12) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(ac.destination);
  o.start(start);
  o.stop(start + dur + 0.02);
}

/** Suoni sintetizzati: due note per il giusto, una grave per l'errore, un arpeggio per i traguardi. */
export function sound(kind: FxKind) {
  const s = getState().settings;
  if (!s.sfx || !s.audio) return;
  const ac = audio();
  if (!ac) return;
  const t = ac.currentTime + 0.01;
  if (kind === 'ok') { tone(ac, 660, t, 0.12); tone(ac, 880, t + 0.08, 0.16); }
  else if (kind === 'bad') { tone(ac, 196, t, 0.22, 'triangle', 0.1); }
  else if (kind === 'combo') { tone(ac, 784, t, 0.1); tone(ac, 988, t + 0.07, 0.1); tone(ac, 1175, t + 0.14, 0.16); }
  else { [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, t + i * 0.09, 0.28, 'sine', 0.1)); }
}

/** Feedback completo di una risposta o di un traguardo. */
export function feedback(kind: FxKind) {
  haptic(kind);
  sound(kind);
}

/**
 * Coriandoli su canvas, circa 90 pezzi per 1,4 secondi; il canvas viene rimosso alla fine.
 * Alcuni pezzi sono lettere ebraiche. Con il movimento ridotto non fa nulla.
 */
export function confetti() {
  if (reducedMotion() || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext('2d');
  if (!c) { canvas.remove(); return; }
  c.scale(dpr, dpr);
  const css = getComputedStyle(document.documentElement);
  const colors = ['--primary', '--accent', '--ok', '--bad', '--primary-2']
    .map((v) => css.getPropertyValue(v).trim()).filter(Boolean);
  const letters = ['א', 'ב', 'ג', 'ש', 'ת', 'ל'];
  const parts = Array.from({ length: 90 }, (_, i) => ({
    x: w / 2 + (Math.random() - 0.5) * w * 0.3,
    y: h * 0.35,
    vx: (Math.random() - 0.5) * 11,
    vy: -Math.random() * 13 - 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    size: 6 + Math.random() * 6,
    color: colors[i % colors.length] || '#1F4E8C',
    letter: i % 9 === 0 ? letters[i % letters.length] : null,
  }));
  const t0 = performance.now();
  const DURATION = 1400;
  const frame = (now: number) => {
    const t = now - t0;
    if (t > DURATION || document.hidden) { canvas.remove(); return; }
    c.clearRect(0, 0, w, h);
    c.globalAlpha = t > DURATION - 400 ? (DURATION - t) / 400 : 1;
    for (const p of parts) {
      p.vy += 0.38;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.r);
      c.fillStyle = p.color;
      if (p.letter) {
        c.font = `700 ${p.size * 2.4}px 'Frank Ruhl Libre', serif`;
        c.fillText(p.letter, -p.size, p.size);
      } else {
        c.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      c.restore();
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** Numero che conta da 0 al valore finale (per punteggi e XP). */
export function useCountUp(target: number, ms = 700): number {
  const [n, setN] = useState(() => (reducedMotion() ? target : 0));
  useEffect(() => {
    if (reducedMotion()) { setN(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / ms);
      const eased = 1 - (1 - k) ** 3;
      setN(Math.round(target * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return n;
}
