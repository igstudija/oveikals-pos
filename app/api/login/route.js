import { NextResponse } from 'next/server';
import { checkPassword, setAuthCookie } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  if (!checkPassword(body.password)) {
    return NextResponse.json({ error: 'Nepareiza parole' }, { status: 401 });
  }
  setAuthCookie();
  return NextResponse.json({ ok: true });
}
