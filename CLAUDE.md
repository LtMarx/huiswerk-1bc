# CLAUDE.md — huiswerk-thijs

Website met huiswerk-hulp-apps voor Thijs (brugklas), gehost op GitHub Pages.
Alle teksten voor Thijs zijn Nederlandstalig en kindvriendelijk.

## Mapstructuur

```
<vak>/<blok-of-toets>/<app>.html
frans/01-unite-1-bonjour/woordjes.html
engels/02-unit-2/irregular-verbs.html
```

- Numeriek voorvoegsel (`01-`, `02-`) bepaalt de volgorde en wordt niet getoond.
- Weergavenaam = mapnaam zonder voorvoegsel, streepjes → spaties, eerste letter hoofdletter (`unite-1-bonjour` → "Unite 1 bonjour"), tenzij `info.json` een `naam` geeft.
- `info.json` (optioneel) in vak- of blokmap: `{"naam": "Frans", "emoji": "🇫🇷", "archief": false, "toetsdatum": "2026-10-14"}`. Datum altijd `JJJJ-MM-DD`.
- Mappen/bestanden die met `_` of `.` beginnen worden overgeslagen, net als `scripts/`, `.github/`, `assets/`.
- Raak `index.html`, `scripts/` en `.github/` niet aan bij het toevoegen van een app.
- `manifest.json` en `_site/` worden gegenereerd en staan in `.gitignore`; nooit committen.

## Regels voor apps

- Elke app is één **zelfstandig HTML-bestand**: CSS en JS inline, geen lokale imports, alleen relatieve paden.
- Externe scripts/styles alleen via `cdnjs.cloudflare.com` of `cdn.jsdelivr.net`.
- Elke app heeft een `<title>` (wordt de titel in het menu) en een `<meta name="description" content="...">` (korte omschrijving in het menu).
- **localStorage-sleutels altijd met een prefix per app**, bijv. `frans-u1-woordjes-v1` of `frans-u1-woordjes:score`. Alle apps delen hetzelfde domein.
- Geen eigen "terug"-knop in de app schrijven: de Action voegt bij het publiceren automatisch "← Terug naar overzicht" toe (vast linksonder). Houd linksonder ± 60px vrij voor belangrijke knoppen.
- Werkt op iPad en telefoon: responsive, touch targets ≥ 44px, licht/donker via `prefers-color-scheme`.
- **Geen persoonsgegevens** in de repo (achternaam, school, klas, adres, foto's, cijfers): de repo is publiek.

## Werkwijze: "voeg deze app toe voor <vak> <blok>"

1. Zoek of maak de vakmap (kleine letters, bijv. `frans/`). Nieuw vak → ook `info.json` met `naam` en `emoji`.
2. Zoek of maak de blokmap met het volgende nummer-voorvoegsel, bijv. `frans/02-unite-2/`.
3. Zet daar `info.json` met de `toetsdatum` (vraag de datum als die niet bekend is). Zet het vorige blok eventueel op `"archief": true` als de gebruiker dat wil.
4. Sla de app op als `<korte-naam>.html`; controleer `<title>`, `<meta name="description">` en de localStorage-prefix (`<vak>-<blok-afkorting>-<app>`, bijv. `frans-u2-woordjes-v1`).
5. Test: `node scripts/build-manifest.mjs` (geen waarschuwingen) en eventueel `npx serve .`.
6. Commit en push naar `main`; de Action publiceert binnen ± een minuut.
