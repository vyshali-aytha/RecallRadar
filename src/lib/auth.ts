import 'server-only';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';

import { pool } from './db';

export type UserRole = 'Admin' | 'Staff';

export type SessionUser = {
  userId: number;
  name: string;
  email: string;
  role: UserRole;
};

type SessionPayload = SessionUser & {
  iat: number;
  exp: number;
};

export const SESSION_COOKIE_NAME = 'rr_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.SESSION_SECRET;

  if (!secret || !secret.trim()) {
    throw new Error('Missing AUTH_SECRET or SESSION_SECRET environment variable.');
  }

  return secret;
}

function toBase64Url(value: string | Buffer): string {
  const source = typeof value === 'string' ? Buffer.from(value) : value;
  return source
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return Buffer.from(padded, 'base64');
}

function createSigningKey(secret: string) {
  return crypto.createHmac('sha256', secret);
}

function signSession(payload: SessionPayload): string {
  const secret = getAuthSecret();
  const header = toBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const jsonPayload = toBase64Url(JSON.stringify(payload));
  const signature = createSigningKey(secret)
    .update(`${header}.${jsonPayload}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${header}.${jsonPayload}.${signature}`;
}

function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [header, payload, signature] = token.split('.');

    if (!header || !payload || !signature) {
      return null;
    }

    const expectedSignature = createSigningKey(getAuthSecret())
      .update(`${header}.${payload}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const parsedPayload = JSON.parse(fromBase64Url(payload).toString('utf8')) as SessionPayload;
    if (!parsedPayload || !parsedPayload.userId || !parsedPayload.email || !parsedPayload.role) {
      return null;
    }

    if (Number(parsedPayload.exp) < Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!isValidRole(parsedPayload.role)) {
      return null;
    }

    return parsedPayload;
  } catch {
    return null;
  }
}

export function isValidRole(value: unknown): value is UserRole {
  return value === 'Admin' || value === 'Staff';
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(password, salt, 200000, 32, 'sha256');
  return `pbkdf2_sha256$${salt}$${derived.toString('hex')}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) {
    return false;
  }

  try {
    const [algorithm, salt, expectedHash] = storedHash.split('$');
    if (algorithm !== 'pbkdf2_sha256' || !salt || !expectedHash) {
      return false;
    }

    const derived = crypto.pbkdf2Sync(password, salt, 200000, 32, 'sha256');
    return crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(derived.toString('hex'), 'hex'));
  } catch {
    return false;
  }
}

export async function setSession(session: SessionUser) {
  const cookieStore = await cookies();
  const now = Math.floor(Date.now() / 1000);
  const token = signSession({
    ...session,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  });

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
    priority: 'high',
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getCurrentSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return null;
  }

  return {
    userId: Number(payload.userId),
    name: payload.name,
    email: payload.email,
    role: payload.role,
  };
}

export async function requireAuth(): Promise<SessionUser> {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error('Authentication required.');
  }

  return session;
}

export async function requireRole(roles: UserRole | UserRole[]) {
  const session = await requireAuth();
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  if (!allowedRoles.includes(session.role)) {
    throw new Error('Insufficient role permissions.');
  }

  return session;
}

export async function requireMemberBReadAccess() {
  return requireRole(['Admin', 'Staff']);
}

export async function requireMemberBWriteAccess() {
  return requireRole('Admin');
}

export async function requireRecallImpactAccess() {
  return requireRole(['Admin', 'Staff']);
}

export async function loginUser(email: string, password: string) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required.');
  }

  const [rows] = await pool.execute<any>(
    `SELECT user_id, name, email, password_hash, role FROM app_user WHERE email = ? LIMIT 1`,
    [normalizedEmail]
  );

  const user = Array.isArray(rows) ? rows[0] : null;
  if (!user) {
    throw new Error('Invalid credentials.');
  }

  if (!isValidRole(user.role)) {
    throw new Error('Unsupported user role.');
  }

  if (!verifyPassword(password, user.password_hash)) {
    throw new Error('Invalid credentials.');
  }

  const sessionUser: SessionUser = {
    userId: Number(user.user_id),
    name: String(user.name),
    email: String(user.email),
    role: user.role,
  };

  await setSession(sessionUser);

  return {
    userId: sessionUser.userId,
    name: sessionUser.name,
    email: sessionUser.email,
    role: sessionUser.role,
  };
}

export async function logoutUser() {
  await clearSession();
  return { success: true };
}
