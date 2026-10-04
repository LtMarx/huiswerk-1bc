/* Leermodule v1 — standaard engine voor leren, kaartjes, oefenen en toetsen.
   Gebruik in een app:  Leermodule.start({ id, titel, onderdelen: [...] })
   Volledige beschrijving van het format: _leermodule/README.md
   Regel: v1 alleen uitbreiden, nooit gedrag of veldnamen veranderen (bestaande apps gebruiken dit).
   v1.2: nieuw ontwerp, geheugen per vraag, oefenrondjes, sterren, dagplan en eigen terugknop. */
(function () {
  'use strict';

  var VERSIE = '1.2.0';

  /* ---------- Talen voor woordjes ---------- */
  var TALEN = {
    nl: { naam: 'Nederlands', kort: 'NL', code: 'nl-NL', lidwoorden: ['de', 'het', 'een'], lidwoord: 'optioneel', accenten: [] },
    fr: { naam: 'Frans', kort: 'FR', code: 'fr-FR', lidwoorden: ['le', 'la', 'les', "l'", 'un', 'une', 'des'], lidwoord: 'verplicht',
      accenten: ['é', 'è', 'ê', 'à', 'â', 'ç', 'ù', 'û', 'ô', 'î', 'ï', 'ë', '’'] },
    en: { naam: 'Engels', kort: 'EN', code: 'en-GB', lidwoorden: ['the', 'a', 'an'], lidwoord: 'optioneel', accenten: [] },
    de: { naam: 'Duits', kort: 'DU', code: 'de-DE', lidwoorden: ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines'],
      lidwoord: 'verplicht', accenten: ['ä', 'ö', 'ü', 'ß'] },
    es: { naam: 'Spaans', kort: 'ES', code: 'es-ES', lidwoorden: ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas'], lidwoord: 'verplicht',
      accenten: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡'] },
    la: { naam: 'Latijn', kort: 'LA', code: '', lidwoorden: [], lidwoord: 'optioneel', accenten: [] }
  };

  /* ---------- Hulpjes ---------- */
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var strip = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  var komma = function (n) { return String(Math.round(n * 10) / 10).replace('.', ','); };
  var cijferTxt = function (g) { return g.toFixed(1).replace('.', ','); };
  var meervoud = function (n, een, meer) { return n + ' ' + (n === 1 ? een : meer); };
  var smal = function () { return window.matchMedia && window.matchMedia('(max-width: 759px)').matches; };
  var aanraak = function () { return window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches; };

  function norm(s) {
    return String(s).toLowerCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/\((m|f|v)\)/g, '')
      .replace(/[?!.¿¡]/g, '')
      .replace(/\s*'\s*/g, "'")
      .replace(/\s+/g, ' ').trim();
  }
  function splitTop(s) {
    var out = [], d = 0, cur = '';
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '(') d++;
      if (ch === ')') d--;
      if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out.map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function lidwoordRe(taal) {
    if (!taal || !taal.lidwoorden || !taal.lidwoorden.length) return null;
    var delen = taal.lidwoorden.slice().sort(function (a, b) { return b.length - a.length; }).map(function (l) {
      var e = l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return /'$/.test(l) ? e : e + ' ';
    });
    return new RegExp('^(' + delen.join('|') + ')(.+)$');
  }
  // Alle goedgekeurde schrijfwijzen van een antwoord, zoals "français(e)" of "nouveau, nouvelle".
  function variants(disp, taal) {
    var out = [], re = taal && taal.lidwoord === 'optioneel' ? lidwoordRe(taal) : null;
    var add = function (v) {
      v = v.replace(/\s+/g, ' ').trim();
      if (!v) return;
      if (out.indexOf(v) < 0) out.push(v);
      if (re) { var m = v.match(re); if (m && out.indexOf(m[2]) < 0) out.push(m[2]); }
    };
    var base = norm(disp);
    add(base); add(base.replace(/\s*\([^)]*\)/g, ''));
    splitTop(base).forEach(function (p) {
      add(p); add(p.replace(/\s*\([^)]*\)/g, ''));
      if (/[^\s]\(/.test(p)) add(p.replace(/\(([^)]*)\)/g, '$1'));
    });
    return out;
  }
  function controleer(given, acc, taal) {
    var a = norm(given);
    if (!a) return { score: 0 };
    if (acc.indexOf(a) >= 0) return { score: 1 };
    var sa = strip(a);
    if (acc.some(function (v) { return strip(v) === sa; })) return { score: 0.5, note: 'Bijna goed: let op de accenten.' };
    var re = taal && taal.lidwoord === 'verplicht' ? lidwoordRe(taal) : null;
    if (re) {
      for (var i = 0; i < acc.length; i++) {
        var m = acc[i].match(re);
        if (m && strip(m[2]) === sa) return { score: 0.5, note: 'Bijna goed: vergeet het lidwoord niet.' };
        var g = a.match(re);
        if (m && g && strip(g[2]) === strip(m[2])) return { score: 0.5, note: 'Bijna goed: het lidwoord klopt niet.' };
      }
    }
    return { score: 0 };
  }

  function spreek(t, code) {
    try {
      var u = new SpeechSynthesisUtterance(t.replace(/\([^)]*\)/g, ''));
      u.lang = code; u.rate = 0.85;
      var pre = code.slice(0, 2).toLowerCase();
      var v = speechSynthesis.getVoices().filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(pre) === 0; })[0];
      if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { /* geen spraak beschikbaar */ }
  }

  /* ---------- Namen (alleen op dit apparaat; zelfde sleutels als index.html) ---------- */
  var Profiel = {
    lees: function (k, std) { try { var v = localStorage.getItem(k); return v == null ? std : JSON.parse(v); } catch (e) { return std; } },
    schrijf: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* privévenster */ } },
    naam: function () { return Profiel.lees('huiswerk:naam', ''); },
    namen: function () { return Profiel.lees('huiswerk:namen', []); },
    kies: function (n) {
      n = String(n || '').replace(/\s+/g, ' ').trim().slice(0, 20);
      if (!n) return false;
      var namen = Profiel.namen().filter(function (x) { return x.toLowerCase() !== n.toLowerCase(); });
      namen.unshift(n);
      Profiel.schrijf('huiswerk:namen', namen.slice(0, 12));
      Profiel.schrijf('huiswerk:naam', n);
      return true;
    }
  };

  /* ---------- Iconen (één set, in plaats van emoji) ---------- */
  var ICONEN = {
    terug: '<path d="M15 18l-6-6 6-6"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>',
    boek: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16"/>',
    kaart: '<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 012 2v12"/>',
    vlag: '<path d="M5 21V4h11l-2 4 2 4H5"/>', play: '<path d="M7 4l13 8-13 8z"/>', vink: '<path d="M5 12l5 5 9-10"/>',
    ster: '<path d="M12 2l3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21l1.4-7L2 9.3l7-.8z"/>',
    vuur: '<path d="M12 22c4 0 7-2.8 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-3 3-5 5-5 8 0 4.2 3 7 7 7z"/>',
    geluid: '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',
    persoon: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
    kalender: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    pijl: '<path d="M9 6l6 6-6 6"/>', pen: '<path d="M4 20h4L20 8l-4-4L4 16z"/>', opnieuw: '<path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4"/>'
  };
  function ic(n, extra) { return '<svg class="lm-i' + (extra ? ' ' + extra : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + ICONEN[n] + '</svg>'; }
  function sterren(n, groot) {
    var s = '';
    for (var i = 0; i < 3; i++) s += ic('ster', i < n ? '' : 'uit');
    return '<span class="' + (groot ? 'lm-grootster' : 'lm-sterren') + '" aria-label="' + n + ' van 3 sterren">' + s + '</span>';
  }
  function tint(t) { var h = 0; for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) % 360; return h; }
  function vandaagStr(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dagenTot(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return null;
    var n = new Date(), v = new Date(n.getFullYear(), n.getMonth(), n.getDate());
    return Math.round((new Date(+m[1], +m[2] - 1, +m[3]) - v) / 86400000);
  }
  function mooieDatum(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); if (!m) return '';
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  // Anonieme teller (GoatCounter): telt het openen van een app en, als gebeurtenis, afgemaakte rondjes en toetsen.
  // Nooit namen, antwoorden of cijfers meesturen.
  var TELLER = 'https://ltmarx.goatcounter.com/count';
  function laadTeller() {
    if (location.protocol === 'file:' || document.querySelector('script[data-goatcounter]')) return;
    var s = document.createElement('script'); s.async = true; s.src = '//gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', TELLER);
    document.head.appendChild(s);
  }
  function telGebeurtenis(soort, id, titel) {
    try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: soort + ': ' + id, title: titel, event: true }); } catch (e) { /* teller geblokkeerd */ }
  }
  function laadFonts() {
    if (document.getElementById('lm-fonts')) return;
    var l = document.createElement('link'); l.id = 'lm-fonts'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&family=Kalam:wght@700&display=swap';
    document.head.appendChild(l);
  }

  /* ---------- De module ---------- */
  function start(cfg) {
    var app = document.getElementById('app');
    if (!app) { app = document.createElement('div'); app.id = 'app'; document.body.appendChild(app); }
    app.className = 'lm-wrap';
    document.documentElement.classList.add('lm-actief');
    laadFonts();
    laadTeller();

    try { valideer(cfg); } catch (e) {
      app.innerHTML = '<div class="lm-fout">Deze app is niet goed ingesteld: ' + esc(e.message) + '</div>';
      throw e;
    }

    var KEY_BASIS = cfg.id + '-v1', KEY = KEY_BASIS;
    var OND = cfg.onderdelen;
    var heeftWoorden = OND.some(function (o) { return o.woorden && o.woorden.length; });
    var NL = TALEN.nl;
    var DOEL = typeof cfg.taal === 'object' ? cfg.taal : TALEN[cfg.taal || 'fr'];
    var kanSpreken = 'speechSynthesis' in window && DOEL && DOEL.code;
    var AANTALLEN = (cfg.toets && cfg.toets.aantallen) || [10, 20, 30];
    var RONDE = cfg.ronde || 12, KAARTRONDE = 20;
    var heeftToepassen = OND.some(function (o) { return (o.vragen || []).some(function (v) { return v.toepassen; }); })
      && OND.some(function (o) { return (o.vragen || []).some(function (v) { return !v.toepassen; }); });

    // Plek op de site: <vak>/<blok>/<app>.html. Daaruit komen de vakkleur, de terugknop en info.json.
    var pad = location.pathname.split('/').filter(Boolean);
    var VAK = pad.length >= 3 ? decodeURIComponent(pad[pad.length - 3]) : '';
    var BLOK = pad.length >= 2 ? decodeURIComponent(pad[pad.length - 2]) : '';
    var ctx = { vak: '', toetsdatum: cfg.toetsdatum || null };
    document.documentElement.style.setProperty('--h', String(cfg.kleur != null ? cfg.kleur : tint(VAK || cfg.id)));
    function haalInfo(url, f) {
      if (!window.fetch || location.protocol === 'file:') return;
      fetch(url, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (i) {
        if (i) { f(i); if (scherm === 'start') render(); }
      }).catch(function () { /* geen info.json: geen probleem */ });
    }
    haalInfo('info.json', function (i) { if (!cfg.toetsdatum && i.toetsdatum) ctx.toetsdatum = i.toetsdatum; });
    haalInfo('../info.json', function (i) { if (i.naam) ctx.vak = i.naam; });

    // Voortgang wordt per naam bewaard: '<id>-v1@<naam>'. Alles blijft op dit apparaat.
    var store, naam = Profiel.naam();
    function laadStore() {
      store = { kies: OND.map(function (o) { return o.id; }), richting: 'boek', aantal: String((cfg.toets && cfg.toets.standaard) || 20), soort: 'alles', hist: [], fouten: [], m: {}, gelezen: {}, dag: null };
      KEY = naam ? KEY_BASIS + '@' + naam.toLowerCase() : KEY_BASIS;
      try {
        var raw = localStorage.getItem(KEY);
        // Voortgang van vóór de namen gaat één keer over naar de eerste naam die deze app opent.
        if (!raw && naam && (raw = localStorage.getItem(KEY_BASIS))) { localStorage.setItem(KEY, raw); localStorage.removeItem(KEY_BASIS); }
        if (raw) store = Object.assign(store, JSON.parse(raw));
      } catch (e) { /* privévenster */ }
      store.kies = store.kies.filter(function (id) { return OND.some(function (o) { return o.id === id; }); });
      if (!store.m || typeof store.m !== 'object') store.m = {};
      if (!store.gelezen) store.gelezen = {};
      if (!store.dag || store.dag.d !== vandaagStr()) store.dag = { d: vandaagStr(), r: 0 };
    }
    laadStore();
    function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* vol of geblokkeerd */ } }

    // Reeks van dagen (voor de hele site, per naam).
    function dagenKey() { return 'huiswerk:dagen@' + (naam || '').toLowerCase(); }
    function oefenVandaag() {
      var d = Profiel.lees(dagenKey(), []), v = vandaagStr();
      if (d.indexOf(v) < 0) { d.push(v); Profiel.schrijf(dagenKey(), d.slice(-60)); }
    }
    function reeks() {
      var d = Profiel.lees(dagenKey(), []), n = 0, t = new Date();
      if (d.indexOf(vandaagStr(t)) < 0) t.setDate(t.getDate() - 1); // gisteren telt nog mee
      while (d.indexOf(vandaagStr(t)) >= 0) { n++; t.setDate(t.getDate() - 1); }
      return n;
    }

    /* ----- Geheugen per vraag: 0 = nog niet, 1 = gekend, 2-3 = zeker ----- */
    function stand(key) { var x = store.m[key]; return x ? x[0] : 0; }
    function leer(key, goed) {
      var s = stand(key);
      store.m[key] = [goed ? Math.min(3, s + 1) : 0, Date.now()];
    }

    var scherm = 'start', run = null, lerenOnd = null;
    document.title = document.title || cfg.titel;

    /* ----- Inhoud verzamelen ----- */
    var gekozen = function () { return OND.filter(function (o) { return store.kies.indexOf(o.id) >= 0; }); };
    var richtingLabel = function (r) { return r === 'herkennen' ? DOEL.kort + ' → ' + NL.kort : DOEL.kort + ' ⇄ ' + NL.kort; };
    function flat(a) { return [].concat.apply([], a); }

    function woordItems(onderdelen) {
      var map = {}, lijst = [];
      onderdelen.forEach(function (o) {
        (o.woorden || []).forEach(function (w) {
          var k = norm(w[0]) + '|' + norm(w[1]);
          var richting = o.richting || 'beide';
          if (map[k]) { if (richting === 'beide') map[k].richting = 'beide'; return; }
          map[k] = { nl: w[0], doel: w[1], k: k, richting: richting, ond: o,
            nlA: w[2] ? flat(w[2].map(function (x) { return variants(x, NL); })) : null,
            doelA: w[3] ? flat(w[3].map(function (x) { return variants(x, DOEL); })) : null };
          lijst.push(map[k]);
        });
      });
      return lijst;
    }
    function woordVragen(onderdelen, richting) {
      var qs = [];
      woordItems(onderdelen).forEach(function (it) {
        if (richting !== 'nl-doel') qs.push({ soort: 'woord', key: 'w:' + it.k + '>nl', item: it, van: 'doel', naar: 'nl', ond: it.ond });
        if (it.richting === 'beide' && richting !== 'doel-nl') qs.push({ soort: 'woord', key: 'w:' + it.k + '>doel', item: it, van: 'nl', naar: 'doel', ond: it.ond });
      });
      return qs;
    }
    function gewoneVragen(onderdelen, soort) {
      var qs = [];
      onderdelen.forEach(function (o) {
        (o.vragen || []).forEach(function (v, i) {
          if (soort === 'toepassen' && !v.toepassen) return;
          qs.push({ soort: v.opties ? 'mc' : v.model != null ? 'open' : 'typ', key: 'v:' + o.id + ':' + i, v: v, ond: o });
        });
      });
      return qs;
    }
    // Vragen volgens de instellingen (richting, soort) voor de gegeven onderdelen.
    function pool(onderdelen) {
      return gewoneVragen(onderdelen, store.soort).concat(store.soort === 'toepassen' ? [] : woordVragen(onderdelen, store.richting));
    }
    // Alle vragen van één onderdeel, los van de instellingen: daarop is de voortgang gebaseerd.
    function alleVan(o) { return gewoneVragen([o]).concat(woordVragen([o], 'boek')); }
    function alleVragenOpKey() {
      var m = {};
      gewoneVragen(OND).concat(woordVragen(OND, 'boek')).forEach(function (q) { m[q.key] = q; });
      return m;
    }
    function kaartjes(onderdelen) {
      var lijst = woordVragen(onderdelen, store.richting).slice();
      onderdelen.forEach(function (o) {
        (o.kaartjes || []).forEach(function (c, i) { lijst.push({ soort: 'kaart', key: 'k:' + o.id + ':' + i, voor: c[0], achter: c[1], ond: o }); });
      });
      return lijst;
    }
    var heeftUitleg = function (lijst) { return lijst.some(function (o) { return o.uitleg || (o.woorden && o.woorden.length); }); };

    function stats(o) {
      var qs = alleVan(o), gekend = 0, zeker = 0;
      qs.forEach(function (q) { var s = stand(q.key); if (s >= 1) gekend++; if (s >= 2) zeker++; });
      var t = qs.length;
      var st = !t ? 0 : gekend === t ? (zeker === t ? 3 : 2) : gekend >= t / 2 ? 1 : 0;
      return { totaal: t, gekend: gekend, zeker: zeker, sterren: st };
    }

    // Kies vragen voor een rondje: eerst wat je nog niet kent, dan wat je net kent, dan de rest (langst geleden eerst).
    function kiesRonde(lijst, n, prefix) {
      prefix = prefix || '';
      var groepen = [[], [], []];
      lijst.forEach(function (q) { var s = stand(prefix + q.key); groepen[s === 0 ? 0 : s === 1 ? 1 : 2].push(q); });
      shuffle(groepen[0]); shuffle(groepen[1]);
      groepen[2].sort(function (a, b) { var x = store.m[prefix + a.key], y = store.m[prefix + b.key]; return (x ? x[1] : 0) - (y ? y[1] : 0); });
      return groepen[0].concat(groepen[1], groepen[2]).slice(0, n);
    }
    // Toets: eerlijk verdeeld over de onderdelen.
    function kiesToets(lijst, n) {
      var per = {}, volgorde = [];
      shuffle(lijst.slice()).forEach(function (q) { if (!per[q.ond.id]) { per[q.ond.id] = []; volgorde.push(q.ond.id); } per[q.ond.id].push(q); });
      var uit = [];
      while (uit.length < n && volgorde.some(function (id) { return per[id].length; })) {
        volgorde.forEach(function (id) { if (uit.length < n && per[id].length) uit.push(per[id].shift()); });
      }
      return shuffle(uit);
    }

    // Wat is vandaag de slimste volgende stap?
    function advies() {
      var sel = gekozen();
      if (!sel.length) return { titel: 'Kies eerst wat je wilt leren', sub: 'Open "Wat wil je leren?" hieronder.', actie: null };
      var dagen = dagenTot(ctx.toetsdatum), st = {}, onbekend = 0, totaal = 0;
      sel.forEach(function (o) { st[o.id] = stats(o); onbekend += st[o.id].totaal - st[o.id].gekend; totaal += st[o.id].totaal; });
      var doel = null;
      if (dagen != null && dagen >= 1 && onbekend > 0) {
        var r = Math.ceil(onbekend / RONDE / Math.max(1, dagen - 1));
        doel = Math.max(1, Math.min(4, r));
      }
      if (totaal === 0) return { titel: 'Lees de uitleg en leer met kaartjes', sub: 'Deze module heeft geen oefenvragen.', actie: 'kaartjes', doel: null };
      if ((dagen != null && dagen >= 0 && dagen <= 1 && onbekend < totaal * 0.5) || onbekend === 0) {
        return { titel: dagen === 0 ? 'Laatste check: maak een oefentoets' : 'Maak een oefentoets', sub: 'Zonder hulp, met een cijfer. Daarna oefen je je fouten.', actie: 'toetsstart', doel: doel };
      }
      var zwak = null;
      sel.forEach(function (o) {
        var s = st[o.id]; if (!s.totaal || s.gekend === s.totaal) return;
        if (!zwak || s.gekend / s.totaal < st[zwak.id].gekend / st[zwak.id].totaal) zwak = o;
      });
      var n = Math.min(RONDE, st[zwak.id].totaal);
      if (st[zwak.id].gekend === 0 && zwak.uitleg && !store.gelezen[zwak.id]) {
        return { titel: 'Lees eerst de uitleg: ' + zwak.titel, sub: 'Daarna oefen je ' + n + ' vragen.', actie: 'leesuitleg', ond: zwak, doel: doel };
      }
      return { titel: zwak.titel + ' oefenen', sub: n + ' vragen · ongeveer ' + Math.max(2, Math.round(n * 0.6)) + ' minuten', actie: 'ronde', ond: zwak, doel: doel };
    }

    // Tekst van de vraag en het goede antwoord, voor overzichten.
    function vraagTekst(q) {
      if (q.soort === 'woord') return esc(q.van === 'doel' ? q.item.doel : q.item.nl);
      if (q.soort === 'kaart') return q.voor;
      return q.v.vraag;
    }
    function antwoordTekst(q) {
      if (q.soort === 'woord') return esc(q.naar === 'doel' ? q.item.doel : q.item.nl);
      if (q.soort === 'kaart') return q.achter;
      if (q.soort === 'mc') return q.v.opties[q.v.antwoord];
      if (q.soort === 'open') return q.v.model;
      return esc(Array.isArray(q.v.antwoord) ? q.v.antwoord[0] : q.v.antwoord);
    }
    function nakijken(q, given) {
      if (q.soort === 'woord') {
        var it = q.item;
        var acc = q.naar === 'doel' ? (it.doelA || variants(it.doel, DOEL)) : (it.nlA || variants(it.nl, NL));
        return controleer(given, acc, q.naar === 'doel' ? DOEL : NL);
      }
      var taal = q.v.taal ? (typeof q.v.taal === 'object' ? q.v.taal : TALEN[q.v.taal]) : null;
      var lijst = [].concat(q.v.antwoord, q.v.ook || []);
      return controleer(given, flat(lijst.map(function (x) { return variants(String(x), taal); })), taal);
    }

    var sayBtn = function (t) {
      return kanSpreken ? '<button class="lm-say" data-act="say" data-t="' + esc(t) + '" aria-label="Uitspreken in het ' + esc(DOEL.naam) + '">' + ic('geluid') + '</button>' : '';
    };
    var kbd = function (k) { return '<span class="lm-kbd" aria-hidden="true">' + k + '</span>'; };
    var LETTERS = 'ABCDEFGHI';

    /* ----- Terug naar het overzicht van de site ----- */
    var terugHref = VAK ? '../../index.html#' + encodeURIComponent(VAK) + '/' + encodeURIComponent(BLOK) : '../../index.html';
    function terugLink() { return '<a class="lm-terug" href="' + esc(terugHref) + '" data-act="overzicht">' + ic('terug') + 'Overzicht</a>'; }

    /* ----- Schermen ----- */
    function seg(act, opts, val) {
      return '<div class="lm-seg" role="group">' + opts.map(function (o) {
        return '<button data-act="' + act + '" data-v="' + o[0] + '" aria-pressed="' + (String(val) === String(o[0])) + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    }
    function aantalKeuzes(max) {
      var k = AANTALLEN.filter(function (n) { return n < max; }).map(function (n) { return [String(n), String(n)]; });
      k.push(['alle', 'Alles (' + max + ')']);
      return k;
    }
    function toetsAantal(max) {
      var k = aantalKeuzes(max);
      return k.some(function (o) { return o[0] === store.aantal; }) ? store.aantal : k[Math.min(1, k.length - 1)][0];
    }
    function toetsChip() {
      var d = dagenTot(ctx.toetsdatum);
      if (d == null || d < 0) return '';
      var t = d === 0 ? 'Toets vandaag, succes!' : d === 1 ? 'Toets morgen (' + mooieDatum(ctx.toetsdatum) + ')' : 'Toets ' + mooieDatum(ctx.toetsdatum) + ' · nog ' + d + ' dagen';
      return '<span class="lm-chip' + (d <= 2 ? ' bijna' : '') + '">' + ic('kalender') + esc(t) + '</span>';
    }

    function schermStart() {
      var sel = gekozen(), kaarten = kaartjes(sel), alle = pool(sel), r = reeks(), a = advies();
      var html = '<div class="lm-bar">' + terugLink() +
        (r >= 2 ? '<span class="lm-reeks" title="Dagen op rij geoefend">' + ic('vuur') + r + ' dagen</span>' : '') +
        '<button class="lm-profiel" data-act="wie" title="Iemand anders? Wissel van naam">' + ic('persoon') + esc(naam) + '</button></div>';

      var kol1 = '<header class="lm-kop">' + (ctx.vak ? '<div class="lm-eyebrow">' + esc(ctx.vak) + '</div>' : '') +
        '<h1>' + esc(cfg.titel) + '</h1>' + (cfg.ondertitel ? '<p>' + esc(cfg.ondertitel) + '</p>' : '') + toetsChip() + '</header>';
      if (store.fouten.length) {
        kol1 += '<div class="lm-banner"><span>Je had ' + meervoud(store.fouten.length, 'fout', 'fouten') + ' in je vorige toets.</span>' +
          '<button class="lm-btn small" data-act="oefenfouten">Oefen ze nu</button></div>';
      }
      var doel = '';
      if (a.doel) {
        var dots = ''; for (var i = 0; i < a.doel; i++) dots += '<i' + (i < store.dag.r ? ' class="af"' : '') + '></i>';
        doel = '<div class="lm-doel">Doel vandaag: ' + meervoud(a.doel, 'rondje', 'rondjes') + ' ' + dots + (store.dag.r >= a.doel ? ' Gehaald!' : '') + '</div>';
      }
      kol1 += '<section class="lm-vandaag"><small>Vandaag</small><b>' + esc(a.titel) + '</b><span>' + esc(a.sub) + '</span>' + doel +
        (a.actie ? '<button class="lm-btn lm-cta" data-act="advies">' + ic('play') + 'Ga verder</button>' : '') + '</section>';
      kol1 += '<div class="lm-meer">' +
        '<button data-act="leren"' + (heeftUitleg(sel) ? '' : ' disabled') + '>' + ic('boek') + (heeftWoorden && !OND.some(function (o) { return o.uitleg; }) ? 'Woordenlijst' : 'Uitleg') + '</button>' +
        '<button data-act="start" data-v="kaartjes"' + (kaarten.length ? '' : ' disabled') + '>' + ic('kaart') + 'Kaartjes<small>' + kaarten.length + '</small></button>' +
        '<button data-act="toetsstart"' + (alle.length ? '' : ' disabled') + '>' + ic('vlag') + 'Oefentoets</button></div>';

      var kol2 = '';
      var rijen = OND.map(function (o) {
        var s = stats(o); if (!s.totaal) return '';
        var aan = store.kies.indexOf(o.id) >= 0;
        return '<button class="lm-pr' + (aan ? '' : ' uit') + '" data-act="ronde" data-id="' + esc(o.id) + '" aria-label="' + esc(o.titel) + ' oefenen">' +
          '<span class="t"><b>' + esc(o.titel) + '</b>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</span>' +
          '<span class="r">' + sterren(s.sterren) + '<em>' + s.gekend + '/' + s.totaal + '</em></span>' +
          '<span class="bar"><i style="width:' + Math.round(100 * s.gekend / s.totaal) + '%"></i></span></button>';
      }).join('');
      if (rijen) kol2 += '<h2 class="lm-sect">Jouw voortgang</h2><div class="lm-prog">' + rijen + '</div>' +
        '<p class="lm-note">Tik op een onderdeel om het te oefenen. ' + ic('ster', '') .replace('class="lm-i"', 'class="lm-i" style="width:14px;height:14px;fill:var(--star);stroke:none;vertical-align:-2px"') + ' bij de helft gekend, twee bij alles, drie als je alles twee keer achter elkaar goed had.</p>';
      var h = store.hist[0];
      if (h) kol2 += '<h2 class="lm-sect">Laatste oefentoets</h2><div class="lm-laatste"><span>' +
        new Date(h.d).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) + ' · ' + meervoud(h.n, 'vraag', 'vragen') + '</span>' +
        '<b class="' + (h.g >= 5.5 ? 'ok' : 'no') + '">' + cijferTxt(h.g) + '</b></div>';

      // Instellingen, standaard ingeklapt.
      var inst = '';
      if (OND.length > 1) {
        inst += '<span class="lm-label">Wat wil je leren?</span><div class="lm-alles"><button data-act="alles">Alles kiezen</button><button data-act="niets">Niets</button></div><div class="lm-secs">' +
          OND.map(function (o) {
            var on = store.kies.indexOf(o.id) >= 0;
            return '<button class="lm-sec" data-act="sec" data-id="' + esc(o.id) + '" aria-pressed="' + on + '"><span class="lm-box" aria-hidden="true">' + (on ? ic('vink') : '') + '</span>' +
              '<span class="t"><b>' + esc(o.titel) + '</b>' + (o.sub ? '<small>' + esc(o.sub) + '</small>' : '') + '</span>' +
              (o.woorden && o.woorden.length ? '<span class="lm-tag">' + richtingLabel(o.richting) + '</span>' : '') + '</button>';
          }).join('') + '</div>' +
          (heeftWoorden && OND.some(function (o) { return o.richting === 'herkennen'; })
            ? '<p class="lm-note">' + richtingLabel('beide') + ': beide kanten op kennen. ' + richtingLabel('herkennen') + ': alleen weten wat het ' + esc(DOEL.naam) + 'e woord betekent.</p>' : '');
      }
      if (heeftWoorden) inst += '<span class="lm-label">Welke kant op?</span>' + seg('richting', [['boek', 'Zoals in het boek'], ['doel-nl', DOEL.kort + ' → ' + NL.kort], ['nl-doel', NL.kort + ' → ' + DOEL.kort]], store.richting);
      if (heeftToepassen) inst += '<span class="lm-label">Soort vragen</span>' + seg('soort', [['alles', 'Alle vragen'], ['toepassen', 'Alleen toepassen']], store.soort);
      if (inst) kol2 += '<details class="lm-instel"' + (store.kies.length ? '' : ' open') + '><summary>Instellingen<small>' +
        (OND.length > 1 ? store.kies.length + ' van ' + OND.length + ' onderdelen' : '') + '</small></summary><div class="in">' + inst + '</div></details>';

      app.classList.add('lm-breed');
      return html + '<div class="lm-start"><div class="lm-kol">' + kol1 + '</div><div class="lm-kol">' + kol2 + '</div></div>';
    }

    function blokken(uitleg) {
      if (!uitleg) return '';
      if (typeof uitleg === 'string') return '<div class="lm-uitleg">' + uitleg + '</div>';
      return '<div class="lm-uitleg">' + uitleg.map(function (b) {
        return '<details class="lm-blok"' + (b.open ? ' open' : '') + '><summary>' + esc(b.kop) + '</summary><div class="body">' + b.html + '</div></details>';
      }).join('') + '</div>';
    }
    function subBalk(label) {
      return '<div class="lm-bar"><button class="lm-terug" data-act="stop">' + ic('terug') + 'Terug</button><span class="lm-titel">' + esc(label) + '</span></div>';
    }
    function schermLeren() {
      var lijst = lerenOnd ? OND.filter(function (o) { return o.id === lerenOnd; }) : gekozen();
      var html = subBalk(heeftWoorden && !OND.some(function (o) { return o.uitleg; }) ? 'Woordenlijst' : 'Uitleg');
      html += lijst.map(function (o) {
        var tabel = '';
        if (o.woorden && o.woorden.length) {
          tabel = '<div class="lm-scroll"><table>' + o.woorden.map(function (w) {
            return '<tr><td class="lm-w">' + esc(w[1]) + '</td><td>' + esc(w[0]) + '</td><td class="lm-sp">' + sayBtn(w[1]) + '</td></tr>';
          }).join('') + '</table></div>';
        }
        return '<section class="lm-onderdeel"><h2>' + esc(o.titel) + (o.woorden && o.woorden.length ? ' <span class="lm-tag">' + richtingLabel(o.richting) + '</span>' : '') + '</h2>' +
          (o.sub ? '<div class="ref">' + esc(o.sub) + '</div>' : '') + '</section>' + blokken(o.uitleg) + tabel;
      }).join('');
      var een = lijst.length === 1 && stats(lijst[0]).totaal;
      html += '<div class="lm-row" style="margin-top:22px">' +
        (een ? '<button class="lm-btn" data-act="ronde" data-id="' + esc(lijst[0].id) + '">' + ic('play') + 'Oefen dit onderdeel</button>' : '') +
        '<button class="lm-btn' + (een ? ' ghost' : '') + '" data-act="start" data-v="kaartjes"' + (kaartjes(lijst).length ? '' : ' disabled') + '>' + ic('kaart') + 'Kaartjes</button></div>';
      return html;
    }

    function schermToetsStart() {
      var alle = pool(gekozen()), keuzes = aantalKeuzes(alle.length), aantal = toetsAantal(alle.length);
      var heeftOpen = alle.some(function (q) { return q.soort === 'open'; });
      var html = subBalk('Oefentoets') + '<section class="lm-paneel"><h1>Oefentoets</h1>' +
        '<p>Zonder hulp, net als op school. De vragen komen eerlijk verdeeld uit ' + (gekozen().length === 1 ? 'het gekozen onderdeel' : 'de ' + gekozen().length + ' gekozen onderdelen') + '. Aan het eind krijg je een cijfer van 1 tot 10.' +
        (heeftOpen ? ' Open vragen kijk je zelf na; die tellen niet mee voor het cijfer.' : '') + '</p>' +
        '<span class="lm-label" style="margin:4px 0 0">Aantal vragen</span>' + seg('aantal', keuzes, aantal) +
        '<button class="lm-btn lm-cta" data-act="start" data-v="toets"' + (alle.length ? '' : ' disabled') + '>' + ic('vlag') + 'Start de toets</button></section>';
      var hist = store.hist.slice(0, 5).map(function (h) {
        return '<div class="lm-hrow"><span>' + new Date(h.d).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + meervoud(h.n, 'vraag', 'vragen') + '</span>' +
          '<b class="' + (h.g >= 5.5 ? 'ok' : 'no') + '">' + cijferTxt(h.g) + '</b></div>';
      }).join('');
      if (hist) html += '<h2 class="lm-h2">Eerdere cijfers</h2><div class="lm-hist">' + hist + '</div>';
      return html;
    }

    function voortgangBalk() {
      var toets = run.mode === 'toets', n = run.total, segs = '';
      var label = toets ? (run.log.length + 1) + '/' + n : run.done + '/' + n;
      if (n <= 30) {
        if (toets) { for (var i = 0; i < n; i++) segs += '<i class="' + (i < run.log.length ? 'vol' : i === run.log.length ? 'nu' : '') + '"></i>'; }
        else {
          var fout = Object.keys(run.wrong).filter(function (k) { return !run.goedNa[k]; }).length;
          for (var j = 0; j < n; j++) segs += '<i class="' + (j < run.done ? 'ok' : j < run.done + fout ? 'no' : j === run.done + fout ? 'nu' : '') + '"></i>';
        }
        segs = '<div class="lm-segs" aria-hidden="true">' + segs + '</div>';
      } else {
        segs = '<div class="lm-bar2" aria-hidden="true"><i style="width:' + Math.round(100 * (toets ? run.log.length : run.done) / n) + '%"></i></div>';
      }
      return '<div class="lm-top"><button class="lm-x" data-act="stop" aria-label="Stoppen">' + ic('x') + '</button>' + segs + '<span class="lm-count">' + label + '</span></div>';
    }

    function richtingTekst(q) { return q.van === 'doel' ? DOEL.naam + ' → ' + NL.naam : NL.naam + ' → ' + DOEL.naam; }
    function kaartKop(q) {
      var rechts = q.ond && OND.length > 1 ? esc(q.ond.titel) : '';
      var links = q.soort === 'woord' ? richtingTekst(q) : q.soort === 'kaart' ? 'Kaartje' : run.mode === 'toets' ? 'Toetsvraag' : 'Vraag';
      return '<div class="lm-dir"><span>' + links + '</span><span>' + rechts + '</span></div>';
    }

    function schermKaartjes() {
      var q = run.cur;
      var voor, achter;
      if (q.soort === 'woord') {
        voor = '<div class="lm-wordrow"><span class="lm-word">' + vraagTekst(q) + '</span>' + (run.flipped && q.van === 'doel' ? sayBtn(q.item.doel) : '') + '</div>';
        achter = '<div class="lm-answer lm-wordrow"><span class="lm-word">' + antwoordTekst(q) + '</span>' + (q.naar === 'doel' ? sayBtn(q.item.doel) : '') + '</div>';
      } else {
        voor = '<div class="lm-begrip">' + q.voor + '</div>';
        achter = '<div class="lm-achter">' + q.achter + '</div>';
      }
      var html = voortgangBalk();
      if (!run.flipped) {
        return html + '<button class="lm-card" data-act="flip">' + kaartKop(q) + voor +
          '<div class="lm-hint">Weet je het? ' + (aanraak() ? 'Tik' : 'Klik') + ' om het kaartje om te draaien.' + kbd('spatie') + '</div></button>';
      }
      return html + '<div class="lm-card">' + kaartKop(q) + voor + achter + '</div>' +
        '<div class="lm-voet"><div class="row"><button class="lm-btn bad" data-act="nope">Nog niet' + kbd('←') + '</button><button class="lm-btn good" data-act="know">' + ic('vink') + 'Ken ik' + kbd('→') + '</button></div></div>';
    }

    function opties(q) {
      if (!q.volgorde) {
        q.volgorde = q.v.opties.map(function (_, i) { return i; });
        if (q.v.husselen !== false) shuffle(q.volgorde);
      }
      return q.volgorde;
    }

    function schermVraag() {
      var q = run.cur, toets = run.mode === 'toets';
      var laatste = toets && run.queue.length === 0;
      var verder = toets ? (laatste ? 'Toets inleveren' : 'Volgende vraag') : 'Volgende';
      var html = voortgangBalk() + '<div class="lm-card">' + kaartKop(q) +
        (q.soort === 'woord'
          ? '<div class="lm-wordrow"><span class="lm-word">' + vraagTekst(q) + '</span>' + (q.van === 'doel' ? sayBtn(q.item.doel) : '') + '</div>'
          : '<div class="lm-vraag">' + vraagTekst(q) + '</div>') + '</div>';

      if (q.soort === 'mc') {
        html += '<div class="lm-opts" role="group" aria-label="Antwoorden">' + opties(q).map(function (i, n) {
          var cls = '', pressed = '';
          if (!toets && run.answered) cls = i === q.v.antwoord ? ' right' : i === run.keuze ? ' wrong' : '';
          if (toets) pressed = ' aria-pressed="' + (run.keuze === i) + '"';
          return '<button class="lm-opt' + cls + '" data-act="kies" data-v="' + i + '"' + pressed + (!toets && run.answered ? ' disabled' : '') + '>' +
            '<span class="k" aria-hidden="true">' + LETTERS[n] + '</span><span>' + q.v.opties[i] + '</span></button>';
        }).join('') + '</div>';
        if (toets) return html + '<div class="lm-voet"><div class="row"><button class="lm-btn ghost" data-act="skip">Weet ik niet</button>' +
          '<button class="lm-btn" data-act="volgende"' + (run.keuze == null ? ' disabled' : '') + '>' + verder + kbd('Enter') + '</button></div></div>';
        if (run.answered) return html + feedback(q, '<button class="lm-btn" data-act="next">' + verder + kbd('Enter') + '</button>');
        return html;
      }

      if (q.soort === 'open') {
        html += '<textarea id="ans" class="lm-ans" placeholder="Typ hier je antwoord…" aria-label="Jouw antwoord"' + (run.model ? ' disabled' : '') + '>' + esc(run.given) + '</textarea>';
        if (!run.model) return html + '<div class="lm-voet"><div class="row"><button class="lm-btn" data-act="model">Bekijk het goede antwoord' + kbd('Ctrl+Enter') + '</button></div></div>';
        return html + '<div class="lm-model" role="status"><b>Goed antwoord</b>' + q.v.model + '</div>' +
          '<div class="lm-voet"><div class="lm-fb"><b>Hoe ging het? Wees eerlijk.</b></div><div class="row">' +
          '<button class="lm-btn bad" data-act="zelf" data-v="0">Fout</button><button class="lm-btn half" data-act="zelf" data-v="0.5">Half goed</button>' +
          '<button class="lm-btn good" data-act="zelf" data-v="1">Goed</button></div></div>';
      }

      // typ (woord of typvraag)
      var naarTaal = q.soort === 'woord' ? (q.naar === 'doel' ? DOEL : NL) : (q.v.taal ? (typeof q.v.taal === 'object' ? q.v.taal : TALEN[q.v.taal]) : null);
      var ph = q.soort === 'woord' ? 'Typ het ' + naarTaal.naam + 'e woord' : 'Typ je antwoord';
      var accenten = naarTaal && naarTaal.accenten && naarTaal.accenten.length && !run.answered
        ? '<div class="lm-accents" aria-label="Letters met accent">' + naarTaal.accenten.map(function (c) { return '<button data-act="acc" data-v="' + c + '" tabindex="-1">' + c + '</button>'; }).join('') + '</div>' : '';
      html += '<input id="ans" class="lm-ans" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"' +
        ' placeholder="' + ph + '" value="' + esc(run.given) + '"' + (run.answered ? ' disabled' : '') + ' aria-label="' + ph + '">' + accenten;
      if (toets) return html + '<div class="lm-voet"><div class="row"><button class="lm-btn ghost" data-act="skip">Weet ik niet</button><button class="lm-btn" data-act="submit">' + verder + kbd('Enter') + '</button></div></div>';
      if (!run.answered) return html + '<div class="lm-voet"><div class="row"><button class="lm-btn ghost" data-act="skip">Weet ik niet</button><button class="lm-btn" data-act="submit">Controleer' + kbd('Enter') + '</button></div></div>';
      var toch = run.res.score < 1 && run.given.trim() ? '<button class="lm-btn link" data-act="tochgoed">Ik had het goed (tikfout)</button>' : '';
      return html + feedback(q, '<button class="lm-btn" data-act="next">Volgende' + kbd('Enter') + '</button>' + toch);
    }

    function feedback(q, knoppen) {
      var r = run.res;
      var cls = r.score === 1 ? 'good' : r.score > 0 ? 'half' : 'bad';
      var msg = r.score === 1 ? 'Goed zo!' : r.score > 0 ? r.note : (run.given.trim() || run.keuze != null ? 'Helaas, niet goed.' : 'Dit is het antwoord:');
      var toonAntwoord = q.soort === 'mc' ? false : (r.score < 1 || (q.soort === 'woord' && q.naar === 'doel'));
      var antwoord = toonAntwoord ? '<span class="correct"><span>' + antwoordTekst(q) + '</span>' + (q.soort === 'woord' && q.naar === 'doel' ? sayBtn(q.item.doel) : '') + '</span>' : '';
      var uitleg = q.v && q.v.uitleg ? '<span class="uitleg">' + q.v.uitleg + '</span>' : '';
      var nog = r.score < 1 ? '<span class="uitleg">Deze vraag komt straks nog een keer terug.</span>' : '';
      return '<div class="lm-voet ' + cls + '" role="status"><div class="lm-fb"><b>' + ic(r.score === 1 ? 'vink' : r.score > 0 ? 'pen' : 'x') + esc(msg) + '</b>' + antwoord + uitleg + nog + '</div>' +
        '<div class="row">' + knoppen + '</div></div>';
    }

    function schermKlaar() {
      var lastig = Object.keys(run.wrong).map(function (k) { return run.wrong[k]; });
      var kaart = run.mode === 'kaartjes';
      var html = '<div class="lm-bar">' + terugLink() + '</div><section class="lm-klaar">';
      if (!kaart && run.ond) {
        var na = stats(run.ond), voor = run.voor;
        var st = '';
        for (var i = 0; i < 3; i++) st += ic('ster', i >= na.sterren ? 'uit' : i >= voor.sterren ? 'nieuw' : '');
        html += '<span class="lm-grootster" aria-label="' + na.sterren + ' van 3 sterren">' + st + '</span>';
        html += '<h1>' + (na.sterren > voor.sterren ? 'Nieuwe ster!' : 'Rondje klaar!') + '</h1><p>' + esc(run.ond.titel) + ': ' + na.gekend + ' van de ' + na.totaal + ' vragen gekend.</p>';
        var plus = na.gekend - voor.gekend;
        var nodig = na.sterren === 0 ? Math.ceil(na.totaal / 2) - na.gekend : na.sterren === 1 ? na.totaal - na.gekend : 0;
        html += '<div class="lm-plus">' + (plus > 0 ? '<span class="g">+' + plus + ' gekend</span>' : '') +
          (reeks() >= 2 ? '<span class="w">' + reeks() + ' dagen op rij</span>' : '') + '</div>' +
          (nodig > 0 ? '<p>Nog ' + meervoud(nodig, 'vraag', 'vragen') + ' tot je volgende ster.</p>'
            : na.sterren === 2 ? '<p>Voor de derde ster: alles nog een keer goed.</p>' : '');
      } else {
        html += '<h1>' + (kaart ? 'Kaartjes klaar!' : 'Rondje klaar!') + '</h1><p>Je kent nu alle ' + run.total + ' ' + (kaart ? 'kaartjes' : 'vragen') + ' van dit rondje.</p>' +
          (reeks() >= 2 ? '<div class="lm-plus"><span class="w">' + reeks() + ' dagen op rij</span></div>' : '');
      }
      html += '</section>';
      html += '<div class="lm-row" style="margin-top:24px">' +
        (kaart ? '<button class="lm-btn" data-act="start" data-v="kaartjes">' + ic('opnieuw') + 'Nog een rondje kaartjes</button>'
          : '<button class="lm-btn" data-act="nogeen">' + ic('opnieuw') + 'Nog een rondje</button>') +
        '<button class="lm-btn ghost" data-act="naarstart">Naar het begin</button></div>';
      if (lastig.length) html += '<h2 class="lm-h2">Deze vond je lastig</h2><div class="lm-list">' + lastig.map(function (q) {
        return '<div class="lm-li"><span class="lm-mark half">!</span><span class="q">' + vraagTekst(q) + '</span><span class="c">' + antwoordTekst(q) + '</span></div>';
      }).join('') + '</div>';
      return html;
    }

    function schermUitslag() {
      var g = run.grade, n = run.telt;
      var verdict = g >= 9 ? (cfg.teksten && cfg.teksten.top || 'Uitstekend gedaan!') : g >= 7.5 ? 'Goed gedaan!' : g >= 5.5 ? 'Voldoende. Oefen de fouten nog even.' : 'Nog niet voldoende. Oefen je fouten en probeer het opnieuw.';
      var rows = run.log.slice().sort(function (a, b) { return a.res.score - b.res.score; }).map(function (l) {
        var q = l.q, s = l.res.score, cls = s === 1 ? 'ok' : s > 0 ? 'half' : 'no', mk = s === 1 ? '✓' : s > 0 ? '½' : '✗';
        var gegeven = q.soort === 'mc' ? (l.keuze != null ? q.v.opties[l.keuze] : '') : esc(l.given.trim());
        var g2 = gegeven ? gegeven : '<i>niets ingevuld</i>';
        if (q.soort === 'open') g2 = l.given.trim() ? esc(l.given) + ' <i>(zelf nagekeken, telt niet mee)</i>' : '<i>niets ingevuld</i>';
        return '<div class="lm-li"><span class="lm-mark ' + cls + '">' + mk + '</span><span class="q">' + vraagTekst(q) + '</span>' +
          (s === 1 ? '<span class="g">' + g2 + '</span>'
            : '<span class="g">Jij: ' + (s === 0 && gegeven ? '<s>' + g2 + '</s>' : g2) + (l.res.note ? ' (' + esc(l.res.note.replace('Bijna goed: ', '')) + ')' : '') + '</span><span class="c">' + antwoordTekst(q) + '</span>') + '</div>';
      }).join('');
      var fout = Object.keys(run.wrong).length;
      return '<div class="lm-bar">' + terugLink() + '</div>' +
        '<div class="lm-grade"><svg viewBox="0 0 200 160" aria-hidden="true"><path d="M150,26 C112,4 42,14 22,54 C4,94 44,140 102,142 C162,144 188,102 174,62 C164,34 132,20 92,24" fill="none" stroke-width="4" stroke-linecap="round"/></svg>' +
        '<span>' + cijferTxt(g) + '</span></div>' +
        '<p class="lm-verdict">' + esc(verdict) + '</p>' +
        '<p class="lm-stats">' + komma(run.score) + ' van de ' + n + ' punten goed.' + (heeftWoorden ? ' Halve punten voor een foutje in een accent of lidwoord.' : '') +
        (run.open ? '<br>Open vragen (zelf nagekeken): ' + komma(run.openScore) + ' van de ' + run.open + '.' : '') + '</p>' +
        '<div class="lm-row" style="margin-top:20px">' +
        (fout ? '<button class="lm-btn" data-act="retry">' + ic('pen') + 'Oefen mijn fouten (' + fout + ')</button>' : '') +
        '<button class="lm-btn ghost" data-act="start" data-v="toets">Nieuwe toets</button>' +
        '<button class="lm-btn ghost" data-act="naarstart">Naar het begin</button></div>' +
        '<h2 class="lm-h2">Alle antwoorden</h2><div class="lm-list">' + rows + '</div>';
    }

    function schermWie() {
      var namen = Profiel.namen();
      return '<div class="lm-bar">' + terugLink() + '</div><header class="lm-kop" style="margin-bottom:14px"><h1>' + esc(cfg.titel) + '</h1></header>' +
        '<section class="lm-wie"><h2>Wie ben jij?</h2>' +
        (namen.length ? '<p>Tik op je naam:</p><div class="lm-namen">' + namen.map(function (n) {
          return '<button class="lm-btn ghost" data-act="naam" data-v="' + esc(n) + '">' + (n === naam ? ic('vink') : '') + esc(n) + '</button>';
        }).join('') + '</div><p>Of typ een nieuwe naam:</p>' : '<p>Typ je voornaam. Dan worden jouw oefeningen en cijfers apart bewaard.</p>') +
        '<form class="lm-naamform" data-act-form="naam"><input id="lm-naam" class="lm-ans" maxlength="20" autocomplete="given-name" placeholder="Je voornaam" aria-label="Je voornaam">' +
        '<button class="lm-btn" type="submit">Start</button></form>' +
        '<p class="lm-note">Je naam en je resultaten blijven alleen op dit apparaat. Niemand anders kan ze zien.</p>' +
        (naam ? '<div class="lm-row"><button class="lm-btn ghost" data-act="naarstart">Terug</button></div>' : '') + '</section>';
    }
    function kiesNaam(n) {
      if (!Profiel.kies(n)) return;
      naam = Profiel.naam(); laadStore(); run = null; scherm = 'start'; render(); window.scrollTo(0, 0);
    }
    app.addEventListener('submit', function (e) {
      if (!e.target.matches('[data-act-form="naam"]')) return;
      e.preventDefault(); kiesNaam(document.getElementById('lm-naam').value);
    });

    /* ----- Verloop ----- */
    function render() {
      app.classList.remove('lm-breed');
      app.classList.toggle('lm-spel', scherm === 'vraag' || scherm === 'kaartjes');
      if (!naam || scherm === 'wie') { app.innerHTML = schermWie(); var ni = document.getElementById('lm-naam'); if (ni && !aanraak() && !Profiel.namen().length) ni.focus(); return; }
      app.innerHTML = scherm === 'start' ? schermStart() : scherm === 'leren' ? schermLeren() : scherm === 'toetsstart' ? schermToetsStart()
        : scherm === 'kaartjes' ? schermKaartjes() : scherm === 'vraag' ? schermVraag()
          : scherm === 'klaar' ? schermKlaar() : schermUitslag();
      var inp = document.getElementById('ans');
      if (inp && !inp.disabled && !(inp.tagName === 'TEXTAREA' && aanraak())) inp.focus({ preventScroll: true });
      wrapTabellen();
    }
    function wrapTabellen() {
      app.querySelectorAll('.lm-uitleg table').forEach(function (t) {
        if (t.parentNode.classList.contains('lm-scroll')) return;
        var w = document.createElement('div'); w.className = 'lm-scroll';
        t.parentNode.insertBefore(w, t); w.appendChild(t);
      });
    }

    // Eén geschiedenis-stap per sessie: start → (#scherm). Zo werkt de terugknop van de browser/telefoon.
    function ga(s) {
      var wasStart = scherm === 'start';
      scherm = s;
      if (s === 'start') { if (location.hash) history.replaceState(null, '', location.pathname + location.search); }
      else if (wasStart) history.pushState({ lm: 1 }, '', '#' + s);
      else history.replaceState({ lm: 1 }, '', '#' + s);
      render(); window.scrollTo(0, 0);
    }
    function naarStart() {
      run = null;
      if (scherm === 'wie') { scherm = 'start'; render(); return; }
      if (location.hash && history.state && history.state.lm) history.back(); // popstate tekent het startscherm
      else ga('start');
    }
    function bezigMetToets() { return run && run.mode === 'toets' && scherm === 'vraag' && run.log.length > 0; }
    function stoppen() {
      if (bezigMetToets() && !confirm('Toets stoppen? Je cijfer telt dan niet mee.')) return;
      naarStart();
    }
    window.addEventListener('popstate', function () {
      if (location.hash) { history.replaceState(null, '', location.pathname + location.search); }
      if (scherm === 'start') return render();
      if (bezigMetToets() && !confirm('Toets stoppen? Je cijfer telt dan niet mee.')) {
        history.pushState({ lm: 1 }, '', '#' + scherm); return;
      }
      run = null; scherm = 'start'; render(); window.scrollTo(0, 0);
    });
    // Voor de terugknop van de site: hoeveel stappen terug is het overzicht?
    window.huiswerkTerugStappen = function () { return location.hash && history.state && history.state.lm ? 2 : 1; };
    function naarOverzicht(e) {
      var vanIndex = /[?&]from=index(&|$)/.test(location.search);
      var zelfdeSite = document.referrer && document.referrer.indexOf(location.origin) === 0;
      var stappen = window.huiswerkTerugStappen();
      if (vanIndex && zelfdeSite && history.length > stappen) { e.preventDefault(); history.go(-stappen); }
    }

    // mode: 'kaartjes' | 'oefenen' | 'toets'. opties: { lijst, ond, vanFouten }
    function begin(mode, o) {
      o = o || {};
      var sel = o.ond ? [o.ond] : gekozen(), qs;
      if (mode === 'kaartjes') qs = o.lijst ? shuffle(o.lijst.slice()) : kiesRonde(kaartjes(sel), KAARTRONDE, 'k|');
      else if (mode === 'toets') { var alle = pool(sel), n = toetsAantal(alle.length); qs = o.lijst ? shuffle(o.lijst.slice()) : kiesToets(alle, n === 'alle' ? alle.length : +n); }
      else qs = o.lijst ? shuffle(o.lijst.slice()) : kiesRonde(o.ond ? pool([o.ond]).length ? pool([o.ond]) : alleVan(o.ond) : pool(sel), RONDE);
      if (!qs.length) return;
      run = { mode: mode, queue: qs, total: qs.length, done: 0, cur: null, flipped: false, answered: false, res: null, given: '', keuze: null, model: false,
        wrong: {}, goedNa: {}, gehad: {}, log: [], score: 0, ond: o.ond || (sel.length === 1 ? sel[0] : null), vanFouten: !!o.vanFouten, herhaal: o };
      if (run.ond && mode === 'oefenen') run.voor = stats(run.ond);
      volgende(true);
    }
    function volgende(eerste) {
      run.flipped = false; run.answered = false; run.res = null; run.given = ''; run.keuze = null; run.model = false;
      run.cur = run.queue.shift() || null;
      if (!run.cur) return afronden();
      var s = run.mode === 'kaartjes' ? 'kaartjes' : 'vraag';
      if (eerste) ga(s); else { scherm = s; render(); window.scrollTo(0, 0); }
    }
    function terugInRij(q) { run.wrong[q.key] = q; run.queue.splice(Math.min(3, run.queue.length), 0, q); }
    function telLeer(q, goed, prefix) {
      // Alleen de eerste poging telt voor het geheugen; een verbetering later in het rondje maakt hem "net gekend".
      var k = (prefix || '') + q.key;
      if (!run.gehad[k]) { run.gehad[k] = 1; leer(k, goed); }
      else if (goed && stand(k) === 0) store.m[k] = [1, Date.now()];
    }
    function afronden() {
      oefenVandaag();
      telGebeurtenis(run.mode === 'toets' ? 'oefentoets' : run.mode === 'kaartjes' ? 'kaartjes-klaar' : 'rondje-klaar', cfg.id, cfg.titel);
      if (run.mode === 'toets') {
        var tellen = run.log.filter(function (l) { return l.q.soort !== 'open'; });
        var open = run.log.filter(function (l) { return l.q.soort === 'open'; });
        if (!tellen.length) { tellen = run.log; open = []; }
        run.telt = tellen.length;
        run.score = tellen.reduce(function (a, l) { return a + l.res.score; }, 0);
        run.open = open.length; run.openScore = open.reduce(function (a, l) { return a + l.res.score; }, 0);
        run.grade = Math.max(1, Math.min(10, Math.round((1 + 9 * run.score / run.telt) * 10) / 10));
        store.hist.unshift({ d: Date.now(), g: run.grade, n: run.telt });
        store.hist = store.hist.slice(0, 20);
        store.fouten = Object.keys(run.wrong);
        save();
        ga('uitslag');
      } else {
        if (run.mode === 'oefenen') { store.dag.r++; if (run.vanFouten) store.fouten = []; }
        save();
        ga('klaar');
      }
    }
    function beantwoord(given, keuze) {
      var q = run.cur, res;
      if (q.soort === 'mc') res = { score: keuze === q.v.antwoord ? 1 : 0 };
      else res = nakijken(q, given);
      if (run.mode === 'toets') {
        run.log.push({ q: q, given: given || '', keuze: keuze, res: res });
        if (res.score < 1) run.wrong[q.key] = q;
        telLeer(q, res.score === 1);
        return volgende();
      }
      telLeer(q, res.score === 1);
      run.res = res; run.given = given || ''; run.keuze = keuze; run.answered = true;
      if (res.score === 1) { run.done++; if (run.wrong[q.key]) run.goedNa[q.key] = 1; } else terugInRij(q);
      save(); render();
      var nb = app.querySelector('[data-act="next"]'); if (nb && !aanraak()) nb.focus({ preventScroll: true });
    }
    function tochGoed() {
      var q = run.cur, i = run.queue.indexOf(q);
      if (i >= 0) run.queue.splice(i, 1);
      delete run.wrong[q.key];
      store.m[q.key] = [Math.max(1, stand(q.key)), Date.now()];
      run.done++; save(); volgende();
    }
    function zelfBeoordeeld(score) {
      var q = run.cur, res = { score: score };
      telLeer(q, score === 1);
      if (run.mode === 'toets') {
        run.log.push({ q: q, given: run.given, res: res });
        if (score < 1) run.wrong[q.key] = q;
      } else if (score === 1) { run.done++; if (run.wrong[q.key]) run.goedNa[q.key] = 1; }
      else terugInRij(q);
      save(); volgende();
    }
    function verstuur() {
      var inp = document.getElementById('ans'), v = inp ? inp.value : '';
      if (run.mode !== 'toets' && !v.trim()) { if (inp) inp.focus(); return; }
      beantwoord(v);
    }
    function accent(c) {
      var inp = document.getElementById('ans'); if (!inp) return;
      var s = inp.selectionStart != null ? inp.selectionStart : inp.value.length, e = inp.selectionEnd != null ? inp.selectionEnd : s;
      inp.value = inp.value.slice(0, s) + c + inp.value.slice(e);
      inp.focus(); inp.setSelectionRange(s + c.length, s + c.length);
    }
    function oefenFouten(keys) {
      var m = alleVragenOpKey();
      var lijst = keys.map(function (k) { return m[k]; }).filter(Boolean);
      if (!lijst.length) { store.fouten = []; save(); return render(); }
      begin('oefenen', { lijst: lijst, vanFouten: true });
    }
    function volgAdvies() {
      var a = advies();
      if (a.actie === 'ronde') begin('oefenen', { ond: a.ond });
      else if (a.actie === 'leesuitleg') { lerenOnd = a.ond.id; store.gelezen[a.ond.id] = 1; save(); ga('leren'); }
      else if (a.actie === 'toetsstart') ga('toetsstart');
      else if (a.actie === 'kaartjes') begin('kaartjes');
    }

    /* ----- Invoer ----- */
    document.addEventListener('mousedown', function (e) { if (e.target.closest('.lm-accents button')) e.preventDefault(); });
    app.addEventListener('input', function (e) { if (e.target.id === 'ans' && run) run.given = e.target.value; });
    app.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
      var a = b.dataset.act, v = b.dataset.v;
      if (a === 'overzicht') { naarOverzicht(e); return; }
      if (a === 'say') { e.stopPropagation(); spreek(b.dataset.t, DOEL.code); return; }
      if (a === 'wie') { scherm = 'wie'; render(); window.scrollTo(0, 0); return; }
      if (a === 'naam') { kiesNaam(v); return; }
      if (a === 'sec') {
        var id = b.dataset.id;
        store.kies = store.kies.indexOf(id) >= 0 ? store.kies.filter(function (x) { return x !== id; }) : store.kies.concat(id);
        store.kies = OND.map(function (o) { return o.id; }).filter(function (x) { return store.kies.indexOf(x) >= 0; });
        save(); render(); var d = app.querySelector('details.lm-instel'); if (d) d.open = true;
      }
      else if (a === 'alles' || a === 'niets') { store.kies = a === 'alles' ? OND.map(function (o) { return o.id; }) : []; save(); render(); var d2 = app.querySelector('details.lm-instel'); if (d2) d2.open = true; }
      else if (a === 'richting' || a === 'soort') { store[a] = v; save(); render(); var d3 = app.querySelector('details.lm-instel'); if (d3) d3.open = true; }
      else if (a === 'aantal') { store.aantal = v; save(); render(); }
      else if (a === 'advies') volgAdvies();
      else if (a === 'leren') { lerenOnd = null; gekozen().forEach(function (o) { store.gelezen[o.id] = 1; }); save(); ga('leren'); }
      else if (a === 'toetsstart') ga('toetsstart');
      else if (a === 'ronde') { var o = OND.filter(function (x) { return x.id === b.dataset.id; })[0]; if (o) begin('oefenen', { ond: o }); }
      else if (a === 'start') begin(v);
      else if (a === 'nogeen') begin('oefenen', run && run.herhaal && !run.herhaal.lijst ? run.herhaal : {});
      else if (a === 'stop') stoppen();
      else if (a === 'naarstart') naarStart();
      else if (a === 'oefenfouten') oefenFouten(store.fouten);
      else if (a === 'flip') { run.flipped = true; render(); var k = app.querySelector('[data-act="know"]'); if (k && !aanraak()) k.focus({ preventScroll: true }); }
      else if (a === 'know') { telLeer(run.cur, true, 'k|'); run.done++; save(); volgende(); }
      else if (a === 'nope') { telLeer(run.cur, false, 'k|'); terugInRij(run.cur); save(); volgende(); }
      else if (a === 'kies') {
        var i = +v;
        if (run.mode === 'toets') { run.keuze = i; render(); var nx = app.querySelector('[data-act="volgende"]'); if (nx && !aanraak()) nx.focus({ preventScroll: true }); }
        else if (!run.answered) beantwoord(null, i);
      }
      else if (a === 'volgende') beantwoord(null, run.keuze);
      else if (a === 'submit') verstuur();
      else if (a === 'skip') beantwoord('', null);
      else if (a === 'next') volgende();
      else if (a === 'tochgoed') tochGoed();
      else if (a === 'acc') accent(v);
      else if (a === 'model') { var t = document.getElementById('ans'); run.given = t ? t.value : ''; run.model = true; render(); }
      else if (a === 'zelf') zelfBeoordeeld(+v);
      else if (a === 'retry') begin('oefenen', { lijst: Object.keys(run.wrong).map(function (k2) { return run.wrong[k2]; }) });
    });
    document.addEventListener('keydown', function (e) {
      if (!run || e.altKey || e.metaKey && e.key !== 'Enter' || e.ctrlKey && e.key !== 'Enter') return;
      var t = e.target, inInput = t && t.tagName === 'INPUT', inArea = t && t.tagName === 'TEXTAREA';
      if (t && t.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return; // knop doet het zelf
      if (scherm === 'kaartjes') {
        if (!run.flipped && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); run.flipped = true; render(); }
        else if (run.flipped && (e.key === 'ArrowRight' || e.key === 'k')) { e.preventDefault(); telLeer(run.cur, true, 'k|'); run.done++; save(); volgende(); }
        else if (run.flipped && (e.key === 'ArrowLeft' || e.key === 'n')) { e.preventDefault(); telLeer(run.cur, false, 'k|'); terugInRij(run.cur); save(); volgende(); }
        return;
      }
      if (scherm !== 'vraag') return;
      var q = run.cur;
      if (inArea) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !run.model) { e.preventDefault(); run.given = t.value; run.model = true; render(); }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (q.soort === 'mc') {
          if (run.mode === 'toets') { if (run.keuze != null) beantwoord(null, run.keuze); }
          else if (run.answered) volgende();
        } else if (q.soort === 'typ' || q.soort === 'woord') {
          if (run.answered) volgende(); else if (inInput || run.mode !== 'toets') verstuur();
        }
        return;
      }
      if (q.soort === 'mc' && !inInput) {
        var key = e.key.toLowerCase(), n = /^[1-9]$/.test(key) ? +key - 1 : LETTERS.toLowerCase().indexOf(key);
        if (n < 0 || key.length !== 1) return;
        var idx = opties(q)[n];
        if (idx == null) return;
        if (run.mode === 'toets') { run.keuze = idx; render(); }
        else if (!run.answered) beantwoord(null, idx);
      }
    });

    if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (kanSpreken) { try { speechSynthesis.getVoices(); } catch (e) { /* */ } }
    render();
  }

  function valideer(cfg) {
    if (!cfg || typeof cfg !== 'object') throw new Error('geen instellingen meegegeven.');
    if (!cfg.id || !/^[a-z0-9-]+$/.test(cfg.id)) throw new Error('"id" ontbreekt of bevat iets anders dan kleine letters, cijfers en streepjes.');
    if (!cfg.titel) throw new Error('"titel" ontbreekt.');
    if (!Array.isArray(cfg.onderdelen) || !cfg.onderdelen.length) throw new Error('"onderdelen" is leeg.');
    var ids = {};
    cfg.onderdelen.forEach(function (o, n) {
      var waar = 'onderdeel ' + (n + 1) + (o && o.titel ? ' (' + o.titel + ')' : '');
      if (!o.id) throw new Error(waar + ' heeft geen "id".');
      if (ids[o.id]) throw new Error('onderdeel-id "' + o.id + '" komt twee keer voor.');
      ids[o.id] = 1;
      if (!o.titel) throw new Error(waar + ' heeft geen "titel".');
      (o.vragen || []).forEach(function (v, i) {
        var w = waar + ', vraag ' + (i + 1);
        if (!v.vraag) throw new Error(w + ' heeft geen "vraag".');
        if (v.opties && !(v.antwoord >= 0 && v.antwoord < v.opties.length)) throw new Error(w + ': "antwoord" moet het nummer van de goede optie zijn (0 = eerste).');
        if (!v.opties && v.model == null && v.antwoord == null) throw new Error(w + ' heeft geen "antwoord", "opties" of "model".');
      });
      (o.woorden || []).forEach(function (w, i) { if (!Array.isArray(w) || w.length < 2) throw new Error(waar + ', woord ' + (i + 1) + ' moet [nederlands, vreemd] zijn.'); });
      (o.kaartjes || []).forEach(function (c, i) { if (!Array.isArray(c) || c.length < 2) throw new Error(waar + ', kaartje ' + (i + 1) + ' moet [voorkant, achterkant] zijn.'); });
    });
    if (cfg.taal && typeof cfg.taal === 'string' && !TALEN[cfg.taal]) throw new Error('onbekende taal "' + cfg.taal + '". Kies uit: ' + Object.keys(TALEN).join(', ') + '.');
  }

  window.Leermodule = { versie: VERSIE, start: start, TALEN: TALEN, Profiel: Profiel, _test: { norm: norm, variants: variants, controleer: controleer } };
})();
