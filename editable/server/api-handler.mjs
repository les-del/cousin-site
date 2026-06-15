import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createToken, verifyToken, getBearerToken } from './auth.mjs';
import { readGithubJson, writeGithubJson } from './github-storage.mjs';
import { handlePosterUpload, handlePosterUploadBuffer } from './upload.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const DATA_FILE = path.resolve(__dirname, '../data/directors.json');
const DRAFT_FILE = path.resolve(__dirname, '../data/directors.draft.json');
const DRAFT_GITHUB_PATH = 'editable/data/directors.draft.json';
const PUBLISHED_GITHUB_PATH = 'editable/data/directors.json';

const sessions = new Map();

export function getConfig() {
  return {
    port: Number(process.env.PORT) || 8787,
    adminPassword: process.env.COUSIN_ADMIN_PASSWORD || 'cousin-dev',
    githubToken: process.env.GITHUB_TOKEN || '',
    githubRepo: process.env.GITHUB_REPO || 'les-del/cousin-site',
    awsRegion: process.env.AWS_REGION || 'ap-southeast-2',
    s3Bucket: process.env.S3_BUCKET || 'cousin-productions',
    noAuth: process.env.COUSIN_ADMIN_NO_AUTH === 'true',
    netlify: Boolean(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME),
    corsOrigins: [
      'http://localhost:8787',
      'https://www.cousin.site',
      'https://cousin.site',
    ],
  };
}

function corsHeaders(headers, config) {
  const origin = headers.origin || headers.Origin || '';
  const allowed =
    (config.corsOrigins || []).some(function (o) {
      return origin === o || origin.endsWith('.cousin.site');
    }) || origin.endsWith('.netlify.app');
  if (!allowed) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(status, body, extraHeaders) {
  return {
    status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extraHeaders || {}),
    body: JSON.stringify(body),
  };
}

function useGithubStorage(config) {
  return Boolean(config.githubToken) && (config.netlify || process.env.USE_GITHUB_STORAGE === 'true');
}

async function readDraft(config) {
  if (useGithubStorage(config)) {
    const result = await readGithubJson(DRAFT_GITHUB_PATH, config);
    return result ? result.data : null;
  }
  try {
    const raw = await fs.readFile(DRAFT_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveDraft(data, config) {
  data.updatedAt = new Date().toISOString().slice(0, 10);
  if (useGithubStorage(config)) {
    await writeGithubJson(DRAFT_GITHUB_PATH, data, 'Save CMS draft', config);
    return;
  }
  await fs.writeFile(DRAFT_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function publishData(data, config) {
  data.updatedAt = new Date().toISOString().slice(0, 10);
  data.publishedAt = new Date().toISOString().slice(0, 10);
  if (useGithubStorage(config)) {
    await writeGithubJson(DRAFT_GITHUB_PATH, data, 'Publish CMS draft', config);
    const github = await writeGithubJson(PUBLISHED_GITHUB_PATH, data, 'Publish director reels', config);
    return github;
  }
  await fs.writeFile(DRAFT_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
  return { pushedToGitHub: false };
}

function createSession(config) {
  if (config.netlify) return createToken(config);
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  sessions.set(token, expiresAt);
  return { token, expiresAt };
}

function sessionValid(token, config) {
  if (config.netlify) return verifyToken(token, config);
  const expiresAt = sessions.get(token);
  if (!expiresAt || Date.now() > expiresAt) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(headers, config) {
  if (config.noAuth) return true;
  const token = getBearerToken(headers);
  return sessionValid(token, config);
}

function getRequestBody(rawBody, isBase64Encoded) {
  if (!rawBody) return '';
  if (isBase64Encoded) return Buffer.from(rawBody, 'base64').toString('utf8');
  return rawBody;
}

function getRequestBuffer(rawBody, isBase64Encoded) {
  if (!rawBody) return Buffer.alloc(0);
  if (Buffer.isBuffer(rawBody)) return rawBody;
  if (isBase64Encoded) return Buffer.from(rawBody, 'base64');
  return Buffer.from(rawBody, 'utf8');
}

export async function handleApiRequest(req) {
  const config = getConfig();
  const method = (req.method || 'GET').toUpperCase();
  const pathname = (req.path || '/').split('?')[0];
  const headers = req.headers || {};
  const cors = corsHeaders(headers, config);

  if (method === 'OPTIONS') {
    return { status: 204, headers: cors, body: '' };
  }

  if (method === 'POST' && pathname === '/api/login') {
    const body = JSON.parse(getRequestBody(req.body, req.isBase64Encoded));
    if (body.password !== config.adminPassword) {
      return jsonResponse(401, { error: 'Wrong password' }, cors);
    }
    const session = createSession(config);
    return jsonResponse(200, session, cors);
  }

  if (method === 'GET' && pathname === '/api/session') {
    if (!requireAuth(headers, config)) return jsonResponse(401, { error: 'Unauthorized' }, cors);
    return jsonResponse(200, { ok: true }, cors);
  }

  if (method === 'POST' && pathname === '/api/logout') {
    return jsonResponse(200, { ok: true }, cors);
  }

  if (method === 'GET' && pathname === '/api/directors/draft') {
    if (!requireAuth(headers, config)) return jsonResponse(401, { error: 'Unauthorized' }, cors);
    const data = await readDraft(config);
    if (!data) return jsonResponse(404, { error: 'No draft' }, cors);
    return jsonResponse(200, data, cors);
  }

  if (method === 'PUT' && pathname === '/api/directors/draft') {
    if (!requireAuth(headers, config)) return jsonResponse(401, { error: 'Unauthorized' }, cors);
    let data;
    try {
      data = JSON.parse(getRequestBody(req.body, req.isBase64Encoded));
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON' }, cors);
    }
    if (!data || !Array.isArray(data.directors)) {
      return jsonResponse(400, { error: 'Invalid directors data' }, cors);
    }
    try {
      await saveDraft(data, config);
      return jsonResponse(200, { ok: true, saved: 'draft' }, cors);
    } catch (err) {
      return jsonResponse(500, { error: err.message || 'Save failed' }, cors);
    }
  }

  if (method === 'POST' && pathname === '/api/directors/publish') {
    if (!requireAuth(headers, config)) return jsonResponse(401, { error: 'Unauthorized' }, cors);
    let data;
    try {
      data = JSON.parse(getRequestBody(req.body, req.isBase64Encoded));
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON' }, cors);
    }
    if (!data || !Array.isArray(data.directors)) {
      return jsonResponse(400, { error: 'Invalid directors data' }, cors);
    }
    try {
      const github = await publishData(data, config);
      return jsonResponse(200, Object.assign({ ok: true, published: true }, github), cors);
    } catch (err) {
      return jsonResponse(500, { error: err.message || 'Publish failed' }, cors);
    }
  }

  if (method === 'PUT' && pathname === '/api/directors') {
    if (!requireAuth(headers, config)) return jsonResponse(401, { error: 'Unauthorized' }, cors);
    let data;
    try {
      data = JSON.parse(getRequestBody(req.body, req.isBase64Encoded));
    } catch {
      return jsonResponse(400, { error: 'Invalid JSON' }, cors);
    }
    if (!data || !Array.isArray(data.directors)) {
      return jsonResponse(400, { error: 'Invalid directors data' }, cors);
    }
    try {
      const github = await publishData(data, config);
      return jsonResponse(200, Object.assign({ ok: true }, github), cors);
    } catch (err) {
      return jsonResponse(500, { error: err.message || 'Save failed' }, cors);
    }
  }

  if (method === 'POST' && pathname === '/api/upload') {
    if (!requireAuth(headers, config)) return jsonResponse(401, { error: 'Unauthorized' }, cors);
    try {
      const buffer = getRequestBuffer(req.body, req.isBase64Encoded);
      const result = await handlePosterUploadBuffer(buffer, headers, config, REPO_ROOT);
      return jsonResponse(200, Object.assign({ ok: true }, result), cors);
    } catch (err) {
      return jsonResponse(400, { error: err.message || 'Upload failed' }, cors);
    }
  }

  if (method === 'GET' && pathname === '/api/health') {
    return jsonResponse(
      200,
      {
        ok: true,
        platform: config.netlify ? 'netlify' : 'node',
        githubConfigured: Boolean(config.githubToken),
        s3Bucket: config.s3Bucket,
      },
      cors
    );
  }

  return { status: 404, headers: cors, body: JSON.stringify({ error: 'Not found' }) };
}
