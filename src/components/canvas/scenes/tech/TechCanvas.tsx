"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { techState } from "@/lib/techState";
import { useCareerTier } from "@/lib/careerTier";
import NeuralNetworkScene from "./NeuralNetworkScene";
import { FOG, TECH_FOV, TECH_ORIGIN, TECH_QUALITY } from "./techConfig";

const { lerp, smoothstep, clamp, degToRad } = THREE.MathUtils;
const [OX, OY, OZ] = TECH_ORIGIN;

/**
 * Camera + fog owner for Scene 05 while `enter > 0`. SET, never damped — earlier scenes may write in the same frame; Scene 06's rig
 * is mounted after this one and wins when it is active. Mounted before the content so it runs first.
 *
 * The pose comes from `techState.view` (a framing box, see PHASE_VIEWS): the distance is solved so the box fits the part of the
 * screen not covered by the HTML interface, whatever the viewport aspect, so no hand-tuned per-device camera numbers.
 */
function TechRig() {
  const from = useRef<{ p: THREE.Vector3; t: THREE.Vector3; fov: number } | null>(null);
  const fog = useRef<{ near: number; far: number } | null>(null);
  const tmp = useMemo(() => ({ look: new THREE.Vector3(), pos: new THREE.Vector3(), dir: new THREE.Vector3(), right: new THREE.Vector3() }), []);

  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const f = state.scene.fog as THREE.Fog | null;
    if (techState.enter < 0.001) {
      if (from.current) { from.current = null; if (f && fog.current) { f.near = fog.current.near; f.far = fog.current.far; } fog.current = null; }
      return;
    }
    if (!from.current) {
      const d = new THREE.Vector3(); camera.getWorldDirection(d);
      from.current = { p: camera.position.clone(), t: camera.position.clone().addScaledVector(d, 10), fov: camera.fov };
      if (f) fog.current = { near: f.near, far: f.far };
    }

    // ── fit the framing box into the free screen area (right of the interface) ──
    const v = techState.view, W = state.size.width, H = state.size.height, aspect = W / H;
    const pad = clamp(W * 0.04, 20, 64);
    const left = clamp((Math.min(384, W * 0.34) + pad) / W + 0.01, 0.2, 0.5);
    const right = (W >= 1100 ? Math.min(280, W * 0.22) * 0.4 : 0) / W + pad / W;
    const fc = (left + (1 - right)) / 2; // where the content centre should sit on screen (0–1)
    const fw = (1 - right - left) * 0.96, fh = 0.74;
    const tan = Math.tan(degToRad(TECH_FOV) / 2);
    const dist = Math.max(v.w / (fw * 2 * tan * aspect), v.h / (fh * 2 * tan));
    const drift = techState.reduced ? 0 : Math.sin(state.clock.elapsedTime * 0.15) * 0.012;
    const yaw = v.yaw + drift, pitch = v.pitch;
    tmp.dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    tmp.right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    const shift = (fc - 0.5) * 2 * dist * tan * aspect;
    tmp.look.set(OX + v.x, OY + v.y, OZ + v.z).addScaledVector(tmp.right, -shift);
    tmp.pos.copy(tmp.look).addScaledVector(tmp.dir, dist);
    techState.logoScale = clamp(dist / 20, 1, 1.35);

    const e = smoothstep(techState.enter, 0, 1), fr = from.current;
    camera.position.set(lerp(fr.p.x, tmp.pos.x, e), lerp(fr.p.y, tmp.pos.y, e), lerp(fr.p.z, tmp.pos.z, e));
    camera.lookAt(lerp(fr.t.x, tmp.look.x, e), lerp(fr.t.y, tmp.look.y, e), lerp(fr.t.z, tmp.look.z, e));
    const fov = lerp(fr.fov, TECH_FOV, e);
    if (Math.abs(fov - camera.fov) > 0.001) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (f && fog.current) { f.near = lerp(fog.current.near, FOG.near, e); f.far = lerp(fog.current.far, FOG.far, e); }
  });
  return null;
}

/** Scene 05 3D layer — persistent canvas slot 4 (no second canvas). Entry point lazy-loaded by canvas/scenes/index.tsx. */
export default function TechCanvas() {
  const tier = useCareerTier();
  const q = TECH_QUALITY[tier === "lite" ? "lite" : "full"];
  const root = useRef<THREE.Group>(null);
  useFrame(() => { if (root.current) root.current.visible = techState.enter > 0.001; });
  return (
    <group ref={root} name="tech-scene" visible={false} position={[OX, OY, OZ]}>
      <TechRig />
      <NeuralNetworkScene q={q} />
    </group>
  );
}
