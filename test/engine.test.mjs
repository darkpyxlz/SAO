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
  assert.equal(H.state.version, 2);
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

test('quiz: rewards, first-time bonus, cooldown, streaks, perfect round and learning', () => {
  let t = 1e12;
  const G = mk('Sirius', 4);
  const QZ = Quiz.create(G, { rng: seeded(9), now: () => t });
  const before = G.state.starlight;
  let r = QZ.startRound('const');
  const first = QZ.answer(r, r.qs[0].answer);
  assert.ok(first.correct && first.reward.starlight > 0 && first.reward.item === Quiz.REWARD.firstTime);
  assert.ok(G.state.starlight > before);
  const wrong = QZ.answer(r, (r.qs[1].answer + 1) % r.qs[1].options.length);
  assert.ok(!wrong.correct && wrong.reward.starlight === 0);
  assert.equal(r.streak, 0);
  // same subject again straight away pays only a trickle; after the cooldown it pays full
  const subj = r.qs[0].subject;
  const mkQ = () => ({ kind: 'x', cat: subj.cat, subject: subj, prompt: 'p', options: [{ text: 'a' }, { text: 'b' }], answer: 0, explain: 'e' });
  let rr = { cat: 'const', qs: [mkQ(), mkQ()], i: 0, correct: 0, streak: 0, best: 0, earned: { starlight: 0, insight: 0 }, answers: [], done: false };
  const soon = QZ.answer(rr, 0);
  assert.equal(soon.reward.item, Quiz.REWARD.tooSoon);
  t += 7 * 3600 * 1000;
  const later = QZ.answer(rr, 0);
  assert.equal(later.reward.item, Quiz.REWARD.repeat);
  assert.ok(later.reward.streak > 1, 'streak multiplier');
  assert.ok(rr.done && rr.bonus, 'perfect round bonus paid');
  assert.ok(QZ.learned(subj.cat, subj.id), 'two correct answers = learned');
  const st = G.state.quiz.stats;
  assert.ok(st.answered >= 4 && st.correct >= 3 && st.rounds >= 1 && st.perfect >= 1 && st.bestStreak >= 2);
  // save round-trip keeps quiz progress
  const H = Engine.create(SKY); H.load(JSON.parse(G.serialize()));
  assert.equal(H.state.quiz.stats.correct, st.correct);
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
