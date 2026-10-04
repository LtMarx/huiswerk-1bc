/* Leermodule v1 — standaard engine voor leren, kaartjes, oefenen en toetsen.
   Gebruik in een app:  Leermodule.start({ id, titel, onderdelen: [...] })
   Volledige beschrijving van het format: _leermodule/README.md
   Regel: v1 alleen uitbreiden, nooit gedrag of veldnamen veranderen (bestaande apps gebruiken dit). */
(function () {
  'use strict';

  var VERSIE = '1.1.0';

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

  /* ---------- De module ---------- */
  function start(cfg) {
    var app = document.getElementById('app');
    if (!app) { app = document.createElement('div'); app.id = 'app'; document.body.appendChild(app); }
    app.className = 'lm-wrap';

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
    var heeftToepassen = OND.some(function (o) { return (o.vragen || []).some(function (v) { return v.toepassen; }); })
      && OND.some(function (o) { return (o.vragen || []).some(function (v) { return !v.toepassen; }); });

    // Voortgang wordt per naam bewaard: '<id>-v1@<naam>'. Alles blijft op dit apparaat.
    var store, naam = Profiel.naam();
    function laadStore() {
      store = { kies: OND.map(function (o) { return o.id; }), richting: 'boek', aantal: String((cfg.toets && cfg.toets.standaard) || 20), soort: 'alles', hist: [], fouten: [] };
      KEY = naam ? KEY_BASIS + '@' + naam.toLowerCase() : KEY_BASIS;
      try {
        var raw = localStorage.getItem(KEY);
        // Voortgang van vóór de namen gaat één keer over naar de eerste naam die deze app opent.
        if (!raw && naam && (raw = localStorage.getItem(KEY_BASIS))) { localStorage.setItem(KEY, raw); localStorage.removeItem(KEY_BASIS); }
        if (raw) store = Object.assign(store, JSON.parse(raw));
      } catch (e) { /* privévenster */ }
      store.kies = store.kies.filter(function (id) { return OND.some(function (o) { return o.id === id; }); });
    }
    laadStore();
    function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* vol of geblokkeerd */ } }

    var scherm = 'start', run = null;
    document.title = document.title || cfg.titel;

    /* ----- Inhoud verzamelen ----- */
    var gekozen = function () { return OND.filter(function (o) { return store.kies.indexOf(o.id) >= 0; }); };
    var richtingLabel = function (r) { return r === 'herkennen' ? DOEL.kort + ' → ' + NL.kort : DOEL.kort + ' ⇄ ' + NL.kort; };

    function woordItems() {
      var map = {}, lijst = [];
      gekozen().forEach(function (o) {
        (o.woorden || []).forEach(function (w, i) {
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
    function flat(a) { return [].concat.apply([], a); }

    function woordVragen() {
      var qs = [];
      woordItems().forEach(function (it) {
        if (store.richting !== 'nl-doel') qs.push({ soort: 'woord', key: 'w:' + it.k + '>nl', item: it, van: 'doel', naar: 'nl', ond: it.ond });
        if (it.richting === 'beide' && store.richting !== 'doel-nl') qs.push({ soort: 'woord', key: 'w:' + it.k + '>doel', item: it, van: 'nl', naar: 'doel', ond: it.ond });
      });
      return qs;
    }
    function gewoneVragen(alles) {
      var qs = [];
      (alles ? OND : gekozen()).forEach(function (o) {
        (o.vragen || []).forEach(function (v, i) {
          if (!alles && store.soort === 'toepassen' && !v.toepassen) return;
          var soort = v.opties ? 'mc' : v.model != null ? 'open' : 'typ';
          qs.push({ soort: soort, key: 'v:' + o.id + ':' + i, v: v, ond: o });
        });
      });
      return qs;
    }
    function vraagPool() { return gewoneVragen().concat(store.soort === 'toepassen' ? [] : woordVragen()); }
    function alleVragenOpKey() {
      var m = {};
      gewoneVragen(true).forEach(function (q) { m[q.key] = q; });
      var bewaar = { kies: store.kies, richting: store.richting };
      store.kies = OND.map(function (o) { return o.id; }); store.richting = 'boek';
      woordVragen().forEach(function (q) { m[q.key] = q; });
      store.kies = bewaar.kies; store.richting = bewaar.richting;
      return m;
    }
    function kaartjes() {
      var lijst = [];
      woordVragen().forEach(function (q) { lijst.push(q); });
      gekozen().forEach(function (o) {
        (o.kaartjes || []).forEach(function (c, i) { lijst.push({ soort: 'kaart', key: 'k:' + o.id + ':' + i, voor: c[0], achter: c[1], ond: o }); });
      });
      return lijst;
    }
    var heeftUitleg = function () { return gekozen().some(function (o) { return o.uitleg || (o.woorden && o.woorden.length); }); };

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
      return kanSpreken ? '<button class="lm-say" data-act="say" data-t="' + esc(t) + '" aria-label="Uitspreken in het ' + esc(DOEL.naam) + '">🔊</button>' : '';
    };
    var kbd = function (k) { return '<span class="lm-kbd" aria-hidden="true">' + k + '</span>'; };

    /* ----- Schermen ----- */
    function seg(act, opts, val) {
      return '<div class="lm-seg" role="group">' + opts.map(function (o) {
        return '<button data-act="' + act + '" data-v="' + o[0] + '" aria-pressed="' + (String(val) === String(o[0])) + '">' + o[1] + '</button>';
      }).join('') + '</div>';
    }

    function schermStart() {
      var pool = vraagPool(), kaarten = kaartjes(), niets = !store.kies.length;
      var html = '<header class="lm-kop"><div class="lm-kop-rij"><h1>' + esc(cfg.titel) + '</h1>' +
        '<button class="lm-profiel" data-act="wie" title="Iemand anders? Wissel van naam">👤 ' + esc(naam) + '</button></div>' +
        (cfg.ondertitel ? '<p>' + esc(cfg.ondertitel) + '</p>' : '') + '</header>';

      if (store.fouten.length) {
        html += '<div class="lm-banner"><span>Je had ' + meervoud(store.fouten.length, 'fout', 'fouten') + ' in je vorige toets.</span>' +
          '<button class="lm-btn small" data-act="oefenfouten">Oefen ze nu</button></div>';
      }

      // Kolom 1: wat wil je leren?
      var kies = '';
      if (OND.length > 1) {
        var secs = OND.map(function (o) {
          var on = store.kies.indexOf(o.id) >= 0;
          var n = [];
          if (o.woorden && o.woorden.length) n.push(meervoud(o.woorden.length, 'woordje', 'woordjes'));
          if (o.kaartjes && o.kaartjes.length) n.push(meervoud(o.kaartjes.length, 'kaartje', 'kaartjes'));
          if (o.vragen && o.vragen.length) n.push(meervoud(o.vragen.length, 'vraag', 'vragen'));
          var sub = [o.sub, n.join(', ')].filter(Boolean).join(' · ');
          return '<button class="lm-sec" data-act="sec" data-id="' + esc(o.id) + '" aria-pressed="' + on + '">' +
            '<span class="lm-box" aria-hidden="true">' + (on ? '✓' : '') + '</span>' +
            '<span class="t"><b>' + esc(o.titel) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span>' +
            (o.woorden && o.woorden.length ? '<span class="lm-tag">' + richtingLabel(o.richting) + '</span>' : '') + '</button>';
        }).join('');
        var open = !(smal() && OND.length > 4);
        kies += '<details class="lm-kies"' + (open ? ' open' : '') + '><summary>Wat wil je leren? <small>' + store.kies.length + ' van ' + OND.length + '</small></summary>' +
          '<div class="lm-alles"><button data-act="alles">Alles kiezen</button><button data-act="niets">Niets</button></div>' +
          '<div class="lm-secs">' + secs + '</div>' +
          (heeftWoorden && OND.some(function (o) { return o.richting === 'herkennen'; })
            ? '<p class="lm-note">' + richtingLabel('beide') + ': beide kanten op kennen. ' + richtingLabel('herkennen') + ': alleen weten wat het ' + esc(DOEL.naam) + 'e woord betekent.</p>' : '') +
          '</details>';
      }
      if (heeftWoorden) {
        kies += '<span class="lm-label">Welke kant op?</span>' +
          seg('richting', [['boek', 'Zoals in het boek'], ['doel-nl', DOEL.kort + ' → ' + NL.kort], ['nl-doel', NL.kort + ' → ' + DOEL.kort]], store.richting);
      }
      if (heeftToepassen) {
        kies += '<span class="lm-label">Soort vragen</span>' +
          seg('soort', [['alles', 'Alle vragen'], ['toepassen', 'Alleen toepassen']], store.soort);
      }
      if (niets) kies += '<div class="lm-warn">Kies minstens één onderdeel.</div>';
      else if (!pool.length && !kaarten.length) kies += '<div class="lm-warn">Met deze keuze is er niets te oefenen. Kies meer onderdelen of een andere richting.</div>';

      // Kolom 2: de drie stappen
      var stappen = '<div class="lm-stappen">';
      stappen += '<article class="lm-stap"><h2><span class="lm-nr">1</span>Leren</h2>' +
        '<p>Lees de uitleg en leer met kaartjes: kijk, draai om en kijk of je het wist.</p>' +
        '<button class="lm-btn ghost" data-act="leren"' + (heeftUitleg() ? '' : ' disabled') + '>📖 ' + (heeftWoorden && !OND.some(function (o) { return o.uitleg; }) ? 'Woordenlijst' : 'Uitleg lezen') + '</button>' +
        '<button class="lm-btn" data-act="start" data-v="kaartjes"' + (kaarten.length ? '' : ' disabled') + '>🃏 Kaartjes (' + kaarten.length + ')</button></article>';
      stappen += '<article class="lm-stap"><h2><span class="lm-nr">2</span>Oefenen</h2>' +
        '<p>' + (heeftWoorden ? 'Typ het antwoord.' : 'Vragen met uitleg.') + ' Wat je fout doet, komt terug tot je het kent.</p>' +
        '<button class="lm-btn" data-act="start" data-v="oefenen"' + (pool.length ? '' : ' disabled') + '>✏️ Oefenen (' + pool.length + ')</button></article>';
      var keuzes = aantalKeuzes(pool.length), aantal = toetsAantal(pool.length);
      stappen += '<article class="lm-stap"><h2><span class="lm-nr">3</span>Toetsen</h2>' +
        '<p>Zonder hulp, net als op school. Je krijgt een cijfer van 1 tot 10.</p>' +
        '<span class="lm-label" style="margin:0">Aantal vragen</span>' + seg('aantal', keuzes, aantal) +
        '<button class="lm-btn" data-act="start" data-v="toets"' + (pool.length ? '' : ' disabled') + '>📝 Toets maken</button></article>';
      stappen += '</div>';

      var hist = store.hist.slice(0, 5).map(function (h) {
        return '<div class="lm-hrow"><span>' + new Date(h.d).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + meervoud(h.n, 'vraag', 'vragen') + '</span>' +
          '<b class="' + (h.g >= 5.5 ? 'ok' : 'no') + '">' + cijferTxt(h.g) + '</b></div>';
      }).join('');
      if (hist) stappen += '<h2 class="lm-h2">Laatste toetsen</h2><div class="lm-hist">' + hist + '</div>';

      app.classList.add('lm-breed');
      return html + '<div class="lm-start">' + (kies ? '<div class="lm-kies-kolom">' + kies + '</div>' : '') + '<div class="lm-stap-kolom">' + stappen + '</div></div>';
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

    function blokken(uitleg) {
      if (!uitleg) return '';
      if (typeof uitleg === 'string') return '<div class="lm-uitleg">' + uitleg + '</div>';
      return '<div class="lm-uitleg">' + uitleg.map(function (b) {
        return '<details class="lm-blok"' + (b.open ? ' open' : '') + '><summary>' + esc(b.kop) + '</summary><div class="body">' + b.html + '</div></details>';
      }).join('') + '</div>';
    }
    function schermLeren() {
      var html = topbalk(null, 'Uitleg');
      html += gekozen().map(function (o) {
        var lijst = '';
        if (o.woorden && o.woorden.length) {
          lijst = '<div class="lm-scroll"><table>' + o.woorden.map(function (w) {
            return '<tr><td class="lm-w">' + esc(w[1]) + '</td><td>' + esc(w[0]) + '</td><td class="lm-sp">' + sayBtn(w[1]) + '</td></tr>';
          }).join('') + '</table></div>';
        }
        return '<section class="lm-onderdeel"><h2>' + esc(o.titel) + (o.woorden && o.woorden.length ? ' <span class="lm-tag">' + richtingLabel(o.richting) + '</span>' : '') + '</h2>' +
          (o.sub ? '<div class="ref">' + esc(o.sub) + '</div>' : '') + '</section>' + blokken(o.uitleg) + lijst;
      }).join('');
      html += '<div class="lm-row"><button class="lm-btn" data-act="start" data-v="kaartjes"' + (kaartjes().length ? '' : ' disabled') + '>🃏 Verder met kaartjes</button>' +
        '<button class="lm-btn ghost" data-act="naarstart">Terug naar het begin</button></div>';
      return html;
    }

    function topbalk(pct, label) {
      return '<div class="lm-top"><button class="lm-btn ghost small" data-act="stop">' + (run ? 'Stoppen' : '← Terug') + '</button>' +
        (pct == null ? '<span class="lm-count" style="margin-left:auto">' + esc(label) + '</span>'
          : '<div class="lm-bar" aria-hidden="true"><i style="width:' + Math.round(pct * 100) + '%"></i></div><span class="lm-count">' + label + '</span>') + '</div>';
    }

    function richtingTekst(q) { return q.van === 'doel' ? DOEL.naam + ' → ' + NL.naam : NL.naam + ' → ' + DOEL.naam; }
    function kaartKop(q) {
      var rechts = q.ond && OND.length > 1 ? esc(q.ond.titel) : '';
      if (q.soort === 'woord') return '<div class="lm-dir"><span>' + richtingTekst(q) + '</span><span>' + rechts + '</span></div>';
      return '<div class="lm-dir"><span>' + (q.soort === 'kaart' ? 'Kaartje' : run.mode === 'toets' ? 'Toetsvraag' : 'Vraag') + '</span><span>' + rechts + '</span></div>';
    }

    function schermKaartjes() {
      var q = run.cur;
      var head = topbalk(run.done / run.total, run.done + ' / ' + run.total + ' gekend');
      var voor, achter;
      if (q.soort === 'woord') {
        voor = '<div class="lm-wordrow"><span class="lm-word">' + vraagTekst(q) + '</span>' + (run.flipped && q.van === 'doel' ? sayBtn(q.item.doel) : '') + '</div>';
        achter = '<div class="lm-answer lm-wordrow"><span class="lm-word">' + antwoordTekst(q) + '</span>' + (q.naar === 'doel' ? sayBtn(q.item.doel) : '') + '</div>';
      } else {
        voor = '<div class="lm-begrip">' + q.voor + '</div>';
        achter = '<div class="lm-achter">' + q.achter + '</div>';
      }
      if (!run.flipped) {
        return head + '<button class="lm-card" data-act="flip">' + kaartKop(q) + voor +
          '<div class="lm-hint">Weet je het? ' + (aanraak() ? 'Tik' : 'Klik') + ' om het antwoord te zien.' + kbd('spatie') + '</div></button>';
      }
      return head + '<div class="lm-card">' + kaartKop(q) + voor + achter + '</div>' +
        '<div class="lm-row"><button class="lm-btn bad" data-act="nope">Nog niet' + kbd('←') + '</button><button class="lm-btn good" data-act="know">Ken ik' + kbd('→') + '</button></div>';
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
      var pct = toets ? run.log.length / run.total : run.done / run.total;
      var head = topbalk(pct, toets ? 'Vraag ' + (run.log.length + 1) + ' van ' + run.total : run.done + ' / ' + run.total + ' gekend');
      var laatste = toets && run.queue.length === 0;
      var verder = toets ? (laatste ? 'Toets inleveren' : 'Volgende vraag') : 'Volgende';
      var kaart = '<div class="lm-card">' + kaartKop(q) +
        (q.soort === 'woord'
          ? '<div class="lm-wordrow"><span class="lm-word">' + vraagTekst(q) + '</span>' + (q.van === 'doel' ? sayBtn(q.item.doel) : '') + '</div>'
          : '<div class="lm-vraag">' + vraagTekst(q) + '</div>') + '</div>';
      var html = head + kaart, bottom = '';

      if (q.soort === 'mc') {
        var volgorde = opties(q);
        html += '<div class="lm-opts" role="group" aria-label="Antwoorden">' + volgorde.map(function (i, n) {
          var cls = '', pressed = '';
          if (!toets && run.answered) cls = i === q.v.antwoord ? ' right' : i === run.keuze ? ' wrong' : '';
          if (toets) pressed = ' aria-pressed="' + (run.keuze === i) + '"';
          return '<button class="lm-opt' + cls + '" data-act="kies" data-v="' + i + '"' + pressed + (!toets && run.answered ? ' disabled' : '') + '>' +
            '<span class="k" aria-hidden="true">' + (n + 1) + '</span><span>' + q.v.opties[i] + '</span></button>';
        }).join('') + '</div>';
        if (toets) {
          bottom = '<div class="lm-row"><button class="lm-btn ghost" data-act="skip">Weet ik niet</button>' +
            '<button class="lm-btn" data-act="volgende"' + (run.keuze == null ? ' disabled' : '') + '>' + verder + kbd('Enter') + '</button></div>';
        } else if (run.answered) {
          bottom = feedback(q) + '<div class="lm-row"><button class="lm-btn" data-act="next">' + verder + kbd('Enter') + '</button></div>';
        }
        return html + bottom;
      }

      if (q.soort === 'open') {
        html += '<textarea id="ans" class="lm-ans" placeholder="Typ hier je antwoord…" aria-label="Jouw antwoord"' + (run.model ? ' disabled' : '') + '>' + esc(run.given) + '</textarea>';
        if (!run.model) {
          bottom = '<div class="lm-row"><button class="lm-btn" data-act="model">Bekijk het goede antwoord</button></div>';
        } else {
          bottom = '<div class="lm-model" role="status"><b>Goed antwoord</b>' + q.v.model + '</div>' +
            '<p style="margin:14px 0 0;font-weight:800">Hoe ging het? Wees eerlijk.</p>' +
            '<div class="lm-row"><button class="lm-btn bad" data-act="zelf" data-v="0">Fout</button>' +
            '<button class="lm-btn half" data-act="zelf" data-v="0.5">Half goed</button>' +
            '<button class="lm-btn good" data-act="zelf" data-v="1">Goed</button></div>';
        }
        return html + bottom;
      }

      // typ (woord of typvraag)
      var naarTaal = q.soort === 'woord' ? (q.naar === 'doel' ? DOEL : NL) : (q.v.taal ? (typeof q.v.taal === 'object' ? q.v.taal : TALEN[q.v.taal]) : null);
      var ph = q.soort === 'woord' ? 'Typ het ' + naarTaal.naam + 'e woord' : 'Typ je antwoord';
      var accenten = naarTaal && naarTaal.accenten && naarTaal.accenten.length && !run.answered
        ? '<div class="lm-accents" aria-label="Letters met accent">' + naarTaal.accenten.map(function (c) { return '<button data-act="acc" data-v="' + c + '" tabindex="-1">' + c + '</button>'; }).join('') + '</div>' : '';
      html += '<input id="ans" class="lm-ans" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"' +
        ' placeholder="' + ph + '" value="' + esc(run.given) + '"' + (run.answered ? ' disabled' : '') + ' aria-label="' + ph + '">' + accenten;
      if (toets) {
        bottom = '<div class="lm-row"><button class="lm-btn ghost" data-act="skip">Weet ik niet</button><button class="lm-btn" data-act="submit">' + verder + kbd('Enter') + '</button></div>';
      } else if (!run.answered) {
        bottom = '<div class="lm-row"><button class="lm-btn ghost" data-act="skip">Weet ik niet</button><button class="lm-btn" data-act="submit">Controleer' + kbd('Enter') + '</button></div>';
      } else {
        bottom = feedback(q) + '<div class="lm-row"><button class="lm-btn" data-act="next">Volgende' + kbd('Enter') + '</button></div>';
      }
      return html + bottom;
    }

    function feedback(q) {
      var r = run.res;
      var cls = r.score === 1 ? 'good' : r.score > 0 ? 'half' : 'bad';
      var msg = r.score === 1 ? 'Goed zo!' : r.score > 0 ? r.note : (run.given.trim() || run.keuze != null ? 'Helaas, niet goed.' : 'Dit is het antwoord:');
      var toonAntwoord = q.soort === 'mc' ? false : (r.score < 1 || (q.soort === 'woord' && q.naar === 'doel'));
      var antwoord = toonAntwoord ? '<span class="correct"><span>' + antwoordTekst(q) + '</span>' + (q.soort === 'woord' && q.naar === 'doel' ? sayBtn(q.item.doel) : '') + '</span>' : '';
      var uitleg = q.v && q.v.uitleg ? '<span class="uitleg">' + q.v.uitleg + '</span>' : '';
      var nog = r.score < 1 ? '<span class="uitleg">Deze vraag komt straks nog een keer terug.</span>' : '';
      return '<div class="lm-fb ' + cls + '" role="status">' + esc(msg) + antwoord + uitleg + nog + '</div>';
    }

    function schermKlaar() {
      var lastig = Object.keys(run.wrong).map(function (k) { return run.wrong[k]; });
      var lijst = lastig.map(function (q) {
        return '<div class="lm-li"><span class="lm-mark half">!</span><span class="q">' + vraagTekst(q) + '</span><span class="c">' + antwoordTekst(q) + '</span></div>';
      }).join('');
      var kaart = run.mode === 'kaartjes';
      return '<header class="lm-kop"><h1>Klaar!</h1><p>Je kent nu alle ' + run.total + ' ' + (kaart ? 'kaartjes' : 'vragen') + ' van deze ronde.</p></header>' +
        (lastig.length ? '<h2 class="lm-h2">Deze vond je lastig</h2><div class="lm-list">' + lijst + '</div>' : '<p>Alles in één keer goed. Knap gedaan!</p>') +
        '<div class="lm-row" style="margin-top:28px">' +
        (lastig.length && !kaart ? '<button class="lm-btn" data-act="retry">Lastige vragen nog eens</button>' : '') +
        (lastig.length && kaart ? '<button class="lm-btn" data-act="retrykaart">Lastige kaartjes nog eens</button>' : '') +
        (kaart && vraagPool().length ? '<button class="lm-btn" data-act="start" data-v="oefenen">Ga oefenen</button>' : '') +
        (!kaart ? '<button class="lm-btn ghost" data-act="start" data-v="toets">Maak nu de toets</button>' : '') +
        '<button class="lm-btn ghost" data-act="naarstart">Naar het begin</button></div>';
    }

    function schermUitslag() {
      var g = run.grade, n = run.log.length;
      var verdict = g >= 9 ? (cfg.teksten && cfg.teksten.top || 'Uitstekend gedaan!') : g >= 7.5 ? 'Goed gedaan!' : g >= 5.5 ? 'Voldoende. Oefen de fouten nog even.' : 'Nog niet voldoende. Oefen je fouten en probeer het opnieuw.';
      var rows = run.log.slice().sort(function (a, b) { return a.res.score - b.res.score; }).map(function (l) {
        var q = l.q, s = l.res.score, cls = s === 1 ? 'ok' : s > 0 ? 'half' : 'no', mk = s === 1 ? '✓' : s > 0 ? '½' : '✗';
        var gegeven = q.soort === 'mc' ? (l.keuze != null ? q.v.opties[l.keuze] : '') : esc(l.given.trim());
        var g2 = gegeven ? gegeven : '<i>niets ingevuld</i>';
        if (q.soort === 'open') g2 = l.given.trim() ? esc(l.given) + ' <i>(zelf nagekeken)</i>' : '<i>niets ingevuld</i>';
        return '<div class="lm-li"><span class="lm-mark ' + cls + '">' + mk + '</span><span class="q">' + vraagTekst(q) + '</span>' +
          (s === 1 ? '<span class="g">' + g2 + '</span>'
            : '<span class="g">Jij: ' + (s === 0 && gegeven ? '<s>' + g2 + '</s>' : g2) + (l.res.note ? ' (' + esc(l.res.note.replace('Bijna goed: ', '')) + ')' : '') + '</span><span class="c">' + antwoordTekst(q) + '</span>') + '</div>';
      }).join('');
      var fout = Object.keys(run.wrong).length;
      return '<div class="lm-grade"><svg viewBox="0 0 200 160" aria-hidden="true"><path d="M150,26 C112,4 42,14 22,54 C4,94 44,140 102,142 C162,144 188,102 174,62 C164,34 132,20 92,24" fill="none" stroke-width="4" stroke-linecap="round"/></svg>' +
        '<span>' + cijferTxt(g) + '</span></div>' +
        '<p class="lm-verdict">' + esc(verdict) + '</p>' +
        '<p class="lm-stats">' + komma(run.score) + ' van de ' + n + ' punten goed.' + (heeftWoorden ? ' Halve punten voor een foutje in een accent of lidwoord.' : '') + '</p>' +
        '<div class="lm-row" style="margin-top:24px">' +
        (fout ? '<button class="lm-btn" data-act="retry">Oefen mijn fouten (' + fout + ')</button>' : '') +
        '<button class="lm-btn ghost" data-act="start" data-v="toets">Nieuwe toets</button>' +
        '<button class="lm-btn ghost" data-act="naarstart">Naar het begin</button></div>' +
        '<h2 class="lm-h2">Alle antwoorden</h2><div class="lm-list">' + rows + '</div>';
    }

    /* ----- Verloop ----- */
    function schermWie() {
      var namen = Profiel.namen();
      return '<header class="lm-kop"><h1>' + esc(cfg.titel) + '</h1></header>' +
        '<section class="lm-wie"><h2>👋 Wie ben jij?</h2>' +
        (namen.length ? '<p>Tik op je naam:</p><div class="lm-namen">' + namen.map(function (n) {
          return '<button class="lm-btn ghost" data-act="naam" data-v="' + esc(n) + '">' + (n === naam ? '✓ ' : '') + esc(n) + '</button>';
        }).join('') + '</div><p>Of typ een nieuwe naam:</p>' : '<p>Typ je voornaam. Dan worden jouw oefeningen en cijfers apart bewaard.</p>') +
        '<form class="lm-naamform" data-act-form="naam"><input id="lm-naam" class="lm-ans" maxlength="20" autocomplete="given-name" placeholder="Je voornaam" aria-label="Je voornaam">' +
        '<button class="lm-btn" type="submit">Start</button></form>' +
        '<p class="lm-note">🔒 Je naam en je resultaten blijven alleen op dit apparaat. Niemand anders kan ze zien.</p>' +
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

    function render() {
      if (scherm !== 'start') app.classList.remove('lm-breed');
      if (!naam || scherm === 'wie') { app.classList.remove('lm-breed'); app.innerHTML = schermWie(); var ni = document.getElementById('lm-naam'); if (ni && !aanraak() && !Profiel.namen().length) ni.focus(); return; }
      app.innerHTML = scherm === 'start' ? schermStart() : scherm === 'leren' ? schermLeren()
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
    function bezigMetToets() { return run && run.mode === 'toets' && (scherm === 'vraag') && run.log.length > 0; }
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
    // Voor de "← Terug naar overzicht"-knop van de site: hoeveel stappen terug is het overzicht?
    window.huiswerkTerugStappen = function () { return location.hash && history.state && history.state.lm ? 2 : 1; };

    function begin(mode, lijst) {
      var qs;
      if (mode === 'kaartjes') qs = lijst ? lijst.slice() : kaartjes();
      else qs = lijst ? lijst.slice() : vraagPool();
      if (!qs.length) return;
      shuffle(qs);
      var n = toetsAantal(qs.length);
      if (mode === 'toets' && !lijst && n !== 'alle') qs = qs.slice(0, +n);
      run = { mode: mode, queue: qs, total: qs.length, done: 0, cur: null, flipped: false, answered: false, res: null, given: '', keuze: null, model: false, wrong: {}, log: [], score: 0 };
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
    function afronden() {
      if (run.mode === 'toets') {
        var n = run.log.length;
        run.score = run.log.reduce(function (a, l) { return a + l.res.score; }, 0);
        run.grade = Math.max(1, Math.min(10, Math.round((1 + 9 * run.score / n) * 10) / 10));
        store.hist.unshift({ d: Date.now(), g: run.grade, n: n });
        store.hist = store.hist.slice(0, 20);
        store.fouten = Object.keys(run.wrong);
        save();
        ga('uitslag');
      } else {
        if (run.mode === 'oefenen' && run.vanFouten) { store.fouten = []; save(); }
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
        return volgende();
      }
      run.res = res; run.given = given || ''; run.keuze = keuze; run.answered = true;
      if (res.score === 1) run.done++; else terugInRij(q);
      render();
      var nb = app.querySelector('[data-act="next"]'); if (nb) nb.focus({ preventScroll: true });
    }
    function zelfBeoordeeld(score) {
      var q = run.cur, res = { score: score };
      if (run.mode === 'toets') {
        run.log.push({ q: q, given: run.given, res: res });
        if (score < 1) run.wrong[q.key] = q;
      } else if (score === 1) run.done++;
      else terugInRij(q);
      volgende();
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
      begin('oefenen', lijst); run.vanFouten = true;
    }

    /* ----- Invoer ----- */
    document.addEventListener('mousedown', function (e) { if (e.target.closest('.lm-accents button')) e.preventDefault(); });
    app.addEventListener('input', function (e) { if (e.target.id === 'ans' && run) run.given = e.target.value; });
    app.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
      var a = b.dataset.act, v = b.dataset.v;
      if (a === 'say') { e.stopPropagation(); spreek(b.dataset.t, DOEL.code); return; }
      if (a === 'wie') { scherm = 'wie'; render(); window.scrollTo(0, 0); return; }
      if (a === 'naam') { kiesNaam(v); return; }
      if (a === 'sec') {
        var id = b.dataset.id;
        store.kies = store.kies.indexOf(id) >= 0 ? store.kies.filter(function (x) { return x !== id; }) : store.kies.concat(id);
        store.kies = OND.map(function (o) { return o.id; }).filter(function (x) { return store.kies.indexOf(x) >= 0; });
        save(); render();
      }
      else if (a === 'alles') { store.kies = OND.map(function (o) { return o.id; }); save(); render(); }
      else if (a === 'niets') { store.kies = []; save(); render(); }
      else if (a === 'richting' || a === 'soort' || a === 'aantal') { store[a] = v; save(); render(); }
      else if (a === 'leren') ga('leren');
      else if (a === 'start') begin(v);
      else if (a === 'stop') stoppen();
      else if (a === 'naarstart') naarStart();
      else if (a === 'oefenfouten') oefenFouten(store.fouten);
      else if (a === 'flip') { run.flipped = true; render(); var k = app.querySelector('[data-act="know"]'); if (k && !aanraak()) k.focus({ preventScroll: true }); }
      else if (a === 'know') { run.done++; volgende(); }
      else if (a === 'nope') { terugInRij(run.cur); volgende(); }
      else if (a === 'kies') {
        var i = +v;
        if (run.mode === 'toets') { run.keuze = i; render(); var nx = app.querySelector('[data-act="volgende"]'); if (nx && !aanraak()) nx.focus({ preventScroll: true }); }
        else if (!run.answered) beantwoord(null, i);
      }
      else if (a === 'volgende') beantwoord(null, run.keuze);
      else if (a === 'submit') verstuur();
      else if (a === 'skip') beantwoord('', null);
      else if (a === 'next') volgende();
      else if (a === 'acc') accent(v);
      else if (a === 'model') { var t = document.getElementById('ans'); run.given = t ? t.value : ''; run.model = true; render(); }
      else if (a === 'zelf') zelfBeoordeeld(+v);
      else if (a === 'retry') begin('oefenen', Object.keys(run.wrong).map(function (k) { return run.wrong[k]; }));
      else if (a === 'retrykaart') begin('kaartjes', Object.keys(run.wrong).map(function (k) { return run.wrong[k]; }));
    });
    document.addEventListener('keydown', function (e) {
      if (!run || e.altKey || e.metaKey && e.key !== 'Enter' || e.ctrlKey && e.key !== 'Enter') return;
      var t = e.target, inInput = t && t.tagName === 'INPUT', inArea = t && t.tagName === 'TEXTAREA';
      if (t && t.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return; // knop doet het zelf
      if (scherm === 'kaartjes') {
        if (!run.flipped && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); run.flipped = true; render(); }
        else if (run.flipped && (e.key === 'ArrowRight' || e.key === 'k')) { e.preventDefault(); run.done++; volgende(); }
        else if (run.flipped && (e.key === 'ArrowLeft' || e.key === 'n')) { e.preventDefault(); terugInRij(run.cur); volgende(); }
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
      if (q.soort === 'mc' && !inInput && /^[1-9]$/.test(e.key)) {
        var idx = opties(q)[+e.key - 1];
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
