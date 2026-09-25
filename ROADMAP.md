# Ulpan · Cose da fare

Migliorie proposte e non ancora realizzate, in ordine di priorità suggerita.

## Qualità dei contenuti
- [ ] **Revisione di un madrelingua** di parole (`src/data/words.ts`, `src/data/words-extra.ts` – oltre 1.000), frasi (oltre 200) e testi (`src/data/texts.ts`), in particolare le preghiere: il nikud è stato scritto senza verifica esperta.
- [ ] **Registrare l'audio** con una persona madrelingua (lettere, sillabe, parole, testi): l'app è già pronta a usarlo, basta aggiungere i file in `public/audio/` (vedi `public/audio/LEGGIMI.md`).

## Apprendimento
- [ ] **Scrittura delle lettere**: tracciarle col dito, con l'ordine e il verso corretti dei tratti.
- [ ] **Più testi senza nikud** (notizie brevi, menu, messaggi) e controllo della grafia piena da parte di un madrelingua.
- [ ] **Corsivo ebraico** (scrittura a mano): riconoscere e scrivere le lettere in corsivo.

## Motivazione
- [ ] **Promemoria giornaliero** con notifica sul telefono se il ripasso non è stato fatto.

## Già fatto
- [x] Informativa privacy, conferma dell'età e consenso alle classi registrati sul server
- [x] Caratteri ospitati dall'app (nessuna richiesta a Google), Content Security Policy
- [x] Uso offline dalla prima visita, pubblicazione solo dal ramo principale
- [x] Lettura senza nikud in grafia piena (שולחן, סיפור) ed esame dedicato
- [x] Domande di comprensione sui testi e 4 nuove storie
- [x] Classi con pannello insegnante (progressi per studente, difficoltà della classe, compiti con scadenza, esportazione CSV)
- [x] Gruppi con codice d'invito e classifica (settimanale e totale)
- [x] Testi di lettura graduati (storie, preghiere, cartelli)
- [x] Dettato con tessere lettera+vocale
- [x] Caricamento più veloce (pagine e Supabase su richiesta)
- [x] Eliminazione dell'account da parte dell'utente
- [x] Account online con progressi sincronizzati (Supabase)
