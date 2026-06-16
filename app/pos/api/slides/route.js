import { NextResponse } from 'next/server';
import { getCollections } from '../../../../lib/mongodb';
import { isAuthed } from '../../../../lib/auth';
import { uploadToBunny } from '../../../../lib/bunny';
import { imageSize } from '../../../../lib/imagesize';
import { aspectOk, ASPECT_LABEL } from '../../../../lib/aspect';

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
    imageUrl: d.imageUrl || null,
    imageId: d.imageId ? d.imageId.toString() : null, // legacy (MongoDB)
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

  const { slides } = await getCollections();
  const form = await req.formData();
  const file = form.get('file');
  const name = (form.get('name') || '').toString().trim();

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'no file' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = file.type || 'image/png';

  // Enforce the required aspect ratio (proportion only, any size).
  const size = imageSize(buffer);
  if (!size) {
    return NextResponse.json(
      { error: 'Neizdevās nolasīt attēla izmēru. Atļauti: PNG, JPG, WEBP, GIF.' },
      { status: 400 }
    );
  }
  if (!aspectOk(size.width, size.height)) {
    return NextResponse.json(
      {
        error: `Nepareizas proporcijas (${size.width}×${size.height}). Vajadzīgs ${ASPECT_LABEL} formāts.`,
      },
      { status: 400 }
    );
  }

  // Store the image in BunnyCDN; serve it from the linked Pull Zone.
  let uploaded;
  try {
    uploaded = await uploadToBunny(buffer, { filename: file.name, contentType });
  } catch (e) {
    console.error('Bunny upload error:', e);
    return NextResponse.json(
      { error: 'Neizdevās augšupielādēt attēlu' },
      { status: 502 }
    );
  }

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
    imageUrl: uploaded.url,
    imagePath: uploaded.path,
    active: true,
    order: nextOrder,
    createdAt: new Date(),
  });

  return NextResponse.json({ id: slideDoc.insertedId.toString() });
}
