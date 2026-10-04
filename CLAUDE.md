# CLAUDE.md — huiswerk-1bc

Website "Huiswerk 1BC" met huiswerk-hulp-apps voor de toetsen van klas 1BC van De Amersfoortse Berg (brugklas; gemaakt voor Thijs, gebruikt door de hele klas), gehost op GitHub Pages.
Alle teksten voor de leerlingen zijn Nederlandstalig en kindvriendelijk. Toetsdata gelden voor klas 1BC.

## Mapstructuur

```
<vak>/<blok-of-toets>/<app>.html
frans/01-unite-1-bonjour/woordjes.html
engels/02-unit-2/irregular-verbs.html
```

- Numeriek voorvoegsel (`01-`, `02-`) bepaalt de volgorde en wordt niet getoond.
- Weergavenaam = mapnaam zonder voorvoegsel, streepjes → spaties, eerste letter hoofdletter (`unite-1-bonjour` → "Unite 1 bonjour"), tenzij `info.json` een `naam` geeft.
- `info.json` (optioneel) in vak- of blokmap: `{"naam": "Frans", "emoji": "🇫🇷", "toetsdatum": "2026-10-14"}`. Datum altijd `JJJJ-MM-DD`.
- **Archief gaat automatisch** (in de browser, op de datum van vandaag): een blok verhuist naar "📦 Archief" in zijn vak
  - de dag na `toetsdatum`, of
  - zonder toetsdatum: een maand na de eerste commit in de blokmap.
  - `"archief": true` = altijd archief (bijv. als de toets al geweest is maar de datum onbekend is). `"archief": false` = nooit automatisch.
- Elke push naar `main` publiceert de site opnieuw; er is geen handmatige stap.
- Mappen/bestanden die met `_` of `.` beginnen worden overgeslagen, net als `scripts/`, `.github/`, `assets/`.
- Raak `index.html`, `scripts/` en `.github/` niet aan bij het toevoegen van een app.
- `manifest.json` en `_site/` worden gegenereerd en staan in `.gitignore`; nooit committen.

## Standaard: de leermodule

**Elke leer-, oefen- of toetsapp gebruikt de leermodule** in `_leermodule/` (format, velden en regels: [`_leermodule/README.md`](_leermodule/README.md)). Een app is dan alleen een HTML-bestand met inhoud als data in `Leermodule.start({...})`; leren (uitleg + kaartjes), oefenen en toetsen, de huisstijl en laptop/mobiel-ondersteuning komen uit de engine.

- Begin altijd vanuit `_leermodule/sjablonen/leerstof.html` (uitleg, kaartjes, vragen) of `_leermodule/sjablonen/woordjes.html` (vreemde taal).
- Levert de gebruiker een losse HTML-app aan (bijv. gemaakt in een chat): zet de inhoud om naar het leermodule-format. Neem teksten, woorden en vragen **letterlijk** over (liefst met een scriptje uit de bron halen, niet overtypen) en controleer de aantallen.
- Past iets echt niet in het format (bijv. een kaart- of tekenspel)? Bespreek eerst of het als optionele uitbreiding in `v1` kan. Lukt dat niet, maak dan een zelfstandige app die wel `../../_leermodule/v1/leermodule.css` en de klassen daaruit gebruikt, zodat de huisstijl gelijk blijft.
- `_leermodule/v1/` alleen **uitbreiden** (nieuwe optionele velden/klassen), nooit bestaand gedrag of namen veranderen: alle apps laden het live. Ingrijpend anders → `_leermodule/v2/`.
- Na een wijziging aan de engine: sjablonen en bestaande apps testen op 390px en ±1366px breed.

## Regels voor apps

- Eén HTML-bestand per app, alleen relatieve paden. De enige toegestane lokale verwijzing is `../../_leermodule/v1/…` (CSS en JS van de leermodule).
- Externe scripts alleen via `cdnjs.cloudflare.com` of `cdn.jsdelivr.net`; lettertypen via Google Fonts (de leermodule laadt ze al).
- Elke app heeft een `<title>` (wordt de titel in het menu) en een `<meta name="description" content="...">` (korte omschrijving in het menu).
- **localStorage-sleutels altijd met een prefix per app en per naam.** De site vraagt bezoekers hun voornaam (`huiswerk:naam`, lijst in `huiswerk:namen`; alleen op het apparaat) zodat klasgenoten de site ook kunnen gebruiken. De leermodule regelt dit vanzelf: `id: 'frans-u2-woordjes'` → sleutel `frans-u2-woordjes-v1@<naam>`. Patroon voor `id`: `<vak>-<blok-afkorting>-<app>`. Nooit een `id` hergebruiken of later veranderen. Een zelfstandige app gebruikt `Leermodule.Profiel.naam()` (of leest `huiswerk:naam`) en zet de naam in zijn eigen sleutels.
- Geen eigen "terug naar overzicht"-knop: de Action voegt die bij het publiceren toe (vast linksonder). De leermodule houdt daar al ruimte voor vrij.
- Werkt op laptop én mobiel/iPad: responsive, touch targets ≥ 44px, invoervelden ≥ 16px tekst (anders zoomt iOS in), licht/donker via `prefers-color-scheme`.
- **Geen persoonsgegevens** in de repo (achternamen, adressen, foto's van leerlingen, cijfers, namen van klasgenoten): de repo is publiek. Schoolnaam en klas staan bewust in de sitetitel.

## Werkwijze: "voeg deze app toe voor <vak> <blok>"

1. Zoek of maak de vakmap (kleine letters, bijv. `frans/`). Nieuw vak → ook `info.json` met `naam` en `emoji`.
2. Zoek of maak de blokmap met het volgende nummer-voorvoegsel, bijv. `frans/02-unite-2/`.
3. Zet daar `info.json` met de `toetsdatum` (vraag de datum als die niet bekend is). Zet het vorige blok eventueel op `"archief": true` als de gebruiker dat wil.
4. Kopieer het passende sjabloon naar `<korte-naam>.html`. Vul `<title>`, `<meta name="description">`, `id`, `titel` en de onderdelen in.
5. Test: `node scripts/build-manifest.mjs` (geen waarschuwingen), dan `node scripts/inject-back.mjs && npx http-server _site` (of `npx serve _site`) en open de app op telefoon- en laptopbreedte: startscherm, kaartjes, één oefenvraag, een korte toets.
6. Werk direct op `main`: commit en push. De Action publiceert binnen ± een minuut.
