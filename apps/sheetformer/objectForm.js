const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// A downward, single-valued forming preview: ray-project the OBJ triangles onto
// the sheet. This cannot model undercuts, plastic strain, or tool collisions.
export function buildObjectField(mesh, { sheet, scale, region, resolution = 129 }) {
  const { vertices, faces, bounds } = mesh;
  const midX = (bounds.minX + bounds.maxX) / 2;
  const midY = (bounds.minY + bounds.maxY) / 2;
  const cutoff = region === 'lower' ? bounds.minY + (bounds.maxY - bounds.minY) * 0.32 : Infinity;
  const xy = vertices.map(([x, y, z]) => [sheet / 2 + (x - midX) * scale, sheet / 2 + (y - midY) * scale, z]);
  const projectedVertices = [];
  const stride = sheet / (resolution - 1);
  const top = new Float32Array(resolution * resolution);
  top.fill(-Infinity);
  let zMin = Infinity, zMax = -Infinity;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < vertices.length; i++) {
    if (vertices[i][1] > cutoff) continue;
    const [x, y, z] = xy[i];
    projectedVertices.push({ x, y, z, sourceIndex: i, raw: vertices[i] });
    zMin = Math.min(zMin, z); zMax = Math.max(zMax, z);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  if (!Number.isFinite(zMin)) throw new Error('No vertices in the selected OBJ region');
  const yLimit = region === 'lower' ? sheet / 2 + (cutoff - midY) * scale : Infinity;
  const put = (i, j, z) => {
    if (i < 0 || j < 0 || i >= resolution || j >= resolution || j * stride > yLimit) return;
    const index = j * resolution + i;
    if (z > top[index]) top[index] = z;
  };
  for (const [ia, ib, ic] of faces) {
    const a = xy[ia], b = xy[ib], c = xy[ic];
    const det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(det) < 1e-9) continue;
    const loX = clamp(Math.floor(Math.min(a[0], b[0], c[0]) / stride), 0, resolution - 1);
    const hiX = clamp(Math.ceil(Math.max(a[0], b[0], c[0]) / stride), 0, resolution - 1);
    const loY = clamp(Math.floor(Math.min(a[1], b[1], c[1]) / stride), 0, resolution - 1);
    const hiY = clamp(Math.ceil(Math.max(a[1], b[1], c[1]) / stride), 0, resolution - 1);
    for (let j = loY; j <= hiY; j++) {
      const y = j * stride;
      if (y > yLimit) continue;
      for (let i = loX; i <= hiX; i++) {
        const x = i * stride;
        const u = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / det;
        const v = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / det;
        const w = 1 - u - v;
        if (Math.min(u, v, w) >= -1e-7) put(i, j, u * a[2] + v * b[2] + w * c[2]);
      }
    }
  }
  // Preserve thin edges and support vertex-only OBJs too.
  for (let k = 0; k < vertices.length; k++) {
    if (vertices[k][1] > cutoff) continue;
    const [x, y, z] = xy[k];
    put(Math.round(x / stride), Math.round(y / stride), z);
  }
  const distance = new Float32Array(top.length);
  const nearest = new Float32Array(top.length);
  const occupied = [];
  for (let j = 0; j < resolution; j++) for (let i = 0; i < resolution; i++) {
    const k = j * resolution + i;
    if (top[k] > -Infinity) {
      distance[k] = 0; nearest[k] = top[k]; occupied.push({ x: i * stride, y: j * stride, z: top[k] });
    } else distance[k] = Infinity;
  }
  if (!occupied.length) throw new Error('OBJ has no projected surface on the sheet at this scale');
  const adopt = (k, neighbor, step) => {
    const candidate = distance[neighbor] + step;
    if (candidate < distance[k]) { distance[k] = candidate; nearest[k] = nearest[neighbor]; }
  };
  for (let j = 0; j < resolution; j++) for (let i = 0; i < resolution; i++) {
    const k = j * resolution + i;
    if (i) adopt(k, k - 1, stride);
    if (j) adopt(k, k - resolution, stride);
    if (i && j) adopt(k, k - resolution - 1, stride * Math.SQRT2);
    if (i < resolution - 1 && j) adopt(k, k - resolution + 1, stride * Math.SQRT2);
  }
  for (let j = resolution - 1; j >= 0; j--) for (let i = resolution - 1; i >= 0; i--) {
    const k = j * resolution + i;
    if (i < resolution - 1) adopt(k, k + 1, stride);
    if (j < resolution - 1) adopt(k, k + resolution, stride);
    if (i < resolution - 1 && j < resolution - 1) adopt(k, k + resolution + 1, stride * Math.SQRT2);
    if (i && j < resolution - 1) adopt(k, k + resolution - 1, stride * Math.SQRT2);
  }
  return { sheet, resolution, stride, distance, nearest, occupied, projectedVertices, zMin, zMax,
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    footprint: occupied.length * stride * stride };
}

export function sampleObjectField(field, x, y) {
  const u = clamp(x / field.stride, 0, field.resolution - 1);
  const v = clamp(y / field.stride, 0, field.resolution - 1);
  const i = Math.floor(u), j = Math.floor(v);
  const i2 = Math.min(i + 1, field.resolution - 1), j2 = Math.min(j + 1, field.resolution - 1);
  const tx = u - i, ty = v - j;
  const blend = array => {
    const a = array[j * field.resolution + i] * (1 - tx) + array[j * field.resolution + i2] * tx;
    const b = array[j2 * field.resolution + i] * (1 - tx) + array[j2 * field.resolution + i2] * tx;
    return a * (1 - ty) + b * ty;
  };
  return { distance: blend(field.distance), height: blend(field.nearest) };
}

export function chooseIndentTargets(field, count, center, width, length, clampInset) {
  const candidates = field.projectedVertices.filter(p =>
    p.x > clampInset + 12 && p.x < field.sheet - clampInset - 12 &&
    p.y > clampInset + 12 && p.y < field.sheet - clampInset - 12 &&
    Math.abs(p.x - center.x) < width * .48 && Math.abs(p.y - center.y) < length * .48);
  if (!candidates.length) return [];
  const targets = [candidates.reduce((best, p) =>
    Math.hypot(p.x - center.x, p.y - center.y) <
    Math.hypot(best.x - center.x, best.y - center.y) ? p : best)];
  while (targets.length < count) {
    let best = null, bestScore = 0;
    for (const p of candidates) {
      const spread = Math.min(...targets.map(t => Math.hypot(p.x - t.x, p.y - t.y)));
      if (spread < 11) continue;
      const relief = clamp((p.z - field.zMin) / Math.max(.001, field.zMax - field.zMin), 0, 1);
      const score = spread * (.85 + .15 * relief);
      if (score > bestScore) { best = p; bestScore = score; }
    }
    if (!best) break;
    targets.push(best);
  }
  return targets.map(({ x, y, z, sourceIndex, raw }) => ({ x, y, z, sourceIndex, raw }));
}
