/* Firmament game engine: pure logic, no DOM. Works in the browser (window.Engine) and in Node (tests).
   You run a corporation that colonises the night sky: cash from colonies, research for technology, buildings
   from human technology, trade routes, comets and novae, and a stock price that tracks how you are doing. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./corp.js'), require('./astro.js'), require('./yearsky.js'));
  else root.Engine = factory(root.Corp, root.Astro, root.YearSky);
})(typeof self !== 'undefined' ? self : this, function (Corp, Astro, YearSky) {
  'use strict';

  const { BUILDINGS, BUILDING_MAX, BUILD_LEVEL_MUL, TECHS, TECH_BY_ID, RANKS, MARKETS } = Corp;
  const RAD = Math.PI / 180;
  const SAVE_VERSION = 6;
  const TRACKS = ['r', 'b', 'o'];
  const TRACK_INFO = {
    r: { name: 'Industry', short: 'Ind', desc: 'More revenue from this colony.', base: 50, grow: 2.0 },
    b: { name: 'Logistics', short: 'Log', desc: 'Faster ships from here, stronger trade routes, more fleet slots.', base: 80, grow: 2.1 },
    o: { name: 'R&D', short: 'R&D', desc: 'Produces research points for technology and Messier surveys.', base: 120, grow: 2.2 },
  };
  const MAX_LEVEL = 5;
  const CLASS_NAMES = ['Blue-white', 'Yellow', 'Orange-red'];
  const CLASS_RATE = [1.3, 1.0, 0.8];
  const CLASS_CAP_H = [5, 8, 14]; // hours of uncollected revenue a colony can hold
  const DEV_LEVELS = 3;   // total development levels per colony for a "developed" constellation
  const MASTER_LEVELS = 9; // ... and for a "mastered" one

  const CFG = {
    startCash: 100, baseOutput: 0.068,
    secPerDeg: 6,
    messierTravelMul: 1.5,
    baseSlots: 3,
    claimBase: 25, claimScale: 9, claimPow: 1.6, claimRamp: 14,
    upgradeSize: 0.03,
    messierResearchBase: 30, messierResearchStep: 6,
    messierCashFrac: 0.5,
    developMessierBase: 80, developMessierStep: 4,
    routeBonusComp: 0.12, routeBonusSame: 0.05, routeBeaconMul: 0.25,
    beaconSpeed: 0.07, speedFloor: 0.25,
    researchPerLevel: 0.012,
    devBonus: 0.015, masterBonus: 0.025,
    eventMinRoutes: 8, eventFirstDelay: [150, 300], eventGap: [450, 900],
    cometSeconds: 900, novaSeconds: 1500,
    redrawBase: 60, redrawPerStar: 6,
    petitionGap: [240, 480], petitionMax: 3, orderMax: 40,
    maxOfflineSeconds: 60 * 86400,
    logMax: 250,
    routeUpgradeBase: 60, routeUpgradeGrow: 2.4, routeBonusPerLevel: 0.5, routeSpeedPerLevel: 0.12,
    buildingFloor: 0.25, demolishRefund: 0.5,
    // flagships (the named stars): the colonies around one remit a share of their revenue to it, its vault holds a day's worth,
    // it never auto-banks, and collecting there pays a premium. This is what keeps you coming back to the important stars.
    royaltyShare: 0.25, flagshipCapH: 24, flagshipPremium: 0.2, flagshipReadyH: 4,
    marketFirstDelay: [600, 1200], marketGap: [1200, 2400], priceStepSecs: 10,
    // prices: a star costs the going rate times a multiplier for how important it is (see starRank), and a star a rival holds costs
    // more again to take over. Ordinary stars are cheap, so the opening is quick; flagships and constellation leaders are not.
    priceDim: 0.45, priceBright: 0.9, priceBrilliant: 1.5, priceLead: 3, priceFlagship: 6, takeoverMul: 2.5,
    // rival companies expand at a fixed share of YOUR pace: every colony you add earns each rival `ratio` colonies of credit, and a
    // rival spends credit one star at a time. They hold the stars they take, and you can take them over. They also raid your border colonies, slowly (see raidRatio).
    rivalCount: 3, rivalRatios: [0.9, 0.75, 0.6], rivalGap: [5, 25], rivalCreditCap: 10, rivalRetry: 45, rivalSafeHops: 2,
    // the year's sky: colonies near the radiant of a meteor shower that is running (on the real calendar) earn more; every shower you
    // have watched is a small permanent bonus (double if you caught its peak), and every comet you have redrawn improves event rewards
    showerWatch: 0.003, cometLore: 0.01,
    // raids: a rival with one of your colonies on its border slowly sends an assault fleet against it. Its credit comes from your growth (like its own
    // expansion), raids only run while you are playing and always give a warning, the odds follow strength against defence, and an occupied colony keeps
    // its levels and buildings so you can take it back at a discount.
    raidMinColonies: 15, raidRatio: 0.012, raidCreditCap: 2, raidGap: 1500, raidMinSecs: 90, raidSecPerDeg: 14,
    defenceBase: 3, defencePerLevel: 2.5, defencePerBuilding: 4, defenceFlagship: 15, strengthBase: 6, strengthPerRoot: 1.6,
    reinforceFrac: 0.8, reinforceBoost: 25, reinforceSecs: 1800, reclaimMul: 0.6,
  };
  const RIVAL_COLORS = ['#ff8aa8', '#7fe0a6', '#c9a0ff', '#ffb06a'];
  const ROUTE_MAX = 3;

  const PERK_LABEL = {
    out: v => '+' + pct(v) + ' revenue', speed: v => '−' + pct(v) + ' ship travel time', slots: v => '+' + Math.round(v * 100) / 100 + ' fleet slot' + (v === 1 ? '' : 's'),
    res: v => '+' + pct(v) + ' research', cost: v => '−' + pct(v) + ' costs', cap: v => '+' + pct(v) + ' storage', ev: v => '+' + pct(v) + ' event rewards',
    auto: v => '+' + pct(v) + ' of cash banked automatically', route: v => '+' + pct(v) + ' trade-route strength', star: v => '+' + pct(v) + ' star bonuses',
  };
  function pct(v) { return Math.round(v * 1000) / 10 + '%'; }

  const MESSIER_PERK = {
    globular: ['slots', 1 / 3], open: ['out', 0.02], nebula: ['res', 0.04], galaxy: ['speed', 0.015], other: ['cost', 0.01],
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

    let S = null;
    let D = null; // derived
    // ---- static tables
    const adj = Array.from({ length: N }, () => []);
    const edgeIdx = new Map();
    SKY.edges.forEach((e, i) => { edgeIdx.set(key(e[0], e[1]), i); });
    SKY.edges.forEach((e, i) => { adj[e[0]].push({ to: e[1], e: i }); adj[e[1]].push({ to: e[0], e: i }); });
    const edgeLen = SKY.edges.map(e => sepDeg(SKY.stars[e[0]], SKY.stars[e[1]]));
    const cls = SKY.stars.map(s => (s[4] < 0.3 ? 0 : s[4] < 0.8 ? 1 : 2));
    const baseRate = SKY.stars.map((s, i) => CFG.baseOutput * Math.pow(10, -0.1 * s[3]) * CLASS_RATE[cls[i]]);
    const nameIdx = new Map(SKY.stars.map((s, i) => [s[6], i]));
    // spectral class and brightness tier give every star a fixed bonus (see corp.js); the Academy's star topic strengthens them all
    const profile = SKY.stars.map(st => Corp.starProfile(st));
    // flagships: the named stars. Each colony remits part of its revenue to the nearest flagship you own, so that is where you must go.
    const FLAGS = SKY.stars.map((st, i) => i).filter(i => SKY.stars[i][7]);
    const isFlag = new Uint8Array(N); FLAGS.forEach(i => { isFlag[i] = 1; });
    const sectorOrder = SKY.stars.map((st, i) => FLAGS.filter(f => f !== i).map(f => ({ f, d: sepDeg(st, SKY.stars[f]) })).sort((x, y) => x.d - y.d || x.f - y.f).map(x => x.f));
    // how important each star is, for prices: the 20 named flagships, then each constellation's lead star (its alpha, or failing that its
    // brightest), then everything else by brightness tier
    const isLead = new Uint8Array(N);
    SKY.consts.forEach(c => { let b = -1; for (const i of c.stars) if (b < 0 || SKY.stars[i][3] < SKY.stars[b][3]) b = i; if (b >= 0) isLead[b] = 1; });
    SKY.stars.forEach((st, i) => { if (/^\u03b1/.test(st[6])) isLead[i] = 1; });
    const STAR_RANKS = {
      flagship: { label: 'Flagship', price: 'priceFlagship', weight: 3 }, lead: { label: 'Lead star', price: 'priceLead', weight: 2 },
      brilliant: { label: 'Brilliant star', price: 'priceBrilliant', weight: 1.4 }, bright: { label: 'Bright star', price: 'priceBright', weight: 1.1 },
      ordinary: { label: 'Ordinary star', price: 'priceDim', weight: 1 },
    };
    const RANK_OF = SKY.stars.map((st, i) => (isFlag[i] ? 'flagship' : isLead[i] ? 'lead' : st[3] < 2 ? 'brilliant' : st[3] < 3 ? 'bright' : 'ordinary'));
    const priceMul = i => CFG[STAR_RANKS[RANK_OF[i]].price];
    // the colonies a meteor shower's radiant can reach: every star within ZONE_DEG of it
    const showerZone = {};
    YearSky.SHOWERS.forEach(sh => { showerZone[sh.id] = SKY.stars.map((st, i) => i).filter(i => sepDeg(SKY.stars[i], { ra: sh.ra, dec: sh.dec }) <= YearSky.ZONE_DEG); });
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


    function blankStats() { return { collected: 0, auto: 0, claimed: 0, launched: 0, upgrades: 0, eventsDone: 0, perfect: 0, restoredRoutes: 0, petitionsDone: 0, collects: 0, routeUps: 0, built: 0, buildUps: 0, techs: 0, demolished: 0, marketEvents: 0, flagCollects: 0, flagCash: 0, takeovers: 0, flagTakeovers: 0, capitals: 0, acquired: 0, starsLost: 0, repelled: 0, reclaimed: 0, reinforced: 0 }; }
    function blankQuiz() { return { const: {}, star: {}, messier: {}, astro: {}, stats: { answered: 0, correct: 0, rounds: 0, perfect: 0, bestStreak: 0 } }; }
    function blankMarket() { return { kind: null, remaining: 0, nextIn: rand(CFG.marketFirstDelay), price: 10, hi: 10, hist: [10], priceTimer: 0 }; }
    function blankState(home, corpName) {
      return {
        version: SAVE_VERSION, created: nowFn(), saved: nowFn(), clock: 0, active: 0,
        cash: CFG.startCash, research: 0, home,
        corp: { name: corpName || Corp.defaultCompanyName(SKY.stars[home][6]), founded: nowFn(), rank: 0 },
        tech: { done: { telescope: nowFn() }, active: null },
        market: blankMarket(),
        rivals: [], owner: {}, rseed: 0, showers: {}, comets: {}, skyKey: 0, raids: [], raidSeq: 0, guard: {}, occupied: {},
        stars: {}, fleets: [], orders: [], messier: {}, devConst: {}, masterConst: {}, buildings: {}, routeLvl: {}, quests: { claimed: {}, contracts: [], seq: 0 },
        events: [], eventTimer: rand(CFG.eventFirstDelay), petitions: [], petitionTimer: rand(CFG.petitionGap),
        notes: {}, quiz: blankQuiz(), academy: { lvl: {} }, log: [], evSeq: 0, petitionSeq: 0, fleetSeq: 0, orderSeq: 0,
        stats: blankStats(),
      };
    }
    const rand = ([a, b]) => a + rng() * (b - a);
    const randInt = n => Math.floor(rng() * n);

    function log(text, kind) {
      S.log.push({ ts: nowFn(), text, kind: kind || 'info' });
      if (S.log.length > CFG.logMax) S.log.splice(0, S.log.length - CFG.logMax);
    }

    function newGame(home, corpName) {
      S = blankState(home, corpName && String(corpName).trim().slice(0, 32));
      S.stars[home] = { t: nowFn(), s: 0, i: 0, r: 0, b: 0, o: 0 };
      log(S.corp.name + ' is founded. Headquarters: ' + SKY.stars[home][6] + ' in ' + SKY.consts[SKY.stars[home][5]].name + '.', 'claim');
      initRivals();
      recalc();
      return S;
    }

    // Older saves: v1 had wonder projects; v3 had hubs and Starlight/Insight; v4 is the corporation (cash, research,
    // buildings, technology). Hubs become the matching buildings and unlock the technology they need.
    const HUB_TO_BUILDING = { collect: 'clearing', yard: 'shipyard', lab: 'campus', trade: 'exchange' };
    function techClosure(ids, done, ts) { // mark a tech and everything it needs as researched
      const visit = id => { if (!id || done[id] || !TECH_BY_ID[id]) return; done[id] = ts; TECH_BY_ID[id].req.forEach(visit); };
      ids.forEach(visit);
    }
    function migrate(state) {
      if (state.version === 1) { delete state.projects; delete state.wonderDone; state.version = 2; }
      if (state.version === 2) state.version = 3;
      if (state.version === 3) {
        state.cash = state.starlight !== undefined ? state.starlight : state.cash || 0; delete state.starlight;
        state.research = state.insight !== undefined ? state.insight : state.research || 0; delete state.insight;
        (state.petitions || []).forEach(p => { if (p.insight !== undefined) { p.research = p.insight; delete p.insight; } });
        const ts = state.created || nowFn(), done = { telescope: ts }, buildings = {};
        for (const k of Object.keys(state.hubs || {})) {
          const h = state.hubs[k], id = HUB_TO_BUILDING[h.type];
          if (!id) continue;
          buildings[k] = [{ id, lvl: h.lvl, t: h.t || ts, paid: { cash: 0, research: 0 } }];
          techClosure([BUILDINGS[id].tech], done, ts);
        }
        delete state.hubs;
        state.buildings = buildings;
        state.tech = { done, active: null };
        state.version = 4;
      }
      if (state.version === 4) { // buildable trade lanes were retired: refund them and forget their route upgrades
        state.laneRefund = Object.keys(state.built || {}).length;
        delete state.built;
        const maxEdge = SKY.edges.length;
        for (const k of Object.keys(state.routeLvl || {})) if (+k >= maxEdge) delete state.routeLvl[k];
        if (state.stats) delete state.stats.lanes;
        state.version = 5;
      }
      if (state.version === 5) state.version = 6; // v6 adds rival companies; load() founds them to match how far you have come
      return state;
    }
    function load(state) {
      if (state) migrate(state);
      if (!state || state.version !== SAVE_VERSION) throw new Error('Unsupported save');
      S = state;
      if (!S.quiz) S.quiz = blankQuiz();
      S.quiz.astro = S.quiz.astro || {};
      S.academy = S.academy || { lvl: {} }; S.academy.lvl = S.academy.lvl || {};
      S.buildings = S.buildings || {}; S.routeLvl = S.routeLvl || {};
      S.quests = S.quests || { claimed: {}, contracts: [], seq: 0 };
      S.stats = Object.assign(blankStats(), S.stats);
      S.corp = Object.assign({ name: Corp.defaultCompanyName(SKY.stars[S.home][6]), founded: S.created || nowFn(), rank: 0 }, S.corp);
      S.tech = S.tech || { done: { telescope: nowFn() }, active: null };
      if (!S.tech.done) S.tech.done = {};
      S.tech.done.telescope = S.tech.done.telescope || nowFn();
      S.market = Object.assign(blankMarket(), S.market);
      S.owner = S.owner || {}; S.showers = S.showers || {}; S.comets = S.comets || {}; S.skyKey = S.skyKey || 0;
      S.raids = S.raids || []; S.raidSeq = S.raidSeq || 0; S.guard = S.guard || {}; S.occupied = S.occupied || {};
      const hadRivals = Array.isArray(S.rivals) && S.rivals.length > 0;
      if (!hadRivals) S.rivals = [];
      for (const r of S.rivals) { r.raidCredit = r.raidCredit || 0; r.raidCool = r.raidCool || 0; r.captured = r.captured || 0; r.repelled = r.repelled || 0; }
      recalc();
      if (!hadRivals) { initRivals(); recalc(); catchUpRivals(); } // an older save: the rivals have been growing at your pace all along
      else for (const r of S.rivals) r.stuck = false;
      if (S.laneRefund) { // saves from before the retirement of trade lanes
        const back = S.laneRefund * Math.ceil(claimCost() * 0.8);
        S.cash += back; log('Trade lanes were retired. Your ' + S.laneRefund + ' lane' + (S.laneRefund === 1 ? '' : 's') + ' were refunded: $' + fmt(back) + '.', 'info');
        delete S.laneRefund;
      }
      return S;
    }

    // ---- derived values
    function claimedList() { return Object.keys(S.stars).map(Number); }
    function lvl(i) { const s = S.stars[i]; return s ? s.r + s.b + s.o : 0; }

    function perks() {
      const p = { out: 0, speed: 0, slots: 0, res: 0, cost: 0, cap: 0, ev: 0, auto: 0, route: 0, star: 0 };
      for (const k of Object.keys(S.messier)) {
        const m = SKY.messier[k];
        const [kind, v] = MESSIER_PERK[m.kind];
        p[kind] += v * (S.messier[k].dev ? 2 : 1);
      }
      for (const id of Object.keys(S.tech.done)) {
        const t = TECH_BY_ID[id];
        if (t) for (const [k, v] of Object.entries(t.perks)) p[k] += v;
      }
      for (const t of Astro.TOPICS) { const l = S.academy.lvl[t.id] || 0; if (l) p[t.perk.kind] += Astro.perkAt(t.id, l); } // Olympiad Academy levels never go down
      for (const id of Object.keys(S.showers)) if (YearSky.SHOWER_BY_ID[id]) p.out += CFG.showerWatch * (S.showers[id].peak ? 2 : 1); // showers you have watched
      p.ev += CFG.cometLore * Object.keys(S.comets).filter(id => YearSky.COMET_BY_ID[id]).length; // comets you have redrawn
      return p;
    }
    function marketMods() {
      const m = S.market && S.market.kind && MARKETS[S.market.kind];
      return { rev: (m && m.rev) || 0, res: (m && m.res) || 0, speed: (m && m.speed) || 0, cost: (m && m.cost) || 0 };
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

    // stars within reach of a regional building: breadth-first along intact routes between colonies
    function hubCoverage(origin, radius, dis) {
      const seen = new Map([[origin, 0]]);
      let layer = [origin];
      for (let depth = 1; depth <= radius; depth++) {
        const next = [];
        for (const u of layer) for (const { to, e } of adj[u]) {
          if (seen.has(to) || !S.stars[to] || dis[e]) continue;
          seen.set(to, depth); next.push(to);
        }
        layer = next;
      }
      return [...seen.keys()];
    }

    function recalc() {
      for (const k of Object.keys(S.owner)) if (S.stars[k] || !S.rivals[S.owner[k]]) delete S.owner[k]; // the books stay straight whatever changed hands
      for (const k of Object.keys(S.occupied)) if (S.stars[k]) delete S.occupied[k]; // an occupied colony is back in your hands
      for (const k of Object.keys(S.guard)) if (S.guard[k] <= S.active || !S.stars[k]) delete S.guard[k];
      S.raids = S.raids.filter(x => S.stars[x.to] && S.rivals[x.rival] && S.owner[x.from] === x.rival);
      const held = S.rivals.map(() => 0);
      for (const k of Object.keys(S.owner)) held[S.owner[k]]++;
      S.rivals.forEach((r, k) => { r.n = held[k]; });
      const claimed = claimedList();
      const P = perks();
      const M = marketMods();
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
      // buildings
      const regAuto = new Float32Array(N), tradeMul = new Float32Array(N).fill(1), labMul = new Float32Array(N).fill(1), yardSpeed = new Float32Array(N);
      const revB = new Float32Array(N), resB = new Float32Array(N), speedB = new Float32Array(N), stockB = new Float32Array(N);
      const coverage = {};
      let yardSlots = 0, launchSlots = 0, discount = 0, buildingCount = 0;
      for (const k of Object.keys(S.buildings)) {
        const i = +k;
        if (!S.stars[i]) continue;
        for (const b of S.buildings[k]) {
          const def = BUILDINGS[b.id];
          if (!def) continue;
          buildingCount++;
          const L = b.lvl;
          if (def.regional) {
            const cov = hubCoverage(i, L + 1, dis);
            coverage[i] = coverage[i] ? [...new Set(coverage[i].concat(cov))] : cov;
            if (b.id === 'clearing') { const e = [0, 0.5, 0.7, 0.9][L]; for (const j of cov) regAuto[j] = Math.max(regAuto[j], e); }
            else if (b.id === 'shipyard') { yardSlots += L; for (const j of cov) yardSpeed[j] = Math.max(yardSpeed[j], 0.1 * L); }
            else if (b.id === 'campus') { for (const j of cov) labMul[j] = Math.max(labMul[j], 1 + 0.35 * L); }
            else if (b.id === 'exchange') { for (const j of cov) tradeMul[j] = Math.max(tradeMul[j], 1 + 0.3 * L); }
          } else {
            revB[i] += (def.rev || 0) * L; resB[i] += (def.res || 0) * L; speedB[i] += (def.speed || 0) * L; stockB[i] += (def.stock || 0) * L;
            launchSlots += (def.slots || 0) * L; discount += (def.discount || 0) * L;
          }
        }
      }
      P.cost += discount;
      const globalOut = 1 + outBonus + P.out + M.rev;
      const resMul = 1 + P.res + M.res;
      const starK = 1 + P.star; // the Academy's star-classification topic strengthens every spectral and brightness bonus
      const rate = new Float64Array(N), resRate = new Float64Array(N), cap = new Float64Array(N);
      const routeMul = new Float64Array(N).fill(1);
      // meteor showers that are running now (on the real calendar): colonies under a radiant earn more, the more so near the peak
      const showerMul = new Float32Array(N).fill(1), showers = [];
      for (const x of YearSky.activeShowers(nowFn())) {
        const sh = x.shower, boost = YearSky.showerBoost(sh) * x.activity;
        let under = 0;
        for (const i of showerZone[sh.id]) if (S.stars[i]) { under++; showerMul[i] = Math.max(showerMul[i], 1 + boost); }
        showers.push({ id: sh.id, activity: x.activity, boost, colonies: under, daysToPeak: x.daysToPeak });
      }
      let routes = 0;
      SKY.edges.forEach((e, i) => {
        const [a, b] = e;
        const A = S.stars[a], B = S.stars[b];
        if (!A || !B || dis[i]) return;
        routes++;
        const comp = (cls[a] !== cls[b] ? CFG.routeBonusComp : CFG.routeBonusSame) * (1 + CFG.routeBonusPerLevel * (S.routeLvl[i] || 0)) * (1 + P.route);
        routeMul[a] += comp * (1 + CFG.routeBeaconMul * B.b) * tradeMul[a] * (1 + profile[a].route * starK);
        routeMul[b] += comp * (1 + CFG.routeBeaconMul * A.b) * tradeMul[b] * (1 + profile[b].route * starK);
      });
      let totalRate = 0, totalRes = 0, beacons = 0;
      for (const i of claimed) {
        const s = S.stars[i];
        rate[i] = baseRate[i] * (1 + 0.5 * s.r) * routeMul[i] * globalOut * Math.max(0.2, 1 + revB[i] + profile[i].rev * starK) * showerMul[i];
        resRate[i] = (CFG.researchPerLevel * s.o + resB[i] + profile[i].res * starK) * resMul * labMul[i];
        cap[i] = (isFlag[i] ? CFG.flagshipCapH : CLASS_CAP_H[cls[i]]) * 3600 * (1 + P.cap) * (1 + stockB[i] + profile[i].cap * starK);
        totalRate += rate[i]; totalRes += resRate[i]; beacons += s.b;
      }
      // where the money lands: an ordinary colony remits a share to the nearest flagship you own, and what it keeps can be banked
      // automatically (Treasury technologies plus any Clearing House); a flagship's vault never is, so it must be visited
      const homeOf = new Int16Array(N).fill(-1), tribs = {}, accr = new Float64Array(N), auto = new Float32Array(N), autoRes = new Float32Array(N);
      const anyFlag = FLAGS.some(f => S.stars[f]);
      for (const i of claimed) {
        if (isFlag[i]) { accr[i] += rate[i]; continue; }
        let h = -1;
        if (anyFlag) for (const f of sectorOrder[i]) if (S.stars[f]) { h = f; break; }
        if (h >= 0) { homeOf[i] = h; accr[i] += rate[i] * (1 - CFG.royaltyShare); accr[h] += rate[i] * CFG.royaltyShare; (tribs[h] = tribs[h] || []).push(i); }
        else accr[i] += rate[i];
        auto[i] = 1 - (1 - P.auto) * (1 - regAuto[i]);
        autoRes[i] = regAuto[i];
      }
      let manual = 0; for (const i of claimed) manual += accr[i] * (1 - auto[i]);
      const manualShare = totalRate > 0 ? manual / totalRate : 1; // the part of your income that waits for a visit
      const slots = CFG.baseSlots + Math.floor(beacons / 5 + P.slots + yardSlots + launchSlots + 1e-9);
      D = { showerMul, showers, claimed, P, M, dis, rate, resRate, cap, auto, autoRes, accr, homeOf, tribs, manualShare, starK, yardSpeed, speedB, revB, coverage, routeMul, routes, totalRate, totalRes, slots, globalOut, resMul, buildingCount, count: claimed.length };
      // promotions
      const rk = rankInfo();
      if (rk.idx > (S.corp.rank || 0)) { S.corp.rank = rk.idx; log('Promotion! ' + S.corp.name + ' is now a ' + rk.title + '.', 'rank'); }
    }
    const stockCap = i => D.accr[i] * D.cap[i] * (1 - D.auto[i]);
    const resCap = i => D.resRate[i] * D.cap[i] * (1 - D.autoRes[i]);

    // ---- corporation: rank, valuation and share price
    function rankInfo() {
      const n = D.count;
      let idx = S.corp.rank || 0; // a promotion is permanent: losing a colony to a raid does not demote the company
      RANKS.forEach((r, k) => { if (n >= r.at && k > idx) idx = k; });
      const next = RANKS[idx + 1];
      return { idx, title: RANKS[idx].title, next: next ? { title: next.title, at: next.at } : null, count: n };
    }
    const valuation = () => S.cash + D.totalRate * 6 * 3600 + D.count * 500;
    const priceTarget = () => 2 + 6 * Math.pow(valuation() / 2000, 0.42);
    function stepPrice(n) {
      const m = S.market, drift = (S.market.kind === 'boom' ? 0.004 : S.market.kind === 'crunch' ? -0.004 : 0);
      for (let k = 0; k < n; k++) {
        const target = priceTarget();
        m.price += (target - m.price) * 0.08 + m.price * ((rng() - 0.5) * 0.03 + drift);
        m.price = Math.max(target * 0.6, Math.min(target * 1.6, m.price));
        m.hist.push(Math.round(m.price * 100) / 100);
        if (m.hist.length > 80) m.hist.shift();
        m.hi = Math.max(m.hi, m.price);
      }
    }
    function settlePrice() { // after time away: the price has drifted to where the company's worth says it should be
      const m = S.market; m.price = priceTarget(); m.hist.push(Math.round(m.price * 100) / 100); if (m.hist.length > 80) m.hist.shift(); m.hi = Math.max(m.hi, m.price);
    }
    function setCorpName(name) {
      const n = String(name || '').replace(/\s+/g, ' ').trim().slice(0, 32);
      if (!n) return result(false, 'A company needs a name.');
      S.corp.name = n; S.corp.renamed = true;
      return result(true, 'Renamed to ' + n + '.');
    }

    // ---- rival companies: they hold the stars they take, expand at a share of YOUR pace, can be taken over, and slowly raid your border colonies
    function rrand() { // the rivals' own random stream (kept in the save), so they never disturb anything else
      S.rseed = (S.rseed + 0x6D2B79F5) >>> 0;
      let t = S.rseed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    const rrange = ([a, b]) => a + rrand() * (b - a);
    function initRivals() { // each rival starts on a flagship as far as possible from every other headquarters
      S.rseed = (Math.imul(S.home + 1, 2654435761) + Math.floor((S.created || 0) % 4294967296)) >>> 0;
      S.owner = {}; S.rivals = [];
      const capitals = [S.home], isFree = i => !S.stars[i] && S.owner[i] === undefined;
      let pool = FLAGS.filter(f => f !== S.home && isFree(f));
      for (let k = 0; k < CFG.rivalCount; k++) {
        if (!pool.length) pool = SKY.stars.map((st, i) => i).filter(i => isFree(i) && isLead[i] && !capitals.includes(i));
        if (!pool.length) break;
        let best = pool[0], bd = -1;
        for (const f of pool) { const d = Math.min(...capitals.map(c => sepDeg(SKY.stars[f], SKY.stars[c]))); if (d > bd + 1e-9) { bd = d; best = f; } }
        pool = pool.filter(f => f !== best); capitals.push(best);
        S.owner[best] = k;
        S.rivals.push({ id: k, name: Corp.defaultCompanyName(SKY.stars[best][6]), color: RIVAL_COLORS[k % RIVAL_COLORS.length], home: best, ratio: CFG.rivalRatios[k % CFG.rivalRatios.length], credit: 0.4, cool: 0, n: 1, lost: 0, retries: 0, contact: false, stuck: false, raidCredit: 0, raidCool: 0, captured: 0, repelled: 0 });
      }
      if (S.rivals.length) log('Rival companies are founding too: ' + S.rivals.map(r => r.name + ' (' + SKY.stars[r.home][6] + ')').join(', ') + '. They expand at about your pace and slowly raid your border colonies, always with a warning.', 'rival');
    }
    // one star for rival r: next to what it holds (a lead or flagship is likelier), else the nearest free star by route. 0 = took one,
    // 1 = nothing it may take right now, 2 = no free star is left anywhere
    function rivalClaim(r) {
      const pend = targetsPending(), open = t => !S.stars[t] && S.owner[t] === undefined && !pend.has(t);
      const touch = new Map(), mine = [];
      for (const key of Object.keys(S.owner)) {
        if (S.owner[key] !== r.id) continue;
        mine.push(+key);
        for (const n of adj[+key]) if (open(n.to)) touch.set(n.to, (touch.get(n.to) || 0) + 1);
      }
      let pick = -1;
      if (touch.size) {
        const items = [...touch].map(([t, c]) => [t, STAR_RANKS[RANK_OF[t]].weight * (1 + 0.3 * (c - 1))]);
        let x = rrand() * items.reduce((a, it) => a + it[1], 0);
        pick = items[items.length - 1][0];
        for (const [t, w] of items) { x -= w; if (x <= 0) { pick = t; break; } }
      } else if (mine.length) {
        const near = new Set(claimedList()); let ring = [...near];
        for (let d = 0; d < CFG.rivalSafeHops; d++) { const nx = []; for (const u of ring) for (const n of adj[u]) if (!near.has(n.to)) { near.add(n.to); nx.push(n.to); } ring = nx; }
        const seen = new Set(mine); let layer = mine;
        while (layer.length && pick < 0) {
          const nx = [];
          for (const u of layer) for (const n of adj[u]) if (!seen.has(n.to)) { seen.add(n.to); nx.push(n.to); }
          const cand = nx.filter(t => open(t) && !near.has(t));
          if (cand.length) pick = cand[Math.floor(rrand() * cand.length)];
          layer = nx;
        }
      }
      if (pick < 0) return SKY.stars.some((st, i) => !S.stars[i] && S.owner[i] === undefined) ? 1 : 2;
      S.owner[pick] = r.id; r.n++; r.retries = 0;
      const rank = RANK_OF[pick], nm = SKY.stars[pick][6];
      if (rank === 'flagship') log(r.name + ' has colonised the flagship ' + nm + '.', 'rival');
      else if (rank === 'lead') log(r.name + ' has colonised ' + nm + ' (' + SKY.consts[SKY.stars[pick][5]].name + ').', 'rival-note');
      if (!r.contact && adj[pick].some(n => S.stars[n.to])) { r.contact = true; log('Your territory now touches ' + r.name + '.', 'rival'); }
      return 0;
    }
    function rivalsEarn() { // you added a colony: every rival earns a share of one
      for (const r of S.rivals) {
        if (r.n <= 0) continue;
        const before = r.credit;
        r.credit = Math.min(CFG.rivalCreditCap, r.credit + r.ratio * (0.6 + 0.8 * rrand()));
        if (before < 1 && r.credit >= 1) r.cool = Math.max(r.cool || 0, rrange(CFG.rivalGap));
      }
    }
    const rivalReady = r => r.n > 0 && !r.stuck && r.credit >= 1;
    function rivalsAct() { // rivals with credit and an expired timer take a star
      for (const r of S.rivals) {
        if (!rivalReady(r) || r.cool > 1e-9) continue;
        const res = rivalClaim(r);
        if (res === 0) { r.credit -= 1; r.cool = rrange(CFG.rivalGap); }
        else if (res === 1) r.cool = CFG.rivalRetry * Math.min(80, 1 + (r.retries = (r.retries || 0) + 1));
        else r.stuck = true;
      }
    }
    function catchUpRivals() { // an older save: grow every rival to its share of how far you have come
      const want = Math.max(0, D.count - 1);
      for (const r of S.rivals) {
        for (let guard = 0; r.n < Math.round(r.ratio * want) && guard < 2000; guard++) if (rivalClaim(r) !== 0) break;
        r.credit = 0;
      }
      recalc();
    }
    function takeOver(i, k, reclaimed) { // the star you just reached was a rival's (reclaimed: it was yours, and kept its levels and buildings)
      const r = S.rivals[k];
      delete S.owner[i]; r.n = Math.max(0, r.n - 1); r.lost = (r.lost || 0) + 1;
      if (!reclaimed) { S.stats.takeovers++; if (RANK_OF[i] === 'flagship') S.stats.flagTakeovers++; }
      const capital = r.home === i;
      if (capital) S.stats.capitals++;
      log(reclaimed ? 'Took back ' + SKY.stars[i][6] + ' from ' + r.name + ': its levels and buildings are yours again.' : 'Took over ' + SKY.stars[i][6] + ' (' + SKY.consts[SKY.stars[i][5]].name + ') from ' + r.name + (capital ? ': their headquarters!' : '.'), 'claim');
      if (r.n === 0) { S.stats.acquired++; S.raids = S.raids.filter(x => x.rival !== k); log(r.name + ' has lost its last star and is acquired by ' + S.corp.name + '.', 'rank'); }
    }
    function rivalsMeet(i) { // your new colony touches a rival's: say so, once
      for (const n of adj[i]) { const r = S.rivals[S.owner[n.to]]; if (r && !r.contact) { r.contact = true; log('Your territory now touches ' + r.name + '.', 'rival'); } }
    }
    const rivalOf = i => (S.stars[i] || S.owner[i] === undefined ? -1 : S.owner[i]);
    function rivals() { // a summary for the screens
      const touching = new Set();
      for (const key of Object.keys(S.owner)) if (adj[+key].some(n => S.stars[n.to])) touching.add(S.owner[key]);
      return S.rivals.map(r => ({ id: r.id, name: r.name, color: r.color, home: r.home, n: r.n, share: r.n / N, lost: r.lost || 0, captured: r.captured || 0, repelled: r.repelled || 0, strength: strengthOf(r), ratio: r.ratio, out: r.n === 0, touching: touching.has(r.id), capitalHeld: S.owner[r.home] === r.id }));
    }

    // ---- raids: a rival slowly sends an assault fleet against a colony on its border; you always get a warning, only while you play
    const buildingLevels = i => buildingsAt(i).reduce((n, b) => n + b.lvl, 0);
    const guarded = i => (S.guard[i] || 0) > S.active;
    const strengthOf = r => CFG.strengthBase + CFG.strengthPerRoot * Math.sqrt(Math.max(0, r.n));
    function defenceOf(i) { // development, buildings, a flagship's garrison and any reinforcement; the headquarters can never be taken
      if (!S.stars[i]) return 0;
      if (i === S.home) return Infinity;
      return CFG.defenceBase + CFG.defencePerLevel * lvl(i) + CFG.defencePerBuilding * buildingLevels(i) + (isFlag[i] ? CFG.defenceFlagship : 0) + (guarded(i) ? CFG.reinforceBoost : 0);
    }
    const raidOdds = (i, r) => { const d = defenceOf(i); return d === Infinity ? 0 : strengthOf(r) / (strengthOf(r) + d); };
    function threatOf(i) { // the rival best placed to take colony i: the strongest one with a star beside it
      if (!S.stars[i] || i === S.home) return null;
      let best = null;
      for (const n of adj[i]) { const r = S.rivals[S.owner[n.to]]; if (!r) continue; const o = raidOdds(i, r); if (!best || o > best.odds) best = { rival: r.id, odds: o }; }
      return best;
    }
    function raidTargets(r) { // your colonies next to rival r's stars (never the headquarters, nor one already under attack): target -> the star it would sail from
      const busy = new Set(S.raids.map(x => x.to)), out = new Map();
      for (const key of Object.keys(S.owner)) {
        if (S.owner[key] !== r.id) continue;
        for (const n of adj[+key]) { const t = n.to; if (!S.stars[t] || t === S.home || busy.has(t)) continue; const prev = out.get(t); if (!prev || edgeLen[n.e] < prev.deg) out.set(t, { from: +key, deg: edgeLen[n.e] }); }
      }
      return out;
    }
    function raidsEarn() { // you added a colony: every rival earns a small share of a raid (none while your company is tiny)
      if (Object.keys(S.stars).length < CFG.raidMinColonies) return;
      for (const r of S.rivals) if (r.n > 0) r.raidCredit = Math.min(CFG.raidCreditCap, (r.raidCredit || 0) + CFG.raidRatio * r.ratio * (0.6 + 0.8 * rrand()));
    }
    const raidReady = r => r.n > 0 && (r.raidCredit || 0) >= 1 && Object.keys(S.stars).length >= CFG.raidMinColonies && !S.raids.some(x => x.rival === r.id);
    const waitText = secs => (secs < 120 ? Math.round(secs) + ' seconds' : Math.round(secs / 60) + ' minutes');
    function launchRaid(r) {
      const cand = raidTargets(r);
      if (!cand.size) { r.raidCool = 300; return false; }
      const items = [...cand].map(([t, o]) => [t, o, raidOdds(t, r) * STAR_RANKS[RANK_OF[t]].weight]);
      let x = rrand() * items.reduce((a, it) => a + it[2], 0), pick = items[items.length - 1];
      for (const it of items) { x -= it[2]; if (x <= 0) { pick = it; break; } }
      const [t, o] = pick, secs = Math.max(CFG.raidMinSecs, o.deg * CFG.raidSecPerDeg);
      S.raids.push({ id: ++S.raidSeq, rival: r.id, from: o.from, to: t, remaining: secs, dur: secs });
      r.raidCredit -= 1; r.raidCool = CFG.raidGap * (0.8 + 0.4 * rrand());
      log('⚠ ' + r.name + ' is moving against ' + SKY.stars[t][6] + ' (' + Math.round(100 * raidOdds(t, r)) + '% to succeed): it lands in ' + waitText(secs) + '. Collect its vault, reinforce it or develop it.', 'raid');
      return true;
    }
    function captureStar(i, r) { // the colony is occupied: it keeps its levels and buildings, waiting for you to take it back
      const s0 = S.stars[i], seized = s0.s;
      S.occupied[i] = { r: s0.r, b: s0.b, o: s0.o, t: s0.t, by: r.id, at: nowFn() };
      delete S.stars[i]; S.owner[i] = r.id; r.n++; r.captured = (r.captured || 0) + 1; S.stats.starsLost++;
      S.petitions = S.petitions.filter(p => p.star !== i);
      log('⚠ ' + r.name + ' has captured ' + SKY.stars[i][6] + ' (' + SKY.consts[SKY.stars[i][5]].name + ')' + (seized >= 1 ? ', seizing its vault of $' + fmt(seized) : '') + '. Its levels and buildings are kept: take it back for ' + Math.round(CFG.reclaimMul * 100) + '% of a takeover.', 'raid');
      recalc();
    }
    function resolveRaid(x) {
      S.raids = S.raids.filter(y => y !== x);
      const r = S.rivals[x.rival], t = x.to;
      if (!r || r.n <= 0 || !S.stars[t] || t === S.home) return;
      const odds = raidOdds(t, r);
      if (rrand() < odds) captureStar(t, r);
      else { r.repelled = (r.repelled || 0) + 1; S.stats.repelled++; log('Repelled: ' + r.name + '’s assault on ' + SKY.stars[t][6] + ' failed (it had a ' + Math.round(odds * 100) + '% chance).', 'raid-ok'); }
    }
    function raidsStep(dt) { // while you play: fleets fly, cooldowns run, rivals with credit launch
      let left = dt, guard = 0;
      while (left > 1e-9 && guard++ < 5000) {
        let step = left;
        for (const x of S.raids) step = Math.min(step, Math.max(x.remaining, 1e-6));
        for (const r of S.rivals) if (raidReady(r)) step = Math.min(step, Math.max(r.raidCool || 0, 1e-6));
        for (const x of S.raids) x.remaining -= step;
        for (const r of S.rivals) r.raidCool = Math.max(0, (r.raidCool || 0) - step);
        left -= step;
        for (const x of S.raids.slice()) if (x.remaining <= 1e-9) resolveRaid(x);
        for (const r of S.rivals) if (raidReady(r) && (r.raidCool || 0) <= 1e-9) launchRaid(r);
      }
    }
    const reinforceCost = () => Math.ceil(claimCost() * CFG.reinforceFrac);
    function canReinforce(i) {
      if (!S.stars[i]) return result(false, 'That colony is not yours.');
      if (i === S.home) return result(false, 'Headquarters cannot be captured.');
      if (guarded(i)) return result(false, 'Already reinforced.');
      if (!threatOf(i)) return result(false, 'No rival holds a star next to ' + SKY.stars[i][6] + ', so it cannot be raided right now.');
      if (S.cash < reinforceCost()) return result(false, 'Needs $' + fmt(reinforceCost()) + '.');
      return result(true);
    }
    function reinforce(i) {
      const chk = canReinforce(i);
      if (!chk.ok) return chk;
      S.cash -= reinforceCost(); S.guard[i] = S.active + CFG.reinforceSecs; S.stats.reinforced++;
      return result(true, SKY.stars[i][6] + ' is reinforced for ' + Math.round(CFG.reinforceSecs / 60) + ' minutes of play: +' + CFG.reinforceBoost + ' defence.');
    }
    const raidsNow = () => S.raids.map(x => Object.assign({}, x, { odds: raidOdds(x.to, S.rivals[x.rival]) }));
    const defenceParts = i => (!S.stars[i] || i === S.home ? null : { base: CFG.defenceBase, levels: lvl(i), buildings: buildingLevels(i), flagship: !!isFlag[i], guard: guarded(i) }); // what defenceOf(i) adds up
    function exposed() { // colonies a rival could raid right now: the ones under attack first, then the unguarded, most vulnerable first
      const under = new Set(S.raids.map(x => x.to)), out = [];
      for (const k of Object.keys(S.stars)) { const i = +k, th = threatOf(i); if (th) out.push({ i, odds: th.odds, rival: th.rival, attacked: under.has(i), guarded: guarded(i) }); }
      out.sort((a, b) => (b.attacked - a.attacked) || (a.guarded - b.guarded) || (b.odds - a.odds) || (a.i - b.i));
      return out;
    }

    // ---- what a star costs: the going rate times its importance (flagships and constellation leaders are dear, ordinary stars cheap),
    // times a takeover premium if a rival holds it
    const starRank = i => ({ kind: RANK_OF[i], label: STAR_RANKS[RANK_OF[i]].label, mul: priceMul(i) });
    const starPrice = i => Math.ceil(claimCost() * priceMul(i) * (rivalOf(i) >= 0 ? CFG.takeoverMul * (S.occupied[i] ? CFG.reclaimMul : 1) : 1)); // taking back one of your own is cheaper

    // ---- costs
    const costMul = () => 1 - Math.min(0.5, D.P.cost + D.M.cost);
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
      return { research: Math.ceil((CFG.messierResearchBase + CFG.messierResearchStep * v) * costMul()), cash: Math.ceil(claimCost() * CFG.messierCashFrac) };
    }
    function developMessierCost() {
      const v = Object.keys(S.messier).filter(k => S.messier[k].dev).length;
      return Math.ceil((CFG.developMessierBase + CFG.developMessierStep * v) * costMul());
    }
    function travelSeconds(fromStar, deg, messier, edge) {
      const routeSpeed = edge !== undefined ? CFG.routeSpeedPerLevel * (S.routeLvl[edge] || 0) : 0;
      const reduce = Math.min(1 - CFG.speedFloor, D.P.speed + D.M.speed + CFG.beaconSpeed * S.stars[fromStar].b + D.yardSpeed[fromStar] + D.speedB[fromStar] + profile[fromStar].speed * D.starK + routeSpeed);
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
      if (S.stars[target]) return result(false, 'Already colonised.');
      const pend = targetsPending();
      if (pend.has(target)) return result(false, 'A colony ship is already bound for this star.');
      if (S.orders.length >= CFG.orderMax) return result(false, 'The charter queue is full.');
      const reach = adj[target].some(n => S.stars[n.to] || pend.has(n.to));
      if (!reach) return result(false, 'No colony is connected to this star.');
      if (S.cash < starPrice(target)) return result(false, 'Not enough cash.');
      return result(true);
    }
    // Pay now, fly when a slot is free and a claimed star touches the target (so orders can chain outward, even offline).
    function launch(target) {
      const chk = canLaunchTo(target);
      if (!chk.ok) return chk;
      const paid = starPrice(target), takeover = rivalOf(target) >= 0;
      S.cash -= paid;
      S.orders.push({ id: ++S.orderSeq, to: target, paid });
      dispatch();
      const flying = S.fleets.find(f => f.kind === 's' && f.to === target);
      recalc();
      if (flying) return result(true, (takeover ? 'Takeover fleet launched from ' : 'Colony ship launched from ') + SKY.stars[flying.from][6] + '.', { sec: flying.dur, flying: true, takeover });
      return result(true, 'Charter queued: the ' + (takeover ? 'takeover fleet' : 'colony ship') + ' leaves as soon as a fleet slot is free and a neighbouring colony is yours.', { queued: true, takeover });
    }
    function cancelOrder(id) {
      const k = S.orders.findIndex(o => o.id === id);
      if (k < 0) return result(false, 'No such order.');
      S.cash += S.orders[k].paid; S.orders.splice(k, 1);
      recalc();
      return result(true, 'Charter cancelled and refunded.');
    }
    function dispatch() {
      let sent = false;
      for (let k = 0; k < S.orders.length && S.fleets.length < D.slots;) {
        const o = S.orders[k];
        if (S.stars[o.to]) { S.cash += o.paid; S.orders.splice(k, 1); continue; } // got there another way
        const origins = frontierOrigins(o.to).map(x => Object.assign(x, { sec: travelSeconds(x.from, x.deg, false, x.e) })).sort((a, b) => a.sec - b.sec);
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
      if (S.fleets.some(f => f.kind === 'm' && f.to === m)) return result(false, 'A survey mission is already under way.');
      if (!messierAccess(m).length) return result(false, 'Colonise a nearby star first.');
      if (S.fleets.length >= D.slots) return result(false, 'All fleets are out (' + D.slots + ' slots).');
      const c = messierCost();
      if (S.research < c.research) return result(false, 'Needs ' + fmt(c.research) + ' RP.');
      if (S.cash < c.cash) return result(false, 'Needs $' + fmt(c.cash) + '.');
      return result(true);
    }
    function visitMessier(m) {
      const chk = canVisitMessier(m);
      if (!chk.ok) return chk;
      const obj = SKY.messier[m];
      const o = messierAccess(m).map(i => ({ from: i, deg: sepDeg(SKY.stars[i], obj) })).map(x => Object.assign(x, { sec: travelSeconds(x.from, x.deg, true) })).sort((a, b) => a.sec - b.sec)[0];
      const c = messierCost();
      S.research -= c.research; S.cash -= c.cash;
      S.fleets.push({ id: ++S.fleetSeq, kind: 'm', from: o.from, to: m, remaining: o.sec, dur: o.sec });
      recalc();
      return result(true, 'Survey mission sent from ' + SKY.stars[o.from][6] + '.', { sec: o.sec });
    }
    function developMessier(m) {
      const e = S.messier[m];
      if (!e) return result(false, 'Visit it first.');
      if (e.dev) return result(false, 'Already developed.');
      const c = developMessierCost();
      if (S.research < c) return result(false, 'Needs ' + fmt(c) + ' RP.');
      S.research -= c; e.dev = nowFn();
      log('Studied M' + SKY.messier[m].n + ' in depth: its bonus is doubled.', 'messier');
      recalc();
      return result(true, 'Bonus doubled.');
    }

    function upgrade(i, t) {
      const s = S.stars[i];
      if (!s) return result(false, 'Not colonised.');
      if (s[t] >= MAX_LEVEL) return result(false, 'Max level.');
      const c = upgradeCost(i, t);
      if (S.cash < c) return result(false, 'Needs $' + fmt(c) + '.');
      S.cash -= c; s[t]++;
      S.stats.upgrades++;
      completePetitions({ type: 'upgrade', star: i, track: t, level: s[t] });
      recalc();
      return result(true, TRACK_INFO[t].name + ' level ' + s[t] + '.');
    }

    // ---- buildings: built from human technology, in the colony's building slots (one per three development levels)
    const buildingsAt = i => S.buildings[i] || [];
    const buildingAt = (i, id) => buildingsAt(i).find(b => b.id === id);
    function slotsAt(i) {
      if (!S.stars[i]) return 0;
      let n = Math.floor(lvl(i) / 3);
      for (const b of buildingsAt(i)) { const def = BUILDINGS[b.id]; if (def && def.slotsFor) n += def.slotsFor(b.lvl); }
      return n;
    }
    function buildingCost(i, id) {
      const def = BUILDINGS[id];
      if (!def) return null;
      const have = buildingAt(i, id), L = have ? have.lvl : 0;
      if (L >= BUILDING_MAX) return null;
      const mul = BUILD_LEVEL_MUL[L], floor = claimCost() * CFG.buildingFloor;
      let cash;
      if (def.payback) { // industry: costs what the extra revenue earns back in `payback` hours
        const base = D.rate[i] / Math.max(0.2, 1 + D.revB[i] + profile[i].rev * D.starK);
        cash = Math.max(floor, def.rev * base * 3600 * def.payback) * mul;
      } else cash = claimCost() * def.costMul * mul;
      return { cash: Math.ceil(cash), research: Math.ceil(def.rp * mul * (1 + 0.02 * D.count) * costMul()), next: L + 1 };
    }
    function canBuild(i, id) {
      if (!S.stars[i]) return result(false, 'Not colonised.');
      const def = BUILDINGS[id];
      if (!def) return result(false, 'Unknown building.');
      if (!S.tech.done[def.tech]) return result(false, 'Needs the ' + TECH_BY_ID[def.tech].name + ' technology.');
      const have = buildingAt(i, id);
      if (!have && buildingsAt(i).length >= slotsAt(i)) return result(false, 'No free building slot (' + buildingsAt(i).length + ' / ' + slotsAt(i) + '). Develop this colony further or build a Space Station.');
      const c = buildingCost(i, id);
      if (!c) return result(false, 'Already at maximum level.');
      if (S.cash < c.cash) return result(false, 'Needs $' + fmt(c.cash) + '.');
      if (S.research < c.research) return result(false, 'Needs ' + fmt(c.research) + ' RP.');
      return result(true);
    }
    function build(i, id) {
      const chk = canBuild(i, id);
      if (!chk.ok) return chk;
      const c = buildingCost(i, id), def = BUILDINGS[id];
      S.cash -= c.cash; S.research -= c.research;
      let b = buildingAt(i, id);
      if (b) { b.lvl = c.next; S.stats.buildUps++; }
      else { b = { id, lvl: 1, t: nowFn(), paid: { cash: 0, research: 0 } }; (S.buildings[i] = S.buildings[i] || []).push(b); S.stats.built++; }
      b.paid = b.paid || { cash: 0, research: 0 };
      b.paid.cash += c.cash; b.paid.research += c.research;
      log((c.next > 1 ? 'Upgraded the ' + def.name + ' to level ' + c.next : 'Built ' + (/^[AEIOU]/i.test(def.name) ? 'an ' : 'a ') + def.name) + ' at ' + SKY.stars[i][6] + '.', 'build');
      recalc();
      return result(true, def.name + ' level ' + c.next + '.');
    }
    function canDemolish(i, id) {
      const b = buildingAt(i, id);
      if (!b) return result(false, 'No such building.');
      const def = BUILDINGS[id];
      const slotsAfter = slotsAt(i) - (def.slotsFor ? def.slotsFor(b.lvl) : 0);
      if (buildingsAt(i).length - 1 > slotsAfter) return result(false, 'Remove another building first: this Space Station provides the slots they use.');
      return result(true);
    }
    function demolish(i, id) {
      const chk = canDemolish(i, id);
      if (!chk.ok) return chk;
      const list = S.buildings[i], k = list.findIndex(b => b.id === id), b = list[k];
      const back = { cash: Math.floor((b.paid ? b.paid.cash : 0) * CFG.demolishRefund), research: Math.floor((b.paid ? b.paid.research : 0) * CFG.demolishRefund) };
      list.splice(k, 1); if (!list.length) delete S.buildings[i];
      S.cash += back.cash; S.research += back.research; S.stats.demolished++;
      log('Demolished the ' + BUILDINGS[id].name + ' at ' + SKY.stars[i][6] + ' (refund $' + fmt(back.cash) + ').', 'build');
      recalc();
      return result(true, 'Demolished. Refund $' + fmt(back.cash) + '.', back);
    }
    function buildingSummary(i, id) { // plain-language effect (and how many colonies a regional building reaches)
      const b = buildingAt(i, id); if (!b) return null;
      const def = BUILDINGS[id], cov = def.regional ? hubCoverage(i, b.lvl + 1, D.dis).length : 1;
      return { id, lvl: b.lvl, text: def.text(b.lvl), covered: cov, radius: b.lvl + 1, regional: !!def.regional };
    }
    const allBuildings = () => { const out = []; for (const k of Object.keys(S.buildings)) for (const b of S.buildings[k]) out.push({ star: +k, id: b.id, lvl: b.lvl }); return out; };

    // ---- technology: one project at a time, in real time (also while you are away)
    const techDone = id => !!S.tech.done[id];
    function techStatus(id) {
      if (techDone(id)) return 'done';
      if (S.tech.active && S.tech.active.id === id) return 'active';
      return TECH_BY_ID[id].req.every(techDone) ? 'available' : 'locked';
    }
    function techCost(id) {
      const t = TECH_BY_ID[id];
      return { cash: Math.ceil(claimCost() * t.cashMul), research: Math.ceil(t.rp * (1 + 0.02 * D.count) * costMul()), secs: t.secs };
    }
    function canStartTech(id) {
      const t = TECH_BY_ID[id];
      if (!t) return result(false, 'Unknown technology.');
      if (techDone(id)) return result(false, 'Already researched.');
      if (S.tech.active) return result(false, 'Another project is under way: ' + TECH_BY_ID[S.tech.active.id].name + '.');
      const missing = t.req.filter(r => !techDone(r));
      if (missing.length) return result(false, 'Needs ' + missing.map(r => TECH_BY_ID[r].name).join(', ') + '.');
      const c = techCost(id);
      if (S.cash < c.cash) return result(false, 'Needs $' + fmt(c.cash) + '.');
      if (S.research < c.research) return result(false, 'Needs ' + fmt(c.research) + ' RP.');
      return result(true);
    }
    function startTech(id) {
      const chk = canStartTech(id);
      if (!chk.ok) return chk;
      const c = techCost(id);
      S.cash -= c.cash; S.research -= c.research;
      S.tech.active = { id, remaining: c.secs, dur: c.secs };
      log('Research begins: ' + TECH_BY_ID[id].name + '.', 'tech');
      return result(true, 'Research begins: ' + TECH_BY_ID[id].name + '.', { secs: c.secs });
    }
    function completeTech() {
      const a = S.tech.active;
      if (!a || a.remaining > 1e-9) return false;
      const t = TECH_BY_ID[a.id];
      S.tech.done[a.id] = nowFn(); S.tech.active = null; S.stats.techs++;
      log('Research complete: ' + t.name + (t.unlocks.length ? '. Unlocks ' + t.unlocks.map(u => BUILDINGS[u].name).join(', ') : '') + '.', 'tech');
      return true;
    }
    const techCount = () => Object.keys(S.tech.done).length;

    // ---- surveys: what a colonised star turned out to hold
    const profileOf = i => profile[i];
    const isFlagship = i => !!isFlag[i];
    const sectorOf = i => (D.homeOf[i] >= 0 ? D.homeOf[i] : -1);
    const tributaries = f => D.tribs[f] || [];

    // ---- market conditions: random, timed, only while you are playing
    function startMarket() {
      const kinds = Object.keys(MARKETS), kind = kinds[randInt(kinds.length)], m = MARKETS[kind];
      S.market.kind = kind; S.market.remaining = m.secs; S.stats.marketEvents++;
      log('Market news: ' + m.name + ' (' + m.text + ').', 'market');
      recalc();
    }

    // ---- route upgrades
    function routeLevel(e) { return S.routeLvl[e] || 0; }
    function routeUpgradeCost(e) {
      const L = routeLevel(e);
      if (L >= ROUTE_MAX) return null;
      return Math.ceil(CFG.routeUpgradeBase * Math.pow(CFG.routeUpgradeGrow, L) * (1 + CFG.upgradeSize * D.count) * (1 + edgeLen[e] / 10) * costMul());
    }
    function canUpgradeRoute(e) {
      const ed = SKY.edges[e];
      if (!ed) return result(false, 'No route here.');
      if (!S.stars[ed[0]] || !S.stars[ed[1]]) return result(false, 'Both stars must be colonised.');
      if (D.dis[e]) return result(false, 'This route is cut right now.');
      const c = routeUpgradeCost(e);
      if (c === null) return result(false, 'Route is at maximum level.');
      if (S.cash < c) return result(false, 'Needs $' + fmt(c) + '.');
      return result(true);
    }
    function upgradeRoute(e) {
      const chk = canUpgradeRoute(e);
      if (!chk.ok) return chk;
      S.cash -= routeUpgradeCost(e);
      S.routeLvl[e] = routeLevel(e) + 1;
      S.stats.routeUps++;
      recalc();
      return result(true, 'Route level ' + S.routeLvl[e] + '.');
    }

    function collect(i) {
      const s = S.stars[i];
      if (!s) return result(false, 'Not colonised.', { gain: 0, res: 0 });
      const base = s.s, res = s.i;
      if (base < 0.01 && res < 0.01) return result(false, 'Nothing to collect.', { gain: 0, res: 0 });
      const flag = !!isFlag[i], bonus = flag ? base * CFG.flagshipPremium : 0, gain = base + bonus; // a flagship pays a dividend premium
      S.cash += gain; S.research += res; s.s = 0; s.i = 0;
      S.stats.collected += gain; S.stats.collects++;
      if (flag) { S.stats.flagCollects++; S.stats.flagCash += gain; }
      completePetitions({ type: 'collect', star: i, fraction: capFraction(i, base) });
      return result(true, '', { gain, res, bonus, flagship: flag });
    }
    function capFraction(i, gain) { const cap = stockCap(i); return cap > 0 ? gain / cap : 0; }
    function collectConstellation(c) {
      let gain = 0, res = 0, kept = 0;
      for (const i of SKY.consts[c].stars) {
        const s = S.stars[i]; if (!s) continue;
        if (isFlag[i]) { if (s.s > 0) kept++; continue; } // a flagship keeps its own books: it has to be visited
        gain += s.s; res += s.i; S.stats.collected += s.s; S.stats.collects++; s.s = 0; s.i = 0;
      }
      S.cash += gain; S.research += res;
      return result(true, '', { gain, res, kept });
    }
    function canCollectConstellation(c) { return !!S.devConst[c]; }

    // Rewards from outside the economy loop (the Sky School quizzes).
    function grant(cash, research) { S.cash += cash || 0; S.research += research || 0; }

    // ---- petitions
    function addPetition() {
      const open = new Set(S.petitions.map(p => p.star));
      const pool = D.claimed.filter(i => !open.has(i));
      if (!pool.length) return;
      const i = pool[randInt(pool.length)];
      const s = S.stars[i];
      const kinds = [];
      TRACKS.forEach(t => { if (s[t] < MAX_LEVEL) kinds.push('upgrade:' + t); });
      if (adj[i].some(n => !S.stars[n.to] && S.owner[n.to] === undefined)) kinds.push('expand');
      if (s.s >= 0) kinds.push('collect');
      const k = kinds[randInt(kinds.length)];
      const p = { id: ++S.petitionSeq, star: i, type: k.split(':')[0], created: S.clock };
      if (p.type === 'upgrade') { p.track = k.split(':')[1]; p.level = s[p.track] + 1; p.reward = Math.ceil(upgradeCost(i, p.track) * 1.6); }
      else if (p.type === 'expand') { p.reward = Math.ceil(claimCost() * 1.4); }
      else { p.reward = Math.ceil((60 + 4 * D.count) ); p.fraction = 0.7; }
      p.research = 6 + randInt(10);
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
          S.cash += p.reward; S.research += p.research;
          S.stats.petitionsDone++;
          log(SKY.stars[p.star][6] + '’s petition is answered: +$' + fmt(p.reward) + ', +' + p.research + ' RP.', 'petition');
        }
      }
    }
    function dismissPetition(id) { S.petitions = S.petitions.filter(p => p.id !== id); }

    // ---- events (comets & novae)
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
        const fresh = YearSky.COMETS.filter(c => !S.comets[c.id]), pool = fresh.length ? fresh : YearSky.COMETS, comet = pool[randInt(pool.length)];
        ev = { kind: 'comet', comet: comet.id, name: 'Comet ' + comet.name, edges: set, center: SKY.edges[seed][0], total: CFG.cometSeconds, where: SKY.consts[c0].name };
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
      S.cash += gain;
      S.stats.restoredRoutes++;
      let done = false, bonus = 0;
      if (ev.restored.length === ev.edges.length) {
        done = true;
        const perfect = ev.misses === 0 && !ev.hint;
        if (perfect) { bonus = ev.paid * 0.5; S.cash += bonus; S.stats.perfect++; }
        S.research += 4 * ev.edges.length * (ev.hint ? 0.25 : 1);
        S.stats.eventsDone++;
        log(ev.name + ' routes redrawn' + (perfect ? ' perfectly' : '') + ': +$' + fmt(ev.paid + bonus) + '.', 'event-done');
        const comet = ev.kind === 'comet' && YearSky.COMET_BY_ID[ev.comet];
        if (comet && !S.comets[comet.id]) { S.comets[comet.id] = { t: nowFn(), perfect }; log('Catalogued ' + comet.name + ' (' + comet.desig + '): ' + comet.note, 'sky'); }
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
      if (S.tech.active) t = Math.min(t, S.tech.active.remaining);
      for (const r of S.rivals) if (rivalReady(r)) t = Math.min(t, Math.max(r.cool, 1e-6));
      return t;
    }
    function accrue(dt) {
      let w = 0, wi = 0;
      for (const i of D.claimed) {
        const s = S.stars[i], e = D.auto[i], er = D.autoRes[i];
        const r = D.accr[i] * dt, ir = D.resRate[i] * dt;
        if (e > 0) w += r * e;   // cash banked straight into the wallet (Treasury technologies, Clearing House)
        if (er > 0) wi += ir * er; // research only by a Clearing House
        const cap = stockCap(i), icap = resCap(i);
        if (s.s < cap) s.s = Math.min(cap, s.s + r * (1 - e));
        if (s.i < icap) s.i = Math.min(icap, s.i + ir * (1 - er));
      }
      if (w > 0 || wi > 0) { S.cash += w; S.research += wi; S.stats.auto += w; }
    }
    function arrive() {
      let changed = false;
      for (let k = S.fleets.length - 1; k >= 0; k--) {
        const f = S.fleets[k];
        if (f.remaining > 1e-9) continue;
        S.fleets.splice(k, 1); changed = true;
        if (f.kind === 's') {
          if (!S.stars[f.to]) {
            const was = S.owner[f.to], occ = S.occupied[f.to];
            S.stars[f.to] = occ ? { t: nowFn(), s: 0, i: 0, r: occ.r, b: occ.b, o: occ.o } : { t: nowFn(), s: 0, i: 0, r: 0, b: 0, o: 0 };
            if (occ) { delete S.occupied[f.to]; S.stats.reclaimed++; }
            S.stats.claimed++;
            const st = SKY.stars[f.to];
            const pf = profile[f.to];
            if (was !== undefined && S.rivals[was]) takeOver(f.to, was, !!occ);
            else log('Colonised ' + st[6] + ' (' + SKY.consts[st[5]].name + '), a class ' + pf.letter + ' star' + (pf.tier ? ' of ' + pf.tier.name.toLowerCase() + ' brightness' : '') + (isFlag[f.to] ? ' and a new flagship' : '') + '.', 'claim');
            rivalsMeet(f.to);
            completePetitions({ type: 'claim', star: f.to });
            if (!occ) { rivalsEarn(); raidsEarn(); } // taking back a colony you lost adds nothing to your empire, so it earns the rivals no credit
          }
        } else if (!S.messier[f.to]) {
          S.messier[f.to] = { t: nowFn() };
          const m = SKY.messier[f.to];
          log('Catalogued M' + m.n + (m.alt ? ' (' + m.alt + ')' : '') + '.', 'messier');
        }
      }
      if (completeTech()) changed = true;
      if (changed) { recalc(); if (dispatch()) recalc(); }
    }
    // Advance the world by dt seconds. `active` = the player has the game open (events and petitions only run then).
    function tick(dt, active) {
      if (dt <= 0) return;
      if (Math.floor(nowFn() / 3600e3) !== S.skyKey) { skyUpdate(); recalc(); } // a new hour: a shower may have begun, ended or reached its peak
      let left = dt;
      let guard = 0;
      while (left > 1e-9 && guard++ < 100000) {
        const step = Math.min(left, Math.max(nextArrival(), 1e-6));
        accrue(step);
        for (const f of S.fleets) f.remaining -= step;
        if (S.tech.active) S.tech.active.remaining -= step;
        for (const r of S.rivals) if (rivalReady(r)) r.cool -= step;
        S.clock += step; left -= step;
        arrive();
        rivalsAct();
      }
      if (active) {
        S.active += dt;
        raidsStep(dt);
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
        // market conditions and the share price
        if (S.market.kind) {
          S.market.remaining -= dt;
          if (S.market.remaining <= 0) { log('Market conditions return to normal.', 'market'); S.market.kind = null; S.market.nextIn = rand(CFG.marketGap); recalc(); }
        } else {
          S.market.nextIn -= dt;
          if (S.market.nextIn <= 0) startMarket();
        }
        S.market.priceTimer += dt;
        if (S.market.priceTimer >= CFG.priceStepSecs) { const n = Math.min(12, Math.floor(S.market.priceTimer / CFG.priceStepSecs)); S.market.priceTimer = 0; stepPrice(n); }
        S.petitionTimer -= dt;
        if (S.petitionTimer <= 0) {
          if (S.petitions.length < Math.min(CFG.petitionMax, 1 + Math.floor(D.count / 6))) addPetition();
          S.petitionTimer = rand(CFG.petitionGap);
        }
      }
    }
    function catchUp(seconds) { tick(Math.min(Math.max(0, seconds), CFG.maxOfflineSeconds), false); if (seconds > 60) settlePrice(); }

    // ---- queries
    function fmt(n) {
      if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
      if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
      if (n >= 1e4) return (n / 1e3).toFixed(1) + 'k';
      if (n >= 100) return String(Math.round(n));
      return n.toFixed(n < 10 ? 1 : 0);
    }
    function frontier() { // free stars (no one holds them) adjacent to your colonies
      const out = new Set();
      for (const i of D.claimed) for (const n of adj[i]) if (!S.stars[n.to] && S.owner[n.to] === undefined) out.add(n.to);
      return out;
    }
    function takeoverTargets() { // stars a rival holds next to your colonies (or to a ship's destination), cheapest first
      const pend = targetsPending(), out = [];
      for (const key of Object.keys(S.owner)) { const t = +key; if (!pend.has(t) && adj[t].some(n => S.stars[n.to] || pend.has(n.to))) out.push(t); }
      return out.sort((a, b) => starPrice(a) - starPrice(b) || a - b);
    }
    function attention() { // stars worth a visit: flagships first, then the most cash waiting
      const out = [];
      for (const i of D.claimed) {
        const s = S.stars[i];
        const cap = stockCap(i);
        if (isFlag[i]) { if (D.accr[i] > 0 && s.s >= CFG.flagshipReadyH * 3600 * D.accr[i]) out.push({ star: i, why: 'flagship', cash: s.s }); }
        else if (cap > 0 && s.s >= cap * 0.9) out.push({ star: i, why: 'full', cash: s.s });
      }
      return out.sort((a, b) => (a.why === 'flagship' ? 0 : 1) - (b.why === 'flagship' ? 0 : 1) || b.cash - a.cash || a.star - b.star); // flagships first
    }

    // ---- the year's sky: watching the meteor showers on the real calendar. Checked hourly (and when a save is loaded), while you play or when you return.
    function skyUpdate() {
      const now = nowFn();
      S.skyKey = Math.floor(now / 3600e3);
      let changed = false;
      for (const x of YearSky.activeShowers(now)) {
        const sh = x.shower;
        if (!showerZone[sh.id].some(i => S.stars[i])) continue; // no colony under the radiant: nothing to see
        let rec = S.showers[sh.id];
        if (!rec) { rec = S.showers[sh.id] = { t: now, peak: 0 }; log('You watched the ' + sh.name + ' from the colonies under its radiant in ' + sh.con + '. A small permanent bonus.', 'sky'); changed = true; }
        if (!rec.peak && Math.abs(x.daysToPeak) <= 1) { rec.peak = now; log('You caught the peak of the ' + sh.name + ': its bonus is doubled.', 'sky'); changed = true; }
      }
      return changed;
    }
    const showersNow = () => D.showers;

    // ---- Olympiad Academy: every topic's mastery (from the spaced-repetition cards) lifts a permanent level that unlocks a bonus
    function academy() {
      const store = S.quiz.astro, now = nowFn();
      return Astro.TOPICS.map(t => {
        const st = Astro.stats(t.id, store, now), level = S.academy.lvl[t.id] || 0;
        return { id: t.id, name: t.name, blurb: t.blurb, perk: t.perk, cards: st.n, started: st.started, learned: st.learned, due: st.due, f: st.f, level, next: level < 3 ? Astro.LEVEL_AT[level] : null, perkNow: Astro.perkAt(t.id, level), perkMax: Astro.perkAt(t.id, 3) };
      });
    }
    function academySync() { // raise levels that the cards now justify; returns what was gained
      const gained = [];
      for (const t of Astro.TOPICS) {
        const st = Astro.stats(t.id, S.quiz.astro, nowFn()), have = S.academy.lvl[t.id] || 0;
        if (st.level > have) {
          S.academy.lvl[t.id] = st.level;
          const text = PERK_LABEL[t.perk.kind](Astro.perkAt(t.id, st.level));
          gained.push({ id: t.id, name: t.name, level: st.level, title: Astro.LEVEL_NAMES[st.level], perk: text });
          log('Olympiad Academy: ' + t.name + ' reaches level ' + st.level + ' (' + Astro.LEVEL_NAMES[st.level] + '): ' + text + '.', 'rank');
        }
      }
      if (gained.length) recalc();
      return gained;
    }
    const academyLevels = () => Astro.TOPICS.reduce((n, t) => n + (S.academy.lvl[t.id] || 0), 0);

    // ---- ordered lists shared by the panels and the keyboard shortcuts, so a key always does what the row it names does
    function expansionTargets(near) { // unclaimed stars a colony ship could be sent to (next to a colony or to a ship's destination), best-paying first
      const pend = targetsPending(), cand = new Set();
      for (const i of D.claimed) for (const n of adj[i]) if (!S.stars[n.to] && S.owner[n.to] === undefined && !pend.has(n.to)) cand.add(n.to);
      for (const p of pend) for (const n of adj[p]) if (!S.stars[n.to] && S.owner[n.to] === undefined && !pend.has(n.to)) cand.add(n.to);
      let list = [...cand];
      if (near !== undefined && S.stars[near]) { // prefer the selected colony's own neighbours when it has any
        const mine = list.filter(t => adj[near].some(n => n.to === t));
        if (mine.length) list = mine;
      }
      const worth = t => baseRate[t] * Math.max(0.2, 1 + profile[t].rev) / priceMul(t); // revenue for the money: the cheap stars first
      return list.sort((a, b) => worth(b) - worth(a) || a - b);
    }
    function messierTargets() { // Messier objects in reach that are not yet surveyed, brightest first
      const out = [];
      for (let m = 0; m < NM; m++) if (!S.messier[m] && messierAccess(m).length) out.push(m);
      return out.sort((a, b) => SKY.messier[a].mag - SKY.messier[b].mag || a - b);
    }
    function buildOptions(i) { // a colony's numbered building rows: upgrades of what stands, then what could be built in a slot
      const out = [];
      if (!S.stars[i]) return out;
      for (const b of buildingsAt(i)) if (BUILDINGS[b.id] && b.lvl < BUILDING_MAX) out.push({ id: b.id, kind: 'upgrade' });
      if (slotsAt(i) > 0) for (const id of Object.keys(BUILDINGS)) if (!buildingAt(i, id) && S.tech.done[BUILDINGS[id].tech]) out.push({ id, kind: 'build' });
      return out;
    }
    function messierStats() {
      const out = { visited: Object.keys(S.messier).length, total: NM };
      return out;
    }

    return {
      SKY, CFG, Corp, BUILDINGS, BUILDING_MAX, TECHS, TECH_BY_ID, MARKETS, RANKS, TRACKS, TRACK_INFO, MAX_LEVEL, CLASS_NAMES, DEV_LEVELS, MASTER_LEVELS, PERK_LABEL, MESSIER_PERK, ROUTE_MAX,
      adj, edgeIdx, edgeLen, cls, baseRate, consNeighbours, messierByConst, messierFrom, nameIdx, profileOf, isFlagship, sectorOf, tributaries, FLAGS,
      get state() { return S; }, get d() { return D; },
      newGame, load, recalc, tick, catchUp,
      claimCost, upgradeCost, messierCost, developMessierCost, travelSeconds,
      canLaunchTo, launch, cancelOrder, dispatch, frontierOrigins, targetsPending, canVisitMessier, visitMessier, messierAccess, developMessier,
      upgrade, collect, collectConstellation, canCollectConstellation, grant, stockCap, resCap,
      buildingsAt, buildingAt, slotsAt, buildingCost, canBuild, build, canDemolish, demolish, buildingSummary, allBuildings, hubCoverage,
      techStatus, techCost, canStartTech, startTech, techCount, rankInfo, valuation, priceTarget, setCorpName,
      routeLevel, routeUpgradeCost, canUpgradeRoute, upgradeRoute,
      spawnEvent, redraw, useHint, eventReward, dismissPetition, addPetition,
      consStatus, frontier, attention, expansionTargets, messierTargets, buildOptions, messierStats, lvl, fmt, sepDeg,
      academy, academySync, academyLevels, Astro, YearSky, showerZone, showersNow, skyUpdate, now: () => nowFn(),
      rivals, rivalOf, starPrice, starRank, takeoverTargets, isLeadStar: i => !!isLead[i], RIVAL_COLORS,
      raidsNow, defenceOf, defenceParts, exposed, raidOdds, threatOf, guarded, canReinforce, reinforce, reinforceCost, occupiedInfo: i => S.occupied[i] || null, guardLeft: i => Math.max(0, (S.guard[i] || 0) - S.active),
      serialize() { S.saved = nowFn(); return JSON.stringify(S); },
    };
  }

  return { create, SAVE_VERSION, CFG, TRACK_INFO, TRACKS, MAX_LEVEL, CLASS_NAMES, ROUTE_MAX, sepDeg, key };
});
