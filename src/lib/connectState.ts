/**
 * Scene 06 ↔ WebGL bridge. GSAP writes, useFrame reads. Not React state.
 * Camera values are LOCAL to the scene origin (the canvas layer adds the origin).
 */
export interface ConnectCam { px: number; py: number; pz: number; tx: number; ty: number; tz: number; fov: number }

/** Inside the (still powered) machine chamber, slightly off-axis. */
export const CAM_START: ConnectCam = { px: -5, py: 2.6, pz: 11.5, tx: 0, ty: 0, tz: 0, fov: 42 };
/** Straight-on. The portrait plane sits at z = 0, DIST units away — the layout maths in ConnectPortrait depends on this. */
export const CAM_FINAL: ConnectCam = { px: 0, py: 0, pz: 9, tx: 0, ty: 0, tz: 0, fov: 42 };

export interface ConnectSceneState {
  enter: number; // 0..1 blend from Scene 05's camera into this scene
  power: number; // 1 = machinery fully lit → 0 = dead
  dark: number; // 0..1 environment fades into darkness
  portrait: number; // 0..1 portrait reveal (light spreading from the eye)
  eye: number; // 0..1 eye glow
  reduced: boolean;
  cam: ConnectCam;
}

export const connectState: ConnectSceneState = { enter: 0, power: 1, dark: 0, portrait: 0, eye: 0, reduced: false, cam: { ...CAM_START } };

export function resetConnectState() {
  Object.assign(connectState, { enter: 0, power: 1, dark: 0, portrait: 0, eye: 0, reduced: false });
  Object.assign(connectState.cam, CAM_START);
}

/** The finished composition (also what reduced-motion users get). */
export function applyConnectFinal() {
  Object.assign(connectState, { power: 0, dark: 1, portrait: 1, eye: 1 });
  Object.assign(connectState.cam, CAM_FINAL);
}
