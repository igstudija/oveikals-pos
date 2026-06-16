import { ObjectId } from 'mongodb';
import { getCollections } from '../../../../../lib/mongodb';

export const runtime = 'nodejs';

// Public: serve image binary by id. Images are immutable so cache hard.
export async function GET(req, { params }) {
  let id;
  try {
    id = new ObjectId(params.id);
  } catch {
    return new Response('bad id', { status: 400 });
  }

  const { images } = await getCollections();
  const img = await images.findOne({ _id: id });
  if (!img) {
    return new Response('not found', { status: 404 });
  }

  const buf = img.data?.buffer ? Buffer.from(img.data.buffer) : Buffer.from(img.data);

  return new Response(buf, {
    headers: {
      'Content-Type': img.contentType || 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
