# Leermodule: het standaardformat voor huiswerk-apps

Elke leer-app op de site gebruikt dezelfde opbouw, huisstijl en code. Een app is alleen nog een HTML-bestand met **inhoud als data**. Alles wat leerlingen zien en doen, komt uit de gedeelde engine in deze map.

```
_leermodule/
├── README.md              ← dit document: het format
├── v1/
│   ├── leermodule.css     ← huisstijl "Rustig schrift" (licht + donker)
│   └── leermodule.js      ← engine: uitleg, kaartjes, oefenrondjes, sterren, oefentoets
└── sjablonen/
    ├── leerstof.html      ← uitleg + kaartjes + meerkeuze/typ/open vragen
    └── woordjes.html      ← woordjes voor een vreemde taal
```

De map begint met `_`, dus hij verschijnt niet in het menu. De sjablonen zijn wel te bekijken op `<site>/_leermodule/sjablonen/leerstof.html`.

## Wat leerlingen krijgen (elke app hetzelfde)

Ontwerp "Rustig schrift" (v1.2): een rustige achtergrond, één leesbare letter (Lexend), de vakkleur als accent. Het schrift (lijntjes en rode kantlijn) zie je alleen op het vraagkaartje en bij het rood omcirkelde cijfer.

**Startscherm**
- Bovenaan: *Overzicht* (terug naar het menu), de dagenreeks en de naam.
- Kop met vak, titel en de toetsdatum met het aantal dagen. Die datum komt uit `info.json` van het blok, dus die hoef je niet in de app te zetten.
- **Vandaag**: de slimste volgende stap met één knop *Ga verder*.
  - Is het onderdeel nog onbekend en is er uitleg? Dan eerst de uitleg lezen.
  - Anders een oefenrondje van het zwakste onderdeel.
  - Kort voor de toets, of als alles gekend is: een oefentoets.
  - Met een toetsdatum staat er ook een dagdoel, bijvoorbeeld "Doel vandaag: 2 rondjes", berekend op wat nog niet gekend is.
- **Uitleg**, **Kaartjes** en **Oefentoets** als drie tegels.
- **Jouw voortgang** per onderdeel: hoeveel vragen gekend zijn, een balk en 0 tot 3 sterren. Tik op een onderdeel om het te oefenen.
- **Laatste oefentoets** met het cijfer.
- **Instellingen**, standaard ingeklapt: welke onderdelen, welke kant op (woordjes), soort vragen (toepassen).

**Oefenen in rondjes**
- Een rondje heeft 12 vragen (`ronde` in de instellingen). Eerst komt wat je nog niet kent, dan wat je net kent, dan wat het langst geleden is.
- Feedback en de knop *Volgende* staan altijd vast onderaan het scherm. Een fout komt later in het rondje terug.
- Bij typvragen kun je na een fout kiezen voor *Ik had het goed (tikfout)*.
- De app onthoudt per vraag hoe goed je hem kent: 0 = nog niet, 1 = gekend (laatste keer goed), 2-3 = zeker (meerdere keren achter elkaar goed). Alleen de eerste poging in een rondje telt.
- **Sterren per onderdeel**:
  - 1 ster bij de helft gekend.
  - 2 sterren als alles gekend is.
  - 3 sterren als je alles minstens twee keer achter elkaar goed had.
- Na een rondje volgt een scherm met de nieuwe sterren, "+N gekend", de dagenreeks en hoeveel vragen je nog nodig hebt voor de volgende ster.

**Kaartjes**: rondjes van 20 kaartjes, de minst gekende eerst. "Ken ik" of "Nog niet"; wat je nog niet kent, komt terug. Kaartjes tellen niet mee voor de voortgang. Die wordt alleen gemeten met vragen.

**Oefentoets**
- Zonder hulp, met een cijfer van 1 tot 10.
- De vragen worden eerlijk verdeeld over de gekozen onderdelen.
- Open vragen kijk je zelf na; die tellen niet mee voor het cijfer (ze staan apart in de uitslag).
- Na de toets: alle antwoorden nagekeken, en de knop "Oefen mijn fouten". Op het startscherm staat daarna een melding met de fouten van de vorige toets.

**Namen**
- Wie de site of een app voor het eerst opent, typt een voornaam (of tikt een eerder gebruikte naam aan).
- Voortgang, cijfers en fouten worden per naam bewaard onder `'<id>-v1@<naam>'`, alleen op dat apparaat. De dagenreeks staat onder `'huiswerk:dagen@<naam>'`; het menu toont die ook.
- Met de naamknop rechtsboven wissel je van naam.
- De naam deelt de app met het menu via `huiswerk:naam` en `huiswerk:namen`; in code via `Leermodule.Profiel.naam()`, `.namen()` en `.kies(naam)`.
- Voortgang van vóór v1.1 (sleutel zonder naam) gaat één keer over naar de eerste naam die de app opent. Oude opgeslagen gegevens blijven geldig in v1.2; het geheugen per vraag begint dan bij 0.

**Laptop en mobiel**
- Op een laptop staan "Vandaag" en de voortgang naast elkaar. Op iPad en telefoon staan ze onder elkaar.
- Alle knoppen zijn minstens 44px hoog.
- De app heeft een eigen terugknop in de kop. De zwevende terugknop van de site wordt in leermodule-apps verborgen.
- Toetsenbord op een laptop:
  - `Enter`: controleren / volgende
  - `1`–`9` of `A`–`D`: meerkeuze-optie kiezen
  - `spatie`: kaartje omdraaien
  - `→` / `←`: ken ik / nog niet
  - `Ctrl+Enter`: antwoord van een open vraag bekijken
  - Op aanraakschermen zijn de toetshints verborgen.
- Terug-gebaar en terugknop van de telefoon gaan van een scherm terug naar het startscherm van de app. Midden in een toets vraagt de app eerst of je wilt stoppen.
- Licht en donker thema volgen het apparaat. De vakkleur komt uit de mapnaam van het vak (dezelfde kleur als de tegel in het menu).

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
  ronde: 12,                      // optioneel; aantal vragen per oefenrondje (standaard 12)
  toetsdatum: '2026-10-09',       // optioneel; normaal uit info.json van het blok
  kleur: 30,                      // optioneel; tint 0-360 voor de vakkleur (standaard uit de vakmapnaam)
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
| Open vraag | `vraag`, `model: 'het goede antwoord'` | de leerling vergelijkt met het model en kiest Goed / Half goed / Fout (telt niet mee voor het cijfer van de oefentoets) |

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
- De luidsprekerknop spreekt het vreemde woord uit (Web Speech API). Dat werkt niet bij Latijn.
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
