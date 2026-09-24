import { useState, type FormEvent } from 'react';
import { continueAsGuest, resetPassword, signIn, signUp, updatePassword } from '../lib/auth';

type Mode = 'login' | 'register' | 'forgot' | 'newPassword';

export function AuthPage({ recovery = false }: { recovery?: boolean }) {
  const [mode, setMode] = useState<Mode>(recovery ? 'newPassword' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const go = (m: Mode) => { setMode(m); setError(null); setInfo(null); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if ((mode === 'register' || mode === 'newPassword') && password !== password2) {
      setError('Le due password non coincidono.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        setError(await signIn(email, password));
      } else if (mode === 'register') {
        const r = await signUp(name, email, password);
        if (r.error) setError(r.error);
        else if (r.confirm) {
          setInfo(`Ti abbiamo inviato un’email a ${email.trim()}: apri il link per confermare l’account, poi accedi.`);
          setMode('login');
        }
      } else if (mode === 'forgot') {
        const err = await resetPassword(email);
        if (err) setError(err);
        else setInfo('Se l’indirizzo è registrato riceverai un’email con il link per scegliere una nuova password.');
      } else {
        setError(await updatePassword(password));
      }
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, string> = {
    login: 'Accedi',
    register: 'Crea il tuo account',
    forgot: 'Recupera la password',
    newPassword: 'Scegli una nuova password',
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card card fade-in">
        <div className="brand" style={{ justifyContent: 'center', paddingBottom: 8 }}>
          <span className="brand-mark">א</span>
          <span>Ulpan<small>Impara a leggere l’ebraico</small></span>
        </div>

        {(mode === 'login' || mode === 'register') && (
          <div className="tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => go('login')}>Accedi</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => go('register')}>Registrati</button>
          </div>
        )}
        {(mode === 'forgot' || mode === 'newPassword') && <h2 className="center">{titles[mode]}</h2>}
        {mode === 'register' && <p className="muted small center">Ogni utente ha il proprio percorso e ritrova i progressi su qualsiasi dispositivo.</p>}

        <form className="stack" onSubmit={submit} style={{ gap: 12 }}>
          {mode === 'register' && (
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="given-name" maxLength={40} />
            </div>
          )}
          {mode !== 'newPassword' && (
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" inputMode="email" />
            </div>
          )}
          {mode !== 'forgot' && (
            <div className="field">
              <label htmlFor="pw">{mode === 'newPassword' ? 'Nuova password' : 'Password'}</label>
              <input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            </div>
          )}
          {(mode === 'register' || mode === 'newPassword') && (
            <div className="field">
              <label htmlFor="pw2">Ripeti la password</label>
              <input id="pw2" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} required minLength={6} autoComplete="new-password" />
            </div>
          )}

          {error && <div className="feedback bad small" role="alert" style={{ marginTop: 0 }}>{error}</div>}
          {info && <div className="feedback ok small" role="status" style={{ marginTop: 0 }}>{info}</div>}

          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
            {busy ? 'Attendi…' : mode === 'login' ? 'Accedi' : mode === 'register' ? 'Crea account' : mode === 'forgot' ? 'Invia il link' : 'Salva la password'}
          </button>
        </form>

        <div className="center small" style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          {mode === 'login' && <button type="button" className="link-btn" onClick={() => go('forgot')}>Password dimenticata?</button>}
          {mode === 'forgot' && <button type="button" className="link-btn" onClick={() => go('login')}>← Torna all’accesso</button>}
          {mode !== 'newPassword' && (
            <button type="button" className="link-btn muted" onClick={continueAsGuest}>
              Continua senza account (progressi solo su questo dispositivo)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
