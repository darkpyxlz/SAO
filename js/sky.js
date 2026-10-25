/* Firmament sky renderer: a flat, horizontally wrapping star map (Miller cylindrical projection)
   with pan, zoom and picking, plus the small constellation charts used in the codex. */
(function () {
  'use strict';
  const RAD = Math.PI / 180;
  const PI = Math.PI, TAU = Math.PI * 2;
  const wrap = d => d - TAU * Math.floor((d + PI) / TAU); // -> [-PI, PI)
  const millerY = decDeg => 1.25 * Math.log(Math.tan(PI / 4 + 0.4 * decDeg * RAD));
  const YMAX = millerY(90);
  const OBLIQUITY = 23.4393 * RAD;

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

    const sra = SKY.stars.map(s => s[1] * RAD), sY = SKY.stars.map(s => millerY(s[2]));
    const mra = SKY.messier.map(m => m.ra * RAD), mY = SKY.messier.map(m => millerY(m.dec));
    const cra = SKY.consts.map(c => c.ra * RAD), cY = SKY.consts.map(c => millerY(c.dec));
    const starRGB = SKY.stars.map(s => bvRGB(s[4]));
    const starCol = starRGB.map(c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')');
    const F = SKY.field, NF = F.length / 3;
    const fra = new Float32Array(NF), fY = new Float32Array(NF), fm = new Float32Array(NF);
    for (let i = 0; i < NF; i++) { fra[i] = F[3 * i] / 100 * RAD; fY[i] = millerY(F[3 * i + 1] / 100); fm[i] = F[3 * i + 2] / 10; }
    const eclip = [];
    for (let l = 0; l <= 360; l += 4) { const lr = l * RAD; eclip.push([Math.atan2(Math.cos(OBLIQUITY) * Math.sin(lr), Math.cos(lr)), millerY(Math.asin(Math.sin(OBLIQUITY) * Math.sin(lr)) / RAD)]); }

    const sx = new Float32Array(N), sy = new Float32Array(N), svis = new Uint8Array(N);
    const mx = new Float32Array(NM), my = new Float32Array(NM), mvis = new Uint8Array(NM);
    let scale = 300;

    const baseScale = () => (Math.min(W, H) / 2) / 1.155;
    const minScale = () => Math.max(W / TAU, H / (2 * YMAX + 0.3));
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
      v.y0 = Math.max(-YMAX, Math.min(YMAX, v.y0));
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
    function goTo(ra, dec, zoom, ms) {
      anim = { t0: performance.now(), ms: ms || 700, from: { x0: v.x0, y0: v.y0, zoom: v.zoom }, to: { x0: ra * RAD, y0: millerY(dec), zoom: zoom || v.zoom } };
      anim.to.x0 = anim.from.x0 + wrap(anim.to.x0 - anim.from.x0);
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
    function pick(px, py, touch) {
      const R = touch ? 24 : 15;
      let best = null, bd = R * R;
      for (let i = 0; i < N; i++) {
        if (!svis[i]) continue;
        const d = (sx[i] - px) ** 2 + (sy[i] - py) ** 2;
        if (d < bd) { bd = d; best = { type: 'star', i }; }
      }
      for (let i = 0; i < NM; i++) {
        if (!mvis[i]) continue;
        const d = (mx[i] - px) ** 2 + (my[i] - py) ** 2;
        if (d < bd * 0.9) { bd = d; best = { type: 'messier', i }; }
      }
      return best;
    }

    // ---- drawing helpers
    const px = r => cx - wrap(r - v.x0) * scale;
    const py = Y => cy - (Y - v.y0) * scale;
    function lineBetween(a, b) { // route a->b, drawn on both sides of the seam when it crosses it
      const d = wrap(sra[b] - sra[a]) * scale;
      const xa = sx[a], ya = sy[a], xb = xa - d, yb = sy[b];
      const onscreen = (x1, y1, x2, y2) => !(Math.max(x1, x2) < -10 || Math.min(x1, x2) > W + 10 || Math.max(y1, y2) < -10 || Math.min(y1, y2) > H + 10);
      if (onscreen(xa, ya, xb, yb)) { ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); }
      if (Math.abs(xb - sx[b]) > 1) { const xa2 = sx[b] + d; if (onscreen(xa2, ya, sx[b], yb)) { ctx.moveTo(xa2, ya); ctx.lineTo(sx[b], yb); } }
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
      // ecliptic
      ctx.setLineDash([3, 6]); ctx.strokeStyle = 'rgba(255,217,138,.16)'; ctx.beginPath();
      let prevR = null, x = 0;
      for (const [r, Y] of eclip) {
        if (prevR === null) x = px(r); else x -= wrap(r - prevR) * scale;
        const y = py(Y);
        if (prevR === null) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        prevR = r;
      }
      ctx.stroke();
      // the same curve shifted one world to either side so the seam never shows a gap
      for (const k of [-1, 1]) {
        ctx.beginPath(); prevR = null;
        for (const [r, Y] of eclip) { if (prevR === null) x = px(r) + k * TAU * scale; else x -= wrap(r - prevR) * scale; const y = py(Y); if (prevR === null) ctx.moveTo(x, y); else ctx.lineTo(x, y); prevR = r; }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      // map edges at the celestial poles
      ctx.strokeStyle = 'rgba(120,150,230,.3)';
      for (const Y of [-YMAX, YMAX]) { const y = py(Y); if (y > -2 && y < H + 2) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } }
    }

    function render(t, ui) {
      if (!W) return;
      stepAnim();
      updateCam();
      const S = G.state, D = G.d;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#04060d'; ctx.fillRect(0, 0, W, H);
      // area beyond the poles
      ctx.fillStyle = '#020309';
      const yt = py(YMAX), yb = py(-YMAX);
      if (yt > 0) ctx.fillRect(0, 0, W, yt);
      if (yb < H) ctx.fillRect(0, yb, W, H - yb);
      graticule();

      // field stars
      const fz = Math.min(1.8, 0.8 + v.zoom * 0.18);
      for (let i = 0; i < NF; i++) {
        const y = cy - (fY[i] - v.y0) * scale;
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

      const evHot = new Set(), evEdges = new Set();
      for (const ev of S.events) for (const e of ev.edges) if (!ev.restored.includes(e)) { evEdges.add(e); evHot.add(SKY.edges[e][0]); evHot.add(SKY.edges[e][1]); }

      // routes
      const E = SKY.edges;
      ctx.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < E.length; i++) {
          if (!G.edgeActive(i)) continue; // buildable lanes only show once built
          const a = E[i][0], b = E[i][1], built = E[i][2] === -2, lane = E[i][2] < 0;
          const ca = !!S.stars[a], cb = !!S.stars[b];
          const both = ca && cb;
          if (evEdges.has(i)) continue; // cut routes vanish (see hints below)
          if ((pass === 0) === both) continue; // faint edges first, then active ones
          const rl = S.routeLvl[i] || 0;
          ctx.beginPath(); lineBetween(a, b);
          if (built) {
            ctx.setLineDash([7, 3]);
            ctx.strokeStyle = 'rgba(126,226,168,' + (0.55 + 0.12 * rl).toFixed(2) + ')'; ctx.lineWidth = 1.5 + rl * 0.9;
          } else if (lane) {
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
      // buildable lanes from the selected star, and the reach of a selected hub
      if (ui.sel && ui.sel.type === 'star' && S.stars[ui.sel.i]) {
        const si = ui.sel.i;
        ctx.setLineDash([3, 5]); ctx.strokeStyle = 'rgba(126,226,168,.5)'; ctx.lineWidth = 1.3;
        for (const bl of G.buildableLanes(si)) { ctx.beginPath(); lineBetween(si, bl.other); ctx.stroke(); }
        ctx.setLineDash([]);
        const hub = S.hubs[si];
        if (hub && D.coverage[si]) {
          ctx.strokeStyle = G.HUB_TYPES[hub.type].color; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.55;
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
        const r = Math.max(1.8, (4.6 - 0.6 * mag)) * zs;
        const x = sx[i], y = sy[i];
        const rgb = starRGB[i];
        if (claimed) {
          const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4.2);
          g.addColorStop(0, 'rgba(' + rgb.join(',') + ',.55)'); g.addColorStop(1, 'rgba(' + rgb.join(',') + ',0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 4.2, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = claimed ? starCol[i] : 'rgba(' + rgb.join(',') + ',.55)';
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        if (claimed) {
          const s = S.stars[i];
          const lv = s.r + s.b + s.o;
          const rings = Math.min(5, Math.floor(lv / 3)); // one ring per three upgrade levels
          for (let k = 0; k < rings; k++) {
            ctx.strokeStyle = 'rgba(255,' + (217 + 8 * k) + ',' + (138 + 24 * k) + ',' + (0.42 + 0.1 * k).toFixed(2) + ')';
            ctx.lineWidth = k === 4 ? 1.6 : 1;
            ctx.beginPath(); ctx.arc(x, y, r + 3 + k * 2.6, 0, TAU); ctx.stroke();
          }
          const hub = S.hubs[i];
          if (hub) { // hexagon in the hub's colour
            const hr = r + 5 + rings * 2.6 + 2;
            ctx.strokeStyle = G.HUB_TYPES[hub.type].color; ctx.lineWidth = 1.2 + hub.lvl * 0.5; ctx.beginPath();
            for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; ctx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * hr, y + Math.sin(a) * hr); }
            ctx.closePath(); ctx.stroke();
          }
          const cap = G.stockCap(i);
          if (cap > 0 && s.s >= cap * 0.9) {
            const pulse = 0.5 + 0.5 * Math.sin(t / 380 + i);
            ctx.strokeStyle = 'rgba(255,217,138,' + (0.5 + 0.4 * pulse).toFixed(2) + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, r + 16 + pulse * 2, 0, TAU); ctx.stroke();
          } else if (s.s + s.i > 0 && cap > 0 && s.s >= cap * 0.35) {
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
        // labels: proper names for the important stars, official designations when zoomed in
        const showLabel = st[7] ? v.zoom > 0.85 : claimed ? v.zoom > 2.4 : v.zoom > 5;
        if (showLabel) text(st[6], x + r + 4, y + 4, st[7] ? 12 : 10.5, claimed || st[7] ? 'rgba(235,240,255,.92)' : 'rgba(170,185,230,.55)', 'left', st[7] ? '500' : '');
      }

      // fleets (drawn on the nearest world copy)
      for (const f of S.fleets) {
        const ra1 = sra[f.from], Y1 = sY[f.from];
        const toRa = f.kind === 's' ? sra[f.to] : mra[f.to], toY = f.kind === 's' ? sY[f.to] : mY[f.to];
        const dR = wrap(toRa - ra1), frac = Math.max(0, Math.min(1, 1 - f.remaining / f.dur));
        const pos = k => ({ x: px(ra1) - dR * k * scale, y: py(Y1 + (toY - Y1) * k) });
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
      goStar(i, zoom) { const s = SKY.stars[i]; goTo(s[1], s[2], zoom || Math.max(v.zoom, 3.2)); },
      goConst(c) {
        const ids = SKY.consts[c].stars;
        const f = fitTo(ids.map(i => sra[i]), ids.map(i => sY[i]));
        anim = { t0: performance.now(), ms: 700, from: { x0: v.x0, y0: v.y0, zoom: v.zoom }, to: { x0: f.ra * RAD, y0: f.y, zoom: f.zoom } };
        anim.to.x0 = anim.from.x0 + wrap(anim.to.x0 - anim.from.x0);
      },
      goMessier(i) { const m = SKY.messier[i]; goTo(m.ra, m.dec, Math.max(v.zoom, 3.2)); },
      screenOf(i) { return { x: sx[i], y: sy[i], vis: svis[i] }; },
      setView(ra, dec, zoom) { v.x0 = ra * RAD; v.y0 = millerY(dec); v.zoom = zoom; clampView(); },
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
