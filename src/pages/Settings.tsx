import { useEffect, useRef, useState } from 'react';
import { actions, useAppState, type Settings } from '../lib/store';
import { hasHebrewVoice, speak, speechAvailable } from '../lib/speech';
import { He } from '../components/Hebrew';
import { AccountCard } from '../components/Account';

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
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const importData = async (f: File) => {
    try {
      const text = await f.text();
      if (!confirm('Importando questo file i progressi attuali verranno sostituiti su tutti i tuoi dispositivi. Continuare?')) return;
      actions.importJson(text);
      setMsg('Progressi importati correttamente.');
    } catch {
      setMsg('File non valido: non è un backup di Ulpan. Nessun dato è stato modificato.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="fade-in stack">
      <div className="page-head"><div><h1>Impostazioni</h1><p>Personalizza l’esperienza di studio.</p></div></div>

      <AccountCard />

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
            <label htmlFor="motion">Animazioni</label>
            <select id="motion" value={settings.motion} onChange={(e) => set({ motion: e.target.value as Settings['motion'] })}>
              <option value="system">Come il sistema</option>
              <option value="full">Complete</option>
              <option value="reduced">Ridotte</option>
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
        <label className="toggle"><input type="checkbox" checked={settings.sfx} onChange={(e) => set({ sfx: e.target.checked })} /> Effetti sonori per risposte e traguardi</label>
        <label className="toggle"><input type="checkbox" checked={settings.haptics} onChange={(e) => set({ haptics: e.target.checked })} /> Vibrazione (sui telefoni che la supportano)</label>
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
        <details className="voice-help" open={voice === false}>
          <summary>Non senti l’audio? Come installare la voce ebraica</summary>
          <ul className="small">
            <li><b>Samsung / Android</b>: Impostazioni → Gestione generale → Lingua → <i>Sintesi vocale</i>.
              Come motore scegli <b>Google</b> (non “Samsung TTS”, che non ha l’ebraico), poi ⚙️ accanto a Google →
              <i>Installa dati vocali</i> → <b>Ebraico (Israele)</b>. Riapri l’app.</li>
            <li>Su Android usa <b>Chrome</b>: Samsung Internet a volte non riproduce la sintesi vocale.</li>
            <li>Controlla che il <b>volume multimediale</b> sia alto e la modalità silenziosa non blocchi i suoni.</li>
            <li><b>iPhone/iPad</b>: Impostazioni → Accessibilità → Contenuti letti → Voci → Ebraico.</li>
            <li><b>Windows</b>: Impostazioni → Ora e lingua → Voce → aggiungi Ebraico. <b>Mac</b>: Impostazioni di Sistema → Accessibilità → Contenuti letti.</li>
          </ul>
          <p className="small muted" style={{ margin: 0 }}>Le domande di solo ascolto compaiono solo se c’è una voce ebraica.</p>
        </details>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Studio</h2>
        <div className="field" style={{ maxWidth: 320 }}>
          <label htmlFor="goal">Obiettivo giornaliero (risposte)</label>
          <select id="goal" value={settings.dailyGoal} onChange={(e) => set({ dailyGoal: Number(e.target.value) })}>
            {[10, 20, 30, 50, 80, 120, 150, 200].map((n) => <option key={n} value={n}>{n}{n === 30 ? ' (consigliato)' : ''}</option>)}
          </select>
        </div>
        <label className="toggle"><input type="checkbox" checked={settings.typing} onChange={(e) => set({ typing: e.target.checked })} /> Includi domande a risposta scritta (traslitterazione)</label>
        <label className="toggle"><input type="checkbox" checked={settings.unlockAll} onChange={(e) => set({ unlockAll: e.target.checked })} /> Sblocca tutte le lezioni ed esami (per chi sa già leggere un po’)</label>
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>Dati</h2>
        <p className="muted small" style={{ margin: 0 }}>Esporta i progressi per farne un backup; l’importazione li sostituisce a quelli attuali di questo profilo.</p>
        <div className="row">
          <button className="btn" onClick={exportData}>Esporta progressi</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Importa progressi</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          <span className="spacer" />
          <button className="btn btn-danger" onClick={() => { if (confirm('Cancellare tutti i progressi di questo profilo? L’operazione non è reversibile.')) { actions.reset(); setMsg('Progressi azzerati.'); } }}>
            Azzera progressi
          </button>
        </div>
        {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
      </div>

      <p className="center small muted">Ulpan · fatto per imparare a leggere l’ebraico con metodo. · <a href="#/privacy">Privacy</a></p>
    </div>
  );
}
