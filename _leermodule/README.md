# Leermodule: het standaardformat voor huiswerk-apps

Elke leer-app op de site gebruikt dezelfde opbouw, huisstijl en code. Een app is alleen nog een HTML-bestand met **inhoud als data**. Alles wat Thijs ziet en doet, komt uit de gedeelde engine in deze map.

```
_leermodule/
├── README.md              ← dit document: het format
├── v1/
│   ├── leermodule.css     ← huisstijl "schrift" (licht + donker)
│   └── leermodule.js      ← engine: leren, kaartjes, oefenen, toetsen
└── sjablonen/
    ├── leerstof.html      ← uitleg + kaartjes + meerkeuze/typ/open vragen
    └── woordjes.html      ← woordjes voor een vreemde taal
```

De map begint met `_`, dus hij verschijnt niet in het menu. De sjablonen zijn wel te bekijken op `<site>/_leermodule/sjablonen/leerstof.html`.

## Wat Thijs krijgt (elke app hetzelfde)

**Startscherm**
- *Wat wil je leren?*: onderdelen (paragrafen, lessen) aan- en uitvinken. De keuze wordt onthouden.
- Daarnaast drie stappen:
  1. **Leren**: *Uitleg lezen* (leerstof in uitklapblokken, woordenlijst met 🔊) en *Kaartjes* (kijken, omdraaien, "Ken ik" / "Nog niet"; wat je nog niet kent, komt terug).
  2. **Oefenen**: vragen met directe feedback en uitleg. Fouten komen een paar vragen later terug, tot alles goed is.
  3. **Toetsen**: zonder hulp, met een cijfer van 1 tot 10 (rood omcirkeld), alle antwoorden nagekeken, en de knop "Oefen mijn fouten". De laatste cijfers en de fouten van de vorige toets worden onthouden.

**Namen**
- Wie de site of een app voor het eerst opent, typt een voornaam (of tikt een eerder gebruikte naam aan).
- Voortgang, cijfers en fouten worden per naam bewaard onder `'<id>-v1@<naam>'`, alleen op dat apparaat.
- Met de knop 👤 rechtsboven wissel je van naam.
- De naam deelt de app met het menu via `huiswerk:naam` en `huiswerk:namen`; in code via `Leermodule.Profiel.naam()`, `.namen()` en `.kies(naam)`.
- Voortgang van vóór v1.1 (sleutel zonder naam) gaat één keer over naar de eerste naam die de app opent.

**Laptop en mobiel**
- Op een laptop staan "kiezen" en de drie stappen naast elkaar. Op iPad en telefoon staan ze onder elkaar.
- Alle knoppen zijn minstens 44px hoog. Er is ruimte onderaan voor de terugknop van de site.
- Toetsenbord op een laptop:
  - `Enter`: controleren / volgende
  - `1`–`9`: meerkeuze-optie kiezen
  - `spatie`: kaartje omdraaien
  - `→` / `←`: ken ik / nog niet
  - `Ctrl+Enter`: antwoord van een open vraag bekijken
  - Op aanraakschermen zijn de toetshints verborgen.
- Terug-gebaar en terugknop van de telefoon gaan van een scherm terug naar het startscherm van de app. Midden in een toets vraagt de app eerst of je wilt stoppen.
- Licht en donker thema volgen het apparaat.

## Een nieuwe app maken

1. Kopieer `sjablonen/leerstof.html` of `sjablonen/woordjes.html` naar `<vak>/<nr-blok>/<naam>.html`.
2. Pas `<title>` en `<meta name="description">` aan.
3. Vul `Leermodule.start({...})` in. Laat de `<link>`- en `<script src>`-regels staan: het pad `../../_leermodule/v1/` klopt voor elke app op de standaardplek.

## Het format

```js
Leermodule.start({
  id: 'gs-h1-prehistorie',        // VERPLICHT. Kleine letters/cijfers/streepjes. localStorage-sleutel wordt '<id>-v1@<naam>'.
  titel: 'Geschiedenis oefenen',  // VERPLICHT. Grote kop.
  ondertitel: 'Hoofdstuk 1',      // optioneel
  taal: 'fr',                     // alleen bij woordjes: fr | en | de | es | la (of een eigen taal-object, zie onder)
  toets: { aantallen: [10, 15, 25], standaard: 15 },   // optioneel; standaard [10, 20, 30] en 20
  teksten: { top: 'Magnifique!' },                     // optioneel; tekst bij een 9 of hoger
  onderdelen: [ /* minstens één, zie hieronder */ ]
});
```

### Onderdeel

```js
{
  id: 'p1',                        // VERPLICHT, uniek binnen de app. Niet meer veranderen (voortgang hangt eraan).
  titel: 'Paragraaf 1',            // VERPLICHT
  sub: 'Blz. 10–11',               // optioneel: bron in het boek
  uitleg: [ { kop, html, open } ], // optioneel: blokken (open: true = opengeklapt). Of één HTML-string.
  kaartjes: [ ['voorkant', 'achterkant'] ],
  vragen: [ ... ],
  woorden: [ ['nederlands', 'vreemd'] ],
  richting: 'beide'                // alleen bij woorden: 'beide' (standaard) of 'herkennen' (alleen vreemd → NL)
}
```

Een onderdeel mag elke combinatie van uitleg, kaartjes, vragen en woorden hebben. Knoppen zonder inhoud worden automatisch grijs.

### Vragen (Oefenen en Toets)

De engine herkent het soort vraag aan de velden:

| Soort | Velden | Nakijken |
|---|---|---|
| Meerkeuze | `vraag`, `opties: [...]`, `antwoord: 1` (**0 = eerste optie**), `uitleg` | automatisch; opties worden gehusseld (`husselen: false` om dat uit te zetten, bijv. bij "Alle bovenstaande") |
| Typvraag | `vraag`, `antwoord: 'Parijs'` (of een lijst), `ook: [...]` andere goede antwoorden, `uitleg`, optioneel `taal: 'fr'` | automatisch; hoofdletters, leestekens en `?!.` tellen niet; een accentfout is half goed |
| Open vraag | `vraag`, `model: 'het goede antwoord'` | Thijs vergelijkt met het model en kiest Goed / Half goed / Fout |

Extra: `toepassen: true` markeert een toepassingsvraag. Heeft een app zowel kennis- als toepassingsvragen, dan verschijnt op het startscherm de keuze *Alle vragen / Alleen toepassen*.

`vraag`, `opties`, `uitleg`, `model` en kaartjes mogen HTML bevatten (`<em>`, `<strong>`, `<span class="mark">`). Woorden zijn platte tekst.

### Woorden

```js
woorden: [
  ['de jongen', 'le garçon'],
  ['wij zijn', 'nous sommes', null, ['nous sommes', 'on est']],  // 3e/4e: lijst met alle goede NL- / vreemde antwoorden
]
```

Nakijkregels voor woorden:

- Een komma betekent "allebei goed": `'nouveau, nouvelle'` accepteert beide.
- Tekst tussen haakjes mag weg of mee: `'français(e)'` en `'ik woon (wonen)'`. De geslachtsmarkeringen `(m)`, `(f)` en `(v)` worden genegeerd.
- **Lidwoord**:
  - Bij `nl` en `en` mag het lidwoord weg ("jongen" is goed voor "de jongen").
  - Bij `fr`, `de` en `es` is het verplicht: lidwoord vergeten of het verkeerde lidwoord = half goed.
- Een accentfout is half goed. Onder het invoerveld staan knoppen met de accentletters van de taal.
- 🔊 spreekt het vreemde woord uit (Web Speech API). Dat werkt niet bij Latijn.
- Dubbele woorden in verschillende onderdelen worden één keer gevraagd.
- Het startscherm heeft de keuze *Zoals in het boek / vreemd → NL / NL → vreemd*.

Eigen taal (als die niet in de lijst staat):

```js
taal: { naam: 'Italiaans', kort: 'IT', code: 'it-IT', lidwoorden: ['il', 'lo', 'la', "l'", 'i', 'gli', 'le'], lidwoord: 'verplicht', accenten: ['à', 'è', 'é', 'ì', 'ò', 'ù'] }
```

### Opmaak in uitleg

| Klasse | Effect |
|---|---|
| `<span class="mark">` | geel markeerstift |
| `<p class="tip">` | tip-blok met gele rand |
| `<p class="let-op">` | waarschuwing met rode rand |
| `<span class="voorbeeld">` | handschrift-letter voor voorbeelden |
| `<table>` | wordt automatisch opgemaakt en horizontaal scrollbaar op mobiel |

## Regels voor de engine (v1)

- **v1 alleen uitbreiden.** Nieuwe optionele velden en nieuwe klassen mogen erbij. Bestaande velden, klassen en gedrag nooit veranderen of weghalen: alle apps laden deze bestanden live.
- Is een ingrijpende verandering nodig? Maak dan `v2/` naast `v1/`. Nieuwe apps gebruiken `v2`; oude apps blijven op `v1` werken.
- Test na elke wijziging aan `v1/` beide sjablonen en minstens één bestaande app op telefoon- en laptopbreedte.
- Een fout in de instellingen (bijv. `antwoord` buiten de opties) toont een duidelijke melding in de app in plaats van een leeg scherm.
- De engine maakt hooguit één geschiedenis-stap (`#scherm`) en vertelt de terugknop van de site via `window.huiswerkTerugStappen()` hoeveel stappen hij terug moet.
