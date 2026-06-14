import { NextResponse } from 'next/server';
import { getCollections } from '../../../lib/mongodb';
import { isAuthed } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  let intervalSec = Number(body.intervalSec);
  if (!Number.isFinite(intervalSec)) intervalSec = 7;
  intervalSec = Math.min(120, Math.max(2, Math.round(intervalSec)));

  const { settings } = await getCollections();
  await settings.updateOne(
    { _id: 'config' },
    { $set: { intervalSec } },
    { upsert: true }
  );
  return NextResponse.json({ ok: true, intervalSec });
}
