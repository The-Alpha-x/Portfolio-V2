import { COLORS } from "@/lib/tokens";

/** Far below the Tech arsenal (−170); fog hides the gap. */
export const CONNECT_ORIGIN = [0, -260, 0] as const;
export const CONNECT_FOG = { on: { near: 9, far: 40 }, dark: { near: 3, far: 12 } } as const;

export interface ConnectQuality { pillars: number; torusSeg: number; tube: number; dust: number }
export const CONNECT_QUALITY: Record<"full" | "lite", ConnectQuality> = {
  full: { pillars: 20, torusSeg: 96, tube: 12, dust: 160 },
  lite: { pillars: 10, torusSeg: 48, tube: 8, dust: 60 },
};

export const CONNECT_COLORS = { crimson: COLORS.crimson, deep: COLORS.crimsonDeep, metal: "#1f1b1d", metalLit: COLORS.metal } as const;

/** Portrait artwork (shared with Scene 01 → same cached texture, no second upload). */
export const PORTRAIT_SRC = { desktop: "/images/hero/final-portrait-1080p.webp", mobile: "/images/hero/final-portrait-720p.webp" } as const;
export const PORTRAIT_ASPECT = 0.701; // 1080 × 1440
export const EYE_UV: [number, number] = [0.597, 0.664]; // cybernetic eye (measured on the artwork, same as Scene 01)
export const PORTRAIT_DIST = 9; // must equal CAM_FINAL.pz (portrait plane is at z = 0)

/** Concentric machinery rings: radius · tube · tilt (x, z) · spin speed */
export const RINGS = [
  { r: 2.0, tube: 0.06, tilt: [1.15, 0.2], speed: 0.5 },
  { r: 2.9, tube: 0.05, tilt: [0.35, -0.25], speed: -0.34 },
  { r: 3.8, tube: 0.07, tilt: [-0.5, 0.3], speed: 0.24 },
  { r: 5.0, tube: 0.09, tilt: [0.1, 0.05], speed: -0.16 },
] as const;
