import { useState, type FormEvent } from 'react';
import { Icon } from '../components/Icon';
import { continueAsGuest, resetPassword, signIn, signInWithGoogle, signUp, updatePassword } from '../lib/auth';

type Mode = 'login' | 'register' | 'forgot' | 'newPassword';

export function AuthPage({ recovery = false }: { recovery?: boolean }) {
  const [mode, setMode] = useState<Mode>(recovery ? 'newPassword' : 'login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  const [privacyOk, setPrivacyOk] = useState(false);
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

  const google = async () => {
    setError(null);
    setBusy(true);
    const err = await signInWithGoogle();
    if (err) { setError(err); setBusy(false); }
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
        <div className="auth-logo">
          <img className="brand-logo" src="./logo.png" alt="Ulpan" width={160} />
          <small>Impara a leggere l’ebraico</small>
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
              <div className="pw-wrap">
                <input id="pw" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Nascondi password' : 'Mostra password'} aria-pressed={showPw} title={showPw ? 'Nascondi password' : 'Mostra password'}>
                  <Icon name={showPw ? 'eyeOff' : 'eye'} size={20} className="" />
                </button>
              </div>
            </div>
          )}
          {(mode === 'register' || mode === 'newPassword') && (
            <div className="field">
              <label htmlFor="pw2">Ripeti la password</label>
              <div className="pw-wrap">
                <input id="pw2" type={showPw ? 'text' : 'password'} value={password2} onChange={(e) => setPassword2(e.target.value)} required minLength={6}
                  autoComplete="new-password" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
                <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Nascondi password' : 'Mostra password'} aria-pressed={showPw} title={showPw ? 'Nascondi password' : 'Mostra password'}>
                  <Icon name={showPw ? 'eyeOff' : 'eye'} size={20} className="" />
                </button>
              </div>
            </div>
          )}

          {mode === 'register' && (
            <>
              <label className="consent">
                <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} required />
                <span>Ho almeno 14 anni, oppure un genitore ha acconsentito alla mia iscrizione.</span>
              </label>
              <label className="consent">
                <input type="checkbox" checked={privacyOk} onChange={(e) => setPrivacyOk(e.target.checked)} required />
                <span>Ho letto l’<a href="#/privacy" target="_blank" rel="noopener">informativa sulla privacy</a>.</span>
              </label>
            </>
          )}

          {error && <div className="feedback bad small" role="alert" style={{ marginTop: 0 }}>{error}</div>}
          {info && <div className="feedback ok small" role="status" style={{ marginTop: 0 }}>{info}</div>}

          <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
            {busy ? 'Attendi…' : mode === 'login' ? 'Accedi' : mode === 'register' ? 'Crea account' : mode === 'forgot' ? 'Invia il link' : 'Salva la password'}
          </button>
        </form>

        {(mode === 'login' || mode === 'register') && (
          <div className="stack" style={{ gap: 8, marginTop: 12 }}>
            <div className="center muted small">oppure</div>
            <button type="button" className="btn btn-lg btn-block" onClick={google} disabled={busy}>
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style={{ marginRight: 8, verticalAlign: 'middle' }}>
                <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/>
                <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
                <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.9 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
              </svg>
              Continua con Google
            </button>
            <p className="muted small center" style={{ margin: 0 }}>
              Continuando con Google confermi di avere almeno 14 anni (o il consenso di un genitore) e di aver letto l’<a href="#/privacy" target="_blank" rel="noopener">informativa sulla privacy</a>.
            </p>
          </div>
        )}

        <div className="center small" style={{ marginTop: 14, display: 'grid', gap: 8 }}>
          <a href="#/privacy" className="muted">Privacy</a>
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
