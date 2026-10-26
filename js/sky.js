/* Firmament sky renderer: a flat star map (Miller cylindrical projection) that wraps both ways, like a torus: leave
   at the right and you come back on the left, leave over the north pole and you arrive from the south pole.
   Pan, zoom and picking, plus the small constellation charts used in the codex. */
(function () {
  'use strict';
  const RAD = Math.PI / 180;
  const PI = Math.PI, TAU = Math.PI * 2;
  const wrap = d => d - TAU * Math.floor((d + PI) / TAU); // -> [-PI, PI)
  const millerY = decDeg => 1.25 * Math.log(Math.tan(PI / 4 + 0.4 * decDeg * RAD));
  const YMAX = millerY(90), YP = 2 * YMAX; // the map is YP tall; its top edge (north pole) joins its bottom edge (south pole)
  const wrapY = d => d - YP * Math.floor((d + YP / 2) / YP); // -> [-YP/2, YP/2)
  
  // approximate star colour from B-V
  const STOPS = [[-0.3, 155, 176, 255], [0, 170, 191, 255], [0.3, 202, 216, 255], [0.6, 255, 244, 234], [0.8, 255, 228, 186], [1.2, 255, 200, 125], [1.8, 255, 160, 100]];
  function bvRGB(bv) {
    bv = Math.max(-0.3, Math.min(1.8, bv));
    for (let i = 1; i < STOPS.length; i++) {
      if (bv <= STOPS[i][0]) {
        const a = STOPS[i - 1], b = STOPS[i], t = (bv - a[0]) / (b[0] - a[0]);
        return [Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t), Math.round(a[3] + (b[3] - a[3]) * t)];
      }
    }
    return [255, 160, 100];
  }
  // circular mean of right ascensions (radians)
  function meanRA(list) {
    let sx = 0, sy = 0;
    for (const r of list) { sx += Math.cos(r); sy += Math.sin(r); }
    return Math.atan2(sy, sx);
  }

  function create(canvas, G, hooks) {
    const SKY = G.SKY;
    const N = SKY.stars.length, NM = SKY.messier.length;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0;
    // view: x0 = centre right ascension (rad), y0 = centre in map units, zoom relative to base scale
    const v = { x0: 1.4, y0: 0.1, zoom: 1.4 };
    let anim = null;
    const focus = { x: 0.5, y: 0.5 }; // where a target lands on screen (fraction of the canvas), so a side panel does not cover it

    const sra = SKY.stars.map(s => s[1] * RAD), sY = SKY.stars.map(s => millerY(s[2]));
    const mra = SKY.messier.map(m => m.ra * RAD), mY = SKY.messier.map(m => millerY(m.dec));
    const cra = SKY.consts.map(c => c.ra * RAD), cY = SKY.consts.map(c => millerY(c.dec));
    const starRGB = SKY.stars.map(s => bvRGB(s[4]));
    const starCol = starRGB.map(c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')');
    const F = SKY.field, NF = F.length / 3;
    const fra = new Float32Array(NF), fY = new Float32Array(NF), fm = new Float32Array(NF);
    for (let i = 0; i < NF; i++) { fra[i] = F[3 * i] / 100 * RAD; fY[i] = millerY(F[3 * i + 1] / 100); fm[i] = F[3 * i + 2] / 10; }
    // the ecliptic and the zodiac band (8 degrees either side), as points every 3 degrees of ecliptic longitude: [right ascension in radians, Miller y]
    const Y_ = typeof YearSky !== 'undefined' ? YearSky : null;
    const ECL = Y_ ? [-8, 0, 8].map(beta => { const pts = []; for (let l = 0; l <= 360; l += 3) { const [ra, dec] = Y_.eclToEq(l, beta); pts.push([ra * RAD, millerY(dec)]); } return pts; }) : [[], [], []];
    const SH = Y_ ? Y_.SHOWERS : [], shra = SH.map(x => x.ra * RAD), shY = SH.map(x => millerY(x.dec));
    const shx = new Float32Array(SH.length), shy = new Float32Array(SH.length), shvis = new Uint8Array(SH.length);

    const sx = new Float32Array(N), sy = new Float32Array(N), svis = new Uint8Array(N);
    const mx = new Float32Array(NM), my = new Float32Array(NM), mvis = new Uint8Array(NM);
    let scale = 300;

    const baseScale = () => (Math.min(W, H) / 2) / 1.155;
    const minScale = () => Math.max(W / TAU, H / YP); // never show more than one copy of the sky in either direction
    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      cx = W / 2; cy = H / 2;
      clampView();
    }
    function clampView() {
      if (!W) return;
      const b = baseScale();
      v.zoom = Math.max(minScale() / b, Math.min(45, v.zoom));
      v.y0 = wrapY(v.y0);
      v.x0 = ((v.x0 % TAU) + TAU) % TAU;
    }
    function updateCam() { scale = v.zoom * baseScale(); }

    // ---- camera control
    function panPx(dx, dy) { updateCam(); v.x0 += dx / scale; v.y0 += dy / scale; clampView(); anim = null; }
    function zoomAt(f, px, py) {
      updateCam();
      const du = (cx - px) / scale, dv = (cy - py) / scale;
      v.zoom *= f; clampView(); updateCam();
      v.x0 += du - (cx - px) / scale; v.y0 += dv - (cy - py) / scale;
      clampView(); anim = null;
    }
    function goTo(ra, dec, zoom, ms, focused) {
      const z = Math.max(minScale() / baseScale(), Math.min(45, zoom || v.zoom)), sc = z * baseScale();
      const dx = focused ? (cx - focus.x * W) / sc : 0, dy = focused ? (cy - focus.y * H) / sc : 0; // keep the target clear of the panel
      anim = { t0: performance.now(), ms: ms || 700, from: { x0: v.x0, y0: v.y0, zoom: v.zoom }, to: { x0: ra * RAD - dx, y0: millerY(dec) - dy, zoom: z } };
      anim.to.x0 = anim.from.x0 + wrap(anim.to.x0 - anim.from.x0);
      anim.to.y0 = anim.from.y0 + wrapY(anim.to.y0 - anim.from.y0); // the short way round, over the pole if need be
    }
    function stepAnim() {
      if (!anim) return;
      const t = Math.min(1, (performance.now() - anim.t0) / anim.ms), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      v.x0 = anim.from.x0 + (anim.to.x0 - anim.from.x0) * e;
      v.y0 = anim.from.y0 + (anim.to.y0 - anim.from.y0) * e;
      v.zoom = anim.from.zoom * Math.pow(anim.to.zoom / anim.from.zoom, e);
      clampView();
      if (t >= 1) anim = null;
    }

    // ---- input
    const ptrs = new Map();
    let moved = 0, downAt = null, pinch = null;
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { moved = 0; downAt = { x: e.clientX, y: e.clientY }; }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) }; moved = 99; }
      canvas.classList.add('dragging');
    });
    canvas.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId);
      if (!p) { hooks.onHover && hooks.onHover(e.clientX, e.clientY); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      if (ptrs.size === 1) { moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) panPx(dx, dy); }
      else if (ptrs.size === 2) {
        p.x = e.clientX; p.y = e.clientY;
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch && pinch.d > 0) zoomAt(d / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2);
        pinch = { d };
      }
      p.x = e.clientX; p.y = e.clientY;
    });
    function up(e) {
      const had = ptrs.delete(e.pointerId);
      if (ptrs.size < 2) pinch = null;
      if (!ptrs.size) canvas.classList.remove('dragging');
      if (had && e.type === 'pointerup' && moved <= 6 && downAt && ptrs.size === 0) hooks.onClick && hooks.onClick(e.clientX, e.clientY);
    }
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY); }, { passive: false });

    // ---- picking
    function pick(px, py, touch, starsOnly) {
      const R = touch ? 24 : 15;
      let best = null, bd = R * R;
      for (let i = 0; i < N; i++) {
        if (!svis[i]) continue;
        const d = (sx[i] - px) ** 2 + (sy[i] - py) ** 2;
        if (d < bd) { bd = d; best = { type: 'star', i }; }
      }
      for (let i = 0; i < NM && !starsOnly; i++) {
        if (!mvis[i]) continue;
        const d = (mx[i] - px) ** 2 + (my[i] - py) ** 2;
        if (d < bd * 0.9) { bd = d; best = { type: 'messier', i }; }
      }
      for (let i = 0; i < SH.length && !starsOnly; i++) { // an active (or coming) meteor shower's radiant
        if (!shvis[i]) continue;
        const d = (shx[i] - px) ** 2 + (shy[i] - py) ** 2;
        if (d < bd * 0.8) { bd = d; best = { type: 'shower', i }; }
      }
      return best;
    }

    // ---- drawing helpers
    const px = r => cx - wrap(r - v.x0) * scale;
    const py = Y => cy - wrapY(Y - v.y0) * scale;
    function lineBetween(a, b) { // route a->b the short way round the torus, drawn on both sides of a seam when it crosses one
      const dx = wrap(sra[b] - sra[a]) * scale, dy = wrapY(sY[b] - sY[a]) * scale;
      const xa = sx[a], ya = sy[a], xb = xa - dx, yb = ya - dy;
      const onscreen = (x1, y1, x2, y2) => !(Math.max(x1, x2) < -10 || Math.min(x1, x2) > W + 10 || Math.max(y1, y2) < -10 || Math.min(y1, y2) > H + 10);
      if (onscreen(xa, ya, xb, yb)) { ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); }
      if (Math.abs(xb - sx[b]) > 1 || Math.abs(yb - sy[b]) > 1) { const xa2 = sx[b] + dx, ya2 = sy[b] + dy; if (onscreen(xa2, ya2, sx[b], sy[b])) { ctx.moveTo(xa2, ya2); ctx.lineTo(sx[b], sy[b]); } }
    }
    function drawMessierGlyph(x, y, kind, r, visited, hot) {
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = visited ? 'rgba(127,227,255,.95)' : 'rgba(150,170,230,.5)';
      ctx.fillStyle = visited ? 'rgba(127,227,255,.25)' : 'rgba(150,170,230,.08)';
      ctx.beginPath();
      if (kind === 'globular') { ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); }
      else if (kind === 'open') { ctx.setLineDash([2, 2.5]); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.fill(); }
      else if (kind === 'nebula') { ctx.rect(x - r, y - r, 2 * r, 2 * r); ctx.fill(); ctx.stroke(); }
      else if (kind === 'galaxy') { ctx.ellipse(x, y, r * 1.35, r * 0.62, -0.5, 0, TAU); ctx.fill(); ctx.stroke(); }
      else { ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      if (hot) { ctx.beginPath(); ctx.arc(x, y, r + 4, 0, TAU); ctx.strokeStyle = 'rgba(127,227,255,.5)'; ctx.stroke(); }
    }
    function sparkle(x, y, q, col) { // a small four-pointed star: the mark of a flagship
      ctx.fillStyle = col; ctx.beginPath();
      const k = q * 0.32;
      ctx.moveTo(x, y - q); ctx.lineTo(x + k, y - k); ctx.lineTo(x + q, y); ctx.lineTo(x + k, y + k); ctx.lineTo(x, y + q); ctx.lineTo(x - k, y + k); ctx.lineTo(x - q, y); ctx.lineTo(x - k, y - k);
      ctx.closePath(); ctx.fill();
    }
    function text(s, x, y, size, col, align, weight) {
      ctx.font = (weight || '') + ' ' + size + 'px system-ui, sans-serif';
      ctx.textAlign = align || 'left';
      ctx.fillStyle = 'rgba(3,5,12,.85)';
      ctx.fillText(s, x + 1, y + 1);
      ctx.fillStyle = col;
      ctx.fillText(s, x, y);
    }
    function graticule() {
      ctx.lineWidth = 1;
      ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'left';
      for (let h = 0; h < 24; h += 2) {
        const x = px(h * 15 * RAD);
        if (x < -2 || x > W + 2) continue;
        ctx.strokeStyle = 'rgba(120,150,230,.08)';
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        ctx.fillStyle = 'rgba(150,170,230,.38)'; ctx.fillText(h + 'h', x + 3, H - 6);
      }
      for (let d = -60; d <= 60; d += 30) {
        const y = py(millerY(d));
        if (y < -2 || y > H + 2) continue;
        ctx.strokeStyle = d === 0 ? 'rgba(120,150,230,.18)' : 'rgba(120,150,230,.08)';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.fillStyle = 'rgba(150,170,230,.38)'; ctx.fillText((d > 0 ? '+' : '') + d + '°', 4, y - 3);
      }
      // the seam where the north pole meets the south pole
      const ys = py(YMAX);
      if (ys > -2 && ys < H + 2) {
        ctx.strokeStyle = 'rgba(120,150,230,.3)'; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(0, ys); ctx.lineTo(W, ys); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(150,170,230,.5)';
        if (ys > 12) ctx.fillText('north celestial pole ↑', 4, ys - 4);
        if (ys < H - 12) ctx.fillText('south celestial pole ↓', 4, ys + 12);
      }
    }

    // ---- the year's sky
    const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
    // screen x of a run of ecliptic points, following the curve across the wrap (and shifted a whole sky left or right)
    function eclXY(pts, k) {
      const xs = [], ys = [];
      let x = px(pts[0][0]) + k * TAU * scale, prev = pts[0][0];
      for (let n = 0; n < pts.length; n++) { if (n) x -= wrap(pts[n][0] - prev) * scale; prev = pts[n][0]; xs.push(x); ys.push(py(pts[n][1])); }
      return [xs, ys];
    }
    function drawEcliptic() {
      const mid = [], N0 = ECL[1].length;
      for (let k = -1; k <= 1; k++) {
        const [xn, yn] = eclXY(ECL[2], k), [xs, ys] = eclXY(ECL[0], k), [x0, y0] = eclXY(ECL[1], k);
        if (Math.max(...x0) < -40 || Math.min(...x0) > W + 40) continue;
        ctx.beginPath(); // the zodiac band
        for (let n = 0; n < xn.length; n++) n ? ctx.lineTo(xn[n], yn[n]) : ctx.moveTo(xn[n], yn[n]);
        for (let n = xs.length - 1; n >= 0; n--) ctx.lineTo(xs[n], ys[n]);
        ctx.closePath(); ctx.fillStyle = 'rgba(255,217,138,.04)'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,217,138,.12)'; ctx.lineWidth = 1; ctx.setLineDash([2, 5]);
        ctx.beginPath(); for (let n = 0; n < xn.length; n++) n ? ctx.lineTo(xn[n], yn[n]) : ctx.moveTo(xn[n], yn[n]); ctx.stroke();
        ctx.beginPath(); for (let n = 0; n < xs.length; n++) n ? ctx.lineTo(xs[n], ys[n]) : ctx.moveTo(xs[n], ys[n]); ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(255,217,138,.5)'; ctx.lineWidth = 1.5; // the ecliptic itself
        ctx.beginPath(); for (let n = 0; n < x0.length; n++) n ? ctx.lineTo(x0[n], y0[n]) : ctx.moveTo(x0[n], y0[n]); ctx.stroke();
        mid.push([x0, y0]);
      }
      // a tick and a label at the start of each sign: the Sun's longitude and the date it gets there
      const signs = Y_.SIGNS, zoom = v.zoom;
      for (const [x0, y0] of mid) for (const sg of signs) {
        const n = sg.lon / 3, x = x0[n], y = y0[n];
        if (x < -30 || x > W + 30 || y < -20 || y > H + 20) continue;
        const a = Math.atan2(y0[Math.min(N0 - 1, n + 1)] - y0[Math.max(0, n - 1)], x0[Math.min(N0 - 1, n + 1)] - x0[Math.max(0, n - 1)]), nx = -Math.sin(a), ny = Math.cos(a);
        ctx.strokeStyle = 'rgba(255,217,138,.6)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - nx * 6, y - ny * 6); ctx.lineTo(x + nx * 6, y + ny * 6); ctx.stroke();
        if (zoom > 0.45) text(sg.glyph + (zoom > 0.9 ? ' ' + sg.date : ''), x + 3, y - 10 * Math.sign(ny || 1) - 1, 11, 'rgba(255,217,138,.78)', 'left', '500');
      }
      // the turning points of the Sun's year, and the poles of the ecliptic
      for (const pt of Y_.ECLIPTIC_POINTS) {
        const [ra, dec] = Y_.eclToEq(pt.lon, pt.lat), X = px(ra * RAD), Yp = py(millerY(dec));
        if (X < -30 || X > W + 30 || Yp < -20 || Yp > H + 20) continue;
        const pole = Math.abs(pt.lat) === 90;
        ctx.strokeStyle = 'rgba(255,217,138,.9)'; ctx.lineWidth = 1.4; ctx.beginPath();
        if (pole) { ctx.arc(X, Yp, 5, 0, TAU); ctx.moveTo(X - 8, Yp); ctx.lineTo(X + 8, Yp); ctx.moveTo(X, Yp - 8); ctx.lineTo(X, Yp + 8); }
        else { ctx.moveTo(X, Yp - 7); ctx.lineTo(X + 7, Yp); ctx.lineTo(X, Yp + 7); ctx.lineTo(X - 7, Yp); ctx.closePath(); }
        ctx.stroke();
        if (zoom > 0.8) text(pt.name + (pt.date ? ' · ' + pt.date : ''), X + 11, Yp + 4, 11, 'rgba(255,217,138,.85)', 'left', '600');
      }
      if (zoom > 0.7) for (const [x0, y0] of mid) { const n = 105, x = x0[n], y = y0[n]; if (x > 40 && x < W - 120 && y > 30 && y < H - 30) text('ECLIPTIC', x, y - 22, 11, 'rgba(255,217,138,.6)', 'center', '600'); }
    }
    // a meteor shower's radiant: bright while the shower runs (with meteors streaking out of it), dim in the weeks before
    function drawShowers(t, ui, S) {
      const now = G.now(), act = new Map(G.showersNow().map(x => [x.id, x])), up = new Map(Y_.upcoming(now, 13).map(x => [x.shower.id, x]));
      const zf = Math.min(2.4, 0.7 + 0.35 * Math.pow(v.zoom, 0.6)), ts = t / 1000;
      for (let i = 0; i < SH.length; i++) {
        shx[i] = px(shra[i]); shy[i] = py(shY[i]);
        const sh = SH[i], a = act.get(sh.id), u = up.get(sh.id);
        const hot = !!(ui.sel && ui.sel.type === 'shower' && ui.sel.i === i); // a selected radiant is always shown, even far from its dates
        const on = !!a, soon = !on && u && (u.wait <= 30 || hot);
        shvis[i] = (on || soon) && shx[i] > -40 && shx[i] < W + 40 && shy[i] > -40 && shy[i] < H + 40 ? 1 : 0;
        if (!shvis[i]) continue;
        const X = shx[i], Yp = shy[i], lv = on ? 0.4 + 0.6 * a.activity : 0.35;
        ctx.strokeStyle = 'rgba(190,226,255,' + lv.toFixed(2) + ')'; ctx.lineWidth = on ? 1.4 : 1;
        const R1 = (on ? 10 : 6) * (0.8 + 0.2 * zf);
        ctx.beginPath();
        for (let k = 0; k < 8; k++) { const ang = k * Math.PI / 4 + 0.2, r = k % 2 ? R1 * 0.55 : R1; ctx.moveTo(X + Math.cos(ang) * 2.5, Yp + Math.sin(ang) * 2.5); ctx.lineTo(X + Math.cos(ang) * r, Yp + Math.sin(ang) * r); }
        ctx.stroke();
        if (on) {
          const g = ctx.createRadialGradient(X, Yp, 0, X, Yp, 26 * zf); g.addColorStop(0, 'rgba(190,226,255,' + (0.28 * a.activity + 0.06).toFixed(2) + ')'); g.addColorStop(1, 'rgba(190,226,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Yp, 26 * zf, 0, TAU); ctx.fill();
          const n = Math.ceil(2 + 10 * a.activity);
          for (let m = 0; m < n; m++) { // a meteor lives about a third of its period, flying out of the radiant
            const period = 1.1 + 1.6 * hash(m, 1), off = hash(m, 2) * period, cyc = Math.floor((ts + off) / period), ph = ((ts + off) % period) / period;
            if (ph > 0.3) continue;
            const ang = hash(m + cyc * 0.37, 3) * TAU, d0 = (14 + 80 * hash(m + cyc, 4)) * zf, head = d0 + ph / 0.3 * (26 + 36 * hash(m, 5)) * zf, len = (9 + 16 * hash(m, 6)) * zf, al = (1 - ph / 0.3) * 0.9;
            const x1 = X + Math.cos(ang) * head, y1 = Yp + Math.sin(ang) * head, x0 = X + Math.cos(ang) * (head - len), y0 = Yp + Math.sin(ang) * (head - len);
            const gr = ctx.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(235,245,255,0)'); gr.addColorStop(1, 'rgba(245,250,255,' + al.toFixed(2) + ')');
            ctx.strokeStyle = gr; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          }
        }
        if (hot) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(X, Yp, 17, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        if (v.zoom > 0.55 || hot) {
          const when = on ? (Math.abs(a.daysToPeak) < 0.75 ? 'at its peak' : a.daysToPeak > 0 ? 'peak in ' + Math.round(a.daysToPeak) + ' d' : 'peak ' + Math.round(-a.daysToPeak) + ' d ago') : 'in ' + Math.round(u.wait) + ' d';
          text(sh.name + ' · ' + when, X + 13, Yp + 4, 11, on ? 'rgba(205,232,255,.95)' : 'rgba(170,200,235,.6)', 'left', on ? '600' : '');
        }
      }
    }
    // the position of a point offset from a sky position by `deg` degrees in the direction away from the Sun, on screen
    function awayFromSun(ra, dec, deg, sun) {
      const c = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)], s = [Math.cos(sun[1]) * Math.cos(sun[0]), Math.cos(sun[1]) * Math.sin(sun[0]), Math.sin(sun[1])];
      const d = c[0] * s[0] + c[1] * s[1] + c[2] * s[2];
      let u = [s[0] - d * c[0], s[1] - d * c[1], s[2] - d * c[2]];
      const n = Math.hypot(u[0], u[1], u[2]);
      if (n < 1e-6) return [px(ra), py(millerY(dec / RAD)) - 1]; // the Sun is on the comet: any way will do
      u = [-u[0] / n, -u[1] / n, -u[2] / n];
      const a = deg * RAD, p = [c[0] * Math.cos(a) + u[0] * Math.sin(a), c[1] * Math.cos(a) + u[1] * Math.sin(a), c[2] * Math.cos(a) + u[2] * Math.sin(a)];
      return [px(Math.atan2(p[1], p[0])), py(millerY(Math.asin(Math.max(-1, Math.min(1, p[2]))) / RAD))];
    }
    // a comet or nova while it cuts the routes: the comet drifts across the sky near its star with its ion tail straight away from the Sun and a dust
    // tail curving behind; a nova flares at its star
    function drawEventBodies(t, S) {
      const sun = Y_ ? Y_.sunEq(G.now()).map(x => x * RAD) : [0, 0], zf = Math.min(2.2, 0.75 + 0.3 * Math.pow(v.zoom, 0.5));
      for (const ev of S.events) {
        const c = ev.center;
        if (!svis[c]) continue;
        const u = Math.max(0, Math.min(1, 1 - ev.remaining / ev.total));
        if (ev.kind === 'nova') {
          const X = sx[c], Yp = sy[c], ph = (t / 1400) % 1;
          for (let k = 0; k < 3; k++) { const q = (ph + k / 3) % 1; ctx.strokeStyle = 'rgba(255,236,190,' + (0.6 * (1 - q)).toFixed(2) + ')'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(X, Yp, (8 + 40 * q) * zf, 0, TAU); ctx.stroke(); }
          const pulse = 0.75 + 0.25 * Math.sin(t / 160), q = 18 * zf * pulse, kk = q * 0.16;
          ctx.fillStyle = 'rgba(255,248,225,.95)'; ctx.beginPath();
          ctx.moveTo(X, Yp - q); ctx.lineTo(X + kk, Yp - kk); ctx.lineTo(X + q, Yp); ctx.lineTo(X + kk, Yp + kk); ctx.lineTo(X, Yp + q); ctx.lineTo(X - kk, Yp + kk); ctx.lineTo(X - q, Yp); ctx.lineTo(X - kk, Yp - kk); ctx.closePath(); ctx.fill();
          if (v.zoom > 0.5) text('✸ ' + ev.name, X + 16 * zf, Yp - 14 * zf, 11.5, 'rgba(255,240,205,.95)', 'left', '600');
          continue;
        }
        if (ev.kind !== 'comet') continue;
        const ang = ev.id * 2.399, L = 130 * zf, hx = sx[c] + Math.cos(ang) * (u - 0.5) * L, hy = sy[c] + Math.sin(ang) * (u - 0.5) * L * 0.6;
        const star = SKY.stars[c], [tx, ty] = awayFromSun(star[1] * RAD, star[2] * RAD, 3, sun);
        let dx = tx - sx[c], dy = ty - sy[c]; const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
        const tl = 140 * zf, px2 = -dy, py2 = dx; // the ion tail runs along (dx, dy); the dust tail leans to one side
        const ion = ctx.createLinearGradient(hx, hy, hx + dx * tl, hy + dy * tl); ion.addColorStop(0, 'rgba(140,210,255,.9)'); ion.addColorStop(1, 'rgba(140,210,255,0)');
        ctx.strokeStyle = ion; ctx.lineWidth = 2.2 * zf; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + dx * tl, hy + dy * tl); ctx.stroke();
        const dust = ctx.createLinearGradient(hx, hy, hx + dx * tl * 0.8, hy + dy * tl * 0.8); dust.addColorStop(0, 'rgba(255,226,170,.6)'); dust.addColorStop(1, 'rgba(255,226,170,0)');
        ctx.strokeStyle = dust; ctx.lineWidth = 7 * zf; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(hx + dx * tl * 0.5 + px2 * 12 * zf, hy + dy * tl * 0.5 + py2 * 12 * zf, hx + dx * tl * 0.85 + px2 * 30 * zf, hy + dy * tl * 0.85 + py2 * 30 * zf); ctx.stroke();
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 16 * zf); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.35, 'rgba(190,230,255,.5)'); g.addColorStop(1, 'rgba(190,230,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(hx, hy, 16 * zf, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 2.2 * zf, 0, TAU); ctx.fill();
        if (v.zoom > 0.5) text('☄ ' + ev.name, hx + 12 * zf, hy - 10 * zf, 11.5, 'rgba(210,235,255,.95)', 'left', '600');
      }
    }

    // ---- empires: every held star owns the ground nearest to it (limited to a reach around the star). The ground is tinted in its
    // owner's colour and the edge of an empire, against free sky or another empire, is drawn just inside its own ground.
    const REACH = 0.3, PLAYER_RGB = [143, 180, 255];
    let cells = null;
    const hexRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    function drawTerritories(S) {
      if (!cells) cells = Territory.build(sra.map((r, i) => [r, sY[i]]), { w: TAU, h: YP, reach: REACH });
      const rgb = [PLAYER_RGB].concat((S.rivals || []).map(r => hexRGB(r.color)));
      const own = k => (S.stars[k] ? 0 : S.owner && S.owner[k] !== undefined ? S.owner[k] + 1 : -1);
      const pad = REACH * scale + 6, spots = rgb.map(() => []);
      for (let i = 0; i < N; i++) {
        const o = own(i);
        if (o < 0 || o >= rgb.length) continue;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          const X = sx[i] + ox * TAU * scale, Y = sy[i] + oy * YP * scale;
          if (X < -pad || X > W + pad || Y < -pad || Y > H + pad) continue;
          spots[o].push(i, X, Y);
        }
      }
      const inset = 1.6;
      for (let o = 0; o < rgb.length; o++) {
        const list = spots[o];
        if (!list.length) continue;
        const col = rgb[o].join(',');
        const fill = new Path2D(), edge = new Path2D(), reach = new Path2D();
        for (let q = 0; q < list.length; q += 3) {
          const i = list[q], X = list[q + 1], Y = list[q + 2], c = cells[i], n = c.x.length;
          for (let k = 0; k < n; k++) {
            const x = X - c.x[k] * scale, y = Y - c.y[k] * scale;
            if (k) fill.lineTo(x, y); else fill.moveTo(x, y);
          }
          fill.closePath();
          for (let k = 0; k < n; k++) {
            const tag = c.tag[k];
            if (tag >= 0 && own(tag) === o) continue; // the inside of an empire has no border
            const k2 = k + 1 === n ? 0 : k + 1;
            const xa = X - c.x[k] * scale, ya = Y - c.y[k] * scale, xb = X - c.x[k2] * scale, yb = Y - c.y[k2] * scale;
            let nx = ya - yb, ny = xb - xa;
            const L = Math.hypot(nx, ny);
            if (L < 0.4) continue;
            if (tag < 0) { reach.moveTo(xa, ya); reach.lineTo(xb, yb); continue; } // where the reach of a lone star ends
            if ((X - xa) * nx + (Y - ya) * ny < 0) { nx = -nx; ny = -ny; } // inwards, towards the star
            const ix = nx / L * inset, iy = ny / L * inset;
            edge.moveTo(xa + ix, ya + iy); edge.lineTo(xb + ix, yb + iy);
          }
        }
        ctx.fillStyle = 'rgba(' + col + ',' + (o === 0 ? 0.11 : 0.09) + ')'; ctx.fill(fill);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (v.zoom > 0.6) { ctx.strokeStyle = 'rgba(' + col + ',.14)'; ctx.lineWidth = 6; ctx.stroke(edge); }
        ctx.strokeStyle = 'rgba(' + col + ',.28)'; ctx.lineWidth = 1; ctx.stroke(reach);
        ctx.strokeStyle = 'rgba(' + col + ',.9)'; ctx.lineWidth = o === 0 ? 2 : 1.6; ctx.stroke(edge);
      }
    }

    function render(t, ui) {
      if (!W) return;
      stepAnim();
      updateCam();
      const S = G.state, D = G.d;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#04060d'; ctx.fillRect(0, 0, W, H);
      graticule();

      // field stars
      const fz = Math.min(1.8, 0.8 + v.zoom * 0.18);
      for (let i = 0; i < NF; i++) {
        const y = cy - wrapY(fY[i] - v.y0) * scale;
        if (y < -4 || y > H + 4) continue;
        const x = cx - wrap(fra[i] - v.x0) * scale;
        if (x < -4 || x > W + 4) continue;
        const m = fm[i], a = Math.max(0.1, 0.62 - (m - 2) * 0.12);
        ctx.fillStyle = 'rgba(190,205,255,' + a.toFixed(2) + ')';
        const s = m < 4 ? 1.7 * fz : m < 5.3 ? 1.2 * fz : 0.9 * fz;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }

      // constellation names
      if (v.zoom < 3.2) {
        for (let i = 0; i < SKY.consts.length; i++) {
          const x = px(cra[i]), y = py(cY[i]);
          if (x < -60 || x > W + 60 || y < -20 || y > H + 20) continue;
          const cs = G.consStatus(i);
          const col = cs.mastered ? 'rgba(255,217,138,.75)' : cs.developed ? 'rgba(255,217,138,.55)' : cs.claimed ? 'rgba(160,190,255,.55)' : 'rgba(150,165,205,.24)';
          text(SKY.consts[i].name.toUpperCase(), x, y, v.zoom < 1 ? 9 : 11, col, 'center', '600');
        }
      }

      // project nodes
      for (let i = 0; i < N; i++) {
        sx[i] = px(sra[i]); sy[i] = py(sY[i]);
        svis[i] = sx[i] > -30 && sx[i] < W + 30 && sy[i] > -30 && sy[i] < H + 30 ? 1 : 0;
      }
      for (let i = 0; i < NM; i++) {
        mx[i] = px(mra[i]); my[i] = py(mY[i]);
        mvis[i] = mx[i] > -30 && mx[i] < W + 30 && my[i] > -30 && my[i] < H + 30 ? 1 : 0;
      }

      if (ui.borders !== false) drawTerritories(S);
      if (ui.skyLayer !== false && Y_) drawEcliptic();

      const evHot = new Set(), evEdges = new Set();
      for (const ev of S.events) for (const e of ev.edges) if (!ev.restored.includes(e)) { evEdges.add(e); evHot.add(SKY.edges[e][0]); evHot.add(SKY.edges[e][1]); }

      // routes
      const E = SKY.edges;
      ctx.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < E.length; i++) {
          const a = E[i][0], b = E[i][1], lane = E[i][2] < 0;
          const ca = !!S.stars[a], cb = !!S.stars[b];
          const both = ca && cb;
          if (evEdges.has(i)) continue; // cut routes vanish (see hints below)
          if ((pass === 0) === both) continue; // faint edges first, then active ones
          const rl = S.routeLvl[i] || 0;
          ctx.beginPath(); lineBetween(a, b);
          if (lane) {
            ctx.setLineDash(rl ? [] : [2, 5]);
            ctx.strokeStyle = both ? (rl ? 'rgba(255,225,160,.6)' : 'rgba(143,180,255,.38)') : (ca || cb) ? 'rgba(143,180,255,.14)' : 'rgba(143,180,255,.05)';
            ctx.lineWidth = both ? 1 + rl * 0.9 : 1;
          } else {
            ctx.setLineDash([]);
            ctx.strokeStyle = both ? (rl ? 'rgba(255,230,170,' + (0.8 + 0.06 * rl).toFixed(2) + ')' : 'rgba(190,215,255,.85)') : (ca || cb) ? 'rgba(160,185,240,.3)' : 'rgba(160,185,240,.13)';
            ctx.lineWidth = both ? 1.6 + rl * 0.9 : 1;
          }
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
      // hints for cut routes
      if (ui.redraw && ui.hint) {
        const ev = S.events.find(x => x.id === ui.redraw.id);
        if (ev) {
          ctx.setLineDash([4, 5]); ctx.strokeStyle = 'rgba(255,190,120,.55)'; ctx.lineWidth = 1.4;
          for (const e of ev.edges) if (!ev.restored.includes(e)) { ctx.beginPath(); lineBetween(E[e][0], E[e][1]); ctx.stroke(); }
          ctx.setLineDash([]);
        }
      }
      // the reach of a selected regional building
      if (ui.sel && ui.sel.type === 'star' && S.stars[ui.sel.i]) {
        const si = ui.sel.i;
        // a flagship's sector: the colonies that remit royalties to it (or, for an ordinary colony, the flagship it remits to)
        ctx.setLineDash([2, 5]); ctx.strokeStyle = 'rgba(255,217,138,.4)'; ctx.lineWidth = 1.2;
        if (G.isFlagship(si)) { for (const j of G.tributaries(si)) { ctx.beginPath(); lineBetween(si, j); ctx.stroke(); } }
        else { const f = G.sectorOf(si); if (f >= 0) { ctx.beginPath(); lineBetween(si, f); ctx.stroke(); } }
        ctx.setLineDash([]);
        const regional = G.buildingsAt(si).find(b => G.BUILDINGS[b.id].regional);
        if (regional && D.coverage[si]) {
          ctx.strokeStyle = G.BUILDINGS[regional.id].color; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.55;
          for (const i of D.coverage[si]) { if (!svis[i]) continue; ctx.beginPath(); ctx.arc(sx[i], sy[i], 9 + Math.sin(t / 500 + i) * 1.2, 0, TAU); ctx.stroke(); }
          ctx.globalAlpha = 1;
        }
      }
      // flashes (redraw feedback)
      for (const f of ui.flashes) {
        const age = (t - f.t) / 900; if (age > 1) continue;
        ctx.strokeStyle = f.ok ? 'rgba(126,226,168,' + (1 - age).toFixed(2) + ')' : 'rgba(255,120,120,' + (1 - age).toFixed(2) + ')';
        ctx.lineWidth = 3.2 * (1 - age) + 1; ctx.beginPath(); lineBetween(f.a, f.b); ctx.stroke();
      }

      // messier objects
      for (let i = 0; i < NM; i++) {
        if (!mvis[i]) continue;
        const vis = !!S.messier[i];
        const r = 5 + Math.min(4, v.zoom * 0.5);
        const hot = ui.sel && ui.sel.type === 'messier' && ui.sel.i === i;
        drawMessierGlyph(mx[i], my[i], SKY.messier[i].kind, r, vis, hot);
        if (v.zoom > 1.6 || vis && v.zoom > 1 || hot) text('M' + SKY.messier[i].n, mx[i] + r + 3, my[i] + 4, 10.5, vis ? 'rgba(127,227,255,.95)' : 'rgba(160,175,230,.55)');
      }

      // stars
      const front = ui.frontier;
      const zs = Math.pow(v.zoom, 0.25);
      for (let i = 0; i < N; i++) {
        if (!svis[i]) continue;
        const st = SKY.stars[i], mag = st[3], claimed = !!S.stars[i];
        const rv = !claimed && S.owner && S.owner[i] !== undefined ? S.owner[i] : -1; // held by a rival company
        const r = Math.max(1.8, (4.6 - 0.6 * mag)) * zs;
        const x = sx[i], y = sy[i];
        const rgb = starRGB[i];
        if (claimed) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4.2);
          g.addColorStop(0, 'rgba(' + rgb.join(',') + ',.55)'); g.addColorStop(1, 'rgba(' + rgb.join(',') + ',0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4.2, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = claimed || rv >= 0 ? starCol[i] : 'rgba(' + rgb.join(',') + ',.55)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        if (rv >= 0 && S.rivals[rv]) {
          const rc = hexRGB(S.rivals[rv].color).join(','), g2 = ctx.createRadialGradient(x, y, 0, x, y, r * 3.4);
          g2.addColorStop(0, 'rgba(' + rc + ',.4)'); g2.addColorStop(1, 'rgba(' + rc + ',0)');
          ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(x, y, r * 3.4, 0, TAU); ctx.fill();
          ctx.strokeStyle = 'rgba(' + rc + ',.85)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, TAU); ctx.stroke();
          if (ui.takeover && ui.takeover.has(i)) { // within reach of a takeover: a dashed ring that turns
            ctx.strokeStyle = 'rgba(' + rc + ',.95)'; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]); ctx.lineDashOffset = -t / 80;
            ctx.beginPath(); ctx.arc(x, y, r + 8 + 1.2 * Math.sin(t / 420 + i), 0, TAU); ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
          }
        }
        if (claimed) {
          const s = S.stars[i];
          const lv = s.r + s.b + s.o;
          const slots = G.slotsAt(i), rings = Math.min(8, slots); // one ring per building slot (three development levels each)
          const blds = G.buildingsAt(i);
          for (let k = 0; k < rings; k++) {
            const used = k < blds.length;
            ctx.strokeStyle = 'rgba(255,' + (217 + 4 * Math.min(k, 5)) + ',' + (138 + 18 * Math.min(k, 5)) + ',' + (used ? 0.55 : 0.34 + 0.05 * Math.min(k, 5)).toFixed(2) + ')';
            ctx.lineWidth = used ? 1.2 : 1;
            ctx.beginPath(); ctx.arc(x, y, r + 3 + k * 2.6, 0, TAU); ctx.stroke();
          }
          // every building is a small satellite orbiting on its own ring
          if (v.zoom > 0.9) {
            for (let k = 0; k < blds.length && k < rings; k++) {
              const def = G.BUILDINGS[blds[k].id];
              if (def.regional) continue;
              const ang = t / (1800 + k * 450) * (k % 2 ? -1 : 1) + i * 0.7 + k * 2.1, rr = r + 3 + k * 2.6, sx0 = x + Math.cos(ang) * rr, sy0 = y + Math.sin(ang) * rr, q = 1.7 + blds[k].lvl * 0.45;
              ctx.fillStyle = def.color; ctx.beginPath();
              if (def.cat === 'industry') ctx.rect(sx0 - q, sy0 - q, 2 * q, 2 * q);
              else if (def.cat === 'research') { ctx.moveTo(sx0, sy0 - q * 1.3); ctx.lineTo(sx0 + q * 1.3, sy0); ctx.lineTo(sx0, sy0 + q * 1.3); ctx.lineTo(sx0 - q * 1.3, sy0); ctx.closePath(); }
              else { ctx.moveTo(sx0, sy0 - q * 1.3); ctx.lineTo(sx0 + q * 1.2, sy0 + q); ctx.lineTo(sx0 - q * 1.2, sy0 + q); ctx.closePath(); }
              ctx.fill();
            }
          }
          const reg = blds.find(b => G.BUILDINGS[b.id].regional);
          if (reg) { // hexagon in the colour of the region-wide building
            const hr = r + 6 + rings * 2.6;
            ctx.strokeStyle = G.BUILDINGS[reg.id].color; ctx.lineWidth = 1.2 + reg.lvl * 0.5; ctx.beginPath();
            for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * hr, y + Math.sin(a) * hr); }
            ctx.closePath(); ctx.stroke();
          }
          const cap = G.stockCap(i), flag = G.isFlagship(i);
          const ready = flag ? D.accr[i] > 0 && s.s >= G.CFG.flagshipReadyH * 3600 * D.accr[i] : cap > 0 && s.s >= cap * 0.9;
          if (ready) { // storage is full (or a flagship's vault is worth a visit): a pulsing ring calls you back
            const pulse = 0.5 + 0.5 * Math.sin(t / 380 + i);
            ctx.strokeStyle = 'rgba(255,217,138,' + (0.5 + 0.4 * pulse).toFixed(2) + ')'; ctx.lineWidth = flag ? 2.6 : 2;
            ctx.beginPath(); ctx.arc(x, y, r + 12 + rings * 2.6 + pulse * 2, 0, TAU); ctx.stroke();
          } else if (!flag && s.s + s.i > 0 && cap > 0 && s.s >= cap * 0.35) {
            ctx.fillStyle = 'rgba(255,217,138,.9)'; ctx.beginPath(); ctx.arc(x + r + 3, y - r - 3, 2, 0, TAU); ctx.fill();
          }
        } else if (front.has(i)) {
          const pulse = 0.5 + 0.5 * Math.sin(t / 700 + i * 0.7);
          ctx.strokeStyle = 'rgba(143,180,255,' + (0.25 + 0.3 * pulse).toFixed(2) + ')'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, r + 4 + pulse * 1.5, 0, TAU); ctx.stroke();
        }
        if (evHot.has(i)) {
          const pulse = 0.5 + 0.5 * Math.sin(t / 220);
          ctx.strokeStyle = 'rgba(127,227,255,' + (0.55 + 0.4 * pulse).toFixed(2) + ')'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, r + 7 + pulse * 3, 0, TAU); ctx.stroke();
        }
        if (ui.redraw && ui.redraw.from === i) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, TAU); ctx.stroke(); }
        if (ui.sel && ui.sel.type === 'star' && ui.sel.i === i) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, r + 9, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        if (G.isFlagship(i)) sparkle(x - r - 6, y - r - 6, claimed ? 5 : 4, claimed ? 'rgba(255,217,138,.95)' : 'rgba(255,217,138,.5)');
        // labels: proper names for the important stars, official designations when zoomed in
        const showLabel = st[7] ? v.zoom > 0.85 : claimed ? v.zoom > 2.4 : v.zoom > 5;
        if (showLabel) text(st[6], x + r + 4, y + 4, st[7] ? 12 : 10.5, claimed || st[7] ? 'rgba(235,240,255,.92)' : 'rgba(170,185,230,.55)', 'left', st[7] ? '500' : '');
      }

      // headquarters: every company's name above its home star while the map is wide
      if (v.zoom < 4 && ui.borders !== false) {
        const hq = [[S.home, S.corp.name, 'rgb(' + PLAYER_RGB.join(',') + ')']].concat((S.rivals || []).filter(r => r.n > 0).map(r => [r.home, r.name, r.color]));
        for (const [i, name, col] of hq) if (svis[i] && (i === S.home || !S.stars[i])) text(name, sx[i], sy[i] - 16, v.zoom < 1 ? 10 : 11.5, col, 'center', '600');
      }

      if (Y_) { if (ui.skyLayer !== false) drawShowers(t, ui, S); drawEventBodies(t, S); }

      // fleets (drawn on the nearest world copy)
      for (const f of S.fleets) {
        const ra1 = sra[f.from], Y1 = sY[f.from];
        const toRa = f.kind === 's' ? sra[f.to] : mra[f.to], toY = f.kind === 's' ? sY[f.to] : mY[f.to];
        const dR = wrap(toRa - ra1), dY = wrapY(toY - Y1), frac = Math.max(0, Math.min(1, 1 - f.remaining / f.dur));
        const pos = k => ({ x: px(ra1) - dR * k * scale, y: py(Y1 + dY * k) });
        const p = pos(frac), q = pos(Math.max(0, frac - 0.03)), e = pos(1);
        ctx.strokeStyle = 'rgba(255,217,138,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.fillStyle = f.kind === 'm' ? '#7fe3ff' : '#ffd98a'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(255,217,138,.18)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(p.x, p.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.setLineDash([]);
      }
      // queued orders
      ctx.setLineDash([2, 4]);
      for (const o of S.orders) {
        const i = o.to; if (!svis[i]) continue;
        ctx.strokeStyle = 'rgba(255,217,138,.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(sx[i], sy[i], 11, 0, TAU); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    function fitTo(raList, YList, zoomMax) {
      const c = meanRA(raList);
      let ex = 0.02, ey = 0.02, ym = 0;
      raList.forEach((r, k) => { ex = Math.max(ex, Math.abs(wrap(r - c))); ym += YList[k]; });
      ym /= YList.length;
      YList.forEach(Y => { ey = Math.max(ey, Math.abs(Y - ym)); });
      const z = Math.min((W * 0.36) / (ex * baseScale()), (H * 0.36) / (ey * baseScale()));
      return { ra: ((c / RAD) + 360) % 360, y: ym, zoom: Math.max(0.8, Math.min(zoomMax || 8, z)) };
    }
    return {
      v, resize, render, pick, goTo, zoomBy: f => { v.zoom *= f; clampView(); anim = null; },
      pan: (dx, dy) => panPx(dx, dy), // move the map by (dx, dy) pixels, as if dragged
      goStar(i, zoom) { const s = SKY.stars[i]; goTo(s[1], s[2], zoom || Math.max(v.zoom, 3.2), 0, true); },
      goConst(c) {
        const ids = SKY.consts[c].stars;
        const f = fitTo(ids.map(i => sra[i]), ids.map(i => sY[i]));
        anim = { t0: performance.now(), ms: 700, from: { x0: v.x0, y0: v.y0, zoom: v.zoom }, to: { x0: f.ra * RAD, y0: f.y, zoom: f.zoom } };
        anim.to.x0 = anim.from.x0 + wrap(anim.to.x0 - anim.from.x0);
        anim.to.y0 = anim.from.y0 + wrapY(anim.to.y0 - anim.from.y0);
      },
      goMessier(i) { const m = SKY.messier[i]; goTo(m.ra, m.dec, Math.max(v.zoom, 3.2), 0, true); },
      goShower(i) { const sh = SH[i]; goTo(sh.ra, sh.dec, Math.max(v.zoom, 1.6), 0, true); },
      setFocus(x, y) { focus.x = x; focus.y = y; },
      screenOf(i) { return { x: sx[i], y: sy[i], vis: svis[i] }; },
      setView(ra, dec, zoom, focused) {
        v.zoom = zoom; clampView();
        const sc = v.zoom * baseScale() || 300;
        v.x0 = ra * RAD - (focused && W ? (cx - focus.x * W) / sc : 0); v.y0 = millerY(dec) - (focused && H ? (cy - focus.y * H) / sc : 0);
        clampView(); anim = null;
      },
    };
  }

  // ---- mini chart for codex cards and the constellation page (same projection as the map)
  function drawChart(canvas, G, c, opts) {
    opts = opts || {};
    const SKY = G.SKY, S = G.state;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.clientWidth || canvas.width, H = canvas.clientHeight || canvas.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cons = SKY.consts[c];
    const own = new Set(cons.stars);
    const edges = [];
    SKY.edges.forEach((e, i) => { if (e[2] === c) { edges.push(i); own.add(e[0]); own.add(e[1]); } });
    const ids = [...own];
    const rc = meanRA(ids.map(i => SKY.stars[i][1] * RAD));
    const pts = new Map();
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    ids.forEach(i => {
      const x = -wrap(SKY.stars[i][1] * RAD - rc), y = -millerY(SKY.stars[i][2]);
      pts.set(i, [x, y]); minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
    });
    const pad = opts.big ? 38 : 12;
    const sc = Math.min((W - 2 * pad) / Math.max(1e-6, maxx - minx), (H - 2 * pad) / Math.max(1e-6, maxy - miny));
    const ox = W / 2 - ((minx + maxx) / 2) * sc, oy = H / 2 - ((miny + maxy) / 2) * sc;
    const P = i => { const p = pts.get(i); return [ox + p[0] * sc, oy + p[1] * sc]; };
    const dev = !opts.quiz && !!S.devConst[c], master = !opts.quiz && !!S.masterConst[c];
    const lit = i => opts.quiz || !!S.stars[i]; // quiz figures show every star, regardless of ownership
    for (const e of edges) {
      const [a, b] = SKY.edges[e], A = lit(a), B = lit(b);
      const pa = P(a), pb = P(b);
      ctx.strokeStyle = A && B ? (master ? 'rgba(255,217,138,.95)' : dev ? 'rgba(255,225,160,.85)' : 'rgba(190,215,255,.85)') : 'rgba(150,170,220,.28)';
      ctx.lineWidth = A && B ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
    ids.forEach(i => {
      const st = SKY.stars[i], p = P(i), cl = lit(i);
      const r = Math.max(1.8, 4.2 - 0.5 * st[3]) * (opts.big ? 1.25 : 0.9);
      const rgb = bvRGB(st[4]);
      ctx.fillStyle = cl ? 'rgb(' + rgb.join(',') + ')' : 'rgba(' + rgb.join(',') + ',.4)';
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill();
      if (cl && opts.big && !opts.quiz) { ctx.strokeStyle = 'rgba(255,217,138,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p[0], p[1], r + 3, 0, TAU); ctx.stroke(); }
      if (opts.big && !opts.quiz && (cl || st[7])) {
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left';
        ctx.fillStyle = cl ? 'rgba(235,240,255,.9)' : 'rgba(170,185,230,.6)'; ctx.fillText(st[6], p[0] + r + 4, p[1] + 4);
      }
    });
    if (opts.mark !== undefined && pts.has(opts.mark)) { // quiz: circle one star
      const p = P(opts.mark);
      const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 26); g.addColorStop(0, 'rgba(255,217,138,.45)'); g.addColorStop(1, 'rgba(255,217,138,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p[0], p[1], 26, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], 11, 0, TAU); ctx.stroke();
    }
    if (opts.hit) { opts.hit.length = 0; ids.forEach(i => { const p = P(i); opts.hit.push({ i, x: p[0], y: p[1] }); }); }
  }

  window.Sky = { create, drawChart, bvRGB };
})();
