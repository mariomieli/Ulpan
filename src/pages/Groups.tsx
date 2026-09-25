import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { push, showLogin, useAuth } from '../lib/auth';
import { cloudEnabled } from '../lib/supabase';
import {
  createGroup, deleteGroup, GroupError, groupInfo, inviteLink, joinGroup, leaderboard, leaveGroup, listAssignments,
  myGroups, removeMember, type Group, type GroupKind,
} from '../lib/groups';
import { rankEntries, type LeaderboardEntry, type RankMode } from '../lib/leaderboard';
import { assignmentStatus, lessonTitle, type Assignment } from '../lib/teacher';
import { useAppState } from '../lib/store';
import { navigate } from '../lib/router';
import { Icon } from '../components/Icon';
import { TeacherPanel } from './Teacher';

const MEDALS = ['🥇', '🥈', '🥉'];

export function errorText(e: unknown): string {
  return e instanceof GroupError ? e.message : 'Qualcosa è andato storto. Riprova.';
}

function codeFromUrl(path: string): string {
  const q = path.split('?')[1] ?? '';
  return (new URLSearchParams(q).get('codice') ?? '').toUpperCase();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function Invite({ code, name, kind = 'group' }: { code: string; name: string; kind?: GroupKind }) {
  const [copied, setCopied] = useState(false);
  const link = inviteLink(code);
  const share = async () => {
    const text = kind === 'class'
      ? `Entra nella classe «${name}» su Ulpan per imparare a leggere l’ebraico. Codice: ${code}`
      : `Unisciti al gruppo «${name}» su Ulpan per imparare a leggere l’ebraico insieme! Codice: ${code}`;
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

/** Classifica di un gruppo o di una classe. */
export function Leaderboard({ group, canRemove, onChanged }: { group: Group; canRemove: boolean; onChanged: () => void }) {
  const auth = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [mode, setMode] = useState<RankMode>('settimana');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      await push(); // le mie statistiche aggiornate prima di leggere la classifica
      setEntries(await leaderboard(group.id));
    } catch (e) { setError(errorText(e)); }
  }, [group.id]);
  useEffect(() => { void load(); }, [load]);

  const ranked = useMemo(() => (entries ? rankEntries(entries, mode) : []), [entries, mode]);

  const remove = async (e: LeaderboardEntry) => {
    if (!confirm(`Rimuovere ${e.display_name}?`)) return;
    try { await removeMember(group.id, e.user_id); void load(); onChanged(); } catch (err) { setError(errorText(err)); }
  };

  return (
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
      {entries?.length === 0 && <p className="muted center">Ancora nessuno in classifica.</p>}
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
              {canRemove && !me && r.user_id !== group.owner_id && (
                <button className="btn btn-ghost btn-icon" aria-label={`Rimuovi ${r.display_name}`} title="Rimuovi" onClick={() => void remove(r)}>
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
          : 'Punteggio: XP totali guadagnati dall’inizio.'} Si vedono solo nome e punteggi, mai l’email.
      </p>
    </div>
  );
}

function LeaveButton({ group, onDone }: { group: Group; onDone: () => void }) {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const what = group.kind === 'class' ? 'dalla classe' : 'dal gruppo';
  const leave = async () => {
    if (!confirm(`Uscire ${what} «${group.name}»?`)) return;
    try { await leaveGroup(group.id, auth.user!.id); onDone(); } catch (e) { setError(errorText(e)); }
  };
  return (
    <div className="row">
      <button className="btn btn-danger" onClick={() => void leave()}>Esci {what}</button>
      {error && <span className="small" style={{ color: 'var(--bad)' }}>{error}</span>}
    </div>
  );
}

function GroupDetail({ group, onBack, onChanged }: { group: Group; onBack: () => void; onChanged: () => void }) {
  const auth = useAuth();
  const isOwner = group.owner_id === auth.user?.id;
  const [error, setError] = useState<string | null>(null);
  const del = async () => {
    if (!confirm(`Eliminare il gruppo «${group.name}» per tutti i membri?`)) return;
    try { await deleteGroup(group.id); onChanged(); onBack(); } catch (e) { setError(errorText(e)); }
  };
  return (
    <div className="fade-in stack">
      <div>
        <button className="link-btn" onClick={onBack}>← Gruppi e classi</button>
        <h1 style={{ margin: '6px 0 0' }}>{group.name}</h1>
        <p className="muted" style={{ margin: 0 }}>{group.members} {group.members === 1 ? 'membro' : 'membri'}{isOwner ? ' · sei l’amministratore' : ''}</p>
      </div>
      <div className="card"><Invite code={group.code} name={group.name} /></div>
      <Leaderboard group={group} canRemove={isOwner} onChanged={onChanged} />
      {error && <p className="feedback bad small">{error}</p>}
      {isOwner
        ? <div className="row"><button className="btn btn-danger" onClick={() => void del()}>Elimina gruppo</button></div>
        : <LeaveButton group={group} onDone={() => { onChanged(); onBack(); }} />}
    </div>
  );
}

function StudentClassView({ group, onBack, onChanged }: { group: Group; onBack: () => void; onChanged: () => void }) {
  const state = useAppState();
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    listAssignments(group.id).then(setAssignments).catch((e) => { setError(errorText(e)); setAssignments([]); });
    void push(); // l'insegnante vede i progressi aggiornati
  }, [group.id]);

  return (
    <div className="fade-in stack">
      <div>
        <button className="link-btn" onClick={onBack}>← Gruppi e classi</button>
        <h1 style={{ margin: '6px 0 0' }}>{group.name}</h1>
        <p className="muted" style={{ margin: 0 }}>Classe · {group.members} {group.members === 1 ? 'studente' : 'studenti'}</p>
      </div>
      <div className="tip small" style={{ margin: 0 }}>
        L’insegnante di questa classe vede i tuoi progressi dettagliati (lezioni, test, punti deboli e attività), non la tua email.
      </div>

      <div className="card">
        <div className="card-title"><h2>Compiti</h2></div>
        {error && <p className="feedback bad small">{error}</p>}
        {assignments === null && <p className="muted">Caricamento…</p>}
        {assignments?.length === 0 && <p className="muted">Nessun compito assegnato per ora.</p>}
        <div className="group-list">
          {assignments?.map((a) => {
            const st = assignmentStatus(a, state.lessons);
            return (
              <a key={a.id} className="group-row" href={`#/lezioni/${a.lesson_id}`}>
                <span className="lb-name">
                  <b>{lessonTitle(a.lesson_id)}</b>
                  <span className="small muted">{a.due_date ? `Entro il ${formatDate(a.due_date)}` : 'Senza scadenza'}{a.note ? ` · ${a.note}` : ''}</span>
                </span>
                <span className={`pill ${st === 'fatto' ? 'pill-ok' : st === 'in ritardo' ? 'pill-bad' : 'pill-warn'}`}>{st}</span>
              </a>
            );
          })}
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>Un compito è fatto quando superi il test della lezione.</p>
      </div>

      {group.leaderboard_visible
        ? <Leaderboard group={group} canRemove={false} onChanged={onChanged} />
        : <div className="card muted small">La classifica di questa classe è visibile solo all’insegnante.</div>}

      <LeaveButton group={group} onDone={() => { onChanged(); onBack(); }} />
    </div>
  );
}

export function GroupsPage({ path, groupId }: { path: string; groupId?: string }) {
  const auth = useAuth();
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<GroupKind>('group');
  const [code, setCode] = useState(codeFromUrl(path));
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; code: string; kind: GroupKind } | null>(null);

  const load = useCallback(async () => {
    try { setGroups(await myGroups()); setError(null); } catch (e) { setError(errorText(e)); setGroups([]); }
  }, []);
  useEffect(() => { if (auth.status === 'signedIn') void load(); }, [auth.status, load]);

  if (!cloudEnabled) return <div className="card empty">I gruppi richiedono gli account online.</div>;
  if (auth.status !== 'signedIn') {
    return (
      <div className="card empty">
        <Icon name="users" size={36} className="" />
        <h2>Studia in gruppo o in classe</h2>
        <p>Crea un gruppo con amici e famiglia, oppure una classe se sei un insegnante. Serve un account.</p>
        <button className="btn btn-primary" onClick={showLogin}>Accedi o registrati</button>
      </div>
    );
  }

  const selected = groupId ? groups?.find((g) => g.id === groupId) : undefined;
  if (groupId && groups === null) return <p className="muted">Caricamento…</p>;
  if (selected) {
    const back = () => navigate('/gruppi');
    const changed = () => void load();
    if (selected.kind === 'class' && selected.role === 'teacher') return <TeacherPanel key={selected.id} group={selected} onBack={back} onChanged={changed} />;
    if (selected.kind === 'class') return <StudentClassView key={selected.id} group={selected} onBack={back} onChanged={changed} />;
    return <GroupDetail key={selected.id} group={selected} onBack={back} onChanged={changed} />;
  }

  const submitCreate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const g = await createGroup(name, kind);
      setCreated({ name: g.name, code: g.code, kind }); setName(''); await load();
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };
  const submitJoin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const info = await groupInfo(code);
      if (info?.kind === 'class' && !confirm(
        `Stai entrando nella classe «${info.name}».\n\nL’insegnante potrà vedere i tuoi progressi dettagliati: lezioni, risultati dei test, punti deboli e giorni di attività (non la tua email).\n\nVuoi continuare?`,
      )) return;
      const g = await joinGroup(code);
      setCode(''); await load(); navigate(`/gruppi/${g.id}`);
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };

  const classes = groups?.filter((g) => g.kind === 'class') ?? [];
  const plain = groups?.filter((g) => g.kind !== 'class') ?? [];
  const row = (g: Group) => (
    <a key={g.id} className="group-row" href={`#/gruppi/${g.id}`}>
      <span className="avatar">{g.name.slice(0, 1)}</span>
      <span className="lb-name">
        <b>{g.name}</b>
        <span className="small muted">
          {g.members} {g.kind === 'class' ? (g.members === 1 ? 'studente' : 'studenti') : (g.members === 1 ? 'membro' : 'membri')}
          {g.kind === 'class' ? (g.role === 'teacher' ? ' · sei insegnante' : ' · sei studente') : g.owner_id === auth.user?.id ? ' · amministratore' : ''}
        </span>
      </span>
      {g.kind === 'class' && g.role === 'teacher' && <span className="pill pill-primary">Pannello</span>}
      <Icon name="arrowRight" size={18} className="" />
    </a>
  );

  return (
    <div className="fade-in stack">
      <div className="page-head">
        <div>
          <h1>Gruppi e classi</h1>
          <p>Impara insieme ad altri e sfidatevi in classifica, oppure segui una classe come insegnante.</p>
        </div>
      </div>
      {error && <p className="feedback bad small" role="alert">{error}</p>}

      {created && (
        <div className="card fade-in">
          <h3>{created.kind === 'class' ? 'Classe' : 'Gruppo'} «{created.name}» {created.kind === 'class' ? 'creata' : 'creato'}!</h3>
          <p className="muted small">Condividi il codice o il link con chi vuoi invitare.</p>
          <Invite code={created.code} name={created.name} kind={created.kind} />
        </div>
      )}

      {classes.length > 0 && (
        <div className="card">
          <div className="card-title"><h2>Le mie classi</h2></div>
          <div className="group-list">{classes.map(row)}</div>
        </div>
      )}
      <div className="card">
        <div className="card-title"><h2>I miei gruppi</h2></div>
        {groups === null && <p className="muted">Caricamento…</p>}
        {groups !== null && plain.length === 0 && !error && <p className="muted">Nessun gruppo: creane uno o entra con un codice.</p>}
        <div className="group-list">{plain.map(row)}</div>
      </div>

      <div className="grid grid-2">
        <form className="card stack" style={{ gap: 10 }} onSubmit={submitJoin}>
          <h3 style={{ margin: 0 }}>Entra con un codice</h3>
          <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            placeholder="ES. K7M2QXPA" aria-label="Codice d’invito" className="code-input" autoCapitalize="characters" autoComplete="off" />
          <button className="btn btn-primary" disabled={busy || code.length < 6}>Entra</button>
        </form>
        <form className="card stack" style={{ gap: 10 }} onSubmit={submitCreate}>
          <h3 style={{ margin: 0 }}>Crea</h3>
          <div className="chips" role="radiogroup" aria-label="Tipo">
            <button type="button" role="radio" aria-checked={kind === 'group'} className={`chip ${kind === 'group' ? 'active' : ''}`} onClick={() => setKind('group')}>Gruppo di amici</button>
            <button type="button" role="radio" aria-checked={kind === 'class'} className={`chip ${kind === 'class' ? 'active' : ''}`} onClick={() => setKind('class')}>Classe (sono insegnante)</button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            {kind === 'class'
              ? 'Come insegnante vedrai i progressi dettagliati degli studenti, potrai assegnare compiti ed esportare i risultati.'
              : 'Tutti i membri si confrontano in classifica.'}
          </p>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
            placeholder={kind === 'class' ? 'es. Ebraico base – martedì' : 'es. Famiglia Rossi'} aria-label="Nome" />
          <button className="btn" disabled={busy || !name.trim()}>{kind === 'class' ? 'Crea classe' : 'Crea gruppo'}</button>
        </form>
      </div>
    </div>
  );
}
