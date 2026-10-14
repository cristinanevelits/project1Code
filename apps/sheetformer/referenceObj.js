// Keep the full mesh for surface sampling and a smaller point set for drawing.
export function parseReferenceObj(text) {
  const points = [];
  const faces = [];
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const line of text.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === 'v') {
      if (parts.length < 4) throw new Error('OBJ contains an incomplete vertex');
      const v = parts.slice(1, 4).map(Number);
      if (v.some(n => !Number.isFinite(n))) throw new Error('OBJ contains an invalid vertex');
      points.push(v);
      bounds.minX = Math.min(bounds.minX, v[0]); bounds.maxX = Math.max(bounds.maxX, v[0]);
      bounds.minY = Math.min(bounds.minY, v[1]); bounds.maxY = Math.max(bounds.maxY, v[1]);
      bounds.minZ = Math.min(bounds.minZ, v[2]); bounds.maxZ = Math.max(bounds.maxZ, v[2]);
    } else if (parts[0] === 'f') {
      if (parts.length < 4) continue;
      const indices = parts.slice(1).map(token => {
        const raw = Number(token.split('/')[0]);
        if (!Number.isInteger(raw) || raw === 0) throw new Error('OBJ contains an invalid face index');
        return raw > 0 ? raw - 1 : points.length + raw;
      });
      for (let i = 1; i < indices.length - 1; i++) faces.push([indices[0], indices[i], indices[i + 1]]);
    }
    if (points.length > 150000 || faces.length > 300000) throw new Error('OBJ is too dense for this browser preview');
  }
  if (points.length < 3) throw new Error('OBJ needs at least three vertices');
  if (faces.some(face => face.some(index => index < 0 || index >= points.length))) {
    throw new Error('OBJ contains a face outside its vertex list');
  }
  // Point-cloud preview stays responsive even for dense scans.
  const stride = Math.max(1, Math.ceil(points.length / 60000));
  return { points: stride === 1 ? points : points.filter((_, i) => i % stride === 0), vertices: points, faces, bounds };
}
