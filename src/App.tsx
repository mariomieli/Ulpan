import { useEffect, useState } from 'react';
import { match, useRoute } from './lib/router';
import { dueItems, useAppState } from './lib/store';
import { Icon } from './components/Icon';
import { HomePage } from './pages/Home';
import { LessonsPage } from './pages/Lessons';
import { LessonPage } from './pages/Lesson';
import { AlphabetPage } from './pages/Alphabet';
import { NikudPage } from './pages/Nikud';
import { ReadingPage } from './pages/Reading';
import { ReviewPage } from './pages/Review';
import { TestsPage, ExamPage } from './pages/Tests';
import { ProgressPage } from './pages/Progress';
import { SettingsPage } from './pages/Settings';

const NAV = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/lezioni', label: 'Lezioni', icon: 'book' },
  { path: '/alfabeto', label: 'Alfabeto', icon: 'alef' },
  { path: '/nikud', label: 'Nikud', icon: 'dots' },
  { path: '/lettura', label: 'Lettura', icon: 'read' },
  { path: '/ripasso', label: 'Ripasso', icon: 'repeat' },
  { path: '/test', label: 'Test ed esami', icon: 'test' },
  { path: '/progressi', label: 'Progressi', icon: 'chart' },
  { path: '/impostazioni', label: 'Impostazioni', icon: 'settings' },
];

const MOBILE = ['/', '/lezioni', '/ripasso', '/test'];

function isActive(navPath: string, path: string) {
  return navPath === '/' ? path === '/' : path === navPath || path.startsWith(`${navPath}/`);
}

function Page({ path }: { path: string }) {
  let p: Record<string, string> | null;
  if ((p = match('/lezioni/:id', path))) return <LessonPage id={Number(p.id)} />;
  if ((p = match('/test/:id', path))) return <ExamPage id={p.id} />;
  switch (path.split('?')[0]) {
    case '/lezioni': return <LessonsPage />;
    case '/alfabeto': return <AlphabetPage />;
    case '/nikud': return <NikudPage />;
    case '/lettura': return <ReadingPage />;
    case '/ripasso': return <ReviewPage />;
    case '/test': return <TestsPage />;
    case '/progressi': return <ProgressPage />;
    case '/impostazioni': return <SettingsPage />;
    default: return <HomePage />;
  }
}

export function App() {
  const path = useRoute();
  const state = useAppState();
  const { settings } = state;
  const [drawer, setDrawer] = useState(false);
  const due = dueItems(state, Date.now()).length;

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

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Navigazione principale">
        <a href="#/" className="brand" style={{ color: 'inherit' }}>
          <span className="brand-mark">א</span>
          <span>Ulpan<small>Impara a leggere l’ebraico</small></span>
        </a>
        {NAV.map((n) => (
          <a key={n.path} href={`#${n.path}`} className={`nav-link ${isActive(n.path, path) ? 'active' : ''}`}>
            <Icon name={n.icon} /> {n.label}
            {n.path === '/ripasso' && due > 0 && <span className="badge">{due}</span>}
          </a>
        ))}
        <div className="sidebar-foot">
          <Icon name="flame" size={14} className="" /> {state.streak} {state.streak === 1 ? 'giorno' : 'giorni'} di fila · {state.xp} XP
        </div>
      </nav>

      <main className="main">
        <Page path={path} />
      </main>

      <nav className="bottom-nav" aria-label="Navigazione">
        {NAV.filter((n) => MOBILE.includes(n.path)).map((n) => (
          <a key={n.path} href={`#${n.path}`} className={isActive(n.path, path) ? 'active' : ''}>
            <Icon name={n.icon} size={22} className="" />
            {n.label.split(' ')[0]}
            {n.path === '/ripasso' && due > 0 && <span className="badge">{due}</span>}
          </a>
        ))}
        <button onClick={() => setDrawer(true)} aria-label="Altro">
          <Icon name="menu" size={22} className="" /> Altro
        </button>
      </nav>

      {drawer && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawer(false)} />
          <div className="drawer fade-in" role="dialog" aria-label="Menu">
            <div className="drawer-handle" />
            {NAV.filter((n) => !MOBILE.includes(n.path)).map((n) => (
              <a key={n.path} href={`#${n.path}`} className={`nav-link ${isActive(n.path, path) ? 'active' : ''}`}>
                <Icon name={n.icon} /> {n.label}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
