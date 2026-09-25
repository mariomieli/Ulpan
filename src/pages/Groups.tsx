import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { push, showLogin, useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/supabase';
import {
  createGroup, deleteGroup, GroupError, inviteLink, joinGroup, leaderboard, leaveGroup, myGroups, removeMember, type Group,
} from '../lib/groups';
import { rankEntries, type LeaderboardEntry, type RankMode } from '../lib/leaderboard';
import { navigate } from '../lib/router';
import { Icon } from '../components/Icon';

const MEDALS = ['🥇', '🥈', '🥉'];

function errorText(e: unknown): string {
  return e instanceof GroupError ? e.message : 'Qualcosa è andato storto. Riprova.';
}

function codeFromUrl(path: string): string {
  const q = path.split('?')[1] ?? '';
  return (new URLSearchParams(q).get('codice') ?? '').toUpperCase();
}

function Invite({ code, name }: { code: string; name: string }) {
  const [copied, setCopied] = useState(false);
  const link = inviteLink(code);
  const share = async () => {
    const text = `Unisciti al gruppo «${name}» su Ulpan per imparare a leggere l’ebraico insieme! Codice: ${code}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Ulpan', text, url: link }); return; } catch { /* annullato */ }
    }
    await navigator.clipboard?.writeText(`${text}\n${link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div className="invite">
      <div>
        <div className="muted small">Codice d’invito</div>
        <div className="invite-code">{code}</div>
      </div>
      <button className="btn btn-primary" onClick={share}>{copied ? 'Link copiato ✓' : 'Invita'}</button>
    </div>
  );
}

function GroupDetail({ group, onBack, onChanged }: { group: Group; onBack: () => void; onChanged: () => void }) {
  const auth = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [mode, setMode] = useState<RankMode>('settimana');
  const [error, setError] = useState<string | null>(null);
  const isOwner = group.owner_id === auth.user?.id;

  const load = useCallback(async () => {
    try {
      await push(); // le mie statistiche aggiornate prima di leggere la classifica
      setEntries(await leaderboard(group.id));
    } catch (e) { setError(errorText(e)); }
  }, [group.id]);
  useEffect(() => { void load(); }, [load]);

  const ranked = useMemo(() => (entries ? rankEntries(entries, mode) : []), [entries, mode]);

  const act = async (fn: () => Promise<void>, after: () => void) => {
    try { await fn(); after(); } catch (e) { setError(errorText(e)); }
  };

  return (
    <div className="fade-in stack">
      <div>
        <button className="link-btn" onClick={onBack}>← Tutti i gruppi</button>
        <h1 style={{ margin: '6px 0 0' }}>{group.name}</h1>
        <p className="muted" style={{ margin: 0 }}>{group.members} {group.members === 1 ? 'membro' : 'membri'}{isOwner ? ' · sei l’amministratore' : ''}</p>
      </div>
      <div className="card"><Invite code={group.code} name={group.name} /></div>

      <div className="card">
        <div className="card-title">
          <h2>Classifica</h2>
          <button className="btn btn-sm btn-ghost" onClick={() => void load()} aria-label="Aggiorna"><Icon name="repeat" size={16} className="" /></button>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'settimana'} className={`tab ${mode === 'settimana' ? 'active' : ''}`} onClick={() => setMode('settimana')}>Ultimi 7 giorni</button>
          <button role="tab" aria-selected={mode === 'totale'} className={`tab ${mode === 'totale' ? 'active' : ''}`} onClick={() => setMode('totale')}>Sempre</button>
        </div>
        {error && <p className="feedback bad small">{error}</p>}
        {!entries && !error && <p className="muted center">Caricamento…</p>}
        <ol className="leaderboard">
          {ranked.map((r) => {
            const me = r.user_id === auth.user?.id;
            return (
              <li key={r.user_id} className={me ? 'me' : ''}>
                <span className="lb-rank">{r.rank <= 3 ? MEDALS[r.rank - 1] : r.rank}</span>
                <span className="avatar">{r.display_name.slice(0, 1)}</span>
                <span className="lb-name">
                  <b>{r.display_name}{me && <span className="muted"> (tu)</span>}</b>
                  <span className="small muted">
                    {r.currentStreak > 0 ? `🔥 ${r.currentStreak} ${r.currentStreak === 1 ? 'giorno' : 'giorni'} · ` : ''}
                    {r.lessons_passed} {r.lessons_passed === 1 ? 'lezione' : 'lezioni'}
                  </span>
                </span>
                <span className="lb-score">
                  <b>{mode === 'settimana' ? r.week : r.xp}</b>
                  <span className="small muted">{mode === 'settimana' ? 'corrette' : 'XP'}</span>
                </span>
                {isOwner && !me && (
                  <button className="btn btn-ghost btn-icon" aria-label={`Rimuovi ${r.display_name}`} title="Rimuovi dal gruppo"
                    onClick={() => confirm(`Rimuovere ${r.display_name} dal gruppo?`) && act(() => removeMember(group.id, r.user_id), () => { void load(); onChanged(); })}>
                    <Icon name="x" size={16} className="" />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
        <p className="small muted" style={{ marginBottom: 0 }}>
          {mode === 'settimana'
            ? 'Punteggio: risposte corrette negli ultimi 7 giorni, in lezioni, ripasso, test e dettato.'
            : 'Punteggio: XP totali guadagnati dall’inizio.'} I membri vedono solo nome e punteggi, mai l’email.
        </p>
      </div>

      <div className="row">
        {isOwner ? (
          <button className="btn btn-danger" onClick={() => confirm(`Eliminare il gruppo «${group.name}» per tutti i membri?`) && act(() => deleteGroup(group.id), () => { onChanged(); onBack(); })}>
            Elimina gruppo
          </button>
        ) : (
          <button className="btn btn-danger" onClick={() => confirm(`Uscire dal gruppo «${group.name}»?`) && act(() => leaveGroup(group.id, auth.user!.id), () => { onChanged(); onBack(); })}>
            Esci dal gruppo
          </button>
        )}
      </div>
    </div>
  );
}

export function GroupsPage({ path, groupId }: { path: string; groupId?: string }) {
  const auth = useAuth();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState(codeFromUrl(path));
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null);

  const load = useCallback(async () => {
    try { setGroups(await myGroups()); setError(null); } catch (e) { setError(errorText(e)); setGroups([]); }
  }, []);
  useEffect(() => { if (auth.status === 'signedIn') void load(); }, [auth.status, load]);

  if (!cloudEnabled) return <div className="card empty">I gruppi richiedono gli account online.</div>;
  if (auth.status !== 'signedIn') {
    return (
      <div className="card empty">
        <Icon name="users" size={36} className="" />
        <h2>Studia in gruppo</h2>
        <p>Crea un gruppo con amici, famiglia o la tua classe e confrontate i progressi in classifica. Serve un account.</p>
        <button className="btn btn-primary" onClick={showLogin}>Accedi o registrati</button>
      </div>
    );
  }

  const selected = groupId && groups?.find((g) => g.id === groupId);
  if (selected) return <GroupDetail key={selected.id} group={selected} onBack={() => navigate('/gruppi')} onChanged={() => void load()} />;

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const g = await createGroup(name);
      setCreated(g); setName(''); await load();
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  const submitJoin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const g = await joinGroup(code);
      setCode(''); await load(); navigate(`/gruppi/${g.id}`);
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };

  return (
    <div className="fade-in stack">
      <div className="page-head">
        <div>
          <h1>Gruppi</h1>
          <p>Impara insieme ad altri e sfidatevi in classifica, ogni settimana.</p>
        </div>
      </div>
      {error && <p className="feedback bad small" role="alert">{error}</p>}

      {created && (
        <div className="card fade-in">
          <h3>Gruppo «{created.name}» creato!</h3>
          <p className="muted small">Condividi il codice o il link con chi vuoi invitare.</p>
          <Invite code={created.code} name={created.name} />
        </div>
      )}

      <div className="card">
        <div className="card-title"><h2>I miei gruppi</h2></div>
        {groups === null && <p className="muted">Caricamento…</p>}
        {groups?.length === 0 && !error && <p className="muted">Non fai ancora parte di nessun gruppo: creane uno o entra con un codice.</p>}
        <div className="group-list">
          {groups?.map((g) => (
            <a key={g.id} className="group-row" href={`#/gruppi/${g.id}`}>
              <span className="avatar">{g.name.slice(0, 1)}</span>
              <span className="lb-name"><b>{g.name}</b><span className="small muted">{g.members} {g.members === 1 ? 'membro' : 'membri'}{g.owner_id === auth.user?.id ? ' · amministratore' : ''}</span></span>
              <Icon name="arrowRight" size={18} className="" />
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-2">
        <form className="card stack" style={{ gap: 10 }} onSubmit={submitJoin}>
          <h3 style={{ margin: 0 }}>Entra con un codice</h3>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="ES. K7M2QX" aria-label="Codice d’invito" className="code-input" autoCapitalize="characters" autoComplete="off" />
          <button className="btn btn-primary" disabled={busy || code.length !== 6}>Entra nel gruppo</button>
        </form>
        <form className="card stack" style={{ gap: 10 }} onSubmit={submitCreate}>
          <h3 style={{ margin: 0 }}>Crea un gruppo</h3>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="es. Famiglia Rossi, Classe 2B…" aria-label="Nome del gruppo" />
          <button className="btn" disabled={busy || !name.trim()}>Crea gruppo</button>
        </form>
      </div>
    </div>
  );
}
