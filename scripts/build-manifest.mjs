#!/usr/bin/env node
// Scant <vak>/<blok>/<app>.html en schrijft manifest.json voor index.html.
// Gebruik: node scripts/build-manifest.mjs
// Geen dependencies; alleen Node (>= 18) en optioneel git.

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OVERSLAAN = new Set(['scripts', 'assets', 'node_modules']);
const waarschuwingen = [];

function overslaan(naam) {
  return naam.startsWith('_') || naam.startsWith('.') || OVERSLAAN.has(naam);
}

function volgorde(naam) {
  const m = naam.match(/^(\d+)[-_ ]/);
  return m ? Number(m[1]) : Infinity;
}

function sorteer(a, b) {
  return volgorde(a) - volgorde(b) || a.localeCompare(b, 'nl', { numeric: true });
}

// "01-unite-1-bonjour" -> "Unite 1 bonjour"
function weergavenaam(naam) {
  const kaal = naam.replace(/\.html?$/i, '').replace(/^\d+[-_ ]/, '').replace(/[-_]+/g, ' ').trim();
  return kaal.charAt(0).toUpperCase() + kaal.slice(1);
}

function leesInfo(map) {
  const bestand = join(map, 'info.json');
  if (!existsSync(bestand)) return {};
  try {
    const info = JSON.parse(readFileSync(bestand, 'utf8'));
    if (info.toetsdatum && !/^\d{4}-\d{2}-\d{2}$/.test(info.toetsdatum)) {
      waarschuwingen.push(`${pad(bestand)}: toetsdatum moet JJJJ-MM-DD zijn, kreeg "${info.toetsdatum}"`);
      delete info.toetsdatum;
    }
    return info;
  } catch (e) {
    waarschuwingen.push(`${pad(bestand)}: ongeldige JSON (${e.message})`);
    return {};
  }
}

function pad(abs) {
  return relative(ROOT, abs).split(sep).join('/');
}

function submappen(map) {
  return readdirSync(map, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !overslaan(d.name))
    .map((d) => d.name)
    .sort(sorteer);
}

function htmlBestanden(map) {
  return readdirSync(map, { withFileTypes: true })
    .filter((d) => d.isFile() && !overslaan(d.name) && /\.html?$/i.test(d.name))
    .map((d) => d.name)
    .sort(sorteer);
}

const ENTITEITEN = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function ontsnap(tekst) {
  return tekst
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITEITEN[n.toLowerCase()] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}

function leesMeta(bestand) {
  const html = readFileSync(bestand, 'utf8');
  const titel = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  let omschrijving = null;
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (/\bname\s*=\s*["']?description["'\s>]/i.test(tag)) {
      const c = tag.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
      if (c) omschrijving = c[1] ?? c[2];
      break;
    }
  }
  return {
    titel: titel ? ontsnap(titel[1]) : '',
    omschrijving: omschrijving ? ontsnap(omschrijving) : '',
  };
}

let gitWerkt = true;
function git(...args) {
  if (!gitWerkt) return '';
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    gitWerkt = false;
    return '';
  }
}

function datums(bestand) {
  const rel = pad(bestand);
  const mtime = statSync(bestand).mtime.toISOString();
  const laatst = git('log', '-1', '--format=%cI', '--', rel);
  // Eerste commit waarin het bestand voorkwam (volgt hernoemingen).
  const toegevoegd = git('log', '--follow', '--diff-filter=A', '--format=%cI', '--', rel).split('\n').filter(Boolean).pop();
  return {
    laatstGewijzigd: laatst || mtime,
    toegevoegd: toegevoegd || laatst || mtime,
  };
}

function bouwApp(map, naam) {
  const bestand = join(map, naam);
  const meta = leesMeta(bestand);
  if (!meta.titel) waarschuwingen.push(`${pad(bestand)}: geen <title>`);
  if (!meta.omschrijving) waarschuwingen.push(`${pad(bestand)}: geen <meta name="description">`);
  return {
    bestand: naam,
    pad: pad(bestand),
    titel: meta.titel || weergavenaam(naam),
    omschrijving: meta.omschrijving,
    ...datums(bestand),
  };
}

// true = altijd archief, false = nooit automatisch archiveren, null = automatisch (index.html beslist op datum).
function archiefWaarde(info) {
  return info.archief === true ? true : info.archief === false ? false : null;
}

// Eerste commit waarin iets in deze map stond; anders de oudste app- of bestandsdatum.
function aangemaakt(map, apps) {
  const eerste = git('log', '--diff-filter=A', '--format=%cI', '--', pad(map)).split('\n').filter(Boolean).pop();
  if (eerste) return eerste;
  const datums = apps.map((a) => a.toegevoegd);
  if (existsSync(join(map, 'info.json'))) datums.push(statSync(join(map, 'info.json')).mtime.toISOString());
  return datums.sort()[0] || statSync(map).mtime.toISOString();
}

function bouwBlok(vakMap, naam) {
  const map = join(vakMap, naam);
  const info = leesInfo(map);
  const apps = htmlBestanden(map).map((f) => bouwApp(map, f));
  return {
    id: naam,
    pad: pad(map),
    naam: info.naam || weergavenaam(naam),
    emoji: info.emoji || '',
    toetsdatum: info.toetsdatum || null,
    archief: archiefWaarde(info),
    aangemaakt: aangemaakt(map, apps),
    apps,
  };
}

function bouwVak(naam) {
  const map = join(ROOT, naam);
  const info = leesInfo(map);
  return {
    id: naam,
    pad: naam,
    naam: info.naam || weergavenaam(naam),
    emoji: info.emoji || '📚',
    toetsdatum: info.toetsdatum || null,
    archief: info.archief === true,
    blokken: submappen(map).map((b) => bouwBlok(map, b)),
  };
}

const manifest = {
  gegenereerd: new Date().toISOString(),
  vakken: submappen(ROOT).map(bouwVak),
};

writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const aantalApps = manifest.vakken.reduce((n, v) => n + v.blokken.reduce((m, b) => m + b.apps.length, 0), 0);
console.log(`manifest.json geschreven: ${manifest.vakken.length} vak(ken), ${aantalApps} app(s).`);
if (!gitWerkt) console.log('Let op: git niet beschikbaar, datums komen uit de bestandstijden.');
for (const w of waarschuwingen) console.warn(`  waarschuwing: ${w}`);
