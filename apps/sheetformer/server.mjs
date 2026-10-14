import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const port = Number(process.env.PORT || 5173);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.obj': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const requested = url.pathname === '/' ? '/apps/sheetformer/' : url.pathname;
    const filePath = resolve(root, '.' + (requested.endsWith('/') ? requested + 'index.html' : requested));
    if (filePath !== root && !filePath.startsWith(root + sep)) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const details = await stat(filePath);
    if (!details.isFile()) throw new Error('Not a file');
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime[extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`Local: http://127.0.0.1:${port}/apps/sheetformer/\n`);
});
