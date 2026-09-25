# Audio registrato

Metti qui i file audio (mp3, m4a, ogg, opus o webm) registrati da una persona madrelingua
e aggiungili a `index.json`, che associa il testo ebraico **identico a quello dei dati**
(con nikud) al nome del file:

```json
{
  "שָׁלוֹם": "shalom.mp3",
  "אָלֶף": "alef.mp3"
}
```

Quando esiste una registrazione l'app la usa al posto della sintesi vocale; per tutto il resto
continua a usare la voce del dispositivo. Nomi dei file: solo lettere latine, numeri, `.`, `-` e `_`.
