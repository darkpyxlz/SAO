/* Firmament UI: start screen, HUD, panels, corporation, codex, quests, Sky School, redraw mode, saves and the main loop. */
(function () {
  'use strict';
  const SKY = window.SKY;
  const G = Engine.create(SKY);
  const $ = s => document.querySelector(s);
  const canvas = $('#sky');
  const AUTOSAVE = 'firmament.autosave.v1';
  const SLOT = n => 'firmament.slot' + n + '.v1';

  const ui = { lastReady: 0, lastTech: null, sel: null, redraw: null, hint: false, flashes: [], frontier: new Set(), takeover: new Set(), borders: true, skyLayer: true, started: false, modal: null, tab: null, filter: {}, lastLog: 0, held: new Map(), fast: false };
  try { ui.borders = localStorage.getItem('firmament.borders') !== '0'; } catch (e) { /* no storage: borders stay on */ }
  try { ui.skyLayer = localStorage.getItem('firmament.skylayer') !== '0'; } catch (e) { /* no storage: the layer stays on */ }
  { const bb = document.querySelector('#borders-btn'); if (bb) bb.classList.toggle('off', !ui.borders); const sb = document.querySelector('#sky-btn'); if (sb) sb.classList.toggle('off', !ui.skyLayer); }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => G.fmt(n);
  const money = n => '$' + fmt(n);
  const rp = n => '◉ ' + fmt(n);
  const fint = n => (n >= 1e4 ? fmt(n) : String(Math.floor(n)));
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
  function dur(sec) {
    sec = Math.max(0, Math.round(sec));
    if (sec < 60) return sec + 's';
    if (sec < 3600) return Math.floor(sec / 60) + 'm ' + String(sec % 60).padStart(2, '0') + 's';
    if (sec < 86400) return Math.floor(sec / 3600) + 'h ' + String(Math.floor(sec % 3600 / 60)).padStart(2, '0') + 'm';
    return Math.floor(sec / 86400) + 'd ' + Math.floor(sec % 86400 / 3600) + 'h';
  }
  const dstr = ts => new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const tstr = ts => new Date(ts).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const rgbOf = i => 'rgb(' + Sky.bvRGB(SKY.stars[i][4]).join(',') + ')';
  const CL = Engine.CLASS_NAMES;
  const KIND_NAMES = { globular: 'Globular clusters', open: 'Open clusters', nebula: 'Nebulae', galaxy: 'Galaxies', other: 'Other' };
  const KIND_ICON = { globular: '⊕', open: '⁘', nebula: '▣', galaxy: '◯', other: '◇' };
  const ticker = name => (String(name).split(/\s+/).filter(w => /^[A-Za-zͰ-Ͽ]/.test(w)).map(w => w[0]).join('').toUpperCase() || 'FRM').slice(0, 4);
  const bico = def => '<span class="bico" style="--c:' + def.color + '" title="' + esc(def.name) + '">' + def.short + '</span>';
  // key badges next to buttons ("Collect revenue [R]"); hidden on touch screens
  const kb = k => '<kbd class="k k-only">' + k + '</kbd>';
  const keyLabel = n => (n >= 0 && n < 10 ? String((n + 1) % 10) : ''); // list row n (0-based) -> its number key: 1..9 then 0
  const kbRow = n => (keyLabel(n) ? kb(keyLabel(n)) : '');

  const QZ = Quiz.create(G);
  const QU = Quests.create(G);
  const sky = Sky.create(canvas, G, {
    onClick: (x, y) => handleMapClick(x, y),
    onHover: (x, y) => handleHover(x, y),
  });

  // ---------------------------------------------------------------- toasts
  function toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
    setTimeout(() => el.remove(), 4300);
  }

  // ---------------------------------------------------------------- saving
  function summary(state) {
    const n = Object.keys(state.stars).length, m = Object.keys(state.messier).length;
    const dev = Object.keys(state.devConst).length;
    const name = state.corp && state.corp.name ? state.corp.name + ' · ' : '';
    return name + n + ' colonies · ' + m + ' Messier · ' + dev + ' developed · ' + tstr(state.saved);
  }
  function writeKey(key) {
    try { localStorage.setItem(key, G.serialize()); return true; } catch (e) { return false; }
  }
  function autosave() { if (ui.started) { if (!writeKey(AUTOSAVE)) flagSaveError(); } }
  let saveErrShown = false;
  function flagSaveError() { if (!saveErrShown) { saveErrShown = true; toast('Could not save in this browser. Use Menu → Export to keep a backup.', 'bad'); } }
  function readKey(key) {
    try { const t = localStorage.getItem(key); return t ? JSON.parse(t) : null; } catch (e) { return null; }
  }
  function beginSession(state, isNew) {
    if (!isNew) {
      try { G.load(state); } catch (e) { toast('That save could not be loaded.', 'bad'); return; }
      const before = snapshot();
      const away = Math.max(0, (Date.now() - state.saved) / 1000);
      G.catchUp(away);
      if (away > 60) welcomeBack(away, before);
    }
    ui.started = true; ui.lastLog = G.state.log.length; ui.lastReady = QU.readyCount(); ui.sel = null; ui.redraw = null;
    $('#start').hidden = true;
    ['#hud', '#zoomctl'].forEach(s => $(s).hidden = false);
    $('#attn').hidden = false;
    const h = SKY.stars[G.state.home];
    updateFocus();
    sky.setView(h[1], h[2], 2.2, isNew); // a new game opens the HQ panel straight away, so keep HQ clear of it
    if (isNew) showIntro();
    autosave();
  }
  function snapshot() { const S = G.state; return { stars: Object.keys(S.stars).length, messier: Object.keys(S.messier).length, cash: S.cash, techs: G.techCount() }; }
  function welcomeBack(away, before) {
    const after = snapshot(), full = G.attention().length;
    const parts = [];
    if (after.stars > before.stars) parts.push('+' + (after.stars - before.stars) + ' colonies');
    if (after.messier > before.messier) parts.push('+' + (after.messier - before.messier) + ' Messier objects');
    if (after.techs > before.techs) parts.push(after.techs - before.techs + ' research project' + (after.techs - before.techs === 1 ? '' : 's') + ' done');
    if (full) parts.push(full + ' colonies with revenue to collect');
    toast('Welcome back, CEO! Away ' + dur(away) + (parts.length ? ': ' + parts.join(', ') : '.'), 'gold');
  }
  function download(name, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function importFile(file, then) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const st = JSON.parse(r.result);
        if (!st || !(st.version >= 1 && st.version <= Engine.SAVE_VERSION) || !st.stars) throw new Error('bad');
        then(st);
      } catch (e) { toast('That file is not a Firmament save.', 'bad'); }
    };
    r.readAsText(file);
  }

  // ---------------------------------------------------------------- start screen
  const HOMES = [
    ['Sirius', 'The brightest star in the night sky. Rich neighbours in Orion, Taurus and Gemini.'],
    ['Polaris', 'The North Star: the still point. The northern sky stretches out around it.'],
    ['Vega', 'Jewel of Lyra, and a short flight to the Summer Triangle.'],
    ['Acrux', 'Foot of the Southern Cross: a bright, crowded start deep in the south.'],
    ['Capella', 'A golden binary in Auriga, close to the winter hexagon.'],
    ['Arcturus', 'The orange giant of Boötes, a spring-sky shepherd.'],
    ['Rigel', 'Blue supergiant at Orion’s foot: right next to the Hunter.'],
    ['Canopus', 'The southern navigator’s star, deep in Carina.'],
  ];
  const START_NAMES = ['Meridian Expeditions', 'Aurora Holdings', 'Polaris Ventures', 'Zenith Aerospace', 'Nova Industries', 'Horizon Stellar Ltd', 'Apogee Frontier Co.'];
  function showStart() {
    const el = $('#start'); el.hidden = false;
    const auto = readKey(AUTOSAVE);
    let h = '<div class="inner"><h1>Firmament</h1><p class="tag">Found a space corporation and colonise the whole night sky. Colony ships cross the real constellations, colonies earn cash, human technology from the telescope to the warp drive unlocks new buildings, and every constellation and Messier object you complete is catalogued for good.</p>';
    if (auto) {
      h += '<div class="slot" style="max-width:600px"><div class="grow"><b>Continue your corporation</b><div class="muted tiny">' + esc(summary(auto)) + '</div></div><button class="btn primary" data-act="continue">Continue' + kb('Enter') + '</button></div><p></p>';
    }
    h += '<h3>' + (auto ? 'Or found a new company' : 'Found your company') + '</h3>';
    h += '<div class="row" style="max-width:420px"><label class="muted" for="corp-input">Company name</label><input id="corp-input" class="txt grow" maxlength="32" value="' + esc(START_NAMES[Math.floor(Math.random() * START_NAMES.length)]) + '"></div>';
    h += '<p class="muted" style="margin-bottom:4px">Choose the star for your headquarters:</p><div class="homes">';
    for (const [name, txt] of HOMES) {
      const i = G.nameIdx.get(name); if (i === undefined) continue;
      const st = SKY.stars[i];
      h += '<button class="home" data-act="newgame" data-i="' + i + '"><b><span class="dot" style="background:' + rgbOf(i) + '"></span>' + esc(name) + '</b> <span class="muted tiny">' + esc(SKY.consts[st[5]].name) + ' · mag ' + st[3].toFixed(2) + '</span><small>' + esc(txt) + '</small></button>';
    }
    h += '</div><p><label class="btn small">Import a save file<input type="file" accept=".json,application/json" id="imp-start" hidden></label></p>';
    h += '<ul class="how"><li>Every colony earns <b class="gold">cash</b>, which waits in storage until you collect it. Research the Telegraph and its successors to bank most of it automatically.</li><li>The 20 named stars are your <b class="gold">flagships</b>: nearby colonies remit royalties to them, and they never bank themselves, so you keep coming back.</li><li>Spend cash on colony ships to expand along constellation lines and hyperlanes. The map wraps in both directions.</li><li>Research technology (<b class="cyan">◉ research points</b>) to unlock real-world-inspired buildings: telescopes, launch pads, fusion plants, Dyson swarms.</li><li>Neighbouring colonies of different colours boost each other through trade routes. Every star’s spectral class and brightness give it a bonus.</li><li>Comets and novae cut routes. Redraw them from memory for a bonus.</li><li>Your progress saves in this browser. Menu → Export keeps a backup.</li><li class="k-only">On a keyboard? Space expands, C opens the codex, and ? lists every shortcut.</li></ul></div>';
    el.innerHTML = h;
    const imp = $('#imp-start');
    if (imp) imp.onchange = e => { if (e.target.files[0]) importFile(e.target.files[0], st => beginSession(st, false)); };
  }
  function showIntro() {
    toast('Welcome, CEO. Your HQ is already earning: tap it to collect revenue, then colonise a neighbouring star.' + (matchMedia('(hover: hover) and (pointer: fine)').matches ? ' Press ? for keyboard shortcuts.' : ''), 'gold');
    ui.sel = { type: 'star', i: G.state.home };
  }

  // ---------------------------------------------------------------- map interaction
  function handleMapClick(x, y) {
    if (!ui.started) return;
    const hit = sky.pick(x, y, matchMedia('(pointer:coarse)').matches, !!ui.redraw);
    if (ui.redraw) { redrawClick(hit); return; }
    if (!hit) { ui.sel = null; return; }
    ui.sel = hit;
  }
  function handleHover(x, y) {
    if (!ui.started || matchMedia('(pointer:coarse)').matches) return;
    const hit = sky.pick(x, y, false, !!ui.redraw);
    canvas.classList.toggle('pointing', !!hit);
    const tip = $('#tooltip');
    if (!hit) { tip.hidden = true; return; }
    const S = G.state;
    let t;
    if (hit.type === 'star') {
      const st = SKY.stars[hit.i];
      t = st[6] + ' · ' + SKY.consts[st[5]].id + ' · mag ' + st[3].toFixed(1) + (S.stars[hit.i] ? '' : ' · not colonised');
    } else if (hit.type === 'shower') {
      const sh = G.YearSky.SHOWERS[hit.i];
      t = '☄ ' + sh.name + ' · radiant in ' + sh.con + ' · ' + showerWhen(sh);
    } else {
      const m = SKY.messier[hit.i];
      t = 'M' + m.n + (S.messier[hit.i] && m.alt ? ' · ' + m.alt : '') + ' · ' + m.tname;
    }
    tip.textContent = t; tip.hidden = false;
    tip.style.left = Math.min(innerWidth - 260, x + 14) + 'px'; tip.style.top = (y + 14) + 'px';
  }

  // ---------------------------------------------------------------- redraw mode
  function startRedraw(id) {
    const ev = G.state.events.find(e => e.id === id); if (!ev) return;
    ui.redraw = { id, from: null }; ui.hint = false; ui.sel = null; closeModal();
    const c = SKY.stars[ev.center];
    sky.goTo(c[1], c[2], 3.4);
  }
  function stopRedraw() { ui.redraw = null; ui.hint = false; }
  function redrawClick(hit) {
    const R = ui.redraw;
    if (!hit || hit.type !== 'star') { R.from = null; return; }
    if (R.from === null) { R.from = hit.i; return; }
    if (R.from === hit.i) { R.from = null; return; }
    const a = R.from, b = hit.i; R.from = null;
    const r = G.redraw(R.id, a, b);
    ui.flashes.push({ a, b, ok: r.ok, t: performance.now() });
    if (r.ok) {
      toast(r.done ? (r.perfect ? 'Perfect redraw! +' + money(r.gain + r.bonus) : 'All routes restored! +' + money(r.gain)) : 'Route restored  +' + money(r.gain), 'good');
    } else toast(r.msg, 'bad');
    if (!G.state.events.find(e => e.id === R.id)) stopRedraw();
  }

  // spaced-repetition progress: 'learned' or k/10 reviews done
  function learnBadge(cat, id) {
    if (QZ.learned(cat, id)) return '<span class="badge cyan">learned</span>';
    const b = QZ.boxOf(cat, id);
    return b > 0 ? '<span class="badge" title="Spaced reviews completed">' + b + '/' + QZ.LEARN_BOX + '</span>' : '';
  }
  // ---------------------------------------------------------------- pictures and figures
  function drawVisuals(root) {
    root.querySelectorAll('canvas[data-vis]').forEach(cv => {
      const raw = cv.dataset.vis, k = raw.indexOf(':'), t = raw.slice(0, k), rest = raw.slice(k + 1), [a, b] = rest.split(':');
      if (t === 'fig') Figs.draw(cv, rest, { labels: cv.dataset.labels === '1' }); // Olympiad Academy diagrams
      else if (t === 'figure') Sky.drawChart(cv, G, +a, { big: true, quiz: true });
      else if (t === 'marked') Sky.drawChart(cv, G, +a, { big: true, quiz: true, mark: +b });
      else if (t === 'messier') Pics.draw(cv, SKY.messier[+a]);
    });
  }

  // ---------------------------------------------------------------- star and Messier panels
  let lastPanelHtml = '';
  const PERK_TXT = (k, v) => G.PERK_LABEL[k](v);
  const rateText = r => money(r * 3600) + '/h';

  function routeRows(i) {
    const S = G.state, D = G.d;
    let h = '';
    for (const { to, e } of G.adj[i]) {
      const cl = !!S.stars[to], lane = SKY.edges[e][2] < 0;
      const dis = D.dis[e];
      const comp = G.cls[i] !== G.cls[to];
      const tag = dis ? '<span class="badge red">cut</span>' : cl && S.stars[i] ? '<span class="badge ' + (comp ? 'green' : '') + '">' + (comp ? '+complementary' : '+same colour') + '</span>' : '';
      const both = cl && S.stars[i], rl = G.routeLevel(e);
      let up = '';
      if (both && !dis) {
        const cost = G.routeUpgradeCost(e);
        up = cost === null ? '<span class="badge gold">max</span>' : '<button class="btn small" title="Stronger trade bonus and faster ships on this route" data-act="upgrade-route" data-e="' + e + '"' + (S.cash >= cost ? '' : ' disabled') + '>' + money(cost) + '</button>';
      }
      const pips = both ? ' <span class="pips" title="Route level">' + [0, 1, 2].map(k => '<i class="' + (k < rl ? 'on' : '') + '"></i>').join('') + '</span>' : '';
      h += '<div class="row tiny"><span class="grow"><span class="dot" style="background:' + rgbOf(to) + '"></span><span class="link" data-act="sel-star" data-i="' + to + '">' + esc(SKY.stars[to][6]) + '</span> <span class="muted">' + G.edgeLen[e].toFixed(1) + '°' + (lane ? ' hyperlane' : '') + '</span>' + pips + '</span>' + (cl ? '' : '<span class="muted">○</span>') + tag + up + '</div>';
    }
    return h;
  }
  function petitionText(p) {
    if (p.type === 'upgrade') return 'Raise ' + G.TRACK_INFO[p.track].name + ' to level ' + p.level;
    if (p.type === 'expand') return 'Colonise a neighbouring star';
    return 'Collect storage that is at least ' + Math.round(p.fraction * 100) + '% full';
  }
  function buildingSection(i) {
    const S = G.state, list = G.buildingsAt(i), slots = G.slotsAt(i);
    const rowNo = new Map(); G.buildOptions(i).forEach((r, k) => rowNo.set(r.kind + ':' + r.id, k)); // the number keys act on these rows
    let h = '<div class="p-sec"><h4>Buildings <span class="muted">· ' + list.length + ' / ' + slots + ' slots</span></h4>';
    if (!slots) h += '<div class="muted tiny">Develop this colony to 3 levels to open its first building slot. Every further 3 levels opens another (the rings around the star).</div>';
    for (const b of list) {
      const def = G.BUILDINGS[b.id], sum = G.buildingSummary(i, b.id), c = G.buildingCost(i, b.id), chk = c ? G.canBuild(i, b.id) : null;
      h += '<div class="bld"><div class="row">' + bico(def) + '<b class="grow">' + esc(def.name) + '</b><span class="badge">Lv ' + b.lvl + ' / ' + G.BUILDING_MAX + '</span></div>';
      h += '<div class="tiny">' + esc(sum.text) + (sum.regional ? ' <span class="muted">(reaches ' + sum.covered + ' colon' + (sum.covered === 1 ? 'y' : 'ies') + ' now)</span>' : '') + '</div>';
      h += '<div class="row tiny">' + (c ? '<span class="gold">' + money(c.cash) + '</span>' + (c.research ? '<span class="cyan">' + rp(c.research) + '</span>' : '') + '<span class="grow"></span><button class="btn small primary" data-act="build" data-i="' + i + '" data-id="' + b.id + '"' + (chk.ok ? '' : ' disabled') + '>Upgrade to Lv ' + c.next + kbRow(rowNo.get('upgrade:' + b.id)) + '</button>' : '<span class="grow muted">Fully built</span>') + '<button class="btn small ghost" title="Demolish for a 50% refund" data-act="demolish" data-i="' + i + '" data-id="' + b.id + '">✕</button></div>';
      if (c && !chk.ok) h += '<div class="muted tiny">' + esc(chk.msg) + '</div>';
      h += '</div>';
    }
    const avail = Object.keys(G.BUILDINGS).filter(id => !G.buildingAt(i, id) && S.tech.done[G.BUILDINGS[id].tech]);
    const locked = Object.keys(G.BUILDINGS).filter(id => !G.buildingAt(i, id) && !S.tech.done[G.BUILDINGS[id].tech]).length;
    if (slots && avail.length) {
      const free = slots - list.length;
      h += '<div class="muted tiny" style="margin:8px 0 4px">' + (free > 0 ? 'Build in a free slot:' : 'All slots are in use. Develop this colony further, or build a Space Station.') + '</div>';
      for (const id of avail) {
        const def = G.BUILDINGS[id], c = G.buildingCost(i, id), chk = G.canBuild(i, id);
        h += '<div class="bopt"><div class="row">' + bico(def) + '<b class="grow">' + esc(def.name) + '</b><button class="btn small" data-act="build" data-i="' + i + '" data-id="' + id + '"' + (chk.ok ? '' : ' disabled') + '>Build' + kbRow(rowNo.get('build:' + id)) + '</button></div><div class="muted tiny">' + esc(def.text(1)) + '</div><div class="row tiny"><span class="gold">' + money(c.cash) + '</span>' + (c.research ? '<span class="cyan">' + rp(c.research) + '</span>' : '') + '</div></div>';
      }
    }
    if (locked) h += '<div class="muted tiny" style="margin-top:6px">' + locked + ' more building' + (locked === 1 ? '' : 's') + ' need technology: <span class="link" data-act="open-corp-tech">open the tech tree</span>.</div>';
    return h + '</div>';
  }
  // the star's spectral class and brightness, and what they give the colony
  function starSection(i) {
    const p = G.profileOf(i), k = G.d.starK, sp = p.spectral, cl = G.Corp.classPerks(p, k), tp = G.Corp.tierPerks(p, k);
    let h = '<div class="p-sec"><h4>Star</h4>';
    h += '<div class="row tiny"><b>Spectral class ' + p.letter + '</b><span class="muted">' + (p.type ? esc(p.type) : 'estimated from colour') + ' · ' + esc(sp.name.toLowerCase()) + ', ' + sp.temp + '</span></div>';
    h += '<div class="tiny">' + (cl.length ? '<span class="good">' + esc(cl.join(' · ')) + '</span>' : '<span class="muted">No class bonus</span>') + ' <span class="muted">· ' + esc(sp.blurb) + '</span></div>';
    h += '<div class="row tiny" style="margin-top:6px"><b>Magnitude ' + p.mag.toFixed(2) + '</b>' + (p.tier ? '<span class="badge gold">' + p.tier.name + '</span>' : '<span class="muted">fainter than 3: no brightness bonus</span>') + '</div>';
    if (tp.length) h += '<div class="tiny good">' + esc(tp.join(' · ')) + '</div>';
    if (k > 1.001) h += '<div class="tiny cyan" style="margin-top:4px">The Academy strengthens every star bonus ×' + k.toFixed(2) + '.</div>';
    return h + '</div>';
  }
  // a flagship is a named star: the sector office that nearby colonies remit royalties to
  function flagshipSection(i) {
    const S = G.state, D = G.d, cfg = G.CFG;
    if (G.isFlagship(i)) {
      const t = G.tributaries(i), roy = t.reduce((a, j) => a + D.rate[j] * cfg.royaltyShare, 0);
      let h = '<div class="p-sec"><h4>★ Flagship</h4><div class="tiny">The sector office for <b>' + plural(t.length, 'colony', 'colonies') + '</b>. They remit ' + Math.round(cfg.royaltyShare * 100) + '% of their revenue here (' + rateText(roy) + '), the vault holds ' + cfg.flagshipCapH + ' hours and never banks itself, and collecting pays a ' + Math.round(cfg.flagshipPremium * 100) + '% dividend premium. Visit it every day.</div>';
      if (t.length) h += '<div class="tiny muted" style="margin-top:4px">' + t.slice(0, 6).map(j => esc(SKY.stars[j][6])).join(', ') + (t.length > 6 ? ', …' : '') + '</div>';
      return h + '</div>';
    }
    const f = G.sectorOf(i);
    if (f >= 0) return '<div class="p-sec"><h4>Sector</h4><div class="tiny">' + Math.round(cfg.royaltyShare * 100) + '% of this colony’s revenue (' + rateText(D.rate[i] * cfg.royaltyShare) + ') is booked at the flagship <span class="link" data-act="sel-star" data-i="' + f + '">' + esc(SKY.stars[f][6]) + '</span>. Collect it there.</div></div>';
    return '<div class="p-sec"><h4>Sector</h4><div class="tiny muted">No flagship of yours is in reach yet, so this colony keeps all its revenue. Colonise a named star to open a sector office.</div></div>';
  }
  function starPanel(i) {
    const S = G.state, D = G.d, st = SKY.stars[i], s = S.stars[i], con = SKY.consts[st[5]];
    let h = '<div class="p-head"><h3>' + esc(st[6]) + '</h3><button class="x" data-act="close-panel" aria-label="Close">✕</button></div>';
    const rank = G.starRank(i), rvi = G.rivalOf(i), rival = rvi >= 0 ? S.rivals[rvi] : null;
    h += '<div class="p-sub"><span class="link" data-act="open-const" data-c="' + st[5] + '">' + esc(con.name) + '</span> · <span class="dot" style="background:' + rgbOf(i) + '"></span>' + CL[G.cls[i]] + ' · mag ' + st[3].toFixed(2) + (G.isFlagship(i) ? ' · <span class="badge gold">★ flagship</span>' : rank.kind === 'lead' ? ' · <span class="badge">lead star</span>' : '') + (i === S.home ? ' · <span class="badge cyan">HQ</span>' : '') + '</div>';
    if (rival) h += '<div class="p-sub"><span class="dot" style="background:' + rival.color + '"></span>Held by <b style="color:' + rival.color + '">' + esc(rival.name) + '</b>' + (rival.home === i ? ' · <span class="badge">their headquarters</span>' : '') + '</div>';
    if (!s) {
      const chk = G.canLaunchTo(i), price = G.starPrice(i);
      const origins = G.frontierOrigins(i).map(o => ({ o, sec: G.travelSeconds(o.from, o.deg, false, o.e) })).sort((a, b) => a.sec - b.sec);
      const pend = G.targetsPending().has(i);
      h += '<div class="p-sec"><h4>' + (rival ? 'Take over' : 'Colonise') + '</h4>';
      if (pend) h += '<div class="row"><span class="badge gold">A ' + (rival ? 'takeover fleet' : 'colony ship') + ' is bound here</span></div>';
      else {
        h += '<div class="row"><span class="l">' + (rival ? 'Takeover cost' : 'Cost') + '</span><span class="grow"></span><b class="' + (S.cash >= price ? 'gold' : 'bad') + '">' + money(price) + '</b></div>';
        h += '<div class="row tiny muted"><span>' + esc(rank.label) + ': the going rate ' + money(G.claimCost()) + ' × ' + rank.mul + (rival ? ' × ' + G.CFG.takeoverMul + ' to take it from a rival' : '') + '</span></div>';
        if (origins.length) h += '<div class="row"><span class="l">Flight</span><span class="grow"></span><span>' + dur(origins[0].sec) + ' from ' + esc(SKY.stars[origins[0].o.from][6]) + '</span></div>';
        const flying = S.fleets.length >= D.slots;
        h += '<div class="row"><button class="btn primary grow" data-act="launch" data-i="' + i + '"' + (chk.ok ? '' : ' disabled') + '>' + (rival ? (flying ? 'Queue a takeover' : 'Send takeover fleet') : (flying ? 'Queue a charter' : 'Send colony ship')) + kb('Space') + '</button></div>';
        if (!chk.ok) h += '<div class="muted tiny">' + esc(chk.msg) + '</div>';
        else if (flying) h += '<div class="muted tiny">All ' + D.slots + ' ships are out. The charter is paid now and sails when one is free.</div>';
      }
      h += '</div>' + starSection(i);
      if (G.isFlagship(i)) h += '<div class="p-sec"><h4>★ Flagship</h4><div class="tiny">A named star. Once colonised it becomes a sector office: nearby colonies remit ' + Math.round(G.CFG.royaltyShare * 100) + '% of their revenue to it.</div></div>';
      h += '<div class="p-sec"><h4>Routes</h4>' + routeRows(i) + '</div>';
      return h;
    }
    const cap = G.stockCap(i), icap = G.resCap(i);
    h += '<div class="p-sec"><h4>Revenue</h4><div class="bar"><i data-lv="bar" style="width:0%"></i></div>';
    h += '<div class="row tiny"><span class="gold" data-lv="stock">$0</span><span class="muted" data-lv="cap"></span><span class="grow"></span>' + (icap > 0 ? '<span class="cyan" data-lv="res">◉ 0</span>' : '') + '</div>';
    h += '<div class="row"><button class="btn gold grow" data-act="collect" data-i="' + i + '">Collect revenue' + kb('R') + '</button></div>';
    h += '<div class="row tiny muted"><span class="grow">Revenue</span><span data-lv="rate"></span></div>';
    h += '<div class="muted tiny" data-lv="rbreak"></div>';
    if (D.auto[i] > 0) h += '<div class="tiny cyan" style="margin-top:4px">⟳ ' + Math.round(D.auto[i] * 100) + '% of what this colony keeps is banked automatically (Treasury technology and Clearing House).</div>';
    if (G.isFlagship(i)) h += '<div class="tiny gold" style="margin-top:4px">★ A flagship never banks itself: collect here for the ' + Math.round(G.CFG.flagshipPremium * 100) + '% dividend premium.</div>';
    h += '</div>';
    h += flagshipSection(i) + starSection(i);
    const pet = S.petitions.find(p => p.star === i);
    if (pet) h += '<div class="p-sec"><h4>Petition</h4><div class="row"><span class="grow">' + esc(petitionText(pet)) + '</span></div><div class="row tiny"><span class="gold">+' + money(pet.reward) + '</span><span class="cyan">+' + pet.research + ' ◉</span><span class="grow"></span><button class="btn small ghost" data-act="dismiss-pet" data-id="' + pet.id + '">Dismiss</button></div></div>';
    h += '<div class="p-sec"><h4>Development</h4>';
    for (const t of G.TRACKS) {
      const info = G.TRACK_INFO[t], L = s[t], max = L >= G.MAX_LEVEL;
      const cost = max ? 0 : G.upgradeCost(i, t);
      let pips = '<span class="pips">'; for (let k = 0; k < G.MAX_LEVEL; k++) pips += '<i class="' + (k < L ? 'on' : '') + '"></i>'; pips += '</span>';
      h += '<div class="row"><span style="width:84px"><b>' + info.name + '</b></span>' + pips + '<span class="grow"></span>' +
        (max ? '<span class="badge gold">max</span>' : '<button class="btn small" data-act="upgrade" data-i="' + i + '" data-t="' + t + '"' + (S.cash >= cost ? '' : ' disabled') + '>' + money(cost) + kb('ILD'[G.TRACKS.indexOf(t)]) + '</button>') + '</div>';
      h += '<div class="muted tiny" style="margin:-3px 0 4px 0">' + esc(info.desc) + '</div>';
    }
    const lv = s.r + s.b + s.o;
    h += '<div class="muted tiny">Total ' + lv + ' · a constellation is developed at ' + G.DEV_LEVELS + ' per colony, mastered at ' + G.MASTER_LEVELS + '.</div></div>';
    h += buildingSection(i);
    const ms = G.messierFrom[i];
    if (ms.length) {
      h += '<div class="p-sec"><h4>Nearby Messier objects</h4>';
      for (const m of ms) {
        const M = SKY.messier[m], vis = S.messier[m];
        h += '<div class="row tiny"><span class="grow"><span class="link" data-act="sel-messier" data-i="' + m + '">M' + M.n + (vis && M.alt ? ' ' + esc(M.alt) : '') + '</span> <span class="muted">' + M.tname + '</span></span>' + (vis ? '<span class="badge cyan">catalogued</span>' : '') + '</div>';
      }
      h += '</div>';
    }
    h += '<div class="p-sec"><h4>Routes</h4>' + routeRows(i) + '</div>';
    return h;
  }
  // ---- the year's sky: meteor showers on the real calendar
  const showerState = sh => G.YearSky.showerState(sh, G.now());
  function showerWhen(sh) {
    const st = showerState(sh);
    if (st.active) return Math.abs(st.daysToPeak) < 0.75 ? 'at its peak' : st.daysToPeak > 0 ? 'peak in ' + dur(st.daysToPeak * 86400) : 'peak ' + dur(-st.daysToPeak * 86400) + ' ago';
    const w = ((st.daysToStart % 365) + 365) % 365;
    return 'starts in ' + dur(w * 86400);
  }
  function showerPanel(i) {
    const S = G.state, sh = G.YearSky.SHOWERS[i], st = showerState(sh), now = G.showersNow().find(x => x.id === sh.id);
    const zone = G.showerZone[sh.id], mine = zone.filter(j => S.stars[j]), rec = S.showers[sh.id];
    let h = '<div class="p-head"><h3>' + esc(sh.name) + '</h3><button class="x" data-act="close-panel" aria-label="Close">✕</button></div>';
    h += '<div class="p-sub">☄ Meteor shower · radiant in ' + esc(sh.con) + ' · ' + sh.zhr + ' an hour at best · ' + sh.speed + ' km/s</div>';
    h += '<div class="p-sec"><h4>Right now</h4><div class="row"><span class="grow"><b>' + (st.active ? 'Running' : 'Not running') + '</b> · ' + esc(showerWhen(sh)) + '</span><span class="muted tiny">' + esc(sh.dates) + '</span></div>';
    h += '<div class="bar cy"><i style="width:' + Math.round(st.activity * 100) + '%"></i></div>';
    if (now && mine.length) h += '<div class="row tiny"><span class="gold">+' + Math.round(now.boost * 100) + '% revenue</span><span class="muted">at ' + plural(mine.length, 'colony', 'colonies') + ' within ' + G.YearSky.ZONE_DEG + '° of the radiant</span></div>';
    else if (st.active) h += '<div class="muted tiny">No colony of yours is within ' + G.YearSky.ZONE_DEG + '° of the radiant. Colonise near ' + esc(sh.con) + ' to earn from it and to watch it.</div>';
    else h += '<div class="muted tiny">Colonies within ' + G.YearSky.ZONE_DEG + '° of the radiant (you have ' + mine.length + ') earn up to +' + Math.round(G.YearSky.showerBoost(sh) * 100) + '% revenue at the peak.</div>';
    h += '</div>';
    h += '<div class="p-sec"><h4>Your watch</h4>' + (rec ? '<div class="row"><span class="grow">Watched ' + dstr(rec.t) + '</span><span class="badge ' + (rec.peak ? 'gold' : '') + '">' + (rec.peak ? 'peak caught: ×2' : 'peak not caught') + '</span></div>' : '<div class="muted tiny">Not watched yet. Open the game while it runs, with a colony under the radiant, to add a permanent +' + (G.CFG.showerWatch * 100).toFixed(1) + '% revenue (double if you catch the peak, ' + esc(sh.peakText) + ').</div>') + '</div>';
    h += '<div class="p-sec"><h4>About</h4><div class="tiny">' + esc(sh.note) + '</div><div class="row tiny" style="margin-top:6px"><span class="muted">Parent</span><span class="grow"></span><span>' + esc(sh.parent) + ' · ' + sh.parentKind + '</span></div><div class="row tiny"><span class="muted">Peak</span><span class="grow"></span><span>' + esc(sh.peakText) + '</span></div></div>';
    if (mine.length) h += '<div class="p-sec"><h4>Your colonies under the radiant</h4><div class="tiny">' + mine.slice(0, 12).map(j => '<span class="link" data-act="sel-star" data-i="' + j + '">' + esc(SKY.stars[j][6]) + '</span>').join(', ') + (mine.length > 12 ? ', …' : '') + '</div></div>';
    return h;
  }
  function messierPanel(m) {
    const S = G.state, M = SKY.messier[m], vis = S.messier[m], con = SKY.consts[M.c];
    let h = '<div class="p-head"><h3>M' + M.n + (vis && M.alt ? ' · ' + esc(M.alt) : '') + '</h3><button class="x" data-act="close-panel" aria-label="Close">✕</button></div>';
    h += '<div class="p-sub">' + KIND_ICON[M.kind] + ' ' + M.tname + ' · <span class="link" data-act="open-const" data-c="' + M.c + '">' + esc(con.name) + '</span> · mag ' + M.mag + (M.dim ? ' · ' + M.dim + '′' : '') + '</div>';
    const [pk, pv] = G.MESSIER_PERK[M.kind];
    const dev = vis && vis.dev;
    if (vis) h += '<div class="p-pic"><canvas class="mpic" data-vis="messier:' + m + '"></canvas><div class="muted tiny" style="margin-top:3px">Photo via the messier-api package · credits in Menu → About</div></div>';
    h += '<div class="p-sec"><h4>' + (vis ? 'Surveyed ' + dstr(vis.t) : 'Not yet surveyed') + '</h4>';
    if (vis && M.note) h += '<div class="lore">' + esc(M.note) + '</div>';
    h += '<div class="row"><span class="grow">' + esc(pk === 'slots' ? '+1 fleet slot per 3 globular clusters' : PERK_TXT(pk, pv * (dev ? 2 : 1))) + '</span>' + (dev ? '<span class="badge gold">doubled</span>' : '') + '</div>';
    if (!vis) {
      const chk = G.canVisitMessier(m), c = G.messierCost();
      const pend = S.fleets.some(f => f.kind === 'm' && f.to === m);
      if (pend) h += '<div class="row"><span class="badge cyan">Survey mission under way</span></div>';
      else {
        h += '<div class="row tiny"><span class="cyan">' + rp(c.research) + '</span><span class="gold">' + money(c.cash) + '</span><span class="grow"></span><button class="btn primary small" data-act="visit-m" data-i="' + m + '"' + (chk.ok ? '' : ' disabled') + '>Send survey mission' + kb('Space') + '</button></div>';
        if (!chk.ok) h += '<div class="muted tiny">' + esc(chk.msg) + '</div>';
      }
    } else if (!dev) {
      const c = G.developMessierCost();
      h += '<div class="row tiny"><span class="muted">Study in depth</span><span class="cyan">' + rp(c) + '</span><span class="grow"></span><button class="btn small" data-act="develop-m" data-i="' + m + '"' + (S.research >= c ? '' : ' disabled') + '>Double bonus' + kb('Space') + '</button></div>';
    }
    const lb = learnBadge('messier', m);
    if (lb) h += '<div class="row tiny muted">Sky School: ' + lb + '</div>';
    h += '</div><div class="p-sec"><h4>Launch points</h4>';
    for (const s of M.links) h += '<div class="row tiny"><span class="grow"><span class="link" data-act="sel-star" data-i="' + s + '">' + esc(SKY.stars[s][6]) + '</span></span>' + (S.stars[s] ? '<span class="badge green">yours</span>' : G.rivalOf(s) >= 0 ? '<span class="badge" style="color:' + S.rivals[G.rivalOf(s)].color + '">' + esc(S.rivals[G.rivalOf(s)].name) + '</span>' : '<span class="muted">○</span>') + '</div>';
    return h + '</div>';
  }
  function renderPanel() {
    const el = $('#panel');
    if (!ui.started || !ui.sel || ui.redraw) { el.hidden = true; document.body.classList.remove('has-panel'); lastPanelHtml = ''; return; }
    const html = ui.sel.type === 'star' ? starPanel(ui.sel.i) : ui.sel.type === 'shower' ? showerPanel(ui.sel.i) : messierPanel(ui.sel.i);
    if (html !== lastPanelHtml) { el.innerHTML = html; lastPanelHtml = html; drawVisuals(el); }
    el.hidden = false; document.body.classList.add('has-panel');
    if (ui.sel.type === 'star' && G.state.stars[ui.sel.i]) { // live values
      const i = ui.sel.i, s = G.state.stars[i], D = G.d;
      const cap = G.stockCap(i), icap = G.resCap(i);
      const q = k => el.querySelector('[data-lv="' + k + '"]');
      if (q('bar')) q('bar').style.width = (cap > 0 ? Math.min(100, s.s / cap * 100) : 0) + '%';
      if (q('stock')) q('stock').textContent = money(s.s);
      if (q('cap')) q('cap').textContent = '/ ' + money(cap) + ' · full in ' + (s.s >= cap ? 'now' : dur((cap - s.s) / Math.max(1e-9, D.accr[i] * (1 - D.auto[i]))));
      if (q('res')) q('res').textContent = '◉ ' + fmt(s.i) + ' / ' + fmt(icap);
      if (q('rate')) q('rate').textContent = rateText(D.rate[i]);
      if (q('rbreak')) {
        const known = G.baseRate[i] * (1 + 0.5 * s.r) * D.routeMul[i] * D.globalOut, extra = known > 0 ? D.rate[i] / known : 1;
        q('rbreak').textContent = 'base ' + rateText(G.baseRate[i]) + ' × industry ' + (1 + 0.5 * s.r).toFixed(1) + ' × routes ' + D.routeMul[i].toFixed(2) + ' × company ' + D.globalOut.toFixed(2) + ' × buildings & star ' + extra.toFixed(2);
      }
    }
  }

  // ---------------------------------------------------------------- HUD, banner, attention
  let hudCache = {};
  function setText(sel, txt) { if (hudCache[sel] !== txt) { hudCache[sel] = txt; $(sel).textContent = txt; } }
  function priceChange() {
    const M = G.state.market, h = M.hist, prev = h.length > 1 ? h[h.length - 2] : h[0];
    return (M.price / prev - 1) * 100;
  }
  function renderHud() {
    const S = G.state, D = G.d;
    setText('#r-cash', money(S.cash)); setText('#r-cash-rate', '+' + rateText(D.totalRate));
    setText('#r-res', fmt(S.research)); setText('#r-res-rate', '+' + fmt(D.totalRes * 3600) + '/h');
    setText('#r-fleet', S.fleets.length + '/' + D.slots); setText('#r-queue', S.orders.length ? S.orders.length + ' queued' : '');
    const ch = priceChange();
    setText('#corp-name', S.corp.name);
    setText('#corp-rank', G.rankInfo().title);
    setText('#corp-price', ticker(S.corp.name) + ' ' + S.market.price.toFixed(2) + ' ' + (ch >= 0 ? '▲' : '▼') + Math.abs(ch).toFixed(1) + '%');
    $('#corp-chip').classList.toggle('up', ch >= 0); $('#corp-chip').classList.toggle('down', ch < 0);
  }
  let bannerHtml = '';
  function renderBanner() {
    const el = $('#banner'), S = G.state;
    let html = '', cls = '';
    if (ui.redraw) {
      const ev = S.events.find(e => e.id === ui.redraw.id);
      if (!ev) { stopRedraw(); return renderBanner(); }
      cls = 'redraw';
      html = '<div class="msg"><b>Redraw ' + esc(ev.name) + '</b><small>Tap two stars to reconnect the trade route between them. ' + ev.restored.length + '/' + ev.edges.length + ' restored · ' + ev.misses + ' miss' + (ev.misses === 1 ? '' : 'es') + ' · ' + dur(ev.remaining) + ' left' + (ui.hint ? ' · hints on (reward ÷4)' : '') + '</small></div><div class="btns"><button class="btn small" data-act="redraw-hint"' + (ui.hint ? ' disabled' : '') + '>Show hints' + kb('H') + '</button><button class="btn small" data-act="redraw-stop">Done' + kb('E') + '</button></div>';
    } else if (S.events.length) {
      const ev = S.events[0], left = ev.edges.length - ev.restored.length;
      html = '<div class="msg"><b>' + (ev.kind === 'comet' ? '☄ ' : '✸ ') + esc(ev.name) + '</b><small>' + left + ' trade route' + (left === 1 ? '' : 's') + ' cut near ' + esc(ev.where) + ' · ' + dur(ev.remaining) + ' (the clock only runs while you play)</small></div><div class="btns"><button class="btn small primary" data-act="redraw-start" data-id="' + ev.id + '">Redraw routes' + kb('E') + '</button></div>';
    }
    if (html !== bannerHtml) { el.innerHTML = html; el.className = cls; el.hidden = !html; bannerHtml = html; document.body.classList.toggle('has-banner', !!html); }
  }
  let lastAttn = '';
  function renderAttention() {
    const S = G.state, D = G.d, el = $('#attn');
    const full = G.attention();
    const chips = [];
    if (S.events.length && !ui.redraw) chips.push('<span class="chip red" data-act="redraw-start" data-id="' + S.events[0].id + '">☄ routes cut' + kb('E') + '</span>');
    const flags = full.filter(a => a.why === 'flagship'), plain = full.filter(a => a.why === 'full');
    if (flags.length) chips.push('<span class="chip gold" data-act="goto-full">★ ' + flags.length + ' flagship' + (flags.length === 1 ? '' : 's') + ' ready to collect' + kb('G') + '</span>');
    if (plain.length) chips.push('<span class="chip gold" data-act="goto-full">$ ' + plain.length + ' colon' + (plain.length === 1 ? 'y' : 'ies') + ' with full storage' + (flags.length ? '' : kb('G')) + '</span>');
    if (S.petitions.length) chips.push('<span class="chip cyan" data-act="goto-petition">✉ ' + S.petitions.length + ' petition' + (S.petitions.length === 1 ? '' : 's') + kb('P') + '</span>');
    const idle = Math.max(0, D.slots - S.fleets.length);
    const canGo = idle > 0 && [...ui.frontier].some(t => G.canLaunchTo(t).ok);
    if (canGo) chips.push('<span class="chip" data-act="goto-frontier">➤ ' + idle + ' ship' + (idle === 1 ? '' : 's') + ' idle' + kb('N') + '</span>');
    else if (idle > 0) { const grab = [...ui.takeover].filter(t => G.canLaunchTo(t).ok); if (grab.length) chips.push('<span class="chip" data-act="goto-takeover">⚑ ' + plural(grab.length, 'rival star') + ' to take over' + kb('X') + '</span>'); }
    if (!S.tech.active && G.TECHS.some(t => G.techStatus(t.id) === 'available' && G.canStartTech(t.id).ok)) chips.push('<span class="chip cyan" data-act="open-corp-tech">⚗ lab idle: research available' + kb('T') + '</span>');
    if (S.market.kind) { const m = G.MARKETS[S.market.kind]; chips.push('<span class="chip" data-act="open-corp" title="' + esc(m.text) + '">◈ ' + esc(m.name) + ' · ' + dur(S.market.remaining) + '</span>'); }
    for (const x of G.showersNow()) if (x.colonies && x.activity >= 0.4) { const i = G.YearSky.SHOWERS.findIndex(q => q.id === x.id); chips.push('<span class="chip" data-act="goto-shower" data-i="' + i + '" title="A meteor shower is running: colonies near its radiant earn more">☄ ' + esc(G.YearSky.SHOWERS[i].name) + ' +' + Math.round(x.boost * 100) + '% at ' + plural(x.colonies, 'colony', 'colonies') + '</span>'); }
    const ready = QU.readyCount();
    if (ready) chips.unshift('<span class="chip gold" data-act="open-quests">✔ ' + ready + ' quest' + (ready === 1 ? '' : 's') + ' ready' + kb('Q') + '</span>');
    const qb = $('#qbadge'); qb.hidden = !ready; qb.textContent = ready;
    if (ready > ui.lastReady) toast('Quest complete! Open Quests to claim your reward.', 'gold');
    ui.lastReady = ready;
    const html = chips.join('');
    if (html !== lastAttn) { el.innerHTML = html; lastAttn = html; }
  }
  let cycle = { full: 0, pet: 0, front: 0 };
  function gotoAttention(kind) {
    const S = G.state;
    if (kind === 'full') {
      const full = G.attention(); if (!full.length) return;
      const s = full[cycle.full++ % full.length].star; ui.sel = { type: 'star', i: s }; sky.goStar(s, Math.max(sky.v.zoom, 3));
    } else if (kind === 'petition') {
      if (!S.petitions.length) return;
      const s = S.petitions[cycle.pet++ % S.petitions.length].star; ui.sel = { type: 'star', i: s }; sky.goStar(s, Math.max(sky.v.zoom, 3));
    } else {
      const cand = [...ui.frontier].filter(t => G.canLaunchTo(t).ok);
      if (!cand.length) return;
      cand.sort((a, b) => SKY.stars[a][3] - SKY.stars[b][3]);
      const s = cand[cycle.front++ % Math.min(cand.length, 6)]; ui.sel = { type: 'star', i: s }; sky.goStar(s, Math.max(sky.v.zoom, 3));
    }
  }

  // ---------------------------------------------------------------- modal infrastructure
  function openModal(spec) {
    ui.modal = spec; ui.tab = spec.tab || (spec.tabs && spec.tabs[0] && spec.tabs[0][0]) || null; ui.held.clear();
    $('#modal').hidden = false; renderModal();
  }
  function closeModal() { ui.modal = null; $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }
  function renderModal() {
    if (!ui.modal) return;
    $('#modal-title').textContent = ui.modal.title;
    const tabsEl = $('#modal-tabs');
    tabsEl.innerHTML = (ui.modal.tabs || []).map(([id, label]) => '<button data-act="tab" data-tab="' + id + '" class="' + (ui.tab === id ? 'on' : '') + '">' + label + '</button>').join('');
    tabsEl.hidden = !(ui.modal.tabs && ui.modal.tabs.length);
    const body = $('#modal-body');
    const keep = body.scrollTop;
    const fn = ui.modal.render || (ui.modal.renderers || TAB_RENDER)[ui.tab] || (() => '');
    fn(body);
    if (ui.modal.keepScroll || ui.modal.live) body.scrollTop = keep;
  }
  const CODEX_TABS = [['const', 'Constellations'], ['messier', 'Messier'], ['stars', 'Named stars'], ['sky', 'Sky'], ['learning', 'Learning'], ['chron', 'Chronicle']];
  function openCodex(tab) { openModal({ id: 'codex', title: 'Codex', tabs: CODEX_TABS, tab: tab || 'const' }); }

  function consBadge(cs) {
    return cs.mastered ? '<span class="badge gold">★ mastered</span>' : cs.developed ? '<span class="badge gold">developed</span>' : cs.all ? '<span class="badge green">colonised</span>' : cs.claimed ? '<span class="badge">' + cs.claimed + '/' + cs.total + '</span>' : '<span class="badge">unexplored</span>';
  }
  const TAB_RENDER = {
    const(body) {
      const f = ui.filter.const || 'all';
      const stats = { claimed: 0, dev: 0, master: 0 };
      const rows = [];
      for (let c = 0; c < SKY.consts.length; c++) {
        const cs = G.consStatus(c);
        if (cs.claimed) stats.claimed++; if (cs.developed) stats.dev++; if (cs.mastered) stats.master++;
        rows.push([c, cs]);
      }
      let h = '<div class="stat-grid"><div class="stat"><b>' + stats.claimed + ' / 88</b><span>explored</span></div><div class="stat"><b class="gold">' + stats.dev + ' / 88</b><span>developed (every star colonised, ' + G.DEV_LEVELS + '+ levels each)</span></div><div class="stat"><b class="gold">' + stats.master + ' / 88</b><span>mastered (' + G.MASTER_LEVELS + '+ levels each)</span></div></div>';
      h += '<div class="filters">' + [['all', 'All'], ['part', 'In progress'], ['unexp', 'Unexplored'], ['dev', 'Developed'], ['master', 'Mastered']].map(([k, l]) => '<span class="chip ' + (f === k ? 'on' : '') + '" data-act="filter" data-k="const" data-v="' + k + '">' + l + '</span>').join('') + '</div><div class="grid">';
      for (const [c, cs] of rows) {
        if (f === 'part' && !(cs.claimed && !cs.developed)) continue;
        if (f === 'unexp' && cs.claimed) continue;
        if (f === 'dev' && !cs.developed) continue;
        if (f === 'master' && !cs.mastered) continue;
        h += '<div class="card ' + (cs.mastered ? 'master' : cs.developed ? 'dev' : cs.claimed ? '' : 'locked') + '" data-act="open-const" data-c="' + c + '"><canvas data-chart="' + c + '"></canvas><div class="t"><span>' + esc(SKY.consts[c].name) + '</span></div><div class="s">' + consBadge(cs) + ' ' + learnBadge('const', c) + '</div>' + (cs.developed ? '<span class="stamp">' + (cs.mastered ? '★' : '✦') + '</span>' : '') + '</div>';
      }
      body.innerHTML = h + '</div>';
      body.querySelectorAll('canvas[data-chart]').forEach(cv => Sky.drawChart(cv, G, +cv.dataset.chart));
    },
    messier(body) {
      const S = G.state, f = ui.filter.messier || 'all';
      const vis = Object.keys(S.messier).length;
      let h = '<div class="prog"><div class="row"><b>' + vis + ' / 110</b><span class="muted">surveyed</span><span class="grow"></span>' + (vis === 110 ? '<span class="badge gold">★ Messier Marathon complete</span>' : '') + '</div><div class="bar cy"><i style="width:' + (vis / 1.1) + '%"></i></div></div>';
      h += '<div class="filters">' + [['all', 'All'], ['seen', 'Surveyed'], ['todo', 'To survey'], ...Object.keys(KIND_NAMES).map(k => [k, KIND_NAMES[k]])].map(([k, l]) => '<span class="chip ' + (f === k ? 'on' : '') + '" data-act="filter" data-k="messier" data-v="' + k + '">' + l + '</span>').join('') + '</div><div class="mgrid">';
      SKY.messier.forEach((M, m) => {
        const v = S.messier[m], reach = G.messierAccess(m).length > 0;
        if (f === 'seen' && !v) return; if (f === 'todo' && v) return;
        if (KIND_NAMES[f] && M.kind !== f) return;
        h += '<div class="mcard ' + (v ? 'visited' : 'locked') + '" data-act="goto-messier" data-i="' + m + '"><div class="row"><span class="n">M' + M.n + '</span><span class="grow"></span><span>' + KIND_ICON[M.kind] + '</span></div>';
        if (v) h += '<canvas class="mthumb" data-vis="messier:' + m + '"></canvas><div><b>' + esc(M.alt || M.tname) + '</b> ' + learnBadge('messier', m) + '</div><div class="muted tiny">' + M.tname + ' · ' + esc(SKY.consts[M.c].name) + ' · mag ' + M.mag + '</div><div class="note">' + esc(M.note) + '</div><div class="row tiny"><span class="muted">' + dstr(v.t) + '</span>' + (v.dev ? '<span class="badge gold">doubled</span>' : '') + '</div>';
        else h += '<div class="muted">' + M.tname + '</div><div class="muted tiny">' + (reach ? '<span class="good">in reach</span>' : 'beyond your reach') + '</div>';
        h += '</div>';
      });
      body.innerHTML = h + '</div>';
      drawVisuals(body);
    },
    stars(body) {
      const S = G.state;
      const named = SKY.stars.map((s, i) => i).filter(i => SKY.stars[i][7]).sort((a, b) => SKY.stars[a][3] - SKY.stars[b][3]);
      const got = named.filter(i => S.stars[i]);
      let h = '<div class="prog"><div class="row"><b>' + got.length + ' / ' + named.length + '</b><span class="muted">named stars colonised</span></div><div class="bar"><i style="width:' + (got.length / named.length * 100) + '%"></i></div></div>';
      h += '<div class="muted tiny" style="margin-bottom:8px">Only the 20 brightest and most famous stars have proper names. Every other star is shown by its official designation (a Bayer letter such as β Ori, a Flamsteed number such as 61 Cyg, or an HD / HIP catalogue number).</div>';
      h += '<table class="t"><tr><th>Name</th><th>Constellation</th><th>Class</th><th>Mag</th><th></th><th></th></tr>';
      for (const i of named) {
        const st = SKY.stars[i], cl = !!S.stars[i];
        h += '<tr class="click" data-act="goto-star" data-i="' + i + '"><td><span class="dot" style="background:' + rgbOf(i) + '"></span>' + esc(st[6]) + '</td><td class="muted">' + esc(SKY.consts[st[5]].name) + '</td><td>' + CL[G.cls[i]] + '</td><td>' + st[3].toFixed(2) + '</td><td>' + (cl ? '<span class="badge green">colonised</span>' : G.rivalOf(i) >= 0 ? '<span class="badge" style="color:' + S.rivals[G.rivalOf(i)].color + '">' + esc(S.rivals[G.rivalOf(i)].name) + '</span>' : '<span class="badge">free · ' + money(G.starPrice(i)) + '</span>') + '</td><td>' + learnBadge('star', i) + '</td></tr>';
      }
      body.innerHTML = h + '</table>';
    },
    sky(body) {
      const S = G.state, Y = G.YearSky, now = G.now(), act = G.showersNow().slice().sort((a, b) => b.activity - a.activity);
      const nSh = Object.keys(S.showers).length, nPk = Object.values(S.showers).filter(r => r.peak).length, nCm = Object.keys(S.comets).length;
      let h = '<p class="muted" style="margin-top:0;max-width:720px">The sky has a calendar. The <b>ecliptic</b> is the Sun’s road through the stars, and the zodiac band along it holds the Moon and planets. <b>Meteor showers</b> come when the Earth ploughs through the trail of a comet, on the same dates every year, from a point in the sky called the radiant. <b>Comets</b> cut your routes when they pass: redraw them to add the comet to this catalogue. Press <b>Y</b> to show or hide the ecliptic and the radiants on the map.</p>';
      h += '<div class="stat-grid"><div class="stat"><b>' + nSh + ' / ' + Y.SHOWERS.length + '</b><span>meteor showers watched (+' + (G.CFG.showerWatch * 100).toFixed(1) + '% revenue each)</span></div><div class="stat"><b class="gold">' + nPk + ' / ' + Y.SHOWERS.length + '</b><span>peaks caught (the bonus doubles)</span></div><div class="stat"><b class="cyan">' + nCm + ' / ' + Y.COMETS.length + '</b><span>comets catalogued (+' + (G.CFG.cometLore * 100).toFixed(0) + '% event rewards each)</span></div></div>';
      h += '<h3>Meteor showers <span class="muted tiny">today is ' + new Date(now).toLocaleDateString(undefined, { day: 'numeric', month: 'long', timeZone: 'UTC' }) + ' (UTC)</span></h3>';
      if (act.length) {
        h += '<div class="empires">';
        for (const x of act) {
          const i = Y.SHOWERS.findIndex(q => q.id === x.id), sh = Y.SHOWERS[i];
          h += '<div class="erow click" data-act="goto-shower" data-i="' + i + '"><span class="dot" style="background:#bfe4ff"></span><span><b>' + esc(sh.name) + '</b> <span class="muted tiny">' + esc(showerWhen(sh)) + ' · radiant in ' + esc(sh.con) + '</span> ' + (x.colonies ? '<span class="badge gold">+' + Math.round(x.boost * 100) + '% at ' + plural(x.colonies, 'colony', 'colonies') + '</span>' : '<span class="badge">no colony under it</span>') + '</span><span class="muted tiny">' + Math.round(x.activity * 100) + '%</span><span class="ebar"><i style="width:' + Math.round(x.activity * 100) + '%;background:#bfe4ff"></i></span></div>';
        }
        h += '</div>';
      } else h += '<div class="muted" style="margin-bottom:8px">No shower is running today.</div>';
      const soon = Y.upcoming(now, 5).filter(x => !x.active).slice(0, 3);
      if (soon.length) h += '<div class="muted tiny" style="margin-bottom:8px">Next: ' + soon.map(x => esc(x.shower.name) + ' in ' + dur(x.wait * 86400)).join(' · ') + '.</div>';
      h += '<div class="table-wrap"><table class="t"><tr><th>Shower</th><th>Radiant</th><th>Active</th><th>Peak</th><th>ZHR</th><th>Parent</th><th>You</th></tr>';
      Y.SHOWERS.forEach((sh, i) => {
        const rec = S.showers[sh.id], st = showerState(sh);
        h += '<tr class="click" data-act="goto-shower" data-i="' + i + '"><td>' + (st.active ? '<span class="dot" style="background:#bfe4ff"></span>' : '') + esc(sh.name) + '</td><td class="muted">' + esc(sh.con) + '</td><td class="muted">' + esc(sh.dates) + '</td><td>' + esc(sh.peakText) + '</td><td>' + sh.zhr + '</td><td class="muted">' + esc(sh.parent) + '</td><td>' + (rec ? '<span class="badge ' + (rec.peak ? 'gold' : 'cyan') + '">' + (rec.peak ? '★ peak' : 'watched') + '</span>' : '<span class="muted">·</span>') + '</td></tr>';
      });
      h += '</table></div><div class="muted tiny">ZHR is the zenithal hourly rate: the meteors an observer would count in an hour under a perfect, dark sky with the radiant overhead. Colonies within ' + Y.ZONE_DEG + '° of a running radiant earn up to +' + Math.round(Y.showerBoost(Y.SHOWER_BY_ID.gem) * 100) + '% revenue at its peak (the weakest showers a third of that).</div>';
      h += '<h3>Comets <span class="muted tiny">' + nCm + ' of ' + Y.COMETS.length + ' catalogued</span></h3><div class="cometgrid">';
      for (const c of Y.COMETS) {
        const rec = S.comets[c.id];
        h += '<div class="cometcard' + (rec ? ' seen' : '') + '"><div class="row"><b class="grow">' + (rec ? '☄ ' : '') + esc(c.name) + '</b><span class="muted tiny">' + esc(c.desig) + '</span></div><div class="tiny muted">' + esc(c.period) + (c.perihelion ? ' · ' + esc(c.perihelion) : '') + '</div>' + (rec ? '<div class="tiny" style="margin-top:4px">' + esc(c.note) + '</div><div class="tiny muted" style="margin-top:3px">Catalogued ' + dstr(rec.t) + (rec.perfect ? ' · perfect redraw' : '') + '</div>' : '<div class="tiny muted" style="margin-top:4px">Redraw the routes it cuts to learn its story.</div>') + '</div>';
      }
      h += '</div><h3>The ecliptic</h3><div class="tiny" style="max-width:720px">The ecliptic (the gold line, with the zodiac band 8° either side) is the path the Sun seems to follow through the stars in a year: the plane of Earth’s orbit seen from the Earth. It is tilted ' + Y.EPS.toFixed(1) + '° to the celestial equator, so it crosses the equator at the two <b>equinoxes</b> and reaches its farthest north and south at the <b>solstices</b>. The ticks mark where the Sun is at the start of each tropical sign, with its usual date. Because the Earth’s axis wobbles over 26 000 years (precession), the March equinox, the “First Point of Aries”, has drifted into Pisces. The ecliptic runs through thirteen constellations, including Ophiuchus, and the Moon and planets always stay close to it.</div>';
      body.innerHTML = h;
    },
    learning(body) {
      const cats = [['const', 'Constellations'], ['star', 'Named stars'], ['messier', 'Messier objects'], ['astro', 'Olympiad Academy']];
      const catF = ui.filter.learnCat || 'all', stF = ui.filter.learnStatus || 'started';
      const all = cats.map(([c, name]) => ({ c, name, items: QZ.items(c) }));
      let h = '<p class="muted" style="margin-top:0;max-width:700px">Everything you have practised in Sky School, including the Olympiad Academy’s cards (click one to open its topic). An item is <b class="cyan">learned</b> after ' + QZ.LEARN_BOX + ' correct answers that were each given after their review interval had passed. Items that are <b class="gold">due</b> are ready for their next counting review.</p>';
      let dueTotal = 0;
      h += '<div class="learn-cards">';
      for (const { c, name, items } of all) {
        const n = k => items.filter(x => x.status === k).length;
        const pr = QZ.progress(c), due = n('due'), learning = n('learning'), fresh = n('new'), total = items.length;
        dueTotal += due;
        const seg = (k, cls) => '<i class="' + cls + '" style="width:' + (k / total * 100) + '%"></i>';
        h += '<div class="learn-card"><div class="row"><b class="grow">' + name + '</b><span class="cyan">' + pr.learned + ' / ' + pr.total + ' learned</span></div><div class="stack">' + seg(n('learned'), 'l') + seg(due, 'd') + seg(learning, 'g') + '</div><div class="row tiny muted"><span class="gold">' + due + ' due</span><span>' + learning + ' waiting</span><span>' + (fresh ? fresh + ' not started' : '') + '</span></div>' + (pr.extra ? '<div class="tiny muted">+' + pr.extra + ' other designations learned</div>' : '') + '</div>';
      }
      h += '</div>';
      h += '<div class="row" style="margin:6px 0 12px"><button class="btn gold" data-act="school-review"' + (dueTotal ? '' : ' disabled') + '>' + (dueTotal ? 'Review ' + dueTotal + ' due item' + (dueTotal === 1 ? '' : 's') + ' in Sky School' + kb('R') : 'Nothing due right now') + '</button><button class="btn" data-act="open-school">Open Sky School</button></div>';
      h += '<div class="filters">' + [['all', 'All'], ...cats].map(([k, l]) => '<span class="chip ' + (catF === k ? 'on' : '') + '" data-act="filter" data-k="learnCat" data-v="' + k + '">' + l + '</span>').join('') + '<span class="muted tiny" style="margin:0 4px">·</span>' + [['started', 'In progress'], ['due', 'Due'], ['learning', 'Waiting'], ['learned', 'Learned'], ['new', 'Not started'], ['all', 'Everything']].map(([k, l]) => '<span class="chip ' + (stF === k ? 'on' : '') + '" data-act="filter" data-k="learnStatus" data-v="' + k + '">' + l + '</span>').join('') + '</div>';
      let rows = [];
      for (const { c, items } of all) if (catF === 'all' || catF === c) rows = rows.concat(items);
      rows = rows.filter(x => stF === 'all' ? true : stF === 'started' ? x.status !== 'new' : x.status === stF);
      const order = { due: 0, learning: 1, new: 2, learned: 3 };
      rows.sort((a, b) => order[a.status] - order[b.status] || (a.status === 'learning' ? a.dueMs - b.dueMs : b.box - a.box) || a.name.localeCompare(b.name));
      if (!rows.length) h += '<p class="muted">Nothing here yet. Play a few Sky School rounds and your progress will show up in this list.</p>';
      else {
        h += '<table class="t"><tr><th>Item</th><th>Progress</th><th>Next review</th><th>Right / wrong</th></tr>';
        for (const x of rows.slice(0, 300)) {
          const act = x.cat === 'astro' ? 'open-academy" data-topic="' + x.topic : x.cat === 'const' ? 'open-const" data-c="' + x.id : x.cat === 'messier' ? 'goto-messier" data-i="' + x.id : 'goto-star" data-i="' + x.id;
          let pips = '<span class="pips ' + (x.status === 'learned' ? 'done' : '') + '">'; for (let k = 0; k < QZ.LEARN_BOX; k++) pips += '<i class="' + (k < x.box ? 'on' : '') + '"></i>'; pips += '</span>';
          const next = x.status === 'learned' ? '<span class="cyan">★ learned</span>' : x.status === 'due' ? '<span class="gold">due now</span>' : x.status === 'learning' ? 'in ' + dur(x.dueMs / 1000) : '<span class="muted">not started</span>';
          h += '<tr class="click" data-act="' + act + '"><td>' + esc(x.name) + '<div class="muted tiny">' + esc(x.sub) + '</div></td><td>' + pips + ' <span class="muted tiny">' + x.box + '/' + QZ.LEARN_BOX + '</span></td><td>' + next + '</td><td class="muted">' + x.ok + ' / ' + x.bad + '</td></tr>';
        }
        h += '</table>' + (rows.length > 300 ? '<div class="muted tiny">Showing the first 300.</div>' : '');
      }
      body.innerHTML = h;
    },
    chron(body) {
      const S = G.state, st = S.stats;
      let h = '<div class="stat-grid">';
      const cards = [[Object.keys(S.stars).length + ' / ' + SKY.stars.length, 'colonies'], [Object.keys(S.messier).length + ' / 110', 'Messier surveyed'], [Object.keys(S.devConst).length + ' / 88', 'constellations developed'], [money(st.collected), 'revenue collected by hand'], [money(st.auto || 0), 'revenue banked automatically'], [G.d.buildingCount, 'buildings standing'], [(G.techCount() - 1) + ' / ' + (G.TECHS.length - 1), 'technologies researched'], [st.marketEvents, 'market conditions lived through'], [st.eventsDone, 'comets and novae resolved'], [st.perfect, 'perfect redraws'], [st.petitionsDone, 'petitions answered'], [Object.keys(S.quests.claimed).length, 'story quests completed'], [S.quiz.stats.answered ? Math.round(S.quiz.stats.correct / S.quiz.stats.answered * 100) + '%' : '·', 'quiz accuracy (' + S.quiz.stats.answered + ' answers)'], [S.quiz.stats.perfect, 'perfect quiz rounds'], [dur((Date.now() - S.created) / 1000), 'company age']];
      cards.forEach(([b, l]) => h += '<div class="stat"><b>' + b + '</b><span>' + l + '</span></div>');
      h += '</div>';
      const devs = Object.keys(S.devConst).map(Number).sort((a, b) => S.devConst[a] - S.devConst[b]);
      if (devs.length) {
        h += '<h3>Developed constellations</h3><table class="t"><tr><th>Constellation</th><th>Developed</th><th>Mastered</th></tr>';
        for (const c of devs) h += '<tr class="click" data-act="open-const" data-c="' + c + '"><td>' + esc(SKY.consts[c].name) + '</td><td>' + dstr(S.devConst[c]) + '</td><td>' + (S.masterConst[c] ? '★ ' + dstr(S.masterConst[c]) : '<span class="muted">·</span>') + '</td></tr>';
        h += '</table>';
      }
      h += '<h3>Company log</h3>';
      for (const l of S.log.slice(-120).reverse()) h += '<div class="logline ' + l.kind + '"><time>' + tstr(l.ts) + '</time><span>' + esc(l.text) + '</span></div>';
      body.innerHTML = h;
    },
  };

  // ---------------------------------------------------------------- constellation page
  function openConst(c) {
    openModal({ id: 'const', title: SKY.consts[c].name, tabs: null, keepScroll: true, render: body => renderConstPage(body, c) });
  }
  let chartHit = [];
  function renderConstPage(body, c) {
    const S = G.state, cons = SKY.consts[c], cs = G.consStatus(c);
    const dev = cs.developed;
    let h = '<div class="cpage"><div><canvas class="big" id="cchart"></canvas><div class="muted tiny" style="margin-top:6px">Tap a star to find it on the map.</div></div><div>';
    h += '<div class="row"><button class="btn small" data-act="open-codex">← Codex</button><span class="muted">' + (cons.en !== cons.name ? esc(cons.en) : '') + '</span><span class="grow"></span>' + learnBadge('const', c) + ' ' + consBadge(cs) + '</div>';
    h += cs.claimed ? '<p class="lore">' + esc(cons.lore) + '</p>' : '<p class="lore locked-lore">Unexplored. Colonise a star here to learn its story.</p>';
    const items = QZ.items('const')[c];
    h += '<div class="row tiny muted">Sky School: ' + (items.status === 'learned' ? '<span class="cyan">★ learned</span>' : items.status === 'new' ? 'not started' : items.box + ' / ' + QZ.LEARN_BOX + ' reviews' + (items.status === 'due' ? ' · <span class="gold">review due</span>' : ' · next in ' + dur(items.dueMs / 1000))) + '</div>';
    h += '<div class="p-sec" style="padding:8px 0"><h4>Bonus</h4>';
    h += '<div class="row"><span class="grow">Developed: every star colonised with ' + G.DEV_LEVELS + '+ levels</span>' + (dev ? '<span class="badge gold">+' + (G.CFG.devBonus * 100).toFixed(1) + '% revenue</span>' : '<span class="muted tiny">+' + (G.CFG.devBonus * 100).toFixed(1) + '%</span>') + '</div>';
    h += '<div class="row"><span class="grow">Mastered: ' + G.MASTER_LEVELS + '+ levels each</span>' + (cs.mastered ? '<span class="badge gold">+' + (G.CFG.masterBonus * 100).toFixed(1) + '% revenue</span>' : '<span class="muted tiny">+' + (G.CFG.masterBonus * 100).toFixed(1) + '%</span>') + '</div>';
    if (dev) h += '<div class="muted tiny">Developed ' + dstr(S.devConst[c]) + (cs.mastered ? ' · mastered ' + dstr(S.masterConst[c]) : '') + '</div>';
    h += '<div class="row" style="margin-top:8px"><button class="btn small" data-act="goto-const" data-c="' + c + '">Show on map</button>' + (dev ? '<button class="btn small gold" data-act="collect-const" data-c="' + c + '">Collect everything here</button>' : '<span class="muted tiny">Develop it to unlock one-tap collection.</span>') + '</div></div>';
    h += '<div class="p-sec" style="padding:8px 0"><h4>Stars (' + cs.claimed + ' / ' + cs.total + ')</h4><table class="t"><tr><th>Name</th><th>Class</th><th>Mag</th><th>Levels</th></tr>';
    const order = cons.stars.slice().sort((a, b) => SKY.stars[a][3] - SKY.stars[b][3]);
    for (const i of order) {
      const st = SKY.stars[i], s = S.stars[i];
      h += '<tr class="click" data-act="goto-star" data-i="' + i + '"><td>' + (s ? '<span class="dot" style="background:' + rgbOf(i) + '"></span>' + esc(st[6]) : '<span class="muted">' + esc(st[6]) + '</span>') + '</td><td class="muted">' + CL[G.cls[i]] + '</td><td>' + st[3].toFixed(1) + '</td><td>' + (s ? G.lvl(i) + '<span class="muted">/' + G.DEV_LEVELS + '</span>' : '<span class="muted">·</span>') + '</td></tr>';
    }
    h += '</table></div>';
    const nb = [...G.consNeighbours[c]].sort((a, b) => SKY.consts[a].name.localeCompare(SKY.consts[b].name));
    if (nb.length) h += '<div class="p-sec" style="padding:8px 0"><h4>Neighbours</h4><div class="filters">' + nb.map(n => '<span class="chip" data-act="open-const" data-c="' + n + '">' + esc(SKY.consts[n].name) + '</span>').join('') + '</div></div>';
    const ms = G.messierByConst[c];
    if (ms.length) h += '<div class="p-sec" style="padding:8px 0"><h4>Messier objects</h4>' + ms.map(m => { const M = SKY.messier[m], v = S.messier[m]; return '<div class="row tiny"><span class="grow"><span class="link" data-act="goto-messier" data-i="' + m + '">M' + M.n + (v && M.alt ? ' ' + esc(M.alt) : '') + '</span> <span class="muted">' + M.tname + '</span></span>' + (v ? '<span class="badge cyan">surveyed</span>' : '') + '</div>'; }).join('') + '</div>';
    h += '<div class="p-sec" style="padding:8px 0"><h4>Your notes</h4><textarea class="notes" id="cnotes" placeholder="A mnemonic, a sighting, anything you want to remember…">' + esc(S.notes[c] || '') + '</textarea></div>';
    h += '</div></div>';
    body.innerHTML = h;
    const cv = $('#cchart');
    Sky.drawChart(cv, G, c, { big: true, hit: chartHit });
    cv.onclick = e => {
      const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = 28 * 28;
      for (const p of chartHit) { const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p; } }
      if (best) { closeModal(); ui.sel = { type: 'star', i: best.i }; sky.goStar(best.i, 4); }
    };
    const ta = $('#cnotes');
    ta.oninput = () => { S.notes[c] = ta.value; scheduleSave(); };
  }
  let saveTimer = null;
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 800); }

  // ---------------------------------------------------------------- the corporation: overview, technology, buildings
  const CORP_TABS = [['overview', 'Overview'], ['tech', 'Technology'], ['buildings', 'Buildings'], ['academy', 'Academy']];
  ui.academy = { topic: null };
  function openCorp(tab) { openModal({ id: 'corp', title: 'Corporation', tabs: CORP_TABS, tab: tab || 'overview', renderers: CORP_RENDER, live: true }); }
  function sparkline(cv, hist) {
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth || 300, H = cv.clientHeight || 70;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const lo = Math.min(...hist), hi = Math.max(...hist), span = Math.max(1e-6, hi - lo);
    ctx.strokeStyle = hist[hist.length - 1] >= hist[0] ? '#7ee2a8' : '#ff8a8a'; ctx.lineWidth = 1.8; ctx.beginPath();
    hist.forEach((v, k) => { const x = 4 + k / Math.max(1, hist.length - 1) * (W - 8), y = H - 6 - (v - lo) / span * (H - 12); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
  }
  // who holds what: you, the rival companies and the free sky
  function rivalsSection() {
    const S = G.state, R = G.rivals(), mine = G.d.count, N = SKY.stars.length, held = R.reduce((a, r) => a + r.n, 0), free = N - mine - held;
    const row = (color, name, n, badges, i) => '<div class="erow' + (i !== undefined ? ' click' : '') + '"' + (i !== undefined ? ' data-act="goto-star" data-i="' + i + '"' : '') + '><span class="dot" style="background:' + color + '"></span><span><b>' + esc(name) + '</b> ' + badges + '</span><span class="muted tiny">' + n + ' · ' + (n / N * 100).toFixed(1) + '%</span><span class="ebar"><i style="width:' + Math.min(100, n / N * 100) + '%;background:' + color + '"></i></span></div>';
    let h = '<h3>The sky <span class="muted tiny">who holds what</span></h3><div class="empires">';
    h += row('rgb(143,180,255)', S.corp.name, mine, '<span class="badge cyan">you</span>', S.home);
    for (const r of R.slice().sort((a, b) => b.n - a.n)) {
      const bad = [];
      if (r.out) bad.push('<span class="badge gold">acquired by you</span>');
      else { if (r.touching) bad.push('<span class="badge">borders you</span>'); if (!r.capitalHeld) bad.push('<span class="badge gold">HQ taken</span>'); }
      if (r.lost && !r.out) bad.push('<span class="badge">lost ' + r.lost + '</span>');
      h += row(r.color, r.name, r.n, bad.join(' '), r.n > 0 ? r.home : undefined);
    }
    h += row('rgba(150,165,205,.7)', 'Free sky', free, '');
    h += '</div><div class="muted tiny" style="margin:-4px 0 10px;max-width:640px">Rivals expand at about your own pace (each takes ' + R.map(r => Math.round(r.ratio * 100) + '%').join(', ') + ' as many stars as you add) but never attack you. A star a rival holds costs ' + G.CFG.takeoverMul + '× its price to take over, and flagships and constellation leaders cost the most. Press <b>V</b> to show or hide borders on the map.</div>';
    return h;
  }
  const CORP_RENDER = {
    overview(body) {
      const S = G.state, D = G.d, rk = G.rankInfo(), M = S.market;
      let h = '<div class="row" style="max-width:560px"><input id="corp-rename" class="txt grow" maxlength="32" value="' + esc(S.corp.name) + '" aria-label="Company name"><button class="btn small" data-act="rename-corp">Rename</button></div>';
      h += '<div class="rankcard"><div class="row"><b style="font-size:19px">' + esc(rk.title) + '</b><span class="grow"></span><span class="muted tiny">' + plural(rk.count, 'colony', 'colonies') + '</span></div>';
      h += rk.next ? '<div class="bar"><i style="width:' + Math.min(100, (rk.count - G.RANKS[rk.idx].at) / (rk.next.at - G.RANKS[rk.idx].at) * 100) + '%"></i></div><div class="muted tiny">' + plural(rk.next.at - rk.count, 'more colony', 'more colonies') + ' to become a ' + esc(rk.next.title) + '</div>' : '<div class="muted tiny">The highest corporate rank. The whole sky is yours.</div>';
      h += '</div>';
      const ch = priceChange();
      h += '<div class="stat-grid"><div class="stat"><b class="gold">' + money(D.totalRate * 3600) + '/h</b><span>revenue</span></div><div class="stat"><b class="cyan">' + fmt(D.totalRes * 3600) + ' RP/h</b><span>research</span></div><div class="stat"><b>' + money(G.valuation()) + '</b><span>valuation</span></div><div class="stat"><b>' + D.buildingCount + '</b><span>buildings</span></div><div class="stat"><b>' + (G.techCount() - 1) + ' / ' + (G.TECHS.length - 1) + '</b><span>technologies</span></div><div class="stat"><b>' + D.slots + '</b><span>fleet slots</span></div><div class="stat"><b>' + Math.round(D.manualShare * 100) + '%</b><span>of your income waits for a visit</span></div><div class="stat"><b class="gold">' + G.FLAGS.filter(f => S.stars[f]).length + ' / ' + G.FLAGS.length + '</b><span>flagships</span></div></div>';
      h += '<div class="pricebox"><div class="row"><b>' + esc(ticker(S.corp.name)) + '</b><span style="font-size:20px;font-weight:600">$' + M.price.toFixed(2) + '</span><span class="' + (ch >= 0 ? 'good' : 'bad') + '">' + (ch >= 0 ? '▲' : '▼') + Math.abs(ch).toFixed(2) + '%</span><span class="grow"></span><span class="muted tiny">all-time high $' + M.hi.toFixed(2) + '</span></div><canvas class="spark" id="spark"></canvas><div class="muted tiny">The share price follows the company’s worth (cash, revenue and colonies) with market noise.</div></div>';
      h += rivalsSection();
      if (M.kind) { const m = G.MARKETS[M.kind]; h += '<div class="callout"><b>◈ ' + esc(m.name) + '</b> · ' + esc(m.text) + ' · ' + dur(M.remaining) + ' left. <span class="muted">(Market clocks only run while you play.)</span></div>'; }
      else h += '<div class="muted tiny" style="margin-bottom:8px">Markets are calm right now. Booms, bubbles, crunches and contracts come and go while you play.</div>';
      h += '<h3>Headlines</h3>';
      const heads = S.log.filter(l => ['claim', 'build', 'tech', 'rank', 'market', 'dev', 'messier'].includes(l.kind)).slice(-8).reverse();
      for (const l of heads) h += '<div class="logline ' + l.kind + '"><time>' + tstr(l.ts) + '</time><span>' + esc(l.text) + '</span></div>';
      body.innerHTML = h;
      sparkline($('#spark'), M.hist.length > 1 ? M.hist : [M.price, M.price]);
    },
    tech(body) {
      const S = G.state;
      let h = '<p class="muted" style="margin-top:0;max-width:720px">Research one technology at a time (it keeps running while you are away). Each costs cash and research points, unlocks buildings, and most give a company-wide bonus.</p>';
      if (S.tech.active) {
        const a = S.tech.active, t = G.TECH_BY_ID[a.id];
        h += '<div class="callout"><b>⚗ Researching: ' + esc(t.name) + '</b><div class="bar cy" style="margin:6px 0"><i style="width:' + Math.min(100, (1 - a.remaining / a.dur) * 100) + '%"></i></div><span class="muted">' + dur(a.remaining) + ' remaining</span></div>';
      }
      const avail = G.TECHS.filter(x => G.techStatus(x.id) === 'available'); // the number keys start these, in this order
      G.Corp.ERAS.forEach((era, e) => {
        h += '<h3 class="era">' + esc(era.name) + ' <span class="muted tiny">' + esc(era.years) + '</span></h3><div class="techgrid">';
        for (const t of G.TECHS.filter(x => x.era === e)) {
          const st = G.techStatus(t.id), c = G.techCost(t.id), chk = st === 'available' ? G.canStartTech(t.id) : null;
          const reqs = t.req.map(r => '<span class="' + (S.tech.done[r] ? 'good' : 'bad') + '">' + esc(G.TECH_BY_ID[r].name) + '</span>').join(', ');
          const perks = Object.entries(t.perks).map(([k, v]) => G.Corp.PERK_TEXT[k](v)).join(', ');
          h += '<div class="tech ' + st + '"><div class="row"><b class="grow">' + esc(t.name) + '</b><span class="muted tiny">' + esc(t.year) + '</span>' + (st === 'done' ? '<span class="badge green">done</span>' : st === 'active' ? '<span class="badge cyan">researching</span>' : st === 'locked' ? '<span class="badge">locked</span>' : '') + '</div>';
          h += '<div class="muted tiny">' + esc(t.blurb) + '</div>';
          if (t.unlocks.length) h += '<div class="tiny" style="margin-top:3px">Unlocks: ' + t.unlocks.map(u => bico(G.BUILDINGS[u]) + ' ' + esc(G.BUILDINGS[u].name)).join(' · ') + '</div>';
          if (perks) h += '<div class="tiny cyan">' + esc(perks) + '</div>';
          if (t.req.length && st !== 'done') h += '<div class="tiny">Needs: ' + reqs + '</div>';
          if (st === 'available' || st === 'locked') h += '<div class="row tiny"><span class="gold">' + money(c.cash) + '</span><span class="cyan">' + rp(c.research) + '</span><span class="muted">' + dur(c.secs) + '</span><span class="grow"></span><button class="btn small primary" data-act="start-tech" data-id="' + t.id + '"' + (chk && chk.ok ? '' : ' disabled') + '>Research' + (st === 'available' ? kbRow(avail.indexOf(t)) : '') + '</button></div>' + (chk && !chk.ok ? '<div class="muted tiny">' + esc(chk.msg) + '</div>' : '');
          h += '</div>';
        }
        h += '</div>';
      });
      body.innerHTML = h;
    },
    buildings(body) {
      const S = G.state, all = G.allBuildings();
      let h = '<p class="muted" style="margin-top:0;max-width:720px">Buildings are built at your colonies, in building slots (one per three development levels, shown as rings around the star). Select a colony on the map to build. Technology unlocks each building.</p>';
      h += '<div class="stat-grid"><div class="stat"><b>' + all.length + '</b><span>buildings standing</span></div><div class="stat"><b>' + new Set(all.map(b => b.id)).size + ' / ' + Object.keys(G.BUILDINGS).length + '</b><span>kinds built</span></div><div class="stat"><b class="gold">' + money(S.stats.auto || 0) + '</b><span>banked automatically</span></div><div class="stat"><b>' + S.stats.routeUps + '</b><span>route upgrades</span></div></div>';
      for (const catId of Object.keys(G.Corp.BUILD_CATS)) {
        const cat = G.Corp.BUILD_CATS[catId];
        h += '<h3 style="color:' + cat.color + '">' + cat.name + '</h3><div class="table-wrap"><table class="t"><tr><th>Building</th><th>Effect (level 1 → 3)</th><th>Technology</th><th>Built</th></tr>';
        for (const id of Object.keys(G.BUILDINGS).filter(b => G.BUILDINGS[b].cat === catId)) {
          const def = G.BUILDINGS[id], unlocked = !!S.tech.done[def.tech], mine = all.filter(b => b.id === id).sort((a, b) => b.lvl - a.lvl);
          h += '<tr><td>' + bico(def) + ' <b>' + esc(def.name) + '</b><div class="muted tiny">' + esc(def.blurb) + '</div></td><td class="tiny">' + esc(def.text(1)) + '<br><span class="muted">… ' + esc(def.text(3)) + '</span></td><td>' + (unlocked ? '<span class="badge green">' + esc(G.TECH_BY_ID[def.tech].name) + '</span>' : '<span class="link" data-act="open-corp-tech">' + esc(G.TECH_BY_ID[def.tech].name) + '</span>') + '</td><td>' + (mine.length ? mine.length + '<div class="tiny">' + mine.slice(0, 4).map(b => '<span class="link" data-act="goto-star" data-i="' + b.star + '">' + esc(SKY.stars[b.star][6]) + '</span> <span class="muted">Lv' + b.lvl + '</span>').join(', ') + (mine.length > 4 ? ' …' : '') + '</div>' : '<span class="muted">·</span>') + '</td></tr>';
        }
        h += '</table></div>';
      }
      body.innerHTML = h;
    },
    academy(body) {
      const info = G.academy(), A = ui.academy;
      if (A.topic && info.find(t => t.id === A.topic)) { renderAcademyTopic(body, info.find(t => t.id === A.topic)); return; }
      const pr = QZ.progress('astro'), levels = G.academyLevels();
      let h = '<p class="muted" style="margin-top:0;max-width:760px">The <b>Olympiad Academy</b> is the astronomy-olympiad syllabus, in ten topics: telescopes and optics, orbital mechanics, light, stars, distances, stellar evolution, planets, galaxies and cosmology. Practise a topic in Sky School and, as its cards pass through the spaced-repetition schedule, the topic climbs through three levels. Every level is a <b>permanent</b> company-wide bonus. Nothing is ever taken back, so the only way to get these upgrades is to really learn the material.</p>';
      h += '<div class="stat-grid"><div class="stat"><b class="gold">' + levels + ' / ' + info.length * 3 + '</b><span>topic levels</span></div><div class="stat"><b class="cyan">' + pr.learned + ' / ' + pr.total + '</b><span>cards learned</span></div><div class="stat"><b>' + pr.started + '</b><span>cards in progress</span></div><div class="stat"><b class="' + (pr.due ? 'gold' : '') + '">' + pr.due + '</b><span>due for review</span></div></div>';
      h += '<div class="row" style="margin-bottom:12px"><button class="btn primary" data-act="academy-practise" data-topic="">Practise everything' + kb('Space') + '</button><button class="btn gold" data-act="school-review"' + (pr.due ? '' : ' disabled') + '>Review ' + (pr.due ? pr.due + ' due card' + (pr.due === 1 ? '' : 's') : 'what is due') + kb('R') + '</button></div>';
      h += '<div class="topics">';
      info.forEach((t, k) => {
        const T = Astro.TOPIC_BY_ID[t.id], lad = perkLadder(T, t.level);
        h += '<div class="topic-card' + (t.level >= 3 ? ' max' : '') + '"><div class="row"><b class="grow">' + esc(t.name) + '</b><span class="badge ' + (t.level ? 'gold' : '') + '">' + esc(Astro.LEVEL_NAMES[t.level]) + '</span></div>';
        h += '<div class="muted tiny">' + esc(t.blurb) + '</div>';
        h += '<div class="bar cy mast" title="Mastery ' + Math.round(t.f * 100) + '%"><i style="width:' + Math.min(100, t.f * 100) + '%"></i>' + Astro.LEVEL_AT.map(l => '<u style="left:' + l * 100 + '%"></u>').join('') + '</div>';
        h += '<div class="row tiny"><span class="pips" title="Levels reached">' + [0, 1, 2].map(l => '<i class="' + (l < t.level ? 'on' : '') + '"></i>').join('') + '</span><span class="muted">' + Math.round(t.f * 100) + '% mastered' + (t.next !== null ? ' · next level at ' + Math.round(t.next * 100) + '%' : ' · complete') + '</span></div>';
        h += '<div class="tiny perkline">' + lad + '</div>';
        h += '<div class="row tiny"><span class="muted grow">' + t.learned + ' / ' + t.cards + ' learned' + (t.due ? ' · <b class="gold">' + t.due + ' due</b>' : '') + '</span><button class="btn small primary" data-act="academy-practise" data-topic="' + t.id + '">Practise' + kbRow(k) + '</button><button class="btn small" data-act="academy-topic" data-topic="' + t.id + '">Study</button></div></div>';
      });
      h += '</div>';
      body.innerHTML = h;
    },
  };
  function perkLadder(T, level) { // "+4% · +8% · +12% research": the three levels share their wording when they can
    const texts = T.perk.v.map(v => PERK_TXT(T.perk.kind, v)), tails = texts.map(x => x.slice(x.indexOf(' ') + 1)), same = tails.every(x => x === tails[0]);
    const heads = same ? texts.map(x => x.slice(0, x.indexOf(' '))) : texts;
    return heads.map((x, l) => '<span class="' + (l < level ? 'good' : 'muted') + '" title="' + esc(Astro.LEVEL_NAMES[l + 1] + ': ' + Math.round(Astro.LEVEL_AT[l] * 100) + '% mastery') + '">' + (l < level ? '✓ ' : '') + esc(x) + '</span>').join(' · ') + (same ? ' <span class="muted">' + esc(tails[0]) + '</span>' : '');
  }
  function renderAcademyTopic(body, t) {
    const T = Astro.TOPIC_BY_ID[t.id];
    let h = '<div class="row"><button class="btn small" data-act="academy-back">← Academy' + kb('⌫') + '</button><span class="grow"></span><button class="btn small primary" data-act="academy-practise" data-topic="' + t.id + '">Practise this topic' + kb('P') + '</button></div>';
    h += '<h2 style="margin:10px 0 2px">' + esc(t.name) + ' <span class="badge ' + (t.level ? 'gold' : '') + '">' + esc(Astro.LEVEL_NAMES[t.level]) + '</span></h2><div class="muted" style="max-width:720px">' + esc(t.blurb) + '</div>';
    h += '<div class="bar cy mast" style="max-width:560px;margin-top:10px"><i style="width:' + Math.min(100, t.f * 100) + '%"></i>' + Astro.LEVEL_AT.map(l => '<u style="left:' + l * 100 + '%"></u>').join('') + '</div>';
    h += '<div class="muted tiny" style="max-width:560px">' + Math.round(t.f * 100) + '% mastered · ' + t.learned + ' / ' + t.cards + ' cards learned' + (t.due ? ' · <b class="gold">' + t.due + ' due</b>' : '') + '</div>';
    h += '<div class="ladder">' + T.perk.v.map((v, l) => '<div class="rung' + (l < t.level ? ' on' : '') + '"><b>' + (l < t.level ? '✓ ' : '') + 'Level ' + (l + 1) + ' · ' + esc(Astro.LEVEL_NAMES[l + 1]) + '</b><span class="tiny muted">at ' + Math.round(Astro.LEVEL_AT[l] * 100) + '% mastery</span><span class="tiny ' + (l < t.level ? 'good' : 'gold') + '">' + esc(PERK_TXT(T.perk.kind, v)) + ' (company-wide)</span></div>').join('') + '</div>';
    if (T.sheet.length) {
      h += '<h3>Formula sheet</h3><div class="table-wrap"><table class="t formulas"><tr><th>What</th><th>Formula</th><th></th></tr>';
      for (const [name, f, note] of T.sheet) h += '<tr><td>' + esc(name) + '</td><td class="formula">' + esc(f) + '</td><td class="muted tiny">' + esc(note || '') + '</td></tr>';
      h += '</table></div>';
    }
    if (T.gallery.length) {
      h += '<h3>Diagrams</h3>';
      let group = null;
      for (const g of T.gallery) {
        if (g.group !== group) { if (group !== null) h += '</div>'; group = g.group; if (group) h += '<h4 class="figgroup">' + esc(group) + '</h4>'; h += '<div class="figgrid">'; }
        h += '<div class="figcard"><canvas class="fig" data-vis="fig:' + esc(g.fig) + '" data-labels="1"></canvas><b>' + esc(g.name) + '</b><div class="tiny muted">' + esc(g.note || '') + '</div></div>';
      }
      h += '</div>';
    }
    const cards = QZ.items('astro').filter(x => x.topic === t.id);
    h += '<h3>Cards in this topic <span class="muted tiny">' + cards.length + '</span></h3><div class="table-wrap"><table class="t"><tr><th>Card</th><th>Progress</th><th>Next review</th></tr>';
    for (const x of cards) {
      let pips = '<span class="pips ' + (x.status === 'learned' ? 'done' : '') + '">'; for (let k = 0; k < QZ.LEARN_BOX; k++) pips += '<i class="' + (k < x.box ? 'on' : '') + '"></i>'; pips += '</span>';
      const next = x.status === 'learned' ? '<span class="cyan">★ learned</span>' : x.status === 'due' ? '<span class="gold">due now</span>' : x.status === 'learning' ? 'in ' + dur(x.dueMs / 1000) : '<span class="muted">not started</span>';
      h += '<tr><td>' + esc(x.name) + '<span class="badge tier' + Astro.CARD_BY_ID[x.id].tier + '" title="Difficulty">' + ['basic', 'core', 'advanced'][Astro.CARD_BY_ID[x.id].tier - 1] + '</span></td><td>' + pips + ' <span class="muted tiny">' + x.box + '/' + QZ.LEARN_BOX + '</span></td><td>' + next + '</td></tr>';
    }
    body.innerHTML = h + '</table></div>';
    drawVisuals(body);
  }

  // ---------------------------------------------------------------- quests
  ui.questChapter = null;
  function openQuests() { ui.questChapter = null; openModal({ id: 'quests', title: 'Quests', tabs: null, keepScroll: true, render: renderQuests }); }
  function questRow(q) {
    const pctDone = Math.min(100, q.cur / q.target * 100);
    return '<div class="quest' + (q.done ? ' done' : '') + '"><div class="row"><b class="grow">' + esc(q.title) + '</b>' + (q.chapter ? '<span class="badge">' + esc(q.chapter) + '</span>' : '') + '</div>' +
      (q.desc ? '<div class="muted tiny">' + esc(q.desc) + '</div>' : '') +
      '<div class="bar"><i style="width:' + pctDone + '%"></i></div>' +
      '<div class="row tiny"><span class="muted">' + fint(q.cur) + ' / ' + fint(q.target) + '</span><span class="grow"></span><span class="gold">+' + money(q.reward.cash) + '</span><span class="cyan">+' + rp(q.reward.research) + '</span>' +
      (q.done ? '<button class="btn small gold" data-act="quest-claim" data-id="' + q.id + '">Claim</button>' : q.kind === 'contract' ? '<button class="btn small ghost" data-act="quest-reroll" data-id="' + q.id + '" title="Swap for a different contract">⟲</button>' : '') + '</div></div>';
  }
  function renderQuests(body) {
    const L = QU.list(ui.questChapter);
    let h = '<p class="muted" style="margin-top:0;max-width:640px">Contracts are short repeatable jobs that refresh as you finish them. Story quests are long goals across the whole game, in ' + L.chapters.length + ' chapters. Rewards are worth minutes of your revenue, so they keep up as you grow.</p>';
    const nReady = L.contracts.concat(L.story).filter(q => q.done).length;
    if (nReady) h += '<div class="row"><button class="btn gold" data-act="quest-claim-all">Claim all ' + nReady + ' ready' + kb('Enter') + '</button></div>';
    h += '<h3>Contracts</h3><div class="quests">' + L.contracts.map(questRow).join('') + '</div>';
    h += '<h3>Story <span class="muted tiny">' + L.claimedCount + ' / ' + L.total + ' completed' + (L.chapter ? '' : ' · the next goal of every chapter') + '</span></h3>';
    h += '<div class="filters" style="margin-bottom:8px"><span class="chip' + (L.chapter ? '' : ' on') + '" data-act="quest-chapter" data-chapter="">Next goals</span>' +
      L.chapters.map(c => '<span class="chip' + (L.chapter === c.name ? ' on' : '') + (c.done === c.total ? ' cyan' : c.ready ? ' gold' : '') + '" data-act="quest-chapter" data-chapter="' + esc(c.name) + '" title="' + c.done + ' of ' + c.total + ' done">' + esc(c.name) + ' <span class="muted">' + c.done + '/' + c.total + '</span></span>').join('') + '</div>';
    const cc = L.chapters.find(c => c.name === L.chapter);
    if (cc) h += '<p class="muted" style="max-width:640px;margin:0 0 8px">' + esc(cc.blurb) + '</p>';
    h += '<div class="quests">' + (L.story.length ? L.story.map(questRow).join('') : '<p class="muted">Every goal in this chapter is done.</p>') + '</div>';
    body.innerHTML = h;
  }

  // ---------------------------------------------------------------- Sky School (minigames)
  ui.school = { view: 'menu', round: null, shown: null, learned: [] };
  const schoolSpec = () => ({ id: 'school', title: 'Sky School', tabs: null, render: renderSchool });
  function openSchool() {
    ui.school = { view: 'menu', round: null, shown: null, learned: [] };
    openModal(schoolSpec());
  }
  function startReview() {
    ui.school = { view: 'q', round: QZ.startRound('mixed', QZ.ROUND_LENGTH, { dueOnly: true }), shown: null, learned: [] };
    openModal(schoolSpec());
  }
  const LETTERS = ['A', 'B', 'C', 'D'];
  const SCHOOL_CATS = ['const', 'star', 'messier', 'astro', 'mixed'];
  const intervalText = ms => ms < 3600e3 ? Math.round(ms / 60e3) + ' min' : ms < 86400e3 ? Math.round(ms / 3600e3) + ' h' : Math.round(ms / 86400e3) + ' d';
  const visSpec = (v, thumb) => v.type === 'fig' ? 'fig:' + v.id : v.type + ':' + (v.type === 'messier' ? v.m : v.c) + (v.type === 'marked' && !thumb ? ':' + v.star : '');
  function renderSchool(body) {
    const sc = ui.school, S = G.state, st = S.quiz.stats;
    if (sc.view === 'menu') {
      const base = QZ.rewardBase();
      const dueAll = ['const', 'star', 'messier', 'astro'].reduce((n, c) => n + QZ.progress(c).due, 0);
      let h = '<p class="muted" style="margin-top:0;max-width:680px">Short rounds of five questions, like staff training for your astronomers: the sky itself, and the <b>Olympiad Academy</b>, which teaches the astronomy-olympiad syllabus for permanent company bonuses. A correct answer pays a little cash and research (about ' + QZ.REWARD.seconds + ' seconds of your revenue, <b>×' + QZ.REWARD.firstTime + '</b> the first time you get something right, with small streak and perfect-round bonuses). It is a side income, not a business plan.</p>' +
        '<div class="callout"><b>Spaced repetition.</b> Nothing is <span class="badge cyan">learned</span> after one lucky answer. Each item needs <b>' + QZ.LEARN_BOX + ' correct answers</b>, and each one only counts once its review is due: ' + QZ.INTERVALS.slice(1, QZ.LEARN_BOX).map(intervalText).join(' → ') + '. Answering early still pays a trickle but doesn’t advance it; a wrong answer sends it back two steps. Items that are due come up most often. See your progress in <span class="link" data-act="open-learning">Codex → Learning</span>.</div>';
      h += '<div class="stat-grid"><div class="stat"><b>' + st.answered + '</b><span>answered</span></div><div class="stat"><b>' + (st.answered ? Math.round(st.correct / st.answered * 100) + '%' : '·') + '</b><span>accuracy</span></div><div class="stat"><b>' + st.bestStreak + '</b><span>best streak</span></div><div class="stat"><b>' + st.perfect + ' / ' + st.rounds + '</b><span>perfect rounds</span></div><div class="stat"><b class="gold">' + money(base.cash) + '</b><span>per correct answer now</span></div></div>';
      if (dueAll) h += '<div class="row" style="margin-bottom:12px"><button class="btn gold" data-act="school-review">Review ' + dueAll + ' due item' + (dueAll === 1 ? '' : 's') + kb('R') + '</button></div>';
      h += '<div class="school-cats">';
      for (const [ci, cat] of SCHOOL_CATS.entries()) {
        const info = Quiz.CATS[cat], pr = cat === 'mixed' ? null : QZ.progress(cat);
        h += '<button class="school-cat" data-act="school-start" data-cat="' + cat + '"><b>' + info.name + kb(ci + 1) + '</b><span class="muted">' + info.blurb + '</span>' + (pr ? '<span class="tiny ' + (pr.learned ? 'cyan' : 'muted') + '">learned ' + pr.learned + ' / ' + pr.total + (pr.extra ? ' (+' + pr.extra + ' designations)' : '') + '</span><span class="tiny ' + (pr.due ? 'gold' : 'muted') + '">' + pr.started + ' in progress · ' + pr.due + ' due for review</span>' : '<span class="tiny muted">all four kinds</span>') + '</button>';
      }
      h += '</div><h3>Olympiad Academy topics <span class="muted tiny">practise one topic; each topic you master gives a permanent bonus (Corporation → Academy)</span></h3><div class="filters">';
      for (const t of G.academy()) h += '<span class="chip' + (t.level ? ' gold' : '') + '" data-act="school-start" data-cat="astro" data-topic="' + t.id + '" title="' + esc(t.blurb) + '">' + esc(t.name) + ' <span class="muted tiny">L' + t.level + (t.due ? ' · ' + t.due + ' due' : '') + '</span></span>';
      body.innerHTML = h + '</div>';
      return;
    }
    const r = sc.round;
    if (sc.view === 'summary') {
      const perfect = r.correct === r.qs.length;
      let h = '<div class="school-sum"><h3 style="margin-top:0">' + (perfect ? '★ Perfect round!' : r.correct + ' of ' + r.qs.length + ' correct') + '</h3>';
      h += '<div class="stat-grid"><div class="stat"><b class="gold">' + money(r.earned.cash + (r.bonus ? r.bonus.cash : 0)) + '</b><span>cash earned</span></div><div class="stat"><b class="cyan">' + rp(r.earned.research + (r.bonus ? r.bonus.research : 0)) + '</b><span>research earned</span></div><div class="stat"><b>' + r.best + '</b><span>best streak</span></div></div>';
      if (r.bonus) h += '<p class="good">Perfect-round bonus included: +' + money(r.bonus.cash) + ' and +' + rp(r.bonus.research) + '.</p>';
      if (sc.learned.length) h += '<p class="cyan">Newly learned: ' + sc.learned.map(esc).join(', ') + '</p>';
      for (const g of sc.levels || []) h += '<p class="gold">★ Olympiad Academy: ' + esc(g.name) + ' reached level ' + g.level + ' (' + esc(g.title) + '): ' + esc(g.perk) + ' for the whole company, for good.</p>';
      h += '<div class="row"><button class="btn primary" data-act="school-start" data-cat="' + r.cat + '"' + (sc.topic ? ' data-topic="' + sc.topic + '"' : '') + '>Another round' + kb('Space') + '</button><button class="btn" data-act="school-menu">Back to Sky School' + kb('⌫') + '</button></div></div>';
      body.innerHTML = h; return;
    }
    const shown = sc.shown;
    const idx = shown ? r.i - 1 : r.i; // r.i has already advanced once an answer is showing
    const Q = r.qs[idx];
    if (!Q) { body.innerHTML = '<p class="muted">Sky School could not set a question just now.</p><button class="btn" data-act="school-menu">Back to Sky School</button>'; return; }
    let h = '<div class="row tiny muted"><span>Question ' + (idx + 1) + ' / ' + r.qs.length + '</span><span class="grow"></span><span>streak ' + r.streak + '</span><span class="gold">' + money(r.earned.cash) + '</span><span class="cyan">' + rp(r.earned.research) + '</span></div>';
    if (Q.topic) h += '<div class="tiny qtopic">Olympiad Academy · ' + esc(Astro.TOPIC_BY_ID[Q.topic].name) + ' · ' + ['basic', 'core', 'advanced'][Astro.CARD_BY_ID[Q.subject.id].tier - 1] + '</div>';
    h += '<h3 class="qprompt">' + esc(Q.prompt) + '</h3>';
    if (Q.quote) h += '<blockquote class="lore">' + esc(Q.quote) + '</blockquote>';
    if (Q.visual) h += '<canvas class="qvis' + (Q.visual.type === 'messier' ? ' pic' : Q.visual.type === 'fig' ? ' fig' : '') + '" data-vis="' + visSpec(Q.visual) + '"></canvas>';
    const visual = Q.options.some(o => o.visual);
    h += '<div class="' + (visual ? 'qgrid' : 'qlist') + '">';
    Q.options.forEach((o, k) => {
      let cls = 'qopt';
      if (shown) cls += k === Q.answer ? ' correct' : k === shown.choice ? ' wrong' : ' dim';
      h += '<button class="' + cls + '" data-act="school-answer" data-i="' + k + '"' + (shown ? ' disabled' : '') + '>';
      if (o.visual) h += '<canvas class="qthumb' + (o.visual.type === 'messier' ? ' pic' : o.visual.type === 'fig' ? ' fig' : '') + '" data-vis="' + visSpec(o.visual, true) + '"></canvas>';
      h += '<span class="ql">' + LETTERS[k] + '</span>' + (visual && !shown ? '' : '<span class="qt">' + esc(o.text) + '</span>');
      h += '</button>';
    });
    h += '</div>';
    if (shown) {
      const res = shown.res;
      h += '<div class="qfeed ' + (res.correct ? 'ok' : 'no') + '"><b>' + (res.correct ? '✓ Correct' : '✗ Not quite: the answer is ' + esc(Q.options[Q.answer].text)) + '</b>';
      if (res.correct) h += ' <span class="gold">+' + money(res.reward.cash) + '</span> <span class="cyan">+' + rp(res.reward.research) + '</span> <span class="muted tiny">' + (res.reward.item >= 1.5 ? 'first time ×' + res.reward.item : res.reward.item < 0.5 ? 'too soon to count' : 'review ×' + res.reward.item.toFixed(2)) + (res.reward.streak > 1 ? ' · streak ×' + res.reward.streak.toFixed(2) : '') + '</span>';
      h += '<div class="tiny" style="margin-top:4px">' + esc(Q.explain) + '</div>';
      h += '<div class="tiny srs">' + (res.learnedNow ? '<b class="cyan">★ Learned!</b> All ' + res.learnedBox + ' reviews done. ' : res.correct ? (res.counted ? 'Review counted: <b>' + res.box + ' / ' + res.learnedBox + '</b>. Next counting review in ' + dur(res.nextReviewMs / 1000) + '.' : 'Answered too soon to count (still ' + res.box + ' / ' + res.learnedBox + '). A counting review is due in ' + dur(res.nextReviewMs / 1000) + '.') : 'Back to <b>' + res.box + ' / ' + res.learnedBox + '</b>; it will come back soon.') + '</div>';
      h += '<div class="row" style="margin-top:8px"><button class="btn primary" data-act="school-next">' + (res.last ? 'See results' : 'Next question') + kb('Space') + '</button></div></div>';
    }
    body.innerHTML = h;
    drawVisuals(body);
  }
  function schoolAnswer(k) {
    const sc = ui.school; if (!sc.round || sc.shown) return;
    const q = sc.round.qs[sc.round.i];
    const res = QZ.answer(sc.round, k);
    if (res.learnedNow) {
      const s = q.subject;
      sc.learned.push(s.cat === 'astro' ? Astro.CARD_BY_ID[s.id].title : s.cat === 'const' ? SKY.consts[s.id].name : s.cat === 'star' ? SKY.stars[s.id][6] : 'M' + SKY.messier[s.id].n);
      toast('Learned: ' + sc.learned[sc.learned.length - 1], 'good');
    }
    if (res.academy && res.academy.length) (sc.levels = sc.levels || []).push(...res.academy);
    sc.shown = { choice: k, res };
  }

  // ---------------------------------------------------------------- fleets & charters
  function openFleets() { openModal({ id: 'fleets', title: 'Fleet & charters', tabs: null, render: renderFleets }); }
  function renderFleets(body) {
    const S = G.state, D = G.d;
    let h = '<div class="muted" style="margin-bottom:10px">' + S.fleets.length + ' of ' + D.slots + ' ships out. More slots come from Logistics levels, Launch Pads, Orbital Shipyards and globular clusters.</div><h3 style="margin-top:0">In flight</h3>';
    if (!S.fleets.length) h += '<div class="muted">None.</div>';
    for (const f of S.fleets) {
      const to = f.kind === 's' ? SKY.stars[f.to][6] : 'M' + SKY.messier[f.to].n;
      h += '<div class="row"><span class="grow">' + (f.kind === 'm' ? '<span class="cyan">survey mission</span>' : 'colony ship') + ' <span class="muted">from</span> ' + esc(SKY.stars[f.from][6]) + ' <span class="muted">to</span> <span class="link" data-act="' + (f.kind === 's' ? 'goto-star' : 'goto-messier') + '" data-i="' + f.to + '">' + esc(to) + '</span></span><span class="muted">' + dur(f.remaining) + '</span></div>';
    }
    h += '<h3>Queued charters</h3>';
    if (!S.orders.length) h += '<div class="muted">None. Select an uncolonised star while all ships are out to queue a charter.</div>';
    for (const o of S.orders) h += '<div class="row"><span class="grow">colonise <span class="link" data-act="goto-star" data-i="' + o.to + '">' + esc(SKY.stars[o.to][6]) + '</span> <span class="muted">in ' + esc(SKY.consts[SKY.stars[o.to][5]].name) + '</span></span><span class="gold">' + money(o.paid) + '</span><button class="btn small" data-act="cancel-order" data-id="' + o.id + '">Cancel</button></div>';
    body.innerHTML = h;
  }

  // ---------------------------------------------------------------- menu
  function slotHtml(n) {
    const d = readKey(SLOT(n));
    return '<div class="slot"><div class="grow"><b>Slot ' + n + '</b><div class="muted tiny">' + (d ? esc(summary(d)) : 'empty') + '</div></div><button class="btn small" data-act="slot-save" data-n="' + n + '">Save</button><button class="btn small" data-act="slot-load" data-n="' + n + '"' + (d ? '' : ' disabled') + '>Load</button></div>';
  }
  const MENU_TABS = [['save', 'Save'], ['guide', 'How to play'], ['about', 'About'], ['keys', 'Keys']];
  function openMenu(tab) { openModal({ id: 'menu', title: 'Menu', tabs: MENU_TABS, tab: tab || 'save', renderers: MENU_RENDER }); }
  const MENU_RENDER = {
    save(body) {
      let h = '<div class="menu-list"><div class="muted">Your corporation autosaves in this browser every few seconds. Use slots or an exported file for extra safety.</div>';
      h += '<div class="slot"><div class="grow"><b>Autosave</b><div class="muted tiny">' + esc(summary(G.state)) + '</div></div><button class="btn small" data-act="save-now">Save now</button></div>';
      h += [1, 2, 3].map(slotHtml).join('');
      h += '<div class="row"><button class="btn" data-act="export">Export save file</button><label class="btn">Import save file<input type="file" accept=".json,application/json" id="imp-menu" hidden></label></div>';
      h += '<div class="row"><button class="btn bad" data-act="reset">Wind up this company…</button></div></div>';
      body.innerHTML = h;
      $('#imp-menu').onchange = e => { if (e.target.files[0]) importFile(e.target.files[0], st => { if (confirm('Replace your current company with this save?')) { closeModal(); beginSession(st, false); } }); };
    },
    guide(body) {
      body.innerHTML = '<div class="how" style="max-width:740px"><h3 style="margin-top:0">Goal</h3><p>You run a space corporation. Colonise every star on the constellation stick figures, develop every constellation, survey all 110 Messier objects and research every technology. The map is one flat sky that wraps both ways: drag to pan, scroll or pinch to zoom.</p>' +
        '<h3>Core loop</h3><ul><li><b class="gold">Cash</b> is earned by every colony. It piles up in that colony’s storage: <b>tap the colony and Collect revenue</b> (storage stops filling when full, so visit often; orange-red stars hold the most).</li>' +
        '<li><b>Colonise</b> a new star: select an uncolonised star next to your territory (ringed in blue) and send a colony ship. <b>Prices follow importance</b>: ordinary stars are cheap, so the opening is quick, but the 20 flagships and each constellation’s lead star (its alpha, or its brightest) cost several times more. Charters are paid up front and sail as soon as a ship is free, even while you are away. Every star has a <b>spectral class</b> (O B A F G K M, from its colour) and a <b>brightness</b>, and each gives the colony a bonus: hot blue stars pay more, white ones research, orange and red ones store more, and the brightest ones are beacons for routes and ships.</li>' +
        '<li><b>Develop</b> colonies with Industry (more revenue), Logistics (faster ships, stronger routes, more fleet slots) and R&amp;D (research points ◉).</li>' +
        '<li><b>Trade routes</b>: neighbouring colonies boost each other, more when their star colours differ. Upgrade routes for stronger bonuses and faster ships. The map wraps in both directions: leave over the north pole and you arrive from the south.</li>' +
        '<li><b>Flagships</b>: the 20 named stars are sector offices. Colonies around one remit 25% of their revenue to it, its vault holds a day, it <b>never banks itself</b> and collecting there pays a dividend premium. Research the <b>Telegraph</b>, <b>Electronic Funds Transfer</b> and <b>Digital Payments</b> and ordinary colonies bank up to 80% of their cash automatically; the flagships still need you, at every stage of the game.</li></ul>' +
        '<h3>Technology and buildings</h3><p>Open <b>Corporation → Technology</b> to research human technology in real time: the telescope, rockets, computers, solar cells, space stations, fusion, space elevators, Dyson swarms and warp drives. Technology unlocks <b>buildings</b> and gives company-wide bonuses. Every three development levels on a colony open a building slot (the rings around the star; each building shows as a little satellite). Revenue buildings such as Solar Farms and Fusion Plants cost what they earn back in a day or two; a <b>Clearing House</b> banks the revenue of a whole region automatically; a <b>Space Station</b> adds slots.</p>' +
        '<h3>The ecliptic, meteor showers and comets</h3><p>Press <b>Y</b> (or the ☄ button) to show the <b>ecliptic</b>: the Sun’s road through the stars, with its zodiac band, a tick for each sign with the date the Sun gets there, the equinoxes, the solstices and the ecliptic poles. <b>Meteor showers</b> run on the real calendar: while one is on, its <b>radiant</b> glows on the map with meteors streaking out of it, and colonies within 25° of it earn more, most at the peak. Open the game during a shower with a colony under its radiant to <b>watch</b> it, for a small permanent bonus (double for the peak). Every <b>comet</b> that cuts your routes is a real one and is drawn with its tail pointing away from the Sun; redraw its routes to catalogue it in <b>Codex → Sky</b>.</p>' +
        '<h3>Rivals and borders</h3><p>Three rival companies start on far-away flagships and expand at about your own pace: every star you add earns each of them a share of one (90%, 75% and 60%). They never attack you or take what is yours. The map tints each empire’s ground and draws its <b>borders</b>; press <b>V</b> to hide them. A star a rival holds can be <b>taken over</b> once it touches your territory (ringed with a turning dashed circle; <b>X</b> finds them): it costs 2.5 times its normal price, so flagships and lead stars are dear. When the free sky runs out, the rest of the sky is won by takeover, and a rival that loses its last star is acquired.</p>' +
        '<h3>The company</h3><p>As you grow you are promoted from Startup to Cosmic Monopoly. Your share price follows the company’s worth, and random <b>market conditions</b> (booms, tech bubbles, credit crunches, government contracts) come and go while you play.</p>' +
        '<h3>Messier objects</h3><p>Send a <b>survey mission</b> to a Messier object near one of your colonies. Each type gives a bonus (globulars: fleet slots, open clusters: revenue, nebulae: research, galaxies: speed) and is stamped into the catalogue with its photograph.</p>' +
        '<h3>Constellations</h3><p>A <b>developed</b> constellation (every star colonised, 3+ levels each) is stamped in the Codex and unlocks one-tap collection there. <b>Mastered</b> at 9+ levels each.</p>' +
        '<h3>Sky School</h3><p>Five-question rounds that name constellations from their figures, mark stars, tell colours and brightness, identify Messier objects by photograph, number, name and type, and cover the Olympiad Academy. Rewards are modest. Everything runs on spaced repetition: an item needs 10 correct answers, spaced further and further apart, before it is <b>learned</b>. Track it all under <b>Codex → Learning</b>.</p>' +
        '<h3>Olympiad Academy</h3><p>The astronomy-olympiad syllabus in ten topics (sky and time, orbital mechanics, telescopes and optics, light, stars, magnitudes and distances, stellar evolution, the Solar System and exoplanets, galaxies and cosmology): facts, <b>diagrams</b> of telescope designs, orbits and the H–R diagram, and numerical problems with fresh numbers every time. Practise in Sky School; open <b>Corporation → Academy</b> for each topic’s level, formula sheet and diagrams. Mastering a topic raises it through three levels, and every level is a <b>permanent</b> bonus for the whole company.</p>' +
        '<h3>Quests</h3><p>Three repeatable <b>contracts</b> plus a <b>story</b> of more than 380 goals in seventeen chapters. The list offers the next goal of every chapter; tap a chapter to see all that is left in it. Rewards are worth minutes of your revenue.</p>' +
        '<h3>Comets and novae</h3><p>Now and then a comet or nova cuts some of your trade routes. Press <b>Redraw routes</b> and tap two stars to rebuild each missing line from memory. Correct lines pay out; wrong guesses cost accuracy; hints work but pay a quarter. If you ignore it the routes drift back by themselves. Event clocks only run while the game is open, so nothing expires while you are away.</p>' +
        '<h3>Petitions</h3><p>Colonies sometimes ask for an upgrade, an expansion or a visit, and reward you for answering. Nothing in this game dims, decays or is taken from you.</p>' +
        '<h3 class="k-only">Keyboard</h3><p class="k-only">Every window and most actions have a key, shown on the buttons. <b>Space</b> expands (sends a colony ship or survey mission), <b>C</b> opens the Codex, <b>1–9</b> build in the selected colony and <b>R</b> collects. Press <b>?</b> for the full list (Menu → Keys).</p></div>';
    },
    keys(body) {
      let h = '<p class="muted" style="margin-top:0;max-width:720px">Keys are ignored while you type in a text box, and the key badges on buttons are hidden on touch screens. Window keys toggle: press again to close.</p><div class="keys-grid">';
      for (const [title, rows] of KEY_HELP) {
        h += '<div class="keys-group"><h3>' + esc(title) + '</h3><table class="t">';
        for (const [keys, text] of rows) h += '<tr><td class="keycell">' + keys.map(k => '<kbd class="kk">' + esc(k) + '</kbd>').join(' ') + '</td><td>' + esc(text) + '</td></tr>';
        h += '</table></div>';
      }
      body.innerHTML = h + '</div>';
    },
    about(body) {
      body.innerHTML = '<div class="how" style="max-width:720px"><h3 style="margin-top:0">Firmament</h3><p>A corporate expansion game on the real night sky. All star positions, brightnesses and colours are real; travel times, economics and the corporation are invented.</p>' +
        '<p>Star positions, names and constellation figures come from the open <a class="link" href="https://github.com/ofrohn/d3-celestial" target="_blank" rel="noopener">d3-celestial</a> data set (derived from the Hipparcos catalogue, IAU star names and Stellarium constellation lines). Messier data likewise. See THIRD_PARTY.md in the repository.</p>' +
        '<p>Messier photographs come from the open-source <a class="link" href="https://www.npmjs.com/package/messier-api" target="_blank" rel="noopener">messier-api</a> package (MIT), resized for this game. That package does not record the individual photographers, so the original credits are not shown here; if a photo is yours and you would like it credited or removed, please open an issue on the repository. If a photo fails to load, a procedural illustration of the object type is drawn instead.</p>' +
        '<p>' + SKY.stars.length + ' stars · ' + SKY.edges.length + ' routes · 88 constellations · 110 Messier objects · ' + G.TECHS.length + ' technologies · ' + Object.keys(G.BUILDINGS).length + ' buildings.</p></div>';
    },
  };

  // ---------------------------------------------------------------- actions
  const ACT = {
    'continue': () => { const s = readKey(AUTOSAVE); if (s) beginSession(s, false); },
    'newgame': el => { const inp = $('#corp-input'); G.newGame(+el.dataset.i, inp && inp.value); beginSession(G.state, true); },
    'open-codex': () => openCodex(), 'open-menu': () => openMenu(), 'open-fleets': () => openFleets(), 'open-school': () => openSchool(), 'open-quests': () => openQuests(),
    'open-corp': () => openCorp(), 'open-corp-tech': () => openCorp('tech'), 'open-learning': () => openCodex('learning'),
    'rename-corp': () => { const inp = $('#corp-rename'); const r = G.setCorpName(inp && inp.value); toast(r.msg, r.ok ? 'good' : 'bad'); },
    'start-tech': el => { const r = G.startTech(el.dataset.id); toast(r.msg, r.ok ? 'good' : 'bad'); },
    'build': el => { const r = G.build(+el.dataset.i, el.dataset.id); toast(r.msg, r.ok ? 'good' : 'bad'); },
    'demolish': el => { const def = G.BUILDINGS[el.dataset.id]; if (confirm('Demolish the ' + def.name + '? You get half of what you paid back.')) { const r = G.demolish(+el.dataset.i, el.dataset.id); toast(r.msg, r.ok ? 'good' : 'bad'); } },
    'upgrade-route': el => { const r = G.upgradeRoute(+el.dataset.e); toast(r.msg, r.ok ? 'good' : 'bad'); },
    'quest-claim': el => { const r = QU.claim(el.dataset.id); toast(r.ok ? 'Quest reward: +' + money(r.reward.cash) + '  +' + rp(r.reward.research) : r.msg, r.ok ? 'gold' : 'bad'); },
    'quest-reroll': el => { QU.rerollContract(el.dataset.id); },
    'goto-takeover': () => { const cand = G.takeoverTargets().filter(t => G.canLaunchTo(t).ok); if (cand.length) focusStar(cand[0]); },
    'toggle-sky': () => { ui.skyLayer = !ui.skyLayer; try { localStorage.setItem('firmament.skylayer', ui.skyLayer ? '1' : '0'); } catch (e) { /* private window */ } const b = $('#sky-btn'); if (b) b.classList.toggle('off', !ui.skyLayer); toast(ui.skyLayer ? 'Ecliptic and meteor shower radiants shown.' : 'Ecliptic and meteor shower radiants hidden.', 'good'); },
    'goto-shower': el => { const i = +el.dataset.i; closeModal(); ui.sel = { type: 'shower', i }; sky.goShower(i); if (!ui.skyLayer) runAct('toggle-sky'); },
    'toggle-borders': () => { ui.borders = !ui.borders; try { localStorage.setItem('firmament.borders', ui.borders ? '1' : '0'); } catch (e) { /* private window */ } const b = $('#borders-btn'); if (b) b.classList.toggle('off', !ui.borders); toast(ui.borders ? 'Empire borders shown.' : 'Empire borders hidden.', 'good'); },
    'quest-chapter': el => { ui.questChapter = el.dataset.chapter || null; },
    'quest-claim-all': () => {
      const L = QU.list(); let cash = 0, res = 0, n = 0;
      for (const q of L.contracts.concat(L.story)) if (q.done) { const r = QU.claim(q.id); if (r.ok) { cash += r.reward.cash; res += r.reward.research; n++; } }
      toast(n ? 'Claimed ' + plural(n, 'quest') + ': +' + money(cash) + '  +' + rp(res) : 'Nothing to claim yet.', n ? 'gold' : 'bad');
    },
    'school-start': el => { const topic = el.dataset.topic || null; ui.school = { view: 'q', round: QZ.startRound(el.dataset.cat, QZ.ROUND_LENGTH, { topic }), topic, shown: null, learned: [], levels: [] }; if (!ui.modal || ui.modal.id !== 'school') openModal(schoolSpec()); },
    'academy-practise': el => runAct('school-start', { cat: 'astro', topic: el.dataset.topic || '' }),
    'open-academy': el => { ui.academy.topic = el.dataset.topic || null; openCorp('academy'); },
    'academy-topic': el => { ui.academy.topic = el.dataset.topic; const b = $('#modal-body'); if (b) b.scrollTop = 0; },
    'academy-back': () => { ui.academy.topic = null; const b = $('#modal-body'); if (b) b.scrollTop = 0; },
    'school-review': () => startReview(),
    'school-answer': el => schoolAnswer(+el.dataset.i),
    'school-next': () => { const sc = ui.school; sc.shown = null; if (sc.round.done) sc.view = 'summary'; },
    'school-menu': () => { ui.school = { view: 'menu', round: null, shown: null, learned: [] }; }, 'close-modal': () => closeModal(),
    'tab': el => { ui.tab = el.dataset.tab; renderModal(); },
    'filter': el => { ui.filter[el.dataset.k] = el.dataset.v; renderModal(); },
    'zoom-in': () => sky.zoomBy(1.6), 'zoom-out': () => sky.zoomBy(1 / 1.6),
    'go-home': () => { const h = SKY.stars[G.state.home]; sky.goTo(h[1], h[2], 2.2, 0, !!ui.sel); },
    'close-panel': () => { ui.sel = null; },
    'sel-star': el => { ui.sel = { type: 'star', i: +el.dataset.i }; sky.goStar(+el.dataset.i, Math.max(sky.v.zoom, 3)); },
    'sel-messier': el => { ui.sel = { type: 'messier', i: +el.dataset.i }; sky.goMessier(+el.dataset.i); },
    'goto-star': el => { closeModal(); ui.sel = { type: 'star', i: +el.dataset.i }; sky.goStar(+el.dataset.i, 4); },
    'goto-messier': el => { closeModal(); ui.sel = { type: 'messier', i: +el.dataset.i }; sky.goMessier(+el.dataset.i); },
    'goto-const': el => { closeModal(); sky.goConst(+el.dataset.c); },
    'open-const': el => openConst(+el.dataset.c),
    'goto-full': () => gotoAttention('full'), 'goto-petition': () => gotoAttention('petition'), 'goto-frontier': () => gotoAttention('frontier'),
    'collect': el => { const r = G.collect(+el.dataset.i); if (r.ok) toast((r.flagship ? '★ ' : '') + '+' + money(r.gain) + (r.res >= 0.1 ? '  +' + rp(r.res) : '') + (r.flagship ? '  (dividend premium +' + money(r.bonus) + ')' : ''), 'gold'); else toast(r.msg, 'bad'); },
    'collect-const': el => { const r = G.collectConstellation(+el.dataset.c); toast('Collected ' + money(r.gain) + (r.res >= 0.1 ? ' and ' + rp(r.res) : '') + (r.kept ? '. The flagship keeps its own books: visit it to collect there.' : ''), 'gold'); },
    'upgrade': el => { const r = G.upgrade(+el.dataset.i, el.dataset.t); toast(r.msg, r.ok ? 'good' : 'bad'); },
    'launch': el => { const r = G.launch(+el.dataset.i); toast(r.msg, r.ok ? 'good' : 'bad'); },
    'cancel-order': el => { const r = G.cancelOrder(+el.dataset.id); toast(r.msg, r.ok ? 'good' : 'bad'); },
    'visit-m': el => { const r = G.visitMessier(+el.dataset.i); toast(r.msg, r.ok ? 'good' : 'bad'); },
    'develop-m': el => { const r = G.developMessier(+el.dataset.i); toast(r.msg, r.ok ? 'good' : 'bad'); },
    'dismiss-pet': el => G.dismissPetition(+el.dataset.id),
    'redraw-start': el => startRedraw(+el.dataset.id),
    'redraw-hint': () => { ui.hint = true; if (ui.redraw) G.useHint(ui.redraw.id); },
    'redraw-stop': () => stopRedraw(),
    'save-now': () => { autosave(); toast('Saved.', 'good'); renderModal(); },
    'slot-save': el => { writeKey(SLOT(+el.dataset.n)) ? toast('Saved to slot ' + el.dataset.n + '.', 'good') : flagSaveError(); renderModal(); },
    'slot-load': el => { const d = readKey(SLOT(+el.dataset.n)); if (d && confirm('Load slot ' + el.dataset.n + '? Unsaved progress will be lost.')) { closeModal(); beginSession(d, false); } },
    'export': () => { download('firmament-' + new Date().toISOString().slice(0, 10) + '.json', G.serialize()); },
    'reset': () => { if (confirm('Wind up this company and start again? Export first if you want a backup.')) { ui.started = false; /* stops the unload autosave from writing the old game back */ try { localStorage.removeItem(AUTOSAVE); } catch (e) { } closeModal(); location.reload(); } },
  };
  // after these actions the modal swaps itself, so it must not be re-rendered again by the click handler
  const NO_RERENDER = ['open-academy', 'academy-practise', 'open-const', 'tab', 'filter', 'goto-star', 'goto-messier', 'goto-const', 'goto-shower', 'close-modal', 'open-codex', 'open-menu', 'open-corp', 'open-corp-tech', 'open-learning', 'open-school', 'open-quests', 'open-fleets', 'school-review', 'slot-load', 'reset'];
  function afterAct(name) {
    if (!ui.started) return;
    scheduleSave(); renderHud(); renderPanel();
    if (ui.modal && !NO_RERENDER.includes(name)) renderModal();
  }
  function runAct(name, data) { const fn = ACT[name]; if (fn) { fn({ dataset: data || {} }); afterAct(name); } }
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACT[el.dataset.act];
    if (!fn) return;
    e.stopPropagation();
    fn(el);
    afterAct(el.dataset.act);
    if (e.detail > 0 && el.blur) el.blur(); // a mouse click must not leave a button focused, or Space/Enter would press it again
  });
  $('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') closeModal(); });

  // ---------------------------------------------------------------- keyboard shortcuts
  // Letters follow the keyboard layout (e.key); digits use the physical number row (e.code), so Shift+digit and AZERTY work.
  const KEY_HELP = [
    ['Windows (work anywhere)', [
      [['C'], 'Codex: constellations, Messier objects, named stars, your learning progress'],
      [['Q'], 'Quests and contracts'],
      [['S'], 'Sky School'],
      [['O'], 'Corporation overview'],
      [['T'], 'Technology tree'],
      [['B'], 'Buildings catalogue'],
      [['A'], 'Olympiad Academy: topics, levels and study pages'],
      [['F'], 'Fleets and queued charters'],
      [['?'], 'This list'],
      [['Esc'], 'Close the window, finish redrawing, or deselect. With nothing to close it opens the menu'],
    ]],
    ['Expand', [
      [['Space'], 'Send a colony ship to the selected star, survey the selected Messier object, or otherwise send a ship to the best-paying new star (next to the selected colony if one is selected)'],
      [['Shift', 'Space'], 'Send a ship to the best new star for every idle ship'],
      [['N'], 'Next free star to colonise (Shift+N: previous)'],
      [['X'], 'Next rival star next to your territory, to take over (Shift+X: previous)'],
      [['M'], 'Next Messier object in reach to survey (Shift+M: previous)'],
      [['G'], 'Next flagship or colony with cash waiting, the most first (Shift+G: previous)'],
      [['P'], 'Next petition'],
      [['H'], 'Go to headquarters (while redrawing: show hints)'],
    ]],
    ['At the selected colony', [
      [['R'], 'Collect revenue (Shift+R: the whole constellation, once it is developed)'],
      [['I'], 'Develop Industry'],
      [['L'], 'Develop Logistics'],
      [['D'], 'Develop R&D'],
      [['1', '…', '9', '0'], 'Build or upgrade the numbered building in the panel (the number is on its button)'],
    ]],
    ['Map', [
      [['←', '↑', '↓', '→'], 'Pan (hold Shift to go faster)'],
      [['+', '−'], 'Zoom'],
      [['V'], 'Show or hide empire borders (yours and the rivals’)'],
      [['Y'], 'Show or hide the ecliptic and the radiants of meteor showers'],
      [['E'], 'Redraw the routes cut by a comet or nova (press again, or Esc, to finish)'],
    ]],
    ['Inside windows', [
      [['←', '→'], 'Switch tabs'],
      [['1', '…', '6'], 'Codex and Menu: jump to a tab'],
      [['1', '…', '9'], 'Corporation → Technology: start the numbered project'],
      [['1', '…', '9', '0'], 'Corporation → Academy: practise the numbered topic (Space: everything, R: what is due, ⌫ leaves a study page, P practises it)'],
      [['R'], 'Codex → Learning, and the Sky School menu: review what is due'],
      [['Enter'], 'Quests: claim everything that is ready'],
      [['1', '…', '5'], 'Sky School menu: start a round. In a question: answer (1–4 or A–D)'],
      [['Space'], 'Sky School: next question, or another round'],
      [['⌫'], 'Sky School results, and a constellation page: back'],
    ]],
  ];
  const isTyping = el => !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
  const isButtonLike = el => !!el && /^(BUTTON|A|SUMMARY)$/.test(el.tagName);
  function digitOf(e) { // 0-9 from the number row or the numpad (with NumLock on)
    const m = /^(Digit|Numpad)(\d)$/.exec(e.code || '');
    return m && (m[1] === 'Digit' || /^\d$/.test(e.key)) ? +m[2] : -1;
  }
  const rowOf = d => (d + 9) % 10; // 1..9 then 0 are rows 1..10
  function moveAction(e) {
    switch (e.key) {
      case 'ArrowLeft': return 'left'; case 'ArrowRight': return 'right'; case 'ArrowUp': return 'up'; case 'ArrowDown': return 'down';
      case '+': case '=': return 'in'; case '-': case '_': return 'out';
    }
    return e.code === 'NumpadAdd' ? 'in' : e.code === 'NumpadSubtract' ? 'out' : null;
  }
  function handled(e) { e.preventDefault(); if (isButtonLike(document.activeElement)) document.activeElement.blur(); return true; }

  function cycleList(list, cur, dir) { // the item after (or before) cur in list; the first (last) one if cur is not in it; -1 when empty
    if (!list.length) return -1;
    const k = list.indexOf(cur);
    return list[k < 0 ? (dir > 0 ? 0 : list.length - 1) : (k + dir + list.length) % list.length];
  }
  function focusStar(i) { ui.sel = { type: 'star', i }; sky.goStar(i, Math.max(sky.v.zoom, 2.4)); }
  function focusMessier(m) { ui.sel = { type: 'messier', i: m }; sky.goMessier(m); }

  // Space: expand. A selected Messier object is surveyed (then studied in depth); a selected uncolonised star gets a ship (a charter if
  // every ship is out); otherwise the best-paying new star does, next to the selected colony if there is one. Shift+Space fills every idle ship.
  function expand(all) {
    const S = G.state, sel = ui.sel, idle = () => Math.max(0, G.d.slots - S.fleets.length);
    if (sel && sel.type === 'messier') {
      const m = sel.i;
      if (!S.messier[m]) { const r = G.visitMessier(m); toast(r.msg, r.ok ? 'good' : 'bad'); return; }
      if (!S.messier[m].dev) { const r = G.developMessier(m); toast(r.msg, r.ok ? 'good' : 'bad'); return; }
    }
    if (sel && sel.type === 'star' && !S.stars[sel.i] && !all) {
      const chk = G.canLaunchTo(sel.i);
      if (chk.ok) { const r = G.launch(sel.i); toast(r.msg, r.ok ? 'good' : 'bad'); return; }
      if (!G.targetsPending().has(sel.i)) { toast(chk.msg, 'bad'); return; } // otherwise a ship is already bound there: carry on to the next best star
    }
    if (idle() === 0) { toast('All ' + G.d.slots + ' ships are out. Select a star and press Space to queue a charter.', 'bad'); return; }
    const near = sel && sel.type === 'star' && S.stars[sel.i] ? sel.i : undefined;
    const sailsNow = x => G.frontierOrigins(x).length > 0; // next to a colony, so the ship can leave straight away
    const sent = [];
    do {
      const list = G.expansionTargets(near);
      if (!list.length) { if (!sent.length) toast('No free star to colonise: every one in reach is yours, a rival’s or has a ship bound for it.' + (ui.takeover.size ? ' Rival stars next to you can be taken over.' : ''), 'bad'); break; }
      let t = list.find(x => sailsNow(x) && G.canLaunchTo(x).ok);
      if (t === undefined && !all) t = list.find(x => G.canLaunchTo(x).ok); // one press may queue a charter along a chain
      if (t === undefined) { if (!sent.length) toast(G.canLaunchTo(list[0]).msg, 'bad'); break; }
      const r = G.launch(t);
      if (!r.ok) { if (!sent.length) toast(r.msg, 'bad'); break; }
      sent.push(t);
    } while (all && idle() > 0 && sent.length < 40);
    if (!sent.length) return;
    const last = sent[sent.length - 1];
    ui.sel = { type: 'star', i: last };
    if (!all) { sky.goStar(last, Math.max(sky.v.zoom, 2.4)); toast('Colony ship sent to ' + SKY.stars[last][6] + '.', 'good'); }
    else toast('Sent ' + plural(sent.length, 'colony ship') + ' to ' + sent.slice(0, 3).map(i => SKY.stars[i][6]).join(', ') + (sent.length > 3 ? ' …' : '') + '.', 'good');
  }

  function toggleModal(id, open) { if (ui.modal && ui.modal.id === id) closeModal(); else open(); }
  function toggleCorp(tab) { if (ui.modal && ui.modal.id === 'corp' && ui.tab === tab) closeModal(); else openCorp(tab); }
  function toggleMenu(tab) { if (ui.modal && ui.modal.id === 'menu' && ui.tab === tab) closeModal(); else openMenu(tab); }
  function windowKey(key) {
    switch (key) {
      case 'c': toggleModal('codex', () => openCodex()); return true;
      case 'q': toggleModal('quests', openQuests); return true;
      case 's': if (!(ui.modal && ui.modal.id === 'school' && ui.school.view === 'q')) toggleModal('school', openSchool); return true; // not in the middle of a round
      case 'o': toggleCorp('overview'); return true;
      case 't': toggleCorp('tech'); return true;
      case 'b': toggleCorp('buildings'); return true;
      case 'a': ui.academy.topic = null; toggleCorp('academy'); return true;
      case 'f': toggleModal('fleets', openFleets); return true;
      case '?': case '/': toggleMenu('keys'); return true;
    }
    return false;
  }
  function escapeKey() {
    if (ui.modal) closeModal();
    else if (ui.redraw) stopRedraw();
    else if (ui.sel) ui.sel = null;
    else openMenu();
  }
  function selectTab(k) { const m = ui.modal; if (m && m.tabs && m.tabs[k]) { ui.tab = m.tabs[k][0]; renderModal(); } }
  function shiftTab(dir) { const m = ui.modal; if (m && m.tabs) selectTab((m.tabs.findIndex(t => t[0] === ui.tab) + dir + m.tabs.length) % m.tabs.length); }

  function schoolKey(key, d) {
    const sc = ui.school;
    if (sc.view === 'menu') {
      if (d >= 1 && d <= SCHOOL_CATS.length) { runAct('school-start', { cat: SCHOOL_CATS[d - 1] }); return true; }
      if (key === 'r' && ['const', 'star', 'messier', 'astro'].some(c => QZ.progress(c).due)) { runAct('school-review'); return true; }
      return false;
    }
    if (sc.view === 'summary') {
      if (key === ' ' || key === 'Enter') { runAct('school-start', { cat: sc.round.cat, topic: sc.topic || '' }); return true; }
      if (key === 'Backspace' || key === 'ArrowLeft') { runAct('school-menu'); return true; }
      return false;
    }
    if (!sc.shown) { // a question: 1-4 or A-D answer it, and A-D never fall through to the window keys
      const q = sc.round.qs[sc.round.i], idx = d >= 1 && d <= 4 ? d - 1 : 'abcd'.indexOf(key.length === 1 ? key : '#');
      if (q && idx >= 0 && idx < q.options.length) { runAct('school-answer', { i: idx }); return true; }
      return key.length === 1 && 'abcd'.includes(key);
    }
    if (key === ' ' || key === 'Enter') { runAct('school-next'); return true; }
    return key.length === 1 && 'abcd'.includes(key);
  }
  function modalKey(key, d) {
    const m = ui.modal;
    if (m.id === 'school') return schoolKey(key, d);
    if (m.id === 'quests') { if (key === 'Enter' || key === 'a') { runAct('quest-claim-all'); return true; } return false; }
    if (m.id === 'const') { if (key === 'ArrowLeft' || key === 'Backspace') { openCodex(); return true; } return false; }
    if (m.tabs && m.tabs.length) {
      if (key === 'ArrowLeft' || key === 'ArrowRight') { shiftTab(key === 'ArrowRight' ? 1 : -1); return true; }
      if (m.id === 'corp' && ui.tab === 'academy') {
        const A = ui.academy;
        if (A.topic) { // a topic's study page
          if (key === 'Backspace') { runAct('academy-back'); return true; }
          if (key === 'p' || key === ' ' || key === 'Enter') { runAct('academy-practise', { topic: A.topic }); return true; }
        } else {
          if (d >= 0) { const t = Astro.TOPICS[rowOf(d)]; if (t) runAct('academy-practise', { topic: t.id }); else toast('There are ' + Astro.TOPICS.length + ' topics (1–9 and 0).', 'bad'); return true; }
          if (key === ' ' || key === 'Enter') { runAct('academy-practise', { topic: '' }); return true; }
          if (key === 'r') { if (QZ.progress('astro').due || ['const', 'star', 'messier'].some(c => QZ.progress(c).due)) runAct('school-review'); else toast('Nothing is due for review right now.', 'bad'); return true; }
        }
        return false;
      }
      if (m.id === 'corp' && ui.tab === 'tech' && d >= 0) {
        const t = G.TECHS.filter(x => G.techStatus(x.id) === 'available')[rowOf(d)];
        if (t) runAct('start-tech', { id: t.id }); else toast('No research project has that number.', 'bad');
        return true;
      }
      if (m.id === 'codex' && ui.tab === 'learning' && key === 'r') {
        if (['const', 'star', 'messier', 'astro'].some(c => QZ.progress(c).due)) runAct('school-review'); else toast('Nothing is due for review right now.', 'bad');
        return true;
      }
      if ((m.id === 'codex' || m.id === 'menu') && d >= 1 && d <= m.tabs.length) { selectTab(d - 1); return true; }
    }
    return false;
  }

  function mapKey(key, d, shift) {
    const S = G.state, sel = ui.sel;
    const colony = sel && sel.type === 'star' && S.stars[sel.i] ? sel.i : -1;
    const needColony = () => { if (colony >= 0) return true; toast('Select a colony first (G finds the fullest one, H goes to headquarters).', 'bad'); return false; };
    if (d >= 0) { // the numbered building rows of the selected colony
      if (!needColony()) return true;
      const rows = G.buildOptions(colony), r = rows[rowOf(d)];
      if (!rows.length) toast(G.slotsAt(colony) ? 'Nothing more to build here yet. Research technology to unlock buildings.' : 'No building slot yet: develop this colony to 3 levels.', 'bad');
      else if (!r) toast('This colony has ' + plural(rows.length, 'building option') + ' (' + (rows.length > 9 ? '1–9 and 0' : '1–' + rows.length) + ').', 'bad');
      else runAct('build', { i: colony, id: r.id });
      return true;
    }
    switch (key) {
      case ' ': expand(shift); return true;
      case 'n': { const t = cycleList(G.expansionTargets(), sel && sel.type === 'star' ? sel.i : -1, shift ? -1 : 1); if (t < 0) toast('No new star to colonise: every free star in reach has a ship bound for it' + (ui.takeover.size ? '. Rival stars next to you can be taken over (X).' : '.'), 'bad'); else focusStar(t); return true; }
      case 'x': { const t = cycleList(G.takeoverTargets(), sel && sel.type === 'star' ? sel.i : -1, shift ? -1 : 1); if (t < 0) toast('No rival holds a star next to your territory yet.', 'bad'); else focusStar(t); return true; }
      case 'v': runAct('toggle-borders'); return true;
      case 'y': runAct('toggle-sky'); return true;
      case 'm': { const m = cycleList(G.messierTargets(), sel && sel.type === 'messier' ? sel.i : -1, shift ? -1 : 1); if (m < 0) toast('No Messier object is in reach: colonise a star near one first.', 'bad'); else focusMessier(m); return true; }
      case 'g': { const t = cycleList(G.attention().map(a => a.star), colony, shift ? -1 : 1); if (t < 0) toast('No colony has full storage right now.', 'bad'); else focusStar(t); return true; }
      case 'p': { const t = cycleList(S.petitions.map(p => p.star), colony, shift ? -1 : 1); if (t < 0) toast('No colony has a petition right now.', 'bad'); else focusStar(t); return true; }
      case 'h': focusStar(S.home); return true;
      case 'r': {
        if (!needColony()) return true;
        if (shift) {
          const c = SKY.stars[colony][5];
          if (G.canCollectConstellation(c)) runAct('collect-const', { c }); else toast('Develop ' + SKY.consts[c].name + ' to unlock one-tap collection for the whole constellation.', 'bad');
        } else runAct('collect', { i: colony });
        return true;
      }
      case 'i': case 'l': case 'd': if (needColony()) runAct('upgrade', { i: colony, t: G.TRACKS['ild'.indexOf(key)] }); return true;
      case 'e': if (S.events.length) runAct('redraw-start', { id: S.events[0].id }); else toast('No comet or nova is cutting routes right now.', 'bad'); return true;
    }
    return false;
  }

  addEventListener('keydown', e => {
    ui.fast = e.shiftKey;
    if (!e.key || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const t = e.target;
    if (isTyping(t)) {
      if (e.key === 'Escape') t.blur();
      else if (e.key === 'Enter' && t.id === 'corp-rename') { e.preventDefault(); runAct('rename-corp'); }
      return;
    }
    if (!ui.started) {
      if (e.key === 'Enter' && !e.repeat && !isButtonLike(document.activeElement) && $('#start [data-act=continue]')) { e.preventDefault(); runAct('continue'); }
      return;
    }
    const kk = e.key, key = kk.length === 1 ? kk.toLowerCase() : kk, d = digitOf(e), shift = e.shiftKey, mv = moveAction(e);
    if (isButtonLike(document.activeElement) && (kk === ' ' || kk === 'Enter')) return; // a button reached with Tab keeps its own Space/Enter
    if (e.repeat) { if (mv && !ui.modal) e.preventDefault(); return; } // holding a key repeats nothing but the camera
    if (kk === 'Escape') { escapeKey(); handled(e); return; }
    if (ui.modal) { if (modalKey(key, d) || windowKey(key)) handled(e); return; }
    if (ui.redraw) {
      if (key === 'e') stopRedraw();
      else if (key === 'h') runAct('redraw-hint');
      else if (mv) ui.held.set(e.code, mv);
      else if (!windowKey(key)) return;
      handled(e); return;
    }
    if (mv) { ui.held.set(e.code, mv); handled(e); return; }
    if (mapKey(key, d, shift) || windowKey(key)) handled(e);
  });
  addEventListener('keyup', e => { ui.held.delete(e.code); ui.fast = e.shiftKey; });
  addEventListener('blur', () => ui.held.clear());

  // ---------------------------------------------------------------- log -> toasts
  function pumpLog() {
    const L = G.state.log;
    for (let k = Math.max(ui.lastLog, L.length - 4); k < L.length; k++) {
      const l = L[k];
      if (['claim', 'messier', 'dev', 'event', 'petition', 'event-done', 'tech', 'rank', 'market', 'rival', 'sky'].includes(l.kind) && k > 0) toast(l.text, l.kind === 'event' ? 'bad' : 'gold');
    }
    if (L.length !== ui.lastLog) scheduleSave();
    ui.lastLog = L.length;
  }

  // ---------------------------------------------------------------- main loop
  let last = Date.now(), sec = 0;
  function frame(now) {
    const wall = Date.now(), gap = Math.max(0, (wall - last) / 1000); last = wall;
    if (ui.started) {
      if (gap > 4) { const before = snapshot(); G.catchUp(gap); welcomeBack(gap, before); }
      else G.tick(Math.min(gap, 0.5), true);
      sec += gap;
      if (ui.flashes.length && now - ui.flashes[0].t > 1000) ui.flashes.shift();
      ui.frontier = G.frontier(); ui.takeover = new Set(G.takeoverTargets());
      if (ui.held.size && !ui.modal) { // arrow keys pan, + and - zoom, smoothly for as long as they are held
        const dt = Math.min(0.1, gap), acts = new Set(ui.held.values()), sp = (ui.fast ? 1600 : 650) * dt;
        const dx = (acts.has('left') ? 1 : 0) - (acts.has('right') ? 1 : 0), dy = (acts.has('up') ? 1 : 0) - (acts.has('down') ? 1 : 0), z = (acts.has('in') ? 1 : 0) - (acts.has('out') ? 1 : 0);
        if (dx || dy) sky.pan(dx * sp, dy * sp);
        if (z) sky.zoomBy(Math.pow(2.2, z * dt));
      }
      sky.render(now, ui);
      renderHud(); renderPanel(); renderBanner();
      if (sec > 1) {
        sec = 0; renderAttention();
        const typing = document.activeElement && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
        if (ui.modal && ((ui.modal.live && !(ui.modal.id === 'corp' && ui.tab === 'academy')) || (ui.modal.tabs && ui.tab === 'chron')) && !typing && !$('#modal-body :active')) renderModal();
      }
      pumpLog();
    } else sky.render(now, { sel: null, redraw: null, flashes: [], frontier: new Set(), takeover: new Set(), borders: true, skyLayer: true, hint: false, _idle: true });
    requestAnimationFrame(frame);
  }
  // where a selected star should land on screen so the side panel (desktop) or bottom sheet (phone) does not cover it
  function updateFocus() {
    const narrow = innerWidth <= 760;
    sky.setFocus(narrow ? 0.5 : Math.max(0.2, (innerWidth - 370) / 2 / innerWidth), narrow ? 0.27 : 0.5);
  }
  function resize() { sky.resize(); updateFocus(); }
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(); });
  addEventListener('pagehide', autosave);
  addEventListener('beforeunload', autosave);
  setInterval(autosave, 8000);

  // idle backdrop before a game starts: a standalone engine state so the renderer has something to read
  G.newGame(G.nameIdx.get('Sirius'));
  sky.setView(83, 5, 1.1);
  resize();
  ui.started = false;
  showStart();
  requestAnimationFrame(frame);
  window.__firmament = { G, sky, ui, QZ, QU };
})();
