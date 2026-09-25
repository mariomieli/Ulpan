import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth';
import {
  addAssignment, classReport, deleteAssignment, deleteGroup, listAssignments, removeMember, setLeaderboardVisible,
  setMemberRole, type Group,
} from '../lib/groups';
import {
  assignmentStatus, classCsv, classWeakItems, lessonTitle, summarize, type Assignment, type StudentRow, type StudentSummary,
} from '../lib/teacher';
import { dayKey, sanitize } from '../lib/store';
import { LESSONS } from '../data/curriculum';
import { EXAMS } from '../lib/quiz';
import { Icon } from '../components/Icon';
import { errorText, formatDate, Invite, Leaderboard } from './Groups';

type Tab = 'studenti' | 'compiti' | 'classifica' | 'classe';

function pct(v: number | null) {
  return v === null ? '—' : `${Math.round(v * 100)}%`;
}

function lastActiveLabel(d: string | null): string {
  if (!d) return 'mai';
  const today = dayKey();
  const y = new Date(); y.setDate(y.getDate() - 1);
  if (d === today) return 'oggi';
  if (d === dayKey(y)) return 'ieri';
  return formatDate(d);
}

function StudentDetail({ groupId, row, sum, assignments, onBack, onChanged }: {
  groupId: string; row: StudentRow; sum: StudentSummary; assignments: Assignment[];
  onBack: () => void; onChanged: () => void;
}) {
  const lessons = sanitize(row.progress).lessons;
  const max = Math.max(10, ...sum.activity14.map((d) => d.answered));
  return (
    <div className="stack fade-in">
      <div>
        <button className="link-btn" onClick={onBack}>← Tutti gli studenti</button>
        <h2 style={{ margin: '6px 0 0' }}>{row.display_name}</h2>
        <p className="muted small" style={{ margin: 0 }}>Nella classe dal {formatDate(row.joined_at)} · ultima attività {lastActiveLabel(sum.lastActive)}</p>
      </div>
      <div className="grid grid-4">
        <div className="card stat"><span className="stat-value">{sum.lessonsPassed}/{LESSONS.length}</span><span className="stat-label">lezioni superate</span></div>
        <div className="card stat"><span className="stat-value">{sum.answers7}</span><span className="stat-label">risposte (7 giorni)</span></div>
        <div className="card stat"><span className="stat-value">{pct(sum.accuracy7)}</span><span className="stat-label">precisione (7 giorni)</span></div>
        <div className="card stat"><span className="stat-value">{sum.mastered}</span><span className="stat-label">elementi consolidati</span></div>
      </div>
      <div className="card">
        <h3>Attività (14 giorni)</h3>
        <div className="bars" style={{ height: 80 }}>
          {sum.activity14.map((d, i) => (
            <div key={d.day} title={`${formatDate(d.day)}: ${d.answered} risposte`}>
              <div className={`bar ${d.answered ? '' : 'empty'}`} style={{ height: `${Math.max(4, (d.answered / max) * 100)}%` }} />
              <span>{i % 3 === 1 ? d.day.slice(8) : ' '}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h3>Lezioni ed esami</h3>
          <table className="data">
            <tbody>
              {LESSONS.map((l) => (
                <tr key={l.id}>
                  <td>{l.id}. {l.title}</td>
                  <td style={{ textAlign: 'right' }}>
                    {lessons[l.id]?.passed ? <span className="pill pill-ok">{sum.lessonScores[l.id]}%</span>
                      : sum.lessonScores[l.id] !== undefined ? <span className="pill pill-warn">{sum.lessonScores[l.id]}%</span> : '—'}
                  </td>
                </tr>
              ))}
              {EXAMS.map((e) => (
                <tr key={e.id}><td>{e.title}</td><td style={{ textAlign: 'right' }}>{sum.examScores[e.id] !== undefined ? `${sum.examScores[e.id]}%` : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="stack">
          <div className="card">
            <h3>Punti deboli</h3>
            {sum.weak.length === 0 ? <p className="muted small">Nessun punto debole evidente (servono almeno 3 risposte per elemento).</p> : (
              <div className="review-list">
                {sum.weak.map((w) => (
                  <div className="review-item" key={w.id}>
                    <span className="he" style={{ fontSize: '1.6rem' }}>{w.hebrew}</span>
                    <div className="ans"><b>{w.label}</b><div className="small muted">{pct(w.accuracy)} corrette su {w.seen}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {assignments.length > 0 && (
            <div className="card">
              <h3>Compiti</h3>
              {assignments.map((a) => {
                const st = assignmentStatus(a, lessons);
                return (
                  <div key={a.id} className="row small" style={{ padding: '4px 0' }}>
                    <span>{lessonTitle(a.lesson_id)}</span><span className="spacer" />
                    <span className={`pill ${st === 'fatto' ? 'pill-ok' : st === 'in ritardo' ? 'pill-bad' : 'pill-warn'}`}>{st}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="row">
        <button className="btn btn-danger" onClick={async () => {
          if (!confirm(`Rimuovere ${row.display_name} dalla classe?`)) return;
          try { await removeMember(groupId, row.user_id); onChanged(); onBack(); } catch (e) { alert(errorText(e)); }
        }}>Rimuovi dalla classe</button>
      </div>
    </div>
  );
}

export function TeacherPanel({ group, onBack, onChanged }: { group: Group; onBack: () => void; onChanged: () => void }) {
  const auth = useAuth();
  const isOwner = group.owner_id === auth.user?.id;
  const [tab, setTab] = useState<Tab>('studenti');
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [visible, setVisible] = useState(group.leaderboard_visible);

  const load = useCallback(async () => {
    try {
      const [r, a] = await Promise.all([classReport(group.id), listAssignments(group.id)]);
      setRows(r);
      setAssignments(a);
      setError(null);
    } catch (e) { setError(errorText(e)); setRows([]); }
  }, [group.id]);
  useEffect(() => { void load(); }, [load]);

  const students = useMemo(() => (rows ?? []).filter((r) => r.role === 'student'), [rows]);
  const teachers = useMemo(() => (rows ?? []).filter((r) => r.role === 'teacher'), [rows]);
  const summaries = useMemo(() => new Map(students.map((s) => [s.user_id, summarize(s.progress)])), [students]);
  const weakClass = useMemo(() => classWeakItems(students), [students]);
  const active7 = students.filter((s) => (summaries.get(s.user_id)?.activeDays7 ?? 0) > 0).length;

  const exportCsv = () => {
    const blob = new Blob([classCsv(rows ?? [], assignments)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${group.name.replace(/[^\w\- ]+/g, '').trim() || 'classe'}-${dayKey()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sel = selected ? students.find((s) => s.user_id === selected) : undefined;

  return (
    <div className="fade-in stack">
      <div>
        <button className="link-btn" onClick={onBack}>← Gruppi e classi</button>
        <h1 style={{ margin: '6px 0 0' }}>{group.name}</h1>
        <p className="muted" style={{ margin: 0 }}>Pannello insegnante · {students.length} {students.length === 1 ? 'studente' : 'studenti'}</p>
      </div>
      <div className="tabs" role="tablist">
        {(['studenti', 'compiti', 'classifica', 'classe'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { setTab(t); setSelected(null); }}>
            {{ studenti: 'Studenti', compiti: 'Compiti', classifica: 'Classifica', classe: 'Classe' }[t]}
          </button>
        ))}
      </div>
      {error && <p className="feedback bad small" role="alert">{error}</p>}
      {rows === null && <p className="muted">Caricamento…</p>}

      {tab === 'studenti' && rows && (sel ? (
        <StudentDetail groupId={group.id} row={sel} sum={summaries.get(sel.user_id)!} assignments={assignments}
          onBack={() => setSelected(null)} onChanged={() => { void load(); onChanged(); }} />
      ) : (
        <>
          <div className="grid grid-3">
            <div className="card stat"><span className="stat-value">{students.length}</span><span className="stat-label">studenti</span></div>
            <div className="card stat"><span className="stat-value">{active7}</span><span className="stat-label">attivi negli ultimi 7 giorni</span></div>
            <div className="card stat">
              <span className="stat-value">{students.length ? (students.reduce((s, x) => s + (summaries.get(x.user_id)?.lessonsPassed ?? 0), 0) / students.length).toFixed(1) : '—'}</span>
              <span className="stat-label">lezioni superate in media</span>
            </div>
          </div>

          <div className="card">
            <div className="card-title">
              <h2>Studenti</h2>
              <div className="row">
                <button className="btn btn-sm btn-ghost" onClick={() => void load()} aria-label="Aggiorna"><Icon name="repeat" size={16} className="" /></button>
                <button className="btn btn-sm" onClick={exportCsv} disabled={!students.length}>Esporta CSV</button>
              </div>
            </div>
            {students.length === 0 ? (
              <p className="muted">Nessuno studente ancora: condividi il codice d’invito dalla scheda «Classe».</p>
            ) : (
              <div className="table-wrap">
                <table className="data student-table">
                  <thead>
                    <tr><th>Studente</th><th>Lezioni</th><th>Ultima attività</th><th>Risposte 7 gg</th><th>Precisione</th><th>Compiti</th></tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const sum = summaries.get(s.user_id)!;
                      const lessons = sanitize(s.progress).lessons;
                      const done = assignments.filter((a) => assignmentStatus(a, lessons) === 'fatto').length;
                      const late = assignments.some((a) => assignmentStatus(a, lessons) === 'in ritardo');
                      return (
                        <tr key={s.user_id} className="clickable" onClick={() => setSelected(s.user_id)}>
                          <td><b>{s.display_name}</b></td>
                          <td>{sum.lessonsPassed}/{LESSONS.length}</td>
                          <td className={sum.activeDays7 ? '' : 'warn-text'}>{lastActiveLabel(sum.lastActive)}</td>
                          <td>{sum.answers7}</td>
                          <td>{pct(sum.accuracy7)}</td>
                          <td>{assignments.length ? <span className={`pill ${late ? 'pill-bad' : done === assignments.length ? 'pill-ok' : ''}`}>{done}/{assignments.length}</span> : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {students.length > 0 && <p className="small muted" style={{ marginBottom: 0 }}>Tocca uno studente per vedere i dettagli.</p>}
          </div>

          <div className="card">
            <h2>Difficoltà della classe</h2>
            {weakClass.length === 0 ? <p className="muted small">Nessuna difficoltà diffusa per ora.</p> : (
              <div className="review-list">
                {weakClass.map((w) => (
                  <div className="review-item" key={w.id}>
                    <span className="he" style={{ fontSize: '1.6rem' }}>{w.hebrew}</span>
                    <div className="ans"><b>{w.label}</b>
                      <div className="small muted">in difficoltà {w.students} {w.students === 1 ? 'studente' : 'studenti'} su {students.length} · {pct(w.accuracy)} risposte corrette</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ))}

      {tab === 'compiti' && <AssignmentsTab group={group} assignments={assignments} students={students} onChanged={() => void load()} />}

      {tab === 'classifica' && (
        <>
          <div className="card row">
            <label className="toggle">
              <input type="checkbox" checked={visible} onChange={async (e) => {
                const v = e.target.checked;
                setVisible(v);
                try { await setLeaderboardVisible(group.id, v); onChanged(); } catch (err) { setVisible(!v); setError(errorText(err)); }
              }} />
              Mostra la classifica agli studenti
            </label>
          </div>
          <Leaderboard group={group} canRemove onChanged={() => { void load(); onChanged(); }} />
        </>
      )}

      {tab === 'classe' && (
        <>
          <div className="card"><Invite code={group.code} name={group.name} kind="class" /></div>
          <div className="card">
            <h2>Insegnanti</h2>
            {teachers.map((t) => (
              <div key={t.user_id} className="row" style={{ padding: '6px 0' }}>
                <span className="avatar">{t.display_name.slice(0, 1)}</span>
                <b>{t.display_name}</b>{t.user_id === group.owner_id && <span className="pill">proprietario</span>}
                <span className="spacer" />
                {isOwner && t.user_id !== group.owner_id && (
                  <button className="btn btn-sm" onClick={async () => {
                    try { await setMemberRole(group.id, t.user_id, 'student'); void load(); } catch (e) { setError(errorText(e)); }
                  }}>Rendi studente</button>
                )}
              </div>
            ))}
            {isOwner && students.length > 0 && (
              <div className="row" style={{ marginTop: 10 }}>
                <select id="coteacher" defaultValue="" aria-label="Nomina co-insegnante">
                  <option value="" disabled>Nomina co-insegnante…</option>
                  {students.map((s) => <option key={s.user_id} value={s.user_id}>{s.display_name}</option>)}
                </select>
                <button className="btn btn-sm" onClick={async () => {
                  const uid = (document.getElementById('coteacher') as HTMLSelectElement).value;
                  if (!uid) return;
                  if (!confirm('Il co-insegnante vedrà i progressi di tutti gli studenti. Confermi?')) return;
                  try { await setMemberRole(group.id, uid, 'teacher'); void load(); } catch (e) { setError(errorText(e)); }
                }}>Nomina</button>
              </div>
            )}
          </div>
          {isOwner && (
            <div className="row">
              <button className="btn btn-danger" onClick={async () => {
                if (!confirm(`Eliminare la classe «${group.name}»? Studenti, compiti e classifica verranno rimossi.`)) return;
                try { await deleteGroup(group.id); onChanged(); onBack(); } catch (e) { setError(errorText(e)); }
              }}>Elimina classe</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AssignmentsTab({ group, assignments, students, onChanged }: {
  group: Group; assignments: Assignment[]; students: StudentRow[]; onChanged: () => void;
}) {
  const auth = useAuth();
  const [lesson, setLesson] = useState(1);
  const [due, setDue] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await addAssignment(group.id, auth.user!.id, lesson, due || null, note);
      setNote(''); setDue(''); onChanged();
    } catch (err) { setError(errorText(err)); } finally { setBusy(false); }
  };

  return (
    <>
      <form className="card stack" style={{ gap: 10 }} onSubmit={submit}>
        <h2 style={{ margin: 0 }}>Nuovo compito</h2>
        <div className="grid grid-3" style={{ gap: 10 }}>
          <div className="field">
            <label htmlFor="as-lesson">Lezione da superare</label>
            <select id="as-lesson" value={lesson} onChange={(e) => setLesson(Number(e.target.value))}>
              {LESSONS.map((l) => <option key={l.id} value={l.id}>{l.id} · {l.title}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="as-due">Scadenza (facoltativa)</label>
            <input id="as-due" type="date" value={due} min={dayKey()} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="as-note">Nota (facoltativa)</label>
            <input id="as-note" type="text" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} placeholder="es. ripassate le forme finali" />
          </div>
        </div>
        {error && <p className="feedback bad small">{error}</p>}
        <div><button className="btn btn-primary" disabled={busy}>Assegna</button></div>
        <p className="small muted" style={{ margin: 0 }}>Il compito risulta fatto quando lo studente supera il test della lezione.</p>
      </form>

      <div className="card">
        <h2>Compiti assegnati</h2>
        {assignments.length === 0 && <p className="muted">Nessun compito assegnato.</p>}
        <div className="stack" style={{ gap: 10 }}>
          {assignments.map((a) => {
            const status = students.map((s) => ({ s, st: assignmentStatus(a, sanitize(s.progress).lessons) }));
            const done = status.filter((x) => x.st === 'fatto');
            const missing = status.filter((x) => x.st !== 'fatto');
            return (
              <div key={a.id} className="assignment">
                <div className="row">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <b>{lessonTitle(a.lesson_id)}</b>
                    <div className="small muted">{a.due_date ? `Entro il ${formatDate(a.due_date)}` : 'Senza scadenza'}{a.note ? ` · ${a.note}` : ''}</div>
                  </div>
                  <span className={`pill ${done.length === students.length && students.length ? 'pill-ok' : ''}`}>{done.length}/{students.length} fatto</span>
                  <button className="btn btn-ghost btn-icon" aria-label="Elimina compito" title="Elimina compito" onClick={async () => {
                    if (!confirm('Eliminare questo compito?')) return;
                    try { await deleteAssignment(a.id); onChanged(); } catch (e) { setError(errorText(e)); }
                  }}><Icon name="x" size={16} className="" /></button>
                </div>
                {missing.length > 0 && (
                  <p className="small muted" style={{ margin: '6px 0 0' }}>
                    Mancano: {missing.map((x) => `${x.s.display_name}${x.st === 'in ritardo' ? ' (in ritardo)' : ''}`).join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
