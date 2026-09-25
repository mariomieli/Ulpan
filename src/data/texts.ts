/**
 * Testi di lettura graduati: brevi storie, preghiere comuni e cartelli reali.
 * Il livello (lezione minima) è calcolato automaticamente dal contenuto.
 */
export type TextCategory = 'storia' | 'preghiera' | 'cartelli';

export interface TextLine {
  he: string;
  translit: string;
  it: string;
}

/** Domanda di comprensione: la prima opzione è quella giusta (l'ordine si mescola a schermo). */
export interface TextQuestion {
  q: string;
  options: [string, string, string, string];
}

export interface ReadingText {
  id: string;
  title: string;
  category: TextCategory;
  intro?: string;
  lines: TextLine[];
  questions?: TextQuestion[];
}

export const TEXT_CATEGORY_LABELS: Record<TextCategory, string> = {
  storia: 'Storie',
  preghiera: 'Preghiere',
  cartelli: 'Cartelli e insegne',
};

export const TEXTS: ReadingText[] = [
  {
    id: 'dani', title: 'Io sono Dani', category: 'storia',
    lines: [
      { he: 'שָׁלוֹם! אֲנִי דָּנִי.', translit: 'Shalom! Ani Dani.', it: 'Ciao! Io sono Dani.' },
      { he: 'אֲנִי יֶלֶד.', translit: 'Ani yeled.', it: 'Sono un bambino.' },
      { he: 'יֵשׁ לִי כֶּלֶב.', translit: 'Yesh li kelev.', it: 'Ho un cane.' },
      { he: 'הַכֶּלֶב גָּדוֹל.', translit: 'Hakelev gadol.', it: 'Il cane è grande.' },
    ],
    questions: [
      { q: 'Che animale ha Dani?', options: ['Un cane', 'Un gatto', 'Un pesce', 'Un uccello'] },
      { q: 'Com’è il cane?', options: ['Grande', 'Piccolo', 'Nero', 'Vecchio'] },
    ],
  },
  {
    id: 'mishpacha', title: 'La mia famiglia', category: 'storia',
    lines: [
      { he: 'זֹאת הַמִּשְׁפָּחָה שֶׁלִּי.', translit: 'Zot hamishpacha sheli.', it: 'Questa è la mia famiglia.' },
      { he: 'זֶה אַבָּא, וְזֹאת אִמָּא.', translit: 'Ze aba, vezot ima.', it: 'Questo è papà e questa è mamma.' },
      { he: 'יֵשׁ לִי אָח וְאָחוֹת.', translit: 'Yesh li ach ve’achot.', it: 'Ho un fratello e una sorella.' },
      { he: 'סַבָּא וְסַבְתָּא גָּרִים בִּירוּשָׁלַיִם.', translit: 'Saba vesavta garim biYerushalayim.', it: 'Il nonno e la nonna abitano a Gerusalemme.' },
    ],
    questions: [
      { q: 'Chi ha il narratore oltre ai genitori?', options: ['Un fratello e una sorella', 'Due fratelli', 'Due sorelle', 'Nessuno'] },
      { q: 'Dove abitano i nonni?', options: ['A Gerusalemme', 'A Tel Aviv', 'A Haifa', 'A Roma'] },
    ],
  },
  {
    id: 'boker', title: 'La mattina', category: 'storia',
    lines: [
      { he: 'בַּבֹּקֶר אֲנִי קָם.', translit: 'Baboker ani kam.', it: 'La mattina mi alzo.' },
      { he: 'אֲנִי שׁוֹתֶה קָפֶה וְאוֹכֵל לֶחֶם.', translit: 'Ani shote kafe ve’ochel lechem.', it: 'Bevo un caffè e mangio del pane.' },
      { he: 'אַחַר כָּךְ אֲנִי הוֹלֵךְ לָעֲבוֹדָה.', translit: 'Achar kach ani holech la’avoda.', it: 'Poi vado al lavoro.' },
    ],
    questions: [
      { q: 'Che cosa beve la mattina?', options: ['Caffè', 'Tè', 'Latte', 'Acqua'] },
      { q: 'Dove va dopo colazione?', options: ['Al lavoro', 'A scuola', 'Al mare', 'A casa'] },
    ],
  },
  {
    id: 'yam', title: 'Al mare', category: 'storia',
    lines: [
      { he: 'הַיּוֹם יֵשׁ שֶׁמֶשׁ.', translit: 'Hayom yesh shemesh.', it: 'Oggi c’è il sole.' },
      { he: 'אֲנַחְנוּ הוֹלְכִים לַיָּם.', translit: 'Anachnu holchim layam.', it: 'Andiamo al mare.' },
      { he: 'הַמַּיִם קָרִים, אֲבָל טוֹב לָנוּ.', translit: 'Hamayim karim, aval tov lanu.', it: 'L’acqua è fredda, ma stiamo bene.' },
    ],
    questions: [
      { q: 'Com’è l’acqua?', options: ['Fredda', 'Calda', 'Sporca', 'Profonda'] },
      { q: 'Che tempo fa?', options: ['C’è il sole', 'Piove', 'Nevica', 'C’è vento'] },
    ],
  },
  {
    id: 'kita', title: 'In classe', category: 'storia',
    lines: [
      { he: 'הַמּוֹרֶה אוֹמֵר: שָׁלוֹם, תַּלְמִידִים!', translit: 'Hamore omer: shalom, talmidim!', it: 'L’insegnante dice: ciao, studenti!' },
      { he: 'אֲנַחְנוּ לוֹמְדִים עִבְרִית.', translit: 'Anachnu lomdim ivrit.', it: 'Studiamo l’ebraico.' },
      { he: 'אֲנִי כּוֹתֵב מִלָּה: סֵפֶר.', translit: 'Ani kotev mila: sefer.', it: 'Scrivo una parola: libro.' },
    ],
    questions: [
      { q: 'Che cosa studiano?', options: ['L’ebraico', 'L’inglese', 'La matematica', 'L’italiano'] },
      { q: 'Quale parola scrive?', options: ['Libro', 'Casa', 'Cane', 'Pane'] },
    ],
  },
  {
    id: 'shabat', title: 'Arriva Shabbat', category: 'storia',
    lines: [
      { he: 'בְּיוֹם שִׁשִּׁי בָּעֶרֶב מַתְחִילָה שַׁבָּת.', translit: 'Beyom shishi ba’erev matchila shabat.', it: 'Il venerdì sera comincia lo Shabbat.' },
      { he: 'אִמָּא מַדְלִיקָה נֵרוֹת.', translit: 'Ima madlika nerot.', it: 'La mamma accende le candele.' },
      { he: 'כֻּלָּם אוֹמְרִים: שַׁבָּת שָׁלוֹם!', translit: 'Kulam omrim: shabat shalom!', it: 'Tutti dicono: shabbat shalom!' },
    ],
    questions: [
      { q: 'Quando comincia lo Shabbat?', options: ['Il venerdì sera', 'Il sabato mattina', 'La domenica', 'Il giovedì sera'] },
      { q: 'Che cosa accende la mamma?', options: ['Le candele', 'La luce', 'Il forno', 'Il fuoco del barbecue'] },
    ],
  },
  {
    id: 'supermarket', title: 'Al supermercato', category: 'storia',
    lines: [
      { he: 'אֲנִי הוֹלֶכֶת לַסּוּפֶּרְמַרְקֶט.', translit: 'Ani holechet lasupermarket.', it: 'Vado al supermercato.' },
      { he: 'אֲנִי קוֹנָה חָלָב, לֶחֶם וְתַפּוּחִים.', translit: 'Ani kona chalav, lechem vetapuchim.', it: 'Compro latte, pane e mele.' },
      { he: 'הַכֹּל עוֹלֶה חֲמִשִּׁים שֶׁקֶל.', translit: 'Hakol ole chamishim shekel.', it: 'Tutto costa cinquanta shekel.' },
      { he: 'תּוֹדָה רַבָּה וּלְהִתְרָאוֹת!', translit: 'Toda raba ulehitraot!', it: 'Grazie mille e arrivederci!' },
    ],
    questions: [
      { q: 'Che cosa compra?', options: ['Latte, pane e mele', 'Caffè e pane', 'Pesce e riso', 'Acqua e formaggio'] },
      { q: 'Quanto costa tutto?', options: ['50 shekel', '15 shekel', '5 shekel', '100 shekel'] },
    ],
  },
  {
    id: 'chaver', title: 'Un nuovo amico', category: 'storia',
    lines: [
      { he: 'יֵשׁ לִי חָבֵר חָדָשׁ.', translit: 'Yesh li chaver chadash.', it: 'Ho un nuovo amico.' },
      { he: 'קוֹרְאִים לוֹ יוֹסִי.', translit: 'Korim lo Yosi.', it: 'Si chiama Yossi.' },
      { he: 'הוּא גָּר בְּתֵל אָבִיב.', translit: 'Hu gar beTel Aviv.', it: 'Abita a Tel Aviv.' },
      { he: 'אֲנַחְנוּ מְשַׂחֲקִים כַּדּוּרֶגֶל בַּפַּארְק.', translit: 'Anachnu mesachakim kaduregel bapark.', it: 'Giochiamo a calcio al parco.' },
    ],
    questions: [
      { q: 'Dove abita Yossi?', options: ['A Tel Aviv', 'A Gerusalemme', 'A Haifa', 'A Eilat'] },
      { q: 'Che cosa fanno al parco?', options: ['Giocano a calcio', 'Leggono', 'Mangiano', 'Dormono'] },
    ],
  },
  {
    id: 'mezeg', title: 'Che tempo fa?', category: 'storia',
    lines: [
      { he: 'הַיּוֹם קַר וְיֵשׁ גֶּשֶׁם.', translit: 'Hayom kar veyesh geshem.', it: 'Oggi fa freddo e piove.' },
      { he: 'אֲנִי לוֹקֵחַ מְעִיל וּמִטְרִיָּה.', translit: 'Ani lokeach meil umitriya.', it: 'Prendo il cappotto e l’ombrello.' },
      { he: 'מָחָר יִהְיֶה חַם.', translit: 'Machar yihye cham.', it: 'Domani farà caldo.' },
    ],
    questions: [
      { q: 'Che tempo fa oggi?', options: ['Fa freddo e piove', 'Fa caldo e c’è il sole', 'Nevica', 'C’è vento'] },
      { q: 'E domani?', options: ['Farà caldo', 'Pioverà', 'Nevicherà', 'Farà freddo'] },
    ],
  },
  {
    id: 'misada', title: 'Al ristorante', category: 'storia',
    lines: [
      { he: 'אֲנַחְנוּ בַּמִּסְעָדָה.', translit: 'Anachnu bamis’ada.', it: 'Siamo al ristorante.' },
      { he: 'הַמֶּלְצַר שׁוֹאֵל: מָה אַתֶּם רוֹצִים?', translit: 'Hameltsar shoel: ma atem rotsim?', it: 'Il cameriere chiede: che cosa volete?' },
      { he: 'אַבָּא רוֹצֶה דָּג, וַאֲנִי רוֹצָה פָלָאפֶל.', translit: 'Aba rotse dag, va’ani rotsa falafel.', it: 'Papà vuole il pesce e io voglio il falafel.' },
      { he: 'הָאֹכֶל טָעִים מְאֹד!', translit: 'Haochel ta’im meod!', it: 'Il cibo è buonissimo!' },
    ],
    questions: [
      { q: 'Chi chiede che cosa vogliono?', options: ['Il cameriere', 'Il papà', 'La mamma', 'Il cuoco'] },
      { q: 'Che cosa vuole il papà?', options: ['Il pesce', 'Il falafel', 'Il pane', 'L’insalata'] },
    ],
  },
  {
    id: 'shema', title: 'Shemà Israel', category: 'preghiera',
    intro: 'Il versetto centrale della preghiera ebraica (Deuteronomio 6,4). Il Nome divino, scritto qui יְיָ, si legge “Adonai”.',
    lines: [
      { he: 'שְׁמַע יִשְׂרָאֵל', translit: 'Shema Yisrael', it: 'Ascolta, Israele:' },
      { he: 'יְיָ אֱלֹהֵינוּ יְיָ אֶחָד.', translit: 'Adonai Eloheinu Adonai echad.', it: 'il Signore è il nostro Dio, il Signore è uno.' },
    ],
  },
  {
    id: 'mode-ani', title: 'Modè anì', category: 'preghiera',
    intro: 'La breve preghiera che si recita appena svegli. Le donne dicono מוֹדָה אֲנִי (modà anì).',
    lines: [
      { he: 'מוֹדֶה אֲנִי לְפָנֶיךָ', translit: 'Mode ani lefanecha', it: 'Ti ringrazio,' },
      { he: 'מֶלֶךְ חַי וְקַיָּם,', translit: 'melech chai vekayam,', it: 'Re vivente ed eterno,' },
      { he: 'שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי בְּחֶמְלָה,', translit: 'shehechezarta bi nishmati bechemla,', it: 'perché mi hai restituito l’anima con misericordia:' },
      { he: 'רַבָּה אֱמוּנָתֶךָ.', translit: 'raba emunatecha.', it: 'grande è la Tua fedeltà.' },
    ],
  },
  {
    id: 'hamotzi', title: 'Benedizione del pane', category: 'preghiera',
    intro: 'Si recita prima di mangiare il pane. La prima riga è la formula con cui iniziano quasi tutte le benedizioni.',
    lines: [
      { he: 'בָּרוּךְ אַתָּה יְיָ', translit: 'Baruch ata Adonai', it: 'Benedetto sei Tu, Signore' },
      { he: 'אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם,', translit: 'Eloheinu melech haolam,', it: 'nostro Dio, Re del mondo,' },
      { he: 'הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ.', translit: 'hamotsi lechem min haarets.', it: 'che fai uscire il pane dalla terra.' },
    ],
  },
  {
    id: 'nerot-shabat', title: 'Accensione dei lumi di Shabbat', category: 'preghiera',
    intro: 'Si recita il venerdì sera accendendo le candele. Le benedizioni per un precetto (mitzvà) continuano con אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו.',
    lines: [
      { he: 'בָּרוּךְ אַתָּה יְיָ', translit: 'Baruch ata Adonai', it: 'Benedetto sei Tu, Signore' },
      { he: 'אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם,', translit: 'Eloheinu melech haolam,', it: 'nostro Dio, Re del mondo,' },
      { he: 'אֲשֶׁר קִדְּשָׁנוּ בְּמִצְוֹתָיו', translit: 'asher kideshanu bemitsvotav', it: 'che ci hai santificati con i Tuoi precetti' },
      { he: 'וְצִוָּנוּ לְהַדְלִיק נֵר שֶׁל שַׁבָּת.', translit: 'vetsivanu lehadlik ner shel shabat.', it: 'e ci hai comandato di accendere il lume dello Shabbat.' },
    ],
  },
  {
    id: 'kiddush-yayin', title: 'Benedizione del vino', category: 'preghiera',
    intro: 'Si recita sul vino, per esempio nel Kiddush di Shabbat e delle feste.',
    lines: [
      { he: 'בָּרוּךְ אַתָּה יְיָ', translit: 'Baruch ata Adonai', it: 'Benedetto sei Tu, Signore' },
      { he: 'אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם,', translit: 'Eloheinu melech haolam,', it: 'nostro Dio, Re del mondo,' },
      { he: 'בּוֹרֵא פְּרִי הַגָּפֶן.', translit: 'borei pri hagafen.', it: 'che crei il frutto della vite.' },
    ],
  },
  {
    id: 'shehecheyanu', title: 'Shehecheyanu', category: 'preghiera',
    intro: 'La benedizione per le occasioni nuove e liete: l’inizio di una festa, un frutto di stagione, un abito nuovo.',
    lines: [
      { he: 'בָּרוּךְ אַתָּה יְיָ', translit: 'Baruch ata Adonai', it: 'Benedetto sei Tu, Signore' },
      { he: 'אֱלֹהֵינוּ מֶלֶךְ הָעוֹלָם,', translit: 'Eloheinu melech haolam,', it: 'nostro Dio, Re del mondo,' },
      { he: 'שֶׁהֶחֱיָנוּ וְקִיְּמָנוּ', translit: 'shehecheyanu vekiyemanu', it: 'che ci hai fatto vivere, ci hai sostenuti' },
      { he: 'וְהִגִּיעָנוּ לַזְּמַן הַזֶּה.', translit: 'vehigianu lazman haze.', it: 'e ci hai fatto giungere a questo momento.' },
    ],
  },
  {
    id: 'veahavta', title: 'Veahavtà', category: 'preghiera',
    intro: 'Segue lo Shemà (Deuteronomio 6,5). Il segno ׇ in בְּכׇל è un kamatz katan: si legge “o” (bechol).',
    lines: [
      { he: 'בָּרוּךְ שֵׁם כְּבוֹד מַלְכוּתוֹ לְעוֹלָם וָעֶד.', translit: 'Baruch shem kevod malchuto leolam vaed.', it: 'Benedetto il Nome della gloria del Suo regno per sempre.' },
      { he: 'וְאָהַבְתָּ אֵת יְיָ אֱלֹהֶיךָ', translit: 'Veahavta et Adonai Elohecha', it: 'Amerai il Signore tuo Dio' },
      { he: 'בְּכׇל־לְבָבְךָ וּבְכׇל־נַפְשְׁךָ', translit: 'bechol levavcha uvechol nafshecha', it: 'con tutto il tuo cuore e con tutta la tua anima' },
      { he: 'וּבְכׇל־מְאֹדֶךָ.', translit: 'uvechol meodecha.', it: 'e con tutte le tue forze.' },
    ],
  },
  {
    id: 'adon-olam', title: 'Adon olam (prima strofa)', category: 'preghiera',
    intro: 'Un inno cantato alla fine di molte funzioni.',
    lines: [
      { he: 'אֲדוֹן עוֹלָם אֲשֶׁר מָלַךְ', translit: 'Adon olam asher malach', it: 'Signore del mondo, che regnò' },
      { he: 'בְּטֶרֶם כׇּל־יְצִיר נִבְרָא.', translit: 'beterem kol yetsir nivra.', it: 'prima che ogni creatura fosse creata.' },
      { he: 'לְעֵת נַעֲשָׂה בְחֶפְצוֹ כֹּל,', translit: 'Le’et na’asa vecheftso kol,', it: 'Quando tutto fu fatto per Sua volontà,' },
      { he: 'אֲזַי מֶלֶךְ שְׁמוֹ נִקְרָא.', translit: 'azai melech shemo nikra.', it: 'allora il Suo Nome fu proclamato Re.' },
    ],
  },
  {
    id: 'cartelli-citta', title: 'In giro per la città', category: 'cartelli',
    intro: 'Sui cartelli veri il nikud non c’è: prova a leggerli anche disattivandolo.',
    lines: [
      { he: 'כְּנִיסָה', translit: 'knisa', it: 'Ingresso' },
      { he: 'יְצִיאָה', translit: 'yetsia', it: 'Uscita' },
      { he: 'אֵין כְּנִיסָה', translit: 'ein knisa', it: 'Vietato l’ingresso' },
      { he: 'עֲצֹר', translit: 'atsor', it: 'Stop' },
      { he: 'זְהִירוּת', translit: 'zehirut', it: 'Attenzione' },
      { he: 'תַּחֲנַת אוֹטוֹבּוּס', translit: 'tachanat otobus', it: 'Fermata dell’autobus' },
    ],
    questions: [
      { q: 'Su una porta leggi אֵין כְּנִיסָה: che cosa significa?', options: ['Vietato l’ingresso', 'Ingresso', 'Uscita', 'Attenzione'] },
      { q: 'Stai cercando l’autobus: quale cartello segui?', options: ['תַּחֲנַת אוֹטוֹבּוּס', 'יְצִיאָה', 'עֲצֹר', 'זְהִירוּת'] },
    ],
  },
  {
    id: 'cartelli-negozi', title: 'Negozi e servizi', category: 'cartelli',
    lines: [
      { he: 'פָּתוּחַ', translit: 'patuach', it: 'Aperto' },
      { he: 'סָגוּר', translit: 'sagur', it: 'Chiuso' },
      { he: 'שֵׁרוּתִים', translit: 'sherutim', it: 'Bagni' },
      { he: 'בֵּית קָפֶה', translit: 'beit kafe', it: 'Caffetteria' },
      { he: 'מִשְׁטָרָה', translit: 'mishtara', it: 'Polizia' },
      { he: 'בֵּית חוֹלִים', translit: 'beit cholim', it: 'Ospedale' },
    ],
    questions: [
      { q: 'Sulla porta del negozio c’è scritto סָגוּר: puoi entrare?', options: ['No, è chiuso', 'Sì, è aperto', 'È la caffetteria', 'È la polizia'] },
      { q: 'Ti senti male: quale insegna cerchi?', options: ['בֵּית חוֹלִים', 'בֵּית קָפֶה', 'שֵׁרוּתִים', 'פָּתוּחַ'] },
    ],
  },
];
