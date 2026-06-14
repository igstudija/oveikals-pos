import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'pos_auth';

function getSecret() {
  // AUTH_SECRET signs the cookie; fall back to the password so it still works
  // if only ADMIN_PASSWORD is set.
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'change-me';
}

// Token proves the user knew the password, without storing the password itself.
export function makeToken() {
  return crypto
    .createHmac('sha256', getSecret())
    .update('oveikals-admin')
    .digest('hex');
}

export function checkPassword(input) {
  const expected = process.env.ADMIN_PASSWORD || '';
  if (!expected) return false;
  // constant-time compare
  const a = Buffer.from(String(input));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function setAuthCookie() {
  cookies().set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export function clearAuthCookie() {
  cookies().set(COOKIE_NAME, '', { path: '/', maxAge: 0 });
}

export function isAuthed() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return false;
  const expected = makeToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
