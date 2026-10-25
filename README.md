# Firmament

A corporate expansion game on the real night sky. Play it in the browser: **https://darkpyxlz.github.io/SAO/**

You run a space corporation. Start with headquarters on one star and slowly colonise the whole celestial
sphere. The sky is **one flat map** that you drag to pan, scroll or pinch to zoom, and that wraps around from
24h back to 0h without a seam (Miller cylindrical projection, with a faint graticule and the ecliptic). Every
star on the 88 constellation stick figures is a possible colony (757 of them, with their real positions,
brightness and colour). The figure lines are your trade routes; short "hyperlanes" join neighbouring
constellations. All 110 Messier objects are survey sites. It is a solo, PvE game with no decay: nothing is
ever taken from you, and no star has special powers.

Only the 20 most important stars carry proper names (the 19 brightest named stars, from Sirius to Deneb,
plus Polaris). Every other star is shown by its official designation: Bayer letter (β Ori), Flamsteed number
(61 Cyg), variable-star name, or HD / HIP catalogue number.

## How it plays

- **Cash ($)** is earned by every colony and fills that colony's *storage*. Visit the colony and collect it.
  Storage caps out (orange-red stars hold the most), which is the reason to keep coming back.
- **Colonise** neighbouring stars by sending colony ships along routes. Travel is slow (by real angular
  distance). Charters are paid up front and queue, so ships keep chaining outward even while you are away.
- **Develop** colonies: *Industry* (more revenue), *Logistics* (faster ships, stronger routes, more fleet
  slots), *R&D* (produces **research points ◉**).
- **Surveys**: what a star holds (habitable moon, mineral belt, gas giants, ancient ruins, a pulsar…) is
  revealed when you colonise it, and tweaks its revenue, storage or research. It is fixed per star.
- **Trade routes** between neighbouring colonies boost both ends, more when their star colours differ.
- **Technology**: a 22-project tree of real human technology, from the refracting telescope (1608) through
  electric power, rockets, computers, solar cells, space stations, the internet, reusable rockets, fusion and
  space elevators to Dyson swarms and the warp drive. One project at a time, in real time (10 minutes for the
  first, up to 3 days for the last, about two weeks for the whole tree), and it keeps running while you are
  away. Each costs cash and research points, unlocks buildings and most give a company-wide bonus.
- **Buildings**: every three development levels open one building slot at a colony (the rings around the star;
  every building is drawn as a little satellite). 14 buildings, each up to level 3: Observatory, Commodity
  Exchange, Launch Pad, Solar Farm, Clearing House, Orbital Shipyard, Space Station (more slots), R&D Campus,
  Asteroid Mining Base, Orbital Habitat, Fusion Plant, Space Elevator (cheaper everything), Warp Gate, Dyson
  Swarm. Revenue buildings are priced by how fast they pay themselves back. *Regional* buildings reach a few hops
  along intact routes between colonies, so a cut route weakens them: a **Clearing House** auto-banks 50/70/90%
  of the revenue and research of every colony in range so it never sits in storage.
- **The corporation**: name your company, climb from *Startup* to *Cosmic Monopoly* as you colonise, and
  watch your **share price**, which follows the company's worth. Random **market conditions** (boom, tech
  bubble, space race, credit crunch, government contract) come and go while you play.
- **Messier objects** need a colony nearby plus research points. Each type gives a bonus (globulars: fleet
  slots, open clusters: revenue, nebulae: research, galaxies: speed) and is stamped into the Messier catalogue
  with its photograph. Study one in depth to double its bonus.
- **Routes and lanes**: upgrade any route between colonies (3 levels) for a bigger trade bonus and faster
  ships, or build entirely new **lanes** between nearby stars (dotted green lines when a star is selected).
- **Comets and novae** cut routes for a while. Redraw the missing lines from memory for cash, a bonus for a
  perfect redraw and research points. Their clocks only run while the game is open.
- **Developed constellations**: colonise every star and develop each to ≥3 levels. It is stamped in the Codex
  (with a page per constellation: chart, lore, stars, neighbours, your own notes) and unlocks one-tap
  collection. **Mastered** at ≥9 levels each.
- **Quests**: three repeatable *contracts* plus a long *story* chain (expansion, development, revenue, the
  corporation, technology, buildings, routes, Messier, comets, Sky School, landmark groups like Orion's Belt
  or the Southern Cross). Rewards are worth minutes of your revenue, so they keep pace as you grow.
- **Sky School** (gold button): five-question minigames that pay a little cash and research. *Constellations*:
  name a figure, pick the figure for a name, match a myth to a constellation, find a neighbour. *Stars*:
  which star is circled, what colour is it, which is brighter, which constellation is it in. *Messier*:
  what kind of object is this picture, which picture is a globular cluster / nebula / galaxy…, which
  constellation holds M42, which number is the Crab Nebula. Rewards are deliberately modest (about 40 seconds
  of your revenue per correct answer, ×2 the first time you get something right, plus small streak and
  perfect-round bonuses). It runs on **spaced repetition**: an item is only *learned* after **10 correct
  answers**, and each one only counts once its review interval has passed (10 min → 30 min → 2 h → 6 h →
  12 h → 1 d → 2 d → 4 d → 7 d → 14 d); answering early pays a trickle but does not advance it, and a wrong
  answer sends the item back two steps. Items that are due come up most often.
- **Learning** (Codex → Learning): per-category progress bars, every item you have practised with ten pips,
  its next review time and right/wrong counts, filters for due / waiting / learned, and a *Review due items*
  button that starts a round about exactly those. Messier questions use real photographs (with procedural
  illustrations as the fallback).
- **Petitions**: colonies sometimes ask for an upgrade, an expansion or a collection, and reward you for it.

Progress autosaves to `localStorage`, with three manual slots and JSON export/import (Menu). Time away is
simulated when you come back (revenue up to each storage cap, colony ships, survey missions and technology).
Saves from earlier versions (Starlight, Insight and hubs) are converted: hubs become the matching buildings and
unlock the technology they need.

## Pace

Slowed down by about 2× since the first version, with quizzes nerfed. Roughly: a casual player visiting three
times a day has colonised all 757 stars in about three weeks; once a day takes around eight. Researching the
whole tree, filling the building slots, mastering all 88 constellations, surveying the Messier catalogue and
learning every item in Sky School take considerably longer.

## Running and developing

It is a static site with no build step for the game itself.

```sh
npm run serve        # http://localhost:8000
npm test             # engine tests: data integrity, economy, buildings, tech, events, saves, pacing sketch
```

| File | Purpose |
|---|---|
| `js/corp.js` | Corporation data: buildings, technology tree, star survey traits, ranks, market conditions. |
| `js/engine.js` | Pure game logic (no DOM). Costs, rates, fleets, orders, buildings, tech, events, saves. |
| `js/quiz.js` | Sky School logic (no DOM): question builders, scoring, rewards, spaced repetition. |
| `js/quests.js` | Quests: story chain and repeatable contracts (progress derived from game state). |
| `js/pics.js` | Messier pictures: loads `img/messier/` photos, with procedural illustrations as placeholder/fallback. |
| `img/messier/` | 110 resized Messier photographs (provenance in THIRD_PARTY.md). |
| `js/sky.js` | Flat wrapping map renderer (Miller projection), pan/zoom/pick, codex mini-charts. |
| `js/ui.js` | Start screen, HUD, panels, corporation, Codex, redraw mode, saves, main loop. |
| `js/data.js` | Generated sky data (do not edit by hand). |
| `data/lore.json` | Constellation and Messier text, Messier→constellation table. |
| `scripts/build-data.mjs` | Regenerates `js/data.js` from the d3-celestial data files. |

To regenerate the data: `npm pack d3-celestial`, unpack it, then
`node scripts/build-data.mjs <package>/data`.

Tuning constants live in `CFG` at the top of `js/engine.js`; building and technology numbers are in
`js/corp.js`. The test file includes a small bot that plays 30 days at three visits a day, to sanity-check
pacing after changes.

## Publishing

The repository root is the site. In **Settings → Pages**, choose *Deploy from a branch → `main` → `/ (root)`*.

Sky data courtesy of d3-celestial (BSD-3); Messier photographs from the messier-api package, resized (their
per-image credits are not recorded upstream). See [THIRD_PARTY.md](THIRD_PARTY.md).
