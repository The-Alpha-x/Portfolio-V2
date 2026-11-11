import { COLORS } from "@/lib/tokens";

/** Shared Scene 03 constants — camera, layout and palette. The animation stage should import from here. */
export const CAREER_COLORS = {
  crimson: COLORS.crimson,
  crimsonDeep: COLORS.crimsonDeep,
  metal: COLORS.metal,
  dark: "#141214",
  gunmetal: "#2a2628",
} as const;

/** Timeline layout (world units). Nodes sit on the X axis, centred on the origin. */
export const TIMELINE = {
  nodeSpacing: 6,
  y: 0,
  nodeRadius: 1.15,
} as const;

export const nodeX = (i: number, count: number) => (i - (count - 1) / 2) * TIMELINE.nodeSpacing;

/** Cinematic opening camera: low-left, 3/4 view on node 0 with the rest of the timeline receding to the right. */
export const CAREER_CAMERA = {
  position: [-9.5, 1.4, 7.5] as const,
  target: [-4.2, 0.1, 0] as const,
  fov: 42,
  mobile: { position: [-8.5, 1.2, 11] as const, target: [-3.2, -0.9, 0] as const, fov: 50 },
  /** Shared-canvas default (see PersistentCanvas) — restored when leaving the scene. */
  restore: { position: [0, 0, 6] as const, target: [0, 0, 0] as const, fov: 40 },
};

export interface CamPose { px: number; py: number; pz: number; tx: number; ty: number; tz: number; fov: number }

/** Wide establishing shot of the whole timeline. */
export const overviewPose = (mobile: boolean): CamPose =>
  mobile ? { px: 0, py: 3, pz: 30, tx: 0, ty: -0.6, tz: 0, fov: 56 } : { px: 0, py: 2.6, pz: 14, tx: 0, ty: 0, tz: 0, fov: 48 };

/** Close, 3/4 framing of node i (node sits left of centre so the info panel has room on the right). */
export function nodePose(i: number, count: number, mobile: boolean): CamPose {
  const b = mobile ? CAREER_CAMERA.mobile : CAREER_CAMERA;
  const dx = nodeX(i, count) - nodeX(0, count);
  return { px: b.position[0] + dx, py: b.position[1], pz: b.position[2], tx: b.target[0] + dx, ty: b.target[1], tz: b.target[2], fov: b.fov };
}
