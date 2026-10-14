import { parseBasePlate } from './basePlate.js?v=obj-loaders-20261014';
import { parseReferenceObj } from './referenceObj.js?v=obj-loaders-20261014';
import { buildObjectField, sampleObjectField, chooseIndentTargets, reprojectIndentTargets } from './objectForm.js';

let SHEET = 304.8;
let CLAMP = 57.4;
const $ = (id) => document.getElementById(id);
const formCanvas = $('form-view');
const topCanvas = $('top-view');
const controls = ['hand-scale', 'show-hand', 'form-driver', 'form-region', 'edge', 'fold-style', 'depth', 'indent-count', 'pad-radius', 'width', 'length', 'angle', 'target-x', 'target-y', 'step', 'show-path'];
const state = {
  handScale: 21.8, showHand: true, edge: 10, depth: 42.5, width: 188,
  length: 188, angle: 45, targetX: 152.9, targetY: 151.4,
  formDriver: 'object', formRegion: 'whole', indentCount: 3, padRadius: 37,
  foldStyle: 'faceted', step: 0.5, showPath: true, faceSelected: true,
  yaw: -1.02, pitch: 0.41, hand: [], handBounds: null,
  objectMesh: null, objectField: null, fieldKey: '', fieldError: null, indentTargets: [],
  indentSourceIndices: [], indentSelectionKey: '', objectName: 'Loading…',
  axes: [], vertices: [], faces: [], contours: [], csvPoints: [],
  maxSlope: 0, baseLoaded: false, baseError: null
};
let topMap = null;
let topDrag = false;
let formDrag = null;
let drawQueued = false; 
let baseRequest = 0;
let referenceRequest = 0;

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function smoothstep(value) { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); }
function fittedReferenceScale(bounds) {
  const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const spanY = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const available = Math.max(10, SHEET - 2 * CLAMP - 16);
  return Math.min(available / spanX, available / spanY);
}
function setReferenceScale(fit) {
  const input = $('hand-scale');
  input.min = (fit * 0.25).toPrecision(5);
  input.max = (fit * 3).toPrecision(5);
  input.step = (fit / 100).toPrecision(4);
  input.value = fit.toPrecision(6);
  state.handScale = +input.value;
}
function axis(step) {
  const values = [0, CLAMP];
  for (let p = CLAMP + step; p < SHEET - CLAMP - 0.001; p += step) values.push(p);
  values.push(SHEET - CLAMP, SHEET);
  return values;
}
// Keep the previous rounded form intact so the user can switch back immediately.
function smoothZAt(x, y) {
  const dx = (x - state.targetX) / (state.width / 2);
  const dy = (y - state.targetY) / (state.length / 2);
  const influence = Math.exp(-0.5 * (dx * dx + dy * dy));
  const edge = clamp(Math.min(x - CLAMP, y - CLAMP, SHEET - CLAMP - x, SHEET - CLAMP - y) / 22, 0, 1);
  const taper = edge * edge * (3 - 2 * edge);
  return -state.depth * influence * taper;
}

// A small irregular triangle net gives the wrist depression distinct pleats.
// Each height is a fraction of the selected depth; the perimeter stays flat.
const foldRows = [
  { v: -1,   u: [-1, -.55, 0, .55, 1],       h: [0, 0, 0, 0, 0] },
  { v: -.52, u: [-1, -.58, -.12, .48, 1],   h: [0, .17, .72, .22, 0] },
  { v: 0,    u: [-1, -.47, .07, .57, 1],     h: [0, .30, 1, .20, 0] },
  { v: .52,  u: [-1, -.55, -.09, .47, 1],   h: [0, .12, .75, .25, 0] },
  { v: 1,    u: [-1, -.55, 0, .55, 1],       h: [0, 0, 0, 0, 0] }
];
function foldVertex(row, col) {
  const r = foldRows[row];
  return { u: r.u[col], v: r.v, h: r.h[col] };
}
function triangleHeight(u, v, a, b, c) {
  const det = (b.v - c.v) * (a.u - c.u) + (c.u - b.u) * (a.v - c.v);
  const wa = ((b.v - c.v) * (u - c.u) + (c.u - b.u) * (v - c.v)) / det;
  const wb = ((c.v - a.v) * (u - c.u) + (a.u - c.u) * (v - c.v)) / det;
  const wc = 1 - wa - wb;
  return Math.min(wa, wb, wc) >= -1e-8 ? wa * a.h + wb * b.h + wc * c.h : null;
}
function facetedZAt(x, y) {
  const u = (x - state.targetX) / (state.width / 2);
  const v = (y - state.targetY) / (state.length / 2);
  if (Math.abs(u) >= 1 || Math.abs(v) >= 1) return 0;
  for (let row = 0; row < foldRows.length - 1; row++) {
    if (v < foldRows[row].v || v > foldRows[row + 1].v) continue;
    for (let col = 0; col < 4; col++) {
      const a = foldVertex(row, col), b = foldVertex(row, col + 1);
      const c = foldVertex(row + 1, col + 1), d = foldVertex(row + 1, col);
      const first = triangleHeight(u, v, a, b, c);
      if (first !== null) return -state.depth * first;
      const second = triangleHeight(u, v, a, c, d);
      if (second !== null) return -state.depth * second;
    }
  }
  return 0;
}
function refreshObjectField() {
  if (!state.objectMesh) return;
  const key = `${SHEET}:${state.handScale}:${state.formRegion}`;
  if (key === state.fieldKey) return;
  try {
    state.objectField = buildObjectField(state.objectMesh, {
      sheet: SHEET, scale: state.handScale, region: state.formRegion
    });
    state.fieldKey = key;
    state.fieldError = null;
  } catch (error) {
    state.objectField = null;
    state.fieldError = error.message;
  }
}
function objectZAt(x, y) {
  const field = state.objectField;
  const original = state.foldStyle === 'faceted' ? facetedZAt(x, y) : smoothZAt(x, y);
  if (!field || !state.indentTargets.length) return original;
  const sample = sampleObjectField(field, x, y);
  const imprint = Math.exp(-Math.pow(sample.distance / 24, 1.35));
  const u = Math.abs(x - state.targetX) / (state.width / 2);
  const v = Math.abs(y - state.targetY) / (state.length / 2);
  const window = smoothstep((1 - Math.max(u, v)) / 0.22);
  const edge = smoothstep(Math.min(x - CLAMP, y - CLAMP, SHEET - CLAMP - x, SHEET - CLAMP - y) / 20);
  const relief = clamp((sample.height - field.zMin) / Math.max(0.001, field.zMax - field.zMin), 0, 1);
  let pointPressure = 0;
  for (const target of state.indentTargets) {
    const dx = x - target.x, dy = y - target.y;
    const shape = state.foldStyle === 'faceted'
      ? Math.max(0, 1 - (Math.abs(dx) + Math.abs(dy)) / state.padRadius)
      : Math.exp(-0.5 * (dx * dx + dy * dy) / (state.padRadius * state.padRadius * 0.35));
    const height = clamp((target.z - field.zMin) / Math.max(.001, field.zMax - field.zMin), 0, 1);
    pointPressure = Math.max(pointPressure, shape * (0.65 + 0.35 * height));
  }
  const handVariation = state.depth * (0.035 * imprint * (0.45 + 0.55 * relief) + 0.10 * pointPressure);
  return Math.max(-state.depth, original - handVariation * window * edge);
}
function zAt(x, y) {
  if (!state.faceSelected || x <= CLAMP || y <= CLAMP || x >= SHEET - CLAMP || y >= SHEET - CLAMP) return 0;
  if (state.formDriver === 'object') return objectZAt(x, y);
  return state.foldStyle === 'faceted' ? facetedZAt(x, y) : smoothZAt(x, y);
}
function mesh() {
  refreshObjectField();
  if (state.formDriver === 'object' && state.objectField) {
    // Keep the selected OBJ vertices fixed while scale changes. Only their
    // projection into sheet coordinates should move with the reference.
    const selectionKey = [state.formRegion, state.indentCount, state.targetX,
      state.targetY, state.width, state.length, SHEET, CLAMP].join(':');
    if (selectionKey !== state.indentSelectionKey) {
      const selected = chooseIndentTargets(state.objectField, state.indentCount,
        { x: state.targetX, y: state.targetY }, state.width, state.length, CLAMP);
      state.indentSourceIndices = selected.map(point => point.sourceIndex);
      state.indentSelectionKey = selectionKey;
    }
    state.indentTargets = reprojectIndentTargets(state.objectField, state.indentSourceIndices);
  } else {
    state.indentTargets = [];
  }
  const ax = axis(state.edge);
  state.axes = ax;
  const n = ax.length;
  state.vertices = [];
  state.faces = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = ax[i], y = ax[j];
      state.vertices.push({ x, y, z: zAt(x, y) });
    }
  }
  for (let j = 0; j < n - 1; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, d = a + n, c = d + 1;
      state.faces.push([a, b, c], [a, c, d]);
    }
  }
  let maxSlope = 0;
  for (const [ia, ib, ic] of state.faces) {
    const a = state.vertices[ia], b = state.vertices[ib], c = state.vertices[ic];
    const det = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
    if (Math.abs(det) < 1e-9) continue;
    const gx = ((b.z - a.z) * (c.y - a.y) - (c.z - a.z) * (b.y - a.y)) / det;
    const gy = ((b.x - a.x) * (c.z - a.z) - (c.x - a.x) * (b.z - a.z)) / det;
    maxSlope = Math.max(maxSlope, Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI);
  }
  state.maxSlope = maxSlope;
  contours();
  updateReadouts();
}
function edgeCross(a, b, level) {
  const aa = a.z < level, bb = b.z < level;
  if (aa === bb) return null;
  const t = (level - a.z) / (b.z - a.z);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: level };
}
function pointKey(p) { return Math.round(p.x * 1000) + ':' + Math.round(p.y * 1000); }
function contours() {
  state.contours = [];
  state.csvPoints = [];
  if (!state.faceSelected) return;
  const ax = state.axes, n = ax.length;
  const vertex = (i, j) => state.vertices[j * n + i];
  const minZ = Math.min(...state.vertices.map(v => v.z));
  for (let level = -state.step; level > minZ + state.step * 0.25; level -= state.step) {
    const segments = [];
    const adjacency = new Map();
    const add = (a, b) => {
      const index = segments.length;
      segments.push({ a, b, used: false });
      for (const p of [a, b]) {
        const key = pointKey(p);
        if (!adjacency.has(key)) adjacency.set(key, []);
        adjacency.get(key).push(index);
      }
    };
    for (let j = 0; j < n - 1; j++) {
      for (let i = 0; i < n - 1; i++) {
        const p = [vertex(i, j), vertex(i + 1, j), vertex(i + 1, j + 1), vertex(i, j + 1)];
        const hits = [[0, 1], [1, 2], [2, 3], [3, 0]].map(([a, b]) => edgeCross(p[a], p[b], level)).filter(Boolean);
        if (hits.length === 2) add(hits[0], hits[1]);
        else if (hits.length === 4) { add(hits[0], hits[1]); add(hits[2], hits[3]); }
      }
    }
    for (const segment of segments) {
      if (segment.used) continue;
      segment.used = true;
      const line = [segment.a, segment.b];
      for (let pass = 0; pass < 2; pass++) {
        for (let guard = 0; guard < segments.length; guard++) {
          const end = pass === 0 ? line[line.length - 1] : line[0];
          const nextIndex = (adjacency.get(pointKey(end)) || []).find(k => !segments[k].used);
          if (nextIndex === undefined) break;
          const next = segments[nextIndex];
          next.used = true;
          const other = pointKey(next.a) === pointKey(end) ? next.b : next.a;
          if (pass === 0) line.push(other); else line.unshift(other);
        }
      }
      if (line.length > 5) state.contours.push(line);
    }
  }
  for (const line of state.contours) {
    const first = line[0], last = line[line.length - 1];
    state.csvPoints.push({ x: first.x, y: first.y, z: 100, move: 'jog' });
    state.csvPoints.push({ x: first.x, y: first.y, z: first.z, move: 'plunge' });
    for (const point of line) state.csvPoints.push({ ...point, move: 'feed' });
    if (Math.hypot(first.x - last.x, first.y - last.y) < state.edge * 1.5) state.csvPoints.push({ ...first, move: 'feed' });
    state.csvPoints.push({ x: first.x, y: first.y, z: 100, move: 'jog' });
  }
}
function readControls() {
  const previousRegion = state.formRegion;
  state.handScale = +$('hand-scale').value;
  state.showHand = $('show-hand').checked;
  state.formDriver = $('form-driver').value;
  state.formRegion = $('form-region').value;
  state.edge = +$('edge').value;
  state.foldStyle = $('fold-style').value;
  state.depth = +$('depth').value;
  state.indentCount = +$('indent-count').value;
  state.padRadius = +$('pad-radius').value;
  state.width = +$('width').value;
  state.length = +$('length').value;
  state.angle = +$('angle').value;
  if (state.formRegion !== previousRegion && state.objectMesh) {
    refreshObjectField();
    if (state.objectField) {
      $('target-x').value = clamp(state.objectField.center.x, CLAMP + 5, SHEET - CLAMP - 5).toFixed(1);
      $('target-y').value = clamp(state.objectField.center.y, CLAMP + 5, SHEET - CLAMP - 5).toFixed(1);
    }
  }
  state.targetX = clamp(+$('target-x').value || 152.9, CLAMP, SHEET - CLAMP);
  state.targetY = clamp(+$('target-y').value || 151.4, CLAMP, SHEET - CLAMP);
  state.step = +$('step').value;
  state.showPath = $('show-path').checked;
  $('hand-scale-value').value = `${+state.handScale.toPrecision(3)} mm/unit`;
  $('edge-value').value = state.edge + ' mm';
  $('depth-value').value = state.depth + ' mm';
  $('indent-count-value').value = String(state.indentCount);
  $('pad-radius-value').value = state.padRadius + ' mm';
  $('width-value').value = state.width + ' mm';
  $('length-value').value = state.length + ' mm';
  $('angle-value').value = state.angle + '°';
  $('step-value').value = state.step + ' mm';
  mesh();
  scheduleDraw();
}
function updateReadouts() {
  $('mesh-readout').textContent = state.vertices.length.toLocaleString() + ' VERTICES · ' + state.maxSlope.toFixed(1) + '° MAX SLOPE';
  $('face-value').textContent = state.faceSelected ? 'CENTRAL' : 'NONE';
  $('path-readout').textContent = state.contours.length + ' contour loops · ' + state.csvPoints.length.toLocaleString() + ' ordered path points';
  const maxDepth = Math.max(0, -Math.min(...state.vertices.map(v => v.z)));
  $('stat-source').textContent = state.objectName;
  $('stat-vertices').textContent = state.objectMesh ? state.objectMesh.vertices.length.toLocaleString() : '—';
  $('stat-faces').textContent = state.objectMesh ? state.objectMesh.faces.length.toLocaleString() : '—';
  $('stat-region').textContent = state.formRegion === 'lower' ? 'Lower-Y end' : 'Whole OBJ';
  $('stat-targets').textContent = state.formDriver === 'manual' ? '1 manual' : `${state.indentTargets.length} / ${state.indentCount}`;
  $('stat-area').textContent = state.objectField ? `${(state.objectField.footprint / 100).toFixed(1)} cm²` : '—';
  $('stat-clamp').textContent = `${CLAMP.toFixed(1)} mm`;
  $('stat-depth').textContent = `${maxDepth.toFixed(1)} mm`;
  $('stat-angle').textContent = `${state.maxSlope.toFixed(1)}°`;
  $('stat-limit').textContent = `${state.angle}°`;
  $('stat-loops').textContent = state.contours.length.toLocaleString();
  $('stat-path-points').textContent = state.csvPoints.length.toLocaleString();
  const status = $('status');
  if (state.baseError) {
    status.textContent = 'Base mesh unavailable: ' + state.baseError + '. Showing the 57.4 mm fallback inset.';
    status.classList.add('warn');
  } else if (!state.baseLoaded) {
    status.textContent = 'Loading base mesh…';
    status.classList.remove('warn');
  } else if (!state.hand.length) {
    status.textContent = 'Loading hand reference…';
    status.classList.remove('warn');
  } else if (state.formDriver === 'object' && (state.fieldError || !state.indentTargets.length)) {
    status.textContent = state.fieldError || 'No OBJ surface falls inside the selected forming zone. Move the target or increase its width/length.';
    status.classList.add('warn');
  } else if (!state.faceSelected) {
    status.textContent = 'Select the central face in the top view.';
    status.classList.add('warn');
  } else if (state.maxSlope > state.angle) {
    status.textContent = 'Slope exceeds ' + state.angle + '° setting. Reduce depth or widen the fold.';
    status.classList.add('warn');
  } else {
    status.textContent = state.formDriver === 'object'
      ? 'Original basin with subtle OBJ influence. Confirm scale and forming feasibility with the instructor.'
      : 'Manual preview within angle setting. Reference scale still needs confirmation.';
    status.classList.remove('warn');
  }
}
function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { ctx, w: rect.width, h: rect.height };
}
function scheduleDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => { drawQueued = false; drawForm(); drawTop(); });
}
function project(x, y, z, w, h) {
  const dx = x - SHEET / 2, dy = y - SHEET / 2;
  const c = Math.cos(state.yaw), s = Math.sin(state.yaw);
  const rx = dx * c - dy * s, ry = dx * s + dy * c;
  const scale = Math.min(w * 0.00205, h * 0.00315);
  return { x: w / 2 + rx * scale, y: h * 0.51 + (ry * Math.sin(state.pitch) - z * Math.cos(state.pitch)) * scale };
}
function polygon(ctx, points, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function foldCreases() {
  const lines = [];
  const point = (row, col) => {
    const v = foldVertex(row, col);
    const x = state.targetX + v.u * state.width / 2;
    const y = state.targetY + v.v * state.length / 2;
    return { x, y, z: zAt(x, y) };
  };
  for (let col = 1; col <= 3; col++) {
    for (let row = 0; row < 4; row++) lines.push([point(row, col), point(row + 1, col)]);
  }
  for (let row = 1; row <= 3; row++) {
    for (let col = 0; col < 4; col++) lines.push([point(row, col), point(row, col + 1)]);
  }
  for (let row = 1; row <= 2; row++) {
    for (let col = 1; col <= 2; col++) lines.push([point(row, col), point(row + 1, col + 1)]);
  }
  return lines;
}
function drawCreases(ctx, mapPoint, opacity) {
  if (state.foldStyle !== 'faceted' || !state.faceSelected) return;
  ctx.strokeStyle = `rgba(235,232,225,${opacity})`;
  ctx.lineWidth = 1.3;
  for (const [a, b] of foldCreases()) {
    const p = mapPoint(a), q = mapPoint(b);
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
}
function handPoint(v) {
  const midX = (state.handBounds.minX + state.handBounds.maxX) / 2;
  const midY = (state.handBounds.minY + state.handBounds.maxY) / 2;
  const midZ = (state.handBounds.minZ + state.handBounds.maxZ) / 2;
  return {
    x: SHEET / 2 + (v[0] - midX) * state.handScale,
    y: SHEET / 2 + (v[1] - midY) * state.handScale,
    z: 20 + (v[2] - midZ) * state.handScale * 0.55
  };
}
function drawForm() {
  const { ctx, w, h } = fitCanvas(formCanvas);
  ctx.fillStyle = '#121314'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(238,235,229,.045)';
  for (let x = 0; x < w; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
  for (let y = 0; y < h; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  const cells = [];
  const n = state.axes.length;
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = state.vertices[j * n + i], b = state.vertices[j * n + i + 1];
    const d = state.vertices[(j + 1) * n + i], c = state.vertices[(j + 1) * n + i + 1];
    const world = [a, b, c, d];
    const points = world.map(p => project(p.x, p.y, p.z, w, h));
    const gx = (b.z - a.z) / (b.x - a.x);
    const gy = (d.z - a.z) / (d.y - a.y);
    cells.push({ points, z: (a.z + b.z + c.z + d.z) / 4, light: gx * 42 - gy * 32,
      order: points.reduce((sum, p) => sum + p.y, 0) / 4 });
  }
  cells.sort((a, b) => a.order - b.order);
  ctx.lineWidth = .65;
  for (const cell of cells) {
    const directional = state.foldStyle === 'faceted' ? clamp(cell.light, -30, 30) : 0;
    const shade = Math.round(69 + clamp(-cell.z / Math.max(1, state.depth), 0, 1) * 53 + directional);
    const grid = state.foldStyle === 'faceted' ? 'rgba(238,235,229,.055)' : 'rgba(238,235,229,.13)';
    polygon(ctx, cell.points, `rgb(${shade},${shade + 1},${shade + 2})`, grid);
  }
  drawCreases(ctx, p => project(p.x, p.y, p.z + 1, w, h), .55);
  const border = [[CLAMP,CLAMP],[SHEET-CLAMP,CLAMP],[SHEET-CLAMP,SHEET-CLAMP],[CLAMP,SHEET-CLAMP]].map(([x,y]) => project(x,y,zAt(x,y),w,h));
  ctx.lineWidth = 1.5; polygon(ctx, border, null, 'rgba(238,235,229,.75)');
  if (state.showHand && state.handBounds) {
    ctx.fillStyle = 'rgba(238,235,229,.43)';
    for (let i = 0; i < state.hand.length; i += 2) {
      const v = state.hand[i];
      const p = handPoint(v), q = project(p.x,p.y,p.z,w,h);
      ctx.fillRect(q.x, q.y, 1.7, 1.7);
    }
  }
  if (state.showPath) {
    ctx.lineWidth = state.foldStyle === 'faceted' ? .85 : 1.15;
    ctx.strokeStyle = state.foldStyle === 'faceted' ? 'rgba(255,106,61,.33)' : 'rgba(255,106,61,.83)';
    for (const line of state.contours) {
      ctx.beginPath();
      for (let i = 0; i < line.length; i++) {
        const p = project(line[i].x, line[i].y, line[i].z + 1, w, h);
        if (!i) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y);
      }
      ctx.stroke();
    }
  }
  if (state.formDriver === 'object' && state.showHand) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,106,61,.48)';
    ctx.setLineDash([3, 4]);
    for (let i = 0; i < state.indentTargets.length; i++) {
      const target = state.indentTargets[i];
      const source = handPoint(target.raw);
      const from = project(source.x, source.y, source.z, w, h);
      const to = project(target.x, target.y, zAt(target.x, target.y), w, h);
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    for (let i = 0; i < state.indentTargets.length; i++) {
      const target = state.indentTargets[i];
      const source = handPoint(target.raw);
      const p = project(source.x, source.y, source.z, w, h);
      ctx.fillStyle = '#ff6a3d'; ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#eeebe5'; ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(`T${String(i + 1).padStart(2, '0')}`, p.x + 8, p.y - 8);
    }
  }
  const target = project(state.targetX,state.targetY,zAt(state.targetX,state.targetY)+3,w,h);
  ctx.fillStyle = '#ff6a3d'; ctx.beginPath(); ctx.arc(target.x,target.y,5,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#8c8b87'; ctx.font = '11px ui-monospace, monospace'; ctx.fillText('PERSPECTIVE / MM', 17, h - 19);
}
function drawTop() {
  const { ctx, w, h } = fitCanvas(topCanvas);
  ctx.fillStyle = '#121314'; ctx.fillRect(0,0,w,h);
  const size = Math.min(h - 28, w - 36);
  const ox = (w - size) / 2, oy = (h - size) / 2;
  topMap = { ox, oy, size };
  const map = (x,y) => ({ x: ox + x / SHEET * size, y: oy + (SHEET-y) / SHEET * size });
  ctx.fillStyle = '#2a2b2d'; ctx.fillRect(ox,oy,size,size);
  const inner = map(CLAMP,SHEET-CLAMP), innerEnd = map(SHEET-CLAMP,CLAMP);
  ctx.fillStyle = state.faceSelected ? '#343638' : '#242527';
  ctx.fillRect(inner.x,inner.y,innerEnd.x-inner.x,innerEnd.y-inner.y);
  ctx.strokeStyle = 'rgba(238,235,229,.17)'; ctx.lineWidth = 1;
  for (let mm = 0; mm <= SHEET; mm += 25.4) {
    const p = map(mm,0), q = map(0,mm);
    ctx.beginPath(); ctx.moveTo(p.x,oy); ctx.lineTo(p.x,oy+size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ox,q.y); ctx.lineTo(ox+size,q.y); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(238,235,229,.8)'; ctx.strokeRect(inner.x,inner.y,innerEnd.x-inner.x,innerEnd.y-inner.y);
  if (state.showHand && state.handBounds) {
    ctx.fillStyle = 'rgba(238,235,229,.52)';
    for (let i = 0; i < state.hand.length; i++) {
      const v = state.hand[i];
      const hp = handPoint(v), p = map(hp.x,hp.y);
      ctx.fillRect(p.x,p.y,1.3,1.3);
    }
  }
  drawCreases(ctx, p => map(p.x, p.y), .38);
  if (state.showPath) {
    ctx.strokeStyle = state.foldStyle === 'faceted' ? 'rgba(255,106,61,.18)' : 'rgba(255,106,61,.35)';
    ctx.lineWidth = 1;
    for (const line of state.contours) {
      ctx.beginPath();
      line.forEach((point,i) => { const p = map(point.x,point.y); if (!i) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
      ctx.stroke();
    }
  }
  const target = map(state.targetX,state.targetY);
  ctx.fillStyle = '#ff6a3d'; ctx.beginPath(); ctx.arc(target.x,target.y,7,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#141414'; ctx.lineWidth = 2; ctx.stroke();
  if (state.formDriver === 'object') for (let i = 0; i < state.indentTargets.length; i++) {
    const p = map(state.indentTargets[i].x, state.indentTargets[i].y);
    const atCenter = Math.hypot(p.x - target.x, p.y - target.y) < 9;
    if (!atCenter) {
      ctx.fillStyle = '#ff6a3d'; ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#141414'; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.fillStyle = '#eeebe5'; ctx.font = '10px ui-monospace, monospace';
    ctx.fillText(`T${String(i + 1).padStart(2, '0')}`, p.x + 10, p.y - 10);
  }
  ctx.fillStyle = '#eeebe5'; ctx.font = '10px ui-monospace, monospace';
  ctx.fillText(`FIXED ${CLAMP.toFixed(1)} MM CLAMP`, ox + 5, oy + 13);
}
function download(name, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportObj() {
  const vertices = state.vertices.map(v => `v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}`);
  const faces = state.faces.map(f => 'f ' + f.map(i => i + 1).join(' '));
  download('sheetformer_wrist_preview.obj', '# Design preview; units: mm; open sheet surface\n' + vertices.concat(faces).join('\n') + '\n', 'text/plain');
}
function exportCsv() {
  const rows = ['index,x,y,z,move'];
  state.csvPoints.forEach((p,i) => rows.push([i,p.x.toFixed(4),p.y.toFixed(4),p.z.toFixed(4),p.move].join(',')));
  download('sheetformer_wrist_preview_NOT_ROBOT_READY.csv', rows.join('\n') + '\n', 'text/csv');
}
function applyReference(text, name) {
  const reference = parseReferenceObj(text);
  const custom = !name.startsWith('Default:');
  const region = 'whole';
  setReferenceScale(fittedReferenceScale(reference.bounds));
  const field = buildObjectField(reference, { sheet: SHEET, scale: state.handScale, region });
  state.hand = reference.points;
  state.handBounds = reference.bounds;
  state.objectMesh = reference;
  state.objectField = field;
  state.indentSourceIndices = [];
  state.indentSelectionKey = '';
  state.formRegion = region;
  state.fieldKey = `${SHEET}:${state.handScale}:${region}`;
  state.fieldError = null;
  state.objectName = name.replace(/^Default: /, '');
  $('form-region').value = region;
  $('target-x').value = clamp(field.center.x, CLAMP + 5, SHEET - CLAMP - 5).toFixed(1);
  $('target-y').value = clamp(field.center.y, CLAMP + 5, SHEET - CLAMP - 5).toFixed(1);
  $('reference-legend').textContent = custom ? '○ object reference' : '○ hand scan reference';
  $('reference-scale-label').textContent = custom ? 'Object scale' : 'Hand scale';
  $('reference-note').textContent = custom
    ? 'The original basin stays intact while the loaded OBJ adds subtle local depth variation. The grey points show its geometry; check units and orientation before fabrication.'
    : 'The original basin stays intact while the full hand OBJ subtly changes its depth from fingers through palm and wrist. Confirm the scan scale before fabrication.';
  $('form-view').setAttribute('aria-label', 'Perspective preview of OBJ-driven sheet forming');
  const label = $('object-file-status');
  label.textContent = `${name} · ${reference.vertices.length.toLocaleString()} vertices`;
  label.classList.remove('error');
  readControls();
}
function applyBase(text, name) {
  const base = parseBasePlate(text);
  SHEET = base.sheet;
  CLAMP = base.clamp;
  state.baseLoaded = true;
  state.baseError = null;
  const formableWidth = SHEET - 2 * CLAMP;
  for (const id of ['width', 'length']) {
    $(id).max = formableWidth.toFixed(1);
    $(id).value = Math.min(+$(id).value, formableWidth).toFixed(1);
  }
  for (const id of ['target-x', 'target-y']) {
    $(id).min = CLAMP.toFixed(1);
    $(id).max = (SHEET - CLAMP).toFixed(1);
    $(id).value = clamp(+$(id).value, CLAMP, SHEET - CLAMP).toFixed(1);
  }
  $('sheet-size').textContent = `${SHEET.toFixed(1)} × ${SHEET.toFixed(1)} MM`;
  $('clamp-readout').textContent = `The loaded base OBJ sets a ${CLAMP.toFixed(1)} mm flat clamping border. Click inside the top view to select its central face.`;
  if (state.objectMesh) {
    setReferenceScale(fittedReferenceScale(state.objectMesh.bounds));
    state.fieldKey = '';
    refreshObjectField();
    if (state.objectField) {
      $('target-x').value = clamp(state.objectField.center.x, CLAMP + 5, SHEET - CLAMP - 5).toFixed(1);
      $('target-y').value = clamp(state.objectField.center.y, CLAMP + 5, SHEET - CLAMP - 5).toFixed(1);
    }
  }
  const label = $('base-file-status');
  label.textContent = name;
  label.classList.remove('error');
  readControls();
}
async function loadHand() {
  const request = ++referenceRequest;
  try {
    const response = await fetch('../../references/3D/HAND_clean_mesh.obj');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const text = await response.text();
    if (request === referenceRequest) applyReference(text, 'Default: HAND_clean_mesh.obj');
  } catch (error) {
    if (request !== referenceRequest) return;
    $('status').textContent = 'Hand reference unavailable: ' + error.message;
    $('status').classList.add('warn');
  }
}
async function loadBase() {
  const request = ++baseRequest;
  try {
    const response = await fetch('../../references/3D/basePlate.obj');
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const text = await response.text();
    if (request === baseRequest) applyBase(text, 'Default: basePlate.obj');
  } catch (error) {
    if (request !== baseRequest) return;
    state.baseError = error.message;
    updateReadouts();
  }
}
async function selectedObj(file, kind) {
  if (!file) return;
  const isBase = kind === 'base';
  const request = isBase ? ++baseRequest : ++referenceRequest;
  const label = $(isBase ? 'base-file-status' : 'object-file-status');
  try {
    if (!/\.obj$/i.test(file.name)) throw new Error('Choose an .obj file');
    if (file.size > 50 * 1024 * 1024) throw new Error('OBJ exceeds the 50 MB preview limit');
    const text = await file.text();
    if (request !== (isBase ? baseRequest : referenceRequest)) return;
    if (isBase) applyBase(text, file.name);
    else applyReference(text, file.name);
  } catch (error) {
    if (request !== (isBase ? baseRequest : referenceRequest)) return;
    label.textContent = `${file.name}: ${error.message}. Previous OBJ kept.`;
    label.classList.add('error');
  }
}
controls.forEach(id => $(id).addEventListener('input', readControls));
$('load-base-button').addEventListener('click', () => $('base-file').click());
$('load-object-button').addEventListener('click', () => $('object-file').click());
for (const kind of ['base', 'object']) {
  $(`${kind}-file`).addEventListener('change', event => {
    selectedObj(event.target.files[0], kind);
    event.target.value = '';
  });
}
$('export-obj').addEventListener('click', exportObj);
$('export-csv').addEventListener('click', exportCsv);
topCanvas.addEventListener('pointerdown', (event) => {
  if (!topMap) return;
  const rect = topCanvas.getBoundingClientRect();
  const px = event.clientX - rect.left, py = event.clientY - rect.top;
  const tx = topMap.ox + state.targetX / SHEET * topMap.size;
  const ty = topMap.oy + (SHEET - state.targetY) / SHEET * topMap.size;
  if (Math.hypot(px-tx,py-ty) < 18) { topDrag = true; topCanvas.setPointerCapture(event.pointerId); return; }
  const x = (px - topMap.ox) / topMap.size * SHEET;
  const y = SHEET - (py - topMap.oy) / topMap.size * SHEET;
  state.faceSelected = x >= CLAMP && x <= SHEET-CLAMP && y >= CLAMP && y <= SHEET-CLAMP;
  mesh(); scheduleDraw();
});
topCanvas.addEventListener('pointermove', (event) => {
  if (!topDrag || !topMap) return;
  const rect = topCanvas.getBoundingClientRect();
  const x = clamp((event.clientX - rect.left - topMap.ox) / topMap.size * SHEET, CLAMP+1, SHEET-CLAMP-1);
  const y = clamp(SHEET - (event.clientY - rect.top - topMap.oy) / topMap.size * SHEET, CLAMP+1, SHEET-CLAMP-1);
  $('target-x').value = x.toFixed(1); $('target-y').value = y.toFixed(1);
  readControls();
});
topCanvas.addEventListener('pointerup', () => { topDrag = false; });
topCanvas.addEventListener('pointercancel', () => { topDrag = false; });
formCanvas.addEventListener('pointerdown', (event) => {
  formDrag = { x: event.clientX, y: event.clientY, yaw: state.yaw, pitch: state.pitch };
  formCanvas.setPointerCapture(event.pointerId);
});
formCanvas.addEventListener('pointermove', (event) => {
  if (!formDrag) return;
  state.yaw = formDrag.yaw + (event.clientX-formDrag.x) * .008;
  state.pitch = clamp(formDrag.pitch + (event.clientY-formDrag.y) * .005, .18, 1.35);
  scheduleDraw();
});
formCanvas.addEventListener('pointerup', () => { formDrag = null; });
formCanvas.addEventListener('pointercancel', () => { formDrag = null; });
window.addEventListener('resize', scheduleDraw);
readControls();
loadBase();
loadHand();
