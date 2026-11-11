import type { CamPose } from "../career/careerConfig";
import { PROJECTS } from "@/data/projects";

/** The lab is built far below the career set so the two scenes never overlap (fog hides the gap). */
export const ARCHIVE_ORIGIN = [0, -80, 0] as const;
export const SPACING = 8.5;
const N = PROJECTS.length;

/** Platform centre in LOCAL archive space (zig-zag in depth so the camera path curves). */
export const platformLocal = (i: number): [number, number, number] => [
  (i - (N - 1) / 2) * SPACING,
  PROJECTS[i].kind === "featured" ? 0 : 0.45,
  i % 2 === 0 ? 0 : -2.4,
];
export const platformScale = (i: number) => (PROJECTS[i].kind === "featured" ? 1 : 0.72);

/** Camera pose framing platform i; the platform sits left of centre so the info panel has room on the right. */
export function projectPose(i: number): CamPose {
  const [x, y, z] = platformLocal(i);
  const s = platformScale(i);
  const [ox, oy, oz] = ARCHIVE_ORIGIN;
  return {
    px: ox + x - 2.4, py: oy + y + 2.3, pz: oz + z + 7.2 + 3.2 * s,
    tx: ox + x + 1.7, ty: oy + y + 1.2, tz: oz + z, fov: 42,
  };
}

export const ARCHIVE_COLORS = { crimson: "#ff2638", crimsonDeep: "#9d1826", metal: "#c1b9b8", dark: "#141214" } as const;

/** 3D budget per tier. */
export interface ArchiveQuality { particles: number; segments: number; backdrops: number; fillLight: boolean; grid: boolean; float: boolean }
export const ARCHIVE_QUALITY: Record<"full" | "lite", ArchiveQuality> = {
  full: { particles: 260, segments: 1, backdrops: 4, fillLight: true, grid: true, float: true },
  lite: { particles: 90, segments: 0.5, backdrops: 2, fillLight: false, grid: false, float: false },
};
/** Screenshot textures are downscaled to this width before upload (VRAM). */
export const TEXTURE_MAX_W = { full: 1280, lite: 768 } as const;
