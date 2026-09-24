import { useState } from 'react';
import { GLYPHS, GLYPH_BY_ID } from '../data/alphabet';
import { VOWELS, VOWEL_GROUP_LABELS, type VowelGroup } from '../data/nikud';
import { canCombine, syllable, vowelDisplay } from '../lib/quiz';
import { speak } from '../lib/speech';
import { useAppState } from '../lib/store';
import { He, Rich, SpeakButton } from '../components/Hebrew';

const GROUPS: VowelGroup[] = ['A', 'E', 'I', 'O', 'U', 'Sheva'];

export function NikudPage() {
  const { settings } = useAppState();
  const [cons, setCons] = useState('bet');
  const g = GLYPH_BY_ID[cons];
  const consonants = GLYPHS.filter((x) => !x.finalOf);

  return (
    <div className="fade-in stack">
      <div className="page-head">
        <div>
          <h1>Nikud · <span className="he-inline">נִקּוּד</span></h1>
          <p>I segni vocalici. Nell’ebraico moderno più segni hanno lo stesso suono: per leggere basta riconoscere a quale gruppo appartengono.</p>
        </div>
      </div>

      {GROUPS.map((grp) => (
        <div className="card" key={grp}>
          <div className="card-title"><h2>{VOWEL_GROUP_LABELS[grp]}</h2></div>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Segno</th><th>Esempio</th><th>Nome</th><th>Suono</th><th>Descrizione</th></tr>
              </thead>
              <tbody>
                {VOWELS.filter((v) => v.group === grp).map((v) => (
                  <tr key={v.id}>
                    <td><He>{vowelDisplay(v)}</He></td>
                    <td><He>{vowelDisplay(v, 'בּ')}</He></td>
                    <td><b>{v.name}</b><br /><span className="he-inline muted">{v.hebrewName}</span></td>
                    <td><span className="pill pill-primary">{v.sound}</span></td>
                    <td className="small"><Rich text={v.description} /> <span className="muted">(lezione {v.lesson})</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="card">
        <div className="card-title">
          <h2>Tabella delle sillabe</h2>
          <SpeakButton text={g.hebrewName} label={g.name} />
        </div>
        <p className="muted small">Scegli una consonante e tocca una sillaba per ascoltarla.</p>
        <div className="chips" style={{ marginBottom: 16, direction: 'rtl' }}>
          {consonants.map((c) => (
            <button key={c.id} className={`chip ${cons === c.id ? 'active' : ''}`} onClick={() => setCons(c.id)} title={c.name}>
              <span className="he-inline">{c.char}</span>
            </button>
          ))}
        </div>
        <div className="syl-grid">
          {VOWELS.filter((v) => canCombine(g, v)).map((v) => {
            const s = syllable(g, v);
            return (
              <button key={v.id} className="syl" onClick={() => settings.audio && speak(s.text, settings.speechRate)} title={v.name}>
                <He>{s.text}</He>
                <small>{s.translit}</small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
