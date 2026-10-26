/* Quests: a story chain of goals plus repeatable contracts. Progress is derived from game state, so quests
   work on existing saves; only the claimed flags and the active contracts are stored (state.quests). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Quests = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function create(G, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const SKY = G.SKY;
    const pick = a => a[Math.floor(rng() * a.length)];
    const st = () => G.state.stats;
    const qz = () => G.state.quiz;
    const learnedCount = cat => Object.values(qz()[cat]).filter(r => r.learned).length;
    const okIn = cat => Object.values(qz()[cat]).reduce((n, r) => n + (r.ok || 0), 0); // correct answers in a Sky School category
    const claimedNames = names => names.filter(n => { const i = G.nameIdx.get(n); return i !== undefined && G.state.stars[i]; }).length;
    const namedClaimed = () => SKY.stars.reduce((n, s, i) => n + (s[7] && G.state.stars[i] ? 1 : 0), 0);
    let bmemo = null;
    const blds = () => bmemo || (bmemo = G.allBuildings());
    const messierKinds = () => new Set(Object.keys(G.state.messier).map(m => SKY.messier[m].kind)).size;
    const count = o => Object.keys(o).length;
    const learnedAll = () => learnedCount('const') + learnedCount('star') + learnedCount('messier');
    // star counts by spectral class and brightness tier, worked out once per evaluation
    let memo = null;
    const fresh = () => { memo = null; bmemo = null; }; // each evaluation starts from the current state
    const profileCounts = () => {
      if (memo) return memo;
      const letters = {}, tiers = {};
      for (let i = 0; i < SKY.stars.length; i++) if (G.state.stars[i]) { const p = G.profileOf(i); letters[p.letter] = (letters[p.letter] || 0) + 1; if (p.tier) tiers[p.tier.name] = (tiers[p.tier.name] || 0) + 1; }
      return (memo = { letters, tiers });
    };
    const colonisedClass = letter => profileCounts().letters[letter] || 0;
    const colonisedTier = name => profileCounts().tiers[name] || 0;
    const classesHeld = () => Object.keys(profileCounts().letters).length;
    const techDone = id => (G.state.tech.done[id] ? 1 : 0);
    const totalLevels = () => G.d.claimed.reduce((n, i) => n + G.lvl(i), 0);
    const levelsAt = n => G.d.claimed.filter(i => G.lvl(i) >= n).length;
    const constIdx = name => SKY.consts.findIndex(c => c.name === name);
    const constDeveloped = names => names.filter(n => G.state.devConst[constIdx(n)]).length;
    const messierIdx = n => SKY.messier.findIndex(m => m.n === n);
    const surveyed = nums => nums.filter(n => G.state.messier[messierIdx(n)]).length;
    const messierOfKind = kind => Object.keys(G.state.messier).filter(m => SKY.messier[m].kind === kind).length;
    const studied = () => Object.values(G.state.messier).filter(v => v.dev).length;
    const topicsAtLevel = l => G.academy().filter(t => t.level >= l).length;
    const topicLevel = id => (G.state.academy.lvl[id] || 0);
    const ageDays = () => (G.now() - G.state.created) / 86400e3;
    const routeLevels = () => Object.values(G.state.routeLvl || {});
    // progress that must never go backwards even when the thing counted can (a building is demolished, income dips in a crunch)
    const peak = (key, v) => { const q = Q(), p = q.peak || (q.peak = {}); if (v > (p[key] || 0)) p[key] = v; return p[key] || 0; };
    const art = name => (/^[AEIOU]/.test(name) ? 'an ' : 'a ') + name;
    const builtOf = id => peak('b:' + id, blds().filter(b => b.id === id).length);
    const builtAll = () => peak('bld', blds().length);
    const builtKinds = () => peak('kinds', new Set(blds().map(b => b.id)).size);
    const builtAt = l => peak('bl' + l, blds().filter(b => b.lvl >= l).length);
    const ZODIAC = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpius', 'Sagittarius', 'Capricornus', 'Aquarius', 'Pisces'];
    const zodiacColonised = () => ZODIAC.filter(n => G.consStatus(constIdx(n)).all).length;

    // [id, chapter, title, description, current(), target, reward minutes of income, references to check]
    // Progress only ever goes up (it counts lifetime totals), so a finished quest never un-finishes. The story shows the
    // cheapest few unfinished goals at any time, whatever their chapter, so it opens up as you grow.
    const STORY = [];
    const add = (id, chapter, title, desc, cur, target, mins, refs) => STORY.push({ id, chapter, title, desc, cur, target, mins, refs });
    const fm = n => { const k = n >= 1e9 ? [n / 1e9, 'B'] : n >= 1e6 ? [n / 1e6, 'M'] : n >= 1e3 ? [n / 1e3, 'k'] : [n, '']; return +k[0].toFixed(1) + k[1]; }; // $2.5M, $100B
    const S_ = (n, one, many) => n + ' ' + (n === 1 ? one : many);

    // ---- Expansion
    [[2, 1], [5, 3], [15, 6], [25, 8], [40, 12], [75, 18], [100, 25], [150, 35], [250, 50], [350, 70], [500, 90], [650, 150], [757, 240]].forEach(([n, m]) => add('claim' + n, 'Expansion', n === 757 ? 'The whole sky' : n === 2 ? 'First landing' : 'Colonise ' + n + ' stars', n === 757 ? 'Colonise every star on the constellation figures.' : n === 2 ? 'Your first colony ship lands: own 2 colonies.' : 'Grow the company to ' + n + ' colonies.', () => G.d.count, n, m));
    // ---- Development
    [[10, 4], [50, 10], [200, 30], [600, 90], [1500, 200], [4000, 450]].forEach(([n, m]) => add('upg' + n, 'Development', 'Make ' + n + ' upgrades', 'Raise Industry, Logistics and R&D on your colonies ' + n + ' times in total.', () => st().upgrades, n, m));
    [[50, 8], [250, 30], [750, 90], [2000, 250], [5000, 500]].forEach(([n, m]) => add('lvl' + n, 'Development', n + ' development levels', 'Your colonies have ' + n + ' development levels between them (Industry, Logistics and R&D together).', totalLevels, n, m));
    add('maxcol', 'Development', 'A perfect colony', 'Raise one colony to level 15: Industry, Logistics and R&D all at 5.', () => G.d.claimed.reduce((m, i) => Math.max(m, G.lvl(i)), 0), 15, 60);
    add('max10', 'Development', 'Ten perfect colonies', 'Have 10 colonies at level 15.', () => levelsAt(15), 10, 300);
    add('max50', 'Development', 'Fifty perfect colonies', 'Have 50 colonies at level 15.', () => levelsAt(15), 50, 900);
    [[1, 8], [5, 20], [15, 50], [25, 80], [40, 120], [60, 250], [88, 400]].forEach(([n, m]) => add('dev' + n, 'Development', n === 1 ? 'Your first developed constellation' : 'Develop ' + n + ' constellations', 'Colonise every star in a constellation and develop each one to at least 3 levels.', () => count(G.state.devConst), n, m));
    [[1, 25], [5, 80], [10, 110], [20, 250], [40, 500], [88, 1500]].forEach(([n, m]) => add('mast' + n, 'Development', n === 1 ? 'Master a constellation' : n === 88 ? 'Every constellation mastered' : 'Master ' + n + ' constellations', 'Develop every colony in a constellation to at least 9 levels.', () => count(G.state.masterConst), n, m));
    // ---- Revenue
    [[20, 4], [50, 8], [200, 20], [500, 50], [2000, 150], [10000, 400]].forEach(([n, m]) => add('collect' + n, 'Revenue', n === 20 ? 'Gather the revenue' : n === 200 ? 'Seasoned collector' : 'Collect revenue ' + n + ' times', 'Collect revenue from colonies ' + n + ' times.', () => st().collects, n, m));
    [[1e3, 3], [1e4, 6], [1e5, 12], [1e6, 25], [1e7, 50], [1e8, 100], [1e9, 200], [1e10, 400], [1e11, 800]].forEach(([n, m]) => add('earn' + Math.round(Math.log10(n)), 'Revenue', 'Earn $' + fm(n), 'Collect or auto-bank $' + fm(n) + ' in revenue over the life of the company.', () => st().collected + st().auto, n, m));
    [[1e3, 4], [1e4, 10], [1e5, 25], [1e6, 60], [3e6, 100], [1e7, 150], [2.5e7, 400]].forEach(([n, m]) => add('rate' + fm(n).replace('.', 'p'), 'Revenue', 'Earn $' + fm(n) + ' an hour', 'Bring the company’s revenue to $' + fm(n) + ' per hour.', () => peak('rate', G.d.totalRate * 3600), n, m));
    // ---- Corporation
    [[2, 15], [3, 40], [4, 120], [5, 300], [6, 800]].forEach(([n, m]) => add('rank' + n, 'Corporation', 'Become a ' + G.RANKS[n].title, 'Reach ' + G.RANKS[n].at + ' colonies and be promoted to ' + G.RANKS[n].title + '.', () => G.rankInfo().idx, n, m));
    [[3, 20], [10, 60], [25, 150]].forEach(([n, m]) => add('market' + n, 'Corporation', n === 3 ? 'Ride the market' : 'Weather ' + n + ' market conditions', 'Live through ' + n + ' market conditions (booms, bubbles, crunches...) while you are playing.', () => st().marketEvents, n, m));
    [[20, 6], [40, 15], [80, 30], [160, 70], [320, 160], [640, 320]].forEach(([n, m]) => add('price' + n, 'Corporation', 'Share price $' + n, 'Push your share price to $' + n + ' at its peak.', () => G.state.market.hi, n, m));
    add('rename', 'Corporation', 'Your name on the door', 'Give the company a name of your own (Corporation → Overview).', () => (G.state.corp.renamed ? 1 : 0), 1, 2);
    [[1, 15, 'Open for business', 'Keep the company running for a day.'], [7, 60, 'A week of trading', 'Your company is a week old.'], [30, 250, 'A month in business', 'Your company is a month old.'], [100, 800, 'Old money', 'Your company is 100 days old.']].forEach(([n, m, t, d]) => add('age' + n, 'Corporation', t, d, ageDays, n, m));
    // ---- Spectra: every spectral class and brightness tier
    const SP = G.Corp.SPECTRAL;
    const classQuests = { G: [[5, 30], [15, 60], [29, 160]], M: [[10, 40], [30, 90], [75, 220]], B: [[10, 25], [50, 80], [100, 150], [197, 350]], A: [[10, 25], [40, 80], [100, 160], [150, 300]], F: [[10, 30], [40, 100], [89, 250]], K: [[20, 40], [100, 140], [217, 400]] };
    const classTitle = { G: 'A star like ours', M: 'Red giants and dwarfs', B: 'Blue-white blazers', A: 'White-hot research', F: 'Fast and yellow-white', K: 'Orange lights' };
    for (const letter of ['G', 'M', 'B', 'A', 'F', 'K']) classQuests[letter].forEach(([n, m], k) => add(k === 0 && (letter === 'G' || letter === 'M') ? 'class' + letter : 'class' + letter + n, 'Spectra', k === 0 ? classTitle[letter] : 'More ' + letter + '-class stars: ' + n, 'Colonise ' + n + ' ' + SP[letter].name.toLowerCase() + ' ' + letter + '-class stars. ' + SP[letter].blurb, () => colonisedClass(letter), n, m));
    add('allclass', 'Spectra', 'The full spectrum', 'Colonise at least one star of every spectral class in this sky: B, A, F, G, K and M.', classesHeld, 6, 50);
    [['Beacon', 'brighter than magnitude 1: faster ships and stronger trade routes', [[3, 20], [7, 60], [14, 200]]], ['Brilliant', 'magnitude 1 to 2', [[5, 30], [15, 90], [34, 220]]], ['Bright', 'magnitude 2 to 3', [[20, 40], [60, 120], [117, 300]]]].forEach(([tier, blurb, list]) => list.forEach(([n, m]) => add('tier' + tier + n, 'Spectra', n + ' ' + tier.toLowerCase() + ' stars', 'Colonise ' + n + ' ' + tier + ' stars (' + blurb + ').', () => colonisedTier(tier), n, m)));
    // ---- Flagships and automation
    add('named1', 'Flagships', 'Your first flagship', 'Send a colony ship to one of the 20 named stars (your home star does not count). Colonies around a flagship remit 25% of their revenue to it.', () => namedClaimed() - (SKY.stars[G.state.home][7] ? 1 : 0), 1, 5);
    [[1, 5], [10, 15], [50, 50], [200, 150], [1000, 500]].forEach(([n, m]) => add('fcol' + n, 'Flagships', n === 1 ? 'The first dividend' : 'Collect at a flagship ' + n + ' times', 'Visit a flagship and collect its vault ' + n + ' time' + (n === 1 ? '' : 's') + '. Flagships never bank themselves.', () => st().flagCollects, n, m));
    [[1e3, 6], [1e5, 30], [1e7, 100], [1e9, 300]].forEach(([n, m]) => add('fcash' + Math.round(Math.log10(n)), 'Flagships', 'Flagship vaults: $' + fm(n), 'Collect $' + fm(n) + ' from flagship vaults in total.', () => st().flagCash, n, m));
    [[1e4, 8], [1e6, 40], [1e8, 150], [1e10, 500]].forEach(([n, m]) => add('auto' + Math.round(Math.log10(n)), 'Flagships', 'Hands-free: $' + fm(n) + ' banked', 'Let your Treasury technologies and Clearing Houses bank $' + fm(n) + ' automatically.', () => st().auto, n, m));
    // ---- Technology
    [[1, 8], [4, 20], [8, 40], [12, 80], [15, 150], [18, 250]].forEach(([n, m]) => add('tech' + n, 'Technology', n === 1 ? 'First breakthrough' : S_(n, 'breakthrough', 'breakthroughs'), n === 1 ? 'Complete your first research project (Corporation → Technology).' : 'Complete ' + n + ' research projects.', () => G.techCount() - 1, n, m));
    add('tech21', 'Technology', 'Every technology', 'Complete every research project, from the telescope to the warp drive.', () => G.techCount() - 1, G.TECHS.length - 1, 500);
    add('treasury', 'Technology', 'The Treasury chain', 'Research the Telegraph, Electronic Funds Transfer and Digital Payments: ordinary colonies then bank up to 80% of their cash on their own.', () => techDone('telegraph') + techDone('eft') + techDone('payments'), 3, 60);
    ['telegraph', 'radio', 'rocketry', 'computing', 'orbit', 'moon', 'space_telescope', 'internet', 'asteroid', 'ai', 'fusion', 'antimatter', 'warp'].forEach(id => { const t = G.TECH_BY_ID[id]; add('t_' + id, 'Technology', t.name, t.blurb + ' (Corporation → Technology)', () => techDone(id), 1, Math.round(6 + 20 * t.cashMul)); });
    // ---- Buildings
    add('bld1', 'Buildings', 'Break ground', 'Build your first building. Every three development levels on a colony open a building slot.', builtAll, 1, 12);
    add('bldclear', 'Buildings', 'Hands-free revenue', 'Build a Clearing House: it banks the revenue of a whole region automatically.', () => builtOf('clearing'), 1, 20);
    add('station', 'Buildings', 'Room to grow', 'Build a Space Station to add building slots to a colony.', () => builtOf('station'), 1, 60);
    add('bld10', 'Buildings', 'Ten buildings', 'Have 10 buildings standing at once.', builtAll, 10, 40);
    add('bldtypes', 'Buildings', 'A diversified portfolio', 'Build 8 different kinds of building.', builtKinds, 8, 120);
    add('bldlvl3', 'Buildings', 'Fully built', 'Raise any building to level 3.', () => (builtAt(3) ? 3 : blds().reduce((m, b) => Math.max(m, b.lvl), 0)), 3, 80);
    add('bld40', 'Buildings', 'A building boom', 'Have 40 buildings standing at once.', builtAll, 40, 200);
    add('dyson1', 'Buildings', 'Wrap a star', 'Build a Dyson Swarm.', () => builtOf('dyson'), 1, 400);
    Object.keys(G.BUILDINGS).filter(id => !['clearing', 'station', 'dyson'].includes(id)).forEach(id => { const d = G.BUILDINGS[id], t = G.TECH_BY_ID[d.tech]; add('b_' + id, 'Buildings', 'Build ' + art(d.name), d.blurb + ' (needs ' + t.name + ')', () => builtOf(id), 1, Math.round(6 + 20 * t.cashMul)); });
    add('clear10', 'Buildings', 'Ten Clearing Houses', 'Have 10 Clearing Houses standing, each banking the revenue of its region.', () => builtOf('clearing'), 10, 90);
    add('bld100', 'Buildings', 'A hundred buildings', 'Have 100 buildings standing at once.', builtAll, 100, 350);
    add('bldall', 'Buildings', 'One of everything', 'Build all ' + Object.keys(G.BUILDINGS).length + ' kinds of building.', builtKinds, Object.keys(G.BUILDINGS).length, 500);
    add('lvl3x10', 'Buildings', 'Ten fully built', 'Have 10 buildings at level 3.', () => builtAt(3), 10, 200);
    add('bld250', 'Buildings', 'A city of satellites', 'Have 250 buildings standing at once.', builtAll, 250, 700);
    add('lvl3x50', 'Buildings', 'Fifty fully built', 'Have 50 buildings at level 3.', () => builtAt(3), 50, 600);
    // ---- Routes
    add('route1', 'Routes', 'A better road', 'Upgrade a trade route.', () => st().routeUps, 1, 3);
    add('route5', 'Routes', 'Better roads', 'Upgrade trade routes 5 times.', () => st().routeUps, 5, 10);
    add('route30', 'Routes', 'Highways of light', 'Upgrade trade routes 30 times.', () => st().routeUps, 30, 80);
    add('routeL3', 'Routes', 'Full strength', 'Raise a trade route to level 3.', () => routeLevels().reduce((m, l) => Math.max(m, l), 0), 3, 40);
    add('route100', 'Routes', 'A hundred upgrades', 'Upgrade trade routes 100 times.', () => st().routeUps, 100, 250);
    add('routeL3x10', 'Routes', 'Ten great roads', 'Have 10 trade routes at level 3.', () => routeLevels().filter(l => l >= 3).length, 10, 150);
    add('route300', 'Routes', 'The network', 'Upgrade trade routes 300 times.', () => st().routeUps, 300, 600);
    // ---- Messier
    [[1, 6], [5, 20], [15, 50], [40, 120], [110, 600]].forEach(([n, m]) => add('mes' + n, 'Messier', n === 110 ? 'The Messier Marathon' : n === 1 ? 'First deep-sky object' : 'Catalogue ' + n + ' Messier objects', 'Send survey missions to Messier objects and catalogue them.', () => count(G.state.messier), n, m));
    add('meskinds', 'Messier', 'A little of everything', 'Catalogue a globular cluster, an open cluster, a nebula and a galaxy.', messierKinds, 4, 30);
    [['globular', 'Globular clusters', 'fleet slots', [[5, 40], [29, 220]]], ['open', 'Open clusters', 'revenue', [[5, 35], [26, 200]]], ['nebula', 'Nebulae', 'research', [[3, 30], [12, 160]]], ['galaxy', 'Galaxies', 'ship speed', [[10, 60], [40, 300]]]].forEach(([kind, name, perk, list]) => list.forEach(([n, m]) => add('mk_' + kind + n, 'Messier', name + ': ' + n, 'Catalogue ' + n + ' ' + name.toLowerCase() + ' (each gives ' + perk + ').', () => messierOfKind(kind), n, m)));
    add('mk_other3', 'Messier', 'The odd ones out', 'Catalogue all three oddities: a double star, an asterism and a star cloud.', () => messierOfKind('other'), 3, 40);
    [[1, 20], [10, 80], [40, 250], [110, 800]].forEach(([n, m]) => add('mdev' + n, 'Messier', n === 1 ? 'Look closer' : 'Study ' + n + ' in depth', 'Study ' + S_(n, 'surveyed Messier object', 'surveyed Messier objects') + ' in depth to double ' + (n === 1 ? 'its' : 'their') + ' bonus.', studied, n, m));
    [[42, 'The Orion Nebula', 15], [45, 'The Pleiades', 15], [44, 'The Beehive Cluster', 15], [1, 'The Crab Nebula', 20], [8, 'The Lagoon Nebula', 20], [57, 'The Ring Nebula', 20], [13, 'The Great Hercules Cluster', 20], [51, 'The Whirlpool Galaxy', 25], [104, 'The Sombrero Galaxy', 25], [31, 'The Andromeda Galaxy', 30]].forEach(([n, t, m]) => add('m' + n, 'Messier', t, 'Survey M' + n + ', the ' + t.replace(/^The /, '') + '.', () => surveyed([n]), 1, m, { messier: [n] }));
    add('mshow', 'Messier', 'The showpieces', 'Survey M1, M13, M27, M31, M42, M45, M51, M57 and M104: the nine showpieces of the sky.', () => surveyed([1, 13, 27, 31, 42, 45, 51, 57, 104]), 9, 120, { messier: [1, 13, 27, 31, 42, 45, 51, 57, 104] });
    // ---- Skies, comets and petitions
    [[1, 6], [5, 25], [15, 80], [30, 150], [60, 350]].forEach(([n, m]) => add('event' + n, 'Skies', n === 1 ? 'Mend the sky' : 'Resolve ' + n + ' comets and novae', 'Redraw the trade routes cut by a comet or nova.', () => st().eventsDone, n, m));
    add('perfect3', 'Skies', 'A steady hand', 'Redraw three events perfectly, with no misses and no hints.', () => st().perfect, 3, 60);
    add('perfect10', 'Skies', 'A very steady hand', 'Redraw ten events perfectly.', () => st().perfect, 10, 200);
    [[10, 10], [50, 60], [200, 200]].forEach(([n, m]) => add('mend' + n, 'Skies', 'Restore ' + n + ' routes', 'Redraw ' + n + ' trade routes cut by comets and novae.', () => st().restoredRoutes, n, m));
    [[1, 4], [5, 20], [25, 80], [100, 250]].forEach(([n, m]) => add('pet' + n, 'Petitions', n === 1 ? 'The customer is always right' : 'Answer ' + n + ' petitions', 'Grant ' + S_(n, 'colony petition', 'colony petitions') + ' (an upgrade, an expansion or a collection).', () => st().petitionsDone, n, m));
    // ---- Sky School
    [[20, 4], [100, 20], [400, 80], [1000, 200], [3000, 500]].forEach(([n, m]) => add('quiz' + n, 'Sky School', 'Answer ' + n + ' questions correctly', 'Play Sky School rounds.', () => qz().stats.correct, n, m));
    add('learn1', 'Sky School', 'Something learned', 'Get one item through all 10 spaced reviews and mark it learned.', learnedAll, 1, 40);
    add('learn5', 'Sky School', 'Five things learned', 'Learn any five constellations, stars or Messier objects.', learnedAll, 5, 120);
    add('learn25', 'Sky School', 'A well-read sky', 'Learn 25 things for good.', learnedAll, 25, 500);
    add('learn50', 'Sky School', 'Fifty things learned', 'Learn 50 constellations, stars or Messier objects.', learnedAll, 50, 900);
    add('learn110', 'Sky School', 'A hundred and ten', 'Learn 110 constellations, stars or Messier objects.', learnedAll, 110, 1800);
    add('perfectq', 'Sky School', 'Flawless', 'Finish a Sky School round with every answer right.', () => qz().stats.perfect, 1, 8);
    [[5, 40], [25, 150], [100, 400]].forEach(([n, m]) => add('perfq' + n, 'Sky School', n + ' flawless rounds', 'Finish ' + n + ' Sky School rounds with every answer right.', () => qz().stats.perfect, n, m));
    [[5, 6], [25, 30], [100, 120], [300, 300]].forEach(([n, m]) => add('rounds' + n, 'Sky School', 'Play ' + n + ' rounds', 'Play ' + n + ' Sky School rounds.', () => qz().stats.rounds, n, m));
    [[10, 15], [25, 60], [50, 200]].forEach(([n, m]) => add('streak' + n, 'Sky School', 'A streak of ' + n, 'Answer ' + n + ' questions correctly in a row.', () => qz().stats.bestStreak, n, m));
    [[25, 12], [100, 50], [300, 150]].forEach(([n, m]) => add('cq' + n, 'Sky School', n + ' constellation answers', 'Answer ' + n + ' questions about constellations correctly.', () => okIn('const'), n, m));
    [[25, 12], [100, 50], [300, 150]].forEach(([n, m]) => add('sq' + n, 'Sky School', n + ' star answers', 'Answer ' + n + ' questions about stars correctly.', () => okIn('star'), n, m));
    [[25, 15], [100, 60], [400, 250]].forEach(([n, m]) => add('mq' + n, 'Sky School', 'Photo finish: ' + n, 'Answer ' + n + ' questions about Messier objects correctly: photographs, numbers, names and types.', () => okIn('messier'), n, m));
    [[10, 150], [44, 500], [88, 1400]].forEach(([n, m]) => add('clearn' + n, 'Sky School', 'Know ' + n + ' constellations', 'Learn ' + n + ' constellations for good (10 spaced reviews each).', () => learnedCount('const'), n, m));
    [[10, 150], [55, 600], [110, 1500]].forEach(([n, m]) => add('mlearn' + n, 'Sky School', 'Know ' + n + ' Messier objects', 'Learn ' + n + ' Messier objects for good.', () => learnedCount('messier'), n, m));
    // ---- Olympiad Academy
    [[10, 6], [50, 20], [250, 80], [1000, 300], [3000, 700]].forEach(([n, m]) => add('acad' + n, 'Academy', n === 10 ? 'Enrol at the Academy' : 'Academy: ' + n + ' answers', 'Answer ' + n + ' Olympiad Academy questions correctly (Corporation → Academy, or Sky School).', () => okIn('astro'), n, m));
    [[1, 30], [3, 80], [6, 160], [10, 300], [15, 500], [20, 800], [30, 2000]].forEach(([n, m]) => add('alvl' + n, 'Academy', n === 1 ? 'A first level' : n === 30 ? 'Olympian' : 'Academy levels: ' + n, n === 30 ? 'Raise all ten Academy topics to level 3: you know the whole syllabus.' : 'Reach ' + S_(n, 'topic level', 'topic levels') + ' in the Olympiad Academy. Each is a permanent company bonus.', () => G.academyLevels(), n, m));
    add('atopics1', 'Academy', 'The full syllabus', 'Raise every one of the ten Academy topics to level 1.', () => topicsAtLevel(1), 10, 150);
    add('atopics2', 'Academy', 'Scholar of every topic', 'Raise every one of the ten Academy topics to level 2.', () => topicsAtLevel(2), 10, 500);
    const NCARDS = G.Astro.CARDS.length;
    [[10, 100], [50, 350], [150, 900], [NCARDS, 2000]].forEach(([n, m]) => add(n === NCARDS ? 'acardsAll' : 'acards' + n, 'Academy', n === NCARDS ? 'Every card learned' : n + ' cards learned', n === NCARDS ? 'Learn all ' + n + ' Academy cards for good (10 spaced reviews each).' : 'Learn ' + n + ' Academy cards for good (10 spaced reviews each).', () => learnedCount('astro'), n, m));
    G.Astro.TOPICS.forEach((t, k) => add('atop_' + t.id, 'Academy', t.name + ': level 3', 'Master ' + t.name + ': ' + t.blurb, () => (topicLevel(t.id) >= 3 ? 1 : 0), 1, 150 + 25 * k));
    // ---- Landmarks: famous stars, asterisms, constellations
    add('named5', 'Landmarks', 'Five famous stars', 'Colonise five of the 20 named stars.', namedClaimed, 5, 12);
    add('named10', 'Landmarks', 'Ten famous stars', 'Colonise ten of the 20 named stars.', namedClaimed, 10, 40);
    add('named20', 'Landmarks', 'All twenty', 'Colonise all 20 named stars.', namedClaimed, 20, 100);
    const star = (id, title, desc, names, m) => add(id, 'Landmarks', title, desc, () => claimedNames(names), names.length, m, { stars: names });
    star('belt', 'Orion’s Belt', 'Colonise the three belt stars: ζ, ε and δ Orionis.', ['ζ Ori', 'ε Ori', 'δ Ori'], 10);
    star('triangle', 'The Summer Triangle', 'Colonise Vega, Altair and Deneb.', ['Vega', 'Altair', 'Deneb'], 12);
    star('cross', 'The Southern Cross', 'Colonise Acrux, Mimosa, γ Crucis and δ Crucis.', ['Acrux', 'Mimosa', 'γ Cru', 'δ Cru'], 15);
    star('dipper', 'The Big Dipper', 'Colonise all seven bright stars of the Plough: α to η Ursae Majoris.', ['α UMa', 'β UMa', 'γ UMa', 'δ UMa', 'ε UMa', 'ζ UMa', 'η UMa'], 15);
    star('wtri', 'The Winter Triangle', 'Colonise Betelgeuse, Sirius and Procyon.', ['Betelgeuse', 'Sirius', 'Procyon'], 12);
    star('pointers', 'Follow the pointers', 'Colonise α and β Ursae Majoris, the Dipper’s pointers, and Polaris, the pole star they point to.', ['α UMa', 'β UMa', 'Polaris'], 10);
    star('twins', 'The Twins', 'Colonise Pollux and Castor (α Geminorum).', ['Pollux', 'α Gem'], 6);
    star('sptr', 'The Southern Pointers', 'Colonise Hadar and α Centauri.', ['Hadar', 'α2 Cen'], 8);
    star('gsq', 'The Great Square', 'Colonise α, β and γ Pegasi and α Andromedae, the corners of the Great Square.', ['α Peg', 'β Peg', 'γ Peg', 'α And'], 15);
    star('wcas', 'Cassiopeia’s W', 'Colonise the five stars of the W: α, β, γ, δ and ε Cassiopeiae.', ['α Cas', 'β Cas', 'γ Cas', 'δ Cas', 'ε Cas'], 15);
    star('harp', 'The Harp', 'Colonise Vega and its four companions: β, γ, δ² and ζ¹ Lyrae.', ['Vega', 'β Lyr', 'γ Lyr', 'δ2 Lyr', 'ζ1 Lyr'], 15);
    star('hyades', 'The Hyades', 'Colonise Aldebaran and the V of the Bull: γ, δ, ε and θ² Tauri.', ['Aldebaran', 'γ Tau', 'δ Tau', 'ε Tau', 'θ2 Tau'], 15);
    star('ncross', 'The Northern Cross', 'Colonise Deneb, γ, δ, ε and β¹ Cygni.', ['Deneb', 'γ Cyg', 'δ Cyg', 'ε Cyg', 'β1 Cyg'], 18);
    star('sickle', 'The Sickle of Leo', 'Colonise α, η, γ¹, ζ, μ and ε Leonis.', ['α Leo', 'η Leo', 'γ1 Leo', 'ζ Leo', 'μ Leo', 'ε Leo'], 20);
    star('royal', 'The Royal Stars', 'Colonise Aldebaran, Regulus (α Leonis), Antares and Fomalhaut, the four royal stars of Persia.', ['Aldebaran', 'α Leo', 'Antares', 'Fomalhaut'], 25);
    star('hunter', 'The Hunter', 'Colonise Betelgeuse, Rigel, γ, κ, ζ, ε and δ Orionis.', ['Betelgeuse', 'Rigel', 'γ Ori', 'κ Ori', 'ζ Ori', 'ε Ori', 'δ Ori'], 25);
    star('scorp', 'The Scorpion', 'Colonise Antares, λ, θ, ε, δ and β¹ Scorpii.', ['Antares', 'λ Sco', 'θ Sco', 'ε Sco', 'δ Sco', 'β1 Sco'], 25);
    star('whex', 'The Winter Hexagon', 'Colonise Sirius, Procyon, Pollux, Capella, Aldebaran and Rigel.', ['Sirius', 'Procyon', 'Pollux', 'Capella', 'Aldebaran', 'Rigel'], 30);
    star('teapot', 'The Teapot', 'Colonise the eight stars of Sagittarius’ teapot: λ, δ, ε, γ², ζ, τ, σ and φ.', ['λ Sgr', 'δ Sgr', 'ε Sgr', 'γ2 Sgr', 'ζ Sgr', 'τ Sgr', 'σ Sgr', 'φ Sgr'], 30);
    [['Orion', 30], ['Cassiopeia', 18], ['Lyra', 18], ['Crux', 20], ['Cygnus', 25], ['Ursa Major', 25], ['Gemini', 28], ['Canis Major', 28], ['Leo', 30], ['Taurus', 30], ['Scorpius', 30], ['Pegasus', 40]].forEach(([name, m]) => add('dv_' + name.replace(/ /g, ''), 'Landmarks', 'Develop ' + name, 'Colonise every star in ' + name + ' and develop each to at least 3 levels.', () => constDeveloped([name]), 1, m, { consts: [name] }));
    add('zodcol', 'Landmarks', 'The Zodiac', 'Colonise every star of all 12 zodiac constellations, the road of the Sun, Moon and planets.', zodiacColonised, 12, 300, { consts: ZODIAC });
    add('zoddev', 'Landmarks', 'The Zodiac, developed', 'Develop all 12 zodiac constellations.', () => constDeveloped(ZODIAC), 12, 500, { consts: ZODIAC });

    // the story opens up cheapest goal first (a stable sort, so chapters keep their own order)
    STORY.sort((a, b) => a.mins - b.mins);

    // ---- contracts: repeatable, scaled to how far along you are
    const TEMPLATES = [
      { key: 'claim', title: n => 'Colonise ' + n + ' star' + (n > 1 ? 's' : ''), counter: () => st().claimed, size: sc => 2 + Math.floor(sc * 3), mins: 1.2 },
      { key: 'upgrade', title: n => 'Make ' + n + ' upgrade' + (n > 1 ? 's' : ''), counter: () => st().upgrades, size: sc => 3 + Math.floor(sc * 8), mins: 0.8 },
      { key: 'collect', title: n => 'Collect revenue ' + n + ' times', counter: () => st().collects, size: sc => 5 + Math.floor(sc * 12), mins: 0.5 },
      { key: 'quiz', title: n => 'Answer ' + n + ' Sky School questions correctly', counter: () => qz().stats.correct, size: sc => 5 + Math.floor(sc * 6), mins: 0.8 },
      { key: 'route', title: n => 'Upgrade trade routes ' + n + ' time' + (n > 1 ? 's' : ''), counter: () => st().routeUps, size: sc => 1 + Math.floor(sc * 3), mins: 2 },
      { key: 'event', title: n => 'Resolve ' + (n > 1 ? n + ' comets or novae' : 'a comet or nova'), counter: () => st().eventsDone, size: sc => 1 + Math.floor(sc), mins: 6 },
      { key: 'messier', title: n => 'Survey ' + (n > 1 ? n + ' Messier objects' : 'a Messier object'), counter: () => count(G.state.messier), size: sc => 1, mins: 8 },
      { key: 'build', title: n => 'Construct or upgrade ' + n + ' building' + (n > 1 ? 's' : ''), counter: () => st().built + st().buildUps, size: sc => 1 + Math.floor(sc * 1.5), mins: 3 },
      { key: 'tech', title: n => 'Complete a research project', counter: () => st().techs, size: sc => 1, mins: 5 },
    ];
    const Q = () => { const q = G.state.quests; if (!q.claimed) q.claimed = {}; if (!q.contracts) q.contracts = []; return q; };
    const scale = () => Math.min(3, G.d.count / 40);

    function rewardFor(mins) {
      const D = G.d;
      return { cash: Math.max(60, D.totalRate * 60 * mins), research: Math.max(3, D.totalRes * 60 * mins * 0.6 + mins * 0.15) };
    }
    function topUp() {
      const q = Q();
      while (q.contracts.length < 3) {
        const used = new Set(q.contracts.map(c => c.key));
        const t = pick(TEMPLATES.filter(x => !used.has(x.key) && (x.key !== 'messier' || Object.keys(G.state.messier).length < 110) && (x.key !== 'tech' || G.techCount() < G.TECHS.length)));
        const target = t.size(scale());
        q.contracts.push({ id: ++q.seq, key: t.key, target, base: t.counter(), mins: t.mins * target });
      }
    }
    const tmpl = key => TEMPLATES.find(t => t.key === key);

    function contractState(c) {
      const t = tmpl(c.key), cur = Math.max(0, t.counter() - c.base);
      return { id: 'contract:' + c.id, kind: 'contract', title: t.title(c.target), cur: Math.min(cur, c.target), target: c.target, done: cur >= c.target, claimed: false, reward: rewardFor(c.mins) };
    }
    function storyState(d) {
      const cur = d.cur(), done = cur >= d.target, claimed = !!Q().claimed[d.id];
      return { id: d.id, kind: 'story', chapter: d.chapter, title: d.title, desc: d.desc, cur: Math.min(cur, d.target), target: d.target, done, claimed, reward: rewardFor(d.mins) };
    }
    // the chapters in the order a company meets them
    const CHAPTERS = ['Expansion', 'Revenue', 'Corporation', 'Development', 'Technology', 'Buildings', 'Routes', 'Flagships', 'Spectra', 'Messier', 'Landmarks', 'Skies', 'Petitions', 'Sky School', 'Academy'];
    const BLURB = {
      Expansion: 'A startup with one telescope and a dream. Every colony ship you send turns another point of light into a business.',
      Revenue: 'Cash is how a company keeps score. Collect it, let your treasury bank it, and watch the hourly numbers climb.',
      Corporation: 'Boards, shareholders and the press: the company grows up. Ranks come with colonies, and the share price with the market’s mood.',
      Development: 'A colony is only a claim until you build it up. Industry, Logistics and R&D, level by level, until whole constellations shine.',
      Technology: 'From Galileo’s spyglass to the warp drive: every breakthrough opens new buildings and new ways to earn.',
      Buildings: 'Observatories, launch pads, habitats and Dyson swarms: human technology, turned into slots filled on your colonies.',
      Routes: 'Trade routes between neighbouring stars carry the commerce. Better roads, stronger bonuses.',
      Flagships: 'Twenty stars are famous in every culture. Their vaults hold a day of royalties and never bank themselves, so keep coming back.',
      Spectra: 'Every star has a colour and a brightness, and each kind is worth something different: blue giants, yellow suns, red dwarfs.',
      Messier: 'Clusters, nebulae and galaxies. Survey them, then study them in depth for permanent bonuses.',
      Landmarks: 'The shapes people have traced in the sky for thousands of years: Orion’s Belt, the Summer Triangle, the Plough.',
      Skies: 'Comets and novae cut trade routes now and then. Redraw them and the sky repays you.',
      Petitions: 'Colonies write in with small requests. Granting them is good business and good manners.',
      'Sky School': 'Know the sky and it pays you back: constellations, stars and Messier objects, each reviewed until it sticks.',
      Academy: 'The Olympiad syllabus, topic by topic. Every level you earn is a permanent bonus to the whole company.',
    };
    // Everything that is ready to claim, then the next goal of every chapter (cheapest first). Pass a chapter to see all
    // that is left in it instead.
    function list(chapter) {
      fresh(); topUp();
      const story = STORY.map(storyState);
      const open = story.filter(x => !x.claimed);
      const chapters = CHAPTERS.map(name => {
        const all = story.filter(x => x.chapter === name);
        return { name, blurb: BLURB[name], total: all.length, done: all.filter(x => x.claimed).length, ready: all.filter(x => x.done && !x.claimed).length };
      });
      let visible;
      if (chapter && CHAPTERS.includes(chapter)) visible = open.filter(x => x.chapter === chapter).sort((a, b) => (b.done ? 1 : 0) - (a.done ? 1 : 0));
      else {
        const seen = new Set();
        visible = open.filter(x => x.done).concat(open.filter(x => !x.done && !seen.has(x.chapter) && seen.add(x.chapter)));
      }
      return { contracts: Q().contracts.map(contractState), story: visible, later: open.length - visible.length, claimedCount: story.length - open.length, total: story.length, chapters, chapter: chapter || null };
    }
    function readyCount() { fresh(); topUp(); return STORY.filter(d => !Q().claimed[d.id] && d.cur() >= d.target).length + Q().contracts.filter(c => contractState(c).done).length; }
    function claim(id) {
      fresh();
      const q = Q();
      if (id.startsWith('contract:')) {
        const k = q.contracts.findIndex(c => 'contract:' + c.id === id);
        if (k < 0) return { ok: false, msg: 'No such contract.' };
        const cs = contractState(q.contracts[k]);
        if (!cs.done) return { ok: false, msg: 'Not finished yet.' };
        G.grant(cs.reward.cash, cs.reward.research);
        q.contracts.splice(k, 1); topUp();
        return { ok: true, reward: cs.reward, title: cs.title };
      }
      const d = STORY.find(x => x.id === id);
      if (!d) return { ok: false, msg: 'No such quest.' };
      if (q.claimed[id]) return { ok: false, msg: 'Already claimed.' };
      const ss = storyState(d);
      if (!ss.done) return { ok: false, msg: 'Not finished yet.' };
      q.claimed[id] = G.now();
      G.grant(ss.reward.cash, ss.reward.research);
      return { ok: true, reward: ss.reward, title: ss.title };
    }
    function rerollContract(id) { // swap a contract you don't fancy for another (free)
      const q = Q(), k = q.contracts.findIndex(c => 'contract:' + c.id === id);
      if (k < 0) return false;
      q.contracts.splice(k, 1); topUp(); return true;
    }
    return { STORY, CHAPTERS, TEMPLATES, list, claim, readyCount, rerollContract };
  }
  return { create };
});
