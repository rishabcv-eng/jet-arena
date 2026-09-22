// Jet Arena LAN server — static files + a tiny WebSocket relay.
// Zero dependencies: the WebSocket handshake and framing are implemented inline,
// so this runs on a plain Node install with no npm packages.
//
//   node server.js [port]
//
// Then everyone on the same Wi-Fi / hotspot opens the printed http://<ip>:<port>

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const crypto = require('crypto');

const PORT = parseInt(process.argv[2] || process.env.PORT || '8123', 10);
const ROOT = __dirname;
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.webmanifest':'application/manifest+json'
};

// a guest-supplied name/colour is only ever displayed, but keep it tidy
function cleanName(n) {
  return String(n || '').toUpperCase().replace(/[^A-Z0-9 _-]/g, '').trim().slice(0, 10) || 'PILOT';
}
function cleanColor(c) {
  return /^#[0-9a-fA-F]{6}$/.test(String(c || '')) ? String(c) : '#9dffb0';
}

function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push({ name, address: ni.address });
    }
  }
  return out;
}

// ------------------------------------------------------------------ HTTP
const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);

  if (url === '/lan') {
    const body = JSON.stringify({ port: PORT, addresses: lanAddresses(), players: clients.size });
    res.writeHead(200, { 'Content-Type': MIME['.json'], 'Cache-Control': 'no-store' });
    return res.end(body);
  }

  let rel = url === '/' ? '/index.html' : url;
  const file = path.join(ROOT, path.normalize(rel).replace(/^([\\/])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }

  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  });
});

// ------------------------------------------------------------------ WebSocket
let nextId = 1;
const clients = new Map();          // id -> { socket, id, alive }
let hostId = null;

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key) { socket.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );
  socket.setNoDelay(true);

  const id = nextId++;
  const client = { socket, id, buf: Buffer.alloc(0) };
  clients.set(id, client);

  // the client tells us whether it wants to host or join; nobody is made
  // host behind their back
  send(client, { t: 'hello', id });
  log('client ' + id + ' connected — ' + clients.size + ' online');

  socket.on('data', chunk => {
    client.buf = Buffer.concat([client.buf, chunk]);
    let frame;
    while ((frame = decodeFrame(client.buf))) {
      client.buf = client.buf.slice(frame.total);
      if (frame.opcode === 0x8) { closeClient(id); return; }
      if (frame.opcode === 0x9) { rawSend(socket, frame.payload, 0xA); continue; }   // ping -> pong
      if (frame.opcode !== 0x1) continue;
      let msg;
      try { msg = JSON.parse(frame.payload.toString('utf8')); } catch (e) { continue; }
      route(client, msg);
    }
  });

  socket.on('error', () => closeClient(id));
  socket.on('close', () => closeClient(id));
});

function route(client, msg) {
  if (!msg || typeof msg !== 'object') return;

  if (msg.t === 'role') {
    client.name = cleanName(msg.name);
    client.color = cleanColor(msg.color);
    if (msg.want === 'host') {
      if (hostId !== null && hostId !== client.id) {
        send(client, { t: 'denied', why: 'host-exists' });
        log('client ' + client.id + ' wanted to host, but ' + hostId + ' already is');
        return;
      }
      hostId = client.id;
      client.role = 'host';
      send(client, { t: 'role-ok', role: 'host' });
      log('client ' + client.id + ' is hosting');
      // anyone already waiting belongs to this host now
      for (const [gid, g] of clients) {
        if (gid === client.id || g.role !== 'guest') continue;
        send(client, { t: 'join', id: gid, name: g.name, color: g.color });
        send(g, { t: 'role-ok', role: 'guest', hostPresent: true });
      }
    } else {
      client.role = 'guest';
      send(client, { t: 'role-ok', role: 'guest', hostPresent: hostId !== null });
      const h = clients.get(hostId);
      if (h) send(h, { t: 'join', id: client.id, name: client.name, color: client.color });
      log(client.name + ' (client ' + client.id + ') joined as a player');
    }
    broadcast({ t: 'count', count: countActive(), hostId }, null);
    return;
  }

  if (msg.t === 'in') {
    // player input -> host only
    const h = clients.get(hostId);
    if (h && h.id !== client.id) { msg.id = client.id; send(h, msg); }
    return;
  }
  if (msg.t === 'sn' || msg.t === 'fx' || msg.t === 'lvl' || msg.t === 'lobby') {
    // world state -> everyone but the host
    if (client.id === hostId) broadcast(msg, hostId);
    return;
  }
}

function closeClient(id) {
  const c = clients.get(id);
  if (!c) return;
  clients.delete(id);
  try { c.socket.destroy(); } catch (e) {}
  log('client ' + id + ' left — ' + clients.size + ' online');

  if (id === hostId) {
    // the match is over for everyone — no surprise promotions
    hostId = null;
    broadcast({ t: 'host-gone' }, null);
    for (const c of clients.values()) c.role = null;
    log('host left — players sent back to the menu');
  } else {
    const h = clients.get(hostId);
    if (h) send(h, { t: 'leave', id });
  }
  broadcast({ t: 'count', count: countActive(), hostId }, null);
}

function countActive() {
  let n = 0;
  for (const c of clients.values()) if (c.role) n++;
  return n;
}

function send(client, obj) {
  if (!client || client.socket.destroyed) return;
  rawSend(client.socket, Buffer.from(JSON.stringify(obj), 'utf8'), 0x1);
}
function broadcast(obj, exceptId) {
  const payload = Buffer.from(JSON.stringify(obj), 'utf8');
  for (const [id, c] of clients) {
    if (id === exceptId || c.socket.destroyed) continue;
    rawSend(c.socket, payload, 0x1);
  }
}

function rawSend(socket, payload, opcode) {
  const len = payload.length;
  let header;
  if (len < 126) {
    header = Buffer.alloc(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.alloc(4);
    header[1] = 126; header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.alloc(10);
    header[1] = 127;
    header.writeUInt32BE(Math.floor(len / 4294967296), 2);
    header.writeUInt32BE(len >>> 0, 6);
  }
  header[0] = 0x80 | opcode;
  try { socket.write(Buffer.concat([header, payload])); } catch (e) {}
}

// returns {opcode, payload, total} or null when more bytes are needed
function decodeFrame(buf) {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) === 0x80;
  let len = buf[1] & 0x7f;
  let off = 2;
  if (len === 126) {
    if (buf.length < off + 2) return null;
    len = buf.readUInt16BE(off); off += 2;
  } else if (len === 127) {
    if (buf.length < off + 8) return null;
    const hi = buf.readUInt32BE(off), lo = buf.readUInt32BE(off + 4);
    len = hi * 4294967296 + lo; off += 8;
  }
  let mask = null;
  if (masked) {
    if (buf.length < off + 4) return null;
    mask = buf.slice(off, off + 4); off += 4;
  }
  if (buf.length < off + len) return null;
  const payload = Buffer.from(buf.slice(off, off + len));
  if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
  return { opcode, payload, total: off + len };
}

function log(m) { console.log('[jetarena] ' + m); }

server.listen(PORT, '0.0.0.0', () => {
  const addrs = lanAddresses();
  console.log('');
  console.log('  JET ARENA server running');
  console.log('  ------------------------------------------');
  console.log('  on this machine : http://localhost:' + PORT);
  addrs.forEach(a => console.log('  for your friends: http://' + a.address + ':' + PORT + '   (' + a.name + ')'));
  if (!addrs.length) console.log('  (no LAN address found — connect to Wi-Fi or start your hotspot)');
  console.log('  ------------------------------------------');
  console.log('  One person picks HOST LAN, everyone else picks JOIN LAN. Ctrl+C to stop.');
  console.log('');
});
