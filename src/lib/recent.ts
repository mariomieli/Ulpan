/** Memoria delle domande viste di recente (per non riproporle subito). */
const KEY = 'ulpan:recent';
const MAX = 150;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function recentQuestions(): Set<string> {
  return new Set(read());
}

export function rememberQuestion(key: string) {
  try {
    const list = read().filter((k) => k !== key);
    list.push(key);
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch {
    /* archiviazione non disponibile */
  }
}
