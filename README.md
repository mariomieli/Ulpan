# Ulpan · Impara a leggere l'ebraico

Web app (PWA) in italiano per imparare a **leggere l'ebraico** da zero: alfabeto, nikud (vocali), sillabe, parole e frasi, con esercizi, test di lezione, esami e ripasso a ripetizione dilazionata.

## Funzionalità

- **10 lezioni progressive**: ogni lezione ha teoria, schede di studio, esercizi con correzione immediata e un test finale (soglia 80%) che sblocca la lezione successiva.
- **Alfabeto completo**: 22 lettere, 5 forme finali, varianti con dagesh (בּ/ב, כּ/כ, פּ/פ) e shin/sin, con pronuncia spiegata per italiani, lettere da non confondere, valore numerico ed esempi.
- **Nikud**: tutti i 15 segni vocalici raggruppati per suono e tabella interattiva delle sillabe.
- **Lettura**: 140 parole e 16 frasi vocalizzate, filtrabili per lezione e categoria; nikud, traslitterazione e significato attivabili/disattivabili; modalità flashcard.
- **Quiz variati**: riconoscimento di lettere, suoni, vocali e forme finali, lettura di sillabe e parole, significato, risposta scritta in traslitterazione, domande di ascolto. I distrattori sono scelti tra lettere simili e letture “quasi giuste”.
- **Esami**: alfabeto, nikud, lettura ed esame finale a tempo, con revisione degli errori.
- **Ripasso intelligente** (algoritmo tipo SM-2): ogni lettera, vocale e parola torna quando stai per dimenticarla.
- **Progressi**: XP, serie di giorni, obiettivo giornaliero, mappa di padronanza, punti deboli.
- **Audio** con la sintesi vocale del browser (voce ebraica), tema chiaro/scuro, due caratteri ebraici, dimensione regolabile, funzionamento offline, esportazione/importazione dei progressi.

La lezione in cui ogni parola diventa leggibile è calcolata automaticamente analizzando lettere e segni vocalici, così gli esercizi usano solo ciò che hai già studiato.

## Sviluppo

```bash
npm install
npm run dev        # server di sviluppo
npm test           # test unitari (dati, parser, quiz, ripasso)
npm run typecheck
npm run build      # build statica in dist/
```

La build è statica (router basato su hash, `base: './'`): si può pubblicare su GitHub Pages, Netlify, Vercel o qualsiasi hosting di file.

## Struttura

```
src/
  data/        alfabeto, nikud, vocabolario, curriculum delle lezioni
  lib/         parser dell'ebraico, generatore di quiz, SRS, stato persistente, sintesi vocale
  components/  quiz, testo ebraico, icone
  pages/       Home, Lezioni, Alfabeto, Nikud, Lettura, Ripasso, Test, Progressi, Impostazioni
tests/         test Vitest
```

I progressi sono salvati nel `localStorage` del browser.
