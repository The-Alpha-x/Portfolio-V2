/**
 * Scene 02 ↔ WebGL bridge. Written by ScrollTrigger (AboutSection), read in useFrame (AboutScene).
 * Mutable on purpose — never put these in React state.
 *
 * Scene 03 (career timeline) can read this too: `exit` reaches 1 when the corridor has
 * become the timeline path, and `release` fades Scene 02's 3D out as the next scene arrives.
 */
export const aboutState = {
  enter: 0, // 0..1  section approaching → pinned (corridor fades in, camera pre-roll)
  progress: 0, // 0..1  through the pinned section (camera travel, content timeline)
  release: 0, // 0..1  pinned section leaving (everything fades out)
  reduced: false, // prefers-reduced-motion: static camera, no morph
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Corridor → timeline-path morph. 0 until 80 % of the pinned section, 1 at the end. */
export const aboutExit = () => (aboutState.reduced ? 0 : smooth(0.8, 1.0, aboutState.progress));
