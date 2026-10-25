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
    const claimedNames = names => names.filter(n => { const i = G.nameIdx.get(n); return i !== undefined && G.state.stars[i]; }).length;
    const namedClaimed = () => SKY.stars.reduce((n, s, i) => n + (s[7] && G.state.stars[i] ? 1 : 0), 0);
    const blds = () => G.allBuildings();
    const messierKinds = () => new Set(Object.keys(G.state.messier).map(m => SKY.messier[m].kind)).size;
    const count = o => Object.keys(o).length;
    const learnedAll = () => learnedCount('const') + learnedCount('star') + learnedCount('messier');
    const colonisedClass = letter => SKY.stars.reduce((n, s, i) => n + (G.state.stars[i] && G.profileOf(i).letter === letter ? 1 : 0), 0);

    // [id, chapter, title, description, current(), target, reward minutes of income]
    const STORY = [];
    const add = (id, chapter, title, desc, cur, target, mins) => STORY.push({ id, chapter, title, desc, cur, target, mins });

    [[5, 3], [15, 6], [40, 12], [100, 25], [250, 50], [500, 90], [757, 240]].forEach(([n, m]) => add('claim' + n, 'Expansion', n === 757 ? 'The whole sky' : 'Colonise ' + n + ' stars', n === 757 ? 'Colonise every star on the constellation figures.' : 'Grow the company to ' + n + ' colonies.', () => G.d.count, n, m));
    [[10, 4], [50, 10], [200, 30], [600, 90]].forEach(([n, m]) => add('upg' + n, 'Development', 'Make ' + n + ' upgrades', 'Raise Industry, Logistics and R&D on your colonies ' + n + ' times in total.', () => st().upgrades, n, m));
    [[1, 8], [5, 20], [15, 50], [40, 120], [88, 400]].forEach(([n, m]) => add('dev' + n, 'Development', n === 1 ? 'Your first developed constellation' : 'Develop ' + n + ' constellations', 'Colonise every star in a constellation and develop each one to at least 3 levels.', () => count(G.state.devConst), n, m));
    [[1, 25], [5, 80], [20, 250]].forEach(([n, m]) => add('mast' + n, 'Development', n === 1 ? 'Master a constellation' : 'Master ' + n + ' constellations', 'Develop every colony in a constellation to at least 9 levels.', () => count(G.state.masterConst), n, m));
    add('collect20', 'Revenue', 'Gather the revenue', 'Collect revenue from colonies 20 times.', () => st().collects, 20, 4);
    add('collect200', 'Revenue', 'Seasoned collector', 'Collect revenue from colonies 200 times.', () => st().collects, 200, 20);
    // the company
    [[2, 15], [3, 40], [4, 120], [5, 300], [6, 800]].forEach(([n, m]) => add('rank' + n, 'Corporation', 'Become a ' + G.RANKS[n].title, 'Reach ' + G.RANKS[n].at + ' colonies and be promoted to ' + G.RANKS[n].title + '.', () => G.rankInfo().idx, n, m));
    add('market3', 'Corporation', 'Ride the market', 'Live through 3 market conditions (booms, bubbles, crunches...) while you are playing.', () => st().marketEvents, 3, 20);
    add('classG', 'Corporation', 'A star like ours', 'Colonise 5 yellow G-class stars. The Sun is G2V.', () => colonisedClass('G'), 5, 30);
    add('classM', 'Corporation', 'Red giants and dwarfs', 'Colonise 10 red M-class stars: the commonest in the galaxy, and big on storage.', () => colonisedClass('M'), 10, 40);
    // technology
    add('tech1', 'Technology', 'First breakthrough', 'Complete your first research project (Corporation → Technology).', () => G.techCount() - 1, 1, 8);
    add('tech8', 'Technology', 'Eight breakthroughs', 'Complete 8 research projects.', () => G.techCount() - 1, 8, 40);
    add('tech15', 'Technology', 'Technology leader', 'Complete 15 research projects.', () => G.techCount() - 1, 15, 150);
    add('tech21', 'Technology', 'Every technology', 'Complete every research project, from the telescope to the warp drive.', () => G.techCount() - 1, G.TECHS.length - 1, 500);
    // buildings
    add('bld1', 'Buildings', 'Break ground', 'Build your first building. Every three development levels on a colony open a building slot.', () => blds().length, 1, 12);
    add('bldclear', 'Buildings', 'Hands-free revenue', 'Build a Clearing House: it banks the revenue of a whole region automatically.', () => blds().filter(b => b.id === 'clearing').length, 1, 20);
    add('station', 'Buildings', 'Room to grow', 'Build a Space Station to add building slots to a colony.', () => blds().filter(b => b.id === 'station').length, 1, 60);
    add('bld10', 'Buildings', 'Ten buildings', 'Have 10 buildings standing at once.', () => blds().length, 10, 40);
    add('bldtypes', 'Buildings', 'A diversified portfolio', 'Build 8 different kinds of building.', () => new Set(blds().map(b => b.id)).size, 8, 120);
    add('bldlvl3', 'Buildings', 'Fully built', 'Raise any building to level 3.', () => blds().reduce((m, b) => Math.max(m, b.lvl), 0), 3, 80);
    add('bld40', 'Buildings', 'A building boom', 'Have 40 buildings standing at once.', () => blds().length, 40, 200);
    add('dyson1', 'Buildings', 'Wrap a star', 'Build a Dyson Swarm.', () => blds().filter(b => b.id === 'dyson').length, 1, 400);
    // routes
    add('route5', 'Routes', 'Better roads', 'Upgrade trade routes 5 times.', () => st().routeUps, 5, 10);
    add('route30', 'Routes', 'Highways of light', 'Upgrade trade routes 30 times.', () => st().routeUps, 30, 80);
    [[1, 6], [5, 20], [15, 50], [40, 120], [110, 600]].forEach(([n, m]) => add('mes' + n, 'Messier', n === 110 ? 'The Messier Marathon' : n === 1 ? 'First deep-sky object' : 'Catalogue ' + n + ' Messier objects', 'Send survey missions to Messier objects and catalogue them.', () => count(G.state.messier), n, m));
    add('meskinds', 'Messier', 'A little of everything', 'Catalogue a globular cluster, an open cluster, a nebula and a galaxy.', messierKinds, 4, 30);
    [[1, 6], [5, 25], [15, 80]].forEach(([n, m]) => add('event' + n, 'Skies', n === 1 ? 'Mend the sky' : 'Resolve ' + n + ' comets and novae', 'Redraw the trade routes cut by a comet or nova.', () => st().eventsDone, n, m));
    add('perfect3', 'Skies', 'A steady hand', 'Redraw three events perfectly, with no misses and no hints.', () => st().perfect, 3, 60);
    [[20, 4], [100, 20], [400, 80]].forEach(([n, m]) => add('quiz' + n, 'Sky School', 'Answer ' + n + ' questions correctly', 'Play Sky School rounds.', () => qz().stats.correct, n, m));
    add('learn1', 'Sky School', 'Something learned', 'Get one item through all 10 spaced reviews and mark it learned.', learnedAll, 1, 40);
    add('learn5', 'Sky School', 'Five things learned', 'Learn any five constellations, stars or Messier objects.', learnedAll, 5, 120);
    add('learn25', 'Sky School', 'A well-read sky', 'Learn 25 things for good.', learnedAll, 25, 500);
    add('perfectq', 'Sky School', 'Flawless', 'Finish a Sky School round with every answer right.', () => qz().stats.perfect, 1, 8);
    add('named5', 'Landmarks', 'Five famous stars', 'Colonise five of the 20 named stars.', namedClaimed, 5, 12);
    add('named20', 'Landmarks', 'All twenty', 'Colonise all 20 named stars.', namedClaimed, 20, 100);
    add('belt', 'Landmarks', 'Orion’s Belt', 'Colonise the three belt stars: ζ, ε and δ Orionis.', () => claimedNames(['ζ Ori', 'ε Ori', 'δ Ori']), 3, 10);
    add('triangle', 'Landmarks', 'The Summer Triangle', 'Colonise Vega, Altair and Deneb.', () => claimedNames(['Vega', 'Altair', 'Deneb']), 3, 12);
    add('cross', 'Landmarks', 'The Southern Cross', 'Colonise Acrux, Mimosa, Gacrux and δ Crucis.', () => claimedNames(['Acrux', 'Mimosa', 'Gacrux', 'δ Cru']), 4, 15);
    add('dipper', 'Landmarks', 'The Big Dipper', 'Colonise all seven bright stars of the Plough: α to η Ursae Majoris.', () => claimedNames(['α UMa', 'β UMa', 'γ UMa', 'δ UMa', 'ε UMa', 'ζ UMa', 'η UMa']), 7, 15);

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
    // everything claimable first, then the next few unfinished goals, then (collapsed in the UI) the rest
    function list() {
      topUp();
      const story = STORY.map(storyState);
      const open = story.filter(x => !x.claimed);
      const visible = [], rest = [];
      let shown = 0;
      for (const x of open) { if (x.done || shown < 6) { visible.push(x); if (!x.done) shown++; } else rest.push(x); }
      return { contracts: Q().contracts.map(contractState), story: visible, later: rest.length, claimedCount: story.length - open.length, total: story.length };
    }
    function readyCount() { topUp(); return STORY.filter(d => !Q().claimed[d.id] && d.cur() >= d.target).length + Q().contracts.filter(c => contractState(c).done).length; }
    function claim(id) {
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
      q.claimed[id] = Date.now();
      G.grant(ss.reward.cash, ss.reward.research);
      return { ok: true, reward: ss.reward, title: ss.title };
    }
    function rerollContract(id) { // swap a contract you don't fancy for another (free)
      const q = Q(), k = q.contracts.findIndex(c => 'contract:' + c.id === id);
      if (k < 0) return false;
      q.contracts.splice(k, 1); topUp(); return true;
    }
    return { STORY, TEMPLATES, list, claim, readyCount, rerollContract };
  }
  return { create };
});
