import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleApiRequest } from './api-handler.mjs';
import { getConfig } from './api-handler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
};

function loadEnvFile() {
  const envPath = path.resolve(__dirname, '../.env');
  return fs
    .readFile(envPath, 'utf8')
    .then(function (text) {
      text.split('\n').forEach(function (line) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eq = trimmed.indexOf('=');
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      });
    })
    .catch(function () {});
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on('data', function (c) {
      chunks.push(c);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks));
    });
    req.on('error', reject);
  });
}

async function serveStatic(req, res, urlPath) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(REPO_ROOT, safePath);

  if (!filePath.startsWith(REPO_ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  if (stat.isDirectory()) {
    const indexPath = path.join(filePath, 'index.html');
    try {
      await fs.stat(indexPath);
      return serveStatic(req, res, path.join(safePath, 'index.html'));
    } catch {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const data = await fs.readFile(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(data);
}

async function main() {
  await loadEnvFile();
  const config = getConfig();

  const server = http.createServer(async function (req, res) {
    const url = new URL(req.url, 'http://' + req.headers.host);

    if (url.pathname.startsWith('/api/')) {
      try {
        const body = await readBody(req);
        const isMultipart = (req.headers['content-type'] || '').includes('multipart/form-data');
        const result = await handleApiRequest({
          method: req.method,
          path: url.pathname,
          headers: req.headers,
          body: isMultipart ? body : body.toString('utf8'),
          isBase64Encoded: false,
        });
        res.writeHead(result.status, result.headers || {});
        res.end(result.body || '');
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Server error' }));
      }
      return;
    }

    let filePath = url.pathname;
    if (filePath === '/') filePath = '/editable/index.html';

    await serveStatic(req, res, filePath);
  });

  server.listen(config.port || 8787, function () {
    console.log('');
    console.log('  Cousin CMS dev server');
    console.log('  ─────────────────────');
    console.log('  Site:   http://localhost:' + (config.port || 8787) + '/editable/');
    console.log('  Admin:  http://localhost:' + (config.port || 8787) + '/editable/admin/');
    console.log('');
  });
}

main();
