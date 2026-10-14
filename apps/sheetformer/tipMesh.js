const area = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);

// Insert each projected OBJ point into the actual sheet triangulation. Splitting
// an edge updates both neighboring faces, so the exported mesh has no T-junction.
export function insertTipVertices(vertices, faces, faceCells, targets, axes = null) {
  const tipVertexIndices = [];
  const tipCells = new Set();
  const removedCells = new Set();
  for (const target of targets) {
    const existing = vertices.findIndex(v => Math.hypot(v.x - target.x, v.y - target.y) < 1e-6);
    if (existing !== -1) { tipVertexIndices.push(existing); continue; }
    if (axes) {
      const n = axes.length;
      const i = axes.findIndex((value, index) => index < n - 1 && target.x >= value && target.x < axes[index + 1]);
      const j = axes.findIndex((value, index) => index < n - 1 && target.y >= value && target.y < axes[index + 1]);
      let patch = null;
      if (i >= 0 && j >= 0) for (const radius of [1, 0]) {
        const i0 = Math.max(0, i - radius), i1 = Math.min(n - 2, i + radius);
        const j0 = Math.max(0, j - radius), j1 = Math.min(n - 2, j + radius);
        const cells = [];
        for (let y = j0; y <= j1; y++) for (let x = i0; x <= i1; x++) cells.push(y * (n - 1) + x);
        const overlaps = cells.some(cell => removedCells.has(cell));
        const enclosesAnother = targets.some(other => other !== target &&
          other.x > axes[i0] && other.x < axes[i1 + 1] &&
          other.y > axes[j0] && other.y < axes[j1 + 1]);
        if (!overlaps && !enclosesAnother) { patch = { i0, i1, j0, j1, cells }; break; }
      }
      if (patch) {
        const pointIndex = vertices.length;
        vertices.push({ x: target.x, y: target.y, z: target.z });
        tipVertexIndices.push(pointIndex);
        const { i0, i1, j0, j1, cells } = patch;
        const boundary = [];
        for (let x = i0; x <= i1 + 1; x++) boundary.push(j0 * n + x);
        for (let y = j0 + 1; y <= j1 + 1; y++) boundary.push(y * n + i1 + 1);
        for (let x = i1; x >= i0; x--) boundary.push((j1 + 1) * n + x);
        for (let y = j1; y > j0; y--) boundary.push(y * n + i0);
        const inner = boundary.map(index => {
          const corner = vertices[index];
          const vertex = vertices.length;
          vertices.push({
            x: target.x + (corner.x - target.x) * 0.48,
            y: target.y + (corner.y - target.y) * 0.48,
            z: target.z * 0.58 + corner.z * 0.42
          });
          return vertex;
        });
        const cellSet = new Set(cells);
        for (let face = faces.length - 1; face >= 0; face--) {
          if (cellSet.has(faceCells[face])) { faces.splice(face, 1); faceCells.splice(face, 1); }
        }
        const centerCell = j * (n - 1) + i;
        for (let k = 0; k < boundary.length; k++) {
          const next = (k + 1) % boundary.length;
          faces.push(
            [boundary[k], boundary[next], inner[next]],
            [boundary[k], inner[next], inner[k]],
            [inner[k], inner[next], pointIndex]
          );
          faceCells.push(centerCell, centerCell, centerCell);
        }
        cells.forEach(cell => removedCells.add(cell));
        tipCells.add(centerCell);
        continue;
      }
    }
    let found = -1, weights;
    for (let i = 0; i < faces.length; i++) {
      const [ia, ib, ic] = faces[i];
      const a = vertices[ia], b = vertices[ib], c = vertices[ic];
      const denominator = area(a, b, c);
      if (Math.abs(denominator) < 1e-9) continue;
      const wa = area(target, b, c) / denominator;
      const wb = area(a, target, c) / denominator;
      const wc = 1 - wa - wb;
      if (Math.min(wa, wb, wc) >= -1e-9) { found = i; weights = [wa, wb, wc]; break; }
    }
    if (found === -1) { tipVertexIndices.push(null); continue; }
    const pointIndex = vertices.length;
    vertices.push({ x: target.x, y: target.y, z: target.z });
    tipVertexIndices.push(pointIndex);
    const old = faces[found];
    if (Math.min(...weights) > 1e-7) {
      const [a, b, c] = old;
      const cell = faceCells[found];
      faces[found] = [a, b, pointIndex];
      faces.push([b, c, pointIndex], [c, a, pointIndex]);
      faceCells.push(cell, cell);
      tipCells.add(cell);
    } else {
      const opposite = weights.indexOf(Math.min(...weights));
      const edge = old.filter((_, index) => index !== opposite);
      const affected = [];
      for (let i = 0; i < faces.length; i++) {
        if (faces[i].includes(edge[0]) && faces[i].includes(edge[1])) affected.push(i);
      }
      for (const i of affected) {
        const original = faces[i];
        const other = original.find(index => !edge.includes(index));
        const sign = Math.sign(area(...original.map(index => vertices[index])));
        const orient = (a, b, c) => {
          const tri = [a, b, c];
          if (Math.sign(area(...tri.map(index => vertices[index]))) !== sign) [tri[1], tri[2]] = [tri[2], tri[1]];
          return tri;
        };
        faces[i] = orient(edge[0], pointIndex, other);
        faces.push(orient(pointIndex, edge[1], other));
        faceCells.push(faceCells[i]);
        tipCells.add(faceCells[i]);
      }
    }
  }
  return { tipVertexIndices, tipCells, removedCells };
}
