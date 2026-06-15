import fs from 'fs/promises';
import path from 'path';
import Busboy from 'busboy';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const DIRECTOR_POSTER_PREFIX = {
  ariel_martin: 'directors/ariel_martin/posters',
  kyra_bartley: 'directors/kyra_bartley',
  toby_morris: 'directors/toby_morris/posters',
};

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 15 * 1024 * 1024;

function safeFilename(name) {
  const ext = path.extname(name || '').toLowerCase();
  const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const useExt = allowedExt.includes(ext) ? ext : '.jpg';
  const base = path
    .basename(name || 'poster', ext)
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 72);
  return (base || 'poster') + '_' + Date.now() + useExt;
}

export function parseMultipart(req) {
  return new Promise(function (resolve, reject) {
    const busboy = Busboy({ headers: req.headers });
    parseBusboy(busboy, resolve, reject);
    req.pipe(busboy);
  });
}

export function parseMultipartBuffer(buffer, headers) {
  return new Promise(function (resolve, reject) {
    const busboy = Busboy({ headers: headers || {} });
    parseBusboy(busboy, resolve, reject);
    busboy.end(buffer);
  });
}

function parseBusboy(busboy, resolve, reject) {
  const result = { directorId: '', fileBuffer: null, filename: '', mimeType: '' };

  busboy.on('field', function (name, val) {
    if (name === 'directorId') result.directorId = val;
  });

  busboy.on('file', function (_name, file, info) {
    const chunks = [];
    let size = 0;
    file.on('data', function (chunk) {
      size += chunk.length;
      if (size > MAX_BYTES) {
        reject(new Error('File too large (max 15 MB)'));
        file.resume();
        return;
      }
      chunks.push(chunk);
    });
    file.on('end', function () {
      result.fileBuffer = Buffer.concat(chunks);
      result.filename = info.filename;
      result.mimeType = info.mimeType;
    });
  });

  busboy.on('finish', function () {
    resolve(result);
  });
  busboy.on('error', reject);
}

async function uploadToS3(buffer, key, contentType, config) {
  const client = new S3Client({ region: config.awsRegion });
  await client.send(
    new PutObjectCommand({
      Bucket: config.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

async function uploadToLocal(buffer, key, repoRoot) {
  const filePath = path.join(repoRoot, key);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, buffer);
  return key;
}

export async function handlePosterUpload(req, config, repoRoot) {
  const { directorId, fileBuffer, filename, mimeType } = await parseMultipart(req);
  return processPosterUpload(directorId, fileBuffer, filename, mimeType, config, repoRoot);
}

export async function handlePosterUploadBuffer(buffer, headers, config, repoRoot) {
  const { directorId, fileBuffer, filename, mimeType } = await parseMultipartBuffer(buffer, headers);
  return processPosterUpload(directorId, fileBuffer, filename, mimeType, config, repoRoot);
}

async function processPosterUpload(directorId, fileBuffer, filename, mimeType, config, repoRoot) {
  if (!directorId || !DIRECTOR_POSTER_PREFIX[directorId]) {
    throw new Error('Invalid director');
  }
  if (!fileBuffer || !fileBuffer.length) {
    throw new Error('No file received');
  }
  if (!ALLOWED_TYPES.has(mimeType)) {
    throw new Error('File must be a JPEG, PNG, WebP, or GIF image');
  }

  const prefix = DIRECTOR_POSTER_PREFIX[directorId];
  const key = prefix + '/' + safeFilename(filename);

  try {
    await uploadToS3(fileBuffer, key, mimeType, config);
    return { path: key, storage: 's3' };
  } catch (s3Err) {
    await uploadToLocal(fileBuffer, key, repoRoot);
    return {
      path: key,
      storage: 'local',
      warning: 'Saved locally (S3 unavailable). Add AWS credentials to .env for live uploads.',
    };
  }
}
