import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.window = {};
const SKY = require('../js/data.js');
const Territory = require('../js/territory.js');

const RAD = Math.PI / 180, TAU = 2 * Math.PI;
const millerY = d => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * d * RAD));
const YP = 2 * millerY(90);
const wrapX = d => d - TAU * Math.floor(d / TAU + 0.5), wrapY = d => d - YP * Math.floor(d / YP + 0.5);
const sites = SKY.stars.map(s => [s[1] * RAD, millerY(s[2])]);

function inside(cell, x, y) { // point in a convex counter-clockwise polygon
  for (let k = 0; k < cell.x.length; k++) {
    const k2 = (k + 1) % cell.x.length;
    if ((cell.x[k2] - cell.x[k]) * (y - cell.y[k]) - (cell.y[k2] - cell.y[k]) * (x - cell.x[k]) < -1e-9) return false;
  }
  return true;
}

test('territory: a lattice of stars on a small torus shares it into equal squares', () => {
  const pts = [];
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) pts.push([1 + 2 * i, 1 + 2 * j]);
  const cells = Territory.build(pts, { w: 8, h: 8, reach: 1.6 });
  cells.forEach(c => {
    assert.ok(Math.abs(Territory.area(c) - 4) < 1e-9, 'each gets 2 by 2: ' + Territory.area(c));
    const xs = [...c.x], ys = [...c.y];
    assert.ok(Math.abs(Math.max(...xs) - 1) < 1e-6 && Math.abs(Math.min(...xs) + 1) < 1e-6 && Math.abs(Math.max(...ys) - 1) < 1e-6 && Math.abs(Math.min(...ys) + 1) < 1e-6);
    assert.ok([...c.tag].every(t => t >= 0), 'every side is shared with a neighbour');
  });
});

test('territory: with a reach that covers everything, the cells tile the whole wrapping sky', () => {
  const cells = Territory.build(sites, { w: TAU, h: YP, reach: 1.6 });
  let total = 0;
  cells.forEach((c, i) => {
    assert.ok(Territory.area(c) > 0, 'star ' + i + ' has ground');
    assert.ok(inside(c, 0, 0), 'a star lies inside its own cell');
    total += Territory.area(c);
  });
  assert.ok(Math.abs(total - TAU * YP) < 1e-4 * TAU * YP, 'the cells add up to the sky: ' + total.toFixed(4) + ' vs ' + (TAU * YP).toFixed(4));
});

test('territory: every border has a matching border on the other side, across the seams too', () => {
  const cells = Territory.build(sites, { w: TAU, h: YP, reach: 1.6 });
  let checked = 0;
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i];
    for (let k = 0; k < c.x.length; k++) {
      const j = c.tag[k];
      assert.ok(j !== -1, 'with a covering reach there is no outer edge');
      const k2 = (k + 1) % c.x.length, d = [wrapX(sites[j][0] - sites[i][0]), wrapY(sites[j][1] - sites[i][1])];
      if (Math.hypot(c.x[k2] - c.x[k], c.y[k2] - c.y[k]) < 1e-7) continue; // a zero-length sliver
      const o = cells[j];
      let found = false;
      for (let m = 0; m < o.x.length && !found; m++) {
        if (o.tag[m] !== i) continue;
        const m2 = (m + 1) % o.x.length;
        // the same segment seen from j, in i's coordinates, runs the other way
        found = Math.hypot(o.x[m] + d[0] - c.x[k2], o.y[m] + d[1] - c.y[k2]) < 1e-5 && Math.hypot(o.x[m2] + d[0] - c.x[k], o.y[m2] + d[1] - c.y[k]) < 1e-5;
      }
      assert.ok(found, 'edge ' + k + ' of star ' + i + ' towards ' + j + ' is mirrored');
      checked++;
    }
  }
  assert.ok(checked > 4000, 'checked ' + checked + ' borders');
});

test('territory: a short reach limits each cell to a disc, and marks the free edge', () => {
  const R = 0.25, cells = Territory.build(sites, { w: TAU, h: YP, reach: R });
  let outer = 0;
  cells.forEach((c, i) => {
    assert.ok(inside(c, 0, 0));
    assert.ok(Territory.area(c) <= Math.PI * R * R + 1e-9, 'never larger than the disc');
    for (let k = 0; k < c.x.length; k++) { assert.ok(Math.hypot(c.x[k], c.y[k]) <= R + 1e-6, 'within the reach'); if (c.tag[k] === -1) outer++; }
  });
  assert.ok(outer > 100, 'many stars are sparse enough to end in open sky: ' + outer);
  // a star's cell never reaches into the ground of its neighbour: every vertex is at least as near its own star
  for (let i = 0; i < cells.length; i += 7) {
    const c = cells[i];
    for (let k = 0; k < c.x.length; k++) for (const j of [c.tag[k]]) if (j >= 0) {
      const d = [wrapX(sites[j][0] - sites[i][0]), wrapY(sites[j][1] - sites[i][1])];
      assert.ok(Math.hypot(c.x[k] - 0, c.y[k] - 0) <= Math.hypot(c.x[k] - d[0], c.y[k] - d[1]) + 1e-6);
    }
  }
});
