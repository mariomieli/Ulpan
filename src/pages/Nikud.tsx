import { useState } from 'react';
import { GLYPHS, GLYPH_BY_ID } from '../data/alphabet';
import { VOWELS, VOWEL_BY_ID, VOWEL_GROUP_LABELS, type VowelGroup } from '../data/nikud';
import { canCombine, syllable, vowelDisplay } from '../lib/quiz';
import { speak } from '../lib/speech';
import { useAppState } from '../lib/store';
import { Rich, SpeakButton } from '../components/Hebrew';
import { PageHeader } from '../components/PageHeader';

const GROUPS: VowelGroup[] = ['A', 'E', 'I', 'O', 'U', 'Sheva'];
/** Colonne della tabella completa: una per ogni segno, raggruppate per suono. */
const TABLE_VOWELS = ['kamatz', 'patach', 'tsere', 'segol', 'hiriq', 'hiriq-male', 'holam', 'holam-male', 'kubutz', 'shuruk'].map((id) => VOWEL_BY_ID[id]);

export function NikudPage() {
  const { settings } = useAppState();
  const [grp, setGrp] = useState<VowelGroup>('A');
  const [cons, setCons] = useState('bet');
  const g = GLYPH_BY_ID[cons];
  const consonants = GLYPHS.filter((x) => !x.finalOf);
  const say = (text: string) => { if (settings.audio) speak(text, settings.speechRate); };
  const first = (grpId: VowelGroup) => VOWELS.find((v) => v.group === grpId)!;

  return (
    <div className="nikud-page">
      <PageHeader he="נִקּוּד" kicker="I segni delle vocali" title="Nikud (Punteggiatura)">
        <span className="ph-note">Nell’ebraico moderno più segni hanno lo stesso suono: basta riconoscere a quale gruppo appartengono.</span>
      </PageHeader>

      <div className="nikud-layout">
        <div className="nikud-main">
          <div className="nk-groups" role="tablist" aria-label="Gruppi di vocali">
            {GROUPS.map((x) => (
              <button key={x} type="button" role="tab" aria-selected={grp === x} className={grp === x ? 'on' : ''} onClick={() => setGrp(x)}>
                <span lang="he">{vowelDisplay(first(x))}</span>
                <small>{VOWEL_GROUP_LABELS[x]}</small>
              </button>
            ))}
          </div>

          <div className="nk-cards">
            {VOWELS.filter((v) => v.group === grp).map((v, i) => (
              <div key={v.id} className="nk-card" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="nk-mark" lang="he">
                  <span className="m">{vowelDisplay(v)}</span>
                  <span className="e">{vowelDisplay(v, 'בּ')}</span>
                </div>
                <div className="nk-info">
                  <div className="nk-name"><b>{v.name}</b><span className="pill pill-primary">{v.sound}</span></div>
                  <span className="nk-he" lang="he">{v.hebrewName}</span>
                  <span className="nk-desc"><Rich text={v.description} /></span>
                  <span className="nk-les">Lezione {v.lesson}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="nk-table-card">
            <div className="nk-table-title"><b>Tabella completa delle sillabe</b><span>Ogni lettera con ogni vocale</span></div>
            <p className="muted small" style={{ margin: 0 }}>Leggi una riga alla volta da destra a sinistra, poi una colonna. Tocca una sillaba per ascoltarla.</p>
            <div className="table-wrap" dir="rtl">
              <table className="nk-table">
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">Lettera</span></th>
                    {TABLE_VOWELS.map((v) => (
                      <th key={v.id} scope="col" title={v.name}><span lang="he">{vowelDisplay(v)}</span></th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {consonants.map((c) => (
                    <tr key={c.id}>
                      <th scope="row" title={c.name}><span lang="he">{c.char}</span></th>
                      {TABLE_VOWELS.map((v) => {
                        if (!canCombine(c, v)) return <td key={v.id} aria-hidden="true" />;
                        const s = syllable(c, v);
                        return (
                          <td key={v.id}>
                            <button className="nk-cell" lang="he" aria-label={`${s.text}: ${s.translit}`} title={s.translit} onClick={() => say(s.text)}>{s.text}</button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="nk-aside">
          <div className="nk-ah">
            <b>Sillabe di una lettera</b>
            <span>Scegli una consonante e guarda come cambia con ogni vocale. Tocca una sillaba per ascoltarla.</span>
          </div>
          <div className="nk-cons" dir="rtl">
            {consonants.map((c) => (
              <button key={c.id} type="button" lang="he" title={c.name} className={cons === c.id ? 'on' : ''} aria-pressed={cons === c.id} onClick={() => setCons(c.id)}>{c.char}</button>
            ))}
          </div>
          <div className="nk-sel">
            <span lang="he">{g.char}</span><b>{g.name}</b>
            <SpeakButton text={g.hebrewName} label={undefined} className="btn btn-sm btn-ghost" />
          </div>
          <div className="nk-syls" dir="rtl">
            {VOWELS.filter((v) => canCombine(g, v)).map((v, i) => {
              const s = syllable(g, v);
              return (
                <button key={v.id} type="button" className="nk-syl" title={v.name} style={{ animationDelay: `${i * 25}ms` }} onClick={() => say(s.text)}>
                  <span lang="he">{s.text}</span><small dir="ltr">{s.translit}</small>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
