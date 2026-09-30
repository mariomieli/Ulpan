import { useEffect, useMemo, useState } from 'react';
import { adminUsers, useIsAdmin, type AdminUser } from '../lib/admin';
import { useAuth, showLogin } from '../lib/auth';
import { LESSON_BY_ID, LESSONS } from '../data/curriculum';
import { dayKey } from '../lib/store';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';

type SortKey = 'created_at' | 'last_sign_in_at' | 'last_active' | 'lessons_passed' | 'xp' | 'name';

const DAY = 86_400_000;
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const fmtDay = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

/** Lezione a cui sono arrivati: la prima non ancora superata (o l'ultima se le hanno finite). */
function stage(u: AdminUser): { label: string; done: number } {
  const next = Math.min(u.max_lesson_passed + 1, LESSONS.length);
  const l = LESSON_BY_ID[next];
  if (u.lessons_passed === 0 && !u.last_active) return { label: 'Non iniziato', done: 0 };
  return { label: `Lezione ${next} · ${l?.title ?? ''}`, done: u.lessons_passed };
}

function csv(rows: AdminUser[]): string {
  const cell = (v: string | number | null) => {
    const s = v === null ? '' : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Nome', 'Email', 'Accesso con', 'Iscritto il', 'Ultimo accesso', 'Ultima attività', 'Lezioni superate', 'Lezione attuale', 'XP', 'Serie'];
  const lines = rows.map((u) => [
    u.display_name, u.email, u.provider, u.created_at?.slice(0, 10), u.last_sign_in_at?.slice(0, 10) ?? '', u.last_active ?? '',
    u.lessons_passed, Math.min(u.max_lesson_passed + 1, LESSONS.length), u.xp, u.streak,
  ].map((v) => cell(v as string | number | null)).join(';'));
  return [head.join(';'), ...lines].join('\n');
}

export function AdminPage() {
  const auth = useAuth();
  const isAdmin = useIsAdmin();
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'created_at', dir: -1 });

  const load = () => adminUsers().then((r) => { setRows(r); setError(null); }).catch((e: Error) => { setError(e.message); setRows([]); });
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = (rows ?? []).filter((u) => !needle || u.email.toLowerCase().includes(needle) || u.display_name.toLowerCase().includes(needle));
    const val = (u: AdminUser): string | number => {
      switch (sort.key) {
        case 'name': return (u.display_name || u.email).toLowerCase();
        case 'lessons_passed': return u.lessons_passed;
        case 'xp': return u.xp;
        case 'last_active': return u.last_active ?? '';
        case 'last_sign_in_at': return u.last_sign_in_at ?? '';
        default: return u.created_at;
      }
    };
    return [...filtered].sort((a, b) => (val(a) < val(b) ? -1 : val(a) > val(b) ? 1 : 0) * sort.dir);
  }, [rows, q, sort]);

  const stats = useMemo(() => {
    const all = rows ?? [];
    const now = Date.now();
    const since7 = dayKey(new Date(now - 7 * DAY));
    return {
      total: all.length,
      new7: all.filter((u) => now - Date.parse(u.created_at) < 7 * DAY).length,
      active7: all.filter((u) => u.last_active !== null && u.last_active >= since7).length,
      started: all.filter((u) => u.lessons_passed > 0).length,
    };
  }, [rows]);

  if (auth.status === 'loading') return <p className="muted">Caricamento…</p>;
  if (auth.status !== 'signedIn') {
    return (
      <div className="card empty">
        <Icon name="lock" size={36} className="" />
        <h2>Area amministratore</h2>
        <p>Accedi con un account amministratore per vedere l’elenco degli iscritti.</p>
        <button className="btn btn-primary" onClick={showLogin}>Accedi</button>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="card empty">
        <Icon name="lock" size={36} className="" />
        <h2>Area riservata</h2>
        <p>Questo account non ha i permessi di amministratore.</p>
        <a className="btn" href="#/">Torna alla Home</a>
      </div>
    );
  }

  const head = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="link-btn" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 }))}>
        {label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
      </button>
    </th>
  );

  const exportCsv = () => {
    const blob = new Blob([csv(list)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ulpan-iscritti-${dayKey()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  return (
    <div className="teacher-page">
      <PageHeader he="מְנַהֵל" kicker="Area amministratore" title="Iscritti">
        <span className="ph-note">Account registrati, con data di iscrizione, ultimo accesso e punto di studio.</span>
      </PageHeader>
      <div className="grid grid-4">
        <div className="card stat"><span className="stat-value">{stats.total}</span><span className="stat-label">iscritti</span></div>
        <div className="card stat"><span className="stat-value">{stats.new7}</span><span className="stat-label">nuovi (7 giorni)</span></div>
        <div className="card stat"><span className="stat-value">{stats.active7}</span><span className="stat-label">attivi (7 giorni)</span></div>
        <div className="card stat"><span className="stat-value">{stats.started}</span><span className="stat-label">con almeno una lezione superata</span></div>
      </div>
      {error && <p className="feedback bad small" role="alert">{error}</p>}
      <div className="card">
        <div className="card-title">
          <h2>Elenco</h2>
          <div className="row">
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nome o email" aria-label="Cerca un iscritto" style={{ minWidth: 200 }} />
            <button className="btn btn-sm btn-ghost" onClick={() => void load()} aria-label="Aggiorna"><Icon name="repeat" size={16} className="" /></button>
            <button className="btn btn-sm" onClick={exportCsv} disabled={!list.length}>Esporta CSV</button>
          </div>
        </div>
        {rows === null ? <p className="muted">Caricamento…</p> : list.length === 0 ? <p className="muted">Nessun iscritto trovato.</p> : (
          <div className="table-wrap">
            <table className="data student-table">
              <thead>
                <tr>
                  {head('name', 'Iscritto')}{head('created_at', 'Registrato il')}{head('last_sign_in_at', 'Ultimo accesso')}
                  {head('last_active', 'Ultima attività')}<th scope="col">Punto di studio</th>{head('lessons_passed', 'Lezioni')}{head('xp', 'XP')}
                </tr>
              </thead>
              <tbody>
                {list.map((u) => {
                  const s = stage(u);
                  return (
                    <tr key={u.user_id}>
                      <td><b>{u.display_name || u.email.split('@')[0]}</b><div className="small muted" style={{ overflowWrap: 'anywhere' }}>{u.email}{u.provider === 'google' ? ' · Google' : ''}</div></td>
                      <td>{fmt(u.created_at)}</td>
                      <td>{fmt(u.last_sign_in_at)}</td>
                      <td>{fmtDay(u.last_active)}</td>
                      <td>{s.label}</td>
                      <td>{s.done}/{LESSONS.length}</td>
                      <td>{u.xp}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted" style={{ marginBottom: 0 }}>«Ultimo accesso» è l’ultimo accesso con email/Google; «Ultima attività» è l’ultimo giorno in cui ha studiato (più precisa per chi resta collegato).</p>
      </div>
    </div>
  );
}
