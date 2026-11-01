// Servidor do Mural Orquestra AI — sem dependências externas.
// Uso: node server.js   (porta padrão 3000; PUBLIC_URL para usar um túnel HTTPS)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const PHOTO_DIR = path.join(DATA_DIR, 'photos');
const DB_FILE = path.join(DATA_DIR, 'photos.json');
const MAX_BODY = 12 * 1024 * 1024;

fs.mkdirSync(PHOTO_DIR, { recursive: true });
let photos = [];
try { photos = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { photos = []; }
const saveDb = () => fs.writeFileSync(DB_FILE, JSON.stringify(photos, null, 2));

const clients = new Set();
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(msg);
}

function lanAddress() {
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return 'localhost';
}
const PUBLIC_URL = (process.env.PUBLIC_URL || `http://${lanAddress()}:${PORT}`).replace(/\/$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function serveFile(res, file, cache) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': cache || 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function isAdmin(req) {
  const given = Buffer.from(String(req.headers['x-admin-key'] || ''));
  const real = Buffer.from(ADMIN_KEY);
  return ADMIN_KEY && given.length === real.length && crypto.timingSafeEqual(given, real);
}

const cleanName =(s) => String(s || '').replace(/[<>]/g, '').trim().slice(0, 40);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/' || p === '/telao') return serveFile(res, path.join(PUBLIC_DIR, 'telao.html'));
  if (p === '/foto' || p === '/m') return serveFile(res, path.join(PUBLIC_DIR, 'foto.html'));
  if (p === '/admin') return serveFile(res, path.join(PUBLIC_DIR, 'admin.html'));

  if (p === '/api/info') return sendJson(res, 200, { captureUrl: `${PUBLIC_URL}/foto`, count: photos.length });
  if (p === '/api/photos' && req.method === 'GET') return sendJson(res, 200, photos);

  if (p === '/api/photos' && req.method === 'POST') {
    try {
      const { image, name } = JSON.parse(await readBody(req));
      const m = /^data:image\/jpeg;base64,(.+)$/.exec(image || '');
      if (!m) return sendJson(res, 400, { error: 'Imagem inválida' });
      const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      fs.writeFileSync(path.join(PHOTO_DIR, `${id}.jpg`), Buffer.from(m[1], 'base64'));
      const photo = { id, name: cleanName(name), url: `/photos/${id}.jpg`, createdAt: new Date().toISOString() };
      photos.push(photo); saveDb();
      broadcast('photo', photo);
      return sendJson(res, 201, photo);
    } catch (e) {
      return sendJson(res, e.message === 'too_large' ? 413 : 400, { error: 'Falha ao enviar a foto' });
    }
  }

  // Moderação (senha no cabeçalho X-Admin-Key)
  if (p === '/api/admin/login' && req.method === 'POST') {
    if (!ADMIN_KEY) return sendJson(res, 503, { error: 'ADMIN_KEY não configurada no servidor' });
    return isAdmin(req) ? sendJson(res, 200, { ok: true }) : sendJson(res, 403, { error: 'Senha incorreta' });
  }
  const del = /^\/api\/photos\/([a-z0-9]+)$/.exec(p);
  if (del && req.method === 'DELETE') {
    if (!isAdmin(req)) return sendJson(res, 403, { error: 'Sem permissão' });
    const before = photos.length;
    photos = photos.filter((x) => x.id !== del[1]);
    if (photos.length === before) return sendJson(res, 404, { error: 'Não encontrada' });
    saveDb();
    fs.rm(path.join(PHOTO_DIR, `${del[1]}.jpg`), () => {});
    broadcast('remove', { id: del[1] });
    return sendJson(res, 200, { ok: true });
  }

  if (p === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 2000\n\n');
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }

  if (p.startsWith('/photos/')) {
    const file = path.join(PHOTO_DIR, path.basename(p));
    return serveFile(res, file, 'public, max-age=31536000, immutable');
  }

  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  serveFile(res, file);
});

server.listen(PORT, HOST, () => {
  console.log('\n  Mural Orquestra AI rodando!\n');
  console.log(`  Telão (abra no computador do projetor):  http://localhost:${PORT}/telao`);
  console.log(`  Página do celular (vai no QR Code):     ${PUBLIC_URL}/foto`);
  console.log(`  Moderação:                              ${PUBLIC_URL}/admin${ADMIN_KEY ? '' : '  (defina ADMIN_KEY para ativar)'}\n`);
  if (!process.env.PUBLIC_URL) {
    console.log('  Dica: para a câmera ao vivo no celular, use HTTPS (ex.: cloudflared tunnel)');
    console.log('  e rode com PUBLIC_URL=https://seu-endereco node server.js\n');
  }
});
