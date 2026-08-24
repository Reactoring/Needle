import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Small production server: serves the built SPA and proxies the Strapi API
// through the private network. Keeping a single public origin lets the
// SameSite=Lax demo session cookie work without any cross-site setup.
const PORT = Number(process.env.PORT ?? 4173);
const BACKEND = new URL(process.env.BACKEND_INTERNAL_URL ?? 'http://localhost:1337');
const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');

const PROXY_PREFIXES = ['/api/', '/uploads/'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.txt': 'text/plain',
  '.woff2': 'font/woff2',
};

function proxy(req, res) {
  const upstream = http.request(
    {
      hostname: BACKEND.hostname,
      port: BACKEND.port || 80,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: BACKEND.host },
    },
    (backendRes) => {
      res.writeHead(backendRes.statusCode ?? 502, backendRes.headers);
      backendRes.pipe(res);
    },
  );
  upstream.on('error', () => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: { status: 502, message: 'Backend unreachable' } }));
  });
  req.pipe(upstream);
}

http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

    if (PROXY_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return proxy(req, res);
    }

    let file = path.normalize(path.join(DIST, pathname));
    if (!file.startsWith(DIST)) {
      res.writeHead(403);
      return res.end();
    }
    if (!existsSync(file) || statSync(file).isDirectory()) {
      file = path.join(DIST, 'index.html');
    }

    res.writeHead(200, {
      'content-type': MIME[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': pathname.startsWith('/assets/')
        ? 'public, max-age=31536000, immutable'
        : 'no-cache',
    });
    createReadStream(file).pipe(res);
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend ready on :${PORT}, proxying API to ${BACKEND.origin}`);
  });
