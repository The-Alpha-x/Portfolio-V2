import * as THREE from "three";

/**
 * Lazy, size-capped screenshot texture. The image is decoded off the main path, drawn once into a canvas no wider than
 * `maxW`, and uploaded as a mipmapped sRGB texture. Returns null if aborted. Caller disposes.
 */
export async function loadScaledTexture(src: string, maxW: number, signal: AbortSignal): Promise<THREE.CanvasTexture | null> {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  try { await img.decode(); } catch { return null; }
  if (signal.aborted) return null;
  const k = Math.min(1, maxW / img.naturalWidth);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(img.naturalWidth * k));
  c.height = Math.max(1, Math.round(img.naturalHeight * k));
  c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
