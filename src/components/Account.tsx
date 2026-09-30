import { useState } from 'react';
import { deleteAccount, pull, showLogin, signOut, updateName, useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/supabase';

const SYNC_TEXT = {
  idle: 'In attesa', saving: 'Salvataggio in corso…', saved: 'Progressi salvati', offline: 'Offline: verranno salvati al ritorno della connessione', error: 'Errore di sincronizzazione',
} as const;

export function AccountCard() {
  const auth = useAuth();
  const [name, setName] = useState(auth.user?.name ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [danger, setDanger] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  if (!cloudEnabled) return null;

  if (!auth.user) {
    return (
      <div className="acc-guest">
        <span><b>Salva i progressi ovunque</b><span>Stai usando Ulpan come ospite: i progressi restano solo su questo dispositivo. Crea un account gratuito per non perdere nulla; al primo accesso potrai trasferire quelli attuali.</span></span>
        <button type="button" onClick={showLogin}>Accedi o registrati</button>
      </div>
    );
  }

  const remove = async () => {
    if (confirmText.trim().toUpperCase() !== 'ELIMINA') return;
    setDeleting(true);
    const err = await deleteAccount();
    setDeleting(false);
    if (err) setMsg(err);
  };

  const saveName = async () => {
    const err = await updateName(name);
    setMsg(err ?? 'Nome aggiornato.');
  };

  const syncDot = auth.sync === 'error' ? 'bad' : auth.sync === 'saving' || auth.sync === 'offline' ? 'warn' : 'ok';

  return (
    <div className="acc">
      <div className="acc-head">
        <span className="acc-av">{auth.user.name.slice(0, 1).toUpperCase()}</span>
        <span className="acc-who"><b>{auth.user.name}</b><span>{auth.user.email}</span></span>
        <button type="button" onClick={() => void signOut()}>Esci</button>
      </div>
      <section className="acc-card">
        <b>Nome visualizzato</b>
        <span className="acc-h">È il nome che vedono gli altri nei gruppi e nelle classifiche.</span>
        <div className="acc-form">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome visualizzato" maxLength={40} />
          <button type="button" disabled={!name.trim() || name.trim() === auth.user.name} onClick={saveName}>Cambia nome</button>
        </div>
        {msg && <span className="acc-msg" role="status">{msg}</span>}
      </section>
      <section className="acc-card acc-sync">
        <span className={`dot ${syncDot}`} aria-hidden="true" />
        <span className="acc-st"><b>Sincronizzazione progressi</b><span>{SYNC_TEXT[auth.sync]}</span></span>
        <button type="button" className="btn" onClick={() => void pull()}>Sincronizza ora</button>
      </section>
      <section className="acc-card acc-danger">
        <button type="button" className="acc-dt" aria-expanded={danger} onClick={() => setDanger((v) => !v)}><b>Elimina account</b><span aria-hidden="true">{danger ? '⌃' : '⌄'}</span></button>
        {danger && (
          <div className="acc-dbody">
            <span className="acc-h">
              Cancella definitivamente l’account ({auth.user.email}) e tutti i progressi salvati, online e su questo dispositivo.
              L’operazione non si può annullare.
            </span>
            <div className="acc-form">
              <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Per confermare scrivi ELIMINA" aria-label="Conferma eliminazione: scrivi ELIMINA" />
              <button type="button" className="acc-del" disabled={deleting || confirmText.trim().toUpperCase() !== 'ELIMINA'} onClick={remove}>{deleting ? 'Eliminazione…' : 'Elimina definitivamente'}</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
