# Huiswerk van Thijs

Eén website met alle huiswerk-hulp-apps voor Thijs, gehost op GitHub Pages.
Thijs heeft maar één link nodig: `https://ltmarx.github.io/huiswerk-thijs/`

## Hoe het werkt

```
<vak>/<blok-of-toets>/<app>.html
frans/01-unite-1-bonjour/woordjes.html
```

- `index.html` leest `manifest.json` en toont vak-tegels → blokken → apps.
- `scripts/build-manifest.mjs` scant de mappen en schrijft `manifest.json` (staat in `.gitignore`; wordt bij elke deploy opnieuw gebouwd).
- `scripts/inject-back.mjs` kopieert de site naar `_site/` en voegt daar aan elke app een knop "← Terug naar overzicht" toe. De bronbestanden veranderen niet.
- `.github/workflows/deploy.yml` doet dit bij elke push naar `main` en publiceert `_site/` op GitHub Pages.

Conventies voor mappen, `info.json` en apps staan in [CLAUDE.md](CLAUDE.md).

### Leermodules: één standaard voor leren, oefenen en toetsen

Alle leer-apps gebruiken de gedeelde engine en huisstijl in [`_leermodule/`](_leermodule/README.md). Een app bevat alleen nog de inhoud (uitleg, kaartjes, vragen of woordjes). Elke app krijgt dan dezelfde drie stappen: **Leren** (uitleg + kaartjes), **Oefenen** (fouten komen terug) en **Toetsen** (cijfer 1–10). Alles werkt op laptop, iPad en telefoon. Sjablonen staan in `_leermodule/sjablonen/`.

### info.json (optioneel, per vak- of blokmap)

```json
{ "naam": "Frans", "emoji": "🇫🇷", "archief": false, "toetsdatum": "2026-10-14" }
```

- `toetsdatum` (JJJJ-MM-DD) → verschijnt bij "Komende toetsen" met het aantal dagen.
- **Archief per vak, automatisch:** een blok gaat naar "📦 Archief" in zijn vak
  - de dag na de `toetsdatum`, of
  - als er geen toetsdatum is: een maand nadat het blok is aangemaakt (eerste commit in die map).
- `archief: true` → blok staat altijd in het archief. `archief: false` → blok wordt nooit automatisch gearchiveerd.
- De datumberekening gebeurt in de browser van de bezoeker, dus het archief klopt elke dag zonder nieuwe deploy.

### Wordt de site vanzelf bijgewerkt?

Ja. Elke push naar `main` start de Action, die het menu opnieuw opbouwt en publiceert (± een minuut). Je hoeft niets handmatig te doen. Archiveren, "Komende toetsen", het aantal dagen en de badge "Nieuw" worden in de browser berekend op de datum van vandaag.

### Namen (klasgenoten)

Bij het eerste bezoek vraagt de site "Wie ben jij?". Oefeningen, toetscijfers en fouten worden per naam bewaard, alleen in de browser van dat apparaat (localStorage). Er zijn geen accounts, geen wachtwoorden en geen server. Er gaat ook niets naar internet of naar de repo. Via de knop 👤 rechtsboven wissel je van naam, bijvoorbeeld op een gedeelde iPad. Een naam is geen beveiliging: wie op hetzelfde apparaat een andere naam aantikt, ziet die resultaten.

## GitHub Pages aanzetten (eenmalig)

1. Ga in de repo op GitHub naar **Settings → Pages**.
2. Kies bij **Build and deployment → Source**: **GitHub Actions**.
3. Push naar `main` (of start de workflow via **Actions → Publiceer site → Run workflow**).
4. Na ± een minuut staat de link onder **Settings → Pages** en bij de workflow-run.

GitHub Pages is gratis voor publieke repo's. De repo is dus publiek: zet er geen persoonsgegevens in.

## Lokaal testen

```bash
node scripts/build-manifest.mjs && npx serve .
```

Wil je ook de terugknop zien zoals op de echte site:

```bash
node scripts/build-manifest.mjs && node scripts/inject-back.mjs && npx serve _site
```
