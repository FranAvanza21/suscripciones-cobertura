// Servidor de desarrollo local — arranca con: node server.js
// Usa fichero data/suscripciones.json en lugar de Vercel KV.
const http    = require('http');
const fs      = require('fs');
const path    = require('path');
const handler = require('./api/suscripciones');

const PORT = 3001;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css',
  '.json': 'application/json',
};

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS — permitir cualquier origen en desarrollo
  res.setHeader('Access-Control-Allow-Origin',  req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Subir archivo: POST /api/upload  { filename, base64 }
  if (url.pathname === '/api/upload' && req.method === 'POST') {
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', () => {
      try {
        const { filename, base64 } = JSON.parse(rawBody);
        if (!filename || !base64) { res.writeHead(400); res.end(JSON.stringify({ error: 'Faltan campos' })); return; }
        const safe = path.basename(filename);
        if (!safe || safe.startsWith('.')) { res.writeHead(400); res.end(JSON.stringify({ error: 'Nombre inválido' })); return; }
        const uploadsDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
        fs.writeFileSync(path.join(uploadsDir, safe), Buffer.from(base64, 'base64'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        console.error('[upload]', e);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // Servir archivos subidos desde /fotos/:filename
  if (url.pathname.startsWith('/fotos/')) {
    const filename = decodeURIComponent(url.pathname.slice('/fotos/'.length));
    const safe = path.basename(filename);
    const filePath = path.join(__dirname, 'uploads', safe);
    if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
    const ext = path.extname(safe).toLowerCase();
    const MIME_EXTRA = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
      '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf' };
    const mime = MIME_EXTRA[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Content-Disposition': `inline; filename="${safe}"` });
    res.end(fs.readFileSync(filePath));
    return;
  }

  if (url.pathname === '/api/suscripciones') {
    let rawBody = '';
    req.on('data', chunk => { rawBody += chunk; });
    req.on('end', () => {
      req.query = Object.fromEntries(url.searchParams);
      if (rawBody) {
        try { req.body = JSON.parse(rawBody); } catch { req.body = {}; }
      }
      const mockRes = {
        _status: 200,
        _headers: {},
        setHeader(k, v) { this._headers[k] = v; return this; },
        status(code)    { this._status = code; return this; },
        json(data) {
          res.writeHead(this._status, { ...this._headers, 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
        },
        end() { res.writeHead(this._status, this._headers); res.end(); },
      };
      handler(req, mockRes).catch(e => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      });
    });
    return;
  }

  // Ficheros estáticos
  let filePath = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
  filePath = path.join(__dirname, filePath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const mime = MIME[path.extname(filePath)] || 'text/plain';
  res.writeHead(200, { 'Content-Type': mime });
  res.end(fs.readFileSync(filePath));

}).listen(PORT, () => {
  console.log(`\n  Suscripciones → http://localhost:${PORT}`);
  console.log(`  API           → http://localhost:${PORT}/api/suscripciones\n`);
});
