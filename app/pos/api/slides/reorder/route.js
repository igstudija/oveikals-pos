import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollections } from '../../../../../lib/mongodb';
import { isAuthed } from '../../../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin: set new order from an array of slide ids
export async function POST(req) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'no ids' }, { status: 400 });
  }

  const { slides } = await getCollections();
  const ops = ids.map((id, index) => {
    let _id;
    try {
      _id = new ObjectId(id);
    } catch {
      return null;
    }
    return {
      updateOne: { filter: { _id }, update: { $set: { order: index + 1 } } },
    };
  }).filter(Boolean);

  if (ops.length) await slides.bulkWrite(ops);
  return NextResponse.json({ ok: true });
}
