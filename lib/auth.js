import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getCollections } from './mongodb';

const COOKIE_NAME = 'pos_auth';

function getSecret() {
  // AUTH_SECRET signs the session cookie + reset tokens.
  return process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD || 'change-me';
}

// Emails allowed to have an admin account. Configurable via ADMIN_EMAILS
// (comma-separated); defaults to the two known admins.
export function getAllowedEmails() {
  const raw =
    process.env.ADMIN_EMAILS ||
    'evelina.abele@orkla.lv,artis@codars.com';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isAllowedEmail(email) {
  return getAllowedEmails().includes(normalizeEmail(email));
}

// ---------- Password hashing (scrypt, no external deps) ----------

export function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(plain), salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(plain, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  const actual = crypto.scryptSync(String(plain), salt, expected.length);
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

// ---------- User store ----------

// Make sure the allowed admins exist. New accounts get the initial password
// from ADMIN_PASSWORD (if set) so the team can log in before using reset.
export async function ensureSeedUsers() {
  const { users } = await getCollections();
  const initial = process.env.ADMIN_PASSWORD || '';
  for (const email of getAllowedEmails()) {
    const setOnInsert = { _id: email, createdAt: new Date() };
    if (initial) setOnInsert.passwordHash = hashPassword(initial);
    await users.updateOne(
      { _id: email },
      { $setOnInsert: setOnInsert },
      { upsert: true }
    );
  }
}

export async function getUser(email) {
  const { users } = await getCollections();
  return users.findOne({ _id: normalizeEmail(email) });
}

export async function setUserPassword(email, plain) {
  const { users } = await getCollections();
  await users.updateOne(
    { _id: normalizeEmail(email) },
    { $set: { passwordHash: hashPassword(plain), updatedAt: new Date() } },
    { upsert: true }
  );
}

// Returns the normalized email on success, or null.
export async function verifyLogin(email, password) {
  const normalized = normalizeEmail(email);
  if (!isAllowedEmail(normalized)) return null;
  await ensureSeedUsers();
  const user = await getUser(normalized);
  if (!user || !user.passwordHash) return null;
  return verifyPassword(password, user.passwordHash) ? normalized : null;
}

// ---------- Session cookie ----------

function tokenFor(email) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`session:${normalizeEmail(email)}`)
    .digest('hex');
}

export function setAuthCookie(email) {
  const value = `${normalizeEmail(email)}|${tokenFor(email)}`;
  cookies().set(COOKIE_NAME, value, {
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

// Returns the logged-in email, or null.
export function getSessionEmail() {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw || !raw.includes('|')) return null;
  const idx = raw.lastIndexOf('|');
  const email = raw.slice(0, idx);
  const token = raw.slice(idx + 1);
  const expected = tokenFor(email);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return isAllowedEmail(email) ? email : null;
}

export function isAuthed() {
  return getSessionEmail() !== null;
}

// ---------- Password reset tokens ----------

function hashToken(rawToken) {
  return crypto
    .createHmac('sha256', getSecret())
    .update(`reset:${rawToken}`)
    .digest('hex');
}

// Creates a one-time reset token for an allowed email. Returns the raw token
// (to put in the email link), or null if the email isn't allowed.
export async function createResetToken(email) {
  const normalized = normalizeEmail(email);
  if (!isAllowedEmail(normalized)) return null;
  await ensureSeedUsers();
  const { passwordResets } = await getCollections();
  const raw = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  // Replace any previous token for this email.
  await passwordResets.deleteMany({ email: normalized });
  await passwordResets.insertOne({
    email: normalized,
    tokenHash: hashToken(raw),
    expiresAt,
    createdAt: new Date(),
  });
  return raw;
}

// Validates a raw reset token. Returns the email or null. Does not consume.
export async function peekResetToken(rawToken) {
  if (!rawToken) return null;
  const { passwordResets } = await getCollections();
  const doc = await passwordResets.findOne({ tokenHash: hashToken(rawToken) });
  if (!doc) return null;
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
    await passwordResets.deleteOne({ _id: doc._id });
    return null;
  }
  return doc.email;
}

// Validates and consumes a reset token, returning the email or null.
export async function consumeResetToken(rawToken) {
  if (!rawToken) return null;
  const { passwordResets } = await getCollections();
  const doc = await passwordResets.findOne({ tokenHash: hashToken(rawToken) });
  if (!doc) return null;
  await passwordResets.deleteOne({ _id: doc._id });
  if (doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now()) {
    return null;
  }
  return doc.email;
}
