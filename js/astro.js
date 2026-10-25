/* Olympiad Academy: the astronomy-olympiad syllabus as spaced-repetition cards (no DOM).
   A card is one thing to know: a fact asked in several ways, a diagram to recognise, or a numeric problem whose numbers are
   fresh every time. Cards belong to ten topics; learning a topic's cards for real unlocks permanent company bonuses.
   The content lives in astro-a.js / astro-b.js / astro-c.js; this file is the framework (topics, perks, question builder). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./astro-a.js'), require('./astro-b.js'), require('./astro-c.js'));
  else root.Astro = factory(root.AstroA, root.AstroB, root.AstroC);
})(typeof self !== 'undefined' ? self : this, function (partA, partB, partC) {
  'use strict';

  // ---- topics and the permanent bonus each one unlocks (cumulative values for level 1, 2, 3)
  const TOPICS = [
    { id: 'sphere', name: 'Sky & time', blurb: 'The celestial sphere, coordinates, the Sun, the Moon, eclipses, planetary configurations and the calendar.', perk: { kind: 'ev', v: [0.10, 0.20, 0.30] } },
    { id: 'orbits', name: 'Orbital mechanics', blurb: 'Kepler, Newton, vis-viva, transfers, Lagrange points, tides and binaries.', perk: { kind: 'speed', v: [0.025, 0.05, 0.08] } },
    { id: 'optics', name: 'Telescopes & optics', blurb: 'Refractors, reflectors and radio dishes, mounts, aberrations, magnification, resolution and detectors.', perk: { kind: 'res', v: [0.04, 0.08, 0.12] } },
    { id: 'light', name: 'Light & radiation', blurb: 'The electromagnetic spectrum, blackbodies, spectra, the Doppler effect, scattering and energy.', perk: { kind: 'route', v: [0.04, 0.08, 0.12] } },
    { id: 'stars', name: 'Stars', blurb: 'Spectral classes, the H–R diagram, structure, energy sources, binaries and variable stars.', perk: { kind: 'star', v: [0.15, 0.30, 0.50] } },
    { id: 'mags', name: 'Magnitudes & distances', blurb: 'Apparent and absolute magnitudes, parallax, standard candles and the distance ladder.', perk: { kind: 'cost', v: [0.015, 0.03, 0.05] } },
    { id: 'evolution', name: 'Stellar evolution', blurb: 'From molecular clouds to white dwarfs, neutron stars and black holes.', perk: { kind: 'cap', v: [0.05, 0.10, 0.15] } },
    { id: 'planets', name: 'Solar system & exoplanets', blurb: 'The planets, moons, small bodies, comets, formation and the hunt for other worlds.', perk: { kind: 'slots', v: [0.5, 1, 2] } },
    { id: 'galaxies', name: 'Galaxies', blurb: 'The Milky Way, galaxy types, active nuclei, dark matter and the interstellar medium.', perk: { kind: 'out', v: [0.015, 0.03, 0.05] } },
    { id: 'cosmos', name: 'Cosmology', blurb: 'The expanding universe, the Hubble law, the microwave background and the contents of the cosmos.', perk: { kind: 'out', v: [0.02, 0.04, 0.07] } },
  ];
  const TOPIC_BY_ID = {};
  TOPICS.forEach(t => { t.sheet = []; t.gallery = []; t.cards = []; TOPIC_BY_ID[t.id] = t; });

  // Mastery of a topic is the mean progress of its cards (a learned card counts 1, otherwise box / BOX_MAX). A topic's level never goes down.
  const BOX_MAX = 10, LEVEL_AT = [0.2, 0.5, 0.85];
  const LEVEL_NAMES = ['Newcomer', 'Student', 'Scholar', 'Olympian'];
  const levelFor = f => LEVEL_AT.reduce((l, t, k) => (f >= t ? k + 1 : l), 0);

  // ---- numbers: formatting and multiple-choice distractors
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = n => String(n).split('').map(c => SUP[c] || c).join('');
  function fmt(v, dig) {
    dig = dig || 3;
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e6 || a < 1e-3) {
      let e = Math.floor(Math.log10(a)), m = v / Math.pow(10, e);
      let ms = Number(m.toPrecision(dig));
      if (Math.abs(ms) >= 10) { ms /= 10; e += 1; }
      return String(ms).replace('-', '−') + '×10' + sup(e);
    }
    const s = String(Number(v.toPrecision(dig)));
    const neg = s[0] === '-' ? '−' : '';
    const body = s.replace('-', '');
    if (a >= 1e4) { const [i, f] = body.split('.'); return neg + i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (f ? '.' + f : ''); }
    return neg + body;
  }
  // The right answer and up to three plausible wrong ones as strings. `wrongs` are the usual mistakes (best first); missing ones are made up from slips of scale.
  // Wrong answers within 8% of the right one (or 3% of each other) are dropped, so the question tests understanding rather than arithmetic precision; `lim` bounds the values allowed.
  function nums(v, unit, dig, wrongs, wrap, lim) {
    const tail = unit ? (/^[°″′%]/.test(unit) ? unit : ' ' + unit) : '';
    const f = x => (wrap ? wrap(fmt(x, dig)) : fmt(x, dig) + tail);
    const right = f(v), seen = new Set([right]), out = [], vals = [v];
    const ok = x => isFinite(x) && (!lim || (x >= lim[0] && x <= lim[1]));
    const far = x => vals.every((y, k) => Math.abs(x - y) > (k === 0 ? 0.08 : 0.03) * (y === 0 ? 1 : Math.abs(y)));
    const add = x => { if (out.length >= 3 || !ok(x) || !far(x)) return; const s = f(x); if (!seen.has(s)) { seen.add(s); out.push(s); vals.push(x); } };
    (wrongs || []).forEach(add);
    [2, 0.5, 10, 0.1, 4, 0.25, 1.5, 0.7, 3, 1 / 3, 100, 0.01].forEach(k => add(v * k));
    return { right, wrong: out };
  }

  // ---- random helpers handed to every card
  function helpers(rng) {
    const r = {
      rnd: rng,
      int: (a, b) => a + Math.floor(rng() * (b - a + 1)),
      uni: (a, b) => a + rng() * (b - a),
      pick: arr => arr[Math.floor(rng() * arr.length)],
      shuffle(arr) { arr = arr.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; },
      sample(arr, k) { return r.shuffle(arr).slice(0, k); },
    };
    return r;
  }

  // ---- the card registry
  const CARDS = [], CARD_BY_ID = {}, IDS_BY_TOPIC = {};
  TOPICS.forEach(t => { IDS_BY_TOPIC[t.id] = []; });
  function addCard(card) {
    if (CARD_BY_ID[card.id]) throw new Error('duplicate card ' + card.id);
    CARDS.push(card); CARD_BY_ID[card.id] = card; IDS_BY_TOPIC[card.topic].push(card.id); TOPIC_BY_ID[card.topic].cards.push(card.id);
    return card;
  }

  // The API the content files use: A.topic('sphere') gives a builder for that topic.
  const api = {
    nums, fmt, sup, TOPIC_BY_ID,
    topic(topicId) {
      if (!TOPIC_BY_ID[topicId]) throw new Error('unknown topic ' + topicId);
      const T = {
        // fact: variants are [prompt, right answer, [wrong answers], {fig, why, quote}?]; one is picked at random each time
        fact(short, title, tier, variants, explain) {
          return addCard({ id: topicId + '.' + short, topic: topicId, title, tier, kind: 'fact', make(r) {
            const [prompt, right, wrong, o] = r.pick(variants);
            return { prompt, right, wrong, fig: o && o.fig, quote: o && o.quote, explain: (o && o.why) || explain };
          } });
        },
        // calc: gen(r) returns { prompt, right, wrong, explain } (use A.nums), with fresh numbers every time
        calc(short, title, tier, gen) {
          return addCard({ id: topicId + '.' + short, topic: topicId, title, tier, kind: 'calc', make: gen });
        },
        // figs: a set of things to recognise by their picture. One card per item, asked picture → name or name → picture.
        figs(spec) {
          const items = spec.items;
          items.forEach(it => {
            addCard({ id: topicId + '.' + spec.prefix + '-' + it.id, topic: topicId, title: it.title || it.name, tier: spec.tier || 1, kind: 'fig', make(r) {
              const kin = items.filter(o => o !== it && (!it.kin || !o.kin || o.kin === it.kin));
              const others = r.sample(kin.length >= 3 ? kin : items.filter(o => o !== it), 3);
              if (r.rnd() < 0.5) return { prompt: it.ask || spec.ask, fig: it.fig, right: it.name, wrong: others.map(o => o.name), explain: it.note };
              return { prompt: (spec.askName || (n => 'Which picture shows ' + n + '?'))(it.name), right: { t: it.name, fig: it.fig }, wrong: others.map(o => ({ t: o.name, fig: o.fig })), explain: it.note };
            } });
          });
          if (spec.gallery !== false) items.forEach(it => TOPIC_BY_ID[topicId].gallery.push({ fig: it.fig, name: it.name, note: it.note, group: spec.group || '' }));
        },
        // sheet: the formulas of the topic, for the study page: [name, formula, note?]
        sheet(rows) { TOPIC_BY_ID[topicId].sheet = TOPIC_BY_ID[topicId].sheet.concat(rows); },
        // gallery: extra labelled diagrams for the study page: [figSpec, name, note, group?]
        gallery(rows) { rows.forEach(([fig, name, note, group]) => TOPIC_BY_ID[topicId].gallery.push({ fig, name, note, group: group || '' })); },
      };
      return T;
    },
  };
  // physical constants and the formulas the numeric cards use (SI unless a name says otherwise)
  const P = api.P = {
    G: 6.6743e-11, c: 2.99792458e8, Msun: 1.98847e30, Rsun: 6.957e8, Lsun: 3.828e26, Tsun: 5772, AU: 1.495978707e11, pc: 3.0856776e16, ly: 9.4607305e15,
    yr: 3.15576e7, Mearth: 5.9722e24, Rearth: 6.3781e6, sigma: 5.670374e-8, h: 6.62607e-34, kB: 1.380649e-23, wien: 2.897772e-3, eV: 1.602177e-19, RH: 1.09678e7,
    Mjup: 1.8982e27, Rjup: 7.1492e7, H0: 70, Mpc: 3.0856776e22, kpc: 3.0856776e19,
    keplerT: aAU => Math.pow(aAU, 1.5),                       // years, for orbits around the Sun
    keplerA: Tyr => Math.pow(Tyr, 2 / 3),
    period: (a, M) => 2 * Math.PI * Math.sqrt(a * a * a / (P.G * M)),
    vcirc: (M, r) => Math.sqrt(P.G * M / r),
    vesc: (M, r) => Math.sqrt(2 * P.G * M / r),
    visviva: (M, r, a) => Math.sqrt(P.G * M * (2 / r - 1 / a)),
    hohmann: (r1, r2) => 0.5 * Math.pow((r1 + r2) / 2, 1.5),  // years, radii in AU
    synodic: (T1, T2) => 1 / Math.abs(1 / T1 - 1 / T2),
    wienPeak: T => P.wien / T,
    lumSB: (R, T) => 4 * Math.PI * R * R * P.sigma * Math.pow(T, 4),
    schwarz: M => 2 * P.G * M / (P.c * P.c),
    rayleigh: (lam, D) => 1.22 * lam / D,
    distMod: d => 5 * Math.log10(d / 10),
    rhoCrit: H0kmsMpc => { const H = H0kmsMpc * 1e3 / P.Mpc; return 3 * H * H / (8 * Math.PI * P.G); },
    eqTemp: (dAU, albedo, L) => 278.3 * Math.pow(1 - albedo, 0.25) * Math.pow(L || 1, 0.25) / Math.sqrt(dAU),
    rvK: (mJup, Pyr, Mstar) => 28.43 * mJup * Math.pow(Pyr, -1 / 3) * Math.pow(Mstar, -2 / 3), // m/s, edge-on
  };

  partA(api); partB(api); partC(api);

  // ---- building a question from a card
  const norm = o => (typeof o === 'string' ? { text: o } : o.fig ? { text: o.t, visual: { type: 'fig', id: o.fig } } : { text: o.t });
  function makeQuestion(cardId, rng) {
    const card = CARD_BY_ID[cardId];
    if (!card) return null;
    const r = helpers(rng || Math.random);
    const raw = card.make(r);
    if (!raw) return null;
    const right = norm(raw.right);
    const seen = new Set([right.text]);
    let wrong = (raw.wrong || []).map(norm).filter(o => o.text && !seen.has(o.text) && seen.add(o.text));
    if (wrong.length > 3) wrong = r.sample(wrong, 3);
    if (!wrong.length) return null;
    const options = r.shuffle([right].concat(wrong));
    return {
      kind: 'astro-' + card.kind, cat: 'astro', topic: card.topic, subject: { cat: 'astro', id: card.id },
      prompt: raw.prompt, quote: raw.quote, visual: raw.fig ? { type: 'fig', id: raw.fig } : null,
      options, answer: options.indexOf(right), explain: raw.explain || '',
    };
  }

  // ---- progress per topic, from the player's records (store: id -> { box, learned, due })
  function stats(topicId, store, now) {
    const ids = IDS_BY_TOPIC[topicId];
    let sum = 0, learned = 0, started = 0, due = 0;
    for (const id of ids) {
      const rec = store[id];
      if (!rec) continue;
      started++;
      if (rec.learned) { learned++; sum += 1; } else { sum += Math.min(BOX_MAX, rec.box || 0) / BOX_MAX; if (now >= (rec.due || 0)) due++; }
    }
    const f = ids.length ? sum / ids.length : 0;
    return { n: ids.length, started, learned, due, f, level: levelFor(f) };
  }
  const perkAt = (topicId, level) => { const t = TOPIC_BY_ID[topicId]; return level > 0 ? t.perk.v[Math.min(level, 3) - 1] : 0; };

  return Object.assign(api, { TOPICS, CARDS, CARD_BY_ID, IDS_BY_TOPIC, BOX_MAX, LEVEL_AT, LEVEL_NAMES, levelFor, stats, perkAt, makeQuestion, helpers });
});
