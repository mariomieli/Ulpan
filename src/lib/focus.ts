import { useSyncExternalStore } from 'react';

/**
 * Modalità concentrazione: attiva durante test ed esami. Nasconde i menu e chiede
 * conferma prima di lasciare la pagina, per non perdere una prova per un tocco sbagliato.
 */
let active = false;
const listeners = new Set<() => void>();

export function setFocusMode(on: boolean) {
  if (active === on) return;
  active = on;
  listeners.forEach((l) => l());
}

export function isFocusMode(): boolean {
  return active;
}

export function useFocusMode(): boolean {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => active,
    () => active,
  );
}

export const LEAVE_MESSAGE = 'Vuoi davvero uscire dalla prova? Le risposte date finora andranno perse.';
