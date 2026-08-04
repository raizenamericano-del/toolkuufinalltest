/**
 * ============================================================================
 * ⚡ ALL TOOLS KYY — Server Node (Railway / VPS / hosting Node biasa)
 * Developer : Rifkyy sensei
 * ----------------------------------------------------------------------------
 * Kenapa file ini ada?
 *   Backend API (netlify/functions/api.js) aslinya berformat serverless.
 *   File ini adapter Node HTTP biasa yang:
 *     1. men-serve semua file statis di ./public
 *     2. meneruskan request /api/* ke handler api.js yang sama persis
 *   Jadi source API cuma SATU — mau jalan di Netlify atau Railway tetap sama.
 *
 *   - Port      : process.env.PORT (Railway ngasih otomatis), fallback 3000
 *   - Health    : GET /health     (buat healthcheck Railway)
 *   - Ekstra    : Range request (video), gzip text, cache-control, security hdr
 *
 * Jalankan lokal : node server.js      -> http://localhost:3000
 * Deploy Railway : push ke GitHub -> New Project -> Deploy from Repo. Beres.
 * ============================================================================
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const { handler } = require('./netlify/functions/api.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const MAX_BODY = 2 * 1024 * 1024; // 2 MB cukup buat semua request tool

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.pdf': 'application/pdf',
};

const SECURITY_HEADERS = {
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

const GZIP_TYPES = /^(text\/|application\/(json|manifest|javascript))/i;

/* ------------------------------ helper kecil ----------------------------- */

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('Payload kegedean (max 2MB)'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function maybeGzip(req, buf, mime) {
  if (!GZIP_TYPES.test(mime)) return { buf, gz: false };
  const ae = req.headers['accept-encoding'] || '';
  if (!ae.includes('gzip')) return { buf, gz: false };
  return { buf: zlib.gzipSync(buf), gz: true };
}

/* ------------------------------- /api/* ---------------------------------- */

async function handleApi(req, res, pathname, query) {
  try {
    const raw = await readBody(req);
    const event = {
      httpMethod: req.method,
      path: pathname, // routeOf() di api.js motong prefix "/api" sendiri
      queryStringParameters: query,
      headers: req.headers,
      body: raw.length ? raw.toString('utf8') : null,
      isBase64Encoded: false,
    };
    const r = await handler(event, {});
    const body = r.body || '';
    const mime = (r.headers && (r.headers['Content-Type'] || r.headers['content-type'])) || 'application/json; charset=utf-8';
    const { buf, gz } = maybeGzip(req, Buffer.from(body, 'utf8'), mime);
    res.writeHead(r.statusCode || 200, {
      ...SECURITY_HEADERS,
      ...r.headers,
      ...(gz ? { 'Content-Encoding': 'gzip' } : {}),
      'Content-Length': buf.length,
    });
    res.end(buf);
  } catch (e) {
    res.writeHead(500, { ...SECURITY_HEADERS, 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: false, error: `Server error: ${e.message}` }));
  }
}

/* ----------------------------- file statis -------------------------------- */

function serveStatic(req, res, pathname) {
  // cegah path traversal
  const safe = pathname.replace(/^\/+/, '').replace(/\.\.+/g, '');
  let filePath = path.join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, SECURITY_HEADERS);
    return res.end('Forbidden');
  }

  let stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  if (stat && stat.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  }
  // SPA-ish fallback: path tanpa ekstensi -> index.html
  if (!stat && !path.extname(pathname)) {
    filePath = path.join(PUBLIC_DIR, 'index.html');
    stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  }
  if (!stat) {
    res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<h1 style="font-family:sans-serif;text-align:center;margin-top:20vh">404 — kagak ada 😢<br><a href="/">← balik ke beranda</a></h1>');
  }

  const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  const isAsset = /\.(css|js|png|jpe?g|gif|webp|svg|ico|woff2?|mp4|webm)$/i.test(filePath);
  const headers = {
    ...SECURITY_HEADERS,
    'Content-Type': mime,
    'Accept-Ranges': 'bytes',
    ...(isAsset ? { 'Cache-Control': 'public, max-age=3600' } : { 'Cache-Control': 'no-cache' }),
  };

  // Range request (penting buat video di Chrome/Safari)
  const range = req.headers.range;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m && (m[1] || m[2])) {
      let start = m[1] ? parseInt(m[1], 10) : Math.max(0, stat.size - parseInt(m[2], 10));
      let end = m[1] ? (m[2] ? parseInt(m[2], 10) : stat.size - 1) : stat.size - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= stat.size) {
        res.writeHead(416, { ...headers, 'Content-Range': `bytes */${stat.size}` });
        return res.end();
      }
      end = Math.min(end, stat.size - 1);
      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Content-Length': end - start + 1,
      });
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(filePath, { start, end })
        .on('error', () => { if (!res.headersSent) res.writeHead(500); res.end(); })
        .pipe(res);
    }
  }

  const full = fs.readFileSync(filePath);
  const { buf, gz } = maybeGzip(req, full, mime);
  res.writeHead(200, { ...headers, ...(gz ? { 'Content-Encoding': 'gzip' } : {}), 'Content-Length': buf.length });
  if (req.method === 'HEAD') return res.end();
  res.end(buf);
}

/* -------------------------------- server ---------------------------------- */

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(u.pathname);
    const query = Object.fromEntries(u.searchParams.entries());

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });
      return res.end();
    }

    if (pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return res.end(JSON.stringify({ status: true, uptime: Math.round(process.uptime()) }));
    }

    if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname, query);
    if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, pathname);

    res.writeHead(405, SECURITY_HEADERS);
    res.end('Method Not Allowed');
  } catch (e) {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: false, error: e.message }));
  }
});

server.listen(PORT, () => {
  console.log(`⚡ All Tools KYY jalan di port ${PORT}`);
  console.log(`   -> http://localhost:${PORT}`);
});
