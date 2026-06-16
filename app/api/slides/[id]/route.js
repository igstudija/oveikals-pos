import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getCollections } from '../../../../lib/mongodb';
import { isAuthed } from '../../../../lib/auth';
import { deleteFromBunny } from '../../../../lib/bunny';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Admin: update a slide (rename / toggle active)
export async function PATCH(req, { params }) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let id;
  try {
    id = new ObjectId(params.id);
  } catch {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const update = {};
  if (typeof body.name === 'string') update.name = body.name.trim();
  if (typeof body.active === 'boolean') update.active = body.active;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'nothing to update' }, { status: 400 });
  }

  const { slides } = await getCollections();
  await slides.updateOne({ _id: id }, { $set: update });
  return NextResponse.json({ ok: true });
}

// Admin: delete a slide and its image
export async function DELETE(req, { params }) {
  if (!isAuthed()) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let id;
  try {
    id = new ObjectId(params.id);
  } catch {
    return NextResponse.json({ error: 'bad id' }, { status: 400 });
  }

  const { slides, images } = await getCollections();
  const slide = await slides.findOne({ _id: id });
  if (slide?.imagePath) {
    await deleteFromBunny(slide.imagePath); // Bunny-stored image
  }
  if (slide?.imageId) {
    await images.deleteOne({ _id: slide.imageId }); // legacy MongoDB image
  }
  await slides.deleteOne({ _id: id });
  return NextResponse.json({ ok: true });
}
