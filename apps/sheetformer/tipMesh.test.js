import test from 'node:test';
import assert from 'node:assert/strict';
import { insertTipVertices } from './tipMesh.js';

test('each interior target becomes a triangle tip without gaps', () => {
  const vertices = [
    { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 },
    { x: 10, y: 10, z: 0 }, { x: 0, y: 10, z: 0 }
  ];
  const faces = [[0, 1, 2], [0, 2, 3]];
  const cells = [0, 0];
  const result = insertTipVertices(vertices, faces, cells,
    [{ x: 7, y: 3, z: -2 }, { x: 3, y: 7, z: -2 }]);
  assert.equal(vertices.length, 6);
  assert.equal(faces.length, 6);
  assert.deepEqual(result.tipVertexIndices, [4, 5]);
  assert.ok(result.tipCells.has(0));
  for (const tip of result.tipVertexIndices) assert.ok(faces.filter(face => face.includes(tip)).length >= 3);
  assertValidMesh(vertices, faces);
});

test('target on a shared edge splits both neighbors without a T-junction', () => {
  const vertices = [
    { x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 },
    { x: 10, y: 10, z: 0 }, { x: 0, y: 10, z: 0 }
  ];
  const faces = [[0, 1, 2], [0, 2, 3]];
  const cells = [0, 0];
  const result = insertTipVertices(vertices, faces, cells, [{ x: 5, y: 5, z: -2 }]);
  assert.equal(faces.length, 4);
  assert.equal(faces.filter(face => face.includes(result.tipVertexIndices[0])).length, 4);
  assertValidMesh(vertices, faces);
});

test('separate OBJ points replace grid patches with larger triangle fans', () => {
  const axes = [0, 10, 20, 30, 40, 50, 60, 70, 80];
  const n = axes.length;
  const vertices = axes.flatMap(y => axes.map(x => ({ x, y, z: 0 })));
  const faces = [], cells = [];
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n + 1, d = a + n;
    faces.push([a, b, c], [a, c, d]);
    cells.push(j * (n - 1) + i, j * (n - 1) + i);
  }
  const originalFaces = faces.length;
  const result = insertTipVertices(vertices, faces, cells,
    [{ x: 25, y: 25, z: -3 }, { x: 65, y: 65, z: -3 }], axes);
  assert.equal(result.tipVertexIndices.length, 2);
  assert.equal(result.tipCells.size, 2);
  assert.equal(result.removedCells.size, 18);
  assert.equal(faces.length, originalFaces - 18 * 2 + 2 * 36);
  for (const tip of result.tipVertexIndices) assert.equal(faces.filter(face => face.includes(tip)).length, 12);
  assertValidMesh(vertices, faces);
});

function assertValidMesh(vertices, faces) {
  const edges = new Map();
  let totalArea = 0;
  for (const face of faces) {
    const [a, b, c] = face.map(index => vertices[index]);
    const signedArea = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
    assert.ok(signedArea > 1e-7, 'face has positive area and consistent winding');
    totalArea += signedArea / 2;
    for (const [u, v] of [[face[0], face[1]], [face[1], face[2]], [face[2], face[0]]]) {
      const key = [u, v].sort((x, y) => x - y).join(':');
      edges.set(key, (edges.get(key) || 0) + 1);
    }
  }
  assert.ok([...edges.values()].every(count => count <= 2), 'no non-manifold edges');
  const xs = vertices.map(vertex => vertex.x), ys = vertices.map(vertex => vertex.y);
  assert.ok(Math.abs(totalArea - (Math.max(...xs) - Math.min(...xs)) *
    (Math.max(...ys) - Math.min(...ys))) < 1e-6, 'triangles cover the full sheet');
}
