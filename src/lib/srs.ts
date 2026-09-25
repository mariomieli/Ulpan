/**
 * Ripetizione dilazionata (variante semplificata di SM-2).
 * Ogni elemento (lettera, vocale, parola) ha un intervallo che cresce
 * quando rispondi bene e si azzera quando sbagli.
 */
export interface SrsState {
  reps: number;
  interval: number; // giorni
  ease: number;
  due: number; // timestamp ms
  lapses: number;
  seen: number;
  correct: number;
}

const DAY = 24 * 60 * 60 * 1000;
const MIN = 60 * 1000;

export function newSrsState(now: number): SrsState {
  return { reps: 0, interval: 0, ease: 2.5, due: now, lapses: 0, seen: 0, correct: 0 };
}

/**
 * Aggiorna un elemento dopo una risposta. L'intervallo cresce solo quando
 * l'elemento è in scadenza; un errore lo riporta sempre in ripasso.
 */
export function review(state: SrsState, correct: boolean, now: number): SrsState {
  const s = { ...state, seen: state.seen + 1 };
  if (correct && state.reps > 0 && now < state.due) {
    // Risposta giusta prima della scadenza: conta nelle statistiche ma non allunga
    // l'intervallo (altrimenti 4 risposte in un giorno varrebbero "padroneggiato").
    s.correct += 1;
    return s;
  }
  if (correct) {
    s.correct += 1;
    s.reps += 1;
    if (s.reps === 1) s.interval = 1;
    else if (s.reps === 2) s.interval = 3;
    else s.interval = Math.round(s.interval * s.ease);
    s.ease = Math.min(3, s.ease + 0.05);
    s.due = now + s.interval * DAY;
  } else {
    s.reps = 0;
    s.lapses += 1;
    s.interval = 0;
    s.ease = Math.max(1.3, s.ease - 0.2);
    s.due = now + 10 * MIN;
  }
  return s;
}

export function isDue(state: SrsState, now: number): boolean {
  return state.due <= now;
}

export type MasteryLevel = 0 | 1 | 2 | 3;
export const MASTERY_LABELS = ['Nuovo', 'In apprendimento', 'Consolidato', 'Padroneggiato'] as const;

export function mastery(state: SrsState | undefined): MasteryLevel {
  if (!state || state.seen === 0) return 0;
  if (state.interval >= 14) return 3;
  if (state.interval >= 3) return 2;
  return 1;
}
