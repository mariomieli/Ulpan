import { useState, type ReactNode } from 'react';
import { cloudEnabled } from '../lib/supabase';
import { PageHeader } from '../components/PageHeader';
import { reducedMotion } from '../lib/fx';

interface Block { id: string; title: string; body: ReactNode }

/** Informativa sul trattamento dei dati (art. 13 GDPR), scritta in modo semplice. */
export function PrivacyPage() {
  const [active, setActive] = useState('pv-breve');
  const brief = [
    <>Senza account i progressi restano <b>solo sul tuo dispositivo</b> e non vengono inviati a nessuno.</>,
    'Con un account salviamo solo ciò che serve a ritrovare i progressi su più dispositivi.',
    'Niente pubblicità, niente profilazione, niente cookie di tracciamento, nessun dato venduto o ceduto.',
    <>Puoi esportare o cancellare tutto in qualsiasi momento da <a href="#/impostazioni">Impostazioni</a>.</>,
  ];
  const data: { t: string; p: ReactNode }[] = [
    { t: 'Progressi', p: 'Lezioni, risultati dei test, ripassi e giorni di attività. Servono a farti studiare (esecuzione del servizio che hai chiesto). Senza account restano nel browser.' },
    ...(cloudEnabled ? [
      { t: 'Account', p: 'Email, nome scelto da te e password (conservata solo in forma cifrata). Se accedi con Google riceviamo solo email e nome del tuo profilo Google, senza password. Servono ad accedere e sincronizzare i progressi.' },
      { t: 'Gruppi e classi', p: 'Nei gruppi gli altri membri vedono nome, punti e serie in classifica (se attiva). Nelle classi l’insegnante vede i progressi dettagliati, mai l’email, e solo dopo il tuo consenso esplicito, registrato al momento dell’ingresso.' },
      { t: 'Gestione del servizio', p: 'Il gestore dell’app può vedere l’elenco degli iscritti (nome, email, data di iscrizione, ultimo accesso e punto di studio) per gestire il servizio e fornire assistenza.' },
      { t: 'Consensi', p: 'Data in cui hai confermato età e presa visione di questa informativa.' },
    ] : []),
    { t: 'Dati tecnici', p: 'Il servizio che ospita l’app (GitHub Pages) registra per sicurezza l’indirizzo IP delle richieste. I caratteri tipografici sono ospitati dall’app stessa: nessuna richiesta a servizi di terzi.' },
    { t: 'Voce', p: 'La pronuncia usa la sintesi vocale del tuo dispositivo. Alcuni sistemi usano voci online del produttore (Google, Apple, Microsoft), secondo le loro condizioni.' },
  ];
  const blocks: Block[] = [
    { id: 'pv-titolare', title: 'Titolare del trattamento', body: 'Il gestore di questa installazione di Ulpan, contattabile tramite la pagina del progetto su GitHub.' },
    ...(cloudEnabled ? [{ id: 'pv-conservati', title: 'Dove sono conservati', body: 'I dati dell’account sono conservati su Supabase, fornitore del database, che li tratta per nostro conto come responsabile del trattamento. Restano finché l’account esiste; eliminando l’account vengono cancellati definitivamente.' }] : []),
    { id: 'pv-minori', title: 'Minori', body: 'In Italia chi ha meno di 14 anni può creare un account ed entrare in una classe solo con il consenso di un genitore o di chi ne esercita la responsabilità.' },
    { id: 'pv-diritti', title: 'I tuoi diritti', body: <>Puoi chiedere accesso, rettifica, cancellazione, limitazione e portabilità dei dati, opporti al trattamento e revocare i consensi. Da <a href="#/impostazioni">Impostazioni</a> puoi esportare subito i progressi ed eliminare l’account. Hai anche diritto di reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).</> },
    { id: 'pv-browser', title: 'Dati nel browser', body: 'L’app salva nel browser (archiviazione locale) progressi, impostazioni e la sessione di accesso: sono necessari al funzionamento e non richiedono consenso. Si cancellano dalle impostazioni del browser o con “Azzera progressi”.' },
  ];
  // l'indice segue la sezione visibile
  const toc = [{ id: 'pv-breve', t: 'In breve' }, { id: 'pv-titolare', t: 'Titolare' }, { id: 'pv-dati', t: 'Quali dati e perché' },
    ...blocks.slice(1).map((b) => ({ id: b.id, t: b.title }))];
  const go = (id: string) => {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="privacy-page">
      <PageHeader he="פְּרָטִיּוּת" kicker="Come Ulpan usa i tuoi dati · aggiornata a settembre 2026" title="Privacy">
        <a className="pv-back" href="#/">← Torna all’app</a>
      </PageHeader>
      <div className="pv-layout">
        <aside className="pv-toc" aria-label="In questa pagina">
          <span>In questa pagina</span>
          {toc.map((t) => <button key={t.id} type="button" className={active === t.id ? 'on' : ''} aria-current={active === t.id ? 'true' : undefined} onClick={() => go(t.id)}>{t.t}</button>)}
        </aside>
        <div className="pv-body">
          <section id="pv-breve" className="pv-brief urise">
            <b>In breve</b>
            <div>{brief.map((t, i) => <div key={i}><span aria-hidden="true">✓</span><span>{t}</span></div>)}</div>
          </section>
          <section id="pv-titolare" className="pv-sec"><b>{blocks[0].title}</b><span>{blocks[0].body}</span></section>
          <section id="pv-dati" className="pv-sec">
            <b>Quali dati e perché</b>
            <div className="pv-data">{data.map((d) => <div key={d.t}><b>{d.t}</b><span>{d.p}</span></div>)}</div>
          </section>
          {blocks.slice(1).map((b) => <section key={b.id} id={b.id} className="pv-sec"><b>{b.title}</b><span>{b.body}</span></section>)}
        </div>
      </div>
    </div>
  );
}
