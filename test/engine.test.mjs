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

test('every wonder name resolves to a star', () => {
  const G = mk();
  for (const n of Object.keys(G.WONDERS)) assert.ok(G.nameIdx.has(n), n);
  for (const s of G.wonderSets) assert.equal(s.idx.length, s.stars.length, s.id);
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
  const rem = G.state.events[0].remaining;
  G.catchUp(7 * 86400);
  assert.equal(G.state.events[0].remaining, rem);
  G.tick(rem + 1, true);
  assert.equal(G.state.events.length, 0);
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

test('wonder project: needs observatory, completes into full perk', () => {
  const G = mk('Sirius');
  const h = G.state.home;
  G.state.insight = 1e4; G.state.starlight = 1e7;
  assert.ok(!G.startWonder(h).ok);
  G.upgrade(h, 'o');
  const half = G.d.P.out;
  assert.ok(G.startWonder(h).ok);
  G.catchUp(G.CFG.wonderSeconds + 1);
  assert.ok(G.state.wonderDone[h]);
  assert.ok(G.d.P.out > half);
});

test('pacing sketch: a played-through economy keeps growing', () => {
  // naive bot: collect, claim cheapest frontier star, upgrade radiance; 3 visits a day for 30 days
  const G = mk('Sirius', 11);
  const day = 86400;
  const snaps = [];
  for (let d = 0; d < 30; d++) {
    for (let v = 0; v < 3; v++) {
      G.catchUp(day / 3);
      for (const i of G.d.claimed) G.collect(i);
      for (let guard = 0; guard < 40; guard++) {
        const f = [...G.frontier()].filter(t => G.canLaunchTo(t).ok);
        const up = G.d.claimed.filter(i => G.state.stars[i].r < 5).sort((a, b) => G.upgradeCost(a, 'r') - G.upgradeCost(b, 'r'))[0];
        if (f.length && G.state.starlight >= G.claimCost() * 1.2) { G.launch(f[0]); continue; }
        if (up !== undefined && G.state.starlight >= G.upgradeCost(up, 'r') && G.state.starlight > G.claimCost()) { G.upgrade(up, 'r'); continue; }
        break;
      }
    }
    if (d % 5 === 4) snaps.push(`day ${d + 1}: ${G.d.count} stars, ${G.fmt(G.d.totalRate * 3600)}/h`);
  }
  console.log('\n' + snaps.join('\n'));
  assert.ok(G.d.count > 100);
  assert.ok(G.d.count < 500, 'should not run away in 30 days of casual play');
});
