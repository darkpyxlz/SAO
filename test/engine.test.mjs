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
  G.state.starlight = 1e5;
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
  G.state.starlight = 1e6;
  const targets = [...new Set(G.d.claimed.flatMap(i => G.adj[i].map(n => n.to)))];
  for (const t of targets) assert.ok(G.launch(t).ok);
  assert.equal(G.state.fleets.length, Math.min(G.d.slots, targets.length));
  // chain: a star two hops out can be ordered while its neighbour is still only an order
  const far = G.adj[targets[0]].map(n => n.to).find(n => !G.state.stars[n] && !G.targetsPending().has(n));
  if (far !== undefined) assert.ok(G.launch(far).ok);
  const before = G.state.starlight;
  const q = G.state.orders.length;
  if (q) { const id = G.state.orders[0].id, paid = G.state.orders[0].paid; assert.ok(G.cancelOrder(id).ok); assert.equal(G.state.starlight, before + paid); }
  G.catchUp(3600);
  assert.equal(G.state.fleets.length, 0);
  assert.ok(G.state.orders.length === 0 || G.state.orders.every(o => !G.state.stars[o.to]));
  assert.ok(G.d.count > 1);
});

test('upgrades raise output and are capped', () => {
  const G = mk();
  const h = G.state.home;
  G.state.starlight = 1e9;
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
  G.state.insight = 1e4; G.state.starlight = 1e6;
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
  const before = G.state.starlight;
  let last;
  for (const e of ev.edges.slice()) { const [a, b] = SKY.edges[e]; last = G.redraw(ev.id, a, b); assert.ok(last.ok); }
  assert.ok(last.done);
  assert.ok(G.state.starlight > before);
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
  G.state.starlight = 1234;
  const json = G.serialize();
  const H = Engine.create(SKY);
  H.load(JSON.parse(json));
  assert.equal(H.state.starlight, 1234);
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
  assert.deepEqual(G.d.P, { out: 0, speed: 0, slots: 0, ins: 0, cost: 0, cap: 0, ev: 0 });
  for (const n of ['Aldebaran', 'Antares', 'Fomalhaut', 'Spica']) G.state.stars[G.nameIdx.get(n)] = { t: 0, s: 0, i: 0, r: 0, b: 0, o: 0 };
  G.recalc();
  assert.equal(G.d.P.out, 0, 'no Royal Stars bonus');
});

test('pacing sketch: a casual bot (3 visits a day) claims the whole sky in about one to two weeks', () => {
  const G = mk('Sirius', 11);
  const day = 86400;
  const snaps = {}; let doneDay = null;
  for (let d = 1; d <= 30 && doneDay === null; d++) {
    for (let v = 0; v < 3; v++) {
      G.catchUp(day / 3);
      for (const i of G.d.claimed) G.collect(i);
      for (let guard = 0; guard < 80; guard++) {
        const cand = new Set(G.frontier());
        for (const p of G.targetsPending()) for (const n of G.adj[p]) if (!G.state.stars[n.to]) cand.add(n.to);
        const f = [...cand].filter(x => G.canLaunchTo(x).ok).sort((a, b) => SKY.stars[a][3] - SKY.stars[b][3]);
        const ups = [];
        for (const i of G.d.claimed) for (const tr of ['r', 'b']) if (G.state.stars[i][tr] < 5) ups.push([i, tr, G.upgradeCost(i, tr)]);
        ups.sort((a, b) => a[2] - b[2]);
        const cc = G.claimCost();
        if (f.length && G.state.starlight >= cc) { G.launch(f[0]); continue; }
        if (ups[0] && G.state.starlight >= ups[0][2] && ups[0][2] < cc * 0.4) { G.upgrade(ups[0][0], ups[0][1]); continue; }
        break;
      }
    }
    if ([1, 3, 7, 10].includes(d)) snaps[d] = G.d.count;
    if (G.d.count + G.targetsPending().size >= SKY.stars.length) doneDay = d;
  }
  console.log('\nstars after day 1/3/7/10:', JSON.stringify(snaps), 'all claimed by day', doneDay);
  assert.ok(doneDay !== null && doneDay >= 6 && doneDay <= 20, 'finished on day ' + doneDay);
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
  if (q.visual) assert.ok(['figure', 'marked', 'messier'].includes(q.visual.type));
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
    for (const cat of ['const', 'star', 'messier', 'mixed']) {
      const r = QZ.startRound(cat);
      assert.equal(r.qs.length, 5, cat + ' round length');
      r.qs.forEach(q => { checkQuestion(q); seenKinds.add(q.kind); });
      const subjects = r.qs.map(q => q.subject.cat + ':' + q.subject.id);
      assert.equal(new Set(subjects).size, subjects.length, 'no repeated subject in a round');
    }
  }
  for (const kinds of Object.values(Quiz.create(G).KINDS)) kinds.forEach(k => assert.ok(seenKinds.has(k), 'kind generated: ' + k));
});

test('quiz: spaced repetition needs 10 spaced correct answers; early answers do not count', () => {
  let t = 1e12;
  const G = mk('Sirius', 4);
  const QZ = Quiz.create(G, { rng: seeded(9), now: () => t });
  const subj = { cat: 'const', id: 5 };
  const mkQ = () => ({ kind: 'x', cat: 'const', subject: subj, prompt: 'p', options: [{ text: 'a' }, { text: 'b' }], answer: 0, explain: 'e' });
  const one = (choice = 0) => { const r = { cat: 'const', qs: [mkQ()], i: 0, correct: 0, streak: 0, best: 0, earned: { starlight: 0, insight: 0 }, answers: [], done: false }; return QZ.answer(r, choice); };
  const before = G.state.starlight;
  const first = one();
  assert.ok(first.correct && first.counted && first.box === 1 && first.reward.item === Quiz.REWARD.firstTime);
  assert.ok(G.state.starlight > before);
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
  const s0 = G.state.starlight;
  r.qs.forEach(q => QZ.answer(r, q.answer));
  assert.ok(r.done && r.bonus && r.bonus.starlight > 0, 'perfect round bonus');
  assert.ok(G.state.starlight - s0 > r.earned.starlight, 'bonus paid on top');
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

test('hubs: need a developed star, then a Collection Hub banks output automatically', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home;
  const region = regionOf(G, home, 3);
  claimMany(G, region);
  G.state.starlight = 1e9; G.state.insight = 1e6;
  assert.ok(!G.canBuildHub(home, 'collect').ok, 'star needs 3 upgrade levels first');
  G.state.stars[home].r = 3; G.recalc();
  assert.ok(!G.canBuildHub(home, 'bogus').ok);
  assert.ok(G.buildHub(home, 'collect').ok);
  assert.equal(G.state.hubs[home].lvl, 1);
  assert.ok(!G.canBuildHub(home, 'yard').ok, 'one hub type per star');
  const covered = G.d.coverage[home];
  assert.ok(covered.length > 3 && covered.includes(home));
  const cs = covered.find(i => i !== home);
  assert.ok(Math.abs(G.d.auto[cs] - 0.5) < 1e-6);
  // output now reaches the wallet without collecting
  const w0 = G.state.starlight;
  G.tick(600, false);
  assert.ok(G.state.starlight - w0 > 0, 'wallet grows on its own');
  assert.ok(G.state.stats.auto > 0);
  // the stockpile only holds the un-banked half
  G.tick(1e6, false);
  assert.ok(Math.abs(G.state.stars[cs].s - G.stockCap(cs)) < 1e-6);
  assert.ok(G.stockCap(cs) < G.d.rate[cs] * G.d.cap[cs]);
  // level 2 reaches further and banks more; needs 6 levels
  assert.ok(!G.canBuildHub(home, 'collect').ok);
  G.state.stars[home].r = 5; G.state.stars[home].b = 1; G.recalc();
  assert.ok(G.buildHub(home, 'collect').ok);
  assert.ok(Math.abs(G.d.auto[cs] - 0.7) < 1e-6);
  assert.ok(G.d.coverage[home].length >= covered.length);
  // a cut route breaks the reach
  const far = G.d.coverage[home].find(i => !G.adj[home].some(n => n.to === i) && i !== home);
  if (far !== undefined) {
    const n = G.adj[far].find(x => G.d.coverage[home].includes(x.to));
    G.state.events.push({ id: 99, kind: 'comet', name: 'x', edges: G.adj[home].map(x => x.e), restored: [], remaining: 99, total: 99, hits: 0, misses: 0, hint: false, paid: 0, where: '', center: home });
    G.recalc();
    assert.equal(G.d.coverage[home].length, 1, 'with every route out of the hub cut, only the hub itself is covered');
  }
});

test('hubs: shipyard adds slots, lab boosts insight, trade boosts routes', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home, region = regionOf(G, home, 2);
  claimMany(G, region);
  region.forEach(i => { G.state.stars[i].o = 2; });
  G.state.starlight = 1e12; G.state.insight = 1e9; G.state.stars[home].r = 3; G.recalc();
  const slots0 = G.d.slots, ins0 = G.d.totalIns, rate0 = G.d.totalRate;
  assert.ok(G.buildHub(home, 'yard').ok);
  assert.equal(G.d.slots, slots0 + 1);
  assert.ok(G.d.yardSpeed[home] > 0);
  const other = region.find(i => i !== home);
  G.state.stars[other].r = 3; G.recalc();
  assert.ok(G.buildHub(other, 'lab').ok);
  assert.ok(G.d.totalIns > ins0);
  const third = region.find(i => i !== home && i !== other); G.state.stars[third].r = 3; G.recalc();
  const r1 = G.d.totalRate;
  assert.ok(G.buildHub(third, 'trade').ok);
  assert.ok(G.d.totalRate > r1);
});

test('routes: upgrading raises trade output and speeds fleets; levels cap', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home, nb = G.adj[home][0];
  claimMany(G, [nb.to]);
  G.state.starlight = 1e12;
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

test('lanes: buildable links only between claimed stars, then act as real routes (and survive a save)', () => {
  const G = mk('Sirius', 2);
  const home = G.state.home;
  const region = regionOf(G, home, 3);
  claimMany(G, region);
  G.state.starlight = 1e12;
  const lane = region.map(i => G.buildableLanes(i).map(l => ({ a: i, ...l }))).flat()[0];
  assert.ok(lane, 'a buildable lane exists within the region');
  assert.ok(G.isBuildable(lane.e) && !G.edgeActive(lane.e));
  assert.ok(!G.adj[lane.a].some(n => n.e === lane.e), 'not a route until built');
  const routes0 = G.d.routes, rate0 = G.d.totalRate;
  assert.ok(G.buildLane(lane.e).ok);
  assert.ok(G.adj[lane.a].some(n => n.e === lane.e) && G.adj[lane.other].some(n => n.e === lane.e));
  assert.equal(G.d.routes, routes0 + 1);
  assert.ok(G.d.totalRate > rate0);
  assert.ok(!G.buildLane(lane.e).ok, 'cannot build twice');
  assert.ok(G.upgradeRoute(lane.e).ok, 'built lanes can be upgraded too');
  const outside = SKY.edges.findIndex((e, i) => G.isBuildable(i) && !G.state.stars[e[0]]);
  assert.ok(!G.buildLane(outside).ok, 'both ends must be claimed');
  const H = Engine.create(SKY); H.load(JSON.parse(G.serialize()));
  assert.ok(H.adj[lane.a].some(n => n.e === lane.e), 'built lane restored from save');
  assert.equal(H.d.routes, G.d.routes);
  // the base graph is untouched: a fresh game has no built lanes
  const F = Engine.create(SKY); F.newGame(0);
  assert.ok(!F.adj.some(a => a.some(n => F.isBuildable(n.e))));
});

test('quests: story quests complete from state and pay out once; contracts refresh', () => {
  const Quests = require('../js/quests.js');
  const G = mk('Sirius', 2);
  const QU = Quests.create(G, { rng: seeded(5) });
  let L = QU.list();
  assert.equal(L.contracts.length, 3);
  assert.equal(new Set(L.contracts.map(c => c.title)).size, 3);
  assert.ok(L.story.length >= 5 && L.total >= 30);
  assert.equal(QU.readyCount(), 0);
  // claim five stars: "Claim 5 stars" completes
  claimMany(G, regionOf(G, G.state.home, 2));
  assert.ok(G.d.count >= 5);
  assert.ok(QU.readyCount() >= 1);
  const w0 = G.state.starlight;
  const done = QU.list().story.find(q => q.done);
  const r = QU.claim(done.id);
  assert.ok(r.ok && G.state.starlight > w0);
  assert.ok(!QU.claim(done.id).ok, 'cannot claim twice');
  assert.ok(!QU.list().story.some(q => q.id === done.id), 'claimed quest leaves the list');
  // a contract finishes when its counter moves past the baseline
  const c = QU.list().contracts[0];
  assert.equal(c.cur, 0);
  const tm = QU.TEMPLATES.find(x => c.title === x.title(c.target));
  assert.ok(tm, 'contract matches a template');
  G.state.stats.claimed += 100; G.state.stats.upgrades += 100; G.state.stats.collects += 100; G.state.stats.routeUps += 100; G.state.stats.lanes += 100; G.state.stats.eventsDone += 100; G.state.quiz.stats.correct += 100;
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

test('saves from v2 (before hubs and quests) load and gain the new fields', () => {
  const G = mk();
  const old = JSON.parse(G.serialize());
  old.version = 2; delete old.hubs; delete old.built; delete old.routeLvl; delete old.quests; delete old.stats.collects; delete old.stats.auto;
  const H = Engine.create(SKY); H.load(old);
  assert.equal(H.state.version, Engine.SAVE_VERSION);
  assert.deepEqual(H.state.hubs, {});
  assert.equal(H.state.stats.collects, 0);
  assert.ok(H.state.quests.claimed);
  H.catchUp(100);
});
