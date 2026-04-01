// Minimal JWT-based session for the API
import { createHmac, randomBytes } from 'crypto';

const SECRET = process.env.SESSION_SECRET ?? 'dev-secret';

interface SessionPayload {
  userId: string;
  githubLogin: string;
  orgId: string | null;
  iat: number;
}

export function signSession(payload: Omit<SessionPayload, 'iat'>): string {
  const data = { ...payload, iat: Math.floor(Date.now() / 1000) };
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifySession(token: string): SessionPayload | null {
  const [encoded, sig] = token.split('.');
  if (!encoded || !sig) return null;
  const expected = createHmac('sha256', SECRET).update(encoded).digest('base64url');
  if (expected !== sig) return null;
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString());
  } catch {
    return null;
  }
}
