import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createResetToken, isAllowedEmail } from '../../../../../lib/auth';
import { sendResetEmail } from '../../../../../lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '/pos';

function originFromRequest() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const h = headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();

  // Only send for allowed admins, but always answer the same way so the
  // endpoint can't be used to probe which emails exist.
  if (isAllowedEmail(email)) {
    try {
      const token = await createResetToken(email);
      if (token) {
        const url = `${originFromRequest()}${BASE}/admin/reset?token=${token}`;
        await sendResetEmail(email, url);
      }
    } catch (e) {
      console.error('Reset email failed:', e);
      return NextResponse.json(
        { error: 'Neizdevās nosūtīt e-pastu. Mēģini vēlreiz.' },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
