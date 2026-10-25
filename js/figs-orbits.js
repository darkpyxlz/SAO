/* Olympiad Academy diagrams, part 2: orbits, Lagrange points, the Moon's phases and comets. */
(function (root) {
  'use strict';
  const F = root.Figs || (typeof require === 'function' ? require('./figs.js') : null);
  if (!F) return;
  const { add, U, C, W, H } = F;
  const TAU = Math.PI * 2;
  const sun = (g, x, y, r) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.6); gr.addColorStop(0, 'rgba(255,220,100,0.95)'); gr.addColorStop(0.35, 'rgba(255,200,80,0.35)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.6, 0, TAU); g.fill(); U.circle(g, x, y, r, C.sun);
  };

  // =================================================================================================== the Moon's phases
  add('moon.phase', (g, kStr, lab) => {
    const k = +kStr || 0, cx = 200, cy = 118, R = 78;
    const phi = [0, 45, 90, 135, 180, 135, 90, 45][k] * Math.PI / 180, cosp = Math.cos(phi), mirror = k >= 5 ? -1 : 1;
    U.circle(g, cx, cy, R, '#161f33', '#33466e', 1.5);                              // the dark side, faintly lit by the Earth
    g.save(); g.translate(cx, cy); g.scale(mirror, 1);
    g.beginPath(); g.arc(0, 0, R, -Math.PI / 2, Math.PI / 2);                         // right limb
    for (let b = Math.PI / 2; b >= -Math.PI / 2 - 1e-6; b -= 0.1) g.lineTo(R * cosp * Math.cos(b), R * Math.sin(b)); // terminator
    g.closePath();
    const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.2, 0, 0, R * 1.1); gr.addColorStop(0, '#f6efd8'); gr.addColorStop(1, '#cfc7ad'); g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    for (const [x, y, r] of [[-22, -26, 20], [14, -34, 13], [-36, 8, 17], [8, 22, 21], [38, 2, 11], [-6, -4, 12], [30, 38, 9], [-26, 40, 10]]) U.circle(g, x, y, r, 'rgba(110,100,85,0.28)');
    g.restore(); g.restore();
    U.circle(g, cx, cy, R, null, '#4a5f8e', 1.2);
    if (lab) U.text(g, ['New Moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full Moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'][k], 200, 228, 14, C.gold, 'center', '600');
  });

  // =================================================================================================== orbit shapes
  add('orb.conics', (g, kind, lab) => {
    const fx = kind === 'circle' ? 200 : 150, fy = 125;
    const trace = (e, p, phiMax, col) => {
      g.beginPath();
      for (let a = -phiMax, first = true; a <= phiMax + 1e-9; a += 0.02) { const r = p / (1 + e * Math.cos(a)), x = fx - r * Math.cos(a), y = fy + r * Math.sin(a); if (first) { g.moveTo(x, y); first = false; } else g.lineTo(x, y); }
      U.stroke(g, col || C.cyan, 2.4);
    };
    if (kind === 'circle') { U.circle(g, fx, fy, 88, null, C.cyan, 2.4); U.circle(g, fx + 88, fy, 6, C.blue); }
    else if (kind === 'ellipse') { trace(0.6, 62, Math.PI, C.cyan); U.circle(g, fx - 38.75, fy, 6, C.blue); U.circle(g, 295, 125, 2.5, C.dim); }
    else if (kind === 'parabola') { trace(1, 80, 2.55, C.green); U.circle(g, fx - 40, fy, 6, C.blue); }
    else { trace(1.8, 60, 1.9, C.orange); U.circle(g, fx - 60 / 2.8, fy, 6, C.blue); const cxh = fx - 48.2; U.line(g, cxh, fy, cxh + 130, fy - 195, C.faint, 1, [4, 4]); U.line(g, cxh, fy, cxh + 130, fy + 195, C.faint, 1, [4, 4]); }
    sun(g, fx, fy, 9);
    if (lab) U.text(g, { circle: 'circle: e = 0', ellipse: 'ellipse: 0 < e < 1', parabola: 'parabola: e = 1', hyperbola: 'hyperbola: e > 1' }[kind] || kind, 200, 232, 13, C.gold, 'center', '600');
  });

  add('orb.ellipse', (g, p, lab) => {
    const cx = 200, cy = 128, a = 150, e = 0.7, b = a * Math.sqrt(1 - e * e), c = a * e;
    U.ell(g, cx, cy, a, b, 0, null, C.cyan, 2.2);
    U.line(g, cx - a, cy, cx + a, cy, C.faint, 1, [4, 4]); U.line(g, cx, cy - b, cx, cy + b, C.faint, 1, [4, 4]);
    sun(g, cx + c, cy, 9); U.circle(g, cx - c, cy, 3.5, C.dim, C.line, 1);
    U.circle(g, cx + a, cy, 4, C.blue); U.circle(g, cx - a, cy, 4, C.blue); U.circle(g, cx, cy - b, 4, C.blue);
    const t = 2.1; U.circle(g, cx + a * Math.cos(t), cy + b * Math.sin(t), 5, C.green);
    U.text(g, 'A', cx + a + 14, cy, 15, C.gold, 'center', '700'); U.text(g, 'B', cx - a - 14, cy, 15, C.gold, 'center', '700'); U.text(g, 'C', cx, cy - b - 12, 15, C.gold, 'center', '700');
    U.text(g, 'D', cx + c, cy + 24, 15, C.gold, 'center', '700'); U.text(g, 'E', cx - c, cy + 18, 15, C.gold, 'center', '700');
    if (lab) {
      U.text(g, 'a', cx + a / 2, cy - 9, 13, C.dim); U.text(g, 'b', cx + 9, cy - b / 2, 13, C.dim);
      U.text(g, 'A: perihelion, B: aphelion, C: end of minor axis, D: the Sun (focus), E: empty focus', 200, 236, 10.5, C.dim);
    }
  });

  add('orb.kepler2', (g, p, lab) => {
    const a = 150, e = 0.6, pl = a * (1 - e * e), Fx = 200 + a * e, Fy = 125, b = a * Math.sqrt(1 - e * e);
    const r = ph => pl / (1 + e * Math.cos(ph));
    const area = (p0, p1) => { let s = 0; const n = 400, d = (p1 - p0) / n; for (let i = 0; i < n; i++) { const m = p0 + (i + 0.5) * d; s += 0.5 * r(m) * r(m) * d; } return s; };
    const A1 = area(-0.62, 0.62);
    let lo = 0.001, hi = 1.5; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (area(Math.PI - m, Math.PI + m) < A1) lo = m; else hi = m; }
    const d2 = (lo + hi) / 2;
    const P = ph => [Fx + r(ph) * Math.cos(ph), Fy - r(ph) * Math.sin(ph)];
    U.ell(g, 200, 125, a, b, 0, null, C.cyan, 2);
    const wedge = (p0, p1, col) => { g.beginPath(); g.moveTo(Fx, Fy); for (let ph = p0; ph <= p1 + 1e-9; ph += 0.02) { const q = P(ph); g.lineTo(q[0], q[1]); } g.closePath(); g.fillStyle = col; g.fill(); U.stroke(g, col.replace('0.45', '1'), 1.5); };
    wedge(-0.62, 0.62, 'rgba(242,195,107,0.45)'); wedge(Math.PI - d2, Math.PI + d2, 'rgba(111,211,255,0.45)');
    sun(g, Fx, Fy, 8);
    if (lab) { U.text(g, 'equal areas in equal times', 200, 18, 13, C.gold, 'center', '600'); U.text(g, 'fast, near the Sun', 330, 70, 11, C.gold); U.text(g, 'slow, far from the Sun', 80, 70, 11, C.cyan); }
  });

  add('orb.hohmann', (g, p, lab) => {
    const cx = 200, cy = 125, r1 = 48, r2 = 105, a = (r1 + r2) / 2, c = a - r1;
    sun(g, cx, cy, 8);
    U.circle(g, cx, cy, r1, null, C.blue, 1.8); U.circle(g, cx, cy, r2, null, C.red, 1.8);
    g.beginPath(); for (let t = 0; t <= Math.PI + 1e-6; t += 0.04) { const x = cx - c + a * Math.cos(t), y = cy - Math.sqrt(a * a - c * c) * Math.sin(t); t === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } U.stroke(g, C.gold, 2.2, [6, 4]);
    U.circle(g, cx + r1, cy, 5, C.blue); U.circle(g, cx - r2, cy, 5, C.red);
    U.arrow(g, cx + r1, cy, cx + r1, cy - 26, C.green, 2.2, 7); U.arrow(g, cx - r2, cy, cx - r2, cy + 24, C.green, 2.2, 7);
    if (lab) { U.text(g, 'burn 1', cx + r1 + 22, cy - 26, 11, C.green); U.text(g, 'burn 2', cx - r2 - 4, cy + 38, 11, C.green); U.text(g, 'inner orbit', cx + r1 + 4, cy + 20, 11, C.blue, 'left'); U.text(g, 'outer orbit', cx - 10, cy + r2 + 12, 11, C.red); U.text(g, 'transfer ellipse: a = (r₁ + r₂)/2', 200, 14, 12, C.gold); }
  });

  add('orb.lagrange', (g, which, lab) => {
    const cx = 200, cy = 130, R = 95;
    U.circle(g, cx, cy, R, null, C.faint, 1.5);
    sun(g, cx, cy, 12); U.circle(g, cx + R, cy, 7, C.blue);
    const pts = { L1: [cx + R - 30, cy], L2: [cx + R + 30, cy], L3: [cx - R, cy], L4: [cx + R * Math.cos(Math.PI / 3), cy - R * Math.sin(Math.PI / 3)], L5: [cx + R * Math.cos(Math.PI / 3), cy + R * Math.sin(Math.PI / 3)] };
    U.line(g, cx, cy, pts.L4[0], pts.L4[1], C.faint, 1, [3, 4]); U.line(g, cx + R, cy, pts.L4[0], pts.L4[1], C.faint, 1, [3, 4]);
    U.line(g, cx, cy, pts.L5[0], pts.L5[1], C.faint, 1, [3, 4]); U.line(g, cx + R, cy, pts.L5[0], pts.L5[1], C.faint, 1, [3, 4]);
    U.arrow(g, cx + R + 18, cy - 18, cx + R + 22, cy - 40, C.dim, 1.4, 6);
    for (const k of Object.keys(pts)) {
      const hit = k === which;
      U.circle(g, pts[k][0], pts[k][1], hit ? 5 : 3.2, hit ? C.gold : C.dim);
      if (hit) U.circle(g, pts[k][0], pts[k][1], 11, null, C.gold, 2);
      if (lab) U.text(g, k, pts[k][0] + (k === 'L3' ? -14 : k === 'L4' || k === 'L5' ? 16 : 0), pts[k][1] + (k === 'L1' || k === 'L2' ? 16 : 0), 12, C.gold, 'center', '700');
    }
    U.text(g, 'Sun', cx, cy + 28, 11, C.dim); U.text(g, 'Earth', cx + R + 4, cy + 20, 11, C.blue);
    if (lab) U.text(g, 'not to scale: L1 and L2 are only 1.5 million km from Earth', 200, 236, 10.5, C.dim);
  });

  // =================================================================================================== comets
  add('sol.comet', (g, p, lab) => {
    U.sky(g, 12, 24);
    sun(g, 58, 125, 16);
    const x = 250, y = 120;
    // ion tail: straight, away from the Sun; dust tail: wider and curved
    const gi = g.createLinearGradient(x, y, 395, y - 12); gi.addColorStop(0, 'rgba(120,190,255,0.9)'); gi.addColorStop(1, 'rgba(120,190,255,0)');
    g.fillStyle = gi; g.beginPath(); g.moveTo(x, y - 3); g.lineTo(395, y - 20); g.lineTo(395, y - 6); g.lineTo(x, y + 3); g.closePath(); g.fill();
    const gd = g.createLinearGradient(x, y, 370, y + 50); gd.addColorStop(0, 'rgba(255,225,150,0.75)'); gd.addColorStop(1, 'rgba(255,225,150,0)');
    g.fillStyle = gd; g.beginPath(); g.moveTo(x, y - 4); g.quadraticCurveTo(320, y + 12, 372, y + 66); g.quadraticCurveTo(318, y + 40, x, y + 8); g.closePath(); g.fill();
    U.star(g, x, y, 15, 'rgba(235,245,255,0.9)'); U.circle(g, x, y, 3.2, '#fff');
    U.arrow(g, x - 6, y + 6, x - 52, y + 38, C.green, 1.8, 6);                       // motion
    if (lab) { U.text(g, 'ion tail (straight, blue)', 332, 70, 11, C.cyan); U.text(g, 'dust tail (curved, yellow)', 335, 206, 11, C.gold); U.text(g, 'direction of motion', x - 58, y + 54, 11, C.green); U.text(g, 'Sun', 58, 160, 11, C.dim); U.text(g, 'tails point away from the Sun', 200, 16, 12, C.gold); }
  });
})(typeof self !== 'undefined' ? self : this);
