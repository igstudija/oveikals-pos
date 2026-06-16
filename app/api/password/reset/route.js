import { NextResponse } from 'next/server';
import {
  peekResetToken,
  consumeResetToken,
  setUserPassword,
  setAuthCookie,
} from '../../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: check whether a token is still valid (for the reset page to show a form).
export async function GET(req) {
  const token = new URL(req.url).searchParams.get('token');
  const email = await peekResetToken(token);
  if (!email) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  return NextResponse.json({ valid: true, email });
}

// POST: set the new password using a valid token, then log the user in.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const token = body.token;
  const password = String(body.password || '');

  if (password.length < 8) {
    return NextResponse.json(
      { error: 'Parolei jābūt vismaz 8 simbolus garai' },
      { status: 400 }
    );
  }

  const email = await consumeResetToken(token);
  if (!email) {
    return NextResponse.json(
      { error: 'Saite ir nederīga vai novecojusi' },
      { status: 400 }
    );
  }

  await setUserPassword(email, password);
  setAuthCookie(email);
  return NextResponse.json({ ok: true, email });
}
