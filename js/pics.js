/* Pictures of the Messier objects for the catalogue and Sky School: real photographs when available, with a
   procedural illustration of the object *type* (seeded per object) as a placeholder and fallback. */
(function () {
  'use strict';
  const R = 168; // internal resolution; scaled to the canvas size

  function rngOf(seed) {
    let s = (Math.imul(seed + 1, 2654435761) >>> 0) || 7;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function hash(ix, iy, seed) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1274126177)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function vnoise(x, y, seed) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed), c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, seed, oct) {
    let a = 0.5, f = 1, sum = 0, norm = 0;
    for (let o = 0; o < (oct || 5); o++) { sum += a * vnoise(x * f, y * f, seed + o * 17); norm += a; f *= 2; a *= 0.5; }
    return sum / norm;
  }
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // overrides for a few famous objects: M number -> parameters
  const SPECIAL = {
    31: { q: 0.32, rot: -0.75, scale: 1.25 }, 33: { q: 0.8, rot: 0.4 }, 51: { q: 0.9, rot: 0.3, companion: true }, 63: { q: 0.45, rot: 0.2 },
    64: { q: 0.55, rot: 0.8 }, 74: { q: 0.97 }, 81: { q: 0.5, rot: -0.5 }, 83: { q: 0.92 }, 101: { q: 0.98 }, 104: { q: 0.14, rot: -0.15, bulge: 2.4, scale: 1.1 },
    106: { q: 0.4, rot: 0.9 }, 65: { q: 0.28, rot: 0.9 }, 66: { q: 0.4, rot: 1.0 }, 108: { q: 0.15, rot: 0.2 }, 98: { q: 0.25, rot: 0.1 }, 99: { q: 0.95 }, 100: { q: 0.9 },
  };

  function render(M) {
    const rnd = rngOf(M.n * 101 + 7), seed = M.n * 13 + 5;
    const buf = new Float32Array(R * R * 3);
    const sp = SPECIAL[M.n] || {};
    const tname = M.tname;

    const add = (x, y, r, g, b) => { const i = (y * R + x) * 3; buf[i] += r; buf[i + 1] += g; buf[i + 2] += b; };
    function glow(cx, cy, sigma, col, amp) { // gaussian blob in normalised coords (-1..1)
      const px = (cx + 1) / 2 * R, py = (cy + 1) / 2 * R, s = sigma / 2 * R, rad = Math.ceil(s * 3);
      const x0 = Math.max(0, Math.floor(px - rad)), x1 = Math.min(R - 1, Math.ceil(px + rad)), y0 = Math.max(0, Math.floor(py - rad)), y1 = Math.min(R - 1, Math.ceil(py + rad));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const d2 = ((x - px) ** 2 + (y - py) ** 2) / (s * s), w = amp * Math.exp(-0.5 * d2);
        if (w > 1e-4) add(x, y, col[0] * w, col[1] * w, col[2] * w);
      }
    }
    function star(cx, cy, b, col) { // b ~ 0..1 brightness
      glow(cx, cy, 0.012 + 0.012 * b, col, 0.55 + 1.2 * b);
      if (b > 0.5) { glow(cx, cy, 0.05 + 0.05 * b, col, 0.18 * b); }
    }
    function fieldStars(n, spread) {
      for (let i = 0; i < n; i++) {
        const a = rnd() * 6.283, r = Math.sqrt(rnd()) * (spread || 1.35);
        star(Math.cos(a) * r, Math.sin(a) * r, Math.pow(rnd(), 3) * 0.7, [200, 215, 255]);
      }
    }
    // per-pixel painter in normalised coords
    function paint(fn) {
      for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
        const nx = (x + 0.5) / R * 2 - 1, ny = (y + 0.5) / R * 2 - 1;
        const c = fn(nx, ny); if (c) add(x, y, c[0], c[1], c[2]);
      }
    }
    const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    let dim = null; // optional per-pixel darkening (dust lanes)

    if (tname === 'Globular cluster') {
      const n = 1500, a = 0.2 * (0.85 + rnd() * 0.4);
      glow(0, 0, 0.2, [255, 225, 175], 0.55); glow(0, 0, 0.07, [255, 245, 220], 0.7);
      for (let i = 0; i < n; i++) {
        const u = Math.max(1e-3, Math.min(0.999, rnd())), r = a / Math.sqrt(Math.pow(u, -2 / 3) - 1);
        if (r > 1.25) continue;
        const t = rnd() * 6.283, b = Math.pow(rnd(), 4);
        const warm = rnd();
        star(Math.cos(t) * r, Math.sin(t) * r, b * 0.8, warm > 0.9 ? [255, 170, 110] : warm > 0.1 ? [255, 238, 205] : [190, 210, 255]);
      }
      fieldStars(14);
    } else if (tname === 'Open cluster') {
      const n = 40 + Math.floor(rnd() * 45);
      if (M.n === 45) { glow(0.1, 0.05, 0.55, [90, 130, 255], 0.35); glow(-0.2, -0.1, 0.35, [110, 150, 255], 0.25); }
      for (let i = 0; i < n; i++) {
        const a = rnd() * 6.283, r = Math.abs((rnd() + rnd() + rnd() - 1.5)) * 1.1;
        const c = rnd(), b = Math.pow(rnd(), 2.5);
        star(Math.cos(a) * r, Math.sin(a) * r, 0.15 + b * 0.85, c > 0.75 ? [255, 225, 170] : c > 0.2 ? [205, 220, 255] : [160, 190, 255]);
      }
      fieldStars(12);
    } else if (tname === 'Spiral galaxy') {
      const q = sp.q !== undefined ? sp.q : 0.3 + rnd() * 0.65, th = sp.rot !== undefined ? sp.rot : rnd() * 3.14, sc = (sp.scale || 1) * 0.78;
      const arms = rnd() > 0.35 ? 2 : 3, k = 2.2 + rnd() * 1.6, bulge = sp.bulge || 1;
      glow(0, 0, 0.14 * bulge, [255, 225, 160], 0.9); glow(0, 0, 0.35, [255, 220, 170], 0.22);
      const N = 4500;
      for (let i = 0; i < N; i++) {
        const r = -Math.log(1 - rnd() * 0.97) * 0.26 * sc;
        const arm = Math.floor(rnd() * arms) * (6.283 / arms);
        const t = arm + k * Math.log(1 + r / 0.08) + (rnd() - 0.5) * (0.8 + 0.5 * (1 - Math.exp(-r * 2)));
        let x = Math.cos(t) * r, y = Math.sin(t) * r * q;
        [x, y] = rot(x, y, th);
        if (Math.abs(x) > 1.2 || Math.abs(y) > 1.2) continue;
        const f = Math.min(1, r / (0.7 * sc)), pink = rnd() < 0.05;
        const col = pink ? [255, 120, 160] : [255 - 90 * f, 225 - 40 * f, 170 + 85 * f];
        glow(x, y, 0.016, col, pink ? 0.9 : 0.22 + 0.2 * (1 - f));
      }
      glow(0, 0, 0.28 * sc, [200, 190, 220], 0.12);
      if (q < 0.5) { const [ax, ay] = rot(1, 0, th); const [bx, by] = rot(0, 1, th); dim = (nx, ny) => { const perp = Math.abs(nx * bx + ny * by), along = Math.abs(nx * ax + ny * ay); return 1 - 0.75 * Math.exp(-((perp / (0.035 + q * 0.05)) ** 2)) * smooth(1.0, 0.1, along); }; }
      if (sp.companion) { glow(0.55, -0.45, 0.07, [255, 220, 170], 0.7); glow(0.55, -0.45, 0.18, [255, 220, 190], 0.18); }
      fieldStars(10);
    } else if (tname === 'Elliptical galaxy') {
      const q = 0.55 + rnd() * 0.4, th = rnd() * 3.14;
      paint((nx, ny) => { const [x, y] = rot(nx, ny, th); const re = Math.hypot(x, y / q); const I = Math.exp(-7.67 * (Math.pow(re / 0.5, 0.25) - 1)) * 0.5; return [255 * I, 225 * I, 175 * I]; });
      fieldStars(14);
    } else if (tname === 'Irregular galaxy') {
      const th = -0.45;
      paint((nx, ny) => {
        const [x, y] = rot(nx, ny, th); const re = Math.hypot(x / 1.0, y / 0.2);
        const n = fbm(nx * 4 + 3, ny * 4, seed, 5);
        const I = Math.exp(-((re / 0.6) ** 1.4)) * (0.45 + 1.1 * n);
        const red = Math.exp(-(x * x) / 0.12) * Math.exp(-((Math.abs(y) - 0.12) ** 2) / 0.02) * (0.3 + n);
        return [255 * I * 0.6 + 255 * red * 0.9, 215 * I * 0.6 + 90 * red * 0.5, 175 * I * 0.6 + 80 * red * 0.4];
      });
      fieldStars(10);
    } else if (tname === 'Star-forming nebula' || tname === 'Reflection nebula') {
      const refl = tname === 'Reflection nebula';
      const ox = rnd() * 50, oy = rnd() * 50;
      paint((nx, ny) => {
        const r = Math.hypot(nx * 0.95, ny * 1.05);
        const mask = Math.exp(-((r / 0.82) ** 2));
        const d = fbm(nx * 2.4 + ox, ny * 2.4 + oy, seed, 6);
        const lane = smooth(0.52, 0.68, fbm(nx * 3.1 + oy, ny * 3.1 + ox, seed + 91, 5));
        let dens = Math.max(0, (d * 1.5 - 0.35) * mask * 1.7) * (1 - 0.8 * lane);
        const mix = fbm(nx * 1.6 + 9, ny * 1.6 + 4, seed + 33, 3);
        if (refl) return [110 * dens * 0.9, 150 * dens * 0.95, 255 * dens];
        const blue = smooth(0.45, 0.65, mix);
        return [(255 * (1 - blue) + 100 * blue) * dens, (80 * (1 - blue) + 150 * blue) * dens, (120 * (1 - blue) + 255 * blue) * dens];
      });
      glow(0.0, -0.02, 0.22, refl ? [150, 190, 255] : [255, 200, 220], 0.5);
      const tri = 4 + Math.floor(rnd() * 3);
      for (let i = 0; i < tri; i++) star((rnd() - 0.5) * 0.25, (rnd() - 0.5) * 0.25, 0.7 + rnd() * 0.3, [200, 220, 255]);
      fieldStars(34);
    } else if (tname === 'Planetary nebula') {
      const q = M.n === 57 ? 0.8 : 0.75 + rnd() * 0.2, th = rnd() * 3.14, r0 = 0.36 + rnd() * 0.06;
      paint((nx, ny) => {
        const [x, y] = rot(nx, ny, th);
        let I;
        if (M.n === 27) { // dumbbell: two overlapping lobes
          const a = Math.hypot((x - 0.2) / 0.5, y / 0.5), b = Math.hypot((x + 0.2) / 0.5, y / 0.5);
          I = Math.max(smooth(1, 0.75, a), smooth(1, 0.75, b)) * 0.8 * (0.7 + 0.5 * fbm(nx * 5, ny * 5, seed, 3));
          return [90 * I * 1.3, 255 * I * 0.9, 200 * I * 0.9];
        }
        const re = Math.hypot(x, y / q);
        const n = 0.7 + 0.6 * fbm(nx * 6, ny * 6, seed, 4);
        if (M.n === 97) { // owl: a soft disc with two dark "eyes"
          const disc = smooth(0.85, 0.55, re), eyes = Math.exp(-(((x - 0.2) ** 2 + (y - 0.1) ** 2) / 0.012)) + Math.exp(-(((x + 0.2) ** 2 + (y - 0.1) ** 2) / 0.012));
          I = disc * (0.6 + 0.3 * n) * (1 - 0.9 * Math.min(1, eyes));
          return [110 * I, 230 * I, 190 * I];
        }
        I = Math.exp(-(((re - r0) / 0.09) ** 2)) * n;
        const outer = smooth(r0, r0 + 0.14, re), inside = smooth(r0, 0.0, re) * 0.35 * n;
        return [(90 + 165 * outer) * I + 40 * inside, (235 - 150 * outer) * I + 120 * inside, (200 - 110 * outer) * I + 140 * inside];
      });
      glow(0, 0, 0.03, [255, 255, 255], 1.2);
      fieldStars(16);
    } else if (tname === 'Supernova remnant') {
      const ox = rnd() * 40;
      paint((nx, ny) => {
        const r = Math.hypot(nx / 0.9, ny / 1.05);
        const shell = smooth(0.95, 0.5, r);
        const ridge = Math.pow(1 - Math.abs(2 * fbm(nx * 3.2 + ox, ny * 3.2, seed, 5) - 1), 3.2);
        const fil = ridge * shell * 1.3;
        const core = Math.exp(-((r / 0.5) ** 2)) * 0.45 * fbm(nx * 2, ny * 2, seed + 4, 3);
        return [255 * fil * 0.95 + 90 * core, 140 * fil * 0.7 + 150 * core, 60 * fil * 0.4 + 255 * core];
      });
      glow(0.02, 0.0, 0.03, [180, 210, 255], 1.1);
      fieldStars(14);
    } else { // asterism / other: a handful of stars
      const n = 4 + Math.floor(rnd() * 4);
      for (let i = 0; i < n; i++) star((rnd() - 0.5) * 0.8, (rnd() - 0.5) * 0.8, 0.5 + rnd() * 0.5, rnd() > 0.5 ? [255, 235, 200] : [200, 220, 255]);
      fieldStars(26);
    }

    // tone-map into pixels
    const img = new ImageData(R, R);
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
      const i = (y * R + x) * 3, o = (y * R + x) * 4;
      let k = 1;
      if (dim) k = dim((x + 0.5) / R * 2 - 1, (y + 0.5) / R * 2 - 1);
      const nx = (x + 0.5) / R * 2 - 1, ny = (y + 0.5) / R * 2 - 1, vig = 1 - 0.35 * Math.pow(Math.hypot(nx, ny) / 1.41, 2);
      for (let c = 0; c < 3; c++) {
        const v = buf[i + c] * k / 255 * 1.9;
        const bg = [4, 6, 14][c] / 255;
        img.data[o + c] = Math.max(0, Math.min(255, Math.round((bg + (1 - Math.exp(-v * 1.35))) * 255 * vig)));
      }
      img.data[o + 3] = 255;
    }
    return img;
  }

  // Real photographs live in img/messier/M<n>.jpg (see THIRD_PARTY.md for their provenance). While one loads, or if it
  // is missing, the procedural illustration above is shown instead.
  const PHOTO_DIR = 'img/messier/';
  const photos = new Map();
  function photo(n) {
    let p = photos.get(n);
    if (!p) {
      p = { state: 'loading', img: new Image(), waiting: [] };
      p.img.onload = () => { p.state = 'ok'; const w = p.waiting; p.waiting = []; w.forEach(cb => cb()); };
      p.img.onerror = () => { p.state = 'fail'; p.waiting = []; };
      p.img.src = PHOTO_DIR + 'M' + n + '.jpg';
      photos.set(n, p);
    }
    return p;
  }
  const cache = new Map();
  function sizeCanvas(canvas) {
    const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    return ctx;
  }
  function paintProcedural(canvas, M) {
    let c = cache.get(M.n);
    if (!c) {
      c = document.createElement('canvas'); c.width = R; c.height = R;
      c.getContext('2d').putImageData(render(M), 0, 0);
      cache.set(M.n, c);
    }
    const ctx = sizeCanvas(canvas);
    const s = Math.max(canvas.width, canvas.height);
    ctx.drawImage(c, (canvas.width - s) / 2, (canvas.height - s) / 2, s, s);
  }
  function paintPhoto(canvas, img) { // letterboxed ("contain") on the night-sky background
    const ctx = sizeCanvas(canvas);
    ctx.fillStyle = '#04060e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const k = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }
  // opts.procedural forces the illustration (used in tests and when photos are switched off)
  function draw(canvas, M, opts) {
    canvas.dataset.pic = M.n;
    if (opts && opts.procedural) return paintProcedural(canvas, M);
    const p = photo(M.n);
    if (p.state === 'ok') return paintPhoto(canvas, p.img);
    paintProcedural(canvas, M);
    if (p.state === 'loading') p.waiting.push(() => { if (canvas.isConnected && canvas.dataset.pic === String(M.n)) paintPhoto(canvas, p.img); });
  }
  function preload(nums) { nums.forEach(photo); }
  window.Pics = { draw, render, preload, photoState: n => (photos.get(n) || { state: 'unknown' }).state };
})();
