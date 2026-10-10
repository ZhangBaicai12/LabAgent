/* =====================================================
 * lab-agent 演示持久化服务（Node 内置模块，零 npm 依赖）
 *
 * 职责：
 *  1. 静态托管 frontend/（演示入口 http://localhost:8080/frontend/）
 *  2. GET  /api/data   当前演示数据（读 data/demo.json；缺文件则先生成）
 *  3. POST /api/save   前端防抖全量快照落盘（写临时文件 + rename，原子替换）
 *  4. GET  /api/reset  一键重置为种子数据（机台 700 台 / 设备 28 台…）
 *
 * 单机演示：无鉴权、无并发事务；demo.json 即唯一持久层。
 * ============================================================ */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const FRONT = path.join(ROOT, 'frontend');
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'demo.json');
const TMP_FILE = path.join(DATA_DIR, 'demo.json.tmp');

const PORT = parseInt(process.env.PORT || '8080', 10);
const MAX_BODY = 64 * 1024 * 1024; /* 700 台机台全量快照，32MB 上限足够 */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8'
};

function buildSeedData() {
  const seed = require('./data/seed');
  return seed.buildSeed();
}

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const db = buildSeedData();
    writeAtomic(db);
    console.log('[demo] demo.json 不存在，已按种子生成（机台 700 / 台账流转子集 / 设备 28）');
    return db;
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.warn('[demo] demo.json 解析失败，落入种子重建：' + err.message);
    const db = buildSeedData();
    writeAtomic(db);
    return db;
  }
}

function writeAtomic(data) {
  const body = JSON.stringify(data);
  fs.writeFileSync(TMP_FILE, body, 'utf8');
  fs.renameSync(TMP_FILE, DATA_FILE);
  return body.length;
}

function resetData() {
  delete require.cache[require.resolve('./data/seed')];
  const db = buildSeedData();
  writeAtomic(db);
  return db;
}

function reply(res, status, obj) {
  const body = obj === undefined ? '' : (typeof obj === 'string' ? obj : JSON.stringify(obj));
  res.writeHead(status, {
    'Content-Type': typeof obj === 'string' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  let rel;
  if (pathname === '/' || pathname === '/frontend') {
    res.writeHead(302, { Location: '/frontend/' });
    res.end();
    return;
  }
  if (pathname === '/frontend/' || pathname === '/frontend') {
    rel = 'index.html';
  } else if (pathname.indexOf('/frontend/') === 0) {
    rel = pathname.slice('/frontend/'.length);
  } else {
    reply(res, 404, 'Not Found');
    return;
  }
  const target = path.normalize(path.join(FRONT, rel));
  if (target.indexOf(FRONT) !== 0) { reply(res, 403, 'Forbidden'); return; }
  fs.readFile(target, (err, buf) => {
    if (err) { reply(res, 404, 'Not Found'); return; }
    const mime = MIME[path.extname(target).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/api/data') {
    reply(res, 200, readData());
    return;
  }
  if (req.method === 'GET' && pathname === '/api/reset') {
    const db = resetData();
    console.log('[demo] 已一键重置为种子数据');
    reply(res, 200, db);
    return;
  }
  if (req.method === 'POST' && pathname === '/api/save') {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reply(res, 413, '超出保存体积上限'); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      let data;
      try {
        data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch (err) {
        reply(res, 400, '非法 JSON，未写入');
        return;
      }
      try {
        const bytes = writeAtomic(data);
        reply(res, 200, { ok: true, bytes });
      } catch (err) {
        console.error('[demo] 写入失败：' + err.message);
        reply(res, 500, '写入 demo.json 失败');
      }
    });
    return;
  }
  if (/^\/api\//.test(pathname)) { reply(res, 404, '未知 API'); return; }
  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log('lab-agent 演示服务已启动 → http://localhost:' + PORT + '/frontend/');
  console.log('  数据文件：data/demo.json（改动防抖自动保存；/api/reset 一键还原种子）');
});