/**
 * Vocabolario per la lettura, interamente vocalizzato.
 * La lezione in cui ogni parola diventa leggibile è calcolata automaticamente
 * (vedi lib/hebrew.ts) in base alle lettere e alle vocali che contiene.
 */
export type WordCategory =
  | 'saluti' | 'famiglia' | 'persone' | 'casa' | 'cibo' | 'natura' | 'animali'
  | 'numeri' | 'colori' | 'corpo' | 'tempo' | 'scuola' | 'città' | 'aggettivi' | 'parole utili';

export interface Word {
  id: string;
  he: string;
  translit: string;
  it: string;
  category: WordCategory;
  /** Traslitterazioni alternative accettate negli esercizi di scrittura. */
  alt?: string[];
}

const w = (he: string, translit: string, it: string, category: WordCategory, alt?: string[]): Word => ({
  id: translit.replace(/[^a-z]/gi, '-').toLowerCase(),
  he, translit, it, category, alt,
});

export const WORDS: Word[] = [
  // famiglia
  w('אָב', 'av', 'padre', 'famiglia'),
  w('אַבָּא', 'aba', 'papà', 'famiglia', ['abba']),
  w('אִמָּא', 'ima', 'mamma', 'famiglia', ['imma']),
  w('בַּת', 'bat', 'figlia', 'famiglia'),
  w('בֵּן', 'ben', 'figlio', 'famiglia'),
  w('אָח', 'ach', 'fratello', 'famiglia'),
  w('אָחוֹת', 'achot', 'sorella', 'famiglia'),
  w('סָבָא', 'saba', 'nonno', 'famiglia'),
  w('סַבְתָּא', 'savta', 'nonna', 'famiglia'),
  w('דּוֹד', 'dod', 'zio', 'famiglia'),
  w('מִשְׁפָּחָה', 'mishpacha', 'famiglia', 'famiglia'),

  // persone e pronomi
  w('אִישׁ', 'ish', 'uomo', 'persone'),
  w('אִשָּׁה', 'isha', 'donna', 'persone'),
  w('יֶלֶד', 'yeled', 'bambino', 'persone'),
  w('יַלְדָּה', 'yalda', 'bambina', 'persone'),
  w('חָבֵר', 'chaver', 'amico', 'persone'),
  w('מֶלֶךְ', 'melech', 're', 'persone'),
  w('אֲנִי', 'ani', 'io', 'persone'),
  w('אַתָּה', 'ata', 'tu (maschile)', 'persone', ['atta']),
  w('אַתְּ', 'at', 'tu (femminile)', 'persone'),
  w('הוּא', 'hu', 'lui', 'persone'),
  w('הִיא', 'hi', 'lei', 'persone'),
  w('אֲנַחְנוּ', 'anachnu', 'noi', 'persone'),

  // saluti ed espressioni
  w('שָׁלוֹם', 'shalom', 'pace / ciao', 'saluti'),
  w('תּוֹדָה', 'toda', 'grazie', 'saluti', ['todah']),
  w('כֵּן', 'ken', 'sì', 'saluti'),
  w('לֹא', 'lo', 'no', 'saluti'),
  w('בְּרָכָה', 'bracha', 'benedizione', 'saluti', ['beracha']),

  // parole utili
  w('מָה', 'ma', 'che cosa', 'parole utili', ['mah']),
  w('מִי', 'mi', 'chi', 'parole utili'),
  w('אֵיפֹה', 'eifo', 'dove', 'parole utili', ['efo', 'eyfo']),
  w('זֶה', 'ze', 'questo', 'parole utili', ['zeh']),
  w('מִלָּה', 'mila', 'parola', 'parole utili', ['milla']),
  w('אוֹת', 'ot', 'lettera (dell’alfabeto)', 'parole utili'),
  w('אַהֲבָה', 'ahava', 'amore', 'parole utili'),
  w('כֶּסֶף', 'kesef', 'denaro / argento', 'parole utili'),
  w('זְמַן', 'zman', 'tempo', 'parole utili', ['zeman']),
  w('חַג', 'chag', 'festa', 'parole utili'),

  // casa
  w('בַּיִת', 'bayit', 'casa', 'casa'),
  w('דֶּלֶת', 'delet', 'porta', 'casa'),
  w('חַלּוֹן', 'chalon', 'finestra', 'casa', ['challon']),
  w('שֻׁלְחָן', 'shulchan', 'tavolo', 'casa'),
  w('כִּסֵּא', 'kise', 'sedia', 'casa', ['kisse']),
  w('מִטָּה', 'mita', 'letto', 'casa', ['mitta']),
  w('סֵפֶר', 'sefer', 'libro', 'casa'),
  w('סְפָרִים', 'sfarim', 'libri', 'casa', ['sefarim']),
  w('אוֹר', 'or', 'luce', 'casa'),
  w('טֶלֶפוֹן', 'telefon', 'telefono', 'casa'),

  // cibo
  w('לֶחֶם', 'lechem', 'pane', 'cibo'),
  w('מַיִם', 'mayim', 'acqua', 'cibo'),
  w('חָלָב', 'chalav', 'latte', 'cibo'),
  w('קָפֶה', 'kafe', 'caffè', 'cibo'),
  w('תֵּה', 'te', 'tè', 'cibo', ['teh']),
  w('יַיִן', 'yayin', 'vino', 'cibo'),
  w('אֹכֶל', 'ochel', 'cibo', 'cibo'),
  w('תַּפּוּחַ', 'tapuach', 'mela', 'cibo', ['tappuach']),
  w('בָּנָנָה', 'banana', 'banana', 'cibo'),
  w('גְּלִידָה', 'glida', 'gelato', 'cibo', ['gelida']),
  w('שׁוֹקוֹלָד', 'shokolad', 'cioccolato', 'cibo'),
  w('פִּיצָה', 'pitsa', 'pizza', 'cibo', ['pizza']),

  // natura
  w('שֶׁמֶשׁ', 'shemesh', 'sole', 'natura'),
  w('יָרֵחַ', 'yareach', 'luna', 'natura'),
  w('כּוֹכָב', 'kochav', 'stella', 'natura'),
  w('שָׁמַיִם', 'shamayim', 'cielo', 'natura'),
  w('יָם', 'yam', 'mare', 'natura'),
  w('הַר', 'har', 'montagna', 'natura'),
  w('עֵץ', 'ets', 'albero', 'natura'),
  w('פֶּרַח', 'perach', 'fiore', 'natura'),
  w('גֶּשֶׁם', 'geshem', 'pioggia', 'natura'),
  w('שֶׁלֶג', 'sheleg', 'neve', 'natura'),
  w('רוּחַ', 'ruach', 'vento', 'natura'),
  w('אֵשׁ', 'esh', 'fuoco', 'natura'),
  w('גַּן', 'gan', 'giardino', 'natura'),
  w('חוֹף', 'chof', 'spiaggia', 'natura'),
  w('אֶרֶץ', 'erets', 'terra / paese', 'natura'),

  // animali
  w('כֶּלֶב', 'kelev', 'cane', 'animali'),
  w('חָתוּל', 'chatul', 'gatto', 'animali'),
  w('דָּג', 'dag', 'pesce', 'animali'),
  w('סוּס', 'sus', 'cavallo', 'animali'),
  w('צִפּוֹר', 'tsipor', 'uccello', 'animali', ['tsippor']),
  w('פִּיל', 'pil', 'elefante', 'animali'),
  w('קוֹף', 'kof', 'scimmia', 'animali'),
  w('עוֹף', 'of', 'pollo', 'animali'),

  // numeri
  w('אַחַת', 'achat', 'uno (f.)', 'numeri'),
  w('שְׁתַּיִם', 'shtayim', 'due (f.)', 'numeri'),
  w('שָׁלוֹשׁ', 'shalosh', 'tre', 'numeri'),
  w('אַרְבַּע', 'arba', 'quattro', 'numeri'),
  w('חָמֵשׁ', 'chamesh', 'cinque', 'numeri'),
  w('שֵׁשׁ', 'shesh', 'sei', 'numeri'),
  w('שֶׁבַע', 'sheva', 'sette', 'numeri'),
  w('שְׁמוֹנֶה', 'shmone', 'otto', 'numeri', ['shmoneh']),
  w('תֵּשַׁע', 'tesha', 'nove', 'numeri'),
  w('עֶשֶׂר', 'eser', 'dieci', 'numeri'),

  // colori
  w('אָדֹם', 'adom', 'rosso', 'colori'),
  w('כָּחֹל', 'kachol', 'blu', 'colori'),
  w('יָרֹק', 'yarok', 'verde', 'colori'),
  w('לָבָן', 'lavan', 'bianco', 'colori'),
  w('שָׁחֹר', 'shachor', 'nero', 'colori'),
  w('צָהֹב', 'tsahov', 'giallo', 'colori'),
  w('זָהָב', 'zahav', 'oro', 'colori'),

  // corpo
  w('רֹאשׁ', 'rosh', 'testa', 'corpo'),
  w('יָד', 'yad', 'mano', 'corpo'),
  w('רֶגֶל', 'regel', 'piede / gamba', 'corpo'),
  w('עַיִן', 'ayin', 'occhio', 'corpo'),
  w('אֹזֶן', 'ozen', 'orecchio', 'corpo'),
  w('אַף', 'af', 'naso', 'corpo'),
  w('פֶּה', 'pe', 'bocca', 'corpo', ['peh']),
  w('לֵב', 'lev', 'cuore', 'corpo'),

  // tempo
  w('יוֹם', 'yom', 'giorno', 'tempo'),
  w('לַיְלָה', 'layla', 'notte', 'tempo', ['laila']),
  w('בֹּקֶר', 'boker', 'mattina', 'tempo'),
  w('עֶרֶב', 'erev', 'sera', 'tempo'),
  w('שָׁבוּעַ', 'shavua', 'settimana', 'tempo'),
  w('חֹדֶשׁ', 'chodesh', 'mese', 'tempo'),
  w('שָׁנָה', 'shana', 'anno', 'tempo', ['shanah']),
  w('שַׁבָּת', 'shabat', 'sabato', 'tempo', ['shabbat']),
  w('קַיִץ', 'kayits', 'estate', 'tempo'),
  w('חֹרֶף', 'choref', 'inverno', 'tempo'),

  // scuola
  w('תַּלְמִיד', 'talmid', 'studente', 'scuola'),
  w('מוֹרֶה', 'more', 'insegnante', 'scuola', ['moreh']),
  w('כִּתָּה', 'kita', 'classe', 'scuola', ['kitta']),
  w('עִבְרִית', 'ivrit', 'ebraico (lingua)', 'scuola'),
  w('אִיטַלְקִית', 'italkit', 'italiano (lingua)', 'scuola'),
  w('מוּזִיקָה', 'muzika', 'musica', 'scuola'),

  // città
  w('עִיר', 'ir', 'città', 'città'),
  w('רְחוֹב', 'rechov', 'strada / via', 'città'),
  w('דֶּרֶךְ', 'derech', 'cammino / strada', 'città'),
  w('חֲנוּת', 'chanut', 'negozio', 'città'),
  w('עֲבוֹדָה', 'avoda', 'lavoro', 'città'),
  w('מְכוֹנִית', 'mechonit', 'automobile', 'città'),
  w('אוֹטוֹבּוּס', 'otobus', 'autobus', 'città'),
  w('יִשְׂרָאֵל', 'yisrael', 'Israele', 'città', ['israel']),
  w('יְרוּשָׁלַיִם', 'yerushalayim', 'Gerusalemme', 'città'),

  // aggettivi
  w('טוֹב', 'tov', 'buono', 'aggettivi'),
  w('רַע', 'ra', 'cattivo', 'aggettivi'),
  w('גָּדוֹל', 'gadol', 'grande', 'aggettivi'),
  w('קָטָן', 'katan', 'piccolo', 'aggettivi'),
  w('יָפֶה', 'yafe', 'bello', 'aggettivi', ['yafeh']),
  w('חָדָשׁ', 'chadash', 'nuovo', 'aggettivi'),
  w('יָשָׁן', 'yashan', 'vecchio', 'aggettivi'),
];

export interface Sentence {
  id: string;
  he: string;
  translit: string;
  it: string;
}

export const SENTENCES: Sentence[] = [
  { id: 's1', he: 'שַׁבָּת שָׁלוֹם', translit: 'shabat shalom', it: 'Buon sabato (saluto)' },
  { id: 's2', he: 'בֹּקֶר טוֹב', translit: 'boker tov', it: 'Buongiorno' },
  { id: 's3', he: 'עֶרֶב טוֹב', translit: 'erev tov', it: 'Buonasera' },
  { id: 's4', he: 'לַיְלָה טוֹב', translit: 'layla tov', it: 'Buonanotte' },
  { id: 's5', he: 'תּוֹדָה רַבָּה', translit: 'toda raba', it: 'Grazie mille' },
  { id: 's6', he: 'זֶה טוֹב', translit: 'ze tov', it: 'Questo è buono' },
  { id: 's7', he: 'מָה שְׁלוֹמְךָ?', translit: 'ma shlomcha?', it: 'Come stai? (a un uomo)' },
  { id: 's8', he: 'מָה שְׁלוֹמֵךְ?', translit: 'ma shlomech?', it: 'Come stai? (a una donna)' },
  { id: 's9', he: 'אֵיפֹה הַבַּיִת?', translit: 'eifo habayit?', it: 'Dov’è la casa?' },
  { id: 's10', he: 'יֵשׁ לִי כֶּלֶב', translit: 'yesh li kelev', it: 'Ho un cane' },
  { id: 's11', he: 'הַיֶּלֶד אוֹכֵל לֶחֶם', translit: 'hayeled ochel lechem', it: 'Il bambino mangia il pane' },
  { id: 's12', he: 'הַסֵּפֶר עַל הַשֻּׁלְחָן', translit: 'hasefer al hashulchan', it: 'Il libro è sul tavolo' },
  { id: 's13', he: 'אֲנִי לוֹמֵד עִבְרִית', translit: 'ani lomed ivrit', it: 'Io studio l’ebraico (m.)' },
  { id: 's14', he: 'אֲנִי לוֹמֶדֶת עִבְרִית', translit: 'ani lomedet ivrit', it: 'Io studio l’ebraico (f.)' },
  { id: 's15', he: 'הַשֶּׁמֶשׁ גְּדוֹלָה', translit: 'hashemesh gdola', it: 'Il sole è grande' },
  { id: 's16', he: 'שָׁנָה טוֹבָה', translit: 'shana tova', it: 'Buon anno' },
];
