import { useState } from 'react';
import { deleteAccount, pull, showLogin, signOut, updateName, useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/supabase';

export function AccountCard() {
  const auth = useAuth();
  const [name, setName] = useState(auth.user?.name ?? '');
  const [msg, setMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  if (!cloudEnabled) return null;

  if (!auth.user) {
    return (
      <div className="card stack">
        <h2 style={{ margin: 0 }}>Account</h2>
        <p className="muted" style={{ margin: 0 }}>
          Stai usando l’app come ospite: i progressi restano solo su questo dispositivo.
          Crea un account per salvarli online e ritrovarli ovunque; al primo accesso potrai trasferire quelli attuali.
        </p>
        <div><button className="btn btn-primary" onClick={showLogin}>Accedi o registrati</button></div>
      </div>
    );
  }

  const remove = async () => {
    const typed = prompt(`Per confermare scrivi ELIMINA`);
    if (typed?.trim().toUpperCase() !== 'ELIMINA') return;
    setDeleting(true);
    const err = await deleteAccount();
    setDeleting(false);
    if (err) setMsg(err);
  };

  const saveName = async () => {
    const err = await updateName(name);
    setMsg(err ?? 'Nome aggiornato.');
  };

  return (
    <div className="card stack">
      <h2 style={{ margin: 0 }}>Account</h2>
      <div className="row">
        <span className="avatar">{auth.user.name.slice(0, 1)}</span>
        <div style={{ minWidth: 0 }}>
          <b>{auth.user.name}</b>
          <div className="small muted" style={{ overflowWrap: 'anywhere' }}>{auth.user.email}</div>
        </div>
      </div>
      <div className="row">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome visualizzato" maxLength={40} style={{ flex: 1, minWidth: 160 }} />
        <button className="btn" disabled={!name.trim() || name.trim() === auth.user.name} onClick={saveName}>Cambia nome</button>
      </div>
      <p className="small muted" style={{ margin: 0 }}>
        I progressi si sincronizzano automaticamente con il cloud: stato attuale <b>{{
          idle: 'in attesa', saving: 'salvataggio in corso', saved: 'salvati', offline: 'offline (verranno salvati al ritorno della connessione)', error: 'errore',
        }[auth.sync]}</b>.
      </p>
      <div className="row">
        <button className="btn" onClick={() => void pull()}>Sincronizza ora</button>
        <span className="spacer" />
        <button className="btn btn-danger" onClick={() => void signOut()}>Esci</button>
      </div>
      {msg && <p className="small" style={{ margin: 0 }}>{msg}</p>}
      <details className="danger-zone">
        <summary>Elimina account</summary>
        <p className="small muted">
          Cancella definitivamente l’account ({auth.user.email}) e tutti i progressi salvati, online e su questo dispositivo.
          L’operazione non si può annullare.
        </p>
        <button className="btn btn-danger" disabled={deleting} onClick={remove}>{deleting ? 'Eliminazione…' : 'Elimina definitivamente'}</button>
      </details>
    </div>
  );
}
