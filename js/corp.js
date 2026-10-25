/* Firmament corporation data: buildings built from human technology, the technology tree, star survey traits,
   corporate ranks and market conditions. Pure data and tiny helpers, no state. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Corp = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const pct = v => Math.round(v * 1000) / 10 + '%';
  const perHour = v => { const h = v * 3600; return (h >= 100 ? Math.round(h) : Math.round(h * 10) / 10) + ' RP/h'; };

  // ---------------------------------------------------------------- buildings
  // Every colony has building slots: one per three development levels (the rings around the star) plus extras from
  // Space Stations. A building can be raised to level 3. "Regional" buildings reach out along intact routes.
  const BUILDING_MAX = 3;
  const BUILD_LEVEL_MUL = [1, 2, 4]; // cost of level 1, 2, 3 relative to level 1
  const BUILD_CATS = {
    industry: { name: 'Industry', color: '#ffd98a' },
    research: { name: 'Research', color: '#c9a2ff' },
    logistics: { name: 'Logistics', color: '#7fe3ff' },
    regional: { name: 'Regional', color: '#7ee2a8' },
  };
  // costMul: cash cost of level 1 as a multiple of the current colonisation cost; rp: research cost of level 1.
  // payback: instead of costMul, industry buildings cost what they earn back in that many hours of the extra revenue.
  const BUILDINGS = {
    observatory: {
      name: 'Observatory', short: 'OB', cat: 'research', tech: 'telescope', costMul: 1.5, rp: 0, res: 0.02,
      blurb: 'A dome with a telescope. The first step of every space programme.',
      text: L => '+' + perHour(0.02 * L) + ' at this colony',
    },
    exchange: {
      name: 'Commodity Exchange', short: 'CE', cat: 'regional', regional: true, tech: 'stocks', costMul: 4, rp: 10,
      blurb: 'A trading floor that lifts the margins on every route in its region.',
      text: L => '+' + pct(0.3 * L) + ' trade-route strength, ' + (L + 1) + ' hops',
    },
    launchpad: {
      name: 'Launch Pad', short: 'LP', cat: 'logistics', tech: 'rocketry', costMul: 3, rp: 12, speed: 0.1, slots: 0.5,
      blurb: 'Rockets on the pad: ships leave faster and the fleet grows.',
      text: L => '−' + pct(0.1 * L) + ' travel time for ships from here, +' + (0.5 * L) + ' fleet slot' + (L === 2 ? '' : 's') + ' (company-wide)',
    },
    solar: {
      name: 'Solar Farm', payback: 24, short: 'SF', cat: 'industry', tech: 'photovoltaics', costMul: 2, rp: 15, rev: 0.25,
      blurb: 'Acres of photovoltaic panels turning sunlight into cash.',
      text: L => '+' + pct(0.25 * L) + ' revenue at this colony',
    },
    clearing: {
      name: 'Clearing House', short: 'CH', cat: 'regional', regional: true, tech: 'computing', costMul: 5, rp: 30,
      blurb: 'Automated settlement: revenue banks itself instead of waiting to be collected.',
      text: L => 'Auto-banks ' + pct([0, 0.5, 0.7, 0.9][L]) + ' of revenue and research, ' + (L + 1) + ' hops',
    },
    shipyard: {
      name: 'Orbital Shipyard', short: 'OS', cat: 'regional', regional: true, tech: 'orbit', costMul: 5, rp: 30,
      blurb: 'Zero-gravity assembly line for colony ships.',
      text: L => '+' + L + ' fleet slot' + (L > 1 ? 's' : '') + ', ' + pct(0.1 * L) + ' faster ships, ' + (L + 1) + ' hops',
    },
    station: {
      name: 'Space Station', short: 'SS', cat: 'research', tech: 'station', costMul: 6, rp: 60, slotsFor: L => L + 1, res: 0.01,
      blurb: 'A permanent crewed outpost: room to build more.',
      text: L => '+' + (L + 1) + ' building slots here (it uses one), +' + perHour(0.01 * L),
    },
    campus: {
      name: 'R&D Campus', short: 'RD', cat: 'regional', regional: true, tech: 'internet', costMul: 5, rp: 40,
      blurb: 'Laboratories, lecture halls and a fast network.',
      text: L => '+' + pct(0.35 * L) + ' research, ' + (L + 1) + ' hops',
    },
    mining: {
      name: 'Asteroid Mining Base', payback: 36, short: 'AM', cat: 'industry', tech: 'asteroid', costMul: 5, rp: 45, rev: 0.45,
      blurb: 'Robots strip platinum-rich asteroids and ship the ore home.',
      text: L => '+' + pct(0.45 * L) + ' revenue at this colony',
    },
    habitat: {
      name: 'Orbital Habitat', payback: 40, short: 'OH', cat: 'industry', tech: 'habitat', costMul: 8, rp: 110, rev: 0.6, stock: 0.5,
      blurb: 'A rotating ring home for thousands of workers.',
      text: L => '+' + pct(0.6 * L) + ' revenue, +' + pct(0.5 * L) + ' revenue storage here',
    },
    fusion: {
      name: 'Fusion Plant', payback: 48, short: 'FP', cat: 'industry', tech: 'fusion', costMul: 10, rp: 140, rev: 0.8,
      blurb: 'A star in a bottle: abundant, cheap power for heavy industry.',
      text: L => '+' + pct(0.8 * L) + ' revenue at this colony',
    },
    elevator: {
      name: 'Space Elevator', short: 'SE', cat: 'logistics', tech: 'nanotubes', costMul: 14, rp: 220, discount: 0.04,
      blurb: 'A carbon-nanotube cable to orbit makes everything cheaper to lift.',
      text: L => '−' + pct(0.04 * L) + ' to all costs (company-wide, up to 50% total)',
    },
    warpgate: {
      name: 'Warp Gate', short: 'WG', cat: 'logistics', tech: 'warp', costMul: 30, rp: 600, speed: 0.25,
      blurb: 'Fold space: ships launched here barely take any time at all.',
      text: L => '−' + pct(0.25 * L) + ' travel time for ships from here',
    },
    dyson: {
      name: 'Dyson Swarm', payback: 80, short: 'DS', cat: 'industry', tech: 'dyson', costMul: 40, rp: 700, rev: 1.5,
      blurb: 'Millions of orbiting collectors wrap the star and capture its whole output.',
      text: L => '+' + pct(1.5 * L) + ' revenue at this colony',
    },
  };
  for (const id of Object.keys(BUILDINGS)) { BUILDINGS[id].id = id; BUILDINGS[id].color = BUILD_CATS[BUILDINGS[id].cat].color; }
  const BUILDING_ORDER = Object.keys(BUILDINGS); // catalogue order is definition order

  // ---------------------------------------------------------------- technology tree
  // Each era's research costs (cash is a multiple of the current colonisation cost) and how long a project takes in real time.
  const ERAS = [
    { name: 'Early Modern', years: '1600s', cash: 0.4, rp: 10, secs: 600 },
    { name: 'Industrial Age', years: '1800s', cash: 0.8, rp: 30, secs: 1800 },
    { name: 'Rocket Age', years: '1920s\u20131970s', cash: 1.6, rp: 90, secs: 7200 },
    { name: 'Information Age', years: '1990s\u20132020s', cash: 3.2, rp: 270, secs: 28800 },
    { name: 'Near Future', years: '2040s', cash: 6.4, rp: 800, secs: 86400 },
    { name: 'Interstellar', years: 'Beyond', cash: 13, rp: 2400, secs: 172800 },
  ];
  // id, name, year, era, requires, perks, blurb. A tech's cost comes from its era (see ERAS) and a per-tech weight.
  const TECH_DEFS = [
    ['telescope', 'Refracting Telescope', '1608', 0, [], {}, 'Galileo points a spyglass at the sky and sees moons around Jupiter.', 0],
    ['stocks', 'Joint-Stock Company', '1602', 0, [], { out: 0.02 }, 'Shared ownership lets companies fund ventures too big for any one backer.', 1],
    ['electricity', 'Electric Power', '1882', 1, [], { out: 0.05 }, 'Power stations and grids light the first modern cities.', 1],
    ['radio', 'Radio', '1895', 1, ['electricity'], { res: 0.05 }, 'Signals through the air, and later from the stars.', 1],
    ['rocketry', 'Liquid-Fuel Rocket', '1926', 2, ['electricity'], {}, 'Goddard launches the first liquid-fuelled rocket.', 1],
    ['computing', 'Electronic Computer', '1945', 2, ['electricity'], {}, 'ENIAC calculates in seconds what took teams of people weeks.', 1],
    ['photovoltaics', 'Solar Cell', '1954', 2, ['electricity'], {}, 'Bell Labs turn sunlight directly into electricity.', 1],
    ['orbit', 'Orbital Flight', '1957', 2, ['rocketry'], {}, 'Sputnik 1 beeps from orbit and the space age begins.', 1.2],
    ['satellites', 'Communications Satellite', '1962', 2, ['orbit', 'radio'], { out: 0.04 }, 'Telstar relays live television across the Atlantic.', 1.2],
    ['moon', 'Crewed Moon Landing', '1969', 2, ['orbit'], { speed: 0.05 }, 'Apollo 11 puts people on another world.', 1.4],
    ['station', 'Space Station', '1971', 2, ['orbit'], {}, 'Salyut 1 is the first crewed orbital outpost.', 1.4],
    ['space_telescope', 'Space Telescope', '1990', 3, ['station'], { res: 0.1 }, 'Hubble looks at the universe from above the atmosphere.', 1],
    ['internet', 'The Internet', '1991', 3, ['computing', 'satellites'], {}, 'A global network connects every lab and boardroom.', 1],
    ['reusable', 'Reusable Rockets', '2015', 3, ['orbit'], { cost: 0.05 }, 'Boosters land themselves and fly again, and launches get cheap.', 1.2],
    ['asteroid', 'Asteroid Mining', '2020s', 3, ['reusable'], {}, 'Probes sample asteroids; prospectors eye their metals.', 1.3],
    ['ai', 'Machine Learning', '2010s', 3, ['internet'], { res: 0.15, out: 0.05 }, 'Software that learns from data speeds up every kind of research.', 1.3],
    ['fusion', 'Fusion Power', 'c. 2040', 4, ['photovoltaics', 'ai'], { out: 0.08 }, 'Net-positive fusion at last: cheap, clean, nearly limitless power.', 1],
    ['nanotubes', 'Carbon-Nanotube Cable', 'c. 2045', 4, ['reusable', 'ai'], {}, 'A material strong enough to hang a cable from orbit to the ground.', 1.2],
    ['habitat', 'Orbital Habitats', 'c. 2050', 4, ['station', 'reusable'], { out: 0.05 }, 'Rotating rings with gravity, gardens and room for thousands.', 1.2],
    ['antimatter', 'Antimatter Propulsion', 'c. 2100', 5, ['fusion'], { speed: 0.15 }, 'The most energetic fuel there is, stored in magnetic bottles.', 1],
    ['dyson', 'Dyson Swarm Engineering', 'c. 2200', 5, ['fusion', 'habitat'], { out: 0.1 }, 'Collectors in their millions surround a whole star.', 1.2],
    ['warp', 'Warp Drive', 'c. 2300', 5, ['antimatter'], { speed: 0.1 }, 'Space itself is folded, and distance stops being a barrier.', 1.5],
  ];
  const TECHS = TECH_DEFS.map(([id, name, year, era, req, perks, blurb, w]) => {
    const e = ERAS[era];
    return { id, name, year, era, req, perks, blurb, cashMul: e.cash * w, rp: Math.round(e.rp * w), secs: Math.round(e.secs * (w || 1)), free: w === 0, unlocks: Object.keys(BUILDINGS).filter(b => BUILDINGS[b].tech === id) };
  });
  const TECH_BY_ID = {}; TECHS.forEach(t => { TECH_BY_ID[t.id] = t; });
  const PERK_TEXT = {
    out: v => '+' + pct(v) + ' revenue', res: v => '+' + pct(v) + ' research', speed: v => '−' + pct(v) + ' ship travel time', cost: v => '−' + pct(v) + ' costs',
  };

  // ---------------------------------------------------------------- survey traits (revealed when a star is colonised)
  const TRAITS = {
    minerals: { name: 'Mineral-rich belt', rev: 0.2, text: '+20% revenue' },
    habitable: { name: 'Habitable moon', rev: 0.35, text: '+35% revenue' },
    gas: { name: 'Gas giants', rev: 0.12, cap: 0.25, text: '+12% revenue, +25% storage' },
    ruins: { name: 'Ancient ruins', res: 0.015, text: '+54 RP/h' },
    nebula: { name: 'Dust cloud', rev: 0.1, res: 0.01, text: '+10% revenue, +36 RP/h' },
    pulsar: { name: 'Pulsar companion', rev: -0.1, res: 0.03, text: '−10% revenue, +108 RP/h' },
    flare: { name: 'Flare star', rev: -0.1, res: 0.01, text: '−10% revenue, +36 RP/h' },
  };
  const TRAIT_WEIGHTS = [ // by colour class: blue-white, yellow, orange-red
    { pulsar: 2, ruins: 1, minerals: 1, gas: 1, nebula: 2 },
    { habitable: 3, minerals: 2, gas: 2, ruins: 1, nebula: 1 },
    { flare: 2, habitable: 2, minerals: 2, gas: 2, ruins: 1, nebula: 1 },
  ];
  function seeded(seed) { let s = (Math.imul(seed + 1, 2654435761) >>> 0) || 7; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function genTraits(hip, cls) { // deterministic per star: 30% none, 50% one, 20% two
    const r = seeded(hip * 31 + 7), roll = r(), n = roll < 0.3 ? 0 : roll < 0.8 ? 1 : 2;
    const w = TRAIT_WEIGHTS[cls], ids = Object.keys(w), out = [];
    for (let k = 0; k < n; k++) {
      const pool = ids.filter(x => !out.includes(x));
      let t = r() * pool.reduce((a, x) => a + w[x], 0), pick = pool[0];
      for (const x of pool) { t -= w[x]; if (t <= 0) { pick = x; break; } }
      out.push(pick);
    }
    return out;
  }

  // ---------------------------------------------------------------- corporate rank (by number of colonies)
  const RANKS = [
    { at: 1, title: 'Startup' }, { at: 8, title: 'Small Business' }, { at: 25, title: 'Regional Enterprise' },
    { at: 60, title: 'Multi-System Company' }, { at: 150, title: 'Interstellar Corporation' },
    { at: 350, title: 'Galactic Conglomerate' }, { at: 600, title: 'Cosmic Monopoly' },
  ];

  // ---------------------------------------------------------------- market conditions (random, timed, only while playing)
  const MARKETS = {
    boom: { name: 'Market boom', rev: 0.3, text: '+30% revenue', secs: 600 },
    bubble: { name: 'Tech bubble', res: 0.5, text: '+50% research', secs: 600 },
    race: { name: 'Space race', speed: 0.25, text: '−25% ship travel time', secs: 600 },
    crunch: { name: 'Credit crunch', rev: -0.2, cost: 0.25, text: '−20% revenue but −25% costs: a bargain hunter’s market', secs: 600 },
    contract: { name: 'Government contract', rev: 0.15, res: 0.2, text: '+15% revenue, +20% research', secs: 600 },
  };

  const NAME_SUFFIX = ['Ventures', 'Expeditions', 'Holdings', 'Industries', 'Stellar Ltd', 'Aerospace', 'Frontier Co.'];
  const defaultCompanyName = starName => String(starName).replace(/[^\wͰ-Ͽ .&'-]/g, '').trim() + ' ' + NAME_SUFFIX[Math.abs([...String(starName)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % NAME_SUFFIX.length];

  return {
    BUILDINGS, BUILDING_ORDER, BUILDING_MAX, BUILD_LEVEL_MUL, BUILD_CATS, ERAS, TECHS, TECH_BY_ID, PERK_TEXT,
    TRAITS, genTraits, RANKS, MARKETS, defaultCompanyName,
  };
});
