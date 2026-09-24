import { useEffect, useRef, useState } from 'react';
import { actions, useAppState, type Settings } from '../lib/store';
import { hasHebrewVoice, speak, speechAvailable } from '../lib/speech';
import { He } from '../components/Hebrew';

export function SettingsPage() {
  const { settings } = useAppState();
  const [voice, setVoice] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Settings>) => actions.settings(patch);

  useEffect(() => {
    const check = () => setVoice(hasHebrewVoice());
    check();
    const t = setTimeout(check, 800);
    return () => clearTimeout(t);
  }, []);

  const exportData = () => {
    const blob = new Blob([actions.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ulpan-progressi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (f: File) => {
    try {
      actions.importJson(await f.text());
      setMsg('Progressi importati correttamente.');
    } catch {
      setMsg('File non valido: impossibile importare.');
    }
  };

  return (
    <div className="fade-in stack">
      <div className="page-head"><div><h1>Impostazioni</h1><p>Personalizza l’esperienza di studio.</p></div></div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Aspetto</h2>
        <div className="grid grid-3">
          <div className="field">
            <label htmlFor="theme">Tema</label>
            <select id="theme" value={settings.theme} onChange={(e) => set({ theme: e.target.value as Settings['theme'] })}>
              <option value="system">Automatico</option>
              <option value="light">Chiaro</option>
              <option value="dark">Scuro</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="font">Carattere ebraico</label>
            <select id="font" value={settings.font} onChange={(e) => set({ font: e.target.value as Settings['font'] })}>
              <option value="serif">Classico (Frank Ruhl)</option>
              <option value="sans">Moderno (Noto Sans)</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="scale">Dimensione ebraico: {Math.round(settings.fontScale * 100)}%</label>
            <input id="scale" type="range" min={0.8} max={1.4} step={0.1} value={settings.fontScale}
              onChange={(e) => set({ fontScale: Number(e.target.value) })} />
          </div>
        </div>
        <div className="center"><He size="md">שָׁלוֹם עוֹלָם</He></div>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Audio</h2>
        <label className="toggle"><input type="checkbox" checked={settings.audio} onChange={(e) => set({ audio: e.target.checked })} /> Pronuncia con sintesi vocale</label>
        <div className="field" style={{ maxWidth: 320 }}>
          <label htmlFor="rate">Velocità: {settings.speechRate.toFixed(1)}×</label>
          <input id="rate" type="range" min={0.5} max={1.2} step={0.1} value={settings.speechRate}
            onChange={(e) => set({ speechRate: Number(e.target.value) })} />
        </div>
        <div className="row">
          <button className="btn btn-sm" onClick={() => speak('שָׁלוֹם, מָה שְׁלוֹמְךָ?', settings.speechRate)} disabled={!speechAvailable()}>Prova la voce</button>
          {!speechAvailable() ? <span className="pill pill-bad">Sintesi vocale non supportata</span>
            : voice === false ? <span className="pill pill-warn">Nessuna voce ebraica installata</span>
            : voice ? <span className="pill pill-ok">Voce ebraica disponibile</span> : null}
        </div>
        {voice === false && (
          <p className="small muted" style={{ margin: 0 }}>
            Per ascoltare la pronuncia installa una voce ebraica nel sistema operativo (Windows: Impostazioni → Ora e lingua → Voce;
            macOS/iOS: Accessibilità → Contenuti letti → Voci; Android: Sintesi vocale Google → Ebraico). Chrome e Edge spesso la includono già.
            Le domande di ascolto compaiono solo con l’audio attivo.
          </p>
        )}
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Studio</h2>
        <div className="field" style={{ maxWidth: 320 }}>
          <label htmlFor="goal">Obiettivo giornaliero (risposte)</label>
          <select id="goal" value={settings.dailyGoal} onChange={(e) => set({ dailyGoal: Number(e.target.value) })}>
            {[10, 20, 30, 50, 80, 120].map((n) => <option key={n} value={n}>{n}{n === 30 ? ' (consigliato)' : ''}</option>)}
          </select>
        </div>
        <label className="toggle"><input type="checkbox" checked={settings.typing} onChange={(e) => set({ typing: e.target.checked })} /> Includi domande a risposta scritta (traslitterazione)</label>
        <label className="toggle"><input type="checkbox" checked={settings.unlockAll} onChange={(e) => set({ unlockAll: e.target.checked })} /> Sblocca tutte le lezioni ed esami (per chi sa già leggere un po’)</label>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Dati</h2>
        <p className="muted small" style={{ margin: 0 }}>I progressi sono salvati solo in questo browser. Esportali per fare un backup o spostarli su un altro dispositivo.</p>
        <div className="row">
          <button className="btn" onClick={exportData}>Esporta progressi</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importa progressi</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          <span className="spacer" />
          <button className="btn btn-danger" onClick={() => { if (confirm('Cancellare tutti i progressi? L’operazione non è reversibile.')) { actions.reset(); setMsg('Progressi azzerati.'); } }}>
            Azzera progressi
          </button>
        </div>
        {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
      </div>

      <p className="center small muted">Ulpan · fatto per imparare a leggere l’ebraico con metodo.</p>
    </div>
  );
}
