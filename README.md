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
- `archief: true` → blok staat ingeklapt onder "Eerdere blokken".

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
