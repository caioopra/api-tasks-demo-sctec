import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

/**
 * The full user record kept in the in-memory store (see {@link usersDb}).
 * Includes the salted password hash — never serialised to clients; use
 * {@link PublicUser} for anything that crosses the wire.
 */
export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
}

/** Safe-to-serialise projection of a user. */
export interface PublicUser {
  id: string;
  email: string;
}

/** Decoded payload carried inside a fake-JWT minted by {@link signToken}. */
export interface TokenPayload {
  sub: string;
  email: string;
  iat: number;
}

const SALT_BYTES = 16;

/**
 * Salt and hash a password.
 *
 * Stand-in for bcrypt — same call-shape (`hashPassword` → opaque string,
 * {@link verifyPassword} validates), but the underlying primitive is a single
 * SHA-256 over `salt + password`. Good enough to demonstrate the architecture
 * arrow `auth.service → users.passwordHash`; **not** good enough for any
 * real authentication system.
 *
 * @returns a `salt$hash` string suitable for storage.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = sha256(salt + password);
  return `${salt}$${hash}`;
}

/**
 * Constant-time verification of a candidate password against a stored
 * `salt$hash` string produced by {@link hashPassword}.
 *
 * @returns `true` when the password matches, `false` otherwise (including
 *          malformed stored values).
 */
export function verifyPassword(password: string, stored: string): boolean {
  const sep = stored.indexOf('$');
  if (sep === -1) return false;
  const salt = stored.slice(0, sep);
  const expectedHex = stored.slice(sep + 1);
  const actualHex = sha256(salt + password);
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = Buffer.from(actualHex, 'hex');
  if (expected.length === 0 || expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Sign a fake-JWT for the given user.
 *
 * Output format is the same three-segment `header.payload.signature`
 * structure as a real JWT (so tools like jwt.io can decode the header and
 * payload) — but the signing key is the static {@link env.JWT_SECRET} and the
 * algorithm is HS256. No expiry is set; revocation is left as an exercise.
 */
export function signToken(user: PublicUser): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    iat: Math.floor(Date.now() / 1000),
  };
  const body = base64url(JSON.stringify(payload));
  const signature = sign(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

/**
 * Verify a token produced by {@link signToken}.
 *
 * @returns the decoded {@link TokenPayload} on success, or `null` when the
 *          token is malformed, the signature does not match, or the body is
 *          not parseable JSON.
 */
export function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = sign(`${header}.${body}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length === 0 || a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      typeof (decoded as TokenPayload).sub === 'string' &&
      typeof (decoded as TokenPayload).email === 'string' &&
      typeof (decoded as TokenPayload).iat === 'number'
    ) {
      return decoded as TokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function sign(input: string): string {
  return createHmac('sha256', env.JWT_SECRET).update(input).digest('base64url');
}

function base64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url');
}
