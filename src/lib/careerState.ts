import type { CareerSceneState } from "@/components/sections/career/career.types";

/** Scene 03 ↔ WebGL bridge. Written by CareerScrollController (GSAP), read in useFrame. Not React state. */
export const careerState: CareerSceneState = {
  enter: 0,
  progress: 0,
  active: 0,
  focus: [0, 0, 0],
  link: [0, 0],
  pulse: 0,
  arc: 0,
  cam: { px: 0, py: 2.6, pz: 14, tx: 0, ty: 0, tz: 0, fov: 48 },
  reduced: false,
};

export function resetCareerState() {
  Object.assign(careerState, { enter: 0, progress: 0, active: 0, pulse: 0, arc: 0, reduced: false });
  careerState.focus.fill(0);
  careerState.link.fill(0);
  Object.assign(careerState.cam, { px: 0, py: 2.6, pz: 14, tx: 0, ty: 0, tz: 0, fov: 48 });
}
