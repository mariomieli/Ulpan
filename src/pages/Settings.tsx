import { useEffect, useRef, useState } from 'react';
import { actions, useAppState, type Settings } from '../lib/store';
import { hasHebrewVoice, speak, speechAvailable } from '../lib/speech';
import { PageHeader } from '../components/PageHeader';
import { Segmented, SettingRow, Switch } from '../components/Controls';
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

  const previewNote = `${{ serif: 'Classico', sans: 'Moderno', cursive: 'Corsivo a mano' }[settings.font]} · ${Math.round(settings.fontScale * 100)}%${settings.dyslexia ? ' · modalità dislessia' : ''}`;

  return (
    <div className="settings-page">
      <PageHeader he="הַגְדָּרוֹת" kicker="Personalizza l’esperienza di studio" title="Impostazioni" />

      <div className="set-layout">
        <div className="set-main">
          <AccountCard />

          <section className="set-sec">
            <b>Aspetto</b>
            <SettingRow label="Tema" hint="Giorno, notte o come il sistema.">
              <Segmented label="Tema" value={settings.theme} onChange={(v) => set({ theme: v })}
                options={[{ value: 'system', label: 'Automatico' }, { value: 'light', label: 'Chiaro' }, { value: 'dark', label: 'Scuro' }]} />
            </SettingRow>
            <SettingRow label="Carattere ebraico" hint="Cambia tutte le lettere e le parole dell’app.">
              <Segmented label="Carattere ebraico" value={settings.font} onChange={(v) => set({ font: v })}
                options={[{ value: 'serif', label: 'Classico' }, { value: 'sans', label: 'Moderno' }, { value: 'cursive', label: 'Corsivo' }]} />
            </SettingRow>
            <SettingRow label="Animazioni">
              <Segmented label="Animazioni" value={settings.motion} onChange={(v) => set({ motion: v })}
                options={[{ value: 'system', label: 'Come il sistema' }, { value: 'full', label: 'Complete' }, { value: 'reduced', label: 'Ridotte' }]} />
            </SettingRow>
            <SettingRow label="Dimensione ebraico">
              <div className="set-range">
                <input id="scale" type="range" aria-label="Dimensione ebraico" min={0.8} max={1.4} step={0.1} value={settings.fontScale}
                  onChange={(e) => set({ fontScale: Number(e.target.value) })} />
                <b>{Math.round(settings.fontScale * 100)}%</b>
              </div>
            </SettingRow>
          </section>

          <section className="set-sec">
            <b>Audio</b>
            <SettingRow label="Pronuncia con sintesi vocale"><Switch label="Pronuncia con sintesi vocale" checked={settings.audio} onChange={(v) => set({ audio: v })} /></SettingRow>
            <SettingRow label="Effetti sonori" hint="Per risposte e traguardi."><Switch label="Effetti sonori per risposte e traguardi" checked={settings.sfx} onChange={(v) => set({ sfx: v })} /></SettingRow>
            <SettingRow label="Vibrazione" hint="Sui telefoni che la supportano."><Switch label="Vibrazione" checked={settings.haptics} onChange={(v) => set({ haptics: v })} /></SettingRow>
            <SettingRow label="Velocità della voce">
              <div className="set-range">
                <input id="rate" type="range" aria-label="Velocità della voce" min={0.5} max={1.2} step={0.1} value={settings.speechRate}
                  onChange={(e) => set({ speechRate: Number(e.target.value) })} />
                <b>{settings.speechRate.toFixed(1)}×</b>
              </div>
            </SettingRow>
            <SettingRow label="Voce ebraica" hint="Le domande di solo ascolto compaiono solo se c’è una voce ebraica.">
              <div className="voice-ctl">
                <span className={`vstate ${!speechAvailable() ? 'bad' : voice === false ? 'warn' : voice ? 'ok' : ''}`}>
                  <i />{!speechAvailable() ? 'Sintesi vocale non supportata' : voice === false ? 'Nessuna voce ebraica installata' : voice ? 'Voce ebraica disponibile' : 'Controllo…'}
                </span>
                <button type="button" onClick={() => speak('שָׁלוֹם, מָה שְׁלוֹמְךָ?', settings.speechRate)} disabled={!speechAvailable()}><span aria-hidden="true">▶</span> Ascolta</button>
              </div>
            </SettingRow>
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
            </details>
          </section>

          <section className="set-sec">
            <b>Accessibilità</b>
            <SettingRow label="Modalità dislessia" hint="Carattere più leggibile, più spazio tra lettere, parole e righe."><Switch label="Modalità dislessia" checked={settings.dyslexia} onChange={(v) => set({ dyslexia: v })} /></SettingRow>
            <SettingRow label="Colore dello sfondo" hint="Solo nel tema chiaro: meno abbagliante.">
              <Segmented label="Colore dello sfondo" value={settings.tint} onChange={(v) => set({ tint: v })}
                options={[{ value: 'none', label: 'Standard' }, { value: 'cream', label: 'Crema' }, { value: 'blue', label: 'Azzurro' }, { value: 'green', label: 'Verde' }]} />
            </SettingRow>
          </section>

          <section className="set-sec">
            <b>Studio</b>
            <SettingRow label="Obiettivo giornaliero" hint="Risposte al giorno.">
              <Segmented label="Obiettivo giornaliero" value={settings.dailyGoal} onChange={(v) => set({ dailyGoal: v })}
                options={[10, 20, 30, 50, 80, 120].map((n) => ({ value: n, label: String(n) }))} />
            </SettingRow>
            <SettingRow label="Avanza da solo" hint="Dopo una risposta giusta passa alla domanda seguente."><Switch label="Dopo una risposta giusta passa da solo alla domanda seguente" checked={settings.autoAdvance} onChange={(v) => set({ autoAdvance: v })} /></SettingRow>
            <SettingRow label="Risposta scritta" hint="Includi domande con traslitterazione."><Switch label="Includi domande a risposta scritta (traslitterazione)" checked={settings.typing} onChange={(v) => set({ typing: v })} /></SettingRow>
            <SettingRow label="Sblocca tutto" hint="Lezioni ed esami, per chi sa già leggere un po’."><Switch label="Sblocca tutte le lezioni ed esami" checked={settings.unlockAll} onChange={(v) => set({ unlockAll: v })} /></SettingRow>
          </section>

          <section className="set-sec">
            <b>Dati</b>
            <span className="set-note">Esporta i progressi per farne un backup; l’importazione li sostituisce a quelli attuali di questo profilo.</span>
            <div className="set-data">
              <button className="btn" onClick={exportData}>Esporta progressi</button>
              <button className="btn" onClick={() => fileRef.current?.click()}>Importa progressi</button>
              <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
              <button className="btn btn-danger" style={{ marginLeft: 'auto' }} onClick={() => { if (confirm('Cancellare tutti i progressi di questo profilo? L’operazione non è reversibile.')) { actions.reset(); setMsg('Progressi azzerati.'); } }}>
                Azzera progressi
              </button>
            </div>
            {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
          </section>

          <p className="set-foot">Ulpan · fatto per imparare a leggere l’ebraico con metodo. · <a href="#/privacy">Privacy</a></p>
        </div>

        <aside className="set-preview">
          <span className="pv-k">Anteprima</span>
          <div className={`pv-main ${settings.dyslexia ? 'dys' : ''}`} lang="he" dir="rtl">שָׁלוֹם עוֹלָם</div>
          <div className="pv-row" lang="he" dir="rtl"><span>א</span><span>בּ</span><span>ג</span><span>ד</span><span>ה</span><span>ו</span></div>
          <span className="pv-n">{previewNote}</span>
        </aside>
      </div>
    </div>
  );
}
