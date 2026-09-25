import { LESSONS } from '../data/curriculum';
import { GLYPH_BY_ID } from '../data/alphabet';
import { LessonCover } from '../components/LessonArt';
import { isLessonUnlocked, useAppState } from '../lib/store';
import { Icon } from '../components/Icon';

export function LessonsPage() {
  const state = useAppState();
  const done = LESSONS.filter((l) => state.lessons[l.id]?.passed).length;
  // la tappa a cui sei arrivato: la prima sbloccata non ancora superata
  const current = LESSONS.find((l) => isLessonUnlocked(state, l.id) && !state.lessons[l.id]?.passed)?.id;
  return (
    <div className="fade-in">
      <div className="page-head">
        <div>
          <h1>Lezioni</h1>
          <p>Un percorso in {LESSONS.length} tappe: supera il test finale di ogni lezione (almeno 80%) per sbloccare la successiva.</p>
        </div>
        <span className="pill pill-primary">{done}/{LESSONS.length} completate</span>
      </div>
      <div className="lesson-list">
        {LESSONS.map((l) => {
          const unlocked = isLessonUnlocked(state, l.id);
          const p = state.lessons[l.id];
          return (
            <a key={l.id} href={unlocked ? `#/lezioni/${l.id}` : undefined}
              className={`lesson-row ${unlocked ? '' : 'locked'} ${p?.passed ? 'done' : ''} ${l.id === current ? 'current' : ''}`} aria-disabled={!unlocked}
              aria-current={l.id === current ? 'step' : undefined}>
              <div className="lesson-cover-wrap">
                <LessonCover lesson={l} done={p?.passed} />
                {p?.passed && <span className="cover-check" aria-label="Superata"><Icon name="check" size={14} className="" /></span>}
              </div>
              <div className="lesson-info">
                <span className="lesson-step">Lezione {l.id}{l.id === current ? ' · sei qui' : ''}</span>
                <h3>{l.title}</h3>
                <p>{l.subtitle}</p>
                {p && p.attempts > 0 && <p className="small">Miglior punteggio: {p.bestScore}%</p>}
                {!unlocked && <p className="lock-reason">Bloccata: supera il test della lezione {l.id - 1}</p>}
              </div>
              <div className="lesson-letters" aria-hidden="true">{l.glyphs.map((g) => GLYPH_BY_ID[g].char).join(' ')}</div>
              {!unlocked && <Icon name="lock" />}
            </a>
          );
        })}
      </div>
    </div>
  );
}
