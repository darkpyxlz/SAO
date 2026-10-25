/* Firmament UI: start screen, HUD, panels, codex, redraw mode, saves and the main loop. */
(function () {
  'use strict';
  const SKY = window.SKY;
  const G = Engine.create(SKY);
  const $ = s => document.querySelector(s);
  const canvas = $('#sky');
  const AUTOSAVE = 'firmament.autosave.v1';
  const SLOT = n => 'firmament.slot' + n + '.v1';

  const ui = { sel: null, redraw: null, hint: false, flashes: [], frontier: new Set(), started: false, modal: null, tab: null, filter: {}, lastPanel: '', lastLog: 0, hover: null };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => G.fmt(n);
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

  const QZ = Quiz.create(G);
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
    return n + ' stars · ' + m + ' Messier · ' + dev + ' developed · ' + tstr(state.saved);
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
      G.load(state);
      const before = snapshot();
      const away = Math.max(0, (Date.now() - state.saved) / 1000);
      G.catchUp(away);
      if (away > 60) welcomeBack(away, before);
    }
    ui.started = true; ui.lastLog = G.state.log.length;
    $('#start').hidden = true;
    ['#hud', '#zoomctl'].forEach(s => $(s).hidden = false);
    $('#attn').hidden = false;
    const h = SKY.stars[G.state.home];
    sky.setView(h[1], h[2], 2.2);
    if (isNew) { G.state.flags = { intro: 1 }; showIntro(); }
    autosave();
  }
  function snapshot() { const S = G.state; return { stars: Object.keys(S.stars).length, messier: Object.keys(S.messier).length, starlight: S.starlight }; }
  function welcomeBack(away, before) {
    const after = snapshot(), full = G.attention().length;
    const parts = [];
    if (after.stars > before.stars) parts.push('+' + (after.stars - before.stars) + ' stars claimed');
    if (after.messier > before.messier) parts.push('+' + (after.messier - before.messier) + ' Messier objects');
    if (full) parts.push(full + ' stockpiles ready');
    toast('Welcome back! Away ' + dur(away) + (parts.length ? ': ' + parts.join(', ') : '.'), 'gold');
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
        if (!st || st.version !== Engine.SAVE_VERSION || !st.stars) throw new Error('bad');
        then(st);
      } catch (e) { toast('That file is not a Firmament save.', 'bad'); }
    };
    r.readAsText(file);
  }

  // ---------------------------------------------------------------- start screen
  const HOMES = [
    ['Sirius', 'The brightest star in the night sky. Rich neighbours in Orion, Taurus and Gemini.'],
    ['Polaris', 'The North Star: the still point. Circles of the northern sky stretch out around it.'],
    ['Vega', 'Jewel of Lyra, and a short flight to the Summer Triangle.'],
    ['Acrux', 'Foot of the Southern Cross: a bright, crowded start deep in the south.'],
    ['Capella', 'A golden binary in Auriga, close to the winter hexagon.'],
    ['Arcturus', 'The orange giant of Boötes, a Spring-sky shepherd.'],
    ['Rigel', 'Blue supergiant at Orion’s foot: right next to the Hunter.'],
    ['Canopus', 'The southern navigator’s star, deep in Carina.'],
  ];
  function showStart() {
    const el = $('#start'); el.hidden = false;
    const auto = readKey(AUTOSAVE);
    let h = '<div class="inner"><h1>Firmament</h1><p class="tag">Claim the whole night sky, one star at a time. Fleets cross the real constellations, stars produce Starlight, trade routes link your empire, and every constellation and Messier object you complete is catalogued for good.</p>';
    if (auto) {
      h += '<div class="slot" style="max-width:560px"><div class="grow"><b>Continue your empire</b><div class="muted tiny">' + esc(summary(auto)) + '</div></div><button class="btn primary" data-act="continue">Continue</button></div><p></p>';
    }
    h += '<h3>' + (auto ? 'Or start a new empire' : 'Choose your first star') + '</h3><div class="homes">';
    for (const [name, txt] of HOMES) {
      const i = G.nameIdx.get(name); if (i === undefined) continue;
      const st = SKY.stars[i];
      h += '<button class="home" data-act="newgame" data-i="' + i + '"><b><span class="dot" style="background:' + rgbOf(i) + '"></span>' + esc(name) + '</b> <span class="muted tiny">' + esc(SKY.consts[st[5]].name) + ' · mag ' + st[3].toFixed(2) + '</span><small>' + esc(txt) + '</small></button>';
    }
    h += '</div><p><label class="btn small">Import a save file<input type="file" accept=".json,application/json" id="imp-start" hidden></label></p>';
    h += '<ul class="how"><li>Stars give <b class="gold">Starlight</b>, and fill a stockpile you collect by visiting them.</li><li>Spend it to send fleets along constellation lines and hyperlanes to claim neighbours.</li><li><b class="cyan">Observatories</b> gather Insight for Messier expeditions.</li><li>Neighbouring stars of different colours boost each other through trade routes.</li><li>Comets and novae cut routes. Redraw them from memory for a bonus.</li><li>Your progress saves in this browser. Menu → Export keeps a backup.</li></ul></div>';
    el.innerHTML = h;
    const imp = $('#imp-start');
    if (imp) imp.onchange = e => { if (e.target.files[0]) importFile(e.target.files[0], st => beginSession(st, false)); };
  }
  function showIntro() {
    toast('Tap a glowing ring to claim your first neighbour. Your home star is already making Starlight: tap it to collect.', 'gold');
    ui.sel = { type: 'star', i: G.state.home };
  }

  // ---------------------------------------------------------------- map interaction
  function handleMapClick(x, y) {
    if (!ui.started) return;
    const hit = sky.pick(x, y, matchMedia('(pointer:coarse)').matches);
    if (ui.redraw) { redrawClick(hit); return; }
    if (!hit) { ui.sel = null; return; }
    ui.sel = hit;
  }
  function handleHover(x, y) {
    if (!ui.started || matchMedia('(pointer:coarse)').matches) return;
    const hit = sky.pick(x, y, false);
    canvas.classList.toggle('pointing', !!hit);
    const tip = $('#tooltip');
    if (!hit) { tip.hidden = true; return; }
    const S = G.state;
    let t;
    if (hit.type === 'star') {
      const st = SKY.stars[hit.i];
      t = st[6] + ' · ' + SKY.consts[st[5]].id + ' · mag ' + st[3].toFixed(1) + (S.stars[hit.i] ? '' : ' · unclaimed');
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
      toast(r.done ? (r.perfect ? 'Perfect redraw! +' + fmt(r.gain + r.bonus) : 'All routes restored! +' + fmt(r.gain)) : 'Route restored  +' + fmt(r.gain), 'good');
    } else toast(r.msg, 'bad');
    if (!G.state.events.find(e => e.id === R.id)) stopRedraw();
  }

  // ---------------------------------------------------------------- pictures and figures
  function drawVisuals(root) {
    root.querySelectorAll('canvas[data-vis]').forEach(cv => {
      const [t, a, b] = cv.dataset.vis.split(':');
      if (t === 'figure') Sky.drawChart(cv, G, +a, { big: true, quiz: true });
      else if (t === 'marked') Sky.drawChart(cv, G, +a, { big: true, quiz: true, mark: +b });
      else if (t === 'messier') Pics.draw(cv, SKY.messier[+a]);
    });
  }

  // ---------------------------------------------------------------- panel
  let lastPanelHtml = '';
  const PERK_TXT = (k, v) => Engine && G.PERK_LABEL[k](v);
  function rateText(r) { return fmt(r * 3600) + '/h'; }

  function routeRows(i) {
    const S = G.state, D = G.d;
    let h = '';
    for (const { to, e } of G.adj[i]) {
      const cl = !!S.stars[to], lane = SKY.edges[e][2] < 0;
      const dis = D.dis[e];
      const comp = G.cls[i] !== G.cls[to];
      const tag = dis ? '<span class="badge red">cut</span>' : cl && S.stars[i] ? '<span class="badge ' + (comp ? 'green' : '') + '">' + (comp ? '+complementary' : '+same colour') + '</span>' : '';
      h += '<div class="row tiny"><span class="grow"><span class="dot" style="background:' + rgbOf(to) + '"></span><span class="link" data-act="sel-star" data-i="' + to + '">' + esc(SKY.stars[to][6]) + '</span> <span class="muted">' + G.edgeLen[e].toFixed(1) + '°' + (lane ? ' lane' : '') + '</span></span>' + (cl ? '' : '<span class="muted">○</span>') + tag + '</div>';
    }
    return h;
  }
  function petitionText(p) {
    if (p.type === 'upgrade') return 'Raise ' + G.TRACK_INFO[p.track].name + ' to level ' + p.level;
    if (p.type === 'expand') return 'Claim a neighbouring star';
    return 'Collect a stockpile that is at least ' + Math.round(p.fraction * 100) + '% full';
  }
  function starPanel(i) {
    const S = G.state, D = G.d, st = SKY.stars[i], s = S.stars[i], con = SKY.consts[st[5]];
    let h = '<div class="p-head"><h3>' + esc(st[6]) + '</h3><button class="x" data-act="close-panel" aria-label="Close">✕</button></div>';
    h += '<div class="p-sub"><span class="link" data-act="open-const" data-c="' + st[5] + '">' + esc(con.name) + '</span> · <span class="dot" style="background:' + rgbOf(i) + '"></span>' + CL[G.cls[i]] + ' · mag ' + st[3].toFixed(2) + (i === S.home ? ' · <span class="badge cyan">Home</span>' : '') + '</div>';
    if (!s) {
      const chk = G.canLaunchTo(i);
      const origins = G.frontierOrigins(i).map(o => ({ o, sec: G.travelSeconds(o.from, o.deg, false) })).sort((a, b) => a.sec - b.sec);
      const pend = G.targetsPending().has(i);
      h += '<div class="p-sec"><h4>Expansion</h4>';
      if (pend) h += '<div class="row"><span class="badge gold">A fleet is bound here</span></div>';
      else {
        h += '<div class="row"><span class="l">Cost</span><span class="grow"></span><b class="' + (S.starlight >= G.claimCost() ? 'gold' : 'bad') + '">✦ ' + fmt(G.claimCost()) + '</b></div>';
        if (origins.length) h += '<div class="row"><span class="l">Flight</span><span class="grow"></span><span>' + dur(origins[0].sec) + ' from ' + esc(SKY.stars[origins[0].o.from][6]) + '</span></div>';
        const flying = S.fleets.length >= D.slots;
        h += '<div class="row"><button class="btn primary grow" data-act="launch" data-i="' + i + '"' + (chk.ok ? '' : ' disabled') + '>' + (flying ? 'Queue order' : 'Send fleet') + '</button></div>';
        if (!chk.ok) h += '<div class="muted tiny">' + esc(chk.msg) + '</div>';
        else if (flying) h += '<div class="muted tiny">All ' + D.slots + ' fleets are out. The order is paid now and flies when one returns.</div>';
      }
      h += '</div><div class="p-sec"><h4>Routes</h4>' + routeRows(i) + '</div>';
      return h;
    }
    const cap = D.rate[i] * D.cap[i], icap = D.insRate[i] * D.cap[i];
    h += '<div class="p-sec"><h4>Stockpile</h4><div class="bar"><i data-lv="bar" style="width:0%"></i></div>';
    h += '<div class="row tiny"><span class="gold" data-lv="stock">✦ 0</span><span class="muted" data-lv="cap"></span><span class="grow"></span>' + (icap > 0 ? '<span class="cyan" data-lv="ins">◉ 0</span>' : '') + '</div>';
    h += '<div class="row"><button class="btn gold grow" data-act="collect" data-i="' + i + '">Collect</button></div>';
    h += '<div class="row tiny muted"><span class="grow">Output</span><span data-lv="rate"></span></div>';
    h += '<div class="muted tiny" data-lv="rbreak"></div></div>';
    // petition
    const pet = S.petitions.find(p => p.star === i);
    if (pet) h += '<div class="p-sec"><h4>Petition</h4><div class="row"><span class="grow">' + esc(petitionText(pet)) + '</span></div><div class="row tiny"><span class="gold">+' + fmt(pet.reward) + ' ✦</span><span class="cyan">+' + pet.insight + ' ◉</span><span class="grow"></span><button class="btn small ghost" data-act="dismiss-pet" data-id="' + pet.id + '">Dismiss</button></div></div>';
    // upgrades
    h += '<div class="p-sec"><h4>Development</h4>';
    for (const t of G.TRACKS) {
      const info = G.TRACK_INFO[t], L = s[t], max = L >= G.MAX_LEVEL;
      const cost = max ? 0 : G.upgradeCost(i, t);
      let pips = '<span class="pips">'; for (let k = 0; k < G.MAX_LEVEL; k++) pips += '<i class="' + (k < L ? 'on' : '') + '"></i>'; pips += '</span>';
      h += '<div class="row"><span style="width:84px"><b>' + info.name + '</b></span>' + pips + '<span class="grow"></span>' +
        (max ? '<span class="badge gold">max</span>' : '<button class="btn small" data-act="upgrade" data-i="' + i + '" data-t="' + t + '"' + (S.starlight >= cost ? '' : ' disabled') + '>✦ ' + fmt(cost) + '</button>') + '</div>';
      h += '<div class="muted tiny" style="margin:-3px 0 4px 0">' + esc(info.desc) + '</div>';
    }
    const lv = s.r + s.b + s.o;
    h += '<div class="muted tiny">Total ' + lv + ' · constellation counts as developed at ' + G.DEV_LEVELS + ' per star, mastered at ' + G.MASTER_LEVELS + '.</div></div>';
    // nearby messier
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
  function messierPanel(m) {
    const S = G.state, M = SKY.messier[m], vis = S.messier[m], con = SKY.consts[M.c];
    let h = '<div class="p-head"><h3>M' + M.n + (vis && M.alt ? ' · ' + esc(M.alt) : '') + '</h3><button class="x" data-act="close-panel" aria-label="Close">✕</button></div>';
    h += '<div class="p-sub">' + KIND_ICON[M.kind] + ' ' + M.tname + ' · <span class="link" data-act="open-const" data-c="' + M.c + '">' + esc(con.name) + '</span> · mag ' + M.mag + (M.dim ? ' · ' + M.dim + '′' : '') + '</div>';
    const [pk, pv] = G.MESSIER_PERK[M.kind];
    const dev = vis && vis.dev;
    if (vis) h += '<div class="p-pic"><canvas class="mpic" data-vis="messier:' + m + '"></canvas></div>';
    h += '<div class="p-sec"><h4>' + (vis ? 'Catalogued ' + dstr(vis.t) : 'Not yet visited') + '</h4>';
    if (vis && M.note) h += '<div class="lore">' + esc(M.note) + '</div>';
    h += '<div class="row"><span class="grow">' + esc(pk === 'slots' ? '+1 fleet slot per 3 globular clusters' : PERK_TXT(pk, pv * (dev ? 2 : 1))) + '</span>' + (dev ? '<span class="badge gold">doubled</span>' : '') + '</div>';
    if (!vis) {
      const chk = G.canVisitMessier(m), c = G.messierCost();
      const pend = S.fleets.some(f => f.kind === 'm' && f.to === m);
      if (pend) h += '<div class="row"><span class="badge cyan">Expedition under way</span></div>';
      else {
        h += '<div class="row tiny"><span class="cyan">◉ ' + fmt(c.insight) + '</span><span class="gold">✦ ' + fmt(c.starlight) + '</span><span class="grow"></span><button class="btn primary small" data-act="visit-m" data-i="' + m + '"' + (chk.ok ? '' : ' disabled') + '>Send expedition</button></div>';
        if (!chk.ok) h += '<div class="muted tiny">' + esc(chk.msg) + '</div>';
      }
    } else if (!dev) {
      const c = G.developMessierCost();
      h += '<div class="row tiny"><span class="muted">Study in depth</span><span class="cyan">◉ ' + fmt(c) + '</span><span class="grow"></span><button class="btn small" data-act="develop-m" data-i="' + m + '"' + (S.insight >= c ? '' : ' disabled') + '>Double bonus</button></div>';
    }
    h += '</div><div class="p-sec"><h4>Launch points</h4>';
    for (const s of M.links) h += '<div class="row tiny"><span class="grow"><span class="link" data-act="sel-star" data-i="' + s + '">' + esc(SKY.stars[s][6]) + '</span></span>' + (S.stars[s] ? '<span class="badge green">yours</span>' : '<span class="muted">○</span>') + '</div>';
    return h + '</div>';
  }
  function renderPanel() {
    const el = $('#panel');
    if (!ui.started || !ui.sel || ui.redraw) { el.hidden = true; document.body.classList.remove('has-panel'); lastPanelHtml = ''; return; }
    const html = ui.sel.type === 'star' ? starPanel(ui.sel.i) : messierPanel(ui.sel.i);
    if (html !== lastPanelHtml) { el.innerHTML = html; lastPanelHtml = html; drawVisuals(el); }
    el.hidden = false; document.body.classList.add('has-panel');
    // live values
    if (ui.sel.type === 'star' && G.state.stars[ui.sel.i]) {
      const i = ui.sel.i, s = G.state.stars[i], D = G.d;
      const cap = D.rate[i] * D.cap[i], icap = D.insRate[i] * D.cap[i];
      const q = k => el.querySelector('[data-lv="' + k + '"]');
      if (q('bar')) q('bar').style.width = (cap > 0 ? Math.min(100, s.s / cap * 100) : 0) + '%';
      if (q('stock')) q('stock').textContent = '✦ ' + fmt(s.s);
      if (q('cap')) q('cap').textContent = '/ ' + fmt(cap) + ' · full in ' + (s.s >= cap ? 'now' : dur((cap - s.s) / D.rate[i]));
      if (q('ins')) q('ins').textContent = '◉ ' + fmt(s.i) + ' / ' + fmt(icap);
      if (q('rate')) q('rate').textContent = '✦ ' + rateText(D.rate[i]);
      if (q('rbreak')) q('rbreak').textContent = 'base ' + rateText(G.baseRate[i]) + ' × radiance ' + (1 + 0.5 * s.r).toFixed(1) + ' × routes ' + D.routeMul[i].toFixed(2) + ' × empire ' + D.globalOut.toFixed(2);
    }
  }

  // ---------------------------------------------------------------- HUD, banner, attention
  let hudCache = {};
  function setText(sel, txt) { if (hudCache[sel] !== txt) { hudCache[sel] = txt; $(sel).textContent = txt; } }
  function renderHud() {
    const S = G.state, D = G.d;
    setText('#r-star', fmt(S.starlight)); setText('#r-star-rate', '+' + rateText(D.totalRate));
    setText('#r-ins', fmt(S.insight)); setText('#r-ins-rate', '+' + rateText(D.totalIns));
    setText('#r-fleet', S.fleets.length + '/' + D.slots); setText('#r-queue', S.orders.length ? S.orders.length + ' queued' : '');
  }
  let bannerHtml = '';
  function renderBanner() {
    const el = $('#banner'), S = G.state;
    let html = '', cls = '';
    if (ui.redraw) {
      const ev = S.events.find(e => e.id === ui.redraw.id);
      if (!ev) { stopRedraw(); return renderBanner(); }
      cls = 'redraw';
      html = '<div class="msg"><b>Redraw ' + esc(ev.name) + '</b><small>Tap two stars to reconnect the trade route between them. ' + ev.restored.length + '/' + ev.edges.length + ' restored · ' + ev.misses + ' miss' + (ev.misses === 1 ? '' : 'es') + ' · ' + dur(ev.remaining) + ' left' + (ui.hint ? ' · hints on (reward ÷4)' : '') + '</small></div><div class="btns"><button class="btn small" data-act="redraw-hint"' + (ui.hint ? ' disabled' : '') + '>Show hints</button><button class="btn small" data-act="redraw-stop">Done</button></div>';
    } else if (S.events.length) {
      const ev = S.events[0], left = ev.edges.length - ev.restored.length;
      html = '<div class="msg"><b>' + (ev.kind === 'comet' ? '☄ ' : '✸ ') + esc(ev.name) + '</b><small>' + ev.edges.length - ev.restored.length + ' trade route' + (ev.edges.length - ev.restored.length === 1 ? '' : 's') + ' cut near ' + esc(ev.where) + ' · ' + dur(ev.remaining) + ' (the clock only runs while you play)</small></div><div class="btns"><button class="btn small primary" data-act="redraw-start" data-id="' + ev.id + '">Redraw routes</button></div>';
    }
    if (html !== bannerHtml) { el.innerHTML = html; el.className = cls; el.hidden = !html; bannerHtml = html; document.body.classList.toggle('has-banner', !!html); }
  }
  let lastAttn = '';
  function renderAttention() {
    const S = G.state, D = G.d, el = $('#attn');
    const full = G.attention();
    const chips = [];
    if (S.events.length && !ui.redraw) chips.push('<span class="chip red" data-act="redraw-start" data-id="' + S.events[0].id + '">☄ routes cut</span>');
    if (full.length) chips.push('<span class="chip gold" data-act="goto-full">✦ ' + full.length + ' stockpile' + (full.length === 1 ? '' : 's') + ' full</span>');
    if (S.petitions.length) chips.push('<span class="chip cyan" data-act="goto-petition">✉ ' + S.petitions.length + ' petition' + (S.petitions.length === 1 ? '' : 's') + '</span>');
    const idle = Math.max(0, D.slots - S.fleets.length);
    const canGo = idle > 0 && [...ui.frontier].some(t => G.canLaunchTo(t).ok);
    if (canGo) chips.push('<span class="chip" data-act="goto-frontier">➤ ' + idle + ' fleet' + (idle === 1 ? '' : 's') + ' idle</span>');
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

  // ---------------------------------------------------------------- modal / codex
  function openModal(title, tabs, tab) {
    ui.modal = { title, tabs }; ui.tab = tab || (tabs && tabs[0] && tabs[0][0]) || null;
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
    (ui.modal.render || TAB_RENDER[ui.tab] || (() => ''))(body);
    if (ui.modal.keepScroll) body.scrollTop = keep;
  }
  const CODEX_TABS = [['const', 'Constellations'], ['messier', 'Messier'], ['stars', 'Named stars'], ['chron', 'Chronicle']];
  function openCodex(tab) {
    openModal('Codex', CODEX_TABS, tab || 'const');
  }

  function consBadge(cs) {
    return cs.mastered ? '<span class="badge gold">★ mastered</span>' : cs.developed ? '<span class="badge gold">developed</span>' : cs.all ? '<span class="badge green">claimed</span>' : cs.claimed ? '<span class="badge">' + cs.claimed + '/' + cs.total + '</span>' : '<span class="badge">unexplored</span>';
  }
  const TAB_RENDER = {
    const(body) {
      const f = ui.filter.const || 'all';
      const stats = { all: 0, claimed: 0, dev: 0, master: 0 };
      const rows = [];
      for (let c = 0; c < SKY.consts.length; c++) {
        const cs = G.consStatus(c);
        if (cs.claimed) stats.claimed++; if (cs.developed) stats.dev++; if (cs.mastered) stats.master++;
        rows.push([c, cs]);
      }
      let h = '<div class="stat-grid"><div class="stat"><b>' + stats.claimed + ' / 88</b><span>explored</span></div><div class="stat"><b class="gold">' + stats.dev + ' / 88</b><span>developed (every star claimed, ' + G.DEV_LEVELS + '+ levels each)</span></div><div class="stat"><b class="gold">' + stats.master + ' / 88</b><span>mastered (' + G.MASTER_LEVELS + '+ levels each)</span></div></div>';
      h += '<div class="filters">' + [['all', 'All'], ['part', 'In progress'], ['unexp', 'Unexplored'], ['dev', 'Developed'], ['master', 'Mastered']].map(([k, l]) => '<span class="chip ' + (f === k ? 'on' : '') + '" data-act="filter" data-k="const" data-v="' + k + '">' + l + '</span>').join('') + '</div><div class="grid">';
      for (const [c, cs] of rows) {
        if (f === 'part' && !(cs.claimed && !cs.developed)) continue;
        if (f === 'unexp' && cs.claimed) continue;
        if (f === 'dev' && !cs.developed) continue;
        if (f === 'master' && !cs.mastered) continue;
        h += '<div class="card ' + (cs.mastered ? 'master' : cs.developed ? 'dev' : cs.claimed ? '' : 'locked') + '" data-act="open-const" data-c="' + c + '"><canvas data-chart="' + c + '"></canvas><div class="t"><span>' + esc(SKY.consts[c].name) + '</span></div><div class="s">' + consBadge(cs) + (QZ.learned('const', c) ? ' <span class="badge cyan">learned</span>' : '') + '</div>' + (cs.developed ? '<span class="stamp">' + (cs.mastered ? '★' : '✦') + '</span>' : '') + '</div>';
      }
      body.innerHTML = h + '</div>';
      body.querySelectorAll('canvas[data-chart]').forEach(cv => Sky.drawChart(cv, G, +cv.dataset.chart));
    },
    messier(body) {
      const S = G.state, f = ui.filter.messier || 'all';
      const vis = Object.keys(S.messier).length;
      let h = '<div class="prog"><div class="row"><b>' + vis + ' / 110</b><span class="muted">catalogued</span><span class="grow"></span>' + (vis === 110 ? '<span class="badge gold">★ Messier Marathon complete</span>' : '') + '</div><div class="bar cy"><i style="width:' + (vis / 1.1) + '%"></i></div></div>';
      h += '<div class="filters">' + [['all', 'All'], ['seen', 'Catalogued'], ['todo', 'To visit'], ...Object.keys(KIND_NAMES).map(k => [k, KIND_NAMES[k]])].map(([k, l]) => '<span class="chip ' + (f === k ? 'on' : '') + '" data-act="filter" data-k="messier" data-v="' + k + '">' + l + '</span>').join('') + '</div><div class="mgrid">';
      SKY.messier.forEach((M, m) => {
        const v = S.messier[m], reach = G.messierAccess(m).length > 0;
        if (f === 'seen' && !v) return; if (f === 'todo' && v) return;
        if (KIND_NAMES[f] && M.kind !== f) return;
        h += '<div class="mcard ' + (v ? 'visited' : 'locked') + '" data-act="goto-messier" data-i="' + m + '"><div class="row"><span class="n">M' + M.n + '</span><span class="grow"></span><span>' + KIND_ICON[M.kind] + '</span></div>';
        if (v) h += '<canvas class="mthumb" data-vis="messier:' + m + '"></canvas><div><b>' + esc(M.alt || M.tname) + '</b>' + (QZ.learned('messier', m) ? ' <span class="badge cyan">learned</span>' : '') + '</div><div class="muted tiny">' + M.tname + ' · ' + esc(SKY.consts[M.c].name) + ' · mag ' + M.mag + '</div><div class="note">' + esc(M.note) + '</div><div class="row tiny">' + '<span class="muted">' + dstr(v.t) + '</span>' + (v.dev ? '<span class="badge gold">doubled</span>' : '') + '</div>';
        else h += '<div class="muted">' + M.tname + '</div><div class="muted tiny">' + (reach ? '<span class="good">reachable</span>' : 'beyond your reach') + '</div>';
        h += '</div>';
      });
      body.innerHTML = h + '</div>';
      drawVisuals(body);
    },
    stars(body) {
      const S = G.state;
      const named = SKY.stars.map((s, i) => i).filter(i => SKY.stars[i][7]).sort((a, b) => SKY.stars[a][3] - SKY.stars[b][3]);
      const got = named.filter(i => S.stars[i]);
      let h = '<div class="prog"><div class="row"><b>' + got.length + ' / ' + named.length + '</b><span class="muted">important stars claimed</span></div><div class="bar"><i style="width:' + (got.length / named.length * 100) + '%"></i></div></div>';
      h += '<div class="muted tiny" style="margin-bottom:8px">Only the brightest and most famous stars have proper names. Every other star is shown by its official designation (a Bayer letter such as \u03b2 Ori, a Flamsteed number such as 61 Cyg, or an HD / HIP catalogue number).</div>';
      h += '<table class="t"><tr><th>Name</th><th>Constellation</th><th>Class</th><th>Mag</th><th></th><th></th></tr>';
      for (const i of named) {
        const st = SKY.stars[i], cl = !!S.stars[i];
        h += '<tr class="click" data-act="goto-star" data-i="' + i + '"><td><span class="dot" style="background:' + rgbOf(i) + '"></span>' + esc(st[6]) + '</td><td class="muted">' + esc(SKY.consts[st[5]].name) + '</td><td>' + CL[G.cls[i]] + '</td><td>' + st[3].toFixed(2) + '</td><td>' + (cl ? '<span class="badge green">claimed</span>' : '<span class="badge">unclaimed</span>') + '</td><td>' + (QZ.learned('star', i) ? '<span class="badge cyan">learned</span>' : '') + '</td></tr>';
      }
      body.innerHTML = h + '</table>';
    },
    chron(body) {
      const S = G.state, st = S.stats;
      let h = '<div class="stat-grid">';
      const cards = [[Object.keys(S.stars).length + ' / ' + SKY.stars.length, 'stars claimed'], [Object.keys(S.messier).length + ' / 110', 'Messier catalogued'], [Object.keys(S.devConst).length + ' / 88', 'constellations developed'], [fmt(st.collected), 'Starlight collected'], [st.eventsDone, 'events resolved'], [st.perfect, 'perfect redraws'], [st.restoredRoutes, 'routes redrawn'], [st.petitionsDone, 'petitions answered'], [S.quiz.stats.answered ? Math.round(S.quiz.stats.correct / S.quiz.stats.answered * 100) + '%' : '·', 'quiz accuracy (' + S.quiz.stats.answered + ' answers)'], [S.quiz.stats.perfect, 'perfect quiz rounds'], [S.quiz.stats.bestStreak, 'best quiz streak'], [dur((Date.now() - S.created) / 1000), 'empire age']];
      cards.forEach(([b, l]) => h += '<div class="stat"><b>' + b + '</b><span>' + l + '</span></div>');
      h += '</div>';
      const devs = Object.keys(S.devConst).map(Number).sort((a, b) => S.devConst[a] - S.devConst[b]);
      if (devs.length) {
        h += '<h3>Developed constellations</h3><table class="t"><tr><th>Constellation</th><th>Developed</th><th>Mastered</th></tr>';
        for (const c of devs) h += '<tr class="click" data-act="open-const" data-c="' + c + '"><td>' + esc(SKY.consts[c].name) + '</td><td>' + dstr(S.devConst[c]) + '</td><td>' + (S.masterConst[c] ? '★ ' + dstr(S.masterConst[c]) : '<span class="muted">·</span>') + '</td></tr>';
        h += '</table>';
      }
      h += '<h3>Log</h3>';
      for (const l of S.log.slice(-120).reverse()) h += '<div class="logline ' + l.kind + '"><time>' + tstr(l.ts) + '</time><span>' + esc(l.text) + '</span></div>';
      body.innerHTML = h;
    },
  };

  function openConst(c) {
    const cons = SKY.consts[c];
    ui.modal = { title: cons.name, tabs: null, keepScroll: true, render: body => renderConstPage(body, c), cidx: c };
    ui.tab = null;
    $('#modal').hidden = false; renderModal();
  }
  let chartHit = [];
  function renderConstPage(body, c) {
    const S = G.state, cons = SKY.consts[c], cs = G.consStatus(c);
    const dev = cs.developed;
    let h = '<div class="cpage"><div><canvas class="big" id="cchart"></canvas><div class="muted tiny" style="margin-top:6px">Tap a star to find it on the map.</div></div><div>';
    h += '<div class="row"><button class="btn small" data-act="open-codex">\u2190 Codex</button><span class="muted">' + (cons.en !== cons.name ? esc(cons.en) : '') + '</span><span class="grow"></span>' + (QZ.learned('const', c) ? '<span class="badge cyan">learned</span> ' : '') + consBadge(cs) + '</div>';
    h += cs.claimed ? '<p class="lore">' + esc(cons.lore) + '</p>' : '<p class="lore locked-lore">Unexplored. Claim a star here to learn its story.</p>';
    h += '<div class="p-sec" style="padding:8px 0"><h4>Bonus</h4>';
    h += '<div class="row"><span class="grow">Developed: every star claimed with ' + G.DEV_LEVELS + '+ levels</span>' + (dev ? '<span class="badge gold">+' + (G.CFG.devBonus * 100).toFixed(1) + '% Starlight</span>' : '<span class="muted tiny">+' + (G.CFG.devBonus * 100).toFixed(1) + '%</span>') + '</div>';
    h += '<div class="row"><span class="grow">Mastered: ' + G.MASTER_LEVELS + '+ levels each</span>' + (cs.mastered ? '<span class="badge gold">+' + (G.CFG.masterBonus * 100).toFixed(1) + '% Starlight</span>' : '<span class="muted tiny">+' + (G.CFG.masterBonus * 100).toFixed(1) + '%</span>') + '</div>';
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
    if (ms.length) h += '<div class="p-sec" style="padding:8px 0"><h4>Messier objects</h4>' + ms.map(m => { const M = SKY.messier[m], v = S.messier[m]; return '<div class="row tiny"><span class="grow"><span class="link" data-act="goto-messier" data-i="' + m + '">M' + M.n + (v && M.alt ? ' ' + esc(M.alt) : '') + '</span> <span class="muted">' + M.tname + '</span></span>' + (v ? '<span class="badge cyan">catalogued</span>' : '') + '</div>'; }).join('') + '</div>';
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

  // ---------------------------------------------------------------- Sky School (minigames)
  ui.school = { view: 'menu', round: null, shown: null, learned: [] };
  function openSchool() {
    ui.school = { view: 'menu', round: null, shown: null, learned: [] };
    ui.modal = { title: 'Sky School', tabs: null, render: renderSchool }; ui.tab = null;
    $('#modal').hidden = false; renderModal();
  }
  const LETTERS = ['A', 'B', 'C', 'D'];
  function renderSchool(body) {
    const sc = ui.school, S = G.state, st = S.quiz.stats;
    if (sc.view === 'menu') {
      const base = QZ.rewardBase();
      let h = '<p class="muted" style="margin-top:0;max-width:640px">Short rounds of five questions. Every correct answer pays Starlight and Insight worth about ' + QZ.REWARD.seconds / 60 + ' minutes of your income, <b>×' + QZ.REWARD.firstTime + '</b> the first time you get something right, plus a streak bonus and <b>+' + QZ.REWARD.perfectBonus * 100 + '%</b> for a perfect round. Answering something you already know pays half, and only a trickle if you answered it in the last 6 hours. Get something right twice and it is marked <span class="badge cyan">learned</span> in the codex.</p>';
      h += '<div class="stat-grid"><div class="stat"><b>' + st.answered + '</b><span>answered</span></div><div class="stat"><b>' + (st.answered ? Math.round(st.correct / st.answered * 100) + '%' : '·') + '</b><span>accuracy</span></div><div class="stat"><b>' + st.bestStreak + '</b><span>best streak</span></div><div class="stat"><b>' + st.perfect + ' / ' + st.rounds + '</b><span>perfect rounds</span></div><div class="stat"><b class="gold">✦ ' + fmt(base.starlight) + '</b><span>per correct answer now</span></div></div>';
      h += '<div class="school-cats">';
      for (const cat of ['const', 'star', 'messier', 'mixed']) {
        const info = Quiz.CATS[cat], pr = cat === 'mixed' ? null : QZ.progress(cat);
        h += '<button class="school-cat" data-act="school-start" data-cat="' + cat + '"><b>' + info.name + '</b><span class="muted">' + info.blurb + '</span>' + (pr ? '<span class="tiny ' + (pr.learned ? 'cyan' : 'muted') + '">learned ' + pr.learned + ' / ' + pr.total + (pr.extra ? ' (+' + pr.extra + ' designations)' : '') + '</span>' : '<span class="tiny muted">all three kinds</span>') + '</button>';
      }
      body.innerHTML = h + '</div>';
      return;
    }
    const r = sc.round;
    if (sc.view === 'summary') {
      const perfect = r.correct === r.qs.length;
      let h = '<div class="school-sum"><h3 style="margin-top:0">' + (perfect ? '★ Perfect round!' : r.correct + ' of ' + r.qs.length + ' correct') + '</h3>';
      h += '<div class="stat-grid"><div class="stat"><b class="gold">✦ ' + fmt(r.earned.starlight + (r.bonus ? r.bonus.starlight : 0)) + '</b><span>Starlight earned</span></div><div class="stat"><b class="cyan">◉ ' + fmt(r.earned.insight + (r.bonus ? r.bonus.insight : 0)) + '</b><span>Insight earned</span></div><div class="stat"><b>' + r.best + '</b><span>best streak</span></div></div>';
      if (r.bonus) h += '<p class="good">Perfect-round bonus included: +' + fmt(r.bonus.starlight) + ' ✦ and +' + fmt(r.bonus.insight) + ' ◉.</p>';
      if (sc.learned.length) h += '<p class="cyan">Newly learned: ' + sc.learned.map(esc).join(', ') + '</p>';
      h += '<div class="row"><button class="btn primary" data-act="school-start" data-cat="' + r.cat + '">Another round</button><button class="btn" data-act="school-menu">Back to Sky School</button></div></div>';
      body.innerHTML = h; return;
    }
    // a question (r.i has already advanced once an answer is showing)
    const shown = sc.shown;
    const idx = shown ? r.i - 1 : r.i;
    const Q = r.qs[idx];
    let h = '<div class="row tiny muted"><span>Question ' + (idx + 1) + ' / ' + r.qs.length + '</span><span class="grow"></span><span>streak ' + r.streak + '</span><span class="gold">✦ ' + fmt(r.earned.starlight) + '</span><span class="cyan">◉ ' + fmt(r.earned.insight) + '</span></div>';
    h += '<h3 class="qprompt">' + esc(Q.prompt) + '</h3>';
    if (Q.quote) h += '<blockquote class="lore">' + esc(Q.quote) + '</blockquote>';
    if (Q.visual) h += '<canvas class="qvis' + (Q.visual.type === 'messier' ? ' pic' : '') + '" data-vis="' + Q.visual.type + ':' + (Q.visual.type === 'messier' ? Q.visual.m : Q.visual.c) + (Q.visual.type === 'marked' ? ':' + Q.visual.star : '') + '"></canvas>';
    const visual = Q.options.some(o => o.visual);
    h += '<div class="' + (visual ? 'qgrid' : 'qlist') + '">';
    Q.options.forEach((o, k) => {
      let cls = 'qopt';
      if (shown) cls += k === Q.answer ? ' correct' : k === shown.choice ? ' wrong' : ' dim';
      h += '<button class="' + cls + '" data-act="school-answer" data-i="' + k + '"' + (shown ? ' disabled' : '') + '>';
      if (o.visual) h += '<canvas class="qthumb' + (o.visual.type === 'messier' ? ' pic' : '') + '" data-vis="' + o.visual.type + ':' + (o.visual.type === 'messier' ? o.visual.m : o.visual.c) + '"></canvas>';
      h += '<span class="ql">' + LETTERS[k] + '</span>' + (visual && !shown ? '' : '<span class="qt">' + esc(o.text) + '</span>');
      h += '</button>';
    });
    h += '</div>';
    if (shown) {
      const res = shown.res;
      h += '<div class="qfeed ' + (res.correct ? 'ok' : 'no') + '"><b>' + (res.correct ? '✓ Correct' : '✗ Not quite: the answer is ' + esc(Q.options[Q.answer].text)) + '</b>';
      if (res.correct) h += ' <span class="gold">+' + fmt(res.reward.starlight) + ' ✦</span> <span class="cyan">+' + fmt(res.reward.insight) + ' ◉</span> <span class="muted tiny">' + (res.reward.item >= 2 ? 'first time ×' + res.reward.item : 'repeat ×' + res.reward.item) + (res.reward.streak > 1 ? ' · streak ×' + res.reward.streak.toFixed(1) : '') + '</span>';
      h += '<div class="tiny" style="margin-top:4px">' + esc(Q.explain) + '</div>';
      h += '<div class="row" style="margin-top:8px"><button class="btn primary" data-act="school-next">' + (res.last ? 'See results' : 'Next question') + '</button></div></div>';
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
      sc.learned.push(s.cat === 'const' ? SKY.consts[s.id].name : s.cat === 'star' ? SKY.stars[s.id][6] : 'M' + SKY.messier[s.id].n);
      toast('Learned: ' + sc.learned[sc.learned.length - 1], 'good');
    }
    sc.shown = { choice: k, res };
  }

  // ---------------------------------------------------------------- fleets & orders
  function openFleets() { ui.modal = { title: 'Fleets & orders', tabs: null, render: renderFleets }; ui.tab = null; $('#modal').hidden = false; renderModal(); }
  function renderFleets(body) {
    const S = G.state, D = G.d;
    let h = '<div class="muted" style="margin-bottom:10px">' + S.fleets.length + ' of ' + D.slots + ' fleets out. More slots come from Beacon levels, Arcturus, the Orion\u2019s Belt set and globular clusters.</div><h3 style="margin-top:0">In flight</h3>';
    if (!S.fleets.length) h += '<div class="muted">None.</div>';
    for (const f of S.fleets) {
      const to = f.kind === 's' ? SKY.stars[f.to][6] : 'M' + SKY.messier[f.to].n;
      h += '<div class="row"><span class="grow">' + (f.kind === 'm' ? '<span class="cyan">expedition</span>' : 'fleet') + ' <span class="muted">from</span> ' + esc(SKY.stars[f.from][6]) + ' <span class="muted">to</span> <span class="link" data-act="' + (f.kind === 's' ? 'goto-star' : 'goto-messier') + '" data-i="' + f.to + '">' + esc(to) + '</span></span><span class="muted">' + dur(f.remaining) + '</span></div>';
    }
    h += '<h3>Queued orders</h3>';
    if (!S.orders.length) h += '<div class="muted">None. Select an unclaimed star while all fleets are out to queue an order.</div>';
    for (const o of S.orders) h += '<div class="row"><span class="grow">claim <span class="link" data-act="goto-star" data-i="' + o.to + '">' + esc(SKY.stars[o.to][6]) + '</span> <span class="muted">in ' + esc(SKY.consts[SKY.stars[o.to][5]].name) + '</span></span><span class="gold">\u2726 ' + fmt(o.paid) + '</span><button class="btn small" data-act="cancel-order" data-id="' + o.id + '">Cancel</button></div>';
    body.innerHTML = h;
  }

  // ---------------------------------------------------------------- menu
  function slotHtml(n) {
    const d = readKey(SLOT(n));
    return '<div class="slot"><div class="grow"><b>Slot ' + n + '</b><div class="muted tiny">' + (d ? esc(summary(d)) : 'empty') + '</div></div><button class="btn small" data-act="slot-save" data-n="' + n + '">Save</button><button class="btn small" data-act="slot-load" data-n="' + n + '"' + (d ? '' : ' disabled') + '>Load</button></div>';
  }
  const MENU_TABS = [['save', 'Save'], ['guide', 'How to play'], ['about', 'About']];
  function openMenu() { ui.modal = { title: 'Menu', tabs: MENU_TABS, render: body => MENU_RENDER[ui.tab](body) }; ui.tab = 'save'; $('#modal').hidden = false; renderModal(); }
  const MENU_RENDER = {
    save(body) {
      let h = '<div class="menu-list"><div class="muted">Your empire autosaves in this browser every few seconds. Use slots or an exported file for extra safety.</div>';
      h += '<div class="slot"><div class="grow"><b>Autosave</b><div class="muted tiny">' + esc(summary(G.state)) + '</div></div><button class="btn small" data-act="save-now">Save now</button></div>';
      h += [1, 2, 3].map(slotHtml).join('');
      h += '<div class="row"><button class="btn" data-act="export">Export save file</button><label class="btn">Import save file<input type="file" accept=".json,application/json" id="imp-menu" hidden></label></div>';
      h += '<div class="row"><button class="btn bad" data-act="reset">Abandon this empire…</button></div></div>';
      body.innerHTML = h;
      $('#imp-menu').onchange = e => { if (e.target.files[0]) importFile(e.target.files[0], st => { if (confirm('Replace your current empire with this save?')) { closeModal(); beginSession(st, false); } }); };
    },
    guide(body) {
      body.innerHTML = '<div class="how" style="max-width:720px"><h3 style="margin-top:0">Goal</h3><p>Claim every star on the constellation stick figures, develop every constellation and catalogue all 110 Messier objects. The map is one flat sky that wraps left to right: drag to pan, scroll or pinch to zoom.</p>' +
        '<h3>Core loop</h3><ul><li><b class="gold">Starlight ✦</b> is made by every claimed star. It fills that star’s stockpile: <b>tap the star and Collect</b> (stockpiles stop growing when full, so visit often; red-orange stars hold the most).</li>' +
        '<li><b>Claim</b> a new star: select an unclaimed star next to your territory (ringed in blue) and send a fleet. Orders are paid up front and fly as soon as a fleet is free, even while you are away.</li>' +
        '<li><b>Develop</b> stars with Radiance (more Starlight), Beacon (faster fleets, stronger routes, more fleet slots) and Observatory (Insight ◉).</li>' +
        '<li><b>Trade routes</b>: neighbouring claimed stars boost each other, more when their colours differ.</li>' +
        '<li><b class="cyan">Messier objects</b> need a claimed star nearby and Insight. Each gives a bonus by type (globulars: fleet slots, open clusters: Starlight, nebulae: Insight, galaxies: speed).</li>' +
        '<li><b>Developed constellation</b>: every star claimed and at least ' + G.DEV_LEVELS + ' upgrade levels each. It is stamped in the Codex and unlocks one-tap collection there. <b>Mastered</b> at ' + G.MASTER_LEVELS + '.</li></ul>' +
        '<h3>Sky School</h3><p>Open <b>Sky School</b> for five-question rounds that name constellations from their figures, mark stars, tell colours and brightness, and identify Messier objects by picture and type. Correct answers pay Starlight and Insight (first discoveries pay the most), and things you get right twice are marked <b>learned</b>. The Messier pictures are illustrations of each object type, not photographs.</p>' +
        '<h3>Comets and novae</h3><p>Now and then a comet or nova cuts some of your trade routes. Press <b>Redraw routes</b> and tap two stars to rebuild each missing line from memory. Correct lines pay out; wrong guesses cost accuracy; hints work but pay a quarter. If you ignore it the routes drift back by themselves. Event clocks only run while the game is open, so nothing expires while you are away.</p>' +
        '<h3>Petitions</h3><p>Stars sometimes ask for an upgrade, an expansion or a visit, and reward you for answering. They are never penalties. Nothing in this game dims, decays or is taken from you.</p></div>';
    },
    about(body) {
      body.innerHTML = '<div class="how" style="max-width:720px"><h3 style="margin-top:0">Firmament</h3><p>An incremental empire game on the real night sky. All positions, brightnesses and colours are real; travel times and economics are invented.</p>' +
        '<p>Star positions, names and constellation figures come from the open <a class="link" href="https://github.com/ofrohn/d3-celestial" target="_blank" rel="noopener">d3-celestial</a> data set (derived from the Hipparcos catalogue, IAU star names and Stellarium constellation lines). Messier data likewise. See THIRD_PARTY.md in the repository.</p>' +
        '<p>' + SKY.stars.length + ' stars · ' + SKY.edges.length + ' routes · 88 constellations · 110 Messier objects.</p></div>';
    },
  };

  // ---------------------------------------------------------------- actions
  const ACT = {
    'continue': () => { const s = readKey(AUTOSAVE); if (s) beginSession(s, false); },
    'newgame': el => { G.newGame(+el.dataset.i); beginSession(G.state, true); },
    'open-codex': () => openCodex(), 'open-menu': () => openMenu(), 'open-fleets': () => openFleets(), 'open-school': () => openSchool(),
    'school-start': el => { ui.school = { view: 'q', round: QZ.startRound(el.dataset.cat), shown: null, learned: [] }; },
    'school-answer': el => schoolAnswer(+el.dataset.i),
    'school-next': () => { const sc = ui.school; sc.shown = null; if (sc.round.done) sc.view = 'summary'; },
    'school-menu': () => { ui.school = { view: 'menu', round: null, shown: null, learned: [] }; }, 'close-modal': () => closeModal(),
    'tab': el => { ui.tab = el.dataset.tab; renderModal(); },
    'filter': el => { ui.filter[el.dataset.k] = el.dataset.v; renderModal(); },
    'zoom-in': () => sky.zoomBy(1.6), 'zoom-out': () => sky.zoomBy(1 / 1.6),
    'go-home': () => { const h = SKY.stars[G.state.home]; sky.goTo(h[1], h[2], 2.2); },
    'close-panel': () => { ui.sel = null; },
    'sel-star': el => { ui.sel = { type: 'star', i: +el.dataset.i }; sky.goStar(+el.dataset.i, Math.max(sky.v.zoom, 3)); },
    'sel-messier': el => { ui.sel = { type: 'messier', i: +el.dataset.i }; sky.goMessier(+el.dataset.i); },
    'goto-star': el => { closeModal(); ui.sel = { type: 'star', i: +el.dataset.i }; sky.goStar(+el.dataset.i, 4); },
    'goto-messier': el => { closeModal(); ui.sel = { type: 'messier', i: +el.dataset.i }; sky.goMessier(+el.dataset.i); },
    'goto-const': el => { closeModal(); sky.goConst(+el.dataset.c); },
    'open-const': el => openConst(+el.dataset.c),
    'goto-full': () => gotoAttention('full'), 'goto-petition': () => gotoAttention('petition'), 'goto-frontier': () => gotoAttention('frontier'),
    'collect': el => { const r = G.collect(+el.dataset.i); if (r.ok) toast('+' + fmt(r.gain) + ' ✦' + (r.ins >= 0.1 ? '  +' + fmt(r.ins) + ' ◉' : ''), 'gold'); else toast(r.msg, 'bad'); },
    'collect-const': el => { const r = G.collectConstellation(+el.dataset.c); toast('Collected ' + fmt(r.gain) + ' ✦' + (r.ins >= 0.1 ? ' and ' + fmt(r.ins) + ' ◉' : ''), 'gold'); },
    'upgrade': el => { const r = G.upgrade(+el.dataset.i, el.dataset.t); toast(r.ok ? r.msg : r.msg, r.ok ? 'good' : 'bad'); },
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
    'reset': () => { if (confirm('Abandon this empire and start again? Export first if you want a backup.')) { try { localStorage.removeItem(AUTOSAVE); } catch (e) { } closeModal(); location.reload(); } },
  };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = ACT[el.dataset.act];
    if (!fn) return;
    e.stopPropagation();
    fn(el);
    if (ui.started) { scheduleSave(); renderHud(); renderPanel(); if (ui.modal && !['open-const', 'tab', 'filter', 'goto-star', 'goto-messier', 'goto-const', 'close-modal', 'open-codex', 'open-menu', 'slot-load', 'reset'].includes(el.dataset.act)) renderModal(); }
  });
  $('#modal').addEventListener('pointerdown', e => { if (e.target.id === 'modal') closeModal(); });
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (ui.modal) closeModal(); else if (ui.redraw) stopRedraw(); else ui.sel = null; }
    else if (ui.started && !ui.modal && (e.key === 'c' || e.key === 'C') && !/^(INPUT|TEXTAREA)$/.test((e.target.tagName || ''))) openCodex();
  });

  // ---------------------------------------------------------------- log -> toasts
  function pumpLog() {
    const L = G.state.log;
    for (let k = Math.max(ui.lastLog, L.length - 4); k < L.length; k++) {
      const l = L[k];
      if (['claim', 'messier', 'dev', 'event', 'petition', 'event-done'].includes(l.kind) && k > 0) toast(l.text, l.kind === 'event' ? 'bad' : 'gold');
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
      ui.frontier = G.frontier();
      sky.render(now, ui);
      renderHud(); renderPanel(); renderBanner();
      if (sec > 1) { sec = 0; renderAttention(); if (ui.modal && ui.modal.tabs && ui.tab === 'chron') renderModal(); }
      pumpLog();
    } else sky.render(now, { sel: null, redraw: null, flashes: [], frontier: new Set(), hint: false, _idle: true });
    requestAnimationFrame(frame);
  }
  function resize() { sky.resize(); }
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
  window.__firmament = { G, sky, ui };
})();
