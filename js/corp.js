/* Firmament corporation data: buildings built from human technology, the technology tree, the bonuses of each spectral
   class and brightness tier, corporate ranks and market conditions. Pure data and tiny helpers, no state. */
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
      blurb: 'Automated settlement: revenue banks itself instead of waiting to be collected. Flagship stars always keep their own books.',
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
    ['telegraph', 'Telegraph', '1844', 1, [], { auto: 0.3 }, 'Money travels as fast as news: ordinary colonies bank 30% of their cash automatically.', 1],
    ['electricity', 'Electric Power', '1882', 1, [], { out: 0.05 }, 'Power stations and grids light the first modern cities.', 1],
    ['radio', 'Radio', '1895', 1, ['electricity'], { res: 0.05 }, 'Signals through the air, and later from the stars.', 1],
    ['rocketry', 'Liquid-Fuel Rocket', '1926', 2, ['electricity'], {}, 'Goddard launches the first liquid-fuelled rocket.', 1],
    ['computing', 'Electronic Computer', '1945', 2, ['electricity'], {}, 'ENIAC calculates in seconds what took teams of people weeks.', 1],
    ['photovoltaics', 'Solar Cell', '1954', 2, ['electricity'], {}, 'Bell Labs turn sunlight directly into electricity.', 1],
    ['orbit', 'Orbital Flight', '1957', 2, ['rocketry'], {}, 'Sputnik 1 beeps from orbit and the space age begins.', 1.2],
    ['satellites', 'Communications Satellite', '1962', 2, ['orbit', 'radio'], { out: 0.04 }, 'Telstar relays live television across the Atlantic.', 1.2],
    ['eft', 'Electronic Funds Transfer', '1973', 2, ['computing', 'telegraph'], { auto: 0.25 }, 'SWIFT and automated clearing move money between banks overnight: a further 25% is banked automatically.', 1.2],
    ['moon', 'Crewed Moon Landing', '1969', 2, ['orbit'], { speed: 0.05 }, 'Apollo 11 puts people on another world.', 1.4],
    ['station', 'Space Station', '1971', 2, ['orbit'], {}, 'Salyut 1 is the first crewed orbital outpost.', 1.4],
    ['space_telescope', 'Space Telescope', '1990', 3, ['station'], { res: 0.1 }, 'Hubble looks at the universe from above the atmosphere.', 1],
    ['internet', 'The Internet', '1991', 3, ['computing', 'satellites'], {}, 'A global network connects every lab and boardroom.', 1],
    ['payments', 'Digital Payments', '2000s', 3, ['internet', 'eft'], { auto: 0.25 }, 'Payments settle in seconds, anywhere: 80% of ordinary revenue now banks itself.', 1],
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
    auto: v => '+' + pct(v) + ' of ordinary colonies’ cash banked automatically', cap: v => '+' + pct(v) + ' storage', ev: v => '+' + pct(v) + ' comet and nova rewards',
    route: v => '+' + pct(v) + ' trade-route strength', star: v => '+' + pct(v) + ' star bonuses', slots: v => '+' + (Math.round(v * 100) / 100) + ' fleet slot' + (v === 1 ? '' : 's'),
  };

  // ---------------------------------------------------------------- stars: spectral class and brightness
  // Every star has a spectral class and a brightness tier, and each gives a fixed bonus to the colony: the same for every
  // star of that kind. The class comes from the B-V colour index with the usual boundaries (an estimate: giants can be a
  // class out), and the 20 named stars use their real types. Brighter than magnitude 3 earns a beacon bonus.
  const SPECTRAL = {
    O: { name: 'Blue', temp: 'over 30,000 K', blurb: 'Rare, enormous and short-lived.', rev: 0.35 },
    B: { name: 'Blue-white', temp: '10,000 to 30,000 K', blurb: 'Hot and luminous, with neutral helium lines.', rev: 0.25 },
    A: { name: 'White', temp: '7,500 to 10,000 K', blurb: 'The Balmer lines of hydrogen are strongest.', rev: 0.05, res: 0.02 },
    F: { name: 'Yellow-white', temp: '6,000 to 7,500 K', blurb: 'Ionised calcium appears and hydrogen weakens.', rev: 0.05, speed: 0.1 },
    G: { name: 'Yellow', temp: '5,200 to 6,000 K', blurb: 'Sun-like: the Sun is G2V.', rev: 0.2, res: 0.005 },
    K: { name: 'Orange', temp: '3,700 to 5,200 K', blurb: 'Cooler and long-lived, with neutral metal lines.', cap: 0.2, res: 0.01 },
    M: { name: 'Red', temp: '2,400 to 3,700 K', blurb: 'The commonest stars, with molecular bands such as TiO.', cap: 0.4 },
  };
  const SPECTRAL_ORDER = 'OBAFGKM';
  const TIERS = [
    { max: 1, name: 'Beacon', route: 0.3, speed: 0.15 },
    { max: 2, name: 'Brilliant', route: 0.2, speed: 0.1 },
    { max: 3, name: 'Bright', route: 0.1, speed: 0.05 },
  ];
  const spectralLetter = bv => (bv < -0.3 ? 'O' : bv < 0 ? 'B' : bv < 0.3 ? 'A' : bv < 0.58 ? 'F' : bv < 0.81 ? 'G' : bv < 1.4 ? 'K' : 'M');
  const NAMED_TYPES = {
    Sirius: 'A1V', Canopus: 'A9II', Arcturus: 'K1.5III', Vega: 'A0Va', Capella: 'G8III', Rigel: 'B8Ia', Procyon: 'F5IV-V', Achernar: 'B6Vep',
    Betelgeuse: 'M1-2Ia-Iab', Hadar: 'B1III', Altair: 'A7V', Acrux: 'B0.5IV', Aldebaran: 'K5III', Antares: 'M1.5Iab', Spica: 'B1III-IV',
    Pollux: 'K0III', Fomalhaut: 'A3V', Deneb: 'A2Ia', Mimosa: 'B0.5III', Polaris: 'F7Ib',
  };
  function starProfile(star) { // star = [hip, ra, dec, mag, bv, constellation, name, named]
    const mag = star[3], real = NAMED_TYPES[star[6]];
    const letter = real ? real[0] : spectralLetter(star[4]);
    const sp = SPECTRAL[letter], tier = TIERS.find(t => mag < t.max) || null;
    return { letter, type: real || '', estimated: !real, spectral: sp, tier, mag, rev: sp.rev || 0, res: sp.res || 0, cap: sp.cap || 0, speed: (sp.speed || 0) + (tier ? tier.speed : 0), route: tier ? tier.route : 0 };
  }
  // the bonuses as readable lines; k scales them (the Academy's star-classification topic strengthens every star)
  function classPerks(p, k) {
    k = k || 1; const out = [];
    if (p.spectral.rev) out.push('+' + pct(p.spectral.rev * k) + ' revenue');
    if (p.spectral.res) out.push('+' + perHour(p.spectral.res * k));
    if (p.spectral.cap) out.push('+' + pct(p.spectral.cap * k) + ' storage');
    if (p.spectral.speed) out.push('ships leave ' + pct(p.spectral.speed * k) + ' faster');
    return out;
  }
  function tierPerks(p, k) {
    k = k || 1;
    return p.tier ? ['+' + pct(p.tier.route * k) + ' trade-route strength', 'ships leave ' + pct(p.tier.speed * k) + ' faster'] : [];
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
    SPECTRAL, SPECTRAL_ORDER, TIERS, NAMED_TYPES, spectralLetter, starProfile, classPerks, tierPerks, RANKS, MARKETS, defaultCompanyName,
  };
});
