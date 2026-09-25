import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { match, useRoute } from './lib/router';
import { dueItems, useAppState } from './lib/store';
import { Icon } from './components/Icon';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useFocusMode } from './lib/focus';
import { useAuth, showLogin, signOut } from './lib/auth';
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
  { path: '/lezioni', label: 'Lezioni', icon: 'book' },
  { path: '/alfabeto', label: 'Alfabeto', icon: 'alef' },
  { path: '/nikud', label: 'Nikud (Punteggiatura)', icon: 'dots' },
  { path: '/lettura', label: 'Lettura', icon: 'read' },
  { path: '/ripasso', label: 'Ripasso', icon: 'repeat' },
  { path: '/test', label: 'Test ed esami', icon: 'test' },
  { path: '/gruppi', label: 'Gruppi e classi', icon: 'users' },
  { path: '/progressi', label: 'Progressi', icon: 'chart' },
  { path: '/impostazioni', label: 'Impostazioni', icon: 'settings' },
];

const SYNC_LABEL = {
  idle: 'Account online', saving: 'Salvataggio…', saved: 'Progressi salvati', offline: 'Offline', error: 'Errore di sincronizzazione',
} as const;

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
  if ((p = match('/test/:id', path))) return <ExamPage id={p.id} />;
  if ((p = match('/gruppi/:id', path))) return <GroupsPage path={path} groupId={p.id} />;
  switch (path.split('?')[0]) {
    case '/lezioni': return <LessonsPage />;
    case '/alfabeto': return <AlphabetPage />;
    case '/nikud': return <NikudPage />;
    case '/lettura': return <ReadingPage />;
    case '/ripasso': return <ReviewPage />;
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
  const auth = useAuth();

  // tema, carattere e dimensione del testo ebraico
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const dark = settings.theme === 'dark' ||
        (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    root.dataset.font = settings.font;
    root.style.setProperty('--he-scale', String(settings.fontScale));
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [settings.theme, settings.font, settings.fontScale]);

  useEffect(() => setDrawer(false), [path]);
  useEffect(prefetchPages, []);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      setToast((e as CustomEvent<string>).detail);
      clearTimeout(t);
      t = setTimeout(() => setToast(null), 7000);
    };
    window.addEventListener('ulpan-toast', on);
    return () => { window.removeEventListener('ulpan-toast', on); clearTimeout(t); };
  }, []);

  if (auth.status === 'loading') {
    return <div className="auth-wrap"><span className="brand-mark" aria-hidden="true" style={{ width: 56, height: 56, fontSize: '2rem' }}>א</span></div>;
  }
  if (auth.status === 'signedOut') {
    return path === '/privacy'
      ? <main className="main"><Suspense fallback={null}><PrivacyPage /></Suspense></main>
      : <Suspense fallback={null}><AuthPage /></Suspense>;
  }
  if (auth.status === 'recovery') return <Suspense fallback={null}><AuthPage recovery /></Suspense>;

  return (
    <div className={`app ${focus ? 'focus-mode' : ''}`}>
      <nav className="sidebar" aria-label="Navigazione principale">
        <a href="#/" className="brand" style={{ color: 'inherit' }}>
          <span className="brand-mark" aria-hidden="true">א</span>
          <span>Ulpan<small>Impara a leggere l’ebraico</small></span>
        </a>
        {NAV.map((n) => (
          <a key={n.path} href={`#${n.path}`} className={`nav-link ${isActive(n.path, path) ? 'active' : ''}`}>
            <Icon name={n.icon} /> {n.label}
            {n.path === '/ripasso' && due > 0 && <span className="badge">{due}</span>}
          </a>
        ))}
        <div className="sidebar-foot">
          {auth.user ? (
            <div className="user-row">
              <a href="#/impostazioni" className="user-chip">
                <span className="avatar">{auth.user.name.slice(0, 1)}</span>
                <span className="who"><b>{auth.user.name}</b><span className="small muted"><i className={`sync-dot ${auth.sync}`} />{SYNC_LABEL[auth.sync]}</span></span>
              </a>
              <button className="btn btn-ghost btn-icon" onClick={logout} aria-label="Esci" title="Esci">
                <Icon name="logout" size={18} className="" />
              </button>
            </div>
          ) : cloudEnabled && (
            <button className="btn btn-sm btn-block" style={{ marginBottom: 8 }} onClick={showLogin}>Accedi o registrati</button>
          )}
          <Icon name="flame" size={14} className="" /> {state.streak} {state.streak === 1 ? 'giorno' : 'giorni'} di fila · {state.xp} XP
        </div>
      </nav>

      <main className="main">
        <ErrorBoundary resetKey={path}>
          <Suspense fallback={<div className="page-loading" aria-label="Caricamento" />}>
            <Page path={path} />
          </Suspense>
        </ErrorBoundary>
      </main>

      <nav className="bottom-nav" aria-label="Navigazione">
        {NAV.filter((n) => MOBILE.includes(n.path)).map((n) => (
          <a key={n.path} href={`#${n.path}`} className={isActive(n.path, path) ? 'active' : ''}>
            <Icon name={n.icon} size={22} className="" />
            {n.label.split(' ')[0]}
            {n.path === '/ripasso' && due > 0 && <span className="badge">{due}</span>}
          </a>
        ))}
        <button onClick={() => setDrawer(true)} aria-label="Altre sezioni" aria-haspopup="dialog" aria-expanded={drawer}>
          <Icon name="menu" size={22} className="" /> Altro
        </button>
      </nav>

      {toast && (
        <div className="toast fade-in" role="status">
          <span>{toast}</span>
          <a href="#/impostazioni" className="btn btn-sm" onClick={() => setToast(null)}>Come risolvere</a>
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
        {NAV.filter((n) => !MOBILE.includes(n.path)).map((n) => (
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
