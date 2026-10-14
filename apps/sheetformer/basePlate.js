// Read the actual clamp boundary from the instructor's planar OBJ.
export function parseBasePlate(text) {
  const vertices = text.split(/\r?\n/)
    .filter(line => line.startsWith('v '))
    .map(line => line.trim().split(/\s+/).slice(1, 4).map(Number));
  if (vertices.length < 8 || vertices.some(v => v.some(n => !Number.isFinite(n)))) {
    throw new Error('Base OBJ has invalid vertices');
  }
  const coordinates = axis => [...new Set(vertices.map(v => +v[axis].toFixed(4)))].sort((a, b) => a - b);
  const xs = coordinates(0), ys = coordinates(1), zs = coordinates(2);
  if (xs.length !== 4 || ys.length !== 4 || zs.length !== 1) {
    throw new Error('Expected a flat XY sheet with an inset square face');
  }
  const sheet = xs[3] - xs[0];
  const insets = [xs[1] - xs[0], xs[3] - xs[2], ys[1] - ys[0], ys[3] - ys[2]];
  const near = (a, b) => Math.abs(a - b) < 0.01;
  if (!near(xs[0], 0) || !near(ys[0], 0) || !near(sheet, ys[3] - ys[0]) ||
      insets.some(inset => !near(inset, insets[0]))) {
    throw new Error('Base OBJ must be a square sheet with an even inset at the origin');
  }
  return { sheet, clamp: insets[0] };
}
