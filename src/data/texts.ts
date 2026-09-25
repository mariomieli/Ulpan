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

export interface ReadingText {
  id: string;
  title: string;
  category: TextCategory;
  intro?: string;
  lines: TextLine[];
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
  },
  {
    id: 'mishpacha', title: 'La mia famiglia', category: 'storia',
    lines: [
      { he: 'זֹאת הַמִּשְׁפָּחָה שֶׁלִּי.', translit: 'Zot hamishpacha sheli.', it: 'Questa è la mia famiglia.' },
      { he: 'זֶה אַבָּא, וְזֹאת אִמָּא.', translit: 'Ze aba, vezot ima.', it: 'Questo è papà e questa è mamma.' },
      { he: 'יֵשׁ לִי אָח וְאָחוֹת.', translit: 'Yesh li ach ve’achot.', it: 'Ho un fratello e una sorella.' },
      { he: 'סַבָּא וְסַבְתָּא גָּרִים בִּירוּשָׁלַיִם.', translit: 'Saba vesavta garim biYerushalayim.', it: 'Il nonno e la nonna abitano a Gerusalemme.' },
    ],
  },
  {
    id: 'boker', title: 'La mattina', category: 'storia',
    lines: [
      { he: 'בַּבֹּקֶר אֲנִי קָם.', translit: 'Baboker ani kam.', it: 'La mattina mi alzo.' },
      { he: 'אֲנִי שׁוֹתֶה קָפֶה וְאוֹכֵל לֶחֶם.', translit: 'Ani shote kafe ve’ochel lechem.', it: 'Bevo un caffè e mangio del pane.' },
      { he: 'אַחַר כָּךְ אֲנִי הוֹלֵךְ לָעֲבוֹדָה.', translit: 'Achar kach ani holech la’avoda.', it: 'Poi vado al lavoro.' },
    ],
  },
  {
    id: 'yam', title: 'Al mare', category: 'storia',
    lines: [
      { he: 'הַיּוֹם יֵשׁ שֶׁמֶשׁ.', translit: 'Hayom yesh shemesh.', it: 'Oggi c’è il sole.' },
      { he: 'אֲנַחְנוּ הוֹלְכִים לַיָּם.', translit: 'Anachnu holchim layam.', it: 'Andiamo al mare.' },
      { he: 'הַמַּיִם קָרִים, אֲבָל טוֹב לָנוּ.', translit: 'Hamayim karim, aval tov lanu.', it: 'L’acqua è fredda, ma stiamo bene.' },
    ],
  },
  {
    id: 'kita', title: 'In classe', category: 'storia',
    lines: [
      { he: 'הַמּוֹרֶה אוֹמֵר: שָׁלוֹם, תַּלְמִידִים!', translit: 'Hamore omer: shalom, talmidim!', it: 'L’insegnante dice: ciao, studenti!' },
      { he: 'אֲנַחְנוּ לוֹמְדִים עִבְרִית.', translit: 'Anachnu lomdim ivrit.', it: 'Studiamo l’ebraico.' },
      { he: 'אֲנִי כּוֹתֵב מִלָּה: סֵפֶר.', translit: 'Ani kotev mila: sefer.', it: 'Scrivo una parola: libro.' },
    ],
  },
  {
    id: 'shabat', title: 'Arriva Shabbat', category: 'storia',
    lines: [
      { he: 'בְּיוֹם שִׁשִּׁי בָּעֶרֶב מַתְחִילָה שַׁבָּת.', translit: 'Beyom shishi ba’erev matchila shabat.', it: 'Il venerdì sera comincia lo Shabbat.' },
      { he: 'אִמָּא מַדְלִיקָה נֵרוֹת.', translit: 'Ima madlika nerot.', it: 'La mamma accende le candele.' },
      { he: 'כֻּלָּם אוֹמְרִים: שַׁבָּת שָׁלוֹם!', translit: 'Kulam omrim: shabat shalom!', it: 'Tutti dicono: shabbat shalom!' },
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
    intro: 'La breve preghiera che si recita appena svegli.',
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
      { he: 'הַמּוֹצִיא לֶחֶם מִן הָאָרֶץ.', translit: 'hamotzi lechem min haaretz.', it: 'che fai uscire il pane dalla terra.' },
    ],
  },
  {
    id: 'cartelli-citta', title: 'In giro per la città', category: 'cartelli',
    intro: 'Sui cartelli veri il nikud non c’è: prova a leggerli anche disattivandolo.',
    lines: [
      { he: 'כְּנִיסָה', translit: 'knisa', it: 'Ingresso' },
      { he: 'יְצִיאָה', translit: 'yetsia', it: 'Uscita' },
      { he: 'אֵין כְּנִיסָה', translit: 'ein knisa', it: 'Vietato l’ingresso' },
      { he: 'עֲצוֹר', translit: 'atsor', it: 'Stop' },
      { he: 'זְהִירוּת', translit: 'zehirut', it: 'Attenzione' },
      { he: 'תַּחֲנַת אוֹטוֹבּוּס', translit: 'tachanat otobus', it: 'Fermata dell’autobus' },
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
  },
];
