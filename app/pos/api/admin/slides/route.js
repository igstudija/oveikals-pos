import { NextResponse } from 'next/server';
import { getCollections } from '../../../../../lib/mongodb';
import { isAuthed } from '../../../../../lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin: list ALL slides (incl. inactive), ordered
export async function GET() {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { slides, settings } = await getCollections();
  const docs = await slides
    .find({})
    .sort({ order: 1, _id: 1 })
    .project({ data: 0 })
    .toArray();

  const setting = await settings.findOne({ _id: 'config' });

  return NextResponse.json({
    slides: docs.map((d) => ({
      id: d._id.toString(),
      name: d.name || '',
      active: d.active !== false,
      order: d.order ?? 0,
      imageUrl: d.imageUrl || null,
      imageId: d.imageId ? d.imageId.toString() : null, // legacy (MongoDB)
    })),
    intervalSec: setting?.intervalSec ?? 7,
  });
}
