// Builds js/data.js from the d3-celestial data files (https://github.com/ofrohn/d3-celestial, BSD-3).
// Usage: node scripts/build-data.mjs <path-to-d3-celestial/data>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = process.argv[2];
if (!dir) { console.error('usage: node scripts/build-data.mjs <d3-celestial/data dir>'); process.exit(1); }
const rd = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const lore = JSON.parse(fs.readFileSync(path.join(root, 'data/lore.json'), 'utf8'));

const lines = rd('constellations.lines.json').features;
const cons = rd('constellations.json').features;
const stars6 = rd('stars.6.json').features;
const stars8 = rd('stars.8.json').features; // a few figure vertices (e.g. Mira) are fainter than mag 6
const names = rd('starnames.json');
const messier = rd('messier.json').features;

const norm = lon => ((lon % 360) + 360) % 360;
const RAD = Math.PI / 180;
function sep(a, b) {
  const d = Math.sin(a.dec * RAD) * Math.sin(b.dec * RAD) +
    Math.cos(a.dec * RAD) * Math.cos(b.dec * RAD) * Math.cos((a.ra - b.ra) * RAD);
  return Math.acos(Math.max(-1, Math.min(1, d))) / RAD;
}

// --- stars
const toStar = f => ({
  hip: f.id, ra: norm(f.geometry.coordinates[0]), dec: f.geometry.coordinates[1],
  mag: f.properties.mag, bv: parseFloat(f.properties.bv),
});
const cat = stars8.map(toStar);
const field6 = stars6.map(toStar);
const MAG_OVERRIDE = { 10826: 3.4 }; // Mira at maximum
function nearestCat(lon, lat) {
  const q = { ra: norm(lon), dec: lat };
  let best = null, bd = 9;
  for (const s of cat) {
    if (Math.abs(s.dec - lat) > 0.3) continue;
    const d = sep(q, s);
    if (d < bd) { bd = d; best = s; }
  }
  if (!best || bd > 0.08) throw new Error('no star near ' + lon + ',' + lat + ' d=' + bd);
  return best;
}

// --- constellations (Serpens appears twice in the source; merge)
const consMap = new Map();
for (const f of cons) {
  if (consMap.has(f.id)) continue;
  consMap.set(f.id, {
    id: f.id, name: f.properties.name, en: f.properties.en,
    ra: norm(f.geometry.coordinates[0]), dec: f.geometry.coordinates[1],
  });
}
const consList = [...consMap.values()].sort((a, b) => a.name.localeCompare(b.name));
const consIdx = new Map(consList.map((c, i) => [c.id, i]));
for (const c of consList) if (!lore.constellations[c.id]) throw new Error('no lore for ' + c.id);
const genitive = new Map(cons.map(f => [f.id, f.properties.gen]));

// --- graph from stick figures
const nodeOf = new Map(); // hip -> node index
const nodes = [];
const owner = new Map(); // hip -> first constellation id that uses it
const edgeSet = new Set();
const edges = [];
function node(s, cid) {
  if (!nodeOf.has(s.hip)) {
    nodeOf.set(s.hip, nodes.length);
    nodes.push(s);
    owner.set(s.hip, cid);
  }
  return nodeOf.get(s.hip);
}
for (const f of lines) {
  const cid = f.id;
  for (const poly of f.geometry.coordinates) {
    let prev = null;
    for (const [lon, lat] of poly) {
      const s = nearestCat(lon, lat);
      const i = node(s, cid);
      if (prev !== null && prev !== i) {
        const k = Math.min(prev, i) + '-' + Math.max(prev, i);
        if (!edgeSet.has(k)) { edgeSet.add(k); edges.push([Math.min(prev, i), Math.max(prev, i), consIdx.get(cid)]); }
      }
      prev = i;
    }
  }
}
// a star belongs to the constellation its catalogue entry names, if that constellation draws it
const drawnBy = new Map();
for (const f of lines) for (const poly of f.geometry.coordinates) for (const [lon, lat] of poly) {
  const h = nearestCat(lon, lat).hip;
  if (!drawnBy.has(h)) drawnBy.set(h, new Set());
  drawnBy.get(h).add(f.id);
}
const abbrOf = hip => (names[hip] && names[hip].c) || null;
const nodeConst = nodes.map(s => {
  const c = abbrOf(s.hip);
  return drawnBy.get(s.hip).has(c) ? c : owner.get(s.hip);
});

// --- labels: only important stars keep a proper name; everything else uses its official designation
// (Bayer, then Flamsteed, then variable-star, then HD, then HIP).
const IMPORTANT_MAG = 2.0;
const IMPORTANT_EXTRA = new Set(['Polaris', 'Algol', 'Mira', 'Thuban', 'Albireo', 'Mizar', 'Sadr']);
const GREEK = /^[\u03b1-\u03c9\u0391-\u03a9]/;
nodes.forEach((s, i) => {
  const n = names[s.hip] || {};
  const c = n.c || nodeConst[i];
  if (MAG_OVERRIDE[s.hip] !== undefined) s.mag = MAG_OVERRIDE[s.hip];
  s.proper = !!n.name && (s.mag <= IMPORTANT_MAG || IMPORTANT_EXTRA.has(n.name));
  if (s.proper) s.label = n.name;
  else if (n.bayer && GREEK.test(n.bayer)) s.label = n.bayer + ' ' + c;
  else if (n.flam) s.label = n.flam + ' ' + c;
  else if (n.var) s.label = n.var + ' ' + c;
  else if (n.hd) s.label = n.hd;
  else s.label = 'HIP ' + s.hip;
  s.label = s.label.replace(/\s+/g, ' ').trim(); // source data uses thin spaces in some designations
});

// --- hyperlanes: join separate pieces, then link neighbouring constellations
const adj = nodes.map(() => new Set());
edges.forEach(([a, b]) => { adj[a].add(b); adj[b].add(a); });
const dist = (a, b) => sep(nodes[a], nodes[b]);
const comp = new Array(nodes.length).fill(-1);
function relabel() {
  comp.fill(-1);
  let n = 0;
  for (let i = 0; i < nodes.length; i++) {
    if (comp[i] >= 0) continue;
    const st = [i]; comp[i] = n;
    while (st.length) { const u = st.pop(); for (const v of adj[u]) if (comp[v] < 0) { comp[v] = n; st.push(v); } }
    n++;
  }
  return n;
}
function addLane(a, b) {
  const k = Math.min(a, b) + '-' + Math.max(a, b);
  if (edgeSet.has(k) || a === b) return false;
  edgeSet.add(k); edges.push([Math.min(a, b), Math.max(a, b), -1]);
  adj[a].add(b); adj[b].add(a);
  return true;
}
// 1) one short lane between each pair of neighbouring constellations
const cIdxOfNode = nodeConst.map(c => consIdx.get(c));
const bestPair = new Map();
for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
  const ca = cIdxOfNode[a], cb = cIdxOfNode[b];
  if (ca === cb) continue;
  const d = dist(a, b);
  if (d > 9) continue;
  const k = Math.min(ca, cb) + '-' + Math.max(ca, cb);
  const cur = bestPair.get(k);
  if (!cur || d < cur.d) bestPair.set(k, { a, b, d });
}
for (const { a, b } of bestPair.values()) addLane(a, b);
// 2) within a constellation, join pieces of a split figure
// 3) make the whole graph connected (shortest lane between components, repeatedly)
let n = relabel();
while (n > 1) {
  let best = null;
  for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
    if (comp[a] === comp[b]) continue;
    const d = dist(a, b);
    if (!best || d < best.d) best = { a, b, d };
  }
  addLane(best.a, best.b);
  n = relabel();
}

// --- messier
const MT = { gc: 'globular', oc: 'open', sfr: 'nebula', rn: 'nebula', pn: 'nebula', snr: 'nebula', s: 'galaxy', e: 'galaxy', i: 'galaxy', pos: 'other' };
const TYPE_NAME = { gc: 'Globular cluster', oc: 'Open cluster', sfr: 'Star-forming nebula', rn: 'Reflection nebula', pn: 'Planetary nebula', snr: 'Supernova remnant', s: 'Spiral galaxy', e: 'Elliptical galaxy', i: 'Irregular galaxy', pos: 'Asterism / other' };
const mess = messier.map(f => {
  const p = f.properties;
  const num = parseInt(p.name.slice(1), 10);
  const o = { ra: norm(f.geometry.coordinates[0]), dec: f.geometry.coordinates[1] };
  const links = nodes.map((s, i) => ({ i, d: sep(o, s) })).sort((a, b) => a.d - b.d).slice(0, 3).filter((x, k) => k === 0 || x.d < 14).map(x => x.i);
  const alt = (p.alt || '').replace(/´|’/g, "'");
  return {
    n: num, alt, kind: MT[p.type], tname: TYPE_NAME[p.type], mag: p.mag, dim: p.dim,
    ra: +o.ra.toFixed(3), dec: +o.dec.toFixed(3), c: consIdx.get(lore.messierConst[num]),
    links, note: lore.messierNotes[num] || '',
  };
}).sort((a, b) => a.n - b.n);

// --- background field (not nodes)
const field = [];
const nodeHips = new Set(nodes.map(s => s.hip));
for (const s of field6) if (!nodeHips.has(s.hip)) field.push(Math.round(s.ra * 100), Math.round(s.dec * 100), Math.round(s.mag * 10));

// --- output
const out = {
  consts: consList.map(c => ({ id: c.id, name: c.name, en: c.en, ra: +c.ra.toFixed(2), dec: +c.dec.toFixed(2), lore: lore.constellations[c.id], gen: genitive.get(c.id) })),
  stars: nodes.map((s, i) => [s.hip, +s.ra.toFixed(4), +s.dec.toFixed(4), s.mag, isNaN(s.bv) ? 0.6 : +s.bv.toFixed(2), cIdxOfNode[i], s.label, s.proper ? 1 : 0]),
  edges,
  messier: mess,
  field,
};
// constellation -> member stars
out.consts.forEach(c => c.stars = []);
out.stars.forEach((s, i) => out.consts[s[5]].stars.push(i));
const empty = out.consts.filter(c => !c.stars.length).map(c => c.id);
if (empty.length) throw new Error('constellations with no stars: ' + empty.join(','));

const js = '/* Generated by scripts/build-data.mjs from d3-celestial data (see THIRD_PARTY.md). */\nwindow.SKY=' + JSON.stringify(out) + ';\nif(typeof module!=="undefined")module.exports=window.SKY;\n';
fs.writeFileSync(path.join(root, 'js/data.js'), js);
console.log('named (important) stars', out.stars.filter(x => x[7]).length);
console.log('constellations', out.consts.length, 'stars', out.stars.length, 'edges', edges.length,
  '(figure', edges.filter(e => e[2] >= 0).length, '/ lanes', edges.filter(e => e[2] < 0).length + ')', 'messier', mess.length, 'field', field.length / 3, 'bytes', js.length);
