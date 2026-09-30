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
import { PageHeader } from '../components/PageHeader';
import { Segmented } from '../components/Controls';
import { TeacherPanel } from './Teacher';

const HEB_INITIALS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר', 'ש', 'ת'];

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

export function Invite({ code, name, kind = 'group', compact = false }: { code: string; name: string; kind?: GroupKind; compact?: boolean }) {
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
  if (compact) {
    return (
      <button className="invite-chip" onClick={share} aria-label={`Codice d’invito ${code}: tocca per condividerlo`}>
        {copied ? 'Copiato ✓' : code}
      </button>
    );
  }
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
    <div className="gp-card lb-card">
      <div className="gp-ch">
        <b>Classifica</b>
        <button className="btn btn-sm btn-ghost" onClick={() => void load()} aria-label="Aggiorna"><Icon name="repeat" size={16} className="" /></button>
        <Segmented<RankMode> label="Periodo della classifica" value={mode} onChange={setMode}
          options={[{ value: 'settimana', label: 'Ultimi 7 giorni' }, { value: 'totale', label: 'XP totali' }]} />
      </div>
      {ranked.length >= 2 && (
        <div className="podium" aria-hidden="true" key={mode}>
          {[1, 0, 2].map((pos) => {
            const r = ranked[pos];
            if (!r) return <div key={pos} className="podium-col empty" />;
            const me = r.user_id === auth.user?.id;
            return (
              <div key={pos} className={`podium-col p${pos + 1}`}>
                <span className="podium-avatar" style={{ animationDelay: `${0.5 + pos * 0.1}s` }}>{r.display_name.slice(0, 1)}</span>
                <span className="podium-name">{me ? 'Tu' : r.display_name}</span>
                <div className="podium-block" style={{ animationDelay: `${pos * 0.12}s` }}>
                  <b>{pos + 1}</b>
                  <span>{mode === 'settimana' ? `${r.week} corrette` : `${r.xp} XP`}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {error && <p className="feedback bad small">{error}</p>}
      {!entries && !error && <p className="muted center">Caricamento…</p>}
      {entries?.length === 0 && <p className="muted center">Ancora nessuno in classifica.</p>}
      <ol className="leaderboard">
        {ranked.map((r, idx) => {
          const me = r.user_id === auth.user?.id;
          const score = mode === 'settimana' ? r.week : r.xp;
          const top = Math.max(1, mode === 'settimana' ? ranked[0].week : ranked[0].xp);
          return (
            <li key={`${mode}-${r.user_id}`} className={me ? 'me' : ''} style={{ animationDelay: `${idx * 50}ms` }}>
              <span className="lb-rank">{r.rank}</span>
              <span className="avatar">{r.display_name.slice(0, 1)}</span>
              <span className="lb-name">
                <b>{r.display_name}{me && <span className="muted"> (tu)</span>}</b>
                <span className="small muted">
                  {r.currentStreak > 0 && <><Icon name="flame" size={13} className="inline-icon" /> {r.currentStreak} {r.currentStreak === 1 ? 'giorno' : 'giorni'} · </>}
                  {r.lessons_passed} {r.lessons_passed === 1 ? 'lezione' : 'lezioni'}
                </span>
                <span className="lb-bar"><i style={{ width: `${(score / top) * 100}%` }} /></span>
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
    <div className="gp-page">
      <button className="link-btn gp-back" onClick={onBack}>← Gruppi e classi</button>
      <div className="group-card">
        <span className="gc-big" lang="he" aria-hidden="true">{HEB_INITIALS[group.name.length % HEB_INITIALS.length]}</span>
        <span className="group-letter" lang="he" aria-hidden="true">{HEB_INITIALS[group.name.length % HEB_INITIALS.length]}</span>
        <div className="group-info">
          <h1>{group.name}</h1>
          <span>{group.members} {group.members === 1 ? 'membro' : 'membri'}{isOwner ? ' · sei l’amministratore' : ''}</span>
        </div>
        <Invite code={group.code} name={group.name} compact />
      </div>
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
    <div className="gp-page">
      <PageHeader he="כִּתָּה" kicker={`Classe · ${group.members} ${group.members === 1 ? 'studente' : 'studenti'}`} title={group.name}>
        <button className="link-btn" onClick={onBack}>← Gruppi e classi</button>
      </PageHeader>
      <div className="gp-info">
        <span className="i" aria-hidden="true">i</span>
        <span>L’insegnante di questa classe vede i tuoi progressi dettagliati (lezioni, test, punti deboli e attività), non la tua email.</span>
      </div>

      <div className="gp-two">
        <div className="gp-card">
          <div className="gp-ch"><b>Compiti</b></div>
          {error && <p className="feedback bad small">{error}</p>}
          {assignments === null && <p className="muted">Caricamento…</p>}
          {assignments?.length === 0 && <p className="muted">Nessun compito assegnato per ora.</p>}
          <div className="gp-tasks">
            {assignments?.map((a) => {
              const st = assignmentStatus(a, state.lessons);
              return (
                <a key={a.id} className="gp-task" href={`#/lezioni/${a.lesson_id}`}>
                  <span className={`ti ${st === 'fatto' ? 'ok' : st === 'in ritardo' ? 'late' : ''}`} aria-hidden="true">{st === 'fatto' ? '✓' : st === 'in ritardo' ? '!' : '•'}</span>
                  <span className="lb-name">
                    <b>{lessonTitle(a.lesson_id)}</b>
                    <span className="small muted">{a.due_date ? `Entro il ${formatDate(a.due_date)}` : 'Senza scadenza'}{a.note ? ` · ${a.note}` : ''}</span>
                  </span>
                  <span className={`pill ${st === 'fatto' ? 'pill-solid-ok' : st === 'in ritardo' ? 'pill-bad' : 'pill-warn'}`}>{st}</span>
                </a>
              );
            })}
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>Un compito è fatto quando superi il test della lezione.</p>
        </div>

        {group.leaderboard_visible
          ? <Leaderboard group={group} canRemove={false} onChanged={onChanged} />
          : <div className="gp-card gp-hidden"><b>Classifica nascosta</b><span>La classifica di questa classe è visibile solo all’insegnante.</span></div>}
      </div>

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
      <div className="gp-page">
      <PageHeader he="קְבוּצוֹת" kicker="Impara insieme ad altri e sfidatevi" title="Gruppi e classi" />
      <div className="card empty">
        <Icon name="users" size={36} className="" />
        <h2>Studia in gruppo o in classe</h2>
        <p>Crea un gruppo con amici e famiglia, oppure una classe se sei un insegnante. Serve un account.</p>
        <button className="btn btn-primary" onClick={showLogin}>Accedi o registrati</button>
      </div>
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
      const isClass = info?.kind === 'class';
      if (isClass && !confirm(
        `Stai entrando nella classe «${info.name}».\n\nL’insegnante potrà vedere i tuoi progressi dettagliati: lezioni, risultati dei test, punti deboli e giorni di attività (non la tua email).\n\nSe hai meno di 14 anni serve il consenso di un genitore.\n\nAcconsenti e vuoi continuare?`,
      )) return;
      const g = await joinGroup(code, isClass);
      setCode(''); await load(); navigate(`/gruppi/${g.id}`);
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };

  const classes = groups?.filter((g) => g.kind === 'class') ?? [];
  const plain = groups?.filter((g) => g.kind !== 'class') ?? [];
  const row = (g: Group) => (
    <a key={g.id} className="gp-row" href={`#/gruppi/${g.id}`}>
      <span className="gp-av">{g.name.slice(0, 1).toUpperCase()}</span>
      <span className="lb-name">
        <b>{g.name}</b>
        <span className="small muted">
          {g.members} {g.kind === 'class' ? (g.members === 1 ? 'studente' : 'studenti') : (g.members === 1 ? 'membro' : 'membri')}
          {g.kind === 'class' ? (g.role === 'teacher' ? ' · sei insegnante' : ' · sei studente') : g.owner_id === auth.user?.id ? ' · amministratore' : ''}
        </span>
      </span>
      {g.kind === 'class' && g.role === 'teacher' && <span className="pill pill-primary">Pannello</span>}
      <span className="arr" aria-hidden="true">→</span>
    </a>
  );

  return (
    <div className="gp-page">
      <PageHeader he="קְבוּצוֹת" kicker="Impara insieme ad altri e sfidatevi" title="Gruppi e classi">
        <span className="ph-note">Impara insieme ad altri e sfidatevi in classifica, oppure segui una classe come insegnante.</span>
      </PageHeader>
      {error && <p className="feedback bad small" role="alert">{error}</p>}

      <div className="gp-layout">
        <div className="gp-lists">
          {created && (
            <div className="gp-created">
              <span><b>{created.kind === 'class' ? 'Classe' : 'Gruppo'} «{created.name}» {created.kind === 'class' ? 'creata' : 'creato'}!</b><span>Condividi il codice con chi vuoi invitare.</span></span>
              <Invite code={created.code} name={created.name} kind={created.kind} compact />
            </div>
          )}

          {classes.length > 0 && (
            <section className="gp-card">
              <b className="gp-t">Le mie classi</b>
              <div className="gp-rows">{classes.map(row)}</div>
            </section>
          )}
          <section className="gp-card">
            <b className="gp-t">I miei gruppi</b>
            {groups === null && <p className="muted">Caricamento…</p>}
            {groups !== null && plain.length === 0 && !error && <p className="muted small" style={{ margin: 0 }}>Nessun gruppo: creane uno o entra con un codice.</p>}
            <div className="gp-rows">{plain.map(row)}</div>
          </section>
        </div>

        <aside className="gp-side">
          <form className="gp-card" onSubmit={submitJoin}>
            <b className="gp-t">Entra con un codice</b>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
              placeholder="ES. K7M2QXPA" aria-label="Codice d’invito" className="code-input" autoCapitalize="characters" autoComplete="off" />
            <button className="gp-go" disabled={busy || code.length < 6}>Entra</button>
          </form>
          <form className="gp-card" onSubmit={submitCreate}>
            <b className="gp-t">Crea</b>
            <Segmented<GroupKind> label="Tipo" value={kind} onChange={setKind}
              options={[{ value: 'group', label: 'Gruppo di amici' }, { value: 'class', label: 'Classe (insegnante)' }]} />
            <span className="gp-note">
              {kind === 'class'
                ? 'Come insegnante vedrai i progressi dettagliati degli studenti, potrai assegnare compiti ed esportare i risultati.'
                : 'Tutti i membri si confrontano in classifica.'}
            </span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
              placeholder={kind === 'class' ? 'es. Ebraico base – martedì' : 'es. Famiglia Rossi'} aria-label="Nome" />
            <button className="gp-sec" disabled={busy || !name.trim()}>{kind === 'class' ? 'Crea classe' : 'Crea gruppo'}</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
