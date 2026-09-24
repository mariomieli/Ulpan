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

export function speak(text: string, rate = 0.8) {
  if (!supported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'he-IL';
  u.rate = rate;
  const v = hebrewVoice();
  if (v) u.voice = v;
  synth.speak(u);
}
