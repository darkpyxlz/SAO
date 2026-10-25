/* Sky School: quiz logic (no DOM). Builds questions about constellations, stars and Messier objects,
   scores answers, pays rewards and tracks what the player has learned. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Quiz = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ROUND_LENGTH = 5;
  // Spaced repetition: an item is "learned" after LEARN_BOX correct answers, but an answer only counts toward that
  // once the review interval for the item's current box has passed. Early answers still pay a trickle but do not
  // advance the box; a wrong answer drops the item two boxes.
  const LEARN_BOX = 10;
  const MIN = 60e3, HOUR = 3600e3, DAY = 86400e3;
  const INTERVALS = [0, 10 * MIN, 30 * MIN, 2 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY, 4 * DAY, 7 * DAY, 14 * DAY]; // wait before the next counting review, by box reached
  const REWARD = { seconds: 150, firstTime: 2.5, reviewPerBox: 0.06, reviewMax: 1.6, tooSoon: 0.1, streakStep: 0.1, streakMax: 0.5, perfectBonus: 0.5 };

  const CATS = {
    const: { name: 'Constellations', blurb: 'Recognise figures, borders and myths.' },
    star: { name: 'Stars', blurb: 'Name stars, colours and brightness.' },
    messier: { name: 'Messier objects', blurb: 'Tell clusters, nebulae and galaxies apart.' },
    mixed: { name: 'Mixed round', blurb: 'A bit of everything.' },
  };

  function create(G, opts) {
    opts = opts || {};
    const rng = opts.rng || Math.random;
    const now = opts.now || Date.now;
    const SKY = G.SKY;
    const NC = SKY.consts.length, NM = SKY.messier.length;
    const CLASS = G.CLASS_NAMES;
    const named = SKY.stars.map((s, i) => i).filter(i => SKY.stars[i][7]);
    const typeNames = [...new Set(SKY.messier.map(m => m.tname))];
    const Q = () => G.state.quiz;

    const pick = arr => arr[Math.floor(rng() * arr.length)];
    function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    function sample(items, k, wfn, avoid) { // weighted sampling without replacement
      const pool = items.filter(x => !(avoid && avoid.has(x)));
      const out = [];
      while (out.length < k && pool.length) {
        const ws = pool.map(x => Math.max(1e-6, wfn ? wfn(x) : 1));
        let r = rng() * ws.reduce((a, b) => a + b, 0), idx = 0;
        for (; idx < ws.length - 1; idx++) { r -= ws[idx]; if (r <= 0) break; }
        out.push(pool.splice(idx, 1)[0]);
      }
      return out;
    }
    const rec = (cat, id) => Q()[cat][id];
    const label = i => SKY.stars[i][6];
    const isNamed = i => !!SKY.stars[i][7];

    // ---- what to ask about: unfamiliar items and the things you own come up more often
    // unseen items and items due for review come up most; ones not yet due (or already learned) rarely do
    function priority(cat, id) {
      const r = rec(cat, id);
      if (!r) return 2;
      if (r.learned) return now() >= (r.due || 0) ? 0.4 : 0.04;
      return now() >= (r.due || 0) ? 3 : 0.12;
    }
    const wConst = c => (G.consStatus(c).claimed ? 3 : 1) * priority('const', c);
    const wStar = i => (isNamed(i) ? 3 : G.state.stars[i] ? 1.5 : 0.0001) * priority('star', i);
    const wMessier = m => (G.state.messier[m] ? 3 : 1) * priority('messier', m);
    const allConst = [...Array(NC).keys()], allMessier = [...Array(NM).keys()];
    const starPool = () => SKY.stars.map((s, i) => i).filter(i => isNamed(i) || G.state.stars[i]);

    function constDistractors(c, k, avoid) {
      const n0 = SKY.consts[c].stars.length;
      return sample(allConst.filter(x => x !== c), k, x => 1 / (1 + Math.abs(SKY.consts[x].stars.length - n0)), avoid);
    }
    function opt(text, visual) { return visual ? { text, visual } : { text }; }
    // put the correct option at a random position
    function finish(q, correctOpt, others) {
      const opts = shuffle([correctOpt, ...others]);
      q.options = opts; q.answer = opts.indexOf(correctOpt);
      return q;
    }
    function maskLore(c) {
      const t = SKY.consts[c].lore, k = t.indexOf(',');
      return k > 0 ? '…' + t.slice(k) : t;
    }

    // ---- question builders. Each returns a question or null when it cannot be built.
    const BUILD = {
      'const-figure'() {
        const c = sample(allConst, 1, wConst)[0];
        const q = { kind: 'const-figure', cat: 'const', subject: { cat: 'const', id: c }, prompt: 'Which constellation is this?', visual: { type: 'figure', c } };
        return finish(q, opt(SKY.consts[c].name), constDistractors(c, 3).map(x => opt(SKY.consts[x].name)));
      },
      'const-pick'() {
        const c = sample(allConst, 1, wConst)[0];
        const q = { kind: 'const-pick', cat: 'const', subject: { cat: 'const', id: c }, prompt: 'Which figure is ' + SKY.consts[c].name + '?', visual: null };
        return finish(q, opt(SKY.consts[c].name, { type: 'figure', c }), constDistractors(c, 3).map(x => opt(SKY.consts[x].name, { type: 'figure', c: x })));
      },
      'const-lore'() {
        const c = sample(allConst, 1, wConst)[0];
        const q = { kind: 'const-lore', cat: 'const', subject: { cat: 'const', id: c }, prompt: 'Which constellation matches this description?', quote: maskLore(c), visual: null };
        return finish(q, opt(SKY.consts[c].name), constDistractors(c, 3).map(x => opt(SKY.consts[x].name)));
      },
      'const-neighbour'() {
        const c = sample(allConst, 1, wConst)[0];
        const nb = [...G.consNeighbours[c]];
        if (!nb.length) return null;
        const good = pick(nb);
        const avoid = new Set([c, ...nb]);
        const bad = sample(allConst, 3, null, avoid);
        const q = { kind: 'const-neighbour', cat: 'const', subject: { cat: 'const', id: c }, prompt: 'Which of these constellations borders ' + SKY.consts[c].name + '?', visual: null };
        q.extra = 'Neighbours: ' + nb.map(x => SKY.consts[x].name).sort().join(', ') + '.';
        return finish(q, opt(SKY.consts[good].name), bad.map(x => opt(SKY.consts[x].name)));
      },
      'star-marked'() {
        const i = sample(starPool(), 1, wStar)[0];
        if (i === undefined) return null;
        const c = SKY.stars[i][5];
        const sameForm = x => x !== i && isNamed(x) === isNamed(i);
        let cand = SKY.consts[c].stars.filter(sameForm);
        let others = sample(cand, 3, null);
        if (others.length < 3) others = others.concat(sample((isNamed(i) ? named : starPool()).filter(x => sameForm(x) && !others.includes(x)), 3 - others.length, null));
        if (others.length < 3) return null;
        const labels = new Set([label(i)]);
        const uniq = others.filter(x => !labels.has(label(x)) && labels.add(label(x)));
        if (uniq.length < 3) return null;
        const q = { kind: 'star-marked', cat: 'star', subject: { cat: 'star', id: i }, prompt: 'Which star is circled?', visual: { type: 'marked', c, star: i } };
        return finish(q, opt(label(i)), uniq.map(x => opt(label(x))));
      },
      'star-colour'() {
        const i = sample(starPool(), 1, wStar)[0];
        if (i === undefined) return null;
        const q = { kind: 'star-colour', cat: 'star', subject: { cat: 'star', id: i }, prompt: 'What colour is ' + label(i) + '?', visual: null };
        const right = CLASS[G.cls[i]];
        return finish(q, opt(right), CLASS.filter(x => x !== right).map(x => opt(x)));
      },
      'star-brighter'() {
        const i = sample(starPool(), 1, wStar)[0];
        if (i === undefined) return null;
        const pool = starPool().filter(x => x !== i && Math.abs(SKY.stars[x][3] - SKY.stars[i][3]) >= 0.5 && label(x) !== label(i));
        if (!pool.length) return null;
        const j = pick(pool);
        const winner = SKY.stars[i][3] < SKY.stars[j][3] ? i : j, loser = winner === i ? j : i;
        const q = { kind: 'star-brighter', cat: 'star', subject: { cat: 'star', id: i }, prompt: 'Which of these stars looks brighter in the sky?', visual: null };
        q.extra = label(winner) + ' is magnitude ' + SKY.stars[winner][3].toFixed(2) + ' and ' + label(loser) + ' is ' + SKY.stars[loser][3].toFixed(2) + ' (lower numbers are brighter).';
        return finish(q, opt(label(winner)), [opt(label(loser))]);
      },
      'star-const'() {
        const i = sample(named, 1, wStar)[0];
        const c = SKY.stars[i][5];
        const q = { kind: 'star-const', cat: 'star', subject: { cat: 'star', id: i }, prompt: 'Which constellation is ' + label(i) + ' in?', visual: null };
        return finish(q, opt(SKY.consts[c].name), constDistractors(c, 3).map(x => opt(SKY.consts[x].name)));
      },
      'm-pic-type'() {
        const m = sample(allMessier, 1, wMessier)[0];
        const M = SKY.messier[m];
        const q = { kind: 'm-pic-type', cat: 'messier', subject: { cat: 'messier', id: m }, prompt: 'What kind of object is this?', visual: { type: 'messier', m } };
        return finish(q, opt(M.tname), sample(typeNames.filter(t => t !== M.tname), 3).map(t => opt(t)));
      },
      'm-type-pic'() {
        const m = sample(allMessier, 1, wMessier)[0];
        const M = SKY.messier[m];
        const others = [];
        const types = sample(typeNames.filter(t => t !== M.tname), 3);
        for (const t of types) others.push(pick(allMessier.filter(x => SKY.messier[x].tname === t)));
        const q = { kind: 'm-type-pic', cat: 'messier', subject: { cat: 'messier', id: m }, prompt: 'Which picture shows a ' + M.tname.toLowerCase() + '?', visual: null };
        return finish(q, opt('M' + M.n, { type: 'messier', m }), others.map(x => opt('M' + SKY.messier[x].n, { type: 'messier', m: x })));
      },
      'm-name-type'() {
        const m = sample(allMessier, 1, wMessier)[0];
        const M = SKY.messier[m];
        const q = { kind: 'm-name-type', cat: 'messier', subject: { cat: 'messier', id: m }, prompt: 'What kind of object is ' + (M.alt ? 'the ' + M.alt + ' (M' + M.n + ')' : 'M' + M.n) + '?', visual: null };
        return finish(q, opt(M.tname), sample(typeNames.filter(t => t !== M.tname), 3).map(t => opt(t)));
      },
      'm-const'() {
        const m = sample(allMessier, 1, wMessier)[0];
        const M = SKY.messier[m];
        const q = { kind: 'm-const', cat: 'messier', subject: { cat: 'messier', id: m }, prompt: 'Which constellation holds ' + (M.alt ? 'the ' + M.alt + ' (M' + M.n + ')' : 'M' + M.n) + '?', visual: null };
        return finish(q, opt(SKY.consts[M.c].name), constDistractors(M.c, 3).map(x => opt(SKY.consts[x].name)));
      },
      'm-alt-num'() {
        const withAlt = allMessier.filter(m => SKY.messier[m].alt);
        const m = sample(withAlt, 1, wMessier)[0];
        const M = SKY.messier[m];
        const q = { kind: 'm-alt-num', cat: 'messier', subject: { cat: 'messier', id: m }, prompt: 'Which Messier number is the ' + M.alt + '?', visual: null };
        const bad = sample(allMessier.filter(x => x !== m), 3);
        return finish(q, opt('M' + M.n), bad.map(x => opt('M' + SKY.messier[x].n)));
      },
    };
    const KINDS = {
      const: ['const-figure', 'const-pick', 'const-lore', 'const-neighbour'],
      star: ['star-marked', 'star-colour', 'star-brighter', 'star-const'],
      messier: ['m-pic-type', 'm-type-pic', 'm-name-type', 'm-const', 'm-alt-num'],
    };

    function explain(q) {
      const s = q.subject;
      if (s.cat === 'const') { const c = SKY.consts[s.id]; return c.name + ' (' + c.en + '). ' + c.lore + (q.extra ? ' ' + q.extra : ''); }
      if (s.cat === 'star') {
        const st = SKY.stars[s.id], c = SKY.consts[st[5]];
        return st[6] + ': ' + CLASS[G.cls[s.id]].toLowerCase() + ' star in ' + c.name + ', magnitude ' + st[3].toFixed(2) + '.' + (q.extra ? ' ' + q.extra : '');
      }
      const M = SKY.messier[s.id];
      return 'M' + M.n + (M.alt ? ' (' + M.alt + ')' : '') + ': ' + M.tname.toLowerCase() + ' in ' + SKY.consts[M.c].name + ', magnitude ' + M.mag + '. ' + (M.note || '');
    }

    function question(cat, avoidKeys) {
      const kinds = shuffle(KINDS[cat]);
      for (let tries = 0; tries < 30; tries++) {
        const kind = kinds[tries % kinds.length];
        const q = BUILD[kind]();
        if (!q) continue;
        const key = q.subject.cat + ':' + q.subject.id;
        if (avoidKeys && avoidKeys.has(key)) continue;
        q.explain = explain(q);
        return q;
      }
      return null;
    }

    // ---- rounds
    function startRound(cat, length) {
      length = length || ROUND_LENGTH;
      const order = cat === 'mixed' ? ['const', 'star', 'messier'] : [cat];
      const qs = [], seen = new Set();
      for (let i = 0; i < length; i++) {
        const c = cat === 'mixed' ? shuffle(order)[0] : cat;
        const q = question(c, seen) || question(c);
        if (!q) continue;
        seen.add(q.subject.cat + ':' + q.subject.id);
        qs.push(q);
      }
      return { cat, qs, i: 0, correct: 0, streak: 0, best: 0, earned: { starlight: 0, insight: 0 }, answers: [], done: false, bonus: null };
    }
    function rewardBase() {
      const D = G.d;
      return { starlight: Math.max(40, D.totalRate * REWARD.seconds), insight: Math.max(2, D.totalIns * REWARD.seconds) };
    }
    function itemMultiplier(subject) {
      const r = rec(subject.cat, subject.id);
      if (!r || r.ok === 0) return { mult: REWARD.firstTime, counts: true, first: true };
      if (now() >= (r.due || 0)) return { mult: Math.min(REWARD.reviewMax, 1 + REWARD.reviewPerBox * (r.box || 0)), counts: true, first: false };
      return { mult: REWARD.tooSoon, counts: false, first: false };
    }
    function answer(round, choice) {
      if (round.done) return null;
      const q = round.qs[round.i];
      const correct = choice === q.answer;
      const st = Q().stats;
      st.answered++;
      const store = Q()[q.subject.cat];
      const r = store[q.subject.id] || (store[q.subject.id] = { ok: 0, bad: 0, last: 0, box: 0, due: 0, learned: 0 });
      if (r.box === undefined) { r.box = 0; r.due = 0; r.learned = 0; } // records from before spaced repetition
      let reward = { starlight: 0, insight: 0, item: 0, streak: 0 };
      let counted = false, learnedNow = false;
      if (correct) {
        const im = itemMultiplier(q.subject);
        const base = rewardBase(), streak = 1 + Math.min(REWARD.streakMax, REWARD.streakStep * round.streak);
        reward = { starlight: base.starlight * im.mult * streak, insight: base.insight * im.mult * streak, item: im.mult, streak, first: im.first };
        r.ok++; r.last = now(); st.correct++;
        if (im.counts) {
          counted = true; r.box = Math.min(LEARN_BOX, r.box + 1);
          r.due = now() + INTERVALS[r.box];
          if (r.box >= LEARN_BOX && !r.learned) { r.learned = now(); learnedNow = true; }
        }
        round.streak++; round.best = Math.max(round.best, round.streak); st.bestStreak = Math.max(st.bestStreak, round.streak);
        round.correct++;
        round.earned.starlight += reward.starlight; round.earned.insight += reward.insight;
        G.grant(reward.starlight, reward.insight);
      } else {
        r.bad++; round.streak = 0;
        r.box = Math.max(0, r.box - 2); r.due = now() + INTERVALS[r.box]; // come back to it soon
      }
      round.answers.push({ choice, correct });
      const res = { correct, answer: q.answer, explain: q.explain, reward, counted, learnedNow, box: r.box, learnedBox: LEARN_BOX, nextReviewMs: Math.max(0, r.due - now()), last: round.i === round.qs.length - 1 };
      round.i++;
      if (res.last) {
        round.done = true; st.rounds++;
        if (round.correct === round.qs.length) {
          const b = { starlight: round.earned.starlight * REWARD.perfectBonus, insight: round.earned.insight * REWARD.perfectBonus };
          round.bonus = b; st.perfect++; G.grant(b.starlight, b.insight);
        }
      }
      return res;
    }

    // ---- progress
    function learned(cat, id) { const r = Q()[cat][id]; return !!r && !!r.learned; }
    function boxOf(cat, id) { const r = Q()[cat][id]; return r ? (r.box || 0) : 0; }
    function isDue(cat, id) { const r = Q()[cat][id]; return !!r && !r.learned && now() >= (r.due || 0); }
    function progress(cat) {
      const store = Q()[cat];
      const ids = cat === 'const' ? allConst : cat === 'messier' ? allMessier : named;
      const out = { learned: ids.filter(i => learned(cat, i)).length, total: ids.length, started: ids.filter(i => store[i]).length, due: ids.filter(i => isDue(cat, i)).length };
      if (cat === 'star') { out.extra = Object.keys(store).filter(k => !isNamed(+k) && learned('star', +k)).length; out.due += Object.keys(store).filter(k => !isNamed(+k) && isDue('star', +k)).length; }
      return out;
    }
    function learnedTotal() { return ['const', 'star', 'messier'].reduce((n, c) => n + Object.values(Q()[c]).filter(r => r.learned).length, 0); }
    return { ROUND_LENGTH, LEARN_BOX, INTERVALS, REWARD, CATS, KINDS, question, startRound, answer, learned, boxOf, isDue, progress, learnedTotal, rewardBase, typeNames, named };
  }
  return { create, ROUND_LENGTH, LEARN_BOX, INTERVALS, REWARD, CATS };
});
