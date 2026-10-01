import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { match, useRoute } from './lib/router';
import { badges } from './lib/badges';
import { actions, dueItems, useAppState } from './lib/store';
import { Icon } from './components/Icon';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useFocusMode } from './lib/focus';
import { useAuth, showLogin, signOut } from './lib/auth';
import { useIsAdmin } from './lib/admin';
import { cloudEnabled } from './lib/supabase';
import { HomePage } from './pages/Home';

/* Le pagine diverse dalla Home si caricano solo quando servono. */
const loaders = {
  lessons: () => import('./pages/Lessons'),
  lesson: () => import('./pages/Lesson'),
  alphabet: () => import('./pages/Alphabet'),
  nikud: () => import('./pages/Nikud'),
  reading: () => import('./pages/Reading'),
  review: () => import('./pages/Review'),
  tests: () => import('./pages/Tests'),
  progress: () => import('./pages/Progress'),
  settings: () => import('./pages/Settings'),
  privacy: () => import('./pages/Privacy'),
  groups: () => import('./pages/Groups'),
  grammar: () => import('./pages/Grammar'),
  admin: () => import('./pages/Admin'),
};
const LessonsPage = lazy(() => loaders.lessons().then((m) => ({ default: m.LessonsPage })));
const LessonPage = lazy(() => loaders.lesson().then((m) => ({ default: m.LessonPage })));
const AlphabetPage = lazy(() => loaders.alphabet().then((m) => ({ default: m.AlphabetPage })));
const NikudPage = lazy(() => loaders.nikud().then((m) => ({ default: m.NikudPage })));
const ReadingPage = lazy(() => loaders.reading().then((m) => ({ default: m.ReadingPage })));
const ReviewPage = lazy(() => loaders.review().then((m) => ({ default: m.ReviewPage })));
const TestsPage = lazy(() => loaders.tests().then((m) => ({ default: m.TestsPage })));
const PlacementPage = lazy(() => loaders.tests().then((m) => ({ default: m.PlacementPage })));
const ExamPage = lazy(() => loaders.tests().then((m) => ({ default: m.ExamPage })));
const ProgressPage = lazy(() => loaders.progress().then((m) => ({ default: m.ProgressPage })));
const GroupsPage = lazy(() => loaders.groups().then((m) => ({ default: m.GroupsPage })));
const GrammarPage = lazy(() => loaders.grammar().then((m) => ({ default: m.GrammarPage })));
const GrammarUnitPage = lazy(() => loaders.grammar().then((m) => ({ default: m.GrammarUnitPage })));
const AdminPage = lazy(() => loaders.admin().then((m) => ({ default: m.AdminPage })));
const AuthPage = lazy(() => import('./pages/Auth').then((m) => ({ default: m.AuthPage })));
const PrivacyPage = lazy(() => loaders.privacy().then((m) => ({ default: m.PrivacyPage })));
const SettingsPage = lazy(() => loaders.settings().then((m) => ({ default: m.SettingsPage })));

/** Dopo il primo avvio scarica in background le altre pagine (navigazione istantanea e uso offline). */
function prefetchPages() {
  const run = () => Object.values(loaders).forEach((load) => void load().catch(() => {}));
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 4000 });
  else setTimeout(run, 2500);
}

const NAV = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/lezioni', label: 'Percorso', icon: 'map' },
  { path: '/alfabeto', label: 'Alfabeto', icon: 'alef' },
  { path: '/nikud', label: 'Punteggiatura', icon: 'dots' },
  { path: '/lettura', label: 'Lettura', icon: 'read' },
  { path: '/grammatica', label: 'Lingua e cultura', icon: 'grammar' },
  { path: '/ripasso', label: 'Ripasso', icon: 'repeat' },
  { path: '/test', label: 'Test ed esami', icon: 'test' },
  { path: '/progressi', label: 'Progressi', icon: 'chart' },
  { path: '/gruppi', label: 'Gruppi e classi', icon: 'users' },
  { path: '/impostazioni', label: 'Impostazioni', icon: 'settings' },
];

/** Traduzione ebraica delle voci di menu (solo desktop). */
const NAV_HE: Record<string, string> = {'/': 'שָׁלוֹם', '/lezioni': 'דֶּרֶךְ', '/alfabeto': 'אָלֶף־בֵּית', '/nikud': 'נִקּוּד', '/lettura': 'קְרִיאָה', '/grammatica': 'תַּרְבּוּת', '/ripasso': 'חֲזָרָה', '/test': 'מִבְחָן', '/progressi': 'הִתְקַדְּמוּת', '/gruppi': 'קְבוּצוֹת', '/impostazioni': 'הַגְדָּרוֹת', '/admin': 'מְנַהֵל'};

const SYNC_LABEL = {
  idle: 'Account online', saving: 'Salvataggio…', saved: 'Progressi salvati', offline: 'Offline', error: 'Errore di sincronizzazione',
} as const;

/** Tema effettivo e passaggio giorno/notte (la preferenza resta tra Automatico/Chiaro/Scuro nelle Impostazioni). */
function useDarkNow(theme: 'system' | 'light' | 'dark'): boolean {
  return theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function logout() {
  if (confirm('Vuoi uscire dal tuo account? I progressi restano salvati.')) void signOut();
}

const MOBILE = ['/', '/lezioni', '/ripasso', '/test'];

function isActive(navPath: string, path: string) {
  return navPath === '/' ? path === '/' : path === navPath || path.startsWith(`${navPath}/`);
}

function Page({ path }: { path: string }) {
  let p: Record<string, string> | null;
  if ((p = match('/lezioni/:id', path))) return <LessonPage id={Number(p.id)} />;
  if (path.split('?')[0] === '/test/ingresso') return <PlacementPage />;
  if ((p = match('/grammatica/:id', path))) return <GrammarUnitPage id={p.id} />;
  if ((p = match('/test/:id', path))) return <ExamPage id={p.id} />;
  if ((p = match('/gruppi/:id', path))) return <GroupsPage path={path} groupId={p.id} />;
  switch (path.split('?')[0]) {
    case '/lezioni': return <LessonsPage />;
    case '/alfabeto': return <AlphabetPage />;
    case '/nikud': return <NikudPage />;
    case '/lettura': return <ReadingPage />;
    case '/grammatica': return <GrammarPage />;
    case '/admin': return <AdminPage />;
    case '/ripasso': return <ReviewPage />;
    case '/ripasso/oggi': return <ReviewPage key="oggi" autoStart="oggi" />;
    case '/test': return <TestsPage />;
    case '/gruppi': return <GroupsPage path={path} />;
    case '/progressi': return <ProgressPage />;
    case '/impostazioni': return <SettingsPage />;
    case '/privacy': return <PrivacyPage />;
    default: return <HomePage />;
  }
}

export function App() {
  const path = useRoute();
  const state = useAppState();
  const { settings } = state;
  const [drawer, setDrawer] = useState(false);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const focus = useFocusMode();
  // Menu "Altro" come dialogo nativo: Esc per chiudere, focus intrappolato e restituito al pulsante
  useEffect(() => {
    const d = drawerRef.current;
    if (!d) return;
    if (drawer && !d.open) d.showModal();
    if (!drawer && d.open) d.close();
  }, [drawer]);
  const due = dueItems(state, Date.now()).length;
  const isAdmin = useIsAdmin();
  const dark = useDarkNow(settings.theme);
  const toggleTheme = () => actions.settings({ theme: dark ? 'light' : 'dark' });
  const nav = isAdmin ? [...NAV, { path: '/admin', label: 'Iscritti', icon: 'users' }] : NAV;
  const activeIdx = nav.findIndex((n) => isActive(n.path, path));
  const auth = useAuth();

  // tema, carattere e dimensione del testo ebraico
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'dark' : 'light';
      // colore della barra del browser coerente con il tema
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#12110F' : '#1F4E8C');
    };
    apply();
    root.dataset.font = settings.font;
    root.dataset.motion = settings.motion;
    root.dataset.dyslexia = settings.dyslexia ? 'on' : 'off';
    root.dataset.tint = settings.tint;
    root.style.setProperty('--he-scale', String(settings.fontScale));
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme, settings.font, settings.fontScale, settings.motion, settings.dyslexia, settings.tint]);

  useEffect(() => setDrawer(false), [path]);
  useEffect(prefetchPages, []);
  const [toast, setToast] = useState<string | null>(null);
  // nuovo traguardo ottenuto durante l'uso: avviso e piccola festa
  const earnedRef = useRef<{ uid: string | null; ids: Set<string> } | null>(null);
  const uid = auth.user?.id ?? null;
  useEffect(() => {
    const list = badges(state).filter((b) => b.earned);
    const prev = earnedRef.current;
    earnedRef.current = { uid, ids: new Set(list.map((b) => b.id)) };
    // al cambio di utente o dopo una sincronizzazione che porta più traguardi insieme: nessun avviso
    if (!prev || prev.uid !== uid) return;
    const fresh = list.filter((b) => !prev.ids.has(b.id));
    if (fresh.length === 1) {
      const [f] = fresh;
      window.dispatchEvent(new CustomEvent('ulpan-toast', { detail: `Nuovo traguardo: ${f.title}!` }));
      void import('./lib/fx').then((fx) => { fx.confetti(); fx.feedback('win'); });
    }
  }, [state, uid]);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setToast((e as CustomEvent<string>).detail);
      clearTimeout(t);
      // gli avvisi da risolvere restano di più, quelli informativi spariscono presto
      const text = (e as CustomEvent<string>).detail;
      t = setTimeout(() => setToast(null), /voce|errore/i.test(text) ? 7000 : 3500);
    };
    window.addEventListener('ulpan-toast', on);
    return () => { window.removeEventListener('ulpan-toast', on); clearTimeout(t); };
  }, []);

  if (auth.status === 'loading') {
    return <div className="auth-wrap"><img className="brand-mark" src="./logo-mark.png" alt="" width={72} height={72} style={{ width: 72, height: 72 }} /></div>;
  }
  if (auth.status === 'signedOut') {
    return path === '/privacy'
      ? <main className="main solo"><Suspense fallback={null}><PrivacyPage /></Suspense></main>
      : <Suspense fallback={null}><AuthPage /></Suspense>;
  }
  if (auth.status === 'recovery') return <Suspense fallback={null}><AuthPage recovery /></Suspense>;

  return (
    <div className={`app ${focus ? 'focus-mode' : ''}`}>
      <nav className="sidebar" aria-label="Navigazione principale">
        <a href="#/" className="brand" style={{ color: 'inherit' }}>
          <img className="brand-mark" src="./logo-mark.png" alt="" width={40} height={40} />
          <span>Ulpan<small>Impara a leggere l’ebraico</small></span>
        </a>
        <div className="nav-list">
          {/* indicatore che scorre dietro la voce attiva */}
          {activeIdx >= 0 && <span className="nav-indicator" aria-hidden="true" style={{ transform: `translateY(${activeIdx * 46}px)` }} />}
          {nav.map((n) => (
            <a key={n.path} href={`#${n.path}`} className={`nav-link ${isActive(n.path, path) ? 'active' : ''}`} aria-current={isActive(n.path, path) ? 'page' : undefined}>
              <Icon name={n.icon} /> {n.label}
              {n.path === '/ripasso' && due > 0 && <span className="badge">{due}</span>}
              {NAV_HE[n.path] && <span className="nav-he" lang="he" dir="rtl">{NAV_HE[n.path]}</span>}
            </a>
          ))}
        </div>
        <div className="sidebar-foot">
          <button type="button" className="theme-toggle" onClick={toggleTheme} aria-pressed={dark}>
            <span>{dark ? 'Modalità notte' : 'Modalità giorno'}</span><span aria-hidden="true">{dark ? '☾' : '☀'}</span>
          </button>
          {auth.user ? (
            <div className="user-row">
              <a href="#/impostazioni" className="user-chip">
                <span className="avatar">{auth.user.name.slice(0, 1).toUpperCase()}</span>
                <span className="who"><b>{auth.user.name}</b><span className="small"><i className={`sync-dot ${auth.sync}`} />{SYNC_LABEL[auth.sync]}</span></span>
              </a>
              <button className="logout-btn" onClick={logout}>
                <Icon name="logout" size={16} className="" /> Esci
              </button>
            </div>
          ) : cloudEnabled ? (
            <button className="btn btn-sm btn-block" onClick={showLogin}>Accedi o registrati</button>
          ) : null}
        </div>
      </nav>

      <header className="topbar">
        <a href="#/" className="topbar-brand"><img src="./logo-mark.png" alt="" width={34} height={34} /> Ulpan</a>
        <span className="stat-chip flame sm" title="Giorni di fila">{state.streak} {state.streak === 1 ? 'giorno' : 'giorni'}</span>
        <button type="button" className="theme-btn" onClick={toggleTheme} aria-label={dark ? 'Passa alla modalità giorno' : 'Passa alla modalità notte'} aria-pressed={dark}><span aria-hidden="true">{dark ? '☾' : '☀'}</span></button>
      </header>

      <main className="main">
        <ErrorBoundary resetKey={path}>
          <Suspense fallback={<div className="page-loading" aria-label="Caricamento" />}>
            <Page path={path} />
          </Suspense>
        </ErrorBoundary>
      </main>

      <nav className="bottom-nav" aria-label="Navigazione">
        {nav.filter((n) => MOBILE.includes(n.path)).map((n) => (
          <a key={n.path} href={`#${n.path}`} className={isActive(n.path, path) ? 'active' : ''} aria-current={isActive(n.path, path) ? 'page' : undefined}>
            <span className="nav-pill" key={isActive(n.path, path) ? 'on' : 'off'}><Icon name={n.icon} size={22} className="" /></span>
            {n.label.split(' ')[0]}
            {n.path === '/ripasso' && due > 0 && <span className="badge">{due}</span>}
          </a>
        ))}
        <button onClick={() => setDrawer(true)} aria-label="Altre sezioni" aria-haspopup="dialog" aria-expanded={drawer}>
          <span className="nav-pill"><Icon name="more" size={22} className="" /></span> Altro
        </button>
      </nav>

      {toast && (
        <div className="toast" role="status" key={toast}>
          <i className="toast-dot" aria-hidden="true" />
          <span>{toast}</span>
          {/voce/i.test(toast) && <a href="#/impostazioni" className="btn btn-sm" onClick={() => setToast(null)}>Come risolvere</a>}
          <button className="btn btn-ghost btn-icon" onClick={() => setToast(null)} aria-label="Chiudi"><Icon name="x" size={16} className="" /></button>
        </div>
      )}

      <dialog ref={drawerRef} className="drawer" aria-labelledby="drawer-title"
        onClose={() => setDrawer(false)}
        onClick={(e) => { if (e.target === e.currentTarget) setDrawer(false); }}>
        <div className="drawer-handle" />
        <div className="drawer-head">
          <h2 id="drawer-title">Altre sezioni</h2>
          <button className="btn btn-ghost btn-icon" onClick={() => setDrawer(false)} aria-label="Chiudi il menu">
            <Icon name="x" size={20} className="" />
          </button>
        </div>
        {nav.filter((n) => !MOBILE.includes(n.path)).map((n) => (
          <a key={n.path} href={`#${n.path}`} className={`nav-link ${isActive(n.path, path) ? 'active' : ''}`}
            aria-current={isActive(n.path, path) ? 'page' : undefined}>
            <Icon name={n.icon} /> {n.label}
          </a>
        ))}
        {auth.user ? (
          <div className="drawer-user">
            <span className="avatar" aria-hidden="true">{auth.user.name.slice(0, 1)}</span>
            <span className="who"><b>{auth.user.name}</b><span className="small muted">{auth.user.email}</span></span>
            <button className="btn btn-sm" onClick={logout}><Icon name="logout" size={16} className="" /> Esci</button>
          </div>
        ) : cloudEnabled && (
          <button className="btn btn-block" style={{ marginTop: 8 }} onClick={() => { setDrawer(false); showLogin(); }}>Accedi o registrati</button>
        )}
      </dialog>
    </div>
  );
}
