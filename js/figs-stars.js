/* Olympiad Academy diagrams, part 3: the H–R diagram, spectra, light curves, galaxies and the expanding universe. */
(function (root) {
  'use strict';
  const F = root.Figs || (typeof require === 'function' ? require('./figs.js') : null);
  if (!F) return;
  const { add, U, C } = F;
  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const TCOL = ['#9bb7ff', '#aabfff', '#cad7ff', '#f8f7ff', '#fff2cc', '#ffcf8a', '#ff9d6b']; // O B A F G K M

  const axes = (g, x0, y0, x1, y1, xl, yl) => {
    U.line(g, x0, y1, x1, y1, C.dim, 1.5); U.line(g, x0, y0, x0, y1, C.dim, 1.5);
    if (xl) U.text(g, xl, (x0 + x1) / 2, y1 + 22, 11, C.dim); if (yl) { g.save(); g.translate(x0 - 24, (y0 + y1) / 2); g.rotate(-Math.PI / 2); U.text(g, yl, 0, 0, 11, C.dim); g.restore(); }
  };

  // =================================================================================================== H-R diagram and clusters
  const hrX = t => 70 + 290 * t, hrY = logL => 205 - (logL + 4) / 10 * 178;
  const hrColour = t => TCOL[clamp(Math.round(t * 6), 0, 6)];
  function hrBase(g, lab) {
    axes(g, 50, 18, 385, 205, null, null);
    ['O', 'B', 'A', 'F', 'G', 'K', 'M'].forEach((s, i) => U.text(g, s, hrX(i / 6), 218, 12, TCOL[i], 'center', '700'));
    U.text(g, 'hotter  ←  surface temperature  →  cooler', 220, 238, 11, C.dim);
    g.save(); g.translate(18, 112); g.rotate(-Math.PI / 2); U.text(g, 'luminosity (Sun = 1)', 0, 0, 11, C.dim); g.restore();
    [-4, -2, 0, 2, 4, 6].forEach(l => { U.line(g, 46, hrY(l), 50, hrY(l), C.dim, 1); U.text(g, '10' + (l === 0 ? '⁰' : String(l).replace('-', '⁻').replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d])), 38, hrY(l), 9, C.dim, 'right'); });
  }
  const stars = (g, n, seed, fn) => { const r = U.seeded(seed); for (let i = 0; i < n; i++) { const [t, l, rad] = fn(r, i); U.circle(g, hrX(t), hrY(l), rad || 1.8, hrColour(t)); } };
  add('star.hr', (g, region, lab) => {
    hrBase(g, lab);
    stars(g, 150, 3, r => { const t = r() * 0.98 + 0.01; return [t, 6 - 9 * t + (r() - 0.5) * 0.9, 1.7]; });                                 // main sequence
    stars(g, 34, 5, r => { const t = 0.72 + r() * 0.26; return [t, 1.2 + r() * 2.2 + (t - 0.72) * 2, 3.2]; });                             // red giants
    stars(g, 26, 8, r => [r() * 0.98 + 0.01, 4.3 + r() * 1.5, 3.8]);                                                                        // supergiants
    stars(g, 20, 9, r => { const t = 0.12 + r() * 0.38; return [t, -2 - (t - 0.12) * 3 + (r() - 0.5) * 0.5, 1.7]; });                       // white dwarfs
    U.circle(g, hrX(4 / 6), hrY(0), 4, C.sun, '#fff', 1);
    const R = { ms: [hrX(0.5), hrY(1.5), 172, 30, 0.5], giants: [hrX(0.86), hrY(2.4), 50, 32, 0], super: [hrX(0.5), hrY(5.05), 160, 24, 0], wd: [hrX(0.3), hrY(-2.9), 66, 24, 0.0] };
    if (R[region]) { const [x, y, rx, ry, rot] = R[region]; U.ell(g, x, y, rx, ry, rot, 'rgba(242,195,107,0.10)', C.gold, 2); }
    if (lab) {
      U.text(g, 'Sun', hrX(4 / 6) + 16, hrY(0) + 10, 10, C.sun); U.text(g, 'main sequence', hrX(0.36), hrY(1.4) - 20, 11, C.gold, 'center', '600'); U.text(g, 'red giants', hrX(0.86), hrY(3.6), 11, C.gold, 'center', '600');
      U.text(g, 'supergiants', hrX(0.5), hrY(6.2), 11, C.gold, 'center', '600'); U.text(g, 'white dwarfs', hrX(0.33), hrY(-3.5) - 2, 11, C.gold, 'center', '600');
    }
  });
  add('star.cluster', (g, age, lab) => {
    hrBase(g, false);
    const old = age === 'old';
    const top = old ? 0.58 : 0.04;                      // where the main sequence ends (the turn-off)
    stars(g, old ? 90 : 120, 21, r => { const t = top + r() * (0.99 - top); return [t, 6 - 9 * t + (r() - 0.5) * 0.35, 1.9]; });
    if (old) {
      stars(g, 22, 4, r => { const u = r(); return [top + u * 0.3, 6 - 9 * top - u * 0.4 + (r() - 0.5) * 0.2, 2]; });           // subgiants
      stars(g, 30, 6, r => { const u = r(); return [0.74 + u * 0.2, 0.2 + u * 3 + (r() - 0.5) * 0.25, 2.6]; });                 // red-giant branch
      stars(g, 12, 7, r => [0.42 + r() * 0.2, 1.65 + (r() - 0.5) * 0.2, 2.2]);                                                 // horizontal branch
    } else {
      stars(g, 4, 7, r => [0.8 + r() * 0.15, 4.2 + r() * 0.8, 4]);                                                              // a few red supergiants
    }
    const tx = hrX(top), ty = hrY(6 - 9 * top);
    if (lab) { U.circle(g, tx, ty, 11, null, C.gold, 2); U.text(g, 'main-sequence turn-off', tx + 14, ty - 14, 11, C.gold, 'left'); }
  });

  // =================================================================================================== spectra and blackbody curves
  add('star.spectra', (g, kind, lab) => {
    const x0 = 40, x1 = 360, y0 = 70, y1 = 150, X = nm => x0 + (nm - 400) / 300 * (x1 - x0);
    const grad = g.createLinearGradient(x0, 0, x1, 0);
    [[0, '#6a1fb0'], [0.1, '#3d3df0'], [0.25, '#18a8ff'], [0.4, '#20d070'], [0.55, '#e8e83a'], [0.75, '#ff9020'], [1, '#e02020']].forEach(([t, c]) => grad.addColorStop(t, c));
    const lines = [410.2, 434.0, 486.1, 656.3];
    if (kind === 'continuous') { g.fillStyle = grad; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
    else if (kind === 'emission') {
      g.fillStyle = '#05070d'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      for (const nm of lines) { const x = X(nm), gl = g.createLinearGradient(x - 8, 0, x + 8, 0); gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.5, nm > 600 ? '#ff3030' : nm > 480 ? '#30d0ff' : '#8a50ff'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.fillRect(x - 8, y0, 16, y1 - y0); U.line(g, x, y0, x, y1, nm > 600 ? '#ff7070' : nm > 480 ? '#a0eaff' : '#c0a0ff', 2); }
    } else {
      g.fillStyle = grad; g.fillRect(x0, y0, x1 - x0, y1 - y0);
      for (const nm of lines) U.line(g, X(nm), y0, X(nm), y1, '#03050a', 3.2);
      U.line(g, X(527.0), y0, X(527.0), y1, '#03050a', 1.6); U.line(g, X(589.0), y0, X(589.0), y1, '#03050a', 2);
    }
    g.strokeStyle = C.metal2; g.lineWidth = 1.5; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
    for (const nm of [400, 500, 600, 700]) { U.line(g, X(nm), y1, X(nm), y1 + 6, C.dim, 1); U.text(g, nm + ' nm', X(nm), y1 + 17, 10, C.dim); }
    if (lab) U.text(g, { continuous: 'continuous: hot, dense source', emission: 'emission lines: hot, thin gas', absorption: 'absorption lines: cooler gas in front of a hot source' }[kind], 200, 30, 12, C.gold, 'center', '600');
  });

  add('star.blackbody', (g, perm, lab) => {
    perm = perm && perm.length === 3 ? perm : 'ABC';                       // letters from the coolest to the hottest curve
    const Ts = [3500, 5800, 9500], cols = ['#ff7b5a', '#ffd25a', '#9ad0ff'];
    const x0 = 56, x1 = 380, y1 = 200, y0 = 24, X = nm => x0 + (nm / 1400) * (x1 - x0);
    const planck = (nm, T) => { const l = nm * 1e-9; return Math.pow(l, -5) / (Math.exp(1.4388e-2 / (l * T)) - 1); };
    let mx = 0; for (const T of Ts) for (let nm = 100; nm <= 1400; nm += 10) mx = Math.max(mx, planck(nm, T));
    axes(g, x0, y0, x1, y1, null, 'brightness');
    U.text(g, 'wavelength (nm)', (x0 + x1) / 2, y1 + 32, 11, C.dim);
    const vg = g.createLinearGradient(X(400), 0, X(700), 0); [[0, '#6a1fb0'], [0.3, '#18a8ff'], [0.55, '#e8e83a'], [1, '#e02020']].forEach(([t, c]) => vg.addColorStop(t, c));
    g.fillStyle = vg; g.globalAlpha = 0.22; g.fillRect(X(400), y0, X(700) - X(400), y1 - y0); g.globalAlpha = 1;
    Ts.forEach((T, i) => {
      g.beginPath(); let peak = [0, 0, 0];
      for (let nm = 100; nm <= 1400; nm += 8) { const v = Math.pow(planck(nm, T) / mx, 0.45), x = X(nm), y = y1 - v * (y1 - y0 - 10); nm === 100 ? g.moveTo(x, y) : g.lineTo(x, y); if (v > peak[2]) peak = [x, y, v]; }
      U.stroke(g, cols[i], 2.4); U.text(g, perm[i], peak[0] + (i === 0 ? 14 : i === 1 ? 14 : -14), peak[1] + 4, 14, cols[i], 'center', '700');
    });
    [0, 400, 700, 1000, 1400].forEach(nm => { U.line(g, X(nm), y1, X(nm), y1 + 4, C.dim, 1); U.text(g, String(nm), X(nm), y1 + 12, 9, C.dim); });
    if (lab) U.text(g, 'hotter: higher and shifted to shorter wavelengths', 220, 14, 11, C.gold);
  });

  // =================================================================================================== light curves
  function lightcurve(g, fn, tmax, ymin, ymax, xl, yl) {
    const x0 = 56, x1 = 380, y0 = 26, y1 = 196;
    axes(g, x0, y0, x1, y1, xl, yl);
    g.beginPath(); for (let i = 0; i <= 320; i++) { const t = i / 320 * tmax, v = fn(t), x = x0 + i / 320 * (x1 - x0), y = y1 - (v - ymin) / (ymax - ymin) * (y1 - y0 - 12); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    U.stroke(g, C.cyan, 2.4);
    return { X: t => x0 + t / tmax * (x1 - x0), Y: v => y1 - (v - ymin) / (ymax - ymin) * (y1 - y0 - 12), x0, x1, y0, y1 };
  }
  add('star.eclipsing', (g, p, lab) => {
    const dip = (t, c, w, d) => d * (1 - smooth(w * 0.55, w, Math.abs(t - c)));
    const L = lightcurve(g, t => 1 - dip(t % 1, 0.25, 0.14, 0.55) - dip(t % 1, 0.75, 0.14, 0.2), 2, 0.3, 1.1, 'time', 'brightness');
    if (lab) { U.text(g, 'deeper dip: hotter star eclipsed', L.X(0.25) + 6, L.Y(0.45) - 12, 11, C.gold); U.text(g, 'shallower dip', L.X(0.75), L.Y(0.8) - 14, 11, C.gold); U.text(g, 'one orbital period', L.X(1.0), L.y1 - 8, 10, C.dim); }
  });
  add('star.transit', (g, p, lab) => {
    const L = lightcurve(g, t => 1 - 0.14 * (smooth(0.28, 0.34, t) - smooth(0.66, 0.72, t)), 1, 0.7, 1.08, 'time', 'brightness');
    // star and planet schematic
    U.circle(g, 320, 56, 22, '#ffd98a', null); U.circle(g, 318, 56, 7, '#0a0f1c');
    if (lab) { U.text(g, 'depth = (R_p / R_*)²', L.X(0.5), L.Y(0.8) + 22, 11, C.gold); U.text(g, 'duration', L.X(0.5), L.Y(0.86) - 14, 10, C.dim); U.text(g, 'planet', 318, 90, 10, C.dim); }
  });
  add('star.cepheid', (g, p, lab) => {
    const f = t => { const ph = t % 1; const v = ph < 0.18 ? smooth(0, 0.18, ph) : 1 - smooth(0.18, 1, ph) * 0.98; return 0.35 + 0.65 * v; };
    const L = lightcurve(g, f, 3, 0.2, 1.1, 'time (several days)', 'brightness');
    if (lab) { U.text(g, 'fast rise, slow decline', L.X(1.2), L.Y(1.0) - 14, 11, C.gold); U.text(g, 'period P', L.X(1.5), L.y1 - 8, 10, C.dim); }
  });

  // =================================================================================================== magnitudes and stellar life cycles
  add('mag.scale', (g, p, lab) => {
    const x0 = 28, x1 = 372, X = m => x0 + (m + 27) / 59 * (x1 - x0), y = 122;
    U.line(g, x0, y, x1, y, C.dim, 2);
    for (let m = -25; m <= 30; m += 5) { U.line(g, X(m), y - 4, X(m), y + 4, C.dim, 1); }
    // [magnitude, name, row]: negative rows sit above the axis, positive below
    const objs = [[-26.7, 'Sun', -1], [-12.7, 'full Moon', 1], [-4.9, 'Venus', -1], [-1.5, 'Sirius', 1], [0, 'Vega', -2], [2, 'Polaris', 2], [6, 'naked-eye limit', -1], [9, 'binoculars', 1], [12, '10 cm telescope', -2], [31, 'Hubble limit', 1]];
    for (const [m, name, row] of objs) {
      const ty = y + Math.sign(row) * (22 + (Math.abs(row) - 1) * 24), w = name.length * 5.9 + 8, cx = Math.min(Math.max(X(m), 4 + w / 2), 396 - w / 2);
      U.line(g, X(m), y, X(m), ty - Math.sign(row) * 8, C.faint, 1);
      g.fillStyle = 'rgba(10,17,36,0.85)'; g.fillRect(cx - w / 2, ty - 8, w, 16);
      U.text(g, name, cx, ty, 10.5, C.line);
      U.circle(g, X(m), y, 3.6, m < 0 ? C.gold : C.cyan);
    }
    for (let m = -20; m <= 30; m += 10) U.text(g, String(m).replace('-', '−'), X(m), y + 12, 9, C.dim);
    U.text(g, '← brighter', x0 + 30, 20, 11, C.gold); U.text(g, 'fainter →', x1 - 30, 20, 11, C.cyan);
    U.arrow(g, X(0), 226, X(5), 226, C.green, 1.6, 6); U.text(g, '5 magnitudes = ×100 in brightness', X(2.5) + 4, 238, 10.5, C.green);
  });
  add('evol.paths', (g, p, lab) => {
    const box = (x, y, w, text, col) => { U.rect(g, x, y, w, 26, 'rgba(20,32,62,0.95)', col || C.metal2, 1.4, 6); U.text(g, text, x + w / 2, y + 13, 10.5, C.line); };
    const arrow = (x1, y1, x2, y2) => U.arrow(g, x1, y1, x2, y2, C.dim, 1.4, 6);
    box(10, 14, 84, 'molecular cloud'); arrow(94, 27, 108, 27); box(108, 14, 72, 'protostar'); arrow(180, 27, 194, 27); box(194, 14, 100, 'main sequence', C.gold);
    U.line(g, 244, 40, 244, 62, C.dim, 1.4); U.line(g, 244, 62, 12, 62, C.dim, 1.4); U.line(g, 12, 62, 12, 183, C.dim, 1.4);
    arrow(12, 113, 24, 113); arrow(12, 183, 24, 183);
    U.text(g, 'M < 8 M☉', 26, 90, 11, C.cyan, 'left', '600'); U.text(g, 'M > 8 M☉', 26, 160, 11, C.orange, 'left', '600');
    box(24, 100, 76, 'red giant'); arrow(100, 113, 114, 113); box(114, 100, 100, 'planetary nebula'); arrow(214, 113, 228, 113); box(228, 100, 88, 'white dwarf', C.cyan);
    box(24, 170, 100, 'red supergiant'); arrow(124, 183, 138, 183); box(138, 170, 72, 'supernova', C.orange); arrow(210, 183, 224, 183); box(224, 170, 168, 'neutron star or black hole');
    U.text(g, 'the Sun ends as a white dwarf', 200, 140, 10.5, C.dim); U.text(g, 'core collapse leaves a compact remnant', 200, 214, 10.5, C.dim);
  });

  // =================================================================================================== galaxies
  function galaxy(g, kind) {
    const cx = 200, cy = 125, r = U.seeded(7 + kind.length * 13 + kind.charCodeAt(kind.length - 1));
    g.save(); g.beginPath(); g.rect(30, 12, 340, 226); g.clip();
    const glow = (x, y, rx, ry, rot, a, col) => {
      g.save(); g.translate(x, y); g.rotate(rot || 0); g.scale(1, ry / rx);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, col.replace('A', a)); gr.addColorStop(0.4, col.replace('A', a * 0.35)); gr.addColorStop(1, col.replace('A', 0));
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, TAU); g.fill(); g.restore();
    };
    const gauss = () => (r() + r() + r() + r() - 2) / 0.58;
    const dots = (n, fn) => { g.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const [x, y, rad, col] = fn(i); U.circle(g, x, y, rad, col); } g.globalCompositeOperation = 'source-over'; };
    const spiral = (o) => {
      const { arms, pitch, bulge, rmax, n, bar, tilt } = o;
      glow(cx, cy, rmax * 0.95, rmax * 0.95 * tilt, o.rot || 0, 0.2, 'rgba(255,230,190,A)');
      dots(500, () => { const rr = Math.pow(r(), 0.7) * rmax, th = r() * TAU; return [cx + rr * Math.cos(th), cy + rr * Math.sin(th) * tilt, 0.8, 'rgba(210,220,255,0.28)']; });
      dots(n, () => {
        const arm = Math.floor(r() * arms), r0 = bar || 6, rr = r0 + Math.pow(r(), 0.62) * (rmax - r0);
        const th = arm * TAU / arms + Math.log(rr / r0) / Math.tan(pitch) + gauss() * 0.16;
        let x = rr * Math.cos(th), y = rr * Math.sin(th) * tilt;
        const cr = Math.cos(o.rot || 0), sr = Math.sin(o.rot || 0);
        const blue = clamp(rr / rmax, 0, 1), col = r() < 0.12 + 0.25 * blue ? 'rgba(255,150,190,0.55)' : 'rgba(' + Math.round(170 + 60 * (1 - blue)) + ',' + Math.round(190 + 40 * (1 - blue)) + ',255,' + (0.30 + 0.3 * r()) + ')';
        return [cx + x * cr - y * sr, cy + x * sr + y * cr, 0.9 + r() * 1.1, col];
      });
      glow(cx, cy, bulge, bulge * (o.bulgeY || 1), o.rot || 0, 0.95, 'rgba(255,225,160,A)');
    };
    if (kind === 'E0') { glow(cx, cy, 82, 82, 0, 0.95, 'rgba(255,226,170,A)'); dots(700, () => { const a = r() * TAU, d = Math.abs(gauss()) * 30; return [cx + d * Math.cos(a), cy + d * Math.sin(a), 0.8, 'rgba(255,236,200,0.5)']; }); }
    else if (kind === 'E5') { glow(cx, cy, 108, 54, -0.45, 0.95, 'rgba(255,226,170,A)'); dots(700, () => { const a = r() * TAU, d = Math.abs(gauss()) * 38, x = d * Math.cos(a), y = d * Math.sin(a) * 0.5, c = Math.cos(-0.45), s = Math.sin(-0.45); return [cx + x * c - y * s, cy + x * s + y * c, 0.8, 'rgba(255,236,200,0.5)']; }); }
    else if (kind === 'S0') { glow(cx, cy, 115, 46, -0.15, 0.55, 'rgba(255,220,170,A)'); glow(cx, cy, 36, 36, 0, 1, 'rgba(255,228,170,A)'); g.save(); g.translate(cx, cy); g.rotate(-0.15); U.ell(g, 0, 7, 100, 3.2, 0, 'rgba(20,12,8,0.35)'); g.restore(); }
    else if (kind === 'Sa') spiral({ arms: 2, pitch: 0.2, bulge: 46, rmax: 110, n: 2600, tilt: 0.82, rot: -0.3 });
    else if (kind === 'Sc') spiral({ arms: 2, pitch: 0.48, bulge: 15, rmax: 112, n: 2400, tilt: 0.85, rot: 0.2 });
    else if (kind === 'SBb') {
      const rot = -0.4, c = Math.cos(rot), sn = Math.sin(rot);
      glow(cx, cy, 84, 74, rot, 0.14, 'rgba(255,230,190,A)');
      g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(1, 0.22);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, 62); gr.addColorStop(0, 'rgba(255,225,160,0.95)'); gr.addColorStop(0.7, 'rgba(255,215,150,0.55)'); gr.addColorStop(1, 'rgba(255,215,150,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 62, 0, TAU); g.fill(); g.restore();
      dots(2300, () => {
        const arm = Math.floor(r() * 2), r0 = 52, rr = r0 + Math.pow(r(), 0.75) * 62;
        const th = arm * Math.PI + Math.log(rr / r0) / Math.tan(0.42) + gauss() * 0.13;
        const x = rr * Math.cos(th), y = rr * Math.sin(th) * 0.86, blue = clamp((rr - r0) / 60, 0, 1);
        return [cx + x * c - y * sn, cy + x * sn + y * c, 0.9 + r() * 1.1, r() < 0.14 + 0.2 * blue ? 'rgba(255,150,190,0.55)' : 'rgba(' + Math.round(180 + 40 * (1 - blue)) + ',' + Math.round(200 + 30 * (1 - blue)) + ',255,' + (0.30 + 0.3 * r()) + ')'];
      });
      glow(cx, cy, 18, 18, 0, 0.95, 'rgba(255,228,170,A)');
    } else {
      for (let i = 0; i < 7; i++) glow(cx + gauss() * 36, cy + gauss() * 24, 26 + r() * 30, 18 + r() * 20, r() * 3, 0.38, 'rgba(' + (150 + Math.round(r() * 90)) + ',' + (170 + Math.round(r() * 60)) + ',255,A)');
      dots(500, () => [cx + gauss() * 46, cy + gauss() * 32, 0.9 + r() * 1.3, r() < 0.3 ? 'rgba(255,140,180,0.7)' : 'rgba(210,225,255,0.6)']);
    }
    g.restore();
  }
  add('gal.type', (g, kind, lab) => {
    U.sky(g, 31, 30);
    galaxy(g, kind || 'Sc');
    if (lab) U.text(g, { E0: 'E0: round elliptical', E5: 'E5: flattened elliptical', S0: 'S0: lenticular', Sa: 'Sa: tight arms, big bulge', Sc: 'Sc: open arms, small bulge', SBb: 'SBb: barred spiral', Irr: 'Irr: irregular' }[kind] || kind, 200, 232, 13, C.gold, 'center', '600');
  });

  add('gal.mw', (g, p, lab) => {
    U.sky(g, 17, 20);
    // top-down view
    const cx = 120, cy = 125;
    g.save(); g.translate(cx, cy);
    const glw = g.createRadialGradient(0, 0, 0, 0, 0, 100); glw.addColorStop(0, 'rgba(255,230,180,0.45)'); glw.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = glw; g.beginPath(); g.arc(0, 0, 100, 0, TAU); g.fill();
    const r = U.seeded(3);
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 1500; i++) { const arm = Math.floor(r() * 4), rr = 22 + Math.pow(r(), 0.7) * 76, th = arm * Math.PI / 2 + Math.log(rr / 20) / Math.tan(0.24) + (r() - 0.5) * 0.35 + 0.5; U.circle(g, rr * Math.cos(th), rr * Math.sin(th), 0.9, 'rgba(190,210,255,0.45)'); }
    g.globalCompositeOperation = 'source-over';
    g.save(); g.rotate(-0.4); U.ell(g, 0, 0, 28, 8, 0, 'rgba(255,225,160,0.85)'); g.restore();
    U.circle(g, 0, 0, 5, '#fff2c0');
    U.circle(g, 0, 52, 3.4, C.sun, '#fff', 1);
    g.restore();
    // edge-on view
    const ex = 300, ey = 125;
    U.circle(g, ex, ey, 66, null, C.faint, 1.2);
    const rr = U.seeded(8); for (let i = 0; i < 16; i++) { const a = rr() * TAU, d = 20 + rr() * 44; U.circle(g, ex + d * Math.cos(a), ey + d * Math.sin(a), 1.6, '#f2c36b'); }
    U.ell(g, ex, ey, 66, 5, 0, 'rgba(190,210,255,0.55)'); U.ell(g, ex, ey, 20, 14, 0, 'rgba(255,225,160,0.8)'); U.circle(g, ex + 40, ey, 3, C.sun, '#fff', 1);
    if (lab) { U.text(g, 'top view: bar and spiral arms', cx, 232, 11, C.dim); U.text(g, 'side view', ex, 232, 11, C.dim); U.text(g, 'Sun', cx + 12, cy + 62, 10, C.sun); U.text(g, 'bulge', ex, ey + 30, 10, C.gold); U.text(g, 'thin disc', ex - 40, ey - 12, 10, C.cyan); U.text(g, 'halo with globular clusters', ex, ey - 76, 10, C.gold); U.text(g, 'Sun', ex + 40, ey - 12, 10, C.sun); }
  });

  add('gal.rotation', (g, perm, lab) => {
    const x0 = 56, x1 = 380, y0 = 26, y1 = 196; axes(g, x0, y0, x1, y1, 'distance from the centre', 'orbital speed');
    const flat = r => 1 - Math.exp(-r * 4.5), fall = r => r * Math.pow(r * r + 0.04, -0.75) / (Math.SQRT2 * 0.2 * Math.pow(3 * 0.04, -0.75));
    const plot = (fn, col, lbl) => { g.beginPath(); for (let i = 0; i <= 200; i++) { const r = i / 200, x = x0 + r * (x1 - x0 - 10), y = y1 - fn(r) * (y1 - y0 - 28); i ? g.lineTo(x, y) : g.moveTo(x, y); } U.stroke(g, col, 2.6); const rr = 0.96; U.text(g, lbl, x0 + rr * (x1 - x0 - 10) + 4, y1 - fn(rr) * (y1 - y0 - 28) - 12, 15, col, 'center', '700'); };
    const obs = perm === 'BA' ? 'B' : 'A', exp = perm === 'BA' ? 'A' : 'B';
    plot(r => 0.9 * flat(r), C.green, obs); plot(r => 0.9 * fall(r), C.orange, exp);
    if (lab) { U.text(g, 'flat (observed): dark matter', 300, 36, 11, C.green); U.text(g, 'falling (visible matter only)', 300, 190 - 60, 11, C.orange); }
  });

  add('cos.hubble', (g, p, lab) => {
    const x0 = 56, x1 = 380, y0 = 24, y1 = 196; axes(g, x0, y0, x1, y1, 'distance', 'recession velocity');
    const r = U.seeded(5);
    for (let i = 0; i < 46; i++) { const d = r() * 0.95 + 0.04, v = d + (r() - 0.5) * 0.12 * (0.4 + d); U.circle(g, x0 + d * (x1 - x0 - 12), y1 - clamp(v, 0.01, 1) * (y1 - y0 - 14), 2.6, '#8fb6ff'); }
    U.line(g, x0, y1, x1 - 6, y0 + 14, C.gold, 2, [6, 4]);
    if (lab) { U.text(g, 'slope = H₀ ≈ 70 km/s per Mpc', 250, 74, 12, C.gold); U.text(g, 'each dot is a galaxy', 120, 60, 11, C.dim); }
  });
})(typeof self !== 'undefined' ? self : this);
