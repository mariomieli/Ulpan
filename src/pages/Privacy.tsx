import { cloudEnabled } from '../lib/supabase';

/** Informativa sul trattamento dei dati (art. 13 GDPR), scritta in modo semplice. */
export function PrivacyPage() {
  return (
    <div className="fade-in narrow">
      <div className="page-head">
        <div>
          <a href="#/" className="small">← Torna all’app</a>
          <h1 style={{ marginTop: 6 }}>Privacy</h1>
          <p>Come Ulpan usa i tuoi dati. Ultimo aggiornamento: settembre 2026.</p>
        </div>
      </div>
      <div className="card prose">
        <h2>In breve</h2>
        <ul>
          <li>Senza account i progressi restano <b>solo sul tuo dispositivo</b> e non vengono inviati a nessuno.</li>
          <li>Con un account salviamo solo ciò che serve a ritrovare i progressi su più dispositivi.</li>
          <li>Niente pubblicità, niente profilazione, niente cookie di tracciamento, nessun dato venduto o ceduto.</li>
          <li>Puoi esportare o cancellare tutto in qualsiasi momento da <a href="#/impostazioni">Impostazioni</a>.</li>
        </ul>

        <h2>Titolare del trattamento</h2>
        <p>Il gestore di questa installazione di Ulpan, contattabile tramite la pagina del progetto su GitHub.</p>

        <h2>Quali dati e perché</h2>
        <dl className="kv">
          <dt>Progressi</dt>
          <dd>Lezioni, risultati dei test, ripassi e giorni di attività. Servono a farti studiare (esecuzione del servizio che hai chiesto). Senza account restano nel browser.</dd>
          {cloudEnabled && (
            <>
              <dt>Account</dt>
              <dd>Email, nome scelto da te e password (conservata solo in forma cifrata). Servono ad accedere e sincronizzare i progressi.</dd>
              <dt>Gruppi e classi</dt>
              <dd>Nei gruppi gli altri membri vedono nome, punti e serie in classifica (se attiva). Nelle classi l’insegnante vede i progressi dettagliati, mai l’email, e solo dopo il tuo consenso esplicito, registrato al momento dell’ingresso.</dd>
              <dt>Consensi</dt>
              <dd>Data in cui hai confermato età e presa visione di questa informativa.</dd>
            </>
          )}
          <dt>Dati tecnici</dt>
          <dd>Il servizio che ospita l’app (GitHub Pages) registra per sicurezza l’indirizzo IP delle richieste. I caratteri tipografici sono ospitati dall’app stessa: nessuna richiesta a servizi di terzi.</dd>
          <dt>Voce</dt>
          <dd>La pronuncia usa la sintesi vocale del tuo dispositivo. Alcuni sistemi usano voci online del produttore (Google, Apple, Microsoft), secondo le loro condizioni.</dd>
        </dl>

        {cloudEnabled && (
          <>
            <h2>Dove sono conservati</h2>
            <p>I dati dell’account sono conservati su Supabase, fornitore del database, che li tratta per nostro conto come responsabile del trattamento. Restano finché l’account esiste; eliminando l’account vengono cancellati definitivamente.</p>
          </>
        )}

        <h2>Minori</h2>
        <p>In Italia chi ha meno di 14 anni può creare un account ed entrare in una classe solo con il consenso di un genitore o di chi ne esercita la responsabilità.</p>

        <h2>I tuoi diritti</h2>
        <p>Puoi chiedere accesso, rettifica, cancellazione, limitazione e portabilità dei dati, opporti al trattamento e revocare i consensi. Da <a href="#/impostazioni">Impostazioni</a> puoi esportare subito i progressi ed eliminare l’account. Hai anche diritto di reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</p>

        <h2>Dati nel browser</h2>
        <p>L’app salva nel browser (archiviazione locale) progressi, impostazioni e la sessione di accesso: sono necessari al funzionamento e non richiedono consenso. Si cancellano dalle impostazioni del browser o con “Azzera progressi”.</p>
      </div>
    </div>
  );
}
