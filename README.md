# Firmament

An incremental empire game on the real night sky. Play it in the browser: **https://darkpyxlz.github.io/SAO/**

Start on one star and slowly spread across the whole celestial sphere. The sky is **one flat map** that you
drag to pan, scroll or pinch to zoom, and that wraps around from 24h back to 0h without a seam (Miller
cylindrical projection, with a faint graticule and the ecliptic). Every star on the 88 constellation stick
figures is a node (757 of them, with their real positions, brightness and colour). The figure lines are your
trade routes; short "hyperlanes" join neighbouring constellations. All 110 Messier objects are special sites.
It is a solo, PvE game with no decay: nothing is ever taken from you, and no star has special powers.

Only the 20 most important stars carry proper names (the 19 brightest named stars, from Sirius to Deneb,
plus Polaris). Every other star is shown by its official designation: Bayer letter (β Ori), Flamsteed number
(61 Cyg), variable-star name, or HD / HIP catalogue number.

## How it plays

- **Starlight ✦** is produced by every claimed star and fills that star's *stockpile*. Visit the star and
  collect it. Stockpiles cap out (orange-red stars hold the most), which is the reason to keep coming back.
- **Claim** neighbouring stars by sending fleets along routes. Travel is slow (by real angular distance).
  Orders are paid up front and queue, so fleets keep chaining outward even while you are away.
- **Develop** stars: *Radiance* (more Starlight), *Beacon* (faster fleets, stronger routes, more fleet
  slots), *Observatory* (gathers **Insight ◉**).
- **Trade routes** between claimed neighbours boost both ends, more when their colours differ.
- **Messier objects** need a claimed star nearby plus Insight. Each type gives a bonus (globulars: fleet
  slots, open clusters: Starlight, nebulae: Insight, galaxies: speed) and is stamped into the Messier
  catalogue. Study one in depth to double its bonus.
- **Developed constellations**: claim every star and upgrade each to ≥3 levels. It is stamped in the Codex
  (with a page per constellation: chart, lore, stars, neighbours, your own notes) and unlocks one-tap
  collection. **Mastered** at ≥9 levels each.
- **Comets and novae** cut trade routes. Press *Redraw routes* and tap two stars to rebuild each missing
  line from memory: correct lines pay out, wrong guesses lower the payout, hints pay a quarter. Ignored
  events fade by themselves. Event clocks only run while the game is open, so they always wait for you.
- **Sky School** (gold button): five-question minigames that pay Starlight and Insight. *Constellations*:
  name a figure, pick the figure for a name, match a myth to a constellation, find a neighbour. *Stars*:
  which star is circled, what colour is it, which is brighter, which constellation is it in. *Messier*:
  what kind of object is this picture, which picture is a globular cluster / nebula / galaxy…, which
  constellation holds M42, which number is the Crab Nebula. Rewards scale with your income: ×2.5 the first
  time you get something right, a streak bonus, +50% for a perfect round, half for repeats (a trickle if
  repeated within 6 hours). Get something right twice and it is marked *learned* in the Codex. The Messier
  pictures are procedurally drawn illustrations of each object type (seeded per object), not photographs.
- **Petitions**: stars sometimes ask for an upgrade, an expansion or a visit, and reward you for it.

Progress autosaves to `localStorage`, with three manual slots and JSON export/import (Menu).
Time away is simulated when you come back (production up to each stockpile cap, fleets and expeditions).

## Running and developing

It is a static site with no build step for the game itself.

```sh
npm run serve        # http://localhost:8000
npm test             # engine tests: data integrity, economy pacing sketch, events, saves
```

| File | Purpose |
|---|---|
| `js/engine.js` | Pure game logic (no DOM). Costs, rates, fleets, orders, events, saves. |
| `js/quiz.js` | Sky School logic (no DOM): question builders, scoring, rewards, learned tracking. |
| `js/pics.js` | Procedural Messier-type illustrations (globular, open, spiral, elliptical, nebulae, planetary, remnant). |
| `js/sky.js` | Flat wrapping map renderer (Miller projection), pan/zoom/pick, codex mini-charts. |
| `js/ui.js` | Start screen, HUD, panels, Codex, redraw mode, saves, main loop. |
| `js/data.js` | Generated sky data (do not edit by hand). |
| `data/lore.json` | Constellation and Messier text, Messier→constellation table. |
| `scripts/build-data.mjs` | Regenerates `js/data.js` from the d3-celestial data files. |

To regenerate the data: `npm pack d3-celestial`, unpack it, then
`node scripts/build-data.mjs <package>/data`.

Tuning constants live in `CFG` at the top of `js/engine.js`. The test file includes a small bot that plays
30 days at three visits a day, to sanity-check pacing after changes. (Roughly: a casual player at three
visits a day claims every star in about 11 days; once a day takes around five weeks. Upgrades, Messier
objects and mastering all 88 constellations take considerably longer.)

## Publishing

The repository root is the site. In **Settings → Pages**, choose *Deploy from a branch → `main` → `/ (root)`*.

Sky data courtesy of d3-celestial (BSD-3), see [THIRD_PARTY.md](THIRD_PARTY.md).
