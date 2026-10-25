/* Olympiad Academy diagrams: procedural canvas drawings (telescope designs, mounts, optical defects, orbits, the Moon, spectra,
   the H–R diagram, galaxies...). Each figure draws into a 400 x 250 logical space; `labels` adds part names for the study pages.
   This file holds the framework and the telescope / optics drawings; figs-orbits.js and figs-stars.js add the rest. */
(function (root) {
  'use strict';
  const W = 400, H = 250, TAU = Math.PI * 2;
  const C = {
    bg: '#0a1124', panel: '#101a33', line: '#cfe0ff', dim: '#7c90b4', faint: '#2a3a5c', gold: '#f2c36b', cyan: '#6fd3ff', red: '#ff7b7b', green: '#7ee2a8',
    blue: '#7aa7ff', purple: '#b79bff', orange: '#ff9a5a', white: '#ffffff', metal: '#9fb0cc', metal2: '#5d6f8f', tube: '#16233f', tube2: '#1d2d52', glass: 'rgba(120,200,255,0.30)', wood: '#7a5230', wood2: '#5a3b20', sun: '#ffd25a',
  };

  const U = {
    path(g, pts, close) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); if (close) g.closePath(); },
    stroke(g, col, w, dash) { g.strokeStyle = col || C.line; g.lineWidth = w || 1.5; g.setLineDash(dash || []); g.stroke(); g.setLineDash([]); },
    line(g, x1, y1, x2, y2, col, w, dash) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); U.stroke(g, col, w, dash); },
    poly(g, pts, fill, stroke, w) { U.path(g, pts, true); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) U.stroke(g, stroke, w); },
    circle(g, x, y, r, fill, stroke, w) { g.beginPath(); g.arc(x, y, r, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) U.stroke(g, stroke, w); },
    ell(g, x, y, rx, ry, rot, fill, stroke, w) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) U.stroke(g, stroke, w); },
    rect(g, x, y, w, h, fill, stroke, lw, r) {
      r = Math.min(r || 0, w / 2, h / 2);
      g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) U.stroke(g, stroke, lw);
    },
    text(g, s, x, y, size, col, align, weight) { g.font = (weight || '500') + ' ' + (size || 12) + 'px system-ui, -apple-system, "Segoe UI", sans-serif'; g.fillStyle = col || C.line; g.textAlign = align || 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); },
    arrow(g, x1, y1, x2, y2, col, w, head) {
      head = head || 7; const a = Math.atan2(y2 - y1, x2 - x1);
      U.line(g, x1, y1, x2, y2, col, w);
      g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4)); g.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4)); g.closePath(); g.fillStyle = col || C.line; g.fill();
    },
    ray(g, pts, col, w) { U.path(g, pts); U.stroke(g, col || C.gold, w || 1.2); },
    // part label with a leader line from (px,py) to the text at (tx,ty)
    tag(g, px, py, tx, ty, s, align) {
      U.line(g, px, py, tx, ty, C.dim, 1);
      U.circle(g, px, py, 2.2, C.gold);
      const x = tx + (align === 'left' ? 4 : align === 'right' ? -4 : 0), y = ty + (ty < py ? -7 : 7);
      g.font = '600 12px system-ui, -apple-system, "Segoe UI", sans-serif';
      const w = (g.measureText(s) || {}).width || s.length * 6.2, x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
      g.fillStyle = 'rgba(10,17,36,0.78)'; g.fillRect(x0 - 3, y - 9, w + 6, 18);
      U.text(g, s, x, y, 12, C.gold, align || 'center', '600');
    },
    lens(g, cx, cy, h, w, fill, stroke) {
      g.beginPath(); g.moveTo(cx, cy - h / 2); g.quadraticCurveTo(cx + w, cy, cx, cy + h / 2); g.quadraticCurveTo(cx - w, cy, cx, cy - h / 2); g.closePath();
      g.fillStyle = fill || C.glass; g.fill(); U.stroke(g, stroke || C.cyan, 1.6);
    },
    hex(g, cx, cy, r, fill, stroke, rot) {
      g.beginPath(); for (let k = 0; k < 6; k++) { const a = (rot || 0) + k * TAU / 6; g[k ? 'lineTo' : 'moveTo'](cx + r * Math.cos(a), cy + r * Math.sin(a)); } g.closePath();
      if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) U.stroke(g, stroke, 1);
    },
    star(g, x, y, r, col) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col || '#fff'); gr.addColorStop(0.35, (col || '#fff')); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); },
    seeded(seed) { let a = seed | 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; },
    sky(g, seed, n) { const r = U.seeded(seed || 5); for (let i = 0; i < (n || 40); i++) U.circle(g, r() * W, r() * H, r() * 0.9 + 0.3, 'rgba(255,255,255,' + (0.25 + r() * 0.5) + ')'); },
  };

  const FIGS = {};
  const add = (name, fn) => { FIGS[name] = fn; };

  // draw a figure given as 'name' or 'name#param' into a canvas
  function draw(cv, spec, opts) {
    opts = opts || {};
    const [name, param] = String(spec).split('#');
    const fn = FIGS[name];
    const dpr = Math.min(2, root.devicePixelRatio || 1);
    const cw = cv.clientWidth || opts.width || 360, ch = cv.clientHeight || Math.round(cw * H / W);
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    const g = cv.getContext('2d');
    const k = Math.min(cv.width / W, cv.height / H);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = C.bg; g.fillRect(0, 0, cv.width, cv.height);
    g.setTransform(k, 0, 0, k, (cv.width - W * k) / 2, (cv.height - H * k) / 2);
    g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip();
    g.fillStyle = C.panel; g.fillRect(0, 0, W, H);
    if (!fn) U.text(g, 'figure: ' + name, W / 2, H / 2, 14, C.dim);
    else { g.lineCap = 'round'; g.lineJoin = 'round'; fn(g, param, !!opts.labels, U, C); }
    g.restore();
  }
  const has = spec => !!FIGS[String(spec).split('#')[0]];

  // =================================================================================================== telescope designs
  const SILVER = '#aab8d4', GOLDEN = '#e8c46a';
  const light = (g, pts, col) => U.ray(g, pts, col || C.gold, 1.3);

  add('tele.refractor', (g, p, lab) => {
    const y0 = 125;
    U.rect(g, 42, y0 - 40, 36, 80, C.tube2, C.metal2, 2, 3);          // dew shield
    U.rect(g, 70, y0 - 34, 222, 68, C.tube, C.metal2, 2, 4);          // main tube
    U.rect(g, 292, y0 - 14, 40, 28, C.tube2, C.metal2, 2, 3);          // focuser draw tube
    U.rect(g, 332, y0 - 10, 28, 20, C.tube2, C.metal2, 2, 3);          // eyepiece barrel
    U.lens(g, 98, y0, 66, 12);                                         // objective
    U.lens(g, 346, y0, 18, 4);                                         // eyepiece lens
    for (const h of [-26, -13, 0, 13, 26]) light(g, [[10, y0 + h], [98, y0 + h], [300, y0], [346, y0 - h * 0.17], [388, y0 - h * 0.17]]);
    U.circle(g, 300, y0, 3, C.red);
    if (lab) { U.tag(g, 98, y0 - 33, 98, 52, 'objective lens'); U.tag(g, 300, y0, 300, 190, 'focal point'); U.tag(g, 346, y0 + 10, 346, 196, 'eyepiece'); U.tag(g, 180, y0 - 34, 180, 70, 'sealed tube'); U.text(g, 'light', 24, y0 - 40, 11, C.dim); }
  });

  add('tele.newtonian', (g, p, lab) => {
    const y0 = 142, xp = 300, xd = 125;
    U.line(g, 60, y0 - 42, xd - 12, y0 - 42, C.metal2, 2.5); U.line(g, xd + 12, y0 - 42, xp, y0 - 42, C.metal2, 2.5);
    U.line(g, 60, y0 + 42, xp, y0 + 42, C.metal2, 2.5);
    U.rect(g, xp, y0 - 46, 10, 92, C.tube2, C.metal2, 2, 2);
    U.rect(g, xd - 10, 78, 20, 24, C.tube2, C.metal2, 2, 2);             // focuser
    U.rect(g, xd - 7, 56, 14, 24, C.tube, C.metal2, 2, 2);                // eyepiece
    g.beginPath(); g.moveTo(284, y0 - 42); g.quadraticCurveTo(310, y0, 284, y0 + 42); g.lineTo(xp, y0 + 42); g.lineTo(xp, y0 - 42); g.closePath(); g.fillStyle = SILVER; g.fill();
    U.line(g, xd - 10, y0 - 10, xd + 10, y0 + 10, SILVER, 5);             // diagonal flat
    const F = [xd, 92];
    for (const h of [-34, -24, 24, 34]) {
      const xs = 296 - 12 * (h / 42) * (h / 42), m = h / (xs - 75), xh = (xd - 75 * m) / (1 - m), yh = y0 + (xh - xd);
      light(g, [[10, y0 + h], [xs, y0 + h], [xh, yh], F]);
    }
    if (lab) { U.tag(g, 298, y0 + 20, 296, 226, 'primary mirror (concave)'); U.tag(g, xd - 4, y0 + 4, 120, 206, 'flat diagonal mirror'); U.tag(g, xd, 66, 70, 40, 'eyepiece'); U.text(g, 'open tube', 60, y0 + 56, 11, C.dim); }
  });

  // shared Cassegrain-style drawing: a primary with a central hole, a small secondary near the front, and the focus behind the primary
  function cassegrainLike(g, o) {
    const { y0, x1, xp, hole, hh, xs, focus } = o;
    g.beginPath(); // primary halves
    for (const sgn of [-1, 1]) {
      g.beginPath(); g.moveTo(xp - 14, y0 + sgn * hh); g.quadraticCurveTo(xp + 6, y0 + sgn * (hh + hole) / 2, xp - 14, y0 + sgn * hole); g.lineTo(xp + 4, y0 + sgn * hole); g.lineTo(xp + 4, y0 + sgn * hh); g.closePath(); g.fillStyle = SILVER; g.fill();
    }
    U.rect(g, xs - 5, y0 - 12, 8, 24, C.metal, C.metal2, 1, 3); // secondary
    for (const h of o.rays) {
      const xsurf = xp - 14 * (1 - (h / hh) * (h / hh) * 0.2), yy = y0 + h, ys = y0 + Math.sign(h) * (7 + Math.abs(h) / 40);
      light(g, [[10, yy], [xsurf, yy], [xs + 3, ys], [focus[0], focus[1]]]);
    }
  }
  add('tele.cassegrain', (g, p, lab) => {
    const y0 = 128, x1 = 60, xp = 290, hh = 46;
    U.line(g, x1, y0 - hh, xp + 4, y0 - hh, C.metal2, 2.5); U.line(g, x1, y0 + hh, xp + 4, y0 + hh, C.metal2, 2.5);
    U.rect(g, xp + 4, y0 - hh - 4, 10, 2 * hh + 8, C.tube2, C.metal2, 2, 2);
    U.rect(g, xp + 14, y0 - 12, 34, 24, C.tube2, C.metal2, 2, 2);
    U.rect(g, xp + 48, y0 - 9, 26, 18, C.tube, C.metal2, 2, 2);
    U.line(g, 112, y0 - 12, 112, y0 - hh, C.metal2, 1); U.line(g, 112, y0 + 12, 112, y0 + hh, C.metal2, 1);
    cassegrainLike(g, { y0, x1, xp, hole: 12, hh, xs: 110, focus: [xp + 50, y0], rays: [-38, -28, 28, 38] });
    U.circle(g, xp + 50, y0, 2.6, C.red);
    if (lab) { U.tag(g, xp - 8, y0 - 30, xp - 20, 40, 'primary mirror with a hole'); U.tag(g, 108, y0 - 6, 108, 40, 'convex secondary'); U.tag(g, xp + 50, y0, xp + 40, 196, 'focus behind the primary'); }
  });

  add('tele.sct', (g, p, lab) => {
    const y0 = 128, x1 = 96, xp = 262, hh = 52;
    g.fillStyle = '#2b1f1a'; g.fillRect(x1, y0 - hh - 4, xp - x1 + 14, 2 * hh + 8);
    g.strokeStyle = C.orange; g.lineWidth = 2; g.strokeRect(x1, y0 - hh - 4, xp - x1 + 14, 2 * hh + 8);
    U.rect(g, x1 - 6, y0 - hh - 4, 6, 2 * hh + 8, C.glass, C.cyan, 1.5, 2);      // corrector plate
    U.rect(g, xp + 14, y0 - 16, 30, 32, C.tube2, C.metal2, 2, 2);
    U.rect(g, xp + 44, y0 - 10, 34, 20, C.tube, C.metal2, 2, 2);
    cassegrainLike(g, { y0, x1, xp: xp, hole: 14, hh, xs: x1 + 8, focus: [xp + 50, y0], rays: [-42, -30, 30, 42] });
    U.circle(g, xp + 50, y0, 2.6, C.red);
    if (lab) { U.tag(g, x1 - 3, y0 - 30, x1 - 6, 52, 'corrector plate'); U.tag(g, xp - 8, y0 + 34, xp - 40, 200, 'spherical primary'); U.tag(g, x1 + 6, y0, x1 + 40, 40, 'secondary on the plate', 'left'); U.text(g, 'short, sealed tube', 190, 232, 11, C.dim); }
  });

  add('tele.dobsonian', (g, p, lab) => {
    // ground board, rocker box with its bearing, and the big tube tilted up
    U.rect(g, 96, 222, 208, 12, C.wood2, '#2b1d10', 1.5, 3);
    U.poly(g, [[118, 222], [128, 168], [272, 168], [282, 222]], C.wood, '#2b1d10', 1.5);
    U.circle(g, 200, 168, 34, C.wood2, '#2b1d10', 1.5);                                   // altitude bearing
    g.save(); g.translate(200, 168); g.rotate(-0.95);
    U.rect(g, -60, -28, 200, 56, C.tube, C.metal2, 2.5, 5);                               // the big tube
    U.rect(g, 128, -32, 14, 64, C.tube2, C.metal2, 2, 3);                                  // front ring
    U.rect(g, 100, -42, 14, 14, C.tube2, C.metal2, 1.5, 2); U.rect(g, 103, -52, 8, 11, C.metal, C.metal2, 1, 2); // focuser and eyepiece
    U.rect(g, 70, 28, 24, 7, C.tube2, C.metal2, 1, 2);                                    // finder
    g.restore();
    U.circle(g, 200, 168, 5, C.metal, C.metal2, 1);
    if (lab) { U.tag(g, 245, 196, 392, 196, 'rocker box (alt-azimuth)', 'right'); U.tag(g, 262, 120, 392, 70, 'Newtonian tube', 'right'); U.tag(g, 130, 228, 60, 206, 'turntable'); }
  });

  add('tele.segmented', (g, p, lab) => {
    U.sky(g, 9, 26);
    const cx = 200, cy = 128, s = 25, w = Math.sqrt(3) * s;
    for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) {
      if (Math.abs(q + r) > 2 || (q === 0 && r === 0)) continue;
      const x = cx + w * (q + r / 2), y = cy + s * 1.5 * r;
      U.hex(g, x, y, s - 1.2, GOLDEN, '#8a6a22', Math.PI / 6);
      U.hex(g, x - 3, y - 3, s * 0.45, 'rgba(255,245,200,0.35)', null, Math.PI / 6);
    }
    for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + k * TAU / 3; U.line(g, cx, cy, cx + 112 * Math.cos(a), cy + 112 * Math.sin(a), C.metal, 2.5); }
    U.circle(g, cx, cy, 8, C.metal, C.metal2, 1.5);
    if (lab) { U.tag(g, cx + 40, cy + 36, 392, 212, 'hexagonal segments (18 for JWST)', 'right'); U.tag(g, cx, cy, 90, 32, 'secondary mirror on struts'); }
  });

  add('tele.radio', (g, p, lab) => {
    U.sky(g, 21, 14);
    U.poly(g, [[190, 232], [210, 232], [206, 162], [194, 162]], C.tube2, C.metal2, 2);          // pedestal
    U.rect(g, 164, 228, 72, 10, C.tube2, C.metal2, 2, 3);
    g.save(); g.translate(200, 150); g.rotate(-0.55);
    const f = 62, w = 96;
    g.beginPath(); for (let x = -w; x <= w; x += 4) { const y = -x * x / (4 * f); x === -w ? g.moveTo(x, y) : g.lineTo(x, y); }
    for (let x = w; x >= -w; x -= 4) g.lineTo(x, -x * x / (4 * f) + 11);
    g.closePath(); const gr = g.createLinearGradient(-w, 0, w, 0); gr.addColorStop(0, '#dfe8f8'); gr.addColorStop(1, '#8696b6'); g.fillStyle = gr; g.fill(); U.stroke(g, '#f2f6ff', 1.2);
    U.line(g, 0, 11, 0, 30, C.metal2, 6);                                                         // hub
    U.line(g, -w, -w * w / (4 * f), 0, -f, C.metal2, 1.6); U.line(g, w, -w * w / (4 * f), 0, -f, C.metal2, 1.6); // feed legs
    U.rect(g, -8, -f - 10, 16, 14, C.metal, C.metal2, 1.5, 3);                                    // feed horn / receiver
    g.restore();
    const tipx = 200 + Math.sin(0.55) * 62 * -1 + 0, tipy = 150 - Math.cos(0.55) * 62;
    for (const k of [0, 1, 2, 3]) U.arrow(g, 250 + k * 34, 18 + k * 4, 214 + k * 30 + 4 * (k - 1), 84 + k * 6, 'rgba(126,226,168,0.75)', 1.3, 6);
    if (lab) { U.tag(g, 165, 78, 90, 44, 'feed horn at the focus', 'left'); U.tag(g, 120, 150, 40, 130, 'parabolic dish'); U.tag(g, 200, 200, 120, 220, 'mount and pedestal'); U.text(g, 'radio waves', 330, 22, 11, C.green); }
  });

  add('tele.array', (g, p, lab) => {
    // flat ground with a Y of rails and several dishes, in perspective
    const gr = g.createLinearGradient(0, 110, 0, H); gr.addColorStop(0, '#1d2740'); gr.addColorStop(1, '#2e3a55');
    g.fillStyle = gr; g.fillRect(0, 108, W, H - 108);
    U.line(g, 0, 108, W, 108, '#3a4a70', 1);
    const arms = [[200, 170, 200, 116], [200, 170, 30, 242], [200, 170, 370, 242]];
    for (const [x1, y1, x2, y2] of arms) U.line(g, x1, y1, x2, y2, '#51628c', 2.5);
    const dishes = [];
    arms.forEach(([x1, y1, x2, y2]) => [0.18, 0.42, 0.68, 0.95].forEach(t => dishes.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t])));
    dishes.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of dishes) {
      const sc = 0.55 + (y - 118) / 126 * 0.75;
      U.rect(g, x - 1.5 * sc, y - 12 * sc, 3 * sc, 14 * sc, C.metal2, null);
      U.ell(g, x, y - 16 * sc, 13 * sc, 8 * sc, -0.3, '#c9d6ee', C.metal2, 1);
      U.ell(g, x, y - 16 * sc, 8 * sc, 4.5 * sc, -0.3, '#7d8fb0');
    }
    if (lab) { U.tag(g, 262, 202, 340, 150, 'dishes along rails'); U.text(g, 'the baseline B sets the resolution θ ≈ λ/B', 200, 26, 12, C.gold); U.text(g, 'combined electronically', 200, 44, 11, C.dim); }
  });

  add('tele.space', (g, p, lab) => {
    U.sky(g, 33, 34);
    const gr = g.createRadialGradient(200, 330, 60, 200, 330, 150); gr.addColorStop(0, '#3a86d6'); gr.addColorStop(1, '#16335e');
    g.fillStyle = gr; g.beginPath(); g.arc(200, 330, 150, Math.PI, TAU); g.fill();
    g.save(); g.translate(200, 118); g.rotate(-0.26);
    for (const sgn of [-1, 1]) {          // solar panels on short booms
      const x0 = sgn > 0 ? 24 : -24 - 76;
      U.line(g, sgn * 4, 0, sgn * 26, 0, C.metal2, 3);
      U.rect(g, x0, -9, 76, 18, '#1d3f7d', '#7aa7ff', 1.5, 1);
      for (let k = 1; k < 5; k++) U.line(g, x0 + k * 15.2, -9, x0 + k * 15.2, 9, '#7aa7ff', 0.8);
    }
    g.restore();
    g.save(); g.translate(200, 118); g.rotate(-0.26 + Math.PI / 2);
    U.rect(g, -50, -22, 100, 44, '#c8d2e6', C.metal2, 2, 6);                 // body (tube)
    U.rect(g, -66, -26, 22, 52, '#e8c46a', '#8a6a22', 1.5, 3);                // aperture door / light shield
    U.rect(g, 50, -18, 24, 36, C.tube2, C.metal2, 2, 3);
    g.restore();
    U.line(g, 232, 100, 262, 70, C.metal, 2); U.circle(g, 266, 66, 7, '#e8eef9', C.metal2, 1.5);
    if (lab) { U.tag(g, 175, 92, 90, 34, 'open aperture and mirror'); U.tag(g, 150, 125, 56, 190, 'solar panels'); U.text(g, 'above the atmosphere', 330, 226, 11, C.cyan); }
  });

  // =================================================================================================== mounts
  add('mount.altaz', (g, p, lab) => {
    for (const x of [140, 200, 260]) U.line(g, 200, 170, x, 238, C.metal2, 3);
    U.rect(g, 191, 118, 18, 56, C.tube2, C.metal2, 2, 3);                     // vertical column
    U.rect(g, 166, 108, 68, 14, C.tube2, C.metal2, 2, 3);                      // fork base
    U.line(g, 172, 108, 172, 70, C.metal2, 5); U.line(g, 228, 108, 228, 70, C.metal2, 5);
    g.save(); g.translate(200, 74); g.rotate(-0.8);
    U.rect(g, -70, -16, 190, 32, C.tube, C.metal2, 2, 4); U.rect(g, 100, -20, 12, 40, C.tube2, C.metal2, 2, 3);
    g.restore();
    U.circle(g, 200, 74, 5, C.metal, C.metal2, 1);
    g.beginPath(); g.ellipse(200, 120, 60, 12, 0, 0.1 * Math.PI, 0.95 * Math.PI); U.stroke(g, C.green, 2); U.arrow(g, 143, 124, 140, 118, C.green, 2, 6);
    g.beginPath(); g.arc(200, 74, 60, -2.2, -0.4); U.stroke(g, C.cyan, 2); U.arrow(g, 237, 28, 245, 36, C.cyan, 2, 6);
    if (lab) { U.text(g, 'azimuth (turn about a vertical axis)', 110, 142, 11, C.green); U.text(g, 'altitude (tilt about a horizontal axis)', 300, 22, 11, C.cyan); U.text(g, 'two axes; the field slowly rotates when tracking', 200, 14, 11, C.dim); }
  });

  add('mount.equatorial', (g, p, lab) => {
    for (const x of [130, 200, 270]) U.line(g, 200, 176, x, 240, C.metal2, 3);
    U.rect(g, 192, 156, 16, 24, C.tube2, C.metal2, 2, 3);
    // polar axis tilted by the latitude (here ~40 degrees from the horizontal), pointing up and to the right at the pole
    const a = -0.7, ax = Math.cos(a), ay = Math.sin(a);
    g.save(); g.translate(200, 156); g.rotate(a);
    U.rect(g, 0, -9, 82, 18, C.tube2, C.metal2, 2.5, 4);                      // polar axis housing
    g.restore();
    const hx = 200 + 82 * ax, hy = 156 + 82 * ay;                              // head position
    g.save(); g.translate(hx, hy); g.rotate(a + Math.PI / 2);
    U.rect(g, -70, -7, 130, 14, C.tube2, C.metal2, 2, 3);                      // declination axis
    U.line(g, -70, 0, -105, 0, C.metal, 3); U.rect(g, -122, -14, 20, 28, C.metal2, '#3a4a70', 1.5, 3); // counterweight
    g.restore();
    g.save(); g.translate(hx + 30 * Math.cos(a + Math.PI / 2) * -1, hy + 30 * Math.sin(a + Math.PI / 2) * -1); g.rotate(a);
    U.rect(g, -20, -48, 170, 30, C.tube, C.metal2, 2, 4);                       // tube parallel to the polar axis (pointing near the pole)
    g.restore();
    U.line(g, hx + 90 * ax, hy + 90 * ay, hx + 150 * ax, hy + 150 * ay, C.gold, 1.4, [4, 4]);
    U.star(g, 372, 34, 12, '#fff3c0');
    if (lab) { U.text(g, 'polar axis points at the celestial pole', 200, 14, 11, C.gold); U.tag(g, 150, 118, 62, 90, 'declination axis', 'left'); U.tag(g, 200, 130, 70, 200, 'polar (right-ascension) axis', 'left'); U.text(g, 'one steady motion tracks the stars', 300, 218, 11, C.dim); }
  });

  // =================================================================================================== optical defects and diffraction
  add('opt.defect', (g, kind, lab) => {
    const y0 = 125;
    if (kind === 'chromatic') {
      U.lens(g, 130, y0, 130, 22);
      const Fb = 250, Fr = 310;
      for (const h of [-46, -28, 28, 46]) {
        light(g, [[10, y0 + h], [130, y0 + h], [Fb, y0], [Fb + 70, y0 - h * 70 / (Fb - 130)]], C.blue);
        light(g, [[10, y0 + h], [130, y0 + h], [Fr, y0], [Fr + 40, y0 - h * 40 / (Fr - 130)]], C.red);
      }
      U.circle(g, Fb, y0, 3.5, C.blue); U.circle(g, Fr, y0, 3.5, C.red);
      U.line(g, 10, y0, 390, y0, C.faint, 1, [3, 4]);
      if (lab) { U.text(g, 'blue focus', Fb - 18, y0 + 24, 11, C.blue); U.text(g, 'red focus', Fr + 14, y0 - 24, 11, C.red); U.text(g, 'a lens bends blue more than red', 200, 20, 12, C.gold); }
    } else if (kind === 'spherical') {
      U.lens(g, 130, y0, 140, 24);
      for (const h of [-56, -40, -22, 22, 40, 56]) {
        const f = 330 - Math.abs(h) * 1.7;                         // outer rays focus nearer the lens
        light(g, [[10, y0 + h], [130, y0 + h], [f, y0], [f + 50, y0 - h * 50 / (f - 130)]], Math.abs(h) > 30 ? C.orange : C.gold);
      }
      U.line(g, 10, y0, 390, y0, C.faint, 1, [3, 4]);
      U.circle(g, 330, y0, 3.5, C.gold); U.circle(g, 330 - 56 * 1.7, y0, 3.5, C.orange);
      if (lab) { U.text(g, 'edge rays focus closer than central rays', 200, 20, 12, C.gold); }
    } else {
      // a row of star images across the field
      const ys = kind === 'coma' ? 125 : 125, xs = [60, 130, 200, 270, 340];
      U.line(g, 30, ys + 56, 370, ys + 56, C.faint, 1, [3, 4]); U.text(g, 'edge of field', 60, ys + 70, 10, C.dim); U.text(g, 'centre', 200, ys + 70, 10, C.dim); U.text(g, 'edge of field', 340, ys + 70, 10, C.dim);
      xs.forEach((x, i) => {
        const d = (x - 200) / 140, a = Math.abs(d);
        g.save(); g.translate(x, ys); if (d < 0) g.scale(-1, 1);
        if (kind === 'coma') {
          const L = 4 + 38 * a;
          const gr = g.createLinearGradient(0, 0, L, 0); gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
          g.beginPath(); g.moveTo(-3, 0); g.lineTo(L, -L * 0.34); g.lineTo(L, L * 0.34); g.closePath(); g.fillStyle = gr; g.fill();
          U.circle(g, 0, 0, 3.4, '#fff');
        } else {
          g.rotate(Math.PI / 2);
          U.ell(g, 0, 0, 3.4 + 20 * a * a, 3.4, 0, 'rgba(255,255,255,0.9)');
          if (a > 0.1) U.ell(g, 0, 0, 3 + 12 * a, 1.2, 0, '#fff');
        }
        g.restore();
      });
      if (lab) U.text(g, kind === 'coma' ? 'comet-shaped star images, worse towards the edge' : 'star images stretched across the field (a line, then a line at right angles through focus)', 200, 20, 11, C.gold);
    }
  });

  add('opt.spikes', (g, n, lab) => {
    n = +n || 4;
    U.sky(g, 4, 20);
    const cx = 200, cy = 125;
    const spikes = n === 4 ? [45, 135, 225, 315] : n === 6 ? [90, 150, 210, 270, 330, 30] : n === 8 ? [0, 45, 90, 135, 180, 225, 270, 315] : [90, 270];
    for (const a of spikes) {
      const r = a * Math.PI / 180, L = 120, gr = g.createLinearGradient(cx, cy, cx + L * Math.cos(r), cy + L * Math.sin(r));
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.strokeStyle = gr; g.lineWidth = 2.2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + L * Math.cos(r), cy + L * Math.sin(r)); g.stroke();
    }
    U.star(g, cx, cy, 34, '#ffffff'); U.circle(g, cx, cy, 4, '#fff');
    if (lab) U.text(g, n + ' spikes', 200, 232, 12, C.gold);
  });

  const api = { draw, has, add, FIGS, C, U, W, H, names: () => Object.keys(FIGS) };
  root.Figs = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
