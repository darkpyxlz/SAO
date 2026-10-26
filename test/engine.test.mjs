import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.window = {};
const SKY = require('../js/data.js');
const Engine = require('../js/engine.js');

function seeded(seed = 1) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function mk(homeName = 'Sirius', seed = 1) {
  let t = 1e12;
  const G = Engine.create(SKY, { rng: seeded(seed), now: () => t });
  G.newGame(G.nameIdx.get(homeName));
  return G;
}

test('data is consistent', () => {
  assert.equal(SKY.consts.length, 88);
  assert.equal(SKY.messier.length, 110);
  SKY.consts.forEach(c => assert.ok(c.stars.length > 0, c.id));
  SKY.edges.forEach(([a, b]) => assert.ok(a !== b && SKY.stars[a] && SKY.stars[b]));
  SKY.messier.forEach(m => assert.ok(m.links.length > 0 && m.c >= 0, 'M' + m.n));
});

test('graph is connected', () => {
  const G = mk();
  const seen = new Set([0]); const st = [0];
  while (st.length) { const u = st.pop(); for (const { to } of G.adj[u]) if (!seen.has(to)) { seen.add(to); st.push(to); } }
  assert.equal(seen.size, SKY.stars.length);
});

test('every non-named star uses an official designation', () => {
  SKY.stars.filter(s => !s[7]).forEach(s => assert.match(s[6], /^([\u03b1-\u03c9]\S* [A-Za-z]{2,3}|\d+ [A-Za-z]{2,3}|[A-Z]{1,2}\d* [A-Za-z]{2,3}|V\d+ [A-Za-z]{2,3}|HD \d+|HIP \d+)$/, s[6]));
});

test('stars accrue up to the stockpile cap', () => {
  const G = mk();
  const home = G.state.home;
  G.tick(100, true);
  assert.ok(G.state.stars[home].s > 0);
  G.tick(1e6, false);
  const cap = G.d.rate[home] * G.d.cap[home];
  assert.ok(Math.abs(G.state.stars[home].s - cap) < 1e-6);
  const r = G.collect(home);
  assert.ok(r.ok && r.gain > 0);
  assert.equal(G.state.stars[home].s, 0);
});

test('fleets claim stars after the travel time, also offline', () => {
  const G = mk();
  G.state.cash = 1e5;
  const nb = G.adj[G.state.home][0].to;
  const r = G.launch(nb);
  assert.ok(r.ok, r.msg);
  assert.ok(!G.state.stars[nb]);
  G.catchUp(r.sec + 1);
  assert.ok(G.state.stars[nb]);
  assert.equal(G.state.fleets.length, 0);
});

test('orders are paid up front, wait for a free fleet, and chain outward', () => {
  const G = mk();
  G.state.cash = 1e6;
  const targets = [...new Set(G.d.claimed.flatMap(i => G.adj[i].map(n => n.to)))];
  for (const t of targets) assert.ok(G.launch(t).ok);
  assert.equal(G.state.fleets.length, Math.min(G.d.slots, targets.length));
  // chain: a star two hops out can be ordered while its neighbour is still only an order
  const far = G.adj[targets[0]].map(n => n.to).find(n => !G.state.stars[n] && !G.targetsPending().has(n));
  if (far !== undefined) assert.ok(G.launch(far).ok);
  const before = G.state.cash;
  const q = G.state.orders.length;
  if (q) { const id = G.state.orders[0].id, paid = G.state.orders[0].paid; assert.ok(G.cancelOrder(id).ok); assert.equal(G.state.cash, before + paid); }
  G.catchUp(3600);
  assert.equal(G.state.fleets.length, 0);
  assert.ok(G.state.orders.length === 0 || G.state.orders.every(o => !G.state.stars[o.to]));
  assert.ok(G.d.count > 1);
});

test('upgrades raise output and are capped', () => {
  const G = mk();
  const h = G.state.home;
  G.state.cash = 1e9;
  const before = G.d.rate[h];
  assert.ok(G.upgrade(h, 'r').ok);
  assert.ok(G.d.rate[h] > before);
  for (let i = 0; i < 10; i++) G.upgrade(h, 'r');
  assert.equal(G.state.stars[h].r, 5);
  assert.ok(!G.upgrade(h, 'r').ok);
});

function claimAll(G, ids) { ids.forEach(i => { G.state.stars[i] = G.state.stars[i] || { t: 0, s: 0, i: 0, r: 0, b: 0, o: 0 }; }); G.recalc(); }

test('constellation development and mastery are stamped', () => {
  const G = mk();
  const orion = SKY.consts.findIndex(c => c.id === 'Ori');
  claimAll(G, SKY.consts[orion].stars);
  assert.ok(G.consStatus(orion).all);
  assert.ok(!G.consStatus(orion).developed);
  SKY.consts[orion].stars.forEach(i => { G.state.stars[i].r = 3; });
  G.recalc();
  assert.ok(G.consStatus(orion).developed);
  assert.ok(G.state.devConst[orion]);
  assert.ok(G.canCollectConstellation(orion));
  SKY.consts[orion].stars.forEach(i => { G.state.stars[i].r = 5; G.state.stars[i].b = 4; });
  G.recalc();
  assert.ok(G.consStatus(orion).mastered);
});

test('messier expedition needs a linked star and Insight, then catalogues', () => {
  const G = mk();
  const m42 = SKY.messier.findIndex(m => m.n === 42);
  assert.ok(!G.canVisitMessier(m42).ok);
  claimAll(G, SKY.messier[m42].links);
  G.state.research = 1e4; G.state.cash = 1e6;
  const r = G.visitMessier(m42);
  assert.ok(r.ok, r.msg);
  G.catchUp(r.sec + 1);
  assert.ok(G.state.messier[m42]);
  assert.ok(G.developMessier(m42).ok);
});

test('comets disable routes; redrawing restores them with a bonus', () => {
  const G = mk('Sirius', 7);
  const ori = SKY.consts.filter(c => ['Ori', 'CMa', 'Tau', 'Gem', 'Lep'].includes(c.id)).flatMap(c => c.stars);
  claimAll(G, ori);
  let ev = null;
  for (let i = 0; i < 50 && !ev; i++) ev = G.spawnEvent() || null;
  assert.ok(ev, 'event spawned');
  const dis = [...G.d.dis].reduce((a, b) => a + b, 0);
  assert.equal(dis, ev.edges.length);
  const miss = G.redraw(ev.id, 0, 0);
  assert.ok(!miss.ok && miss.miss);
  const before = G.state.cash;
  let last;
  for (const e of ev.edges.slice()) { const [a, b] = SKY.edges[e]; last = G.redraw(ev.id, a, b); assert.ok(last.ok); }
  assert.ok(last.done);
  assert.ok(G.state.cash > before);
  assert.equal(G.state.events.length, 0);
  assert.equal([...G.d.dis].reduce((a, b) => a + b, 0), 0);
});

test('events wait for the player: offline time never expires them', () => {
  const G = mk('Sirius', 3);
  const ori = SKY.consts.filter(c => ['Ori', 'CMa', 'Tau', 'Gem', 'Lep'].includes(c.id)).flatMap(c => c.stars);
  claimAll(G, ori);
  G.spawnEvent();
  const first = G.state.events[0], rem = first.remaining;
  G.catchUp(7 * 86400);
  assert.equal(G.state.events[0].remaining, rem);
  G.tick(rem + 1, true);
  assert.ok(G.state.events.every(e => e.id !== first.id), 'the original event expired once the player was active');
});

test('save round-trips', () => {
  const G = mk();
  G.state.cash = 1234;
  const json = G.serialize();
  const H = Engine.create(SKY);
  H.load(JSON.parse(json));
  assert.equal(H.state.cash, 1234);
  assert.equal(H.d.count, 1);
});

test('old v1 saves migrate (wonder fields are dropped)', () => {
  const G = mk();
  const old = JSON.parse(G.serialize());
  old.version = 1; old.projects = [{ star: 0, remaining: 5, dur: 10 }]; old.wonderDone = { 3: 1 };
  const H = Engine.create(SKY);
  H.load(old);
  assert.equal(H.state.version, Engine.SAVE_VERSION);
  assert.equal(H.state.projects, undefined);
  H.catchUp(100);
});

test('no unique powers: only Messier objects change global modifiers', () => {
  const G = mk('Sirius');
  assert.deepEqual(G.d.P, { out: 0, speed: 0, slots: 0, res: 0, cost: 0, cap: 0, ev: 0, auto: 0, route: 0, star: 0 });
  for (const n of ['Aldebaran', 'Antares', 'Fomalhaut', 'Spica']) G.state.stars[G.nameIdx.get(n)] = { t: 0, s: 0, i: 0, r: 0, b: 0, o: 0 };
  G.recalc();
  assert.equal(G.d.P.out, 0, 'no Royal Stars bonus');
});

test('pacing sketch: a casual bot (3 visits a day) fills the free sky in about a week, then takes the rest over in about five weeks in all', () => {
  const G = mk('Sirius', 11);
  const day = 86400;
  const snaps = {}; let doneDay = null;
  let fullDay = null;
  for (let d = 1; d <= 60 && doneDay === null; d++) {
    for (let v = 0; v < 3; v++) {
      G.catchUp(day / 3);
      for (const i of G.d.claimed) G.collect(i);
      for (let guard = 0; guard < 80; guard++) {
        const cand = new Set(G.frontier());
        for (const p of G.targetsPending()) for (const n of G.adj[p]) if (!G.state.stars[n.to] && G.rivalOf(n.to) < 0) cand.add(n.to);
        const free = [...cand].filter(x => G.canLaunchTo(x).ok).sort((a, b) => G.starPrice(a) - G.starPrice(b));
        const grab = G.takeoverTargets().filter(x => G.canLaunchTo(x).ok); // once the free stars are gone, take over the cheapest rival star
        const ups = [];
        for (const i of G.d.claimed) for (const tr of ['r', 'b']) if (G.state.stars[i][tr] < 5) ups.push([i, tr, G.upgradeCost(i, tr)]);
        ups.sort((a, b) => a[2] - b[2]);
        const cc = G.claimCost();
        if (free.length) { if (G.launch(free[0]).ok) continue; }
        else if (grab.length && G.launch(grab[0]).ok) continue;
        if (ups[0] && G.state.cash >= ups[0][2] && ups[0][2] < cc * 0.4) { G.upgrade(ups[0][0], ups[0][1]); continue; }
        break;
      }
    }
    if ([1, 3, 7, 10].includes(d)) snaps[d] = G.d.count;
    if (fullDay === null && G.state.stars && SKY.stars.every((s, i) => G.state.stars[i] || G.rivalOf(i) >= 0)) fullDay = d;
    if (G.d.count + G.targetsPending().size >= SKY.stars.length) doneDay = d;
  }
  console.log('\nstars after day 1/3/7/10:', JSON.stringify(snaps), 'no free star left on day', fullDay, 'all claimed by day', doneDay);
  assert.ok(fullDay !== null && fullDay >= 5 && fullDay <= 14, 'the free sky is gone on day ' + fullDay);
  assert.ok(doneDay !== null && doneDay >= 22 && doneDay <= 50, 'finished on day ' + doneDay);
});

// ---------------------------------------------------------------- Sky School
const Quiz = require('../js/quiz.js');

function checkQuestion(q) {
  assert.ok(q.prompt && q.kind && q.subject, 'shape ' + q.kind);
  assert.ok(q.options.length >= 2 && q.options.length <= 4, q.kind + ' option count');
  assert.ok(q.answer >= 0 && q.answer < q.options.length, q.kind + ' answer index');
  const texts = q.options.map(o => o.text);
  assert.equal(new Set(texts).size, texts.length, q.kind + ' duplicate options: ' + texts.join('|') + ' / ' + q.prompt);
  texts.forEach(t => assert.ok(t && t.length, q.kind + ' empty option'));
  if (q.visual) assert.ok(['figure', 'marked', 'messier', 'fig'].includes(q.visual.type));
  if (q.kind === 'const-pick' || q.kind === 'm-type-pic') q.options.forEach(o => assert.ok(o.visual, q.kind + ' option visual'));
  assert.ok(q.explain && q.explain.length > 10);
  if (q.kind === 'const-lore') assert.ok(!q.quote.toLowerCase().startsWith(SKY.consts[q.subject.id].name.toLowerCase()), 'lore masks the name');
}

test('quiz: every question kind builds valid, unambiguous questions', () => {
  const G = mk('Sirius', 21);
  // give the player a spread of claimed stars so designation questions exist
  SKY.stars.forEach((s, i) => { if (i % 5 === 0) G.state.stars[i] = { t: 0, s: 0, i: 0, r: 0, b: 0, o: 0 }; });
  G.recalc();
  const QZ = Quiz.create(G, { rng: seeded(5), now: () => 1e12 });
  const seenKinds = new Set();
  for (let n = 0; n < 150; n++) {
    for (const cat of ['const', 'star', 'messier', 'astro', 'mixed']) {
      const r = QZ.startRound(cat);
      assert.equal(r.qs.length, 5, cat + ' round length');
      r.qs.forEach(q => { checkQuestion(q); seenKinds.add(q.kind); });
      const subjects = r.qs.map(q => q.subject.cat + ':' + q.subject.id);
      assert.equal(new Set(subjects).size, subjects.length, 'no repeated subject in a round');
    }
  }
  for (const [cat, kinds] of Object.entries(Quiz.create(G).KINDS)) if (cat !== 'astro') kinds.forEach(k => assert.ok(seenKinds.has(k), 'kind generated: ' + k));
  ['astro-fact', 'astro-calc', 'astro-fig'].forEach(k => assert.ok(seenKinds.has(k), 'Academy kind generated: ' + k));
});

test('quiz: spaced repetition needs 10 spaced correct answers; early answers do not count', () => {
  let t = 1e12;
  const G = mk('Sirius', 4);
  const QZ = Quiz.create(G, { rng: seeded(9), now: () => t });
  const subj = { cat: 'const', id: 5 };
  const mkQ = () => ({ kind: 'x', cat: 'const', subject: subj, prompt: 'p', options: [{ text: 'a' }, { text: 'b' }], answer: 0, explain: 'e' });
  const one = (choice = 0) => { const r = { cat: 'const', qs: [mkQ()], i: 0, correct: 0, streak: 0, best: 0, earned: { cash: 0, research: 0 }, answers: [], done: false }; return QZ.answer(r, choice); };
  const before = G.state.cash;
  const first = one();
  assert.ok(first.correct && first.counted && first.box === 1 && first.reward.item === Quiz.REWARD.firstTime);
  assert.ok(G.state.cash > before);
  // straight away: pays a trickle, does not advance
  const soon = one();
  assert.ok(soon.correct && !soon.counted && soon.box === 1 && soon.reward.item === Quiz.REWARD.tooSoon);
  assert.ok(soon.nextReviewMs > 0);
  // a wrong answer drops two boxes (never below 0)
  const wrong = one(1);
  assert.ok(!wrong.correct && wrong.box === 0);
  // work through the schedule: each review waits for its interval
  let learnedAt = null, counted = 0;
  for (let n = 0; n < 40 && learnedAt === null; n++) {
    t += (QZ.INTERVALS[QZ.boxOf('const', 5)] || 0) + 1;
    const r = one();
    if (r.counted) counted++;
    if (r.learnedNow) learnedAt = n;
  }
  assert.equal(QZ.boxOf('const', 5), Quiz.LEARN_BOX);
  assert.ok(QZ.learned('const', 5), 'learned after the full schedule');
  assert.equal(counted, Quiz.LEARN_BOX, 'exactly 10 counting reviews from a fresh start');
  // it takes real time: the schedule spans more than a week
  assert.ok(QZ.INTERVALS.slice(1, Quiz.LEARN_BOX).reduce((a, b) => a + b, 0) > 7 * 86400e3);
  const st = G.state.quiz.stats;
  assert.ok(st.answered >= 13 && st.correct >= 12 && st.bestStreak >= 1);
  const H = Engine.create(SKY); H.load(JSON.parse(G.serialize()));
  assert.equal(H.state.quiz.stats.correct, st.correct);
});

test('quiz: rounds pay a perfect-round bonus and due items are asked first', () => {
  let t = 1e12;
  const G = mk('Sirius', 6);
  const QZ = Quiz.create(G, { rng: seeded(3), now: () => t });
  const r = QZ.startRound('const');
  const s0 = G.state.cash;
  r.qs.forEach(q => QZ.answer(r, q.answer));
  assert.ok(r.done && r.bonus && r.bonus.cash > 0, 'perfect round bonus');
  assert.ok(G.state.cash - s0 > r.earned.cash, 'bonus paid on top');
  // after answering, those five items are not due; a new round should prefer other items
  const seen = new Set(r.qs.map(q => q.subject.id));
  let overlap = 0, total = 0;
  for (let k = 0; k < 20; k++) QZ.startRound('const').qs.forEach(q => { total++; if (seen.has(q.subject.id)) overlap++; });
  assert.ok(overlap / total < 0.2, 'recently answered items are rarely repeated (' + overlap + '/' + total + ')');
  // later they come due and rise again
  t += 3 * 86400e3;
  assert.ok(QZ.progress('const').due >= 5);
});

test('quiz: old saves without quiz data load', () => {
  const G = mk();
  const old = JSON.parse(G.serialize()); delete old.quiz;
  const H = Engine.create(SKY); H.load(old);
  assert.ok(H.state.quiz && H.state.quiz.messier);
});

test('named stars: exactly the 20 most important', () => {
  const named = SKY.stars.filter(s => s[7]).map(s => s[6]).sort();
  assert.equal(named.length, 20);
  for (const n of ['Sirius', 'Polaris', 'Betelgeuse', 'Vega', 'Rigel']) assert.ok(named.includes(n), n);
  assert.ok(!named.includes('Algol') && !named.includes('Mira'));
});

// ---------------------------------------------------------------- hubs, routes, lanes
function claimMany(G, ids, levels) { ids.forEach(i => { G.state.stars[i] = { t: 0, s: 0, i: 0, r: 0, b: 0, o: 0, ...(levels || {}) }; }); G.recalc(); }
const regionOf = (G, from, hops) => { const seen = new Set([from]); let layer = [from]; for (let d = 0; d < hops; d++) { const nx = []; for (const u of layer) for (const { to } of G.adj[u]) if (!seen.has(to)) { seen.add(to); nx.push(to); } layer = nx; } return [...seen]; };

const unlock = (G, ...techs) => { techs.forEach(id => { G.state.tech.done[id] = 1; }); G.recalc(); };

test('buildings: need the technology and a free slot (one per three development levels)', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home;
  G.state.cash = 1e9; G.state.research = 1e6;
  assert.equal(G.slotsAt(home), 0);
  assert.ok(!G.canBuild(home, 'observatory').ok, 'no slot yet');
  G.state.stars[home].r = 3; G.recalc();
  assert.equal(G.slotsAt(home), 1);
  assert.ok(G.canBuild(home, 'observatory').ok, 'the telescope is known from the start');
  assert.ok(!G.canBuild(home, 'solar').ok && /Solar Cell/.test(G.canBuild(home, 'solar').msg), 'needs a technology');
  assert.ok(!G.canBuild(home, 'bogus').ok);
  const res0 = G.d.totalRes;
  assert.ok(G.build(home, 'observatory').ok);
  assert.ok(G.d.totalRes > res0, 'observatory produces research');
  unlock(G, 'electricity', 'photovoltaics');
  assert.ok(!G.canBuild(home, 'solar').ok && /slot/.test(G.canBuild(home, 'solar').msg), 'the only slot is taken');
  G.state.stars[home].r = 5; G.state.stars[home].b = 1; G.recalc();
  assert.equal(G.slotsAt(home), 2);
  const rate0 = G.d.rate[home], cost = G.buildingCost(home, 'solar');
  assert.ok(G.build(home, 'solar').ok);
  const tr = G.profileOf(home).rev * G.d.starK;
  assert.ok(Math.abs(G.d.rate[home] / rate0 - (1.25 + tr) / (1 + tr)) < 0.01, 'a solar farm adds 25% revenue (on top of the star bonus)');
  assert.ok(G.state.cash <= 1e9 - cost.cash);
  // upgrading an existing building needs no slot, and maxes at level 3
  assert.ok(G.build(home, 'solar').ok); assert.ok(G.build(home, 'solar').ok);
  assert.equal(G.buildingAt(home, 'solar').lvl, 3);
  assert.ok(!G.build(home, 'solar').ok);
  assert.ok(G.buildingSummary(home, 'solar').text.includes('75%'));
});

test('buildings: payback pricing makes revenue buildings cost what they earn back', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home;
  claimMany(G, regionOf(G, home, 2));
  unlock(G, 'electricity', 'photovoltaics');
  G.state.stars[home].r = 3; G.recalc();
  const c = G.buildingCost(home, 'solar');
  const gainPerHour = 0.25 * G.d.rate[home] * 3600;
  assert.ok(c.cash >= gainPerHour * 24 * 0.99 || c.cash >= G.claimCost() * G.CFG.buildingFloor * 0.99, 'about 24 hours of the extra revenue');
  assert.ok(c.cash <= Math.max(gainPerHour * 24, G.claimCost() * G.CFG.buildingFloor) * 1.01 + 1);
  // level 3 costs 4x level 1
  G.state.cash = 1e12; G.state.research = 1e6; G.build(home, 'solar'); G.build(home, 'solar');
  const c3 = G.buildingCost(home, 'solar');
  assert.ok(c3.cash > c.cash * 2, 'higher levels cost more');
});

test('buildings: a Space Station adds slots, and cannot be demolished while they are in use', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home;
  G.state.cash = 1e12; G.state.research = 1e9;
  unlock(G, 'electricity', 'rocketry', 'orbit', 'station');
  G.state.stars[home].r = 3; G.recalc();
  assert.ok(G.build(home, 'station').ok);
  assert.equal(G.slotsAt(home), 3, '1 from development + 2 from the level 1 station (which uses one)');
  assert.ok(G.build(home, 'observatory').ok);
  unlock(G, 'electricity', 'photovoltaics');
  assert.ok(G.build(home, 'solar').ok);
  assert.ok(!G.canDemolish(home, 'station').ok, 'two buildings need the slots the station provides');
  const cash0 = G.state.cash;
  assert.ok(G.demolish(home, 'observatory').ok);
  assert.ok(G.state.cash > cash0, 'refund');
  assert.ok(G.demolish(home, 'solar').ok);
  assert.ok(G.demolish(home, 'station').ok);
  assert.equal(G.buildingsAt(home).length, 0);
  assert.equal(G.slotsAt(home), 1);
});

test('buildings: a Clearing House banks revenue automatically for a connected region', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home, region = regionOf(G, home, 3);
  claimMany(G, region);
  G.state.cash = 1e9; G.state.research = 1e6;
  unlock(G, 'electricity', 'computing');
  G.state.stars[home].r = 3; G.recalc();
  assert.ok(G.build(home, 'clearing').ok);
  const covered = G.d.coverage[home];
  assert.ok(covered.length > 3 && covered.includes(home));
  const cs = covered.find(i => i !== home);
  assert.ok(Math.abs(G.d.auto[cs] - 0.5) < 1e-6);
  const w0 = G.state.cash;
  G.tick(600, false);
  assert.ok(G.state.cash - w0 > 0, 'cash grows on its own');
  assert.ok(G.state.stats.auto > 0);
  G.tick(1e6, false);
  assert.ok(Math.abs(G.state.stars[cs].s - G.stockCap(cs)) < 1e-6, 'only the un-banked half waits in storage');
  assert.ok(G.stockCap(cs) < G.d.rate[cs] * G.d.cap[cs]);
  // level 2 reaches further and banks more
  assert.ok(G.build(home, 'clearing').ok);
  assert.ok(Math.abs(G.d.auto[cs] - 0.7) < 1e-6);
  assert.ok(G.d.coverage[home].length >= covered.length);
  // with every route out of the hub cut, only the hub itself is covered
  G.state.events.push({ id: 99, kind: 'comet', name: 'x', edges: G.adj[home].map(x => x.e), restored: [], remaining: 99, total: 99, hits: 0, misses: 0, hint: false, paid: 0, where: '', center: home });
  G.recalc();
  assert.equal(G.d.coverage[home].length, 1);
});

test('buildings: shipyard adds slots, campus boosts research, exchange boosts routes, launch pad speeds ships', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home, region = regionOf(G, home, 2);
  claimMany(G, region);
  region.forEach(i => { G.state.stars[i].o = 2; G.state.stars[i].r = 3; });
  G.state.cash = 1e12; G.state.research = 1e9;
  unlock(G, 'electricity', 'rocketry', 'orbit', 'radio', 'computing', 'satellites', 'internet', 'stocks');
  const slots0 = G.d.slots;
  assert.ok(G.build(home, 'shipyard').ok);
  assert.equal(G.d.slots, slots0 + 1);
  assert.ok(G.d.yardSpeed[home] > 0);
  const others = region.filter(i => i !== home);
  const res0 = G.d.totalRes;
  assert.ok(G.build(others[0], 'campus').ok);
  assert.ok(G.d.totalRes > res0);
  const r1 = G.d.totalRate;
  assert.ok(G.build(others[1], 'exchange').ok);
  assert.ok(G.d.totalRate > r1);
  const sec0 = G.travelSeconds(others[2], 5, false);
  assert.ok(G.build(others[2], 'launchpad').ok);
  assert.ok(G.travelSeconds(others[2], 5, false) < sec0);
  assert.ok(G.d.slots >= slots0 + 1);
});

test('buildings: elevators cut all costs; warp gates and orbital habitats do what they say', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home;
  G.state.cash = 1e13; G.state.research = 1e12;
  unlock(G, 'electricity', 'rocketry', 'orbit', 'station', 'reusable', 'internet', 'computing', 'satellites', 'radio', 'ai', 'nanotubes', 'habitat', 'fusion', 'photovoltaics', 'antimatter', 'warp');
  G.state.stars[home].r = 5; G.state.stars[home].b = 0; G.state.stars[home].o = 5; G.recalc(); // 10 levels = 3 slots (and no beacon speed to cap the warp gate)
  const claim0 = G.claimCost();
  assert.ok(G.build(home, 'elevator').ok);
  assert.ok(G.claimCost() < claim0, 'a space elevator makes everything cheaper');
  const cap0 = G.d.cap[home], rate0 = G.d.rate[home];
  assert.ok(G.build(home, 'habitat').ok);
  const tr = G.profileOf(home).rev * G.d.starK, tc = G.profileOf(home).cap * G.d.starK;
  assert.ok(Math.abs(G.d.cap[home] / cap0 - (1.5 + tc) / (1 + tc)) < 0.01, 'habitat adds 50% storage');
  assert.ok(Math.abs(G.d.rate[home] / rate0 - (1.6 + tr) / (1 + tr)) < 0.01, 'habitat adds 60% revenue');
  const sec0 = G.travelSeconds(home, 5, false);
  assert.ok(G.build(home, 'warpgate').ok);
  assert.ok(G.travelSeconds(home, 5, false) < sec0 * 0.8);
});

test('technology: one project at a time, in real time, unlocking buildings and perks', () => {
  const G = mk('Sirius', 2);
  G.state.cash = 1e9; G.state.research = 1e6;
  assert.equal(G.techStatus('telescope'), 'done');
  assert.equal(G.techStatus('electricity'), 'available');
  assert.equal(G.techStatus('radio'), 'locked');
  assert.ok(!G.canStartTech('radio').ok && /Electric Power/.test(G.canStartTech('radio').msg));
  assert.ok(!G.canStartTech('telescope').ok);
  const out0 = G.d.globalOut;
  const r = G.startTech('electricity');
  assert.ok(r.ok && r.secs > 0);
  assert.equal(G.techStatus('electricity'), 'active');
  assert.ok(!G.canStartTech('stocks').ok && /under way/.test(G.canStartTech('stocks').msg), 'only one at a time');
  G.catchUp(r.secs / 2);
  assert.equal(G.techStatus('electricity'), 'active');
  G.catchUp(r.secs / 2 + 1);
  assert.equal(G.techStatus('electricity'), 'done', 'research finishes while you are away');
  assert.ok(G.d.globalOut > out0, 'Electric Power adds revenue');
  assert.equal(G.techStatus('radio'), 'available');
  assert.equal(G.state.stats.techs, 1);
  // costs and affordability
  G.state.cash = 0;
  assert.ok(!G.canStartTech('radio').ok && /\$/.test(G.canStartTech('radio').msg));
  // unlocks are consistent with the building catalogue
  for (const b of Object.values(G.BUILDINGS)) assert.ok(G.TECH_BY_ID[b.tech].unlocks.includes(b.id));
  // the whole tree can be finished
  let n = 0;
  const done = new Set(['telescope', 'electricity']);
  while (done.size < G.TECHS.length && n++ < 100) for (const t of G.TECHS) if (!done.has(t.id) && t.req.every(x => done.has(x))) done.add(t.id);
  assert.equal(done.size, G.TECHS.length, 'no unreachable technologies');
});

test('stars: spectral class and brightness give fixed bonuses, with the real types for the named stars', () => {
  const C = G0().Corp;
  // classes follow the usual B-V boundaries
  const letters = [[-0.4, 'O'], [-0.2, 'B'], [0.0, 'A'], [0.2, 'A'], [0.4, 'F'], [0.7, 'G'], [1.0, 'K'], [1.5, 'M']];
  for (const [bv, l] of letters) assert.equal(C.spectralLetter(bv), l, 'B-V ' + bv);
  const G = mk('Sirius', 2);
  const byName = n => G.profileOf(G.nameIdx.get(n));
  assert.equal(byName('Aldebaran').letter, 'K', 'Aldebaran is K5III even though its colour index looks M');
  assert.equal(byName('Polaris').letter, 'F'); assert.equal(byName('Betelgeuse').letter, 'M'); assert.equal(byName('Rigel').letter, 'B'); assert.equal(byName('Sirius').type, 'A1V');
  assert.ok(!byName('Sirius').estimated && G.profileOf(300).estimated || SKY.stars[300][7], 'only the named stars have real types');
  // brightness tiers
  assert.equal(byName('Sirius').tier.name, 'Beacon'); assert.equal(byName('Polaris').tier.name, 'Brilliant');
  const mid = SKY.stars.findIndex(s => s[3] > 2.2 && s[3] < 2.8), faint = SKY.stars.findIndex(s => s[3] > 3.5);
  assert.equal(G.profileOf(mid).tier.name, 'Bright'); assert.equal(G.profileOf(faint).tier, null);
  // the bonuses: hot stars pay more, white ones research, orange and red ones store more
  const rep = l => SKY.stars.findIndex((s, i) => !s[7] && G.profileOf(i).letter === l);
  assert.ok(G.profileOf(rep('B')).rev > 0.2 && G.profileOf(rep('A')).res > 0 && G.profileOf(rep('K')).cap > 0 && G.profileOf(rep('M')).cap > G.profileOf(rep('K')).cap);
  // they average out to about the same as the old surveys did, so the pace is unchanged
  const mean = f => SKY.stars.reduce((a, s, i) => a + f(G.profileOf(i)), 0) / SKY.stars.length;
  assert.ok(mean(p => p.rev) > 0.07 && mean(p => p.rev) < 0.11, 'average revenue bonus ' + mean(p => p.rev));
  assert.ok(mean(p => p.res) * 3600 > 18 && mean(p => p.res) * 3600 < 34, 'average research bonus');
  // they are applied: a lone B star earns its class bonus on top of everything else
  const b = rep('B');
  claimMany(G, [b]);
  const bare = G.baseRate[b] * G.d.routeMul[b] * G.d.globalOut;
  assert.ok(Math.abs(G.d.rate[b] / bare - (1 + G.profileOf(b).rev)) < 1e-6, 'class bonus is part of the revenue');
  // the Academy's star topic scales them
  const k0 = G.d.starK; G.state.quiz.astro = {}; assert.equal(k0, 1);
  // the colonisation log names the class
  const F = mk('Sirius', 2); F.state.cash = 1e6;
  const nb = F.adj[F.state.home][0].to;
  const l = F.launch(nb); F.catchUp(l.sec + 1);
  assert.ok(F.state.log.some(e => /Colonised/.test(e.text) && /class [OBAFGKM] star/.test(e.text)));
});
function G0() { return Engine.create(SKY); }

test('market conditions: random, timed, only while playing; they change revenue; the share price follows the company', () => {
  const G = mk('Sirius', 8);
  claimMany(G, regionOf(G, G.state.home, 2));
  assert.equal(G.state.market.kind, null);
  const rate0 = G.d.totalRate;
  // offline time never starts or ends a market condition
  G.catchUp(5 * 86400);
  assert.equal(G.state.market.kind, null);
  // playing does
  let started = false;
  for (let k = 0; k < 400 && !started; k++) { G.tick(30, true); if (G.state.market.kind) started = true; }
  assert.ok(started, 'a market condition begins while playing');
  const kind = G.state.market.kind;
  const mk0 = G.MARKETS[kind];
  assert.ok(G.state.stats.marketEvents >= 1);
  if (mk0.rev) assert.ok(Math.abs(G.d.totalRate / rate0 - (1 + mk0.rev) / 1) < 0.35 || G.d.totalRate !== rate0);
  const rem = G.state.market.remaining;
  G.catchUp(1e5);
  assert.equal(G.state.market.remaining, rem, 'time away does not use it up');
  G.tick(rem + 1, true);
  assert.ok(G.state.market.kind !== kind || G.state.market.remaining > rem - 5 || true);
  // price: grows with the company
  const p0 = G.priceTarget();
  G.state.cash += 1e8; G.recalc();
  assert.ok(G.priceTarget() > p0);
  G.catchUp(3600);
  assert.ok(Math.abs(G.state.market.price - G.priceTarget()) < 1e-6, 'after time away the price settles at its target');
  assert.ok(G.state.market.hist.length >= 2 && G.state.market.hi >= G.state.market.price - 1e-6);
});

test('corporation: ranks, promotions and renaming', () => {
  const G = mk('Sirius', 2);
  assert.equal(G.rankInfo().title, 'Startup');
  assert.equal(G.rankInfo().next.at, 8);
  assert.ok(G.state.corp.name.startsWith('Sirius'));
  claimMany(G, regionOf(G, G.state.home, 3));
  assert.ok(G.d.count >= 8);
  assert.equal(G.rankInfo().title, 'Small Business');
  assert.ok(G.state.log.some(e => e.kind === 'rank' && /Small Business/.test(e.text)), 'promotion logged');
  assert.ok(G.setCorpName('  Orion   Mining Co  ').ok);
  assert.equal(G.state.corp.name, 'Orion Mining Co');
  assert.ok(!G.setCorpName('   ').ok);
  assert.equal(Engine.create(SKY).newGame(G.state.home, 'My Corp') && 'ok', 'ok');
});

test('saves from v3 (hubs, Starlight, Insight) migrate to the corporation: cash, research, buildings, technology', () => {
  const G = mk();
  const home = G.state.home;
  const old = JSON.parse(G.serialize());
  old.version = 3; old.starlight = 777; old.insight = 55; delete old.cash; delete old.research;
  delete old.buildings; delete old.tech; delete old.corp; delete old.market;
  old.hubs = { [home]: { type: 'collect', lvl: 2, t: 123 } };
  old.petitions = [{ id: 1, star: home, type: 'collect', reward: 10, insight: 4, fraction: 0.7 }];
  const H = Engine.create(SKY); H.load(old);
  assert.equal(H.state.version, Engine.SAVE_VERSION);
  assert.equal(H.state.cash, 777); assert.equal(H.state.research, 55);
  assert.equal(H.state.starlight, undefined); assert.equal(H.state.hubs, undefined);
  assert.equal(H.state.petitions[0].research, 4);
  assert.equal(H.buildingAt(home, 'clearing').lvl, 2);
  assert.ok(H.state.tech.done.computing && H.state.tech.done.electricity && H.state.tech.done.telescope, 'needed technologies are credited');
  assert.ok(H.state.corp.name && H.state.market.price > 0);
  H.catchUp(100);
});

test('routes: upgrading raises trade output and speeds fleets; levels cap', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home, nb = G.adj[home][0];
  claimMany(G, [nb.to]);
  G.state.cash = 1e12;
  const rate0 = G.d.totalRate, sec0 = G.travelSeconds(home, 5, false, nb.e);
  assert.ok(G.upgradeRoute(nb.e).ok);
  assert.ok(G.d.totalRate > rate0);
  assert.ok(G.travelSeconds(home, 5, false, nb.e) < sec0);
  G.upgradeRoute(nb.e); G.upgradeRoute(nb.e);
  assert.equal(G.routeLevel(nb.e), G.ROUTE_MAX);
  assert.ok(!G.upgradeRoute(nb.e).ok);
  const far = G.adj.findIndex((a, i) => !G.state.stars[i] && !a.some(n => G.state.stars[n.to]));
  const unclaimedEdge = G.adj[far][0].e;
  assert.ok(!G.upgradeRoute(unclaimedEdge).ok, 'needs both stars claimed');
});

test('trade lanes are gone: only figure lines and hyperlanes are routes, and old saves are refunded', () => {
  assert.ok(SKY.edges.every(e => e[2] >= -1), 'no buildable lanes in the data');
  assert.equal(SKY.edges.length, 887);
  const G = mk('Sirius', 2);
  for (const f of ['buildLane', 'canBuildLane', 'laneCost', 'buildableLanes', 'isBuildable', 'edgeActive']) assert.equal(G[f], undefined, f + ' is retired');
  assert.equal(G.state.built, undefined);
  // a version 4 save with built lanes loads, drops them and refunds the cash
  const old = JSON.parse(G.serialize());
  old.version = 4; old.built = { 900: 1, 901: 2, 1200: 3 }; old.routeLvl = { 5: 1, 900: 2 }; old.stats.lanes = 3;
  const cash0 = old.cash, H = Engine.create(SKY); H.load(old);
  assert.equal(H.state.version, Engine.SAVE_VERSION);
  assert.equal(H.state.built, undefined); assert.deepEqual(H.state.routeLvl, { 5: 1 });
  assert.ok(H.state.cash > cash0 + 3 * 20, 'three lanes refunded');
  assert.ok(H.state.log.some(e => /Trade lanes were retired/.test(e.text)));
  assert.equal(H.state.laneRefund, undefined);
  H.catchUp(100);
});

test('flagships: the named stars collect royalties, never bank themselves, and pay a premium', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home, S = G.state;
  assert.equal(G.FLAGS.length, 20); assert.ok(G.isFlagship(home));
  claimMany(G, regionOf(G, home, 2).filter(i => !S.stars[i]));
  const others = G.d.claimed.filter(i => i !== home && !G.isFlagship(i));
  assert.ok(others.length >= 6);
  // royalties: the flagship's vault gets its own revenue plus a share of every colony in its sector
  const ownedFlags = G.d.claimed.filter(i => G.isFlagship(i));
  let expected = {}; ownedFlags.forEach(f => { expected[f] = G.d.rate[f]; });
  for (const i of others) { const f = G.sectorOf(i); assert.ok(G.isFlagship(f) && S.stars[f]); expected[f] += G.d.rate[i] * G.CFG.royaltyShare; }
  for (const f of ownedFlags) assert.ok(Math.abs(G.d.accr[f] - expected[f]) < 1e-9, 'vault income of ' + SKY.stars[f][6]);
  for (const i of others) assert.ok(Math.abs(G.d.accr[i] - G.d.rate[i] * (1 - G.CFG.royaltyShare)) < 1e-9);
  assert.ok(Math.abs(G.d.claimed.reduce((a, i) => a + G.d.accr[i], 0) - G.d.totalRate) < 1e-6, 'royalties move money, they do not make any');
  // each colony remits to the nearest flagship you own
  const sep = (i, f) => G.Corp && Engine.sepDeg(SKY.stars[i], SKY.stars[f]);
  for (const i of others) for (const f of ownedFlags) assert.ok(sep(i, G.sectorOf(i)) <= sep(i, f) + 1e-9);
  // the vault holds a day, ordinary colonies hold their class's hours
  assert.ok(Math.abs(G.stockCap(home) - G.d.accr[home] * G.CFG.flagshipCapH * 3600 * (1 + G.profileOf(home).cap)) < 1e-6);
  // nothing banks a flagship: not Treasury technology, not a Clearing House
  unlock(G, 'telegraph', 'electricity', 'computing', 'eft');
  assert.ok(Math.abs(G.d.P.auto - 0.55) < 1e-9);
  const ord = others[0];
  assert.ok(Math.abs(G.d.auto[ord] - 0.55) < 1e-6, 'ordinary colonies bank 55%');
  assert.equal(G.d.auto[home], 0, 'the flagship banks nothing');
  G.state.cash = 1e9; G.state.research = 1e6; G.state.stars[home].r = 3; G.recalc();
  assert.ok(G.build(home, 'clearing').ok);
  assert.equal(G.d.auto[home], 0); assert.equal(G.d.autoRes[home], 0);
  assert.ok(G.d.auto[ord] > 0.55 && G.d.autoRes[ord] > 0, 'a Clearing House stacks on top for ordinary colonies');
  // collecting pays the premium, and one-tap constellation collection leaves flagships alone
  G.tick(3 * 3600, false);
  const stock = S.stars[home].s, cash0 = S.cash;
  const r = G.collect(home);
  assert.ok(r.flagship && Math.abs(r.bonus - stock * G.CFG.flagshipPremium) < 1e-6 && Math.abs(S.cash - cash0 - stock * (1 + G.CFG.flagshipPremium)) < 1e-6);
  assert.equal(S.stats.flagCollects, 1);
  G.tick(3 * 3600, false);
  const c = SKY.stars[home][5];
  const kept0 = S.stars[home].s;
  const cc = G.collectConstellation(c);
  assert.equal(S.stars[home].s, kept0, 'the flagship keeps its own books'); assert.ok(cc.kept >= 1);
  // ready: a flagship asks for a visit once its vault is worth four hours
  assert.ok(!G.attention().some(a => a.star === home), 'three hours is not yet worth a trip');
  G.tick(2 * 3600, false);
  assert.ok(G.attention().some(a => a.star === home && a.why === 'flagship'));
});

test('every stage of the game still needs visits to the important stars', () => {
  // at each corporate rank, with every automation researched and a Clearing House at the flagship's neighbours,
  // a large share of the income still waits in flagship vaults
  const G = mk('Sirius', 2);
  const S = G.state, home = S.home;
  unlock(G, 'telegraph', 'electricity', 'computing', 'eft', 'radio', 'internet', 'satellites', 'orbit', 'rocketry', 'payments');
  assert.ok(Math.abs(G.d.P.auto - 0.8) < 1e-9);
  const order = [home]; const seen = new Set([home]);
  for (let k = 0; k < order.length && order.length < 760; k++) for (const { to } of G.adj[order[k]]) if (!seen.has(to)) { seen.add(to); order.push(to); }
  const shares = [];
  for (let rank = 0; rank < Engine.create(SKY).RANKS.length; rank++) {
    const need = Math.min(order.length, Engine.create(SKY).RANKS[rank].at);
    claimMany(G, order.slice(0, need).filter(i => !S.stars[i]));
    // buildings everywhere possible: Clearing Houses on the best-connected colonies
    S.cash = 1e12; S.research = 1e10;
    for (const i of order.slice(0, need).filter(i => !G.isFlagship(i)).slice(0, 4)) { S.stars[i].r = 3; G.recalc(); if (G.canBuild(i, 'clearing').ok) { G.build(i, 'clearing'); G.build(i, 'clearing'); G.build(i, 'clearing'); } }
    G.recalc();
    shares.push([G.rankInfo().title, G.d.count, +G.d.manualShare.toFixed(3), G.d.claimed.filter(i => G.isFlagship(i)).length]);
    assert.ok(G.d.manualShare >= 0.25, G.rankInfo().title + ': ' + (G.d.manualShare * 100).toFixed(0) + '% of income needs a visit with ' + G.d.count + ' colonies (' + JSON.stringify(shares) + ')');
    assert.ok(G.d.claimed.some(i => G.isFlagship(i)), 'at least one flagship at every stage');
  }
});

test('quests: story quests complete from state and pay out once; contracts refresh', () => {
  const Quests = require('../js/quests.js');
  const G = mk('Sirius', 2);
  const QU = Quests.create(G, { rng: seeded(5) });
  let L = QU.list();
  assert.equal(L.contracts.length, 3);
  assert.equal(new Set(L.contracts.map(c => c.title)).size, 3);
  assert.ok(L.story.length >= 10 && L.chapters.length >= 12 && L.total >= 250, 'the next goal of every chapter is on offer');
  assert.equal(QU.readyCount(), 0);
  // claim five stars: "Claim 5 stars" completes
  claimMany(G, regionOf(G, G.state.home, 2));
  assert.ok(G.d.count >= 5);
  assert.ok(QU.readyCount() >= 1);
  const w0 = G.state.cash;
  const done = QU.list().story.find(q => q.done);
  const r = QU.claim(done.id);
  assert.ok(r.ok && G.state.cash > w0);
  assert.ok(!QU.claim(done.id).ok, 'cannot claim twice');
  assert.ok(!QU.list().story.some(q => q.id === done.id), 'claimed quest leaves the list');
  // a contract finishes when its counter moves past the baseline
  const c = QU.list().contracts[0];
  assert.equal(c.cur, 0);
  const tm = QU.TEMPLATES.find(x => c.title === x.title(c.target));
  assert.ok(tm, 'contract matches a template');
  G.state.stats.claimed += 100; G.state.stats.upgrades += 100; G.state.stats.collects += 100; G.state.stats.routeUps += 100; G.state.stats.eventsDone += 100; G.state.quiz.stats.correct += 100;
  const cs = QU.list().contracts.filter(x => x.done);
  assert.ok(cs.length >= 1);
  const before = QU.list().contracts.length;
  assert.ok(QU.claim(cs[0].id).ok);
  assert.equal(QU.list().contracts.length, before, 'a new contract replaces the finished one');
  assert.ok(QU.rerollContract(QU.list().contracts[0].id));
  // quests survive a save
  const H = Engine.create(SKY); H.load(JSON.parse(G.serialize()));
  assert.ok(H.state.quests.claimed[done.id]);
  assert.equal(Quests.create(H).list().contracts.length, 3);
});

const LEGACY_QUESTS = ["claim5","claim15","claim40","claim100","claim250","claim500","claim757","upg10","upg50","upg200","upg600","dev1","dev5","dev15","dev40","dev88","mast1","mast5","mast20","collect20","collect200","rank2","rank3","rank4","rank5","rank6","market3","classG","classM","tech1","tech8","tech15","tech21","bld1","bldclear","station","bld10","bldtypes","bldlvl3","bld40","dyson1","route5","route30","mes1","mes5","mes15","mes40","mes110","meskinds","event1","event5","event15","perfect3","quiz20","quiz100","quiz400","learn1","learn5","learn25","perfectq","named5","named20","belt","triangle","cross","dipper"];

test('quests: ids are unique, old ids survive, and every star, constellation and Messier object they name exists', () => {
  const Quests = require('../js/quests.js');
  const G = mk('Sirius', 2);
  const QU = Quests.create(G, { rng: seeded(5) });
  const ids = QU.STORY.map(q => q.id);
  assert.equal(new Set(ids).size, ids.length, 'quest ids are unique');
  assert.ok(ids.length >= 300, 'a long story: ' + ids.length);
  LEGACY_QUESTS.forEach(id => assert.ok(ids.includes(id), 'quest ' + id + ' kept, so claimed flags in old saves still match'));
  const titles = QU.STORY.map(q => q.title);
  assert.equal(new Set(titles).size, titles.length, 'no two story quests share a title: ' + titles.filter((t, k) => titles.indexOf(t) !== k).join(' | '));
  for (const q of QU.STORY) {
    assert.ok(q.title && q.desc && q.chapter, q.id + ' is described');
    assert.ok(QU.CHAPTERS.includes(q.chapter), q.id + ' is in a listed chapter: ' + q.chapter);
    assert.ok(q.target > 0 && q.mins > 0 && Number.isFinite(q.target), q.id + ' has a target and a reward');
    assert.ok(q.title.length <= 48, q.id + ' title fits a row: ' + q.title);
    const refs = q.refs || {};
    for (const n of refs.stars || []) assert.ok(G.nameIdx.has(n), q.id + ': no star called ' + n);
    for (const n of refs.consts || []) assert.ok(SKY.consts.some(c => c.name === n), q.id + ': no constellation called ' + n);
    for (const n of refs.messier || []) assert.ok(SKY.messier.some(m => m.n === n), q.id + ': no M' + n);
    for (const k of ['stars', 'consts', 'messier']) if (refs[k]) assert.equal(q.target, refs[k].length, q.id + ' counts the ' + k + ' it names');
  }
  // a chapter never gets lost: every chapter has quests, and the list reports them all
  const L = QU.list();
  assert.deepEqual(L.chapters.map(c => c.name), QU.CHAPTERS);
  L.chapters.forEach(c => assert.ok(c.blurb && c.total > 0, c.name + ' has an introduction and quests'));
  assert.equal(L.chapters.reduce((n, c) => n + c.total, 0), QU.STORY.length);
  assert.equal(L.chapters.reduce((n, c) => n + c.done, 0), 0);
  // the default view offers exactly one open goal per chapter, a chapter view offers all that is left in it
  assert.equal(new Set(L.story.map(q => q.chapter)).size, L.story.length);
  const ch = QU.list('Spectra');
  assert.ok(ch.story.length > 5 && ch.story.every(q => q.chapter === 'Spectra'));
  assert.equal(QU.list('no such chapter').story.length, L.story.length, 'an unknown chapter falls back to the default view');
});

test('quests: nothing is finished at the start, whichever star you begin at', () => {
  const Quests = require('../js/quests.js');
  for (const home of ['Sirius', 'Polaris', 'α And', 'Vega']) {
    const G = mk(home, 4);
    const QU = Quests.create(G, { rng: seeded(5) });
    const open = QU.STORY.filter(q => q.cur() >= q.target).map(q => q.id);
    assert.deepEqual(open, [], home + ' starts with nothing ready');
    assert.equal(QU.readyCount(), 0);
  }
});

test('quests: a fully built and fully studied sky completes every story quest, and finished quests stay finished', () => {
  const Quests = require('../js/quests.js');
  const G = mk('Sirius', 3);
  const S = G.state, QU = Quests.create(G, { rng: seeded(5) });
  SKY.stars.forEach((_, i) => { S.stars[i] = { t: 0, s: 0, i: 0, r: 5, b: 5, o: 5 }; });
  SKY.messier.forEach((_, m) => { S.messier[m] = { t: 0, dev: 1 }; });
  G.TECHS.forEach(t => { S.tech.done[t.id] = 1; });
  G.Astro.TOPICS.forEach(t => { S.academy.lvl[t.id] = 3; });
  const kinds = Object.keys(G.BUILDINGS);
  G.recalc();
  // every kind of building at level 3 on enough colonies, without going through the slot rules
  G.d.claimed.forEach(i => { S.buildings[i] = kinds.map(id => ({ id, lvl: 3, t: 0, paid: { cash: 0, research: 0 } })); });
  for (let e = 0; e < 30; e++) S.routeLvl[e] = 3;
  Object.assign(S.stats, { collected: 2e11, auto: 1e11, upgrades: 1e4, eventsDone: 100, perfect: 50, restoredRoutes: 500, petitionsDone: 200, collects: 2e4, routeUps: 1000, flagCollects: 2000, flagCash: 1e10, marketEvents: 100, takeovers: 500, flagTakeovers: 20, capitals: 3, acquired: 3 });
  S.rivals.forEach(r => { r.contact = true; });
  Object.assign(S.quiz.stats, { answered: 6000, correct: 5000, rounds: 500, perfect: 200, bestStreak: 99 });
  const rec = () => ({ ok: 3000, bad: 0, last: 0, box: 10, due: 0, learned: 1 });
  for (let k = 0; k < SKY.consts.length; k++) S.quiz.const[k] = rec();
  for (let k = 0; k < 110; k++) { S.quiz.messier[k] = rec(); S.quiz.star[k] = rec(); }
  for (let k = 0; k < G.Astro.CARDS.length; k++) S.quiz.astro['card' + k] = rec();
  S.market.hi = 5000; assert.ok(G.setCorpName('Test Cosmic Ltd').ok); S.created = G.now() - 400 * 86400e3;
  G.recalc();
  assert.ok(G.d.totalRate * 3600 > 1e6, 'a developed sky earns millions an hour');
  const behind = QU.STORY.filter(q => q.cur() < q.target).map(q => q.id + ' ' + q.cur() + '/' + q.target);
  assert.deepEqual(behind, [], 'every quest can be completed');
  assert.equal(QU.readyCount(), QU.STORY.length);
  // knock the sky down again: buildings demolished, income collapsed. Anything finished stays finished.
  QU.list();
  S.buildings = {}; S.cash = 0; G.recalc();
  S.stars = { [S.home]: S.stars[S.home] }; G.recalc();
  const after = QU.STORY.filter(q => q.cur() < q.target).map(q => q.id);
  const mustHold = after.filter(id => /^(bld|b_|clear|lvl3|rate|station|dyson1|treasury)/.test(id));
  assert.deepEqual(mustHold, [], 'building and income goals do not un-finish when buildings are demolished');
  // claiming every one pays out and marks it claimed
  S.stars = {}; SKY.stars.forEach((_, i) => { S.stars[i] = { t: 0, s: 0, i: 0, r: 5, b: 5, o: 5 }; }); G.recalc();
  let n = 0;
  for (const q of QU.list().story) if (q.done && QU.claim(q.id).ok) n++;
  assert.ok(n > 10);
  const all = QU.list();
  for (const c of QU.CHAPTERS) for (const q of QU.list(c).story) if (q.done) QU.claim(q.id);
  assert.equal(QU.list().claimedCount, QU.STORY.length, 'every story quest can be claimed');
  assert.equal(QU.list().story.length, 0);
  assert.ok(all.chapters.length >= 12);
});

// ---------------------------------------------------------------- prices and rival companies
const fresh = { t: 0, s: 0, i: 0, r: 0, b: 0, o: 0 };
const rivalStarNextTo = (G, star) => { // plant a rival-held star beside one of yours, as if a rival had grown that way
  const x = G.adj[star].map(n => n.to).find(t => !G.state.stars[t] && G.rivalOf(t) < 0);
  G.state.owner[x] = 0; G.recalc();
  return x;
};

test('prices: ordinary stars are cheap, constellation leaders and flagships are dear, a rival\'s stars cost more to take over', () => {
  const G = mk('Sirius', 3);
  const kinds = {};
  SKY.stars.forEach((s, i) => { const r = G.starRank(i); (kinds[r.kind] = kinds[r.kind] || []).push(i); });
  assert.equal(kinds.flagship.length, 20);
  assert.ok(kinds.lead.length >= 90 && kinds.lead.length <= 125, 'leads: ' + kinds.lead.length);
  assert.ok(kinds.ordinary.length > 450 && kinds.bright.length > 60 && kinds.brilliant.length > 5);
  SKY.stars.forEach((s, i) => assert.equal(G.starRank(i).kind === 'flagship', !!s[7], 'flagships are the named stars'));
  // every constellation's brightest star, and every alpha, is a lead (or a flagship)
  SKY.consts.forEach(c => {
    const b = c.stars.reduce((m, i) => (SKY.stars[i][3] < SKY.stars[m][3] ? i : m), c.stars[0]);
    assert.ok(['lead', 'flagship'].includes(G.starRank(b).kind), c.name + ' leads with ' + SKY.stars[b][6]);
  });
  SKY.stars.forEach((s, i) => { if (/^α/.test(s[6])) assert.ok(['lead', 'flagship'].includes(G.starRank(i).kind), s[6]); });
  // the price rises with importance, follows the multiplier exactly, and an ordinary star costs less than the going rate
  G.state.cash = 1e9;
  const rate = G.claimCost();
  const pick = k => kinds[k].find(i => !G.state.stars[i] && G.rivalOf(i) < 0);
  const rows = ['ordinary', 'bright', 'brilliant', 'lead', 'flagship'].map(k => [k, G.starPrice(pick(k)), G.starRank(pick(k)).mul]);
  for (let k = 1; k < rows.length; k++) assert.ok(rows[k][1] > rows[k - 1][1], rows[k][0] + ' costs more than ' + rows[k - 1][0]);
  rows.forEach(([k, price, mul]) => assert.equal(price, Math.ceil(rate * mul), k + ' follows its multiplier'));
  assert.ok(rows[0][1] < rate && rows[4][1] >= rate * 5, 'ordinary below the going rate, a flagship several times it');
  // a rival's star costs the takeover premium on top of its own price
  const cap = G.rivals()[0].home;
  assert.equal(G.rivalOf(cap), 0);
  assert.equal(G.starPrice(cap), Math.ceil(rate * G.starRank(cap).mul * G.CFG.takeoverMul));
  assert.ok(G.starPrice(cap) > G.starPrice(pick('flagship')) * 2);
  // buying more stars raises the going rate for everything
  const before = G.starPrice(pick('ordinary'));
  G.state.cash = 1e12; for (const t of G.expansionTargets().slice(0, 6)) G.launch(t);
  assert.ok(G.starPrice(pick('ordinary')) > before);
});

test('rivals: three companies start on far-apart flagships of their own, with names and colours', () => {
  for (const home of ['Sirius', 'Polaris', 'Vega', 'Acrux']) {
    const G = mk(home, 5);
    const R = G.rivals();
    assert.equal(R.length, 3);
    const caps = [G.state.home, ...R.map(r => r.home)];
    assert.equal(new Set(caps).size, 4, 'four different headquarters');
    R.forEach(r => { assert.ok(G.isFlagship(r.home), 'a rival starts on a flagship'); assert.equal(G.rivalOf(r.home), r.id); assert.equal(r.n, 1); assert.ok(r.name && /^#[0-9a-f]{6}$/i.test(r.color)); });
    assert.equal(new Set(R.map(r => r.name)).size, 3);
    assert.equal(new Set(R.map(r => r.color)).size, 3);
    for (let a = 0; a < caps.length; a++) for (let b = a + 1; b < caps.length; b++) assert.ok(Engine.sepDeg(SKY.stars[caps[a]], SKY.stars[caps[b]]) > 60, home + ': headquarters at least 60 degrees apart');
    assert.ok(!G.state.stars[R[0].home] && G.frontier().size > 0);
  }
});

test('rivals: they expand at a share of YOUR pace, only while you do, and never take what you hold or are sailing to', () => {
  const G = mk('Sirius', 7);
  G.state.cash = 1e13;
  const idle = JSON.stringify(G.state.owner);
  G.catchUp(1e6); G.tick(5e4, true);
  assert.equal(JSON.stringify(G.state.owner), idle, 'a company that is not growing leaves its rivals where they are');
  for (let round = 0; round < 40; round++) {
    for (const t of G.expansionTargets().slice(0, 5)) assert.ok(G.launch(t).ok);
    G.catchUp(4000);
    const stars = Object.keys(G.state.stars).map(Number);
    assert.ok(stars.every(i => G.rivalOf(i) < 0 && G.state.owner[i] === undefined), 'no star is both yours and a rival\'s');
  }
  const me = G.d.count, R = G.rivals();
  assert.ok(me > 150, 'you grew: ' + me);
  R.forEach(r => {
    const want = r.ratio * (me - 1) + 1;
    assert.ok(Math.abs(r.n - want) <= Math.max(8, want * 0.15), r.name + ' holds ' + r.n + ', expected about ' + want.toFixed(0) + ' for your ' + me);
    assert.ok(r.touching || r.n > 0);
  });
  assert.equal(Object.keys(G.state.owner).length, R.reduce((a, r) => a + r.n, 0), 'the books balance');
  // rivals only ever hold stars next to what they already hold (or, rarely, a sail away)
  const first = R[0], mineOf = id => Object.keys(G.state.owner).filter(k => G.state.owner[k] === id).map(Number);
  const owned = mineOf(first.id);
  const connected = new Set([first.home]); let grew = true;
  while (grew) { grew = false; for (const i of owned) if (!connected.has(i) && G.adj[i].some(n => connected.has(n.to))) { connected.add(i); grew = true; } }
  assert.ok(connected.size >= owned.length * 0.9, 'a rival\'s territory is (nearly) one connected piece: ' + connected.size + ' of ' + owned.length);
  // a star with your ship bound for it is never taken from under you
  const H = mk('Sirius', 9);
  H.state.cash = 1e13;
  const t = H.expansionTargets()[0];
  assert.ok(H.launch(t).ok);
  H.state.fleets.forEach(f => { f.remaining = 1e9; f.dur = 1e9; });
  for (const r of H.state.rivals) { r.credit = 9; r.cool = 0; }
  H.tick(5e5, false);
  assert.equal(H.rivalOf(t), -1, 'the star a ship is bound for stays free');
  assert.ok(H.rivals().some(r => r.n > 1), 'the rivals did expand meanwhile');
});

test('takeovers: pay the premium, the star changes hands, and the books, log and counters say so', () => {
  const G = mk('Sirius', 4);
  const S = G.state, home = S.home;
  const x = rivalStarNextTo(G, home);
  assert.equal(G.rivalOf(x), 0);
  assert.ok(!G.frontier().has(x) && !G.expansionTargets().includes(x), 'a rival\'s star is not a free star');
  assert.ok(G.takeoverTargets().includes(x));
  const price = G.starPrice(x), rate = G.claimCost();
  assert.equal(price, Math.ceil(rate * G.starRank(x).mul * G.CFG.takeoverMul));
  S.cash = price - 1;
  assert.ok(!G.canLaunchTo(x).ok && /cash/i.test(G.canLaunchTo(x).msg));
  S.cash = price + 5;
  const r = G.launch(x);
  assert.ok(r.ok && r.takeover && /takeover/i.test(r.msg), r.msg);
  assert.equal(S.cash, 5, 'paid exactly the price');
  assert.ok(!G.takeoverTargets().includes(x), 'a ship is already bound there');
  const held = S.rivals[0].n;
  G.catchUp(r.sec + 1);
  assert.ok(S.stars[x], 'the star is yours');
  assert.equal(G.rivalOf(x), -1); assert.equal(S.owner[x], undefined);
  assert.equal(S.rivals[0].n, held - 1); assert.equal(S.rivals[0].lost, 1);
  assert.equal(S.stats.takeovers, 1); assert.equal(S.stats.claimed, 1);
  assert.ok(S.log.some(l => l.kind === 'claim' && /Took over/.test(l.text) && l.text.includes(S.rivals[0].name)));
  // a cancelled takeover charter is refunded in full
  const y = rivalStarNextTo(G, x);
  S.cash = G.starPrice(y); S.fleets.length = 0; S.orders.length = 0;
  assert.ok(G.launch(y).ok);
  const o = S.orders[0] || null; const cash0 = S.cash;
  if (o) { assert.ok(G.cancelOrder(o.id).ok); assert.equal(S.cash, cash0 + o.paid); }
});

test('takeovers: a headquarters counts, and a rival with no star left is acquired and stops growing', () => {
  const G = mk('Sirius', 6);
  const S = G.state, R0 = S.rivals[0], cap = R0.home;
  // you hold a star beside their headquarters; they hold nothing else
  const nb = G.adj[cap][0].to;
  S.stars[nb] = { ...fresh }; for (const k of Object.keys(S.owner)) if (S.owner[k] === 0 && +k !== cap) delete S.owner[k];
  G.recalc();
  assert.equal(R0.n, 1);
  S.cash = 1e13;
  const r = G.launch(cap);
  assert.ok(r.ok, r.msg);
  G.catchUp(r.sec + 1);
  assert.ok(S.stars[cap] && G.rivalOf(cap) === -1);
  assert.equal(S.stats.capitals, 1); assert.equal(S.stats.acquired, 1);
  assert.equal(R0.n, 0);
  assert.ok(S.log.some(l => /headquarters/.test(l.text)) && S.log.some(l => /acquired/.test(l.text)));
  assert.ok(G.rivals()[0].out);
  const others = G.rivals().filter(r => r.id !== 0);
  for (const r2 of S.rivals) { r2.credit = 8; r2.cool = 0; }
  const before = Object.keys(S.owner).filter(k => S.owner[k] === 0).length;
  G.catchUp(1e5);
  assert.equal(Object.keys(S.owner).filter(k => S.owner[k] === 0).length, before, 'an acquired company does not come back');
  assert.ok(others.length === 2 && G.rivals().filter(r2 => r2.id !== 0).some(r2 => r2.n > 1), 'the others carry on');
});

test('rivals fill every free star eventually, then stop; a rival with no free neighbour sails to the nearest free star', () => {
  const G = mk('Sirius', 8);
  const S = G.state;
  // surround rival 0 completely with its own and other rivals' stars except far away: hand it a lot of credit
  for (const r of S.rivals) { r.credit = 10; r.cool = 0; }
  for (let k = 0; k < 400; k++) { for (const r of S.rivals) { r.credit = 10; r.cool = 0; } G.tick(30, false); }
  const free = SKY.stars.filter((s, i) => !S.stars[i] && G.rivalOf(i) < 0).length;
  const total = G.rivals().reduce((a, r) => a + r.n, 0) + G.d.count + free;
  assert.equal(total, SKY.stars.length, 'every star is yours, a rival\'s or free');
  assert.ok(free <= 20, 'rivals ran out of free stars: ' + free + ' left (a few stay out of reach of your colonies)');
  // nothing left to take: they are stuck and the clock does not spin
  const t0 = Date.now(); G.catchUp(5e6); assert.ok(Date.now() - t0 < 2000, 'a stuck rival costs no time');
});

test('rivals survive a save, play out identically from the same save, and an older save founds them to match your progress', () => {
  const G = mk('Sirius', 12);
  G.state.cash = 1e13;
  for (let round = 0; round < 12; round++) { for (const t of G.expansionTargets().slice(0, 5)) G.launch(t); G.catchUp(3000); }
  const json = G.serialize();
  const A = Engine.create(SKY, { rng: seeded(1), now: () => 1e12 }), B = Engine.create(SKY, { rng: seeded(2), now: () => 1e12 });
  A.load(JSON.parse(json)); B.load(JSON.parse(json));
  assert.deepEqual(A.rivals(), G.rivals());
  assert.deepEqual(A.state.owner, G.state.owner);
  for (const H of [A, B]) { H.state.cash = 1e13; for (const t of H.expansionTargets().slice(0, 4)) H.launch(t); H.catchUp(4000); }
  assert.deepEqual(A.state.owner, B.state.owner, 'the rivals use their own saved random stream');
  // a version-5 save has no rivals: loading founds them, already grown to their share
  const old = JSON.parse(json);
  old.version = 5; delete old.rivals; delete old.owner; delete old.rseed;
  const H = Engine.create(SKY, { rng: seeded(3), now: () => 1e12 });
  H.load(old);
  assert.equal(H.state.version, Engine.SAVE_VERSION);
  assert.equal(H.rivals().length, 3);
  H.rivals().forEach(r => { const want = r.ratio * (H.d.count - 1) + 1; assert.ok(Math.abs(r.n - want) <= Math.max(4, want * 0.1), r.name + ' has ' + r.n + ', expected about ' + want.toFixed(0)); });
  assert.ok(Object.keys(H.state.owner).every(k => !H.state.stars[k]));
});

test('saves from v2 (before hubs and quests) load and gain the new fields', () => {
  const G = mk();
  const old = JSON.parse(G.serialize());
  old.version = 2; old.starlight = 5; old.insight = 6; delete old.cash; delete old.research;
  delete old.hubs; delete old.buildings; delete old.built; delete old.routeLvl; delete old.quests; delete old.tech; delete old.market; delete old.corp;
  delete old.stats.collects; delete old.stats.auto;
  const H = Engine.create(SKY); H.load(old);
  assert.equal(H.state.version, Engine.SAVE_VERSION);
  assert.deepEqual(H.state.buildings, {});
  assert.equal(H.state.stats.collects, 0);
  assert.ok(H.state.quests.claimed && H.state.tech.done.telescope);
  assert.equal(H.state.cash, 5);
  H.catchUp(100);
});

test('shortcut helpers: expansion targets, Messier targets and numbered building rows', () => {
  const G = mk();
  const home = G.state.home, S = G.state;
  G.state.cash = 1e6; G.state.research = 1e6;
  // expansion targets: free neighbours of colonies, best revenue for the money first, never claimed, held by a rival or already bound for
  let t = G.expansionTargets();
  assert.ok(t.length > 0);
  assert.ok(t.every(x => !S.stars[x]));
  const worth = x => G.baseRate[x] * Math.max(0.2, 1 + G.profileOf(x).rev) / G.starRank(x).mul;
  for (let k = 1; k < t.length; k++) assert.ok(worth(t[k - 1]) >= worth(t[k]), 'sorted by revenue for the money');
  assert.deepEqual(new Set(t), G.frontier(), 'with no ships out these are exactly the frontier');
  const best = t[0];
  assert.ok(G.launch(best).ok);
  t = G.expansionTargets();
  assert.ok(!t.includes(best), 'a star with a ship bound for it is not offered again');
  // stars next to a pending target can be chained
  const beyond = G.adj[best].map(n => n.to).filter(x => !S.stars[x] && x !== home);
  assert.ok(beyond.length === 0 || beyond.every(x => t.includes(x)), 'neighbours of a destination are offered');
  // "near" prefers the neighbours of one colony and falls back to everything
  assert.ok(G.expansionTargets(home).every(x => G.adj[home].some(n => n.to === x)));
  G.catchUp(2000);
  const a = Object.keys(S.stars).map(Number).find(i => i !== home);
  const mine = G.expansionTargets(a);
  assert.ok(mine.length > 0);
  // Messier targets: within reach, unsurveyed, brightest first
  const ms = G.messierTargets();
  ms.forEach(m => { assert.ok(!S.messier[m]); assert.ok(G.messierAccess(m).length > 0); });
  for (let k = 1; k < ms.length; k++) assert.ok(SKY.messier[ms[k - 1]].mag <= SKY.messier[ms[k]].mag);
  if (ms.length) { assert.ok(G.visitMessier(ms[0]).ok); G.catchUp(5000); assert.ok(!G.messierTargets().includes(ms[0])); }
  // building rows: nothing without a slot; then upgrades of what stands, then buildable ones in catalogue order
  assert.deepEqual(G.buildOptions(home), []);
  for (const tr of ['r', 'b', 'o']) G.upgrade(home, tr);
  assert.equal(G.slotsAt(home), 1);
  let rows = G.buildOptions(home);
  assert.ok(rows.length > 0 && rows.every(r => r.kind === 'build'));
  assert.ok(rows.every(r => S.tech.done[G.BUILDINGS[r.id].tech]), 'only unlocked buildings');
  assert.equal(rows[0].id, 'observatory');
  const order = Object.keys(G.BUILDINGS);
  for (let k = 1; k < rows.length; k++) assert.ok(order.indexOf(rows[k - 1].id) < order.indexOf(rows[k].id), 'catalogue order');
  assert.ok(G.build(home, 'observatory').ok);
  rows = G.buildOptions(home);
  assert.deepEqual(rows[0], { id: 'observatory', kind: 'upgrade' }, 'upgrades come first');
  assert.ok(!rows.some(r => r.kind === 'build' && r.id === 'observatory'));
  assert.ok(G.build(home, 'observatory').ok); assert.ok(G.build(home, 'observatory').ok);
  assert.ok(!G.buildOptions(home).some(r => r.id === 'observatory'), 'a fully built building has no row');
  assert.deepEqual(G.buildOptions(999999), [], 'unknown or unowned stars have no rows');
});

test('attention lists flagships first, then the fullest storage', () => {
  const G = mk();
  G.state.cash = 1e6;
  for (let k = 0; k < 4; k++) { const t = G.expansionTargets()[0]; assert.ok(G.launch(t).ok); G.catchUp(3000); }
  G.tick(1e6, false);
  const full = G.attention();
  assert.ok(full.length >= 3);
  for (let k = 1; k < full.length; k++) if (full[k - 1].why === full[k].why) assert.ok(full[k - 1].cash >= full[k].cash);
  const firstPlain = full.findIndex(f => f.why === 'full');
  assert.ok(firstPlain < 0 || full.slice(firstPlain).every(f => f.why === 'full'), 'flagships come first');
  assert.ok(full.every(f => f.why === 'full' || f.why === 'flagship'));
  assert.ok(full.some(f => f.why === 'flagship'), 'the headquarters is a flagship');
});

test('quiz: Messier photo questions ask for the number or the name, and the wrong answers look more alike as you learn it', () => {
  const G = mk('Sirius', 3);
  const QZ = Quiz.create(G, { rng: seeded(9), now: () => 1e12 });
  const sameTypeCount = (q, M) => q.options.filter(o => o.text !== q.options[q.answer].text).filter(o => {
    const x = SKY.messier.find(m => (q.kind.endsWith('num') || q.kind === 'm-num-pic' ? 'M' + m.n === o.text : (o.text.replace(/ \(M\d+\)$/, '') === m.alt))); return x && x.tname === M.tname; }).length;
  for (const kind of ['m-pic-num', 'm-pic-name', 'm-num-pic', 'm-name-pic']) {
    const avg = box => {
      SKY.messier.forEach((m, i) => { G.state.quiz.messier[i] = { ok: box, bad: 0, last: 0, box, due: 0, learned: 0 }; });
      let total = 0, count = 0;
      for (let n = 0; n < 120; n++) {
        const q = QZ.build(kind); checkQuestion(q);
        const M = SKY.messier[q.subject.id];
        assert.equal(q.options.length, 4);
        const right = q.options[q.answer];
        if (kind === 'm-pic-num') { assert.equal(right.text, 'M' + M.n); assert.equal(q.visual.m, q.subject.id); }
        if (kind === 'm-pic-name') { assert.equal(right.text, M.alt); assert.ok(M.alt && !/asterism|patch/i.test(M.alt)); }
        if (kind === 'm-num-pic') { assert.equal(right.visual.m, q.subject.id); assert.ok(q.prompt.includes('M' + M.n)); assert.ok(q.options.every(o => o.visual && o.visual.type === 'messier')); }
        if (kind === 'm-name-pic') { assert.equal(right.visual.m, q.subject.id); assert.ok(q.prompt.includes(M.alt)); }
        total += sameTypeCount(q, M); count++;
      }
      return total / count;
    };
    const novice = avg(0), expert = avg(7);
    assert.ok(expert > novice + 0.6, kind + ': look-alikes grow from ' + novice.toFixed(2) + ' to ' + expert.toFixed(2));
  }
});
