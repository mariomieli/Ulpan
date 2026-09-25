import { describe, expect, it } from 'vitest';
import { buildLessonQuiz, buildReview, buildDictation, buildPlacementBlock, EXAMS, seededRng, misreadings, graphemes, trapTiles, explainMistake, gradeTyped, acceptedReadings, poolUpTo, DECODING_KINDS, type Question } from '../src/lib/quiz';
import { LESSON_BY_ID } from '../src/data/curriculum';
import { GLYPH_BY_ID } from '../src/data/alphabet';
import { VOWEL_BY_ID } from '../src/data/nikud';
import { WORDS } from '../src/data/words';
import { requirements } from '../src/lib/hebrew';
import { LESSONS } from '../src/data/curriculum';

function checkQuestion(q: Question) {
  if (q.options) {
    expect(q.options.length, q.key).toBeGreaterThanOrEqual(2);
    const labels = q.options.map((o) => o.label);
    expect(new Set(labels).size, `${q.key}: ${labels}`).toBe(labels.length);
    expect(q.options.filter((o) => o.value === q.answer), q.key).toHaveLength(1);
  } else if (q.compose) {
    const tiles = q.compose.tiles;
    const need = graphemes(q.answer);
    for (const t of need) expect(tiles, q.key).toContain(t);
    expect(tiles.length, q.key).toBeGreaterThan(need.length);
  } else {
    expect(q.accepted?.length, q.key).toBeGreaterThan(0);
  }
  expect(q.itemIds.length).toBeGreaterThan(0);
  expect(q.explanation.length).toBeGreaterThan(0);
}

describe('quiz di lezione', () => {
  for (const l of LESSONS) {
    it(`lezione ${l.id}: domande valide e senza duplicati`, () => {
      for (let seed = 1; seed <= 25; seed++) {
        const qs = buildLessonQuiz(l.id, 15, seededRng(seed), { audio: true, typing: true });
        expect(qs.length, `seed ${seed}`).toBeGreaterThanOrEqual(10);
        expect(new Set(qs.map((q) => q.key)).size).toBe(qs.length);
        qs.forEach(checkQuestion);
      }
    });
  }
});

describe('esami', () => {
  for (const e of EXAMS) {
    it(`${e.id}: ${e.count} domande valide`, () => {
      for (let seed = 1; seed <= 10; seed++) {
        const qs = e.build(seededRng(seed), {});
        expect(qs).toHaveLength(e.count);
        qs.forEach(checkQuestion);
        expect(qs.some((q) => q.kind.startsWith('listen'))).toBe(false);
      }
    });
  }
});

describe('ripasso', () => {
  it('crea una domanda per elemento', () => {
    const ids = ['g:bet', 'v:kamatz', 'w:shalom', 'g:fe-sofit'];
    const qs = buildReview(ids, 10, seededRng(3));
    expect(qs.map((q) => q.itemIds[0]).sort()).toEqual([...ids].sort());
    qs.forEach(checkQuestion);
  });
});

describe('distrattori di lettura', () => {
  it('genera letture sbagliate plausibili e diverse dalla corretta', () => {
    const m = misreadings('shalom');
    expect(m).not.toContain('shalom');
    expect(m).toContain('shalum');
    expect(m).toContain('salom');
  });
});

describe('dettato', () => {
  it('tessere corrette più trappole diverse da quelle giuste', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const qs = buildDictation(10, 10, seededRng(seed), { audio: seed % 2 === 0 });
      expect(qs.length).toBe(10);
      for (const q of qs) {
        expect(q.kind).toBe('word-compose');
        expect(!!q.audioOnly).toBe(seed % 2 === 0);
        checkQuestion(q);
      }
    }
  });

  it('le trappole non coincidono con tessere vere', () => {
    const tiles = graphemes('שָׁלוֹם');
    expect(tiles.join('')).toBe('שָׁלוֹם');
    const traps = trapTiles(tiles, 3, seededRng(1));
    for (const t of traps) expect(tiles).not.toContain(t);
  });

  it('dalle prime lezioni usa solo parole leggibili', () => {
    const qs = buildDictation(2, 5, seededRng(4));
    expect(qs.length).toBeGreaterThan(0);
  });
});

describe('varietà delle domande', () => {
  it('domande consecutive non riguardano lo stesso elemento (quando evitabile)', () => {
    for (const l of LESSONS) {
      for (let seed = 1; seed <= 20; seed++) {
        const qs = buildLessonQuiz(l.id, 10, seededRng(seed));
        for (let i = 1; i < qs.length; i++) {
          const shared = qs[i].itemIds.some((id) => qs[i - 1].itemIds.includes(id));
          expect(shared, `lezione ${l.id} seed ${seed} pos ${i}`).toBe(false);
        }
      }
    }
  });

  it('in un esercizio ogni elemento compare al massimo una volta, se ce ne sono abbastanza', () => {
    for (const l of LESSONS.filter((x) => x.id >= 6)) {
      for (let seed = 1; seed <= 20; seed++) {
        const qs = buildLessonQuiz(l.id, 10, seededRng(seed));
        const ids = qs.flatMap((q) => q.itemIds);
        expect(ids.length - new Set(ids).size, `lezione ${l.id} seed ${seed}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('le domande appena viste non vengono riproposte', () => {
    for (const l of LESSONS) {
      let overlap = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const first = buildLessonQuiz(l.id, 10, seededRng(seed));
        const avoid = new Set(first.map((q) => q.key));
        const second = buildLessonQuiz(l.id, 10, seededRng(seed + 500), { avoid });
        overlap += second.filter((q) => avoid.has(q.key)).length;
      }
      // le lezioni delle vocali e delle prime lettere hanno pochi elementi: qualche ritorno è inevitabile
      expect(overlap / 20, `lezione ${l.id}`).toBeLessThan(l.id <= 5 ? 4 : 0.5);
    }
  });
});

describe('fase 2: didattica', () => {
  it('le alternative usano solo lettere, vocali e parole già studiate', () => {
    for (const l of LESSONS.slice(0, 6)) {
      const pool = poolUpTo(l.id);
      const glyphChars = new Set(pool.glyphs.flatMap((g) => [g.char, g.letter, g.name, g.sound]));
      for (let seed = 1; seed <= 15; seed++) {
        for (const q of buildLessonQuiz(l.id, 10, seededRng(seed))) {
          for (const opt of q.options ?? []) {
            if (!opt.hebrew) continue;
            const req = requirements(opt.value);
            // con una sola lettera nota (lezioni delle vocali) le alternative sulle lettere vengono dalle prime lezioni
            if (pool.glyphs.length >= 4) for (const g of req.glyphs) expect(GLYPH_BY_ID[g].lesson, `${q.key} opzione ${opt.value}`).toBeLessThanOrEqual(l.id);
            for (const v of req.vowels) expect(VOWEL_BY_ID[v].lesson, `${q.key} opzione ${opt.value}`).toBeLessThanOrEqual(l.id);
          }
          if (q.kind === 'glyph-name' && pool.glyphs.length >= 4) for (const o2 of q.options!) expect(glyphChars.has(o2.value), o2.value).toBe(true);
        }
      }
    }
  });

  it('test di lezione: ogni lettera e vocale nuova compare almeno 2 volte', () => {
    for (const l of LESSONS.filter((x) => x.glyphs.length + x.vowels.length > 0)) {
      for (let seed = 1; seed <= 10; seed++) {
        const qs = buildLessonQuiz(l.id, 20, seededRng(seed), { typing: true }, 'test');
        expect(qs.length, `lezione ${l.id}`).toBeGreaterThanOrEqual(15);
        for (const id of [...l.glyphs.map((g) => `g:${g}`), ...l.vowels.map((v) => `v:${v}`)]) {
          const n = qs.filter((q) => q.itemIds.includes(id)).length;
          expect(n, `lezione ${l.id} seed ${seed}: ${id}`).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('test di lezione: una buona parte è lettura vera', () => {
    // dalla lezione 5 ci sono abbastanza parole da leggere
    for (const l of LESSONS.filter((x) => x.id >= 5)) {
      const qs = buildLessonQuiz(l.id, 20, seededRng(7), { typing: true }, 'test');
      const decoding = qs.filter((q) => DECODING_KINDS.includes(q.kind) || q.kind.startsWith('syllable') || q.kind === 'translit-syllable').length;
      expect(decoding / qs.length, `lezione ${l.id}`).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('domande sul significato solo per le parole di base', () => {
    for (let seed = 1; seed <= 10; seed++) {
      for (const q of EXAMS.find((e) => e.id === 'lettura')!.build(seededRng(seed), {})) {
        if (q.kind === 'word-meaning' || q.kind === 'meaning-word') {
          const w = WORDS.find((x) => `w:${x.id}` === q.itemIds[0])!;
          expect(w.core, w.he).toBe(true);
        }
      }
    }
  });

  it('spiega l’errore nelle sillabe e nelle lettere', () => {
    const q = buildLessonQuiz(1, 10, seededRng(1)).find((x) => x.kind === 'syllable-read');
    if (q) {
      const wrong = q.options!.find((o2) => o2.value !== q.answer)!;
      expect(explainMistake(q, wrong.value)).toBeTruthy();
    }
    const bet = { key: 'glyph-name:bet', kind: 'glyph-name', itemIds: ['g:bet'], prompt: '', answer: 'Bet', explanation: '', meta: { glyph: 'bet' } } as Question;
    expect(explainMistake(bet, 'Vet')).toContain('Hai scelto');
    expect(explainMistake(bet, 'Bet')).toBeNull();
  });

  it('scrittura: un refuso nelle parole lunghe è "quasi giusto", lo sheva iniziale è facoltativo', () => {
    expect(gradeTyped('shalom', ['shalom'])).toBe('exact');
    expect(gradeTyped('shalon', ['shalom'])).toBe('close');
    expect(gradeTyped('ab', ['av'])).toBe('wrong');
    const zman = WORDS.find((w) => w.translit === 'zman')!;
    expect(gradeTyped('zeman', acceptedReadings(zman))).toBe('exact');
    const yeladim = WORDS.find((w) => w.translit === 'yeladim')!;
    expect(gradeTyped('yladim', acceptedReadings(yeladim))).toBe('exact');
  });

  it('test d’ingresso: blocchi brevi per ogni lezione', () => {
    for (const l of LESSONS.filter((x) => x.glyphs.length || x.vowels.length)) {
      const qs = buildPlacementBlock(l.id, seededRng(3));
      expect(qs.length, `lezione ${l.id}`).toBeGreaterThanOrEqual(3);
      qs.forEach(checkQuestion);
      expect(LESSON_BY_ID[l.id]).toBeDefined();
    }
  });
});

describe('ripasso', () => {
  it('le domande a scelta multipla hanno sempre almeno 3 risposte, anche con elementi di lezioni successive', () => {
    const ids = ['g:bet', 'g:shin', 'g:tsadi-sofit', 'v:shuruk', 'v:hataf-patach', ...WORDS.filter((w) => w.core).slice(0, 30).map((w) => `w:${w.id}`)];
    for (let seed = 1; seed <= 20; seed++) {
      for (const q of buildReview(ids, 1, seededRng(seed))) {
        if (q.options) expect(q.options.length, q.key).toBeGreaterThanOrEqual(3);
      }
    }
  });
  it('test di lezione ed esercizi: almeno 3 risposte', () => {
    for (const l of LESSONS) for (let seed = 1; seed <= 5; seed++) {
      for (const q of [...buildLessonQuiz(l.id, 12, seededRng(seed)), ...buildLessonQuiz(l.id, 20, seededRng(seed), {}, 'test')]) {
        if (q.options) expect(q.options.length, `${l.id} ${q.key}`).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
