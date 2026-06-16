// Required image aspect ratio for slides. Existing slides are 4:3 (1024×768).
// "Only proportion" — any pixel size is fine as long as the ratio matches,
// within a small tolerance so near-4:3 images aren't rejected.
export const ASPECT = { w: 4, h: 3, tolerance: 0.05 };
export const ASPECT_LABEL = `${ASPECT.w}:${ASPECT.h}`;

// True if width/height is close enough to the required ratio.
export function aspectOk(width, height) {
  if (!width || !height) return false;
  const target = ASPECT.w / ASPECT.h;
  const ratio = width / height;
  return Math.abs(ratio - target) / target <= ASPECT.tolerance;
}
