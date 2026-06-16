import { NextResponse } from 'next/server';
import { verifyLogin, setAuthCookie } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = await verifyLogin(body.email, body.password);
  if (!email) {
    return NextResponse.json(
      { error: 'Nepareizs e-pasts vai parole' },
      { status: 401 }
    );
  }
  setAuthCookie(email);
  return NextResponse.json({ ok: true, email });
}
