// OBJ geometry used as a display reference, not as the forming surface.
export function parseReferenceObj(text) {
  const points = [];
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const line of text.split(/\r?\n/)) {
    if (!/^v\s/.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) throw new Error('OBJ contains an incomplete vertex');
    const v = parts.slice(1, 4).map(Number);
    if (v.some(n => !Number.isFinite(n))) throw new Error('OBJ contains an invalid vertex');
    points.push(v);
    bounds.minX = Math.min(bounds.minX, v[0]); bounds.maxX = Math.max(bounds.maxX, v[0]);
    bounds.minY = Math.min(bounds.minY, v[1]); bounds.maxY = Math.max(bounds.maxY, v[1]);
    bounds.minZ = Math.min(bounds.minZ, v[2]); bounds.maxZ = Math.max(bounds.maxZ, v[2]);
  }
  if (points.length < 3) throw new Error('OBJ needs at least three vertices');
  // Point-cloud preview stays responsive even for dense scans.
  const stride = Math.max(1, Math.ceil(points.length / 60000));
  return { points: stride === 1 ? points : points.filter((_, i) => i % stride === 0), bounds };
}
