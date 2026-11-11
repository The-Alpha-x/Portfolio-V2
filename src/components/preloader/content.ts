import { HERO } from "@/components/sections/hero/content";

/** All pre-loader copy in one place. The name is read from the hero so the two can never drift. */
export const PRELOADER = {
  brand: "CRIMSON PROTOCOL",
  kicker: "SYSTEM INITIALIZATION",
  statusLabel: "SYSTEM STATUS:",
  statusValue: "OPERATIONAL",
  welcome: "WELCOME, HUMAN.",
  name: HERO.name,
  skip: "SKIP INTRO",
} as const;

/** `at` = displayed progress (0..1) at which the line is revealed. */
export const BOOT_LINES = [
  { id: "interface", label: "HUMAN INTERFACE", status: "READY", at: 0.2 },
  { id: "neural", label: "NEURAL NETWORK", status: "READY", at: 0.45 },
  { id: "visual", label: "VISUAL ENGINE", status: "READY", at: 0.7 },
  { id: "creative", label: "CREATIVE CORE", status: "ONLINE", at: 0.92 },
] as const;

/** Same files and breakpoint as HeroScene / the <link rel="preload"> tags in layout.tsx. */
export const PORTRAIT = {
  desktop: "/images/hero/portrait-1080.webp",
  mobile: "/images/hero/portrait-720.webp",
  mobileQuery: "(max-width: 767px)",
  /** Cybernetic eye in image space (x from left, y from TOP). HeroScene's EYE_UV is y-from-bottom: 0.664 → 0.336. */
  eye: { x: 0.597, y: 0.336 },
  zoom: 3.6,
} as const;

/** Stall guard for individual assets, and the absolute ceiling for the whole sequence. Neither fakes progress. */
export const LIMITS = { assetStallMs: 10_000, hardCeilingMs: 16_000 } as const;

/** Slow / data-saving connections never wait the full desktop budget: the page is released sooner and the 3D layer streams in behind it. */
export function limits() {
  const c = (typeof navigator !== "undefined" ? (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection : undefined);
  const slow = !!c && (c.saveData || /(^|-)[23]g$/.test(c.effectiveType ?? ""));
  return slow ? { assetStallMs: 5_000, hardCeilingMs: 8_000 } : LIMITS;
}
