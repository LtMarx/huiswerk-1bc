#!/usr/bin/env node
// Kopieert de site naar een build-map en voegt aan elke app-HTML een vaste
// "← Terug naar overzicht"-knop toe. De bronbestanden blijven ongewijzigd.
// Gebruik: node scripts/inject-back.mjs [bron=.] [uitvoer=_site]

import { cpSync, rmSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const bron = resolve(process.argv[2] || ROOT);
const uitvoer = resolve(process.argv[3] || join(ROOT, '_site'));
const NIET_KOPIEREN = new Set(['.git', '.github', 'scripts', 'node_modules', '_site']);
const MARKER = '<!-- huiswerk-terugknop -->';

if (uitvoer === bron || bron.startsWith(uitvoer + sep)) {
  console.error('Uitvoermap mag niet gelijk zijn aan (of boven) de bronmap.');
  process.exit(1);
}

rmSync(uitvoer, { recursive: true, force: true });
mkdirSync(uitvoer, { recursive: true });
for (const naam of readdirSync(bron)) {
  if (naam.startsWith('.') || NIET_KOPIEREN.has(naam) || join(bron, naam) === uitvoer) continue;
  cpSync(join(bron, naam), join(uitvoer, naam), { recursive: true });
}

function knop(relPad) {
  const delen = relPad.split('/');
  const terug = '../'.repeat(delen.length - 1);
  // Hash naar het blok (vak/blok) waar de app in staat.
  const hash = delen.slice(0, Math.min(2, delen.length - 1)).join('/');
  const href = `${terug}index.html${hash ? '#' + hash : ''}`;
  return `${MARKER}
<script>(function(){
  var href=${JSON.stringify(href)};
  function maak(){
    if(document.getElementById('huiswerk-terug'))return;
    var host=document.createElement('div');
    host.id='huiswerk-terug';
    host.style.cssText='position:fixed;left:max(8px,env(safe-area-inset-left));bottom:max(8px,env(safe-area-inset-bottom));z-index:2147483647;';
    var root=host.attachShadow?host.attachShadow({mode:'open'}):host;
    root.innerHTML='<style>a{all:initial;box-sizing:border-box;display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 14px;border-radius:22px;background:rgba(30,41,59,.88);color:#fff;font:600 15px/1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25);-webkit-tap-highlight-color:transparent;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}a:hover{background:rgba(30,41,59,1)}a:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}</style><a part="knop">\\u2190 Terug naar overzicht</a>';
    var a=root.querySelector('a');
    a.href=href;
    a.addEventListener('click',function(e){
      // Vanuit het overzicht geopend: gewoon terug in de geschiedenis (behoudt scrollpositie).
      var vanIndex=/[?&]from=index(&|$)/.test(location.search);
      var zelfdeSite=document.referrer&&document.referrer.indexOf(location.origin)===0;
      if(vanIndex&&zelfdeSite&&history.length>1){e.preventDefault();history.back();}
    });
    document.body.appendChild(host);
  }
  if(document.body)maak();else document.addEventListener('DOMContentLoaded',maak);
})();</script>
`;
}

let aantal = 0;
function loop(map) {
  for (const d of readdirSync(map, { withFileTypes: true })) {
    const p = join(map, d.name);
    if (d.isDirectory()) { loop(p); continue; }
    if (!/\.html?$/i.test(d.name)) continue;
    const rel = relative(uitvoer, p).split(sep).join('/');
    if (!rel.includes('/')) continue; // index.html en andere bestanden in de root
    let html = readFileSync(p, 'utf8');
    if (html.includes(MARKER)) continue;
    const i = html.search(/<\/body\s*>/i);
    html = i === -1 ? html + knop(rel) : html.slice(0, i) + knop(rel) + html.slice(i);
    writeFileSync(p, html);
    aantal++;
  }
}
loop(uitvoer);
console.log(`Site gekopieerd naar ${relative(process.cwd(), uitvoer) || '.'}; terugknop toegevoegd aan ${aantal} app(s).`);
