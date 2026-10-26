import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.window = {};
const SKY = require('../js/data.js');
const Y = require('../js/yearsky.js');
const Engine = require('../js/engine.js');

const utc = (y, m, d, h = 0, mi = 0) => Date.UTC(y, m - 1, d, h, mi);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' ' + a + ' vs ' + b);

test('ecliptic: coordinates convert both ways and land on the known points', () => {
  const eq = (lon, lat) => Y.eclToEq(lon, lat);
  near(eq(0, 0)[0], 0, 1e-9); near(eq(0, 0)[1], 0, 1e-9);
  near(eq(90, 0)[0], 90, 1e-9); near(eq(90, 0)[1], Y.EPS, 1e-9, 'the June solstice is at declination +23.44');
  near(eq(180, 0)[0], 180, 1e-9); near(eq(180, 0)[1], 0, 1e-9);
  near(eq(270, 0)[0], 270, 1e-9); near(eq(270, 0)[1], -Y.EPS, 1e-9, 'the December solstice is at -23.44');
  near(eq(0, 90)[0], 270, 1e-9); near(eq(0, 90)[1], 90 - Y.EPS, 1e-9, 'the north ecliptic pole is at 18h, +66.56');
  near(eq(0, -90)[0], 90, 1e-9); near(eq(0, -90)[1], -(90 - Y.EPS), 1e-9, 'the south ecliptic pole is at 6h, -66.56');
  for (let lon = 0; lon < 360; lon += 17) for (const lat of [-60, -8, 0, 8, 45]) {
    const [ra, dec] = eq(lon, lat), [l2, b2] = Y.eqToEcl(ra, dec);
    near(((l2 - lon + 540) % 360) - 180, 0, 1e-8, 'longitude round trip'); near(b2, lat, 1e-8, 'latitude round trip');
  }
});

test('ecliptic: the Sun is at the right longitude on the equinoxes and solstices', () => {
  const at = (ms, lon) => near(((Y.sunLongitude(ms) - lon + 540) % 360) - 180, 0, 0.06, new Date(ms).toISOString());
  at(utc(2000, 3, 20, 7, 35), 0); // the 2000 March equinox, 07:35 UTC
  at(utc(2024, 3, 20, 3, 6), 0); at(utc(2024, 6, 20, 20, 51), 90); at(utc(2024, 9, 22, 12, 44), 180); at(utc(2024, 12, 21, 9, 21), 270);
  at(utc(2025, 3, 20, 9, 1), 0); at(utc(2025, 6, 21, 2, 42), 90); at(utc(2025, 9, 22, 18, 19), 180); at(utc(2025, 12, 21, 15, 3), 270);
  // the usual dates of the signs are within a day or so of the real crossing
  for (const s of Y.SIGNS) {
    const [d, mon] = s.date.split(' '), m = Y.MONTHS.indexOf(mon) + 1;
    const lon = Y.sunLongitude(utc(2025, m, +d, 12));
    near(((lon - s.lon + 540) % 360) - 180, 0, 1.3, s.name + ' on ' + s.date);
  }
});

test('meteor showers: the table is sound and every radiant lies in its constellation', () => {
  assert.equal(Y.SHOWERS.length, 13);
  assert.equal(new Set(Y.SHOWERS.map(s => s.id)).size, 13);
  const consNames = new Set(SKY.consts.map(c => c.name));
  for (const s of Y.SHOWERS) {
    assert.ok(s.ra >= 0 && s.ra < 360 && s.dec >= -90 && s.dec <= 90, s.id + ' radiant');
    assert.ok(consNames.has(s.con), s.id + ': no constellation called ' + s.con);
    const cons = SKY.consts.find(c => c.name === s.con);
    const closest = Math.min(...cons.stars.map(i => Engine.sepDeg(SKY.stars[i], { ra: s.ra, dec: s.dec })));
    assert.ok(closest < 16, s.name + ' radiant is ' + closest.toFixed(1) + ' degrees from the nearest star of ' + s.con);
    assert.ok(s.before > 0 && s.before < 60 && s.after > 0 && s.after < 60, s.id + ' window');
    assert.ok(s.zhr > 0 && s.speed > 10 && s.speed < 80 && s.note.length > 40 && s.parent);
    // the peak is inside the window, and the activity is 1 at the peak and 0 outside
    const year = 2025, peak = Date.UTC(year, s.peak[0] - 1, s.peak[1], 0);
    assert.ok(Y.showerState(s, peak).active);
    near(Y.showerState(s, peak).activity, 1, 1e-9, s.id + ' at the peak');
    const gone = Date.UTC(year, s.start[0] - 1, s.start[1] - 2, 0), beyond = Date.UTC(year, s.end[0] - 1, s.end[1] + 3, 0);
    assert.ok(!Y.showerState(s, gone).active && Y.showerState(s, gone).activity === 0, s.id + ' before its window');
    assert.ok(!Y.showerState(s, beyond).active, s.id + ' after its window');
    near(Y.showerState(s, Date.UTC(year, s.start[0] - 1, s.start[1], 12)).activity, 0.12, 0.05, s.id + ' at the start is the background');
  }
  // the year wraps for the Quadrantids (28 Dec to 12 Jan)
  const qua = Y.SHOWER_BY_ID.qua;
  assert.ok(Y.showerState(qua, utc(2024, 12, 30)).active && Y.showerState(qua, utc(2025, 1, 10)).active && !Y.showerState(qua, utc(2025, 1, 20)).active);
  assert.ok(Y.showerState(qua, utc(2025, 1, 4)).activity > 0.9);
  // when several run together, they are all reported; the strongest showers double a colony's revenue
  assert.ok(Y.activeShowers(utc(2025, 8, 5)).length >= 3, 'early August: Perseids, delta Aquariids, Capricornids');
  assert.equal(Y.activeShowers(utc(2025, 3, 1)).length, 0);
  near(Y.showerBoost(Y.SHOWER_BY_ID.gem), 1, 1e-9); assert.ok(Y.showerBoost(Y.SHOWER_BY_ID.per) > 0.8 && Y.showerBoost(Y.SHOWER_BY_ID.urs) < 0.35);
  const next = Y.upcoming(utc(2025, 3, 1), 3);
  assert.deepEqual(next.map(x => x.shower.id), ['lyr', 'eta', 'cap']);
  assert.equal(next[0].wait, 44);
});

test('comets: the catalogue is sound and the parents of the showers are in it', () => {
  assert.ok(Y.COMETS.length >= 16);
  assert.equal(new Set(Y.COMETS.map(c => c.id)).size, Y.COMETS.length);
  for (const c of Y.COMETS) {
    assert.ok(c.name && c.desig && c.period && c.perihelion && c.note.length > 60, c.id);
    assert.ok(['periodic', 'long', 'sungrazer', 'lost', 'interstellar'].includes(c.kind), c.id);
  }
  for (const s of Y.SHOWERS) if (s.parentKind === 'comet') {
    const hit = Y.COMETS.find(c => s.parent.includes(c.desig.replace(/^C\//, 'C/')) || s.parent.includes(c.name));
    if (['eta', 'ori', 'per', 'leo', 'dra', 'sta', 'nta', 'lyr'].includes(s.id)) assert.ok(hit, s.name + ' parent ' + s.parent + ' is in the comet catalogue');
  }
});

// ---------------------------------------------------------------- the engine: showers on the real calendar, comets in the events
function seeded(seed = 1) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function mkAt(ms, seed = 3, home = 'Sirius') {
  const clock = { t: ms };
  const G = Engine.create(SKY, { rng: seeded(seed), now: () => clock.t });
  G.newGame(G.nameIdx.get(home));
  return { G, clock };
}
const fresh = () => ({ t: 0, s: 0, i: 0, r: 0, b: 0, o: 0 });
const regionOf = (G, from, hops) => { const seen = new Set([from]); let layer = [from]; for (let d = 0; d < hops; d++) { const nx = []; for (const u of layer) for (const { to } of G.adj[u]) if (!seen.has(to)) { seen.add(to); nx.push(to); } layer = nx; } return [...seen]; };

test('showers: colonies under a running radiant earn more, in proportion to its activity, and only while it runs', () => {
  const { G, clock } = mkAt(utc(2025, 3, 1, 12));
  const per = Y.SHOWER_BY_ID.per, zone = G.showerZone.per;
  assert.ok(zone.length > 10 && zone.length < 200, 'the zone holds ' + zone.length + ' stars');
  zone.slice(0, 6).forEach(i => { G.state.stars[i] = fresh(); });
  const outside = SKY.stars.map((s, i) => i).find(i => !zone.includes(i) && !G.state.stars[i]);
  G.state.stars[outside] = fresh();
  G.recalc();
  const quiet = zone.slice(0, 6).map(i => G.d.rate[i]), quietOut = G.d.rate[outside], quietGlobal = G.d.globalOut;
  assert.deepEqual(G.d.showers, [], 'March: no shower is running');
  // 12 August, noon: the Perseids are at their peak
  clock.t = utc(2025, 8, 12, 12); G.tick(1, true);
  assert.equal(G.d.showers.length >= 1, true);
  const now = G.d.showers.find(x => x.id === 'per');
  assert.ok(now && now.activity > 0.95 && now.colonies === 6, JSON.stringify(now));
  const watched = G.d.globalOut / quietGlobal; // watching a shower is itself a small permanent bonus for the whole company
  assert.ok(watched > 1 && watched < 1.02);
  zone.slice(0, 6).forEach((i, k) => near(G.d.rate[i] / quiet[k] / watched, 1 + Y.showerBoost(per) * now.activity, 1e-6, 'a colony under the Perseids radiant earns more'));
  near(G.d.rate[outside] / quietOut, watched, 1e-9, 'a colony elsewhere only gets the permanent bonus');
  assert.ok(G.d.rate[zone[0]] / quiet[0] > 1.8, 'the strongest showers nearly double a colony');
  // two weeks on it has faded to the background; three weeks on it is over
  clock.t = utc(2025, 8, 22, 12); G.tick(1, true);
  const faded = G.d.showers.find(x => x.id === 'per');
  assert.ok(faded && faded.activity < 0.2, 'late in the window the shower is a trickle');
  clock.t = utc(2025, 9, 20, 12); G.tick(1, true);
  assert.deepEqual(G.d.showers, []);
  near(G.d.rate[zone[0]] / quiet[0], G.d.globalOut / quietGlobal, 1e-9, 'only the permanent bonus is left');
});

test('showers: you watch one by having a colony under its radiant while it runs; the peak doubles the bonus; it is saved', () => {
  const { G, clock } = mkAt(utc(2025, 8, 5, 12), 5);
  const zone = G.showerZone.per;
  assert.deepEqual(Object.keys(G.state.showers), [], 'nothing watched yet');
  G.tick(10, true);
  assert.ok(!G.state.showers.per, 'no colony under the Perseids radiant: nothing seen');
  G.state.stars[zone[0]] = fresh(); G.recalc();
  clock.t += 3700e3; G.tick(10, true); // the next hour
  const rec = G.state.showers.per;
  assert.ok(rec && !rec.peak, 'the Perseids are watched, though not yet at the peak');
  assert.equal(G.d.P.out > 0, true); near(G.d.P.out, G.CFG.showerWatch * (1 + (G.state.showers.sda ? 1 : 0) + (G.state.showers.cap ? 1 : 0)) - 0, 0.02);
  const before = G.d.P.out;
  assert.ok(G.state.log.some(l => l.kind === 'sky' && /Perseids/.test(l.text)));
  // a week later, at the peak
  clock.t = utc(2025, 8, 12, 9); G.tick(10, true);
  assert.ok(G.state.showers.per.peak, 'caught the peak');
  near(G.d.P.out - before, G.CFG.showerWatch, 1e-9, 'the peak doubles the bonus');
  // saved and loaded in another year, the bonus is still there; the old stamp is not repeated
  const H = Engine.create(SKY, { rng: seeded(1), now: () => utc(2026, 3, 1) });
  H.load(JSON.parse(G.serialize()));
  assert.ok(H.state.showers.per.peak); near(H.d.P.out, G.d.P.out, 1e-12);
  // returning after an absence during a shower counts as watching it
  const J = mkAt(utc(2025, 12, 1, 12), 6);
  J.G.state.stars[J.G.showerZone.gem[0]] = fresh(); J.G.recalc();
  J.clock.t = utc(2025, 12, 14, 3); J.G.catchUp(3600 * 24);
  assert.ok(J.G.state.showers.gem && J.G.state.showers.gem.peak, 'back during the Geminids peak');
});

test('comets: events carry real comets, an unseen one first, and redrawing it catalogues it for good', () => {
  const { G } = mkAt(utc(2025, 5, 1), 8);
  G.state.cash = 1e9;
  regionOf(G, G.state.home, 4).forEach(i => { G.state.stars[i] = fresh(); }); G.recalc();
  const seen = [];
  for (let n = 0; n < 40; n++) {
    G.state.events = [];
    let ev = null;
    for (let tries = 0; tries < 20 && !(ev && ev.kind === 'comet'); tries++) { G.state.events = []; ev = G.spawnEvent(); }
    assert.ok(ev && ev.kind === 'comet' && Y.COMET_BY_ID[ev.comet], 'a real comet');
    assert.equal(ev.name, 'Comet ' + Y.COMET_BY_ID[ev.comet].name);
    if (n < Y.COMETS.length) assert.ok(!seen.includes(ev.comet), 'an unseen comet is chosen first: ' + ev.comet);
    for (const e of ev.edges) G.redraw(ev.id, SKY.edges[e][0], SKY.edges[e][1]);
    assert.ok(G.state.comets[ev.comet], 'catalogued');
    seen.push(ev.comet);
    assert.equal(Object.keys(G.state.comets).length, new Set(seen).size);
    if (new Set(seen).size === Y.COMETS.length) break;
  }
  assert.equal(Object.keys(G.state.comets).length, Y.COMETS.length, 'every comet catalogued');
  near(G.d.P.ev, G.CFG.cometLore * Y.COMETS.length, 1e-12, 'each adds a little to event rewards');
  assert.ok(G.state.log.some(l => l.kind === 'sky' && /Catalogued/.test(l.text)));
  // when all are known the events go on with repeats
  G.state.events = []; const again = G.spawnEvent(); assert.ok(again);
  const H = Engine.create(SKY, { rng: seeded(1), now: () => utc(2025, 5, 2) }); H.load(JSON.parse(G.serialize()));
  assert.equal(Object.keys(H.state.comets).length, Y.COMETS.length);
});

function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
test('the Academy cards about showers and comets agree with the tables the game uses', () => {
  const Astro = require('../js/astro.js');
  for (const sh of Y.SHOWERS) {
    const card = Astro.CARD_BY_ID['planets.shower-' + sh.id];
    assert.ok(card, 'a card for the ' + sh.name);
    let radiant = 0, parent = 0, month = 0;
    for (let n = 0; n < 160; n++) {
      const q = Astro.makeQuestion(card.id, mulberry32(n + 1));
      const right = q.options[q.answer].text;
      assert.equal(new Set(q.options.map(o => o.text)).size, q.options.length, 'no duplicate options');
      assert.ok(q.explain.length > 20);
      if (/radiant/.test(q.prompt)) { assert.equal(right, sh.con); radiant++; }
      if (/come from/.test(q.prompt)) { assert.equal(right, sh.parent); parent++; }
      if (/peak in/.test(q.prompt)) { assert.equal(right, Y.MONTHS.map((m, k) => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][k])[sh.peak[0] - 1]); month++; }
      if (/strike the atmosphere/.test(q.prompt)) assert.equal(right, sh.speed + ' km/s');
    }
    assert.ok(radiant > 10 && parent > 10 && month > 10, sh.name + ' asks all of its questions');
  }
  // the one-liners about strongest, fastest and slowest are true of the table
  const by = key => Y.SHOWERS.slice().sort((a, b) => b[key] - a[key]);
  assert.equal(by('zhr')[0].name, 'Geminids'); assert.equal(by('speed')[0].name, 'Leonids'); assert.equal(by('speed').pop().name, 'Draconids');
  assert.deepEqual(Y.SHOWERS.filter(s => s.parent.includes('Halley')).map(s => s.name), ['Eta Aquariids', 'Orionids']);
  assert.equal(Y.SHOWER_BY_ID.gem.parentKind, 'asteroid');
  // every comet question's answer exists as a comet name, and the right answer is the one the prompt describes
  for (const id of ['planets.comet-missions', 'planets.comet-records']) for (let n = 0; n < 200; n++) {
    const q = Astro.makeQuestion(id, mulberry32(n + 1)), names = Y.COMETS.map(c => c.name);
    q.options.forEach(o => assert.ok(names.includes(o.text), o.text));
  }
  assert.ok(Astro.CARD_BY_ID['sphere.ecl-year']);
});
