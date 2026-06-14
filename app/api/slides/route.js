import { NextResponse } from 'next/server';
import { ObjectId, Binary } from 'mongodb';
import { getCollections } from '../../../lib/mongodb';
import { isAuthed } from '../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public: list of active slides (ordered) + interval setting
export async function GET() {
  const { slides, settings } = await getCollections();
  const docs = await slides
    .find({ active: { $ne: false } })
    .sort({ order: 1, _id: 1 })
    .project({ data: 0 })
    .toArray();

  const setting = await settings.findOne({ _id: 'config' });
  const intervalSec = setting?.intervalSec ?? 7;

  const list = docs.map((d) => ({
    id: d._id.toString(),
    name: d.name || '',
    imageId: d.imageId ? d.imageId.toString() : null,
  }));

  return NextResponse.json(
    { slides: list, intervalSec },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

// Admin: list all slides (incl. inactive) when ?all=1
export async function POST(req) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { slides, images } = await getCollections();
  const form = await req.formData();
  const file = form.get('file');
  const name = (form.get('name') || '').toString().trim();

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'no file' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = file.type || 'image/png';

  const imageDoc = await images.insertOne({
    data: new Binary(buffer),
    contentType,
    createdAt: new Date(),
  });

  // place new slide at the end
  const last = await slides
    .find({})
    .sort({ order: -1 })
    .limit(1)
    .project({ order: 1 })
    .toArray();
  const nextOrder = (last[0]?.order ?? 0) + 1;

  const slideDoc = await slides.insertOne({
    name: name || file.name || 'Slaids',
    imageId: imageDoc.insertedId,
    active: true,
    order: nextOrder,
    createdAt: new Date(),
  });

  return NextResponse.json({ id: slideDoc.insertedId.toString() });
}
