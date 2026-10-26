// Olympiad Academy: the card bank, the numeric generators, the diagrams and the permanent levels they unlock.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.window = {};
const SKY = require('../js/data.js');
const Engine = require('../js/engine.js');
const Quiz = require('../js/quiz.js');
const Astro = require('../js/astro.js');
const Figs = require('../js/figs.js');
require('../js/figs-orbits.js'); require('../js/figs-stars.js');

function seeded(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function mk(seed = 1) {
  const clock = { t: 1e12 };
  const G = Engine.create(SKY, { rng: seeded(seed), now: () => clock.t });
  G.newGame(G.nameIdx.get('Sirius'));
  return { G, clock, QZ: Quiz.create(G, { rng: seeded(seed + 100), now: () => clock.t }) };
}
const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' };
// the number at the start of an option or in a prompt: "12 300 pc", "9.2×10⁻²⁷ kg/m³", "−5"
function numOf(text) {
  if (/^\d\d:\d\d$/.test(text)) return NaN; // a clock time
  const t = text.replace(/ /g, '').replace(/−/g, '-').replace(/^(z = |f\/)/, '');
  const m = t.match(/^(-?\d+(?:\.\d+)?)(?:×10([⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+))?/);
  if (!m) return NaN;
  return parseFloat(m[1]) * (m[2] ? Math.pow(10, parseInt(m[2].split('').map(c => SUP[c]).join(''), 10)) : 1);
}
const close = (a, b, tol = 0.012) => Math.abs(a - b) <= tol * Math.abs(b) + 1e-12;
const build = (id, seed) => Astro.makeQuestion(id, seeded(seed));
const right = q => q.options[q.answer].text;

test('academy: the card bank is complete and consistent', () => {
  assert.equal(Astro.TOPICS.length, 10);
  assert.ok(Astro.CARDS.length >= 250, 'plenty to learn: ' + Astro.CARDS.length);
  assert.equal(new Set(Astro.CARDS.map(c => c.id)).size, Astro.CARDS.length, 'unique card ids');
  const kinds = new Set(Astro.CARDS.map(c => c.kind));
  assert.deepEqual([...kinds].sort(), ['calc', 'fact', 'fig']);
  for (const t of Astro.TOPICS) {
    const ids = Astro.IDS_BY_TOPIC[t.id];
    assert.ok(ids.length >= 15, t.id + ' has ' + ids.length + ' cards');
    assert.ok(t.sheet.length >= 6, t.id + ' has a formula sheet');
    assert.equal(t.perk.v.length, 3);
    assert.ok(t.perk.v[0] > 0 && t.perk.v[0] < t.perk.v[1] && t.perk.v[1] < t.perk.v[2], t.id + ' perk grows with each level');
    assert.ok(Engine.create(SKY).PERK_LABEL[t.perk.kind], t.id + ' perk kind is known: ' + t.perk.kind);
    assert.ok(ids.some(id => Astro.CARD_BY_ID[id].kind === 'calc'), t.id + ' has numeric problems');
  }
  for (const c of Astro.CARDS) { assert.ok(c.title && c.title.length > 3, c.id + ' title'); assert.ok([1, 2, 3].includes(c.tier), c.id + ' tier'); assert.ok(Astro.TOPIC_BY_ID[c.topic], c.id + ' topic'); }
  assert.equal(Astro.BOX_MAX, Quiz.LEARN_BOX, 'mastery uses the same number of reviews as the rest of Sky School');
});

test('academy: every card builds valid, unambiguous questions with fresh numbers', () => {
  for (const c of Astro.CARDS) {
    const prompts = new Set();
    for (let seed = 1; seed <= 60; seed++) {
      const q = build(c.id, seed * 7919);
      assert.ok(q, c.id + ' builds');
      assert.ok(q.prompt && q.prompt.length > 8 && !/undefined|NaN|Infinity|\[object/.test(q.prompt + q.explain), c.id + ' prompt: ' + q.prompt);
      assert.ok(q.options.length >= 2 && q.options.length <= 4, c.id + ' options');
      const texts = q.options.map(o => o.text);
      assert.equal(new Set(texts).size, texts.length, c.id + ' duplicates: ' + texts.join(' | ') + ' / ' + q.prompt);
      texts.forEach(t => assert.ok(t && !/undefined|NaN|Infinity|\[object/.test(t), c.id + ' option text ' + t));
      assert.ok(q.answer >= 0 && q.answer < q.options.length);
      assert.ok(q.explain && q.explain.length > 15, c.id + ' explanation');
      assert.equal(q.subject.cat, 'astro'); assert.equal(q.subject.id, c.id); assert.equal(q.topic, c.topic);
      if (q.visual) { assert.equal(q.visual.type, 'fig'); assert.ok(Figs.has(q.visual.id), 'known figure ' + q.visual.id); }
      q.options.forEach(o => { if (o.visual) assert.ok(Figs.has(o.visual.id), 'known option figure ' + o.visual.id); });
      prompts.add(q.prompt);
    }
    if (c.kind === 'calc') assert.ok(prompts.size > 1, c.id + ' varies its numbers');
  }
});

test('academy: numeric answers are numbers and the wrong ones are clearly different', () => {
  let numeric = 0;
  for (const c of Astro.CARDS.filter(c => c.kind === 'calc')) {
    for (let seed = 1; seed <= 40; seed++) {
      const q = build(c.id, seed * 104729), v = numOf(right(q));
      if (isNaN(v) || /receding|approaching/.test(right(q))) continue; // times, signed hours and "km/s, receding" style answers (their wrong options flip the direction on purpose)
      numeric++;
      q.options.forEach((o, k) => { if (k === q.answer) return; const w = numOf(o.text); if (!isNaN(w)) assert.ok(Math.abs(w - v) > 0.05 * Math.abs(v), c.id + ': ' + o.text + ' too close to ' + right(q)); });
    }
  }
  assert.ok(numeric > 1500, 'plenty of numeric questions: ' + numeric);
});

test('academy: the physics helpers reproduce well-known values', () => {
  const P = Astro.P;
  assert.ok(close(P.keplerT(1), 1) && close(P.keplerT(5.2), 11.86, 0.01) && close(P.keplerT(39.5), 248, 0.01), 'Kepler III');
  assert.ok(close(P.vcirc(P.Msun, P.AU), 29.78e3, 0.005), 'Earth’s orbital speed');
  assert.ok(close(P.vesc(P.Mearth, 6.371e6), 11.19e3, 0.005), 'escape speed from Earth');
  assert.ok(close(P.period(42164e3, P.Mearth), 86164, 0.003), 'geostationary orbit has a sidereal-day period');
  assert.ok(close(P.period(P.Rearth + 420e3, P.Mearth), 5570, 0.01), 'ISS period');
  assert.ok(close(P.visviva(P.Msun, 0.5874 * P.AU, 17.8 * P.AU), 54.5e3, 0.01), 'Halley at perihelion');
  assert.ok(close(P.hohmann(1, 1.524) * 365.25, 259, 0.01), 'Earth–Mars transfer takes about 259 days');
  assert.ok(close(P.synodic(1.8808, 1), 2.135, 0.005) && close(P.synodic(0.6152, 1), 1.599, 0.005), 'synodic periods of Mars and Venus');
  assert.ok(close(P.wienPeak(5772) * 1e9, 502, 0.005) && close(P.wienPeak(2.725) * 1e3, 1.063, 0.005), 'Wien: Sun and the CMB');
  assert.ok(close(P.lumSB(P.Rsun, P.Tsun), P.Lsun, 0.01), 'Stefan–Boltzmann gives the Sun’s luminosity');
  assert.ok(close(P.schwarz(P.Msun), 2953, 0.005), 'Schwarzschild radius of the Sun');
  assert.ok(close(P.rayleigh(550e-9, 0.15) * 206265, 0.9226, 0.005), 'Rayleigh limit of a 15 cm telescope');
  assert.ok(close(P.distMod(100), 5) && close(P.distMod(10), 0), 'distance modulus');
  assert.ok(close(P.rhoCrit(70), 9.2e-27, 0.01), 'critical density');
  assert.ok(close(P.eqTemp(1, 0.306), 254, 0.01) && close(P.eqTemp(0.723, 0.77), 227, 0.01), 'equilibrium temperatures of Earth and Venus');
  assert.ok(close(P.rvK(1, 11.86, 1), 12.5, 0.01) && close(P.rvK(0.47, 4.23 / 365.25, 1.1), 55.5, 0.02) && close(P.rvK(0.00315, 1, 1), 0.0896, 0.01), 'radial-velocity amplitudes');
});

test('academy: generators agree with an independent calculation', () => {
  const checked = new Set();
  const expect = {
    'orbits.kepler3-calc': q => { const p = q.prompt.replace(/ /g, ''); let m = p.match(/semi-major axis of .+ is ([\d.]+) AU\. Its orbital period/); if (m) return [Math.pow(+m[1], 1.5), right(q)]; m = p.match(/orbital period of .+ is ([\d.]+) years\. Its semi-major axis/); return [Math.pow(+m[1], 2 / 3), right(q)]; },
    'orbits.hohmann-calc': q => { const m = q.prompt.match(/\(([\d.]+) AU\)\) take|\(([\d.]+) AU\) take/); const r2 = +(m[1] || m[2]); const t = 0.5 * Math.pow((1 + r2) / 2, 1.5); return [/days/.test(right(q)) ? t * 365.25 : t, right(q)]; },
    'sphere.synodic': q => { const T = +q.prompt.match(/period of \w+ is ([\d.]+) days/)[1]; return [1 / Math.abs(1 / T - 1 / 365.256), right(q)]; },
    'light.wien-calc': q => { const T = +q.prompt.match(/is ([\d.]+) K/)[1]; const o = right(q); const nm = 2.897772e6 / T; return [/µm/.test(o) ? nm / 1e3 : /mm/.test(o) ? nm / 1e6 : nm, o]; },
    'cosmos.hubble-v': q => [70 * +q.prompt.match(/galaxy ([\d.]+) Mpc/)[1], right(q)],
    'cosmos.hubble-d': q => [+q.prompt.match(/recedes at ([\d.]+) km/)[1] / 70, right(q)],
    'mags.parallax-calc': q => [1 / +q.prompt.match(/parallax of ([\d.]+)″/)[1], right(q)],
    'mags.pogson-delta': q => [2.5 * Math.log10(+q.prompt.match(/delivers (\d+) times/)[1]), right(q)],
    'stars.mlr-calc': q => [Math.pow(+q.prompt.match(/of a ([\d.]+) M☉ star/)[1], 3.5), right(q)],
    'optics.grasp': q => { const m = q.prompt.match(/with a (\d+) mm aperture .+ with a (\d+) mm pupil/); return [Math.pow(+m[1] / +m[2], 2), right(q)]; },
    'optics.exitpupil': q => { const m = q.prompt.match(/A (\d+) mm telescope .+ magnification of (\d+)×/); return [+m[1] / +m[2], right(q)]; },
    'cosmos.cmb-temp': q => [2.725 * (1 + +q.prompt.match(/z = ([\d.]+)/)[1]), right(q)],
    'galaxies.tf-calc': q => [Math.pow(+q.prompt.match(/rotating ([\d.]+) times/)[1], 4), right(q)],
    'orbits.rocket': q => { const m = q.prompt.match(/speed of ([\d.]+) km\/s has a launch mass (\d+) times/); return [+m[1] * Math.log(+m[2]), right(q)]; },
  };
  for (const [id, fn] of Object.entries(expect)) {
    for (let seed = 1; seed <= 25; seed++) {
      const q = build(id, seed * 31);
      const [want, got] = fn(q);
      assert.ok(close(numOf(got), want, 0.012), id + ': expected ' + want + ' got ' + got + ' for "' + q.prompt + '"');
      checked.add(id);
    }
  }
  assert.equal(checked.size, Object.keys(expect).length);
});

test('academy: every diagram the cards use can be drawn, with and without labels', () => {
  const calls = { n: 0 };
  const ctx = new Proxy({}, {
    get(t, k) { if (k in t) return t[k]; if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => ({ addColorStop() {} }); if (k === 'measureText') return s => ({ width: String(s).length * 6 }); return () => { calls.n++; }; },
    set(t, k, v) { t[k] = v; return true; },
  });
  const cv = { clientWidth: 400, clientHeight: 250, width: 0, height: 0, getContext: () => ctx };
  const specs = new Set();
  for (const c of Astro.CARDS) for (let seed = 1; seed <= 40; seed++) { const q = build(c.id, seed * 6151); if (q.visual) specs.add(q.visual.id); q.options.forEach(o => o.visual && specs.add(o.visual.id)); }
  for (const t of Astro.TOPICS) t.gallery.forEach(g => specs.add(g.fig));
  assert.ok(specs.size >= 60, 'many different pictures: ' + specs.size);
  for (const s of specs) for (const labels of [false, true]) { assert.ok(Figs.has(s), s); Figs.draw(cv, s, { labels }); }
  assert.ok(calls.n > 5000, 'something was drawn');
  for (const t of Astro.TOPICS) t.gallery.forEach(g => assert.ok(g.name && g.note, 'gallery entry ' + g.fig));
});

test('academy: rounds can be limited to a topic and mixed rounds include the Academy', () => {
  const { QZ } = mk(5);
  for (const topic of Astro.TOPICS.map(t => t.id)) {
    for (let n = 0; n < 6; n++) {
      const r = QZ.startRound('astro', 5, { topic });
      assert.equal(r.qs.length, 5); r.qs.forEach(q => assert.equal(q.topic, topic));
      assert.equal(new Set(r.qs.map(q => q.subject.id)).size, 5, 'no card twice in a round');
    }
  }
  let academy = 0, other = 0;
  for (let n = 0; n < 60; n++) QZ.startRound('mixed').qs.forEach(q => (q.cat === 'astro' ? academy++ : other++));
  assert.ok(academy > 30 && other > 100, 'a mixed round has all kinds: ' + academy + ' / ' + other);
  assert.equal(QZ.items('astro').length, Astro.CARDS.length);
  assert.equal(QZ.progress('astro').total, Astro.CARDS.length);
  // basics come before the hard ones: a fresh player is mostly asked tier-1 and tier-2 cards
  let hard = 0, easy = 0;
  for (let n = 0; n < 200; n++) QZ.startRound('astro', 5, { topic: 'orbits' }).qs.forEach(q => (Astro.CARD_BY_ID[q.subject.id].tier === 3 ? hard++ : easy++));
  assert.ok(easy > hard, 'basics first: ' + easy + ' vs ' + hard);
});

test('academy: answering feeds the spaced-repetition records and pays charts', () => {
  const { G, clock, QZ } = mk(6);
  const round = QZ.startRound('astro', 5, { topic: 'light' });
  const charts0 = G.state.charts;
  const res = QZ.answer(round, round.qs[0].answer);
  assert.ok(res.correct && res.counted && res.box === 1 && Array.isArray(res.academy));
  assert.ok(G.state.charts > charts0);
  const id = round.qs[0].subject.id;
  assert.equal(G.state.quiz.astro[id].box, 1);
  assert.equal(QZ.items('astro').find(x => x.id === id).status, 'learning');
  clock.t += 11 * 60e3;
  assert.equal(QZ.items('astro').find(x => x.id === id).status, 'due');
});

test('academy: mastering a topic unlocks permanent levels, perks, and they never decay', () => {
  const { G, clock } = mk(7);
  const base = { ...G.d.P }, slots0 = G.d.slots, store = G.state.quiz.astro;
  const ids = Astro.IDS_BY_TOPIC.optics, T = Astro.TOPIC_BY_ID.optics;
  assert.equal(G.academy().find(t => t.id === 'optics').level, 0);
  // about 30% mastery: level 1
  ids.forEach((id, k) => { store[id] = { ok: 3, bad: 0, last: 0, box: k % 3 === 0 ? 10 : 0, due: 0, learned: k % 3 === 0 ? 1 : 0 }; });
  const f1 = Astro.stats('optics', store, clock.t).f;
  assert.ok(f1 > 0.2 && f1 < 0.5, 'mastery fraction ' + f1);
  const gained = G.academySync();
  assert.equal(gained.length, 1);
  assert.equal(gained[0].level, 1); assert.equal(gained[0].id, 'optics'); assert.match(gained[0].perk, /research/);
  assert.ok(Math.abs(G.d.P.res - base.res - T.perk.v[0]) < 1e-9, 'level 1 research bonus');
  assert.deepEqual(G.academySync(), [], 'nothing more to gain yet');
  assert.ok(G.state.log.some(l => /Olympiad Academy: Telescopes & optics reaches level 1/.test(l.text)));
  // a later slip does not take it away
  ids.forEach(id => { store[id].box = 0; store[id].learned = 0; });
  G.academySync(); G.recalc();
  assert.equal(G.academy().find(t => t.id === 'optics').level, 1);
  assert.ok(Math.abs(G.d.P.res - base.res - T.perk.v[0]) < 1e-9, 'bonus stays');
  // everything learned: level 3
  ids.forEach(id => { store[id] = { ok: 10, bad: 0, last: 0, box: 10, due: 0, learned: 1 }; });
  assert.equal(G.academySync()[0].level, 3);
  assert.ok(Math.abs(G.d.P.res - base.res - T.perk.v[2]) < 1e-9, 'level 3 research bonus');
  // all ten topics at the top: every channel the Academy feeds is raised, including one more fleet slots and the star bonuses
  for (const t of Astro.TOPICS) Astro.IDS_BY_TOPIC[t.id].forEach(id => { store[id] = { ok: 10, bad: 0, last: 0, box: 10, due: 0, learned: 1 }; });
  G.academySync();
  assert.equal(G.academyLevels(), 30);
  const P = G.d.P;
  assert.ok(Math.abs(P.out - base.out - 0.12) < 1e-9 && Math.abs(P.speed - base.speed - 0.08) < 1e-9 && Math.abs(P.star - base.star - 0.5) < 1e-9 && Math.abs(P.ev - base.ev - 0.3) < 1e-9);
  assert.ok(Math.abs(P.route - base.route - 0.12) < 1e-9 && Math.abs(P.cap - base.cap - 0.15) < 1e-9 && Math.abs(P.slots - base.slots - 2) < 1e-9);
  assert.ok(G.d.slots >= slots0 + 2, 'two more fleet slots');
  assert.equal(G.d.starK, 1.5, 'star bonuses are half as strong again');
  // it is saved and survives a reload
  const H = Engine.create(SKY); H.load(JSON.parse(G.serialize()));
  assert.equal(H.academyLevels(), 30);
  assert.ok(Math.abs(H.d.P.out - P.out) < 1e-12);
});

test('academy: saves without an Academy load cleanly', () => {
  const { G } = mk(8);
  const raw = JSON.parse(G.serialize()); delete raw.academy; delete raw.quiz.astro;
  const H = Engine.create(SKY); H.load(raw);
  assert.equal(H.academyLevels(), 0);
  assert.equal(H.academy().length, 10);
  const QZ = Quiz.create(H, { rng: seeded(3) });
  assert.equal(QZ.startRound('astro').qs.length, 5);
});
