"use client";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { connectState } from "@/lib/connectState";
import { slotIdle } from "@/lib/sceneGate";
import { CONNECT_COLORS as COL, RINGS, type ConnectQuality } from "./connectConfig";

const { smoothstep } = THREE.MathUtils;
const FLOOR_Y = -4;

/**
 * The machine chamber that powers down: concentric rings, a core, a ring of pillars with light strips, a floor plate.
 * `connectState.power` dims the lights/emissives (with a short electrical sputter), `connectState.dark` fades the whole
 * set out (material opacity; the rig also closes the fog). Spin is integrated from `power`, so the rings wind down to a stop.
 */
export default function ConnectEnvironment({ q }: { q: ConnectQuality }) {
  const root = useRef<THREE.Group>(null);
  const core = useRef<THREE.Mesh>(null);
  const ringRefs = useRef<(THREE.Group | null)[]>([]);
  const light = useRef<THREE.PointLight>(null);
  const pillarMesh = useRef<THREE.InstancedMesh>(null);
  const stripMesh = useRef<THREE.InstancedMesh>(null);
  const spin = useRef(0);

  const mats = useMemo(
    () => ({
      metal: new THREE.MeshStandardMaterial({ color: COL.metal, metalness: 0.85, roughness: 0.4, emissive: COL.deep, emissiveIntensity: 0.5, transparent: true }),
      glow: new THREE.MeshBasicMaterial({ color: COL.crimson, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    }),
    []
  );
  useEffect(() => () => { mats.metal.dispose(); mats.glow.dispose(); }, [mats]);

  const pillars = useMemo(
    () =>
      Array.from({ length: q.pillars }, (_, i) => ({
        a: (i / q.pillars) * Math.PI * 2 + 0.13,
        r: 8.2 + (i % 3) * 0.9,
        h: 5 + ((i * 7) % 5) * 1.3,
      })),
    [q.pillars]
  );

  useLayoutEffect(() => {
    const pm = pillarMesh.current, sm = stripMesh.current;
    if (!pm || !sm) return;
    const o = new THREE.Object3D();
    pillars.forEach((p, i) => {
      o.rotation.set(0, -p.a + Math.PI / 2, 0);
      o.position.set(Math.cos(p.a) * p.r, FLOOR_Y + p.h / 2, Math.sin(p.a) * p.r);
      o.scale.set(1, p.h, 1);
      o.updateMatrix();
      pm.setMatrixAt(i, o.matrix);
      // light strip on the face that looks at the core
      o.position.set(Math.cos(p.a) * (p.r - 0.47), FLOOR_Y + p.h / 2, Math.sin(p.a) * (p.r - 0.47));
      o.scale.set(1, p.h * 0.82, 1);
      o.updateMatrix();
      sm.setMatrixAt(i, o.matrix);
    });
    pm.instanceMatrix.needsUpdate = true;
    sm.instanceMatrix.needsUpdate = true;
  }, [pillars]);

  useFrame((state, dt) => {
    const g = root.current;
    if (!g) return;
    const fade = 1 - smoothstep(connectState.dark, 0.5, 1);
    const show = connectState.enter > 0.001 && fade > 0.003;
    g.visible = show;
    if (!show || slotIdle(5)) return;

    const reduced = connectState.reduced;
    const t = reduced ? 0 : state.clock.elapsedTime;
    const p = connectState.power;
    // brief electrical sputter while the power is draining
    const flick = !reduced && p > 0.04 && p < 0.92 ? 0.18 * Math.max(0, Math.sin(t * 41) * Math.sin(t * 17 + 1)) : 0;
    const pw = Math.max(0, p - flick);
    if (!reduced) spin.current += dt * p;

    mats.metal.opacity = fade;
    mats.metal.transparent = fade < 0.999;
    mats.metal.emissiveIntensity = 0.5 * pw;
    mats.glow.opacity = fade * (0.1 + 0.9 * pw);
    if (light.current) light.current.intensity = 45 * pw * fade;
    if (core.current) {
      core.current.scale.setScalar(0.55 + 0.45 * pw);
      core.current.rotation.y = spin.current * 0.8;
      core.current.rotation.x = spin.current * 0.5;
    }
    ringRefs.current.forEach((r, i) => {
      if (r) r.rotation.y = spin.current * RINGS[i].speed;
    });
  });

  return (
    <group ref={root} visible={false}>
      <pointLight ref={light} position={[0, 0.5, 0]} color={COL.crimson} intensity={45} distance={18} decay={2} />

      {/* core */}
      <mesh ref={core} material={mats.glow}>
        <icosahedronGeometry args={[0.55, 1]} />
      </mesh>

      {/* rings: a metal band + a thin neon line each */}
      {RINGS.map((r, i) => (
        <group key={i} rotation={[r.tilt[0], 0, r.tilt[1]]}>
          <group ref={(el) => { ringRefs.current[i] = el; }}>
            <mesh material={mats.metal}>
              <torusGeometry args={[r.r, r.tube, q.tube, q.torusSeg]} />
            </mesh>
            <mesh material={mats.glow}>
              <torusGeometry args={[r.r, 0.014, 6, q.torusSeg]} />
            </mesh>
          </group>
        </group>
      ))}

      {/* chamber pillars + their light strips */}
      <instancedMesh ref={pillarMesh} args={[undefined, undefined, q.pillars]} material={mats.metal} frustumCulled={false}>
        <boxGeometry args={[0.9, 1, 0.9]} />
      </instancedMesh>
      <instancedMesh ref={stripMesh} args={[undefined, undefined, q.pillars]} material={mats.glow} frustumCulled={false}>
        <boxGeometry args={[0.05, 1, 0.05]} />
      </instancedMesh>

      {/* floor plate with three etched rings */}
      <mesh position={[0, FLOOR_Y - 0.1, 0]} material={mats.metal}>
        <cylinderGeometry args={[11, 11, 0.2, q.torusSeg]} />
      </mesh>
      {[3, 6, 9].map((r) => (
        <mesh key={r} position={[0, FLOOR_Y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.glow}>
          <ringGeometry args={[r - 0.02, r + 0.02, q.torusSeg]} />
        </mesh>
      ))}
    </group>
  );
}
