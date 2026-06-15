import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { handlePosterUpload } from './upload.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const DATA_FILE = path.resolve(__dirname, '../data/directors.json');
const DRAFT_FILE = path.resolve(__dirname, '../data/directors.draft.json');

const sessions = new Map();

function getConfig() {
  return {
    port: Number(process.env.PORT) || 8787,
    adminPassword: process.env.COUSIN_ADMIN_PASSWORD || 'cousin-dev',
    githubToken: process.env.GITHUB_TOKEN || '',
    githubRepo: process.env.GITHUB_REPO || 'les-del/cousin-site',
    githubDataPath: process.env.GITHUB_DATA_PATH || 'editable/data/directors.json',
    awsRegion: process.env.AWS_REGION || 'ap-southeast-2',
    s3Bucket: process.env.S3_BUCKET || 'cousin-productions',
    noAuth: process.env.COUSIN_ADMIN_NO_AUTH === 'true',
    corsOrigins: [
      'http://localhost:8787',
      'https://www.cousin.site',
      'https://cousin.site',
    ],
  };
}

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

function json(res, status, body, extraHeaders) {
  const payload = JSON.stringify(body);
  const headers = Object.assign(
    {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(payload),
    },
    extraHeaders || {}
  );
  res.writeHead(status, headers);
  res.end(payload);
}

function corsHeaders(req, config) {
  const origin = req.headers.origin || '';
  const allowed = (config.corsOrigins || []).some(function (o) {
    return origin === o || origin.endsWith('.cousin.site');
  });
  if (!allowed) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function readBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on('data', function (c) {
      chunks.push(c);
    });
    req.on('end', function () {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function getBearerToken(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  sessions.set(token, expiresAt);
  return { token, expiresAt };
}

function sessionValid(token) {
  if (!token) return false;
  const expiresAt = sessions.get(token);
  if (!expiresAt || Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, config) {
  if (config && config.noAuth) return true;
  const token = getBearerToken(req);
  if (!sessionValid(token)) {
    const cors = corsHeaders(req, config);
    json(res, 401, { error: 'Unauthorized' }, cors);
    return false;
  }
  return true;
}

async function saveToDisk(data, filePath) {
  const content = JSON.stringify(data, null, 2) + '\n';
  await fs.writeFile(filePath, content, 'utf8');
}

async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function pushToGitHub(data, config) {
  if (!config.githubToken) return { pushedToGitHub: false };

  const content = JSON.stringify(data, null, 2) + '\n';
  const base64 = Buffer.from(content).toString('base64');
  const headers = {
    Authorization: 'Bearer ' + config.githubToken,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'cousin-admin',
  };

  let sha;
  const getRes = await fetch(
    'https://api.github.com/repos/' + config.githubRepo + '/contents/' + config.githubDataPath,
    { headers }
  );
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  } else if (getRes.status !== 404) {
    throw new Error('GitHub read failed: ' + (await getRes.text()));
  }

  const putRes = await fetch(
    'https://api.github.com/repos/' + config.githubRepo + '/contents/' + config.githubDataPath,
    {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
      body: JSON.stringify({
        message: 'Update director reels (admin)',
        content: base64,
        sha,
      }),
    }
  );

  if (!putRes.ok) {
    throw new Error('GitHub write failed: ' + (await putRes.text()));
  }

  return { pushedToGitHub: true };
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

async function handleApi(req, res, url, config) {
  const cors = corsHeaders(req, config);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/login') {
    const body = JSON.parse(await readBody(req));
    if (body.password !== config.adminPassword) {
      return json(res, 401, { error: 'Wrong password' }, cors);
    }
    const session = createSession();
    return json(res, 200, session, cors);
  }

  if (req.method === 'GET' && url.pathname === '/api/session') {
    if (!requireAuth(req, res, config)) return;
    return json(res, 200, { ok: true }, cors);
  }

  if (req.method === 'POST' && url.pathname === '/api/logout') {
    const token = getBearerToken(req);
    if (token) sessions.delete(token);
    return json(res, 200, { ok: true }, cors);
  }

  if (req.method === 'GET' && url.pathname === '/api/directors/draft') {
    if (!requireAuth(req, res, config)) return;
    const data = await readJsonFile(DRAFT_FILE);
    if (!data) {
      return json(res, 404, { error: 'No draft' }, cors);
    }
    return json(res, 200, data, cors);
  }

  if (req.method === 'PUT' && url.pathname === '/api/directors/draft') {
    if (!requireAuth(req, res, config)) return;
    let data;
    try {
      data = JSON.parse(await readBody(req));
    } catch {
      return json(res, 400, { error: 'Invalid JSON' }, cors);
    }
    if (!data || !Array.isArray(data.directors)) {
      return json(res, 400, { error: 'Invalid directors data' }, cors);
    }
    try {
      data.updatedAt = new Date().toISOString().slice(0, 10);
      await saveToDisk(data, DRAFT_FILE);
      return json(res, 200, { ok: true, saved: 'draft' }, cors);
    } catch (err) {
      return json(res, 500, { error: err.message || 'Save failed' }, cors);
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/directors/publish') {
    if (!requireAuth(req, res, config)) return;
    let data;
    try {
      data = JSON.parse(await readBody(req));
    } catch {
      return json(res, 400, { error: 'Invalid JSON' }, cors);
    }
    if (!data || !Array.isArray(data.directors)) {
      return json(res, 400, { error: 'Invalid directors data' }, cors);
    }
    try {
      data.updatedAt = new Date().toISOString().slice(0, 10);
      data.publishedAt = new Date().toISOString().slice(0, 10);
      await saveToDisk(data, DRAFT_FILE);
      await saveToDisk(data, DATA_FILE);
      const github = await pushToGitHub(data, config);
      return json(res, 200, Object.assign({ ok: true, published: true }, github), cors);
    } catch (err) {
      return json(res, 500, { error: err.message || 'Publish failed' }, cors);
    }
  }

  // Legacy endpoint — treat as publish for backwards compatibility
  if (req.method === 'PUT' && url.pathname === '/api/directors') {
    if (!requireAuth(req, res, config)) return;
    let data;
    try {
      data = JSON.parse(await readBody(req));
    } catch {
      return json(res, 400, { error: 'Invalid JSON' }, cors);
    }
    if (!data || !Array.isArray(data.directors)) {
      return json(res, 400, { error: 'Invalid directors data' }, cors);
    }

    try {
      data.updatedAt = new Date().toISOString().slice(0, 10);
      await saveToDisk(data, DRAFT_FILE);
      await saveToDisk(data, DATA_FILE);
      const github = await pushToGitHub(data, config);
      return json(res, 200, Object.assign({ ok: true }, github), cors);
    } catch (err) {
      return json(res, 500, { error: err.message || 'Save failed' }, cors);
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/upload') {
    if (!requireAuth(req, res, config)) return;
    try {
      const result = await handlePosterUpload(req, config, REPO_ROOT);
      return json(res, 200, Object.assign({ ok: true }, result), cors);
    } catch (err) {
      return json(res, 400, { error: err.message || 'Upload failed' }, cors);
    }
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    return json(
      res,
      200,
      {
        ok: true,
        githubConfigured: Boolean(config.githubToken),
        s3Bucket: config.s3Bucket,
      },
      cors
    );
  }

  res.writeHead(404);
  res.end('Not found');
}

async function main() {
  await loadEnvFile();
  const config = getConfig();

  const server = http.createServer(async function (req, res) {
    const url = new URL(req.url, 'http://' + req.headers.host);

    if (url.pathname.startsWith('/api/')) {
      try {
        await handleApi(req, res, url, config);
      } catch (err) {
        json(res, 500, { error: err.message || 'Server error' });
      }
      return;
    }

    let filePath = url.pathname;
    if (filePath === '/') filePath = '/editable/index.html';

    await serveStatic(req, res, filePath);
  });

  server.listen(config.port, function () {
    console.log('');
    console.log('  Cousin editable dev server');
    console.log('  ─────────────────────────');
    console.log('  Site:   http://localhost:' + config.port + '/editable/');
    console.log('  Admin:  http://localhost:' + config.port + '/editable/admin/');
    console.log(
      '  Password: ' +
        (process.env.COUSIN_ADMIN_PASSWORD
          ? '(from .env)'
          : config.adminPassword + ' (default — copy .env.example to .env)')
    );
    if (config.githubToken) console.log('  GitHub push: enabled → ' + config.githubRepo);
    else console.log('  GitHub push: off (set GITHUB_TOKEN in .env to enable)');
    console.log('  Poster uploads → s3://' + config.s3Bucket + ' (or local fallback)');
    console.log('');
  });
}

main();
