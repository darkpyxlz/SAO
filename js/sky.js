/* Firmament sky renderer: stereographic star chart on a canvas, plus the small constellation charts used in the codex. */
(function () {
  'use strict';
  const RAD = Math.PI / 180;
  const TAU = Math.PI * 2;

  function vec(ra, dec) { const r = ra * RAD, d = dec * RAD, c = Math.cos(d); return [c * Math.cos(r), c * Math.sin(r), Math.sin(d)]; }
  function basis(ra0, dec0) {
    const r = ra0 * RAD, d = dec0 * RAD;
    return {
      c: [Math.cos(d) * Math.cos(r), Math.cos(d) * Math.sin(r), Math.sin(d)],
      e: [-Math.sin(r), Math.cos(r), 0],
      n: [-Math.sin(d) * Math.cos(r), -Math.sin(d) * Math.sin(r), Math.cos(d)],
    };
  }
  function slerp(a, b, t) {
    const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const w = Math.acos(dot);
    if (w < 1e-6) return a.slice();
    const s = Math.sin(w), k1 = Math.sin((1 - t) * w) / s, k2 = Math.sin(t * w) / s;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }
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

  function create(canvas, G, hooks) {
    const SKY = G.SKY;
    const N = SKY.stars.length, NM = SKY.messier.length;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const v = { ra0: 83, dec0: 5, zoom: 1.4 };
    let anim = null;

    const sv = SKY.stars.map(s => vec(s[1], s[2]));
    const mv = SKY.messier.map(m => vec(m.ra, m.dec));
    const starRGB = SKY.stars.map(s => bvRGB(s[4]));
    const starCol = starRGB.map(c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')');
    const cv = SKY.consts.map(c => vec(c.ra, c.dec));
    const F = SKY.field, NF = F.length / 3;
    const fv = new Float32Array(NF * 3), fm = new Float32Array(NF);
    for (let i = 0; i < NF; i++) { const p = vec(F[3 * i] / 100, F[3 * i + 1] / 100); fv[3 * i] = p[0]; fv[3 * i + 1] = p[1]; fv[3 * i + 2] = p[2]; fm[i] = F[3 * i + 2] / 10; }

    const sx = new Float32Array(N), sy = new Float32Array(N), svis = new Uint8Array(N);
    const mx = new Float32Array(NM), my = new Float32Array(NM), mvis = new Uint8Array(NM);
    let B = basis(v.ra0, v.dec0), scale = 300, cx = 0, cy = 0;

    function resize() {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      cx = W / 2; cy = H / 2;
    }
    function updateCam() {
      B = basis(v.ra0, v.dec0);
      scale = (Math.min(W, H) / 2) / 1.155 * v.zoom * (Math.max(W, H) / Math.min(W, H) > 1.6 ? 1.15 : 1);
    }
    function proj(p, out) { // -> sets out.x,out.y,out.vis
      const cosc = p[0] * B.c[0] + p[1] * B.c[1] + p[2] * B.c[2];
      if (cosc < -0.75) { out.vis = 0; return out; }
      const k = 2 / (1 + cosc);
      out.x = cx - k * (p[0] * B.e[0] + p[1] * B.e[1] + p[2] * B.e[2]) * scale;
      out.y = cy - k * (p[0] * B.n[0] + p[1] * B.n[1] + p[2] * B.n[2]) * scale;
      out.vis = 1; return out;
    }
    const tmp = { x: 0, y: 0, vis: 0 };

    // ---- camera control
    function clampView() { v.dec0 = Math.max(-89, Math.min(89, v.dec0)); v.ra0 = ((v.ra0 % 360) + 360) % 360; v.zoom = Math.max(0.55, Math.min(60, v.zoom)); }
    function panPx(dx, dy, px, py) {
      updateCam();
      const rx = (cx - px) / scale, ry = (cy - py) / scale; // plane coords of pointer
      const loc = scale * (1 + (rx * rx + ry * ry) / 4);
      v.ra0 += (dx / (loc * Math.max(0.15, Math.cos(v.dec0 * RAD)))) / RAD;
      v.dec0 += (dy / loc) / RAD;
      clampView(); anim = null;
    }
    function zoomAt(f, px, py) {
      v.zoom *= f; clampView(); anim = null;
    }
    function goTo(ra, dec, zoom, ms) {
      anim = { t0: performance.now(), ms: ms || 700, from: { ra0: v.ra0, dec0: v.dec0, zoom: v.zoom }, to: { ra0: ra, dec0: dec, zoom: zoom || v.zoom } };
      let d = anim.to.ra0 - anim.from.ra0; if (d > 180) anim.from.ra0 += 360; if (d < -180) anim.from.ra0 -= 360;
    }
    function stepAnim() {
      if (!anim) return;
      const t = Math.min(1, (performance.now() - anim.t0) / anim.ms), e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      v.ra0 = anim.from.ra0 + (anim.to.ra0 - anim.from.ra0) * e;
      v.dec0 = anim.from.dec0 + (anim.to.dec0 - anim.from.dec0) * e;
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
      if (ptrs.size === 1) { moved += Math.abs(dx) + Math.abs(dy); if (moved > 6) panPx(dx, dy, e.clientX, e.clientY); }
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

    // ---- drawing
    function edgePath(a, b, deg) {
      const n = Math.max(1, Math.ceil(deg / 3));
      let started = false;
      for (let k = 0; k <= n; k++) {
        const p = k === 0 ? sv[a] : k === n ? sv[b] : slerp(sv[a], sv[b], k / n);
        proj(p, tmp);
        if (!tmp.vis) { started = false; continue; }
        if (!started) { ctx.moveTo(tmp.x, tmp.y); started = true; } else ctx.lineTo(tmp.x, tmp.y);
      }
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

    function render(t, ui) {
      if (!W) return;
      stepAnim();
      updateCam();
      const S = G.state, D = G.d;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // background
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.8);
      bg.addColorStop(0, '#0b1124'); bg.addColorStop(1, '#03050b');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // field stars
      const fz = Math.min(1.8, 0.8 + v.zoom * 0.18);
      for (let i = 0; i < NF; i++) {
        const cosc = fv[3 * i] * B.c[0] + fv[3 * i + 1] * B.c[1] + fv[3 * i + 2] * B.c[2];
        if (cosc < -0.75) continue;
        const k = 2 / (1 + cosc);
        const x = cx - k * (fv[3 * i] * B.e[0] + fv[3 * i + 1] * B.e[1] + fv[3 * i + 2] * B.e[2]) * scale;
        if (x < -4 || x > W + 4) continue;
        const y = cy - k * (fv[3 * i] * B.n[0] + fv[3 * i + 1] * B.n[1] + fv[3 * i + 2] * B.n[2]) * scale;
        if (y < -4 || y > H + 4) continue;
        const m = fm[i], a = Math.max(0.1, 0.62 - (m - 2) * 0.12);
        ctx.fillStyle = 'rgba(190,205,255,' + a.toFixed(2) + ')';
        const s = m < 4 ? 1.7 * fz : m < 5.3 ? 1.2 * fz : 0.9 * fz;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }

      // constellation names
      if (v.zoom < 3.2) {
        for (let i = 0; i < cv.length; i++) {
          proj(cv[i], tmp);
          if (!tmp.vis || tmp.x < -60 || tmp.x > W + 60 || tmp.y < -20 || tmp.y > H + 20) continue;
          const cs = G.consStatus(i);
          const col = cs.mastered ? 'rgba(255,217,138,.75)' : cs.developed ? 'rgba(255,217,138,.55)' : cs.claimed ? 'rgba(160,190,255,.55)' : 'rgba(150,165,205,.24)';
          text(SKY.consts[i].name.toUpperCase(), tmp.x, tmp.y, v.zoom < 1 ? 9 : 11, col, 'center', '600');
        }
      }

      // project nodes
      for (let i = 0; i < N; i++) { proj(sv[i], tmp); svis[i] = tmp.vis && tmp.x > -30 && tmp.x < W + 30 && tmp.y > -30 && tmp.y < H + 30 ? 1 : 0; sx[i] = tmp.x; sy[i] = tmp.y; }
      for (let i = 0; i < NM; i++) { proj(mv[i], tmp); mvis[i] = tmp.vis && tmp.x > -30 && tmp.x < W + 30 && tmp.y > -30 && tmp.y < H + 30 ? 1 : 0; mx[i] = tmp.x; my[i] = tmp.y; }

      const evHot = new Set(), evEdges = new Set();
      for (const ev of S.events) for (const e of ev.edges) if (!ev.restored.includes(e)) { evEdges.add(e); evHot.add(SKY.edges[e][0]); evHot.add(SKY.edges[e][1]); }

      // routes
      const E = SKY.edges;
      ctx.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < E.length; i++) {
          const a = E[i][0], b = E[i][1], lane = E[i][2] < 0;
          if (!svis[a] && !svis[b]) continue;
          const ca = !!S.stars[a], cb = !!S.stars[b];
          const both = ca && cb;
          if (evEdges.has(i)) continue; // cut routes vanish (see hints below)
          if ((pass === 0) === both) continue; // faint edges first, then active ones
          ctx.beginPath(); edgePath(a, b, G.edgeLen[i]);
          if (lane) {
            ctx.setLineDash([2, 5]);
            ctx.strokeStyle = both ? 'rgba(143,180,255,.38)' : (ca || cb) ? 'rgba(143,180,255,.14)' : 'rgba(143,180,255,.05)';
            ctx.lineWidth = 1;
          } else {
            ctx.setLineDash([]);
            ctx.strokeStyle = both ? 'rgba(190,215,255,.85)' : (ca || cb) ? 'rgba(160,185,240,.3)' : 'rgba(160,185,240,.13)';
            ctx.lineWidth = both ? 1.6 : 1;
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
          for (const e of ev.edges) if (!ev.restored.includes(e)) { ctx.beginPath(); edgePath(E[e][0], E[e][1], G.edgeLen[e]); ctx.stroke(); }
          ctx.setLineDash([]);
        }
      }
      // flashes (redraw feedback)
      for (const f of ui.flashes) {
        const age = (t - f.t) / 900; if (age > 1) continue;
        ctx.strokeStyle = f.ok ? 'rgba(126,226,168,' + (1 - age).toFixed(2) + ')' : 'rgba(255,120,120,' + (1 - age).toFixed(2) + ')';
        ctx.lineWidth = 3.2 * (1 - age) + 1; ctx.beginPath();
        proj(sv[f.a], tmp); const x1 = tmp.x, y1 = tmp.y; proj(sv[f.b], tmp);
        ctx.moveTo(x1, y1); ctx.lineTo(tmp.x, tmp.y); ctx.stroke();
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
          if (lv >= 9) { ctx.strokeStyle = 'rgba(255,217,138,.9)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, TAU); ctx.stroke(); }
          else if (lv >= 3) { ctx.strokeStyle = 'rgba(255,217,138,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, TAU); ctx.stroke(); }
          const cap = D.rate[i] * D.cap[i];
          if (cap > 0 && s.s >= cap * 0.9) {
            const pulse = 0.5 + 0.5 * Math.sin(t / 380 + i);
            ctx.strokeStyle = 'rgba(255,217,138,' + (0.5 + 0.4 * pulse).toFixed(2) + ')'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(x, y, r + 6 + pulse * 2, 0, TAU); ctx.stroke();
          } else if (s.s + s.i > 0 && cap > 0 && s.s >= cap * 0.35) {
            ctx.fillStyle = 'rgba(255,217,138,.9)'; ctx.beginPath(); ctx.arc(x + r + 3, y - r - 3, 2, 0, TAU); ctx.fill();
          }
        } else if (front.has(i)) {
          const pulse = 0.5 + 0.5 * Math.sin(t / 700 + i * 0.7);
          ctx.strokeStyle = 'rgba(143,180,255,' + (0.25 + 0.3 * pulse).toFixed(2) + ')'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, y, r + 4 + pulse * 1.5, 0, TAU); ctx.stroke();
        }
        if (G.wonderAt.has(i)) { // diamond marker for wonders
          const done = !!S.wonderDone[i];
          ctx.strokeStyle = done ? 'rgba(255,217,138,.95)' : 'rgba(255,217,138,.4)'; ctx.lineWidth = 1;
          const q = r + 8; ctx.beginPath(); ctx.moveTo(x, y - q); ctx.lineTo(x + q, y); ctx.lineTo(x, y + q); ctx.lineTo(x - q, y); ctx.closePath(); ctx.stroke();
        }
        if (evHot.has(i)) {
          const pulse = 0.5 + 0.5 * Math.sin(t / 220);
          ctx.strokeStyle = 'rgba(127,227,255,' + (0.55 + 0.4 * pulse).toFixed(2) + ')'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, r + 7 + pulse * 3, 0, TAU); ctx.stroke();
        }
        if (ui.redraw && ui.redraw.from === i) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r + 5, 0, TAU); ctx.stroke(); }
        if (ui.sel && ui.sel.type === 'star' && ui.sel.i === i) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, r + 9, 0, TAU); ctx.stroke(); ctx.setLineDash([]); }
        // labels
        const showLabel = (claimed && (v.zoom > 0.9 || st[7])) && (v.zoom > 2.2 || st[7] || mag < 2.5) || (!claimed && (v.zoom > 4.5 || (st[7] && mag < 2.2 && v.zoom > 1.9)));
        if (showLabel) text(st[6], x + r + 4, y + 4, claimed ? 11.5 : 10.5, claimed ? 'rgba(235,240,255,.92)' : 'rgba(170,185,230,.55)');
      }

      // fleets
      for (const f of S.fleets) {
        const a = sv[f.from], b = f.kind === 's' ? sv[f.to] : mv[f.to];
        const p = slerp(a, b, Math.max(0, Math.min(1, 1 - f.remaining / f.dur)));
        proj(p, tmp); if (!tmp.vis) continue;
        const q = slerp(a, b, Math.max(0, 1 - f.remaining / f.dur - 0.02)); const x0 = tmp.x, y0 = tmp.y; proj(q, tmp);
        ctx.strokeStyle = 'rgba(255,217,138,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tmp.x, tmp.y); ctx.lineTo(x0, y0); ctx.stroke();
        ctx.fillStyle = f.kind === 'm' ? '#7fe3ff' : '#ffd98a'; ctx.beginPath(); ctx.arc(x0, y0, 3.2, 0, TAU); ctx.fill();
        // path preview
        ctx.strokeStyle = 'rgba(255,217,138,.18)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.beginPath();
        proj(p, tmp); const px = tmp.x, py = tmp.y; ctx.moveTo(px, py); proj(b, tmp); ctx.lineTo(tmp.x, tmp.y); ctx.stroke(); ctx.setLineDash([]);
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

    function visibleMid() { return { ra: v.ra0, dec: v.dec0, zoom: v.zoom }; }
    return {
      v, resize, render, pick, goTo, zoomBy: f => { v.zoom *= f; clampView(); },
      goStar(i, zoom) { const s = SKY.stars[i]; goTo(s[1], s[2], zoom || Math.max(v.zoom, 3.2)); },
      goConst(c) {
        const cs = SKY.consts[c], pts = cs.stars.map(i => sv[i]);
        let m = [0, 0, 0]; pts.forEach(p => { m[0] += p[0]; m[1] += p[1]; m[2] += p[2]; });
        const L = Math.hypot(m[0], m[1], m[2]) || 1; m = m.map(x => x / L);
        let ext = 1; pts.forEach(p => { ext = Math.max(ext, Math.acos(Math.min(1, p[0] * m[0] + p[1] * m[1] + p[2] * m[2])) / RAD); });
        const ra = ((Math.atan2(m[1], m[0]) / RAD) + 360) % 360, dec = Math.asin(m[2]) / RAD;
        goTo(ra, dec, Math.max(0.8, Math.min(8, 52 / (ext + 8))));
      },
      goMessier(i) { const m = SKY.messier[i]; goTo(m.ra, m.dec, Math.max(v.zoom, 3.2)); },
      screenOf(i) { return { x: sx[i], y: sy[i], vis: svis[i] }; },
      setView(ra, dec, zoom) { v.ra0 = ra; v.dec0 = dec; v.zoom = zoom; clampView(); },
      visibleMid,
    };
  }

  // ---- mini chart for codex cards and the constellation page
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
    let m = [0, 0, 0];
    ids.forEach(i => { const p = vec(SKY.stars[i][1], SKY.stars[i][2]); m[0] += p[0]; m[1] += p[1]; m[2] += p[2]; });
    const L = Math.hypot(m[0], m[1], m[2]) || 1; m = m.map(x => x / L);
    const ra = ((Math.atan2(m[1], m[0]) / RAD) + 360) % 360, dec = Math.asin(m[2]) / RAD;
    const Bs = basis(ra, dec);
    const pts = new Map();
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    ids.forEach(i => {
      const p = vec(SKY.stars[i][1], SKY.stars[i][2]);
      const cosc = p[0] * Bs.c[0] + p[1] * Bs.c[1] + p[2] * Bs.c[2], k = 2 / (1 + cosc);
      const x = -k * (p[0] * Bs.e[0] + p[1] * Bs.e[1] + p[2] * Bs.e[2]), y = -k * (p[0] * Bs.n[0] + p[1] * Bs.n[1] + p[2] * Bs.n[2]);
      pts.set(i, [x, y]); minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
    });
    const pad = opts.big ? 38 : 12;
    const sc = Math.min((W - 2 * pad) / Math.max(1e-6, maxx - minx), (H - 2 * pad) / Math.max(1e-6, maxy - miny), opts.big ? 1e9 : 1e9);
    const ox = W / 2 - ((minx + maxx) / 2) * sc, oy = H / 2 - ((miny + maxy) / 2) * sc;
    const P = i => { const p = pts.get(i); return [ox + p[0] * sc, oy + p[1] * sc]; };
    const dev = !!S.devConst[c], master = !!S.masterConst[c];
    for (const e of edges) {
      const [a, b] = SKY.edges[e], A = !!S.stars[a], B = !!S.stars[b];
      const pa = P(a), pb = P(b);
      ctx.strokeStyle = A && B ? (master ? 'rgba(255,217,138,.95)' : dev ? 'rgba(255,225,160,.85)' : 'rgba(190,215,255,.85)') : 'rgba(150,170,220,.28)';
      ctx.lineWidth = A && B ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
    ids.forEach(i => {
      const st = SKY.stars[i], p = P(i), cl = !!S.stars[i];
      const r = Math.max(1.8, 4.2 - 0.5 * st[3]) * (opts.big ? 1.25 : 0.9);
      const rgb = bvRGB(st[4]);
      ctx.fillStyle = cl ? 'rgb(' + rgb.join(',') + ')' : 'rgba(' + rgb.join(',') + ',.4)';
      ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill();
      if (cl && opts.big) { ctx.strokeStyle = 'rgba(255,217,138,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p[0], p[1], r + 3, 0, TAU); ctx.stroke(); }
      if (opts.big && (cl || opts.labelAll)) {
        ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(235,240,255,.9)'; ctx.fillText(st[6], p[0] + r + 4, p[1] + 4);
      }
    });
    if (opts.hit) opts.hit.length = 0;
    if (opts.hit) ids.forEach(i => { const p = P(i); opts.hit.push({ i, x: p[0], y: p[1] }); });
  }

  window.Sky = { create, drawChart, bvRGB, vec, slerp };
})();
