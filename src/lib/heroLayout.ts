/**
 * Hero portrait fitting — pure maths (no three.js, no DOM) so it is unit-testable and shared by the scene and the QA harness.
 * All values in CSS pixels, measured from the top of the viewport.
 *
 * Portrait artwork anatomy (fractions of image height, measured from the 1080×1440 source):
 *   hair top ≈ .03 · chin ≈ .55 · neck/collar ≈ .62 · chest below can sit under the (shaded) text.
 */
export const IMG_ASPECT = 0.75;
export const FACE_TOP = 0.03;
export const FACE_BOTTOM = 0.62;
/** fixed header height below 1024px (matches --nav-h = 4.5rem) */
export const NAV_PX = 72;

export interface PortraitFit {
  /** image height / width in px */
  Hpx: number;
  Wpx: number;
  /** y of the image centre, px from viewport top */
  centerPx: number;
  /** y of the top of the face band / the bottom of it (collar), px */
  faceTopPx: number;
  faceBottomPx: number;
  /** y where the text stack begins, px */
  textTopPx: number;
}

/**
 * Portrait screens: fit the face (top 3–62 % of the artwork) into the band between the header and the text stack.
 * The artwork is much wider than the face, so on narrow screens the sides are cropped (up to 35 % wider than the viewport).
 */
export function fitPortrait(w: number, h: number, textH: number): PortraitFit {
  const top = NAV_PX + 4;
  const textTopPx = h - (textH || h * 0.34);
  const bottom = textTopPx - 6;
  const band = Math.max(bottom - top, h * 0.3);
  const Hpx = Math.min(band / (FACE_BOTTOM - FACE_TOP), (1.35 * w) / IMG_ASPECT, h * 1.05);
  const faceBand = (FACE_BOTTOM - FACE_TOP) * Hpx;
  const imgTop = top + (band - faceBand) / 2 - FACE_TOP * Hpx; // face centred in the band
  return {
    Hpx,
    Wpx: Hpx * IMG_ASPECT,
    centerPx: imgTop + Hpx / 2,
    faceTopPx: imgTop + FACE_TOP * Hpx,
    faceBottomPx: imgTop + FACE_BOTTOM * Hpx,
    textTopPx,
  };
}
