/* Firmament game engine: pure logic, no DOM. Works in the browser (window.Engine) and in Node (tests). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RAD = Math.PI / 180;
  const SAVE_VERSION = 2;
  const TRACKS = ['r', 'b', 'o'];
  const TRACK_INFO = {
    r: { name: 'Radiance', short: 'Rad', desc: 'More Starlight from this star.', base: 50, grow: 2.0 },
    b: { name: 'Beacon', short: 'Bea', desc: 'Faster fleets from here, stronger trade routes, more fleet slots.', base: 80, grow: 2.1 },
    o: { name: 'Observatory', short: 'Obs', desc: 'Gathers Insight, used for Messier expeditions.', base: 120, grow: 2.2 },
  };
  const MAX_LEVEL = 5;
  const CLASS_NAMES = ['Blue-white', 'Yellow', 'Orange-red'];
  const CLASS_RATE = [1.3, 1.0, 0.8];
  const CLASS_CAP_H = [5, 8, 14]; // hours of stockpile a star can hold
  const DEV_LEVELS = 3;   // total upgrade levels per star for a "developed" constellation
  const MASTER_LEVELS = 9; // ... and for a "mastered" one

  const CFG = {
    startStarlight: 100, baseOutput: 0.39,
    secPerDeg: 3,
    messierTravelMul: 1.5,
    baseSlots: 3,
    claimBase: 25, claimScale: 9, claimPow: 1.6, claimRamp: 14,
    upgradeSize: 0.03,
    messierInsightBase: 30, messierInsightStep: 6,
    messierStarlightFrac: 0.5,
    developMessierBase: 80, developMessierStep: 4,
    routeBonusComp: 0.12, routeBonusSame: 0.05, routeBeaconMul: 0.25,
    beaconSpeed: 0.07, speedFloor: 0.25,
    insightPerObs: 0.024,
    devBonus: 0.015, masterBonus: 0.025,
    eventMinRoutes: 8, eventFirstDelay: [150, 300], eventGap: [450, 900],
    cometSeconds: 900, novaSeconds: 1500,
    redrawBase: 60, redrawPerStar: 6,
    petitionGap: [240, 480], petitionMax: 3, orderMax: 40,
    maxOfflineSeconds: 60 * 86400,
    logMax: 250,
  };

  const PERK_LABEL = {
    out: v => '+' + pct(v) + ' Starlight', speed: v => '−' + pct(v) + ' fleet travel time', slots: v => '+' + v + ' fleet slot' + (v === 1 ? '' : 's'),
    ins: v => '+' + pct(v) + ' Insight', cost: v => '−' + pct(v) + ' costs', cap: v => '+' + pct(v) + ' stockpile size', ev: v => '+' + pct(v) + ' event rewards',
  };
  function pct(v) { return Math.round(v * 1000) / 10 + '%'; }

  const MESSIER_PERK = {
    globular: ['slots', 1 / 3], open: ['out', 0.02], nebula: ['ins', 0.04], galaxy: ['speed', 0.015], other: ['cost', 0.01],
  };

  const key = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  function sepDeg(a, b) { // a, b: [.., ra, dec] star arrays or {ra,dec}
    const ra1 = a.ra !== undefined ? a.ra : a[1], de1 = a.dec !== undefined ? a.dec : a[2];
    const ra2 = b.ra !== undefined ? b.ra : b[1], de2 = b.dec !== undefined ? b.dec : b[2];
    const d = Math.sin(de1 * RAD) * Math.sin(de2 * RAD) + Math.cos(de1 * RAD) * Math.cos(de2 * RAD) * Math.cos((ra1 - ra2) * RAD);
    return Math.acos(Math.max(-1, Math.min(1, d))) / RAD;
  }

  function create(SKY, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const nowFn = opts.now || Date.now;
    const N = SKY.stars.length;
    const NC = SKY.consts.length;
    const NM = SKY.messier.length;

    // ---- static tables
    const adj = Array.from({ length: N }, () => []);
    const edgeIdx = new Map();
    SKY.edges.forEach((e, i) => { adj[e[0]].push({ to: e[1], e: i }); adj[e[1]].push({ to: e[0], e: i }); edgeIdx.set(key(e[0], e[1]), i); });
    const edgeLen = SKY.edges.map(e => sepDeg(SKY.stars[e[0]], SKY.stars[e[1]]));
    const cls = SKY.stars.map(s => (s[4] < 0.3 ? 0 : s[4] < 0.8 ? 1 : 2));
    const baseRate = SKY.stars.map((s, i) => CFG.baseOutput * Math.pow(10, -0.1 * s[3]) * CLASS_RATE[cls[i]]);
    const nameIdx = new Map(SKY.stars.map((s, i) => [s[6], i]));
    // constellations that touch each other (for the codex)
    const consNeighbours = Array.from({ length: NC }, () => new Set());
    SKY.edges.forEach(e => {
      const a = SKY.stars[e[0]][5], b = SKY.stars[e[1]][5];
      if (a !== b) { consNeighbours[a].add(b); consNeighbours[b].add(a); }
    });
    const messierByConst = Array.from({ length: NC }, () => []);
    SKY.messier.forEach((m, i) => messierByConst[m.c].push(i));
    const messierFrom = Array.from({ length: N }, () => []);
    SKY.messier.forEach((m, i) => m.links.forEach(s => messierFrom[s].push(i)));

    // ---- state
    let S = null;
    let D = null; // derived

    function blankQuiz() { return { const: {}, star: {}, messier: {}, stats: { answered: 0, correct: 0, rounds: 0, perfect: 0, bestStreak: 0 } }; }
    function blankState(home) {
      return {
        version: SAVE_VERSION, created: nowFn(), saved: nowFn(), clock: 0, active: 0,
        starlight: CFG.startStarlight, insight: 0, home,
        stars: {}, fleets: [], orders: [], messier: {}, devConst: {}, masterConst: {},
        events: [], eventTimer: rand(CFG.eventFirstDelay), petitions: [], petitionTimer: rand(CFG.petitionGap),
        notes: {}, quiz: blankQuiz(), log: [], evSeq: 0, petitionSeq: 0, fleetSeq: 0, orderSeq: 0,
        stats: { collected: 0, claimed: 0, launched: 0, upgrades: 0, eventsDone: 0, perfect: 0, restoredRoutes: 0, petitionsDone: 0 },
      };
    }
    const rand = ([a, b]) => a + rng() * (b - a);
    const randInt = n => Math.floor(rng() * n);

    function log(text, kind) {
      S.log.push({ ts: nowFn(), text, kind: kind || 'info' });
      if (S.log.length > CFG.logMax) S.log.splice(0, S.log.length - CFG.logMax);
    }

    function newGame(home) {
      S = blankState(home);
      S.stars[home] = { t: nowFn(), s: 0, i: 0, r: 0, b: 0, o: 0 };
      log('Your first star, ' + SKY.stars[home][6] + ', ignites in ' + SKY.consts[SKY.stars[home][5]].name + '.', 'claim');
      recalc();
      return S;
    }

    function load(state) {
      if (state && state.version === 1) { // v1 had wonder projects, which no longer exist
        delete state.projects; delete state.wonderDone; state.version = 2;
      }
      if (!state || state.version !== SAVE_VERSION) throw new Error('Unsupported save');
      S = state;
      if (!S.quiz) S.quiz = blankQuiz();
      recalc();
      return S;
    }

    // ---- derived values
    function claimedList() { return Object.keys(S.stars).map(Number); }
    function lvl(i) { const s = S.stars[i]; return s ? s.r + s.b + s.o : 0; }

    function perks() {
      const p = { out: 0, speed: 0, slots: 0, ins: 0, cost: 0, cap: 0, ev: 0 };
      for (const k of Object.keys(S.messier)) {
        const m = SKY.messier[k];
        const [kind, v] = MESSIER_PERK[m.kind];
        p[kind] += v * (S.messier[k].dev ? 2 : 1);
      }
      return p;
    }

    function consStatus(c) {
      const st = SKY.consts[c].stars;
      let claimed = 0, minLvl = Infinity;
      for (const i of st) { if (S.stars[i]) { claimed++; minLvl = Math.min(minLvl, lvl(i)); } else minLvl = 0; }
      const all = claimed === st.length;
      return {
        total: st.length, claimed, all, minLvl: all ? minLvl : 0,
        developed: !!S.devConst[c], mastered: !!S.masterConst[c],
      };
    }

    function recalc() {
      const claimed = claimedList();
      const P = perks();
      const dis = new Uint8Array(SKY.edges.length);
      for (const ev of S.events) for (const e of ev.edges) if (!ev.restored.includes(e)) dis[e] = 1;
      // constellation milestones (permanent once reached)
      let outBonus = 0;
      for (let c = 0; c < NC; c++) {
        const cs = consStatus(c);
        if (cs.all && cs.minLvl >= DEV_LEVELS && !S.devConst[c]) { S.devConst[c] = nowFn(); log(SKY.consts[c].name + ' is fully developed!', 'dev'); }
        if (cs.all && cs.minLvl >= MASTER_LEVELS && !S.masterConst[c]) { S.masterConst[c] = nowFn(); log(SKY.consts[c].name + ' is mastered!', 'dev'); }
        if (S.devConst[c]) outBonus += CFG.devBonus;
        if (S.masterConst[c]) outBonus += CFG.masterBonus;
      }
      const globalOut = 1 + outBonus + P.out;
      const insMul = 1 + P.ins;
      const rate = new Float64Array(N), insRate = new Float64Array(N), cap = new Float64Array(N);
      const routeMul = new Float64Array(N).fill(1);
      let routes = 0;
      SKY.edges.forEach((e, i) => {
        const [a, b] = e;
        const A = S.stars[a], B = S.stars[b];
        if (!A || !B || dis[i]) return;
        routes++;
        const comp = cls[a] !== cls[b] ? CFG.routeBonusComp : CFG.routeBonusSame;
        routeMul[a] += comp * (1 + CFG.routeBeaconMul * B.b);
        routeMul[b] += comp * (1 + CFG.routeBeaconMul * A.b);
      });
      let totalRate = 0, totalIns = 0, beacons = 0;
      for (const i of claimed) {
        const s = S.stars[i];
        rate[i] = baseRate[i] * (1 + 0.5 * s.r) * routeMul[i] * globalOut;
        insRate[i] = CFG.insightPerObs * s.o * insMul;
        cap[i] = CLASS_CAP_H[cls[i]] * 3600 * (1 + P.cap);
        totalRate += rate[i]; totalIns += insRate[i]; beacons += s.b;
      }
      const slots = CFG.baseSlots + Math.floor(beacons / 5 + P.slots + 1e-9);
      D = { claimed, P, dis, rate, insRate, cap, routeMul, routes, totalRate, totalIns, slots, globalOut, insMul, count: claimed.length };
    }

    // ---- costs
    const costMul = () => 1 - Math.min(0.5, D.P.cost);
    function inFlightClaims() { return S.fleets.filter(f => f.kind === 's').length + S.orders.length; }
    function claimCost() {
      const n = D.count + inFlightClaims();
      const ramp = Math.min(1, (n + 2) / CFG.claimRamp); // gentle opening
      return Math.ceil((CFG.claimBase + CFG.claimScale * Math.pow(n, CFG.claimPow) * ramp) * costMul());
    }
    function upgradeCost(i, t) {
      const s = S.stars[i];
      const L = s[t];
      return Math.ceil(TRACK_INFO[t].base * Math.pow(TRACK_INFO[t].grow, L) * (1 + CFG.upgradeSize * D.count) * costMul());
    }
    function messierCost() {
      const v = Object.keys(S.messier).length + S.fleets.filter(f => f.kind === 'm').length;
      return { insight: Math.ceil((CFG.messierInsightBase + CFG.messierInsightStep * v) * costMul()), starlight: Math.ceil(claimCost() * CFG.messierStarlightFrac) };
    }
    function developMessierCost() {
      const v = Object.keys(S.messier).filter(k => S.messier[k].dev).length;
      return Math.ceil((CFG.developMessierBase + CFG.developMessierStep * v) * costMul());
    }
    function travelSeconds(fromStar, deg, messier) {
      const reduce = Math.min(1 - CFG.speedFloor, D.P.speed + CFG.beaconSpeed * S.stars[fromStar].b);
      return Math.max(5, deg * CFG.secPerDeg * (messier ? CFG.messierTravelMul : 1) * (1 - reduce));
    }

    // ---- actions
    function result(ok, msg, extra) { return Object.assign({ ok, msg: msg || '' }, extra); }

    function frontierOrigins(target) {
      const out = [];
      for (const { to, e } of adj[target]) if (S.stars[to]) out.push({ from: to, deg: edgeLen[e], e });
      return out;
    }
    function targetsPending() { return new Set(S.fleets.filter(f => f.kind === 's').map(f => f.to).concat(S.orders.map(o => o.to))); }
    function canLaunchTo(target) {
      if (S.stars[target]) return result(false, 'Already yours.');
      const pend = targetsPending();
      if (pend.has(target)) return result(false, 'A fleet is already bound for this star.');
      if (S.orders.length >= CFG.orderMax) return result(false, 'The order queue is full.');
      const reach = adj[target].some(n => S.stars[n.to] || pend.has(n.to));
      if (!reach) return result(false, 'No claimed star is connected to this one.');
      if (S.starlight < claimCost()) return result(false, 'Not enough Starlight.');
      return result(true);
    }
    // Pay now, fly when a slot is free and a claimed star touches the target (so orders can chain outward, even offline).
    function launch(target) {
      const chk = canLaunchTo(target);
      if (!chk.ok) return chk;
      const paid = claimCost();
      S.starlight -= paid;
      S.orders.push({ id: ++S.orderSeq, to: target, paid });
      dispatch();
      const flying = S.fleets.find(f => f.kind === 's' && f.to === target);
      recalc();
      if (flying) return result(true, 'Fleet launched from ' + SKY.stars[flying.from][6] + '.', { sec: flying.dur, flying: true });
      return result(true, 'Order queued: it will fly as soon as a fleet is free and a neighbouring star is yours.', { queued: true });
    }
    function cancelOrder(id) {
      const k = S.orders.findIndex(o => o.id === id);
      if (k < 0) return result(false, 'No such order.');
      S.starlight += S.orders[k].paid; S.orders.splice(k, 1);
      recalc();
      return result(true, 'Order cancelled and refunded.');
    }
    function dispatch() {
      let sent = false;
      for (let k = 0; k < S.orders.length && S.fleets.length < D.slots;) {
        const o = S.orders[k];
        if (S.stars[o.to]) { S.starlight += o.paid; S.orders.splice(k, 1); continue; } // got there another way
        const origins = frontierOrigins(o.to).map(x => Object.assign(x, { sec: travelSeconds(x.from, x.deg, false) })).sort((a, b) => a.sec - b.sec);
        if (!origins.length) { k++; continue; }
        const x = origins[0];
        S.orders.splice(k, 1);
        S.fleets.push({ id: ++S.fleetSeq, kind: 's', from: x.from, to: o.to, remaining: x.sec, dur: x.sec });
        S.stats.launched++; sent = true;
      }
      return sent;
    }

    function messierAccess(m) { return SKY.messier[m].links.filter(i => S.stars[i]); }
    function canVisitMessier(m) {
      if (S.messier[m]) return result(false, 'Already catalogued.');
      if (S.fleets.some(f => f.kind === 'm' && f.to === m)) return result(false, 'An expedition is already under way.');
      if (!messierAccess(m).length) return result(false, 'Claim a nearby star first.');
      if (S.fleets.length >= D.slots) return result(false, 'All fleets are out (' + D.slots + ' slots).');
      const c = messierCost();
      if (S.insight < c.insight) return result(false, 'Needs ' + fmt(c.insight) + ' Insight.');
      if (S.starlight < c.starlight) return result(false, 'Needs ' + fmt(c.starlight) + ' Starlight.');
      return result(true);
    }
    function visitMessier(m) {
      const chk = canVisitMessier(m);
      if (!chk.ok) return chk;
      const obj = SKY.messier[m];
      const o = messierAccess(m).map(i => ({ from: i, deg: sepDeg(SKY.stars[i], obj) })).map(x => Object.assign(x, { sec: travelSeconds(x.from, x.deg, true) })).sort((a, b) => a.sec - b.sec)[0];
      const c = messierCost();
      S.insight -= c.insight; S.starlight -= c.starlight;
      S.fleets.push({ id: ++S.fleetSeq, kind: 'm', from: o.from, to: m, remaining: o.sec, dur: o.sec });
      recalc();
      return result(true, 'Expedition sent from ' + SKY.stars[o.from][6] + '.', { sec: o.sec });
    }
    function developMessier(m) {
      const e = S.messier[m];
      if (!e) return result(false, 'Visit it first.');
      if (e.dev) return result(false, 'Already developed.');
      const c = developMessierCost();
      if (S.insight < c) return result(false, 'Needs ' + fmt(c) + ' Insight.');
      S.insight -= c; e.dev = nowFn();
      log('Studied M' + SKY.messier[m].n + ' in depth: its bonus is doubled.', 'messier');
      recalc();
      return result(true, 'Bonus doubled.');
    }

    function upgrade(i, t) {
      const s = S.stars[i];
      if (!s) return result(false, 'Not claimed.');
      if (s[t] >= MAX_LEVEL) return result(false, 'Max level.');
      const c = upgradeCost(i, t);
      if (S.starlight < c) return result(false, 'Needs ' + fmt(c) + ' Starlight.');
      S.starlight -= c; s[t]++;
      S.stats.upgrades++;
      completePetitions({ type: 'upgrade', star: i, track: t, level: s[t] });
      recalc();
      return result(true, TRACK_INFO[t].name + ' ' + s[t]);
    }

    function collect(i) {
      const s = S.stars[i];
      if (!s) return result(false, 'Not claimed.', { gain: 0, ins: 0 });
      const gain = s.s, ins = s.i;
      if (gain < 0.01 && ins < 0.01) return result(false, 'Nothing to collect.', { gain: 0, ins: 0 });
      S.starlight += gain; S.insight += ins; s.s = 0; s.i = 0;
      S.stats.collected += gain;
      completePetitions({ type: 'collect', star: i, fraction: capFraction(i, gain) });
      return result(true, '', { gain, ins });
    }
    function capFraction(i, gain) { const cap = D.rate[i] * D.cap[i]; return cap > 0 ? gain / cap : 0; }
    function collectConstellation(c) {
      let gain = 0, ins = 0;
      for (const i of SKY.consts[c].stars) { const s = S.stars[i]; if (s) { gain += s.s; ins += s.i; S.stats.collected += s.s; s.s = 0; s.i = 0; } }
      S.starlight += gain; S.insight += ins;
      return result(true, '', { gain, ins });
    }
    function canCollectConstellation(c) { return !!S.devConst[c]; }

    // Rewards from outside the economy loop (the Sky School quizzes).
    function grant(starlight, insight) { S.starlight += starlight || 0; S.insight += insight || 0; }

    // ---- petitions
    function addPetition() {
      const open = new Set(S.petitions.map(p => p.star));
      const pool = D.claimed.filter(i => !open.has(i));
      if (!pool.length) return;
      const i = pool[randInt(pool.length)];
      const s = S.stars[i];
      const kinds = [];
      TRACKS.forEach(t => { if (s[t] < MAX_LEVEL) kinds.push('upgrade:' + t); });
      if (adj[i].some(n => !S.stars[n.to])) kinds.push('expand');
      if (s.s >= 0) kinds.push('collect');
      const k = kinds[randInt(kinds.length)];
      const p = { id: ++S.petitionSeq, star: i, type: k.split(':')[0], created: S.clock };
      if (p.type === 'upgrade') { p.track = k.split(':')[1]; p.level = s[p.track] + 1; p.reward = Math.ceil(upgradeCost(i, p.track) * 1.6); }
      else if (p.type === 'expand') { p.reward = Math.ceil(claimCost() * 1.4); }
      else { p.reward = Math.ceil((60 + 4 * D.count) ); p.fraction = 0.7; }
      p.insight = 6 + randInt(10);
      S.petitions.push(p);
    }
    function completePetitions(ev) {
      for (let k = S.petitions.length - 1; k >= 0; k--) {
        const p = S.petitions[k];
        let ok = false;
        if (ev.type === 'upgrade' && p.type === 'upgrade' && p.star === ev.star && p.track === ev.track && ev.level >= p.level) ok = true;
        if (ev.type === 'collect' && p.type === 'collect' && p.star === ev.star && ev.fraction >= p.fraction) ok = true;
        if (ev.type === 'claim' && p.type === 'expand' && adj[p.star].some(n => n.to === ev.star)) ok = true;
        if (ok) {
          S.petitions.splice(k, 1);
          S.starlight += p.reward; S.insight += p.insight;
          S.stats.petitionsDone++;
          log(SKY.stars[p.star][6] + '’s petition is answered: +' + fmt(p.reward) + ' Starlight, +' + p.insight + ' Insight.', 'petition');
        }
      }
    }
    function dismissPetition(id) { S.petitions = S.petitions.filter(p => p.id !== id); }

    // ---- events (comets & novae)
    const COMET_NAMES = ['Aurelia', 'Boreas', 'Calypso', 'Dione', 'Elara', 'Faye', 'Galatea', 'Hesper', 'Iris', 'Juno', 'Kestrel', 'Lyra', 'Maia', 'Nerine', 'Orla', 'Pavo'];
    function activeEdges() {
      const out = [];
      SKY.edges.forEach((e, i) => { if (S.stars[e[0]] && S.stars[e[1]] && !D.dis[i]) out.push(i); });
      return out;
    }
    function spawnEvent() {
      const act = activeEdges();
      if (act.length < CFG.eventMinRoutes || S.events.length) return null;
      let ev;
      if (rng() < 0.7) {
        // comet: a connected tail of routes
        const seed = act[randInt(act.length)];
        const set = [seed], seen = new Set([seed]);
        const want = Math.min(7, 3 + Math.floor(Math.sqrt(act.length) / 3));
        let frontier = [SKY.edges[seed][0], SKY.edges[seed][1]];
        while (set.length < want && frontier.length) {
          const u = frontier.splice(randInt(frontier.length), 1)[0];
          const opts2 = adj[u].filter(n => S.stars[n.to] && !D.dis[n.e] && !seen.has(n.e));
          if (!opts2.length) continue;
          const n = opts2[randInt(opts2.length)];
          seen.add(n.e); set.push(n.e); frontier.push(n.to, u);
        }
        const c0 = SKY.stars[SKY.edges[seed][0]][5];
        ev = { kind: 'comet', name: 'Comet ' + COMET_NAMES[randInt(COMET_NAMES.length)], edges: set, center: SKY.edges[seed][0], total: CFG.cometSeconds, where: SKY.consts[c0].name };
      } else {
        const hubs = D.claimed.filter(i => adj[i].filter(n => S.stars[n.to] && !D.dis[n.e]).length >= 2);
        if (!hubs.length) return null;
        const h = hubs[randInt(hubs.length)];
        const es = adj[h].filter(n => S.stars[n.to] && !D.dis[n.e]).map(n => n.e).slice(0, 6);
        ev = { kind: 'nova', name: 'Nova ' + (SKY.consts[SKY.stars[h][5]].gen || SKY.consts[SKY.stars[h][5]].name), edges: es, center: h, total: CFG.novaSeconds, where: SKY.stars[h][6] };
      }
      ev.id = ++S.evSeq; ev.remaining = ev.total; ev.restored = []; ev.hits = 0; ev.misses = 0; ev.hint = false; ev.paid = 0; ev.start = nowFn();
      S.events.push(ev);
      log(ev.name + ' near ' + ev.where + ' has cut ' + ev.edges.length + ' trade route' + (ev.edges.length === 1 ? '' : 's') + '. Redraw them!', 'event');
      recalc();
      return ev;
    }
    function eventReward(ev) {
      const base = (CFG.redrawBase + CFG.redrawPerStar * D.count) * (1 + D.P.ev);
      return base * (ev.hint ? 0.25 : 1) * Math.max(0.25, 1 - 0.15 * ev.misses);
    }
    function redraw(evId, a, b) {
      const ev = S.events.find(e => e.id === evId);
      if (!ev) return result(false, 'That event has passed.');
      const e = edgeIdx.get(key(a, b));
      if (e === undefined || !ev.edges.includes(e) || ev.restored.includes(e)) {
        ev.misses++;
        return result(false, 'No trade route there.', { miss: true });
      }
      const gain = eventReward(ev);
      ev.restored.push(e); ev.hits++; ev.paid += gain;
      S.starlight += gain;
      S.stats.restoredRoutes++;
      let done = false, bonus = 0;
      if (ev.restored.length === ev.edges.length) {
        done = true;
        const perfect = ev.misses === 0 && !ev.hint;
        if (perfect) { bonus = ev.paid * 0.5; S.starlight += bonus; S.stats.perfect++; }
        S.insight += 4 * ev.edges.length * (ev.hint ? 0.25 : 1);
        S.stats.eventsDone++;
        log(ev.name + ' routes redrawn' + (perfect ? ' perfectly' : '') + ': +' + fmt(ev.paid + bonus) + ' Starlight.', 'event-done');
        S.events = S.events.filter(x => x !== ev);
        S.eventTimer = rand(CFG.eventGap);
      }
      recalc();
      return result(true, '', { gain, done, bonus, perfect: done && bonus > 0 });
    }
    function useHint(evId) { const ev = S.events.find(e => e.id === evId); if (ev) ev.hint = true; }

    // ---- time
    function nextArrival() {
      let t = Infinity;
      for (const f of S.fleets) t = Math.min(t, f.remaining);
      return t;
    }
    function accrue(dt) {
      for (const i of D.claimed) {
        const s = S.stars[i];
        const cap = D.rate[i] * D.cap[i];
        s.s = Math.min(cap, s.s + D.rate[i] * dt);
        const icap = D.insRate[i] * D.cap[i];
        s.i = Math.min(icap, s.i + D.insRate[i] * dt);
      }
    }
    function arrive() {
      let changed = false;
      for (let k = S.fleets.length - 1; k >= 0; k--) {
        const f = S.fleets[k];
        if (f.remaining > 1e-9) continue;
        S.fleets.splice(k, 1); changed = true;
        if (f.kind === 's') {
          if (!S.stars[f.to]) {
            S.stars[f.to] = { t: nowFn(), s: 0, i: 0, r: 0, b: 0, o: 0 };
            S.stats.claimed++;
            const st = SKY.stars[f.to];
            log('Claimed ' + st[6] + ' (' + SKY.consts[st[5]].name + ').', 'claim');
            completePetitions({ type: 'claim', star: f.to });
          }
        } else if (!S.messier[f.to]) {
          S.messier[f.to] = { t: nowFn() };
          const m = SKY.messier[f.to];
          log('Catalogued M' + m.n + (m.alt ? ' (' + m.alt + ')' : '') + '.', 'messier');
        }
      }
      if (changed) { recalc(); if (dispatch()) recalc(); }
    }
    // Advance the world by dt seconds. `active` = the player has the game open (events and petitions only run then).
    function tick(dt, active) {
      if (dt <= 0) return;
      let left = dt;
      let guard = 0;
      while (left > 1e-9 && guard++ < 100000) {
        const step = Math.min(left, Math.max(nextArrival(), 1e-6));
        accrue(step);
        for (const f of S.fleets) f.remaining -= step;
        S.clock += step; left -= step;
        arrive();
      }
      if (active) {
        S.active += dt;
        // events
        for (const ev of S.events.slice()) {
          ev.remaining -= dt;
          if (ev.remaining <= 0) {
            S.events = S.events.filter(x => x !== ev);
            log(ev.name + ' has passed. Remaining routes drifted back on their own.', 'event');
            S.eventTimer = rand(CFG.eventGap);
            recalc();
          }
        }
        if (!S.events.length) {
          S.eventTimer -= dt;
          if (S.eventTimer <= 0) { if (!spawnEvent()) S.eventTimer = 120; }
        }
        S.petitionTimer -= dt;
        if (S.petitionTimer <= 0) {
          if (S.petitions.length < Math.min(CFG.petitionMax, 1 + Math.floor(D.count / 6))) addPetition();
          S.petitionTimer = rand(CFG.petitionGap);
        }
      }
    }
    function catchUp(seconds) { tick(Math.min(Math.max(0, seconds), CFG.maxOfflineSeconds), false); }

    // ---- queries
    function fmt(n) {
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
      if (n >= 100) return String(Math.round(n));
      return n.toFixed(n < 10 ? 1 : 0);
    }
    function frontier() { // unclaimed stars adjacent to claimed ones
      const out = new Set();
      for (const i of D.claimed) for (const n of adj[i]) if (!S.stars[n.to]) out.add(n.to);
      return out;
    }
    function attention() { // stars worth a visit
      const out = [];
      for (const i of D.claimed) {
        const s = S.stars[i];
        const cap = D.rate[i] * D.cap[i];
        if (cap > 0 && s.s >= cap * 0.9) out.push({ star: i, why: 'full' });
      }
      return out;
    }
    function messierStats() {
      const out = { visited: Object.keys(S.messier).length, total: NM };
      return out;
    }

    return {
      SKY, CFG, TRACKS, TRACK_INFO, MAX_LEVEL, CLASS_NAMES, DEV_LEVELS, MASTER_LEVELS, PERK_LABEL, MESSIER_PERK,
      adj, edgeIdx, edgeLen, cls, baseRate, consNeighbours, messierByConst, messierFrom, nameIdx,
      get state() { return S; }, get d() { return D; },
      newGame, load, recalc, tick, catchUp,
      claimCost, upgradeCost, messierCost, developMessierCost, travelSeconds,
      canLaunchTo, launch, cancelOrder, dispatch, frontierOrigins, targetsPending, canVisitMessier, visitMessier, messierAccess, developMessier,
      upgrade, collect, collectConstellation, canCollectConstellation, grant,
      spawnEvent, redraw, useHint, eventReward, dismissPetition, addPetition,
      consStatus, frontier, attention, messierStats, lvl, fmt, sepDeg,
      serialize() { S.saved = nowFn(); return JSON.stringify(S); },
    };
  }

  return { create, SAVE_VERSION, CFG, TRACK_INFO, TRACKS, MAX_LEVEL, CLASS_NAMES, sepDeg, key };
});
