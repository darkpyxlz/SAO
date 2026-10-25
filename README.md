# Firmament

An incremental empire game on the real night sky. Play it in the browser: **https://darkpyxlz.github.io/SAO/**

Start on one star and slowly spread across the whole celestial sphere. Every star on the 88 constellation
stick figures is a node (757 of them, with their real positions, brightness and colour). The figure lines
are your trade routes; short "hyperlanes" join neighbouring constellations. All 110 Messier objects are
special sites. It is a solo, PvE game with no decay: nothing is ever taken from you.

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
- **Wonders**: famous named stars (Sirius, Canopus, Betelgeuse, Algol, Mira…) with a unique power; claim for
  half power, run an Observatory project for the rest. Sets such as the Royal Stars or the Summer Triangle
  give bonuses too.
- **Developed constellations**: claim every star and upgrade each to ≥3 levels. It is stamped in the Codex
  (with a page per constellation: chart, lore, stars, neighbours, your own notes) and unlocks one-tap
  collection. **Mastered** at ≥9 levels each.
- **Comets and novae** cut trade routes. Press *Redraw routes* and tap two stars to rebuild each missing
  line from memory: correct lines pay out, wrong guesses lower the payout, hints pay a quarter. Ignored
  events fade by themselves. Event clocks only run while the game is open, so they always wait for you.
- **Petitions**: stars sometimes ask for an upgrade, an expansion or a visit, and reward you for it.

Progress autosaves to `localStorage`, with three manual slots and JSON export/import (Menu).
Time away is simulated when you come back (production up to each stockpile cap, fleets, wonder projects).

## Running and developing

It is a static site with no build step for the game itself.

```sh
npm run serve        # http://localhost:8000
npm test             # engine tests: data integrity, economy pacing sketch, events, saves
```

| File | Purpose |
|---|---|
| `js/engine.js` | Pure game logic (no DOM). Costs, rates, fleets, orders, events, wonders, saves. |
| `js/sky.js` | Stereographic canvas renderer, pan/zoom/pick, codex mini-charts. |
| `js/ui.js` | Start screen, HUD, panels, Codex, redraw mode, saves, main loop. |
| `js/data.js` | Generated sky data (do not edit by hand). |
| `data/lore.json` | Constellation and Messier text, Messier→constellation table. |
| `scripts/build-data.mjs` | Regenerates `js/data.js` from the d3-celestial data files. |

To regenerate the data: `npm pack d3-celestial`, unpack it, then
`node scripts/build-data.mjs <package>/data`.

Tuning constants live in `CFG` at the top of `js/engine.js`. The test file includes a small bot that plays
30 days at three visits a day, to sanity-check pacing after changes.

## Publishing

The repository root is the site. In **Settings → Pages**, choose *Deploy from a branch → `main` → `/ (root)`*.

Sky data courtesy of d3-celestial (BSD-3), see [THIRD_PARTY.md](THIRD_PARTY.md).
