import crypto from 'crypto';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function createToken(config) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', config.adminPassword).update(payload).digest('base64url');
  return { token: payload + '.' + sig, expiresAt: exp };
}

export function verifyToken(token, config) {
  if (!token || !config.adminPassword) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto
    .createHmac('sha256', config.adminPassword)
    .update(payload)
    .digest('base64url');
  if (sig !== expected) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return Date.now() < exp;
  } catch {
    return false;
  }
}

export function getBearerToken(headers) {
  const auth = headers.authorization || headers.Authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}
