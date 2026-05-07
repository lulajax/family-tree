import * as crypto from 'crypto';
import { query } from '../config/database';
import { User, UserRole } from '../types';
import { ConflictError, UnauthorizedError } from '../utils/errors';

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = parseInt(process.env.JWT_EXPIRES_IN || '86400', 10); // 24h default

interface TokenPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat: number;
  exp: number;
}

interface AuthTokens {
  access_token: string;
  expires_in: number;
}

// Lightweight password hashing using Node.js built-in crypto (no bcryptjs dependency)
function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, usedSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: usedSalt };
}

function verifyPassword(password: string, storedHash: string): boolean {
  // storedHash format: "salt:hash"
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const { hash: computedHash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
}

function makePasswordHash(password: string): string {
  const { hash, salt } = hashPassword(password);
  return `${salt}:${hash}`;
}

function omitPasswordHash(user: User): Omit<User, 'password_hash'> {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

// Lightweight JWT using Node.js built-in crypto (no jsonwebtoken dependency)
function base64urlEncode(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return buf.toString('base64url');
}

function base64urlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString();
}

function signJwt(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRES_IN,
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(fullPayload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

function verifyJwt(token: string): TokenPayload | null {
  try {
    const [headerB64, payloadB64, signature] = token.split('.');
    if (!headerB64 || !payloadB64 || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(base64urlDecode(payloadB64));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export class AuthService {
  async register(username: string, password: string, displayName?: string): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
    // Check if username exists
    const existing = await query<{ id: string }>('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      throw new ConflictError('用户名已存在');
    }

    const password_hash = makePasswordHash(password);

    const result = await query<User>(
      `INSERT INTO users (username, password_hash, display_name)
       VALUES ($1, $2, $3)
       RETURNING id, username, display_name, role, created_at, updated_at`,
      [username, password_hash, displayName || username]
    );

    const user = result.rows[0];
    const tokens = this.generateTokens(user);

    return {
      user: omitPasswordHash(user),
      tokens,
    };
  }

  async login(username: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
    const result = await query<User>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    const user = result.rows[0];
    if (!verifyPassword(password, user.password_hash)) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    const tokens = this.generateTokens(user);

    return {
      user: omitPasswordHash(user),
      tokens,
    };
  }

  async getUserById(id: string): Promise<Omit<User, 'password_hash'> | null> {
    const result = await query<User>(
      'SELECT id, username, display_name, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  }

  private generateTokens(user: User): AuthTokens {
    const access_token = signJwt({
      sub: user.id,
      username: user.username,
      role: user.role,
    });

    return {
      access_token,
      expires_in: JWT_EXPIRES_IN,
    };
  }
}

export { verifyJwt, TokenPayload };
export const authService = new AuthService();
