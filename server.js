// Servidor do mural de fotos (PainelSarah) — sem dependências externas.
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
const RAW_DIR = path.join(DATA_DIR, 'originais');
const VIDEO_DIR = path.join(DATA_DIR, 'videos');
const MAX_VIDEO = 15 * 1024 * 1024;
const DB_FILE = path.join(DATA_DIR, 'photos.json');
const MAX_BODY = 24 * 1024 * 1024;

fs.mkdirSync(PHOTO_DIR, { recursive: true });
fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(VIDEO_DIR, { recursive: true });
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
  '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm',
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

// Entrega com suporte a partes (Range): necessário para tocar vídeo no iPhone e para avançar o vídeo
function serveRange(req, res, file) {
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('Não encontrado'); }
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const base = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=31536000, immutable' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (!m) { res.writeHead(200, { ...base, 'Content-Length': st.size }); return fs.createReadStream(file).pipe(res); }
    let start = m[1] === '' ? st.size - Number(m[2]) : Number(m[1]);
    let end = m[1] !== '' && m[2] !== '' ? Number(m[2]) : st.size - 1;
    if (isNaN(start) || start < 0 || start >= st.size || end < start) { res.writeHead(416, { 'Content-Range': `bytes */${st.size}` }); return res.end(); }
    end = Math.min(end, st.size - 1);
    res.writeHead(206, { ...base, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${st.size}` });
    fs.createReadStream(file, { start, end }).pipe(res);
  });
}

// Recebe o vídeo direto no disco, aos pedaços (não ocupa memória), com limite de tamanho
function receiveToFile(req, file, max) {
  return new Promise((resolve, reject) => {
    let size = 0, failed = false;
    const out = fs.createWriteStream(file);
    const fail = (e) => { if (failed) return; failed = true; out.destroy(); fs.rm(file, () => {}); req.resume(); reject(e); };
    req.on('data', (c) => { size += c.length; if (size > max) fail(new Error('too_large')); });
    req.on('error', fail);
    out.on('error', fail);
    out.on('finish', () => { if (!failed) resolve(size); });
    req.pipe(out);
  });
}
const isVideoFile = (buf) => (buf.length >= 12 && buf.toString('latin1', 4, 8) === 'ftyp') || (buf.length >= 4 && buf.readUInt32BE(0) === 0x1A45DFA3);
const removeEntryFiles = (e) => {
  if (e.type === 'video') {
    fs.rm(path.join(VIDEO_DIR, path.basename(e.url)), () => {});
    if (e.poster) fs.rm(path.join(VIDEO_DIR, path.basename(e.poster)), () => {});
  } else {
    fs.rm(path.join(PHOTO_DIR, `${e.id}.jpg`), () => {});
    fs.rm(path.join(RAW_DIR, `${e.id}.jpg`), () => {});
  }
};

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

const cleanName = (s) => String(s || '').replace(/[<>]/g, '').trim().slice(0, 40);
const cleanMsg = (s) => String(s || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 140);
const jpeg = (d) => { const m = /^data:image\/jpeg;base64,(.+)$/.exec(d || ''); return m ? Buffer.from(m[1], 'base64') : null; };

// ---- ZIP sem dependências (arquivos guardados sem compressão; JPEG já é comprimido) ----
const CRC_TABLE = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
function streamZip(res, entries) {
  // entries: [{ name, data: Buffer }] ou [{ name, file }] — escreve um a um para não ocupar memória
  let offset = 0; const central = [];
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const e of entries) {
    let data; try { data = e.data || fs.readFileSync(e.file); } catch { continue; }
    const name = Buffer.from(e.name, 'utf8'); const crc = crc32(data);
    const h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(0, 8);
    h.writeUInt16LE(dosTime, 10); h.writeUInt16LE(dosDate, 12); h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(name.length, 26); h.writeUInt16LE(0, 28);
    res.write(h); res.write(name); res.write(data);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(0, 10);
    c.writeUInt16LE(dosTime, 12); c.writeUInt16LE(dosDate, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(data.length, 20);
    c.writeUInt32LE(data.length, 24); c.writeUInt16LE(name.length, 28); c.writeUInt32LE(offset, 42);
    central.push(Buffer.concat([c, name]));
    offset += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length, 8); end.writeUInt16LE(central.length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  res.write(cd); res.end(end);
}
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const fileBase = (p, i) => `${String(i + 1).padStart(3, '0')}${p.name ? '-' + p.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() : ''}`;


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
      const { image, raw, name, message, frame } = JSON.parse(await readBody(req));
      const img = jpeg(image);
      if (!img) return sendJson(res, 400, { error: 'Imagem inválida' });
      const id = Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      fs.writeFileSync(path.join(PHOTO_DIR, `${id}.jpg`), img);
      const rawImg = jpeg(raw);
      if (rawImg) fs.writeFileSync(path.join(RAW_DIR, `${id}.jpg`), rawImg);
      const photo = {
        id, name: cleanName(name), message: cleanMsg(message), frame: String(frame || '').slice(0, 30),
        url: `/photos/${id}.jpg`, hasRaw: !!rawImg, createdAt: new Date().toISOString(),
      };
      photos.push(photo); saveDb();
      broadcast('photo', photo);
      return sendJson(res, 201, photo);
    } catch (e) {
      return sendJson(res, e.message === 'too_large' ? 413 : 400, { error: 'Falha ao enviar a foto' });
    }
  }

  // ---- Vídeos: 1) capa (JPEG pequeno) cria o id; 2) o vídeo em binário finaliza e aparece no telão ----
  if (p === '/api/videos/poster' && req.method === 'POST') {
    try {
      const { image } = JSON.parse(await readBody(req));
      const img = jpeg(image);
      if (!img || img.length > 1024 * 1024) return sendJson(res, 400, { error: 'Capa inválida' });
      const id = 'v' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex');
      fs.writeFileSync(path.join(VIDEO_DIR, `${id}.jpg`), img);
      return sendJson(res, 201, { id });
    } catch { return sendJson(res, 400, { error: 'Falha ao enviar a capa' }); }
  }
  if (p === '/api/videos' && req.method === 'POST') {
    const id = String(url.searchParams.get('id') || '');
    if (!/^v[a-z0-9]+$/.test(id) || !fs.existsSync(path.join(VIDEO_DIR, `${id}.jpg`)) || photos.some((x) => x.id === id)) {
      req.resume(); return sendJson(res, 400, { error: 'Envio inválido' });
    }
    const declared = Number(req.headers['content-length'] || 0);
    if (declared > MAX_VIDEO) { req.resume(); return sendJson(res, 413, { error: 'Vídeo maior que 15 MB' }); }
    const ctype = String(req.headers['content-type'] || '');
    const ext = /mp4|quicktime/.test(ctype) ? 'mp4' : /webm/.test(ctype) ? 'webm' : '';
    if (!ext) { req.resume(); return sendJson(res, 415, { error: 'Formato de vídeo não suportado' }); }
    const file = path.join(VIDEO_DIR, `${id}.${ext}`);
    try {
      const size = await receiveToFile(req, file, MAX_VIDEO);
      const head = Buffer.alloc(12); const fd = fs.openSync(file, 'r'); fs.readSync(fd, head, 0, 12, 0); fs.closeSync(fd);
      if (size < 1000 || !isVideoFile(head)) { fs.rm(file, () => {}); return sendJson(res, 400, { error: 'Arquivo de vídeo inválido' }); }
      const video = {
        id, type: 'video', name: cleanName(url.searchParams.get('name')), message: '',
        url: `/videos/${id}.${ext}`, poster: `/videos/${id}.jpg`, mime: ctype.split(';')[0], size,
        duration: Math.min(16, Number(url.searchParams.get('dur')) || 15), createdAt: new Date().toISOString(),
      };
      photos.push(video); saveDb();
      broadcast('photo', video);
      return sendJson(res, 201, video);
    } catch (e) {
      return sendJson(res, e.message === 'too_large' ? 413 : 400, { error: e.message === 'too_large' ? 'Vídeo maior que 15 MB' : 'Falha ao enviar o vídeo' });
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
    const found = photos.find((x) => x.id === del[1]);
    if (!found) return sendJson(res, 404, { error: 'Não encontrada' });
    photos = photos.filter((x) => x.id !== del[1]);
    saveDb();
    removeEntryFiles(found);
    broadcast('remove', { id: del[1] });
    return sendJson(res, 200, { ok: true });
  }

  // Download de tudo: fotos com moldura, sem moldura e os recados
  if (p === '/api/admin/export' && req.method === 'GET') {
    const given = { headers: { 'x-admin-key': url.searchParams.get('key') || req.headers['x-admin-key'] } };
    if (!isAdmin(given)) return sendJson(res, 403, { error: 'Sem permissão' });
    const stamp = new Date().toISOString().slice(0, 10);
    res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="fotos-${stamp}.zip"`, 'Cache-Control': 'no-store' });
    const entries = [];
    const rows = [['numero', 'nome', 'recado', 'horario', 'arquivo_com_moldura', 'arquivo_sem_moldura'].map(csvCell).join(';')];
    let txt = '';
    photos.forEach((ph, i) => {
      const base = fileBase(ph, i);
      if (ph.type === 'video') {
        const vname = `videos/${base}${path.extname(ph.url)}`;
        entries.push({ name: vname, file: path.join(VIDEO_DIR, path.basename(ph.url)) });
        const whenV = new Date(ph.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        rows.push([i + 1, ph.name, '', whenV, vname, ''].map(csvCell).join(';'));
        return;
      }
      entries.push({ name: `com-moldura/${base}.jpg`, file: path.join(PHOTO_DIR, `${ph.id}.jpg`) });
      if (ph.hasRaw) entries.push({ name: `sem-moldura/${base}.jpg`, file: path.join(RAW_DIR, `${ph.id}.jpg`) });
      const when = new Date(ph.createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      rows.push([i + 1, ph.name, ph.message, when, `com-moldura/${base}.jpg`, ph.hasRaw ? `sem-moldura/${base}.jpg` : ''].map(csvCell).join(';'));
      if (ph.message) txt += `${ph.name || 'Sem nome'} (${when}):\n${ph.message}\n\n`;
    });
    entries.push({ name: 'recados.csv', data: Buffer.from('\ufeff' + rows.join('\r\n'), 'utf8') });
    entries.push({ name: 'recados.txt', data: Buffer.from(txt || 'Nenhum recado.\n', 'utf8') });
    return streamZip(res, entries);
  }

  // Apagar tudo (depois do download)
  if (p === '/api/admin/all' && req.method === 'DELETE') {
    if (!isAdmin(req)) return sendJson(res, 403, { error: 'Sem permissão' });
    const n = photos.length;
    for (const ph of photos) removeEntryFiles(ph);
    // capas de envios que não terminaram
    fs.readdir(VIDEO_DIR, (err, list) => { if (!err) list.forEach((f) => fs.rm(path.join(VIDEO_DIR, f), () => {})); });
    photos = []; saveDb();
    broadcast('reset', {});
    return sendJson(res, 200, { ok: true, removed: n });
  }

  if (p === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('retry: 2000\n\n');
    clients.add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(ping); clients.delete(res); });
    return;
  }

  if (p.startsWith('/videos/')) return serveRange(req, res, path.join(VIDEO_DIR, path.basename(p)));
  if (p.startsWith('/photos/')) {
    const file = path.join(PHOTO_DIR, path.basename(p));
    return serveFile(res, file, 'public, max-age=31536000, immutable');
  }

  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  serveFile(res, file);
});

server.listen(PORT, HOST, () => {
  console.log('\n  Mural de fotos rodando!\n');
  console.log(`  Telão (abra no computador do projetor):  http://localhost:${PORT}/telao`);
  console.log(`  Página do celular (vai no QR Code):     ${PUBLIC_URL}/foto`);
  console.log(`  Moderação:                              ${PUBLIC_URL}/admin${ADMIN_KEY ? '' : '  (defina ADMIN_KEY para ativar)'}\n`);
  if (!process.env.PUBLIC_URL) {
    console.log('  Dica: para a câmera ao vivo no celular, use HTTPS (ex.: cloudflared tunnel)');
    console.log('  e rode com PUBLIC_URL=https://seu-endereco node server.js\n');
  }
});
