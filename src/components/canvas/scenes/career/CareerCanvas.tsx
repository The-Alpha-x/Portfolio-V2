"use client";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { careerState } from "@/lib/careerState";
import { sceneState } from "@/lib/sceneState";
import CareerEnvironment from "./CareerEnvironment";
import CareerTimeline from "./CareerTimeline";
import CareerParticles from "./CareerParticles";
import { useCareerAssets } from "./careerMaterials";
import { CAREER_CAMERA as CAM } from "./careerConfig";
import { QUALITY, useCareerTier } from "@/lib/careerTier";

const { damp, lerp, smoothstep } = THREE.MathUtils;
const FOG = { near: 9, far: 48 }; // deeper than the shared 8–24 so the vault recedes instead of vanishing; restored on exit
const SMOOTH = 10; // light follow on top of GSAP's scrub smoothing → no camera jumps
/** Test switch (off by default): add ?career3d to the URL (or NEXT_PUBLIC_CAREER_DEBUG=1) to force the career group visible
 *  regardless of `careerState.enter` / the active scene, with the career camera, and log its state once a second. */
export const careerDebug = () =>
  process.env.NEXT_PUBLIC_CAREER_DEBUG === "1" || (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("career3d"));

/**
 * Scene 03 3D layer — inside the persistent canvas (no second canvas).
 * Camera ownership: GSAP (CareerScrollController) writes `careerState.cam`; this component is the ONLY writer of the
 * Three.js camera while the scene is entering/active, blending from/to the shared default by `careerState.enter`.
 */
export default function CareerCanvas() {
  const gl = useThree((s) => s.gl);
  const tier = useCareerTier();
  const q = QUALITY[tier === "lite" ? "lite" : "full"];
  const root = useRef<THREE.Group>(null);
  const look = useRef(new THREE.Vector3(...CAM.restore.target));
  const fogBase = useRef<{ near: number; far: number } | null>(null);
  const dbg = useRef({ on: false, t: 0 });

  useEffect(() => { dbg.current.on = careerDebug(); }, []);

  const assets = useCareerAssets(gl);

  useFrame((state, dt) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const debug = dbg.current.on;
    const enter = debug ? 1 : careerState.enter;
    const on = enter > 0.001;
    if (debug && (dbg.current.t += dt) > 1) {
      dbg.current.t = 0;
      console.info("[career3d]", { activeScene: sceneState.active, enter: careerState.enter, groupVisible: root.current?.visible, cam: camera.position.toArray().map((n) => +n.toFixed(2)), fov: +camera.fov.toFixed(1), fog: (state.scene.fog as THREE.Fog | null)?.far });
    }

    // Transition: the About tunnel dissolves into darkness (fog "curtain" closes, enter 0→0.3), the career set is switched on
    // behind it, then the curtain opens onto the career fog (enter 0.3→1). Continuous at both ends → no pop, no jump.
    const fog = state.scene.fog as THREE.Fog | null;
    if (fog) {
      if (on && !fogBase.current) fogBase.current = { near: fog.near, far: fog.far };
      if (fogBase.current) {
        const open = smoothstep(enter, 0.3, 1);
        const cur = smoothstep(enter, 0, 0.3) * (1 - smoothstep(enter, 0.3, 0.8));
        fog.near = lerp(lerp(fogBase.current.near, FOG.near, open), 1, cur);
        fog.far = lerp(lerp(fogBase.current.far, FOG.far, open), 6, cur);
        if (!on) fogBase.current = null;
      }
    }
    if (root.current) root.current.visible = enter > 0.25; // switched on while the curtain is (almost) closed

    const R = CAM.restore;
    const atRest =
      Math.abs(camera.position.x - R.position[0]) + Math.abs(camera.position.y - R.position[1]) + Math.abs(camera.position.z - R.position[2]) < 0.01 &&
      Math.abs(camera.fov - R.fov) < 0.01;
    if (!on && atRest) return; // nothing to do — leave the camera to the other scenes

    const e = smoothstep(enter, 0.3, 1); // camera starts moving only once the curtain is closed
    const c = careerState.cam;
    const a = careerState.arc;
    const wx = lerp(R.position[0], c.px, e);
    const wy = lerp(R.position[1], c.py + a * 0.9, e);
    const wz = lerp(R.position[2], c.pz + a * 1.6, e);
    const k = SMOOTH;

    camera.position.set(damp(camera.position.x, wx, k, dt), damp(camera.position.y, wy, k, dt), damp(camera.position.z, wz, k, dt));
    look.current.set(
      damp(look.current.x, lerp(R.target[0], c.tx, e), k, dt),
      damp(look.current.y, lerp(R.target[1], c.ty, e), k, dt),
      damp(look.current.z, lerp(R.target[2], c.tz, e), k, dt)
    );
    camera.lookAt(look.current);
    const fov = damp(camera.fov, lerp(R.fov, c.fov + a * 3, e), k, dt);
    if (Math.abs(fov - camera.fov) > 0.001) { camera.fov = fov; camera.updateProjectionMatrix(); }
  });

  return (
    <group ref={root} name="career-scene" visible={false}>
      {assets && (
        <>
          <CareerEnvironment mats={assets.mats} q={q} env={assets.env.texture} />
          <CareerTimeline mats={assets.mats} q={q} />
          <CareerParticles count={q.particles} />
        </>
      )}
    </group>
  );
}
