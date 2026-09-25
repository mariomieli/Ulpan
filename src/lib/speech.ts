/** Pronuncia tramite la sintesi vocale del browser (voce ebraica se disponibile). */
let voices: SpeechSynthesisVoice[] = [];

function supported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function loadVoices() {
  if (!supported()) return;
  voices = window.speechSynthesis.getVoices();
}

if (supported()) {
  loadVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function hebrewVoice(): SpeechSynthesisVoice | undefined {
  return voices.find((v) => v.lang?.toLowerCase().startsWith('he') || v.lang?.toLowerCase().startsWith('iw'));
}

export function speechAvailable(): boolean {
  return supported();
}

export function hasHebrewVoice(): boolean {
  loadVoices();
  return !!hebrewVoice();
}

/** Le domande di solo ascolto hanno senso solo se c'è davvero una voce ebraica. */
export function listeningEnabled(audioSetting: boolean): boolean {
  return audioSetting && hasHebrewVoice();
}

let warned = false;

/** Avviso (una volta per sessione) quando il dispositivo non ha una voce ebraica. */
function warnNoVoice() {
  if (warned) return;
  warned = true;
  window.dispatchEvent(new CustomEvent('ulpan-toast', {
    detail: 'Manca la voce ebraica: l’audio potrebbe non sentirsi.',
  }));
}

export function speak(text: string, rate = 0.8) {
  if (!supported()) return;
  const synth = window.speechSynthesis;
  loadVoices();
  // Voci già caricate ma nessuna ebraica: il browser resterebbe muto senza spiegazioni
  if (voices.length && !hebrewVoice()) warnNoVoice();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'he-IL';
  u.rate = rate;
  const v = hebrewVoice();
  if (v) u.voice = v;

  // Chrome su Android perde la frase se speak() segue subito cancel(): si lascia un attimo di respiro
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(() => { synth.resume(); synth.speak(u); }, 80);
  } else {
    synth.resume();
    synth.speak(u);
  }
}
