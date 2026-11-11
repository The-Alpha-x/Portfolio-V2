"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { connectState } from "@/lib/connectState";
import { useCareerTier } from "@/lib/careerTier";
import ConnectEnvironment from "./ConnectEnvironment";
import ConnectPortrait from "./ConnectPortrait";
import ConnectEmbers from "./ConnectEmbers";
import { CONNECT_FOG, CONNECT_ORIGIN, CONNECT_QUALITY, type ConnectQuality } from "./connectConfig";

const { lerp, smoothstep } = THREE.MathUtils;
const [OX, OY, OZ] = CONNECT_ORIGIN;

/**
 * Camera + fog owner for Scene 06 while `enter > 0` (SET, never damped — Scene 05 writes earlier in the same frame; this
 * rig is mounted after it, so it wins). It blends from the pose captured at entry (through fog-dark empty space) to
 * `connectState.cam`. Fog first captures/restores the previous scene's, then closes toward black as `dark` rises.
 */
function ConnectRig() {
  const from = useRef<{ p: THREE.Vector3; t: THREE.Vector3; fov: number } | null>(null);
  const fog = useRef<{ near: number; far: number } | null>(null);
  const look = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const f = state.scene.fog as THREE.Fog | null;
    if (connectState.enter < 0.001) {
      if (from.current) {
        from.current = null;
        if (f && fog.current) { f.near = fog.current.near; f.far = fog.current.far; }
        fog.current = null;
      }
      return;
    }
    if (!from.current) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      from.current = { p: camera.position.clone(), t: camera.position.clone().addScaledVector(dir, 10), fov: camera.fov };
      if (f) fog.current = { near: f.near, far: f.far };
    }
    const e = smoothstep(connectState.enter, 0, 1), c = connectState.cam, fr = from.current;
    camera.position.set(lerp(fr.p.x, OX + c.px, e), lerp(fr.p.y, OY + c.py, e), lerp(fr.p.z, OZ + c.pz, e));
    look.set(lerp(fr.t.x, OX + c.tx, e), lerp(fr.t.y, OY + c.ty, e), lerp(fr.t.z, OZ + c.tz, e));
    camera.lookAt(look);
    const fov = lerp(fr.fov, c.fov, e);
    if (Math.abs(fov - camera.fov) > 0.001) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (f && fog.current) {
      const d = smoothstep(connectState.dark, 0, 1);
      f.near = lerp(lerp(fog.current.near, CONNECT_FOG.on.near, e), CONNECT_FOG.dark.near, d);
      f.far = lerp(lerp(fog.current.far, CONNECT_FOG.on.far, e), CONNECT_FOG.dark.far, d);
    }
  });
  return null;
}

function ConnectScene({ q }: { q: ConnectQuality }) {
  const root = useRef<THREE.Group>(null);
  useFrame(() => { if (root.current) root.current.visible = connectState.enter > 0.001; });
  return (
    <group ref={root} name="connect-scene" visible={false} position={[...CONNECT_ORIGIN]}>
      <ConnectRig />
      <ConnectEnvironment q={q} />
      <ConnectPortrait />
      <ConnectEmbers count={q.dust} />
    </group>
  );
}

/** Scene 06 3D layer — persistent canvas slot 5 (no second canvas). On the "list" tier (mobile / no WebGL / low power) it renders nothing; the DOM shows a static portrait instead. */
export default function ConnectCanvas() {
  const tier = useCareerTier();
  if (tier === "list") return null;
  return <ConnectScene q={CONNECT_QUALITY[tier === "lite" ? "lite" : "full"]} />;
}
