/* Territories: the ground nearest to each star on a torus (a Voronoi cell), limited to a reach around the star, as a convex
   polygon with every edge labelled by the star on its other side. Pure geometry, no DOM: used by the map to fill an empire's
   ground and draw its borders, and testable in Node.
   Coordinates are map units (right ascension in radians, Miller y) on a map that wraps by w across and h up and down. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Territory = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Keep the part of a convex polygon where nx*x + ny*y <= c. Edge k runs from vertex k to vertex k + 1 and carries tag[k];
  // the new edge along the cut gets `cut`.
  function clip(xs, ys, tags, nx, ny, c, cut) {
    const n = xs.length, ox = [], oy = [], ot = [];
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n;
      const ax = xs[k], ay = ys[k], bx = xs[k2], by = ys[k2];
      const da = nx * ax + ny * ay - c, db = nx * bx + ny * by - c;
      const ina = da <= 1e-12, inb = db <= 1e-12;
      if (ina) {
        ox.push(ax); oy.push(ay);
        if (inb) ot.push(tags[k]);
        else { // leaving: this edge ends where it crosses the line, and the line itself is the next edge
          const t = da / (da - db);
          ot.push(tags[k]);
          ox.push(ax + (bx - ax) * t); oy.push(ay + (by - ay) * t); ot.push(cut);
        }
      } else if (inb) { // entering: the edge continues from where it crosses the line
        const t = da / (da - db);
        ox.push(ax + (bx - ax) * t); oy.push(ay + (by - ay) * t); ot.push(tags[k]);
      }
    }
    return { xs: ox, ys: oy, tags: ot };
  }

  // pts: [[x, y], ...]. Returns one cell per point: { x, y, tag } with vertices relative to the point, counter-clockwise.
  function build(pts, o) {
    o = o || {};
    const W = o.w, H = o.h, R = o.reach, M = o.sides || 24;
    const n = pts.length;
    const wrapX = d => d - W * Math.floor(d / W + 0.5), wrapY = d => d - H * Math.floor(d / H + 0.5); // -> [-W/2, W/2)
    const cs = 2 * R, nx = Math.max(1, Math.floor(W / cs)), ny = Math.max(1, Math.floor(H / cs)), gw = W / nx, gh = H / ny;
    const grid = Array.from({ length: nx * ny }, () => []);
    const cellOf = (x, y) => [((Math.floor((((x % W) + W) % W) / gw)) % nx + nx) % nx, ((Math.floor((((y % H) + H) % H) / gh)) % ny + ny) % ny];
    pts.forEach((p, i) => { const [gx, gy] = cellOf(p[0], p[1]); grid[gy * nx + gx].push(i); });
    const circle = { xs: [], ys: [], tags: [] };
    for (let k = 0; k < M; k++) { const a = 2 * Math.PI * k / M; circle.xs.push(R * Math.cos(a)); circle.ys.push(R * Math.sin(a)); circle.tags.push(-1); }
    const cells = new Array(n);
    for (let i = 0; i < n; i++) {
      const [gx, gy] = cellOf(pts[i][0], pts[i][1]);
      const seen = new Set(), near = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const cx = ((gx + dx) % nx + nx) % nx, cy = ((gy + dy) % ny + ny) % ny, key = cy * nx + cx;
        if (seen.has(key)) continue;
        seen.add(key);
        for (const j of grid[key]) {
          if (j === i) continue;
          const ddx = wrapX(pts[j][0] - pts[i][0]), ddy = wrapY(pts[j][1] - pts[i][1]), d2 = ddx * ddx + ddy * ddy;
          if (d2 < 4 * R * R && d2 > 1e-14) near.push([d2, j, ddx, ddy]);
        }
      }
      near.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      let poly = circle;
      for (const [d2, j, ddx, ddy] of near) poly = clip(poly.xs, poly.ys, poly.tags, ddx, ddy, d2 / 2, j); // the points nearer to i than to j
      cells[i] = { x: Float32Array.from(poly.xs), y: Float32Array.from(poly.ys), tag: Int32Array.from(poly.tags) };
    }
    return cells;
  }

  function area(cell) {
    let a = 0;
    for (let k = 0; k < cell.x.length; k++) { const k2 = (k + 1) % cell.x.length; a += cell.x[k] * cell.y[k2] - cell.x[k2] * cell.y[k]; }
    return a / 2;
  }

  return { build, area, clip };
});
