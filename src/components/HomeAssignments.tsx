import { useEffect, useState } from 'react';
import { listAssignments, myGroups } from '../lib/groups';
import { assignmentStatus, lessonTitle, type Assignment } from '../lib/teacher';
import { useAppState } from '../lib/store';

/** Compiti ancora da fare nelle classi in cui l'utente è studente. */
export default function HomeAssignments() {
  const { lessons } = useAppState();
  const [items, setItems] = useState<Assignment[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.all([myGroups(), listAssignments()])
      .then(([groups, all]) => {
        const studentClasses = new Set(groups.filter((g) => g.kind === 'class' && g.role === 'student').map((g) => g.id));
        if (alive) setItems(all.filter((a) => studentClasses.has(a.group_id)));
      })
      .catch(() => { /* classi non configurate o offline: niente da mostrare */ });
    return () => { alive = false; };
  }, []);

  const pending = items.filter((a) => assignmentStatus(a, lessons) !== 'fatto');
  if (!pending.length) return null;
  return (
    <div className="card">
      <div className="card-title"><h3>Compiti da fare</h3><span className="pill pill-warn">{pending.length}</span></div>
      <div className="group-list">
        {pending.slice(0, 4).map((a) => {
          const st = assignmentStatus(a, lessons);
          return (
            <a key={a.id} className="group-row" href={`#/lezioni/${a.lesson_id}`}>
              <span className="lb-name">
                <b>{lessonTitle(a.lesson_id)}</b>
                <span className="small muted">
                  {a.groups?.name ?? 'Classe'}{a.due_date ? ` · entro il ${a.due_date.split('-').reverse().join('/')}` : ''}{a.note ? ` · ${a.note}` : ''}
                </span>
              </span>
              <span className={`pill ${st === 'in ritardo' ? 'pill-bad' : 'pill-warn'}`}>{st}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
