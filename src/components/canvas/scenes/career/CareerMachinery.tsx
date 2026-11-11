"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { careerState } from "@/lib/careerState";
import { CAREER } from "@/data/career";
import type { CareerQuality } from "@/lib/careerTier";
import type { CareerMaterials } from "./careerMaterials";
import Instances, { type Inst } from "./Instances";
import { nodeX } from "./careerConfig";
import { slotIdle } from "@/lib/sceneGate";

const FLOOR = -6;
const RAIL_Y = -1.9;

/**
 * Mechanical structures that complement the timeline:
 *  – a service gantry under the nodes (twin rails, support pylons, indicator lights) with a carriage that slides to
 *    whichever node the camera is focused on,
 *  – a large ring assembly behind each node whose rotation is scrubbed by scroll progress and whose glow follows the
 *    node's activation (careerState.focus).
 * Everything here is gated on careerState.enter (no work while hidden) and static under reduced motion.
 */
export default function CareerMachinery({ mats, q }: { mats: CareerMaterials; q: CareerQuality }) {
  const count = CAREER.length;
  const lite = q.detail < 1;
  const carriage = useRef<THREE.Group>(null);
  const rings = useRef<(THREE.Group | null)[]>([]);

  const own = useMemo(() => Array.from({ length: count }, () => { const m = mats.crimsonDim.clone(); m.emissiveIntensity = 0.25; return m; }), [mats, count]);
  const strip = useMemo(() => { const m = mats.crimson.clone(); m.emissiveIntensity = 0.8; return m; }, [mats]);
  const lamp = useMemo(() => { const m = mats.crimson.clone(); m.emissiveIntensity = 0.9; return m; }, [mats]);
  const geo = useMemo(() => ({
    box: new THREE.BoxGeometry(1, 1, 1),
    ring: new THREE.TorusGeometry(3.4, 0.05, 8, lite ? 48 : 96),
    ringOuter: new THREE.TorusGeometry(4.5, 0.03, 6, lite ? 48 : 120),
    tick: new THREE.BoxGeometry(0.06, 0.28, 0.06),
  }), [lite]);
  useEffect(() => () => { own.forEach((m) => m.dispose()); lamp.dispose(); strip.dispose(); Object.values(geo).forEach((g) => g.dispose()); }, [own, lamp, strip, geo]);

  const L = useMemo(() => {
    const px = Array.from({ length: 7 }, (_, k) => -18 + k * 6);
    const pylons: Inst[] = px.map((x) => ({ p: [x, (FLOOR + RAIL_Y - 0.2) / 2, 0], s: [0.38, RAIL_Y - 0.2 - FLOOR, 0.38] }));
    const lamps: Inst[] = px.map((x) => ({ p: [x, RAIL_Y - 0.55, 0.22], s: [0.09, 0.09, 0.09] }));
    // the five light strips that gathered into the timeline path at the end of the About corridor (x offsets ×0.5)
    const bundle: Inst[] = [-0.55, -0.275, 0, 0.275, 0.55].map((z) => ({ p: [0, RAIL_Y + 0.02, z], s: [44, 0.035, 0.035] }));
    const rails: Inst[] = [{ p: [0, RAIL_Y - 0.2, 0], s: [44, 0.2, 1.3] }];
    const ticks: Inst[] = lite ? [] : Array.from({ length: 28 }, (_, k) => {
      const a = (k / 28) * Math.PI * 2;
      return { p: [Math.cos(a) * 3.95, Math.sin(a) * 3.95, 0], r: [0, 0, a - Math.PI / 2], s: k % 7 === 0 ? [1.6, 1.6, 1.6] : [1, 1, 1] } as Inst;
    });
    return { pylons, lamps, rails, bundle, ticks };
  }, [lite]);

  useFrame((st, dt) => {
    if (careerState.enter < 0.001 || slotIdle(2)) return;
    const t = st.clock.elapsedTime;
    const live = careerState.reduced ? 0 : 1;
    // carriage follows the focused node (node x = camera target x − 1.8 in the career rig)
    if (carriage.current) {
      const tx = careerState.cam.tx - 1.8;
      carriage.current.position.x = THREE.MathUtils.damp(carriage.current.position.x, tx, 4, dt);
    }
    for (let i = 0; i < count; i++) {
      const g = rings.current[i];
      if (!g) continue;
      const dir = i % 2 ? -1 : 1;
      g.rotation.z = dir * (careerState.progress * Math.PI * 2.2 + t * 0.03 * live) + i;
      own[i].emissiveIntensity = THREE.MathUtils.damp(own[i].emissiveIntensity, 0.22 + 1.1 * (careerState.focus[i] ?? 0), 6, dt);
    }
  });

  return (
    <group name="career-machinery">
      <Instances geo={geo.box} mat={mats.darkMetal} items={L.pylons} />
      <Instances geo={geo.box} mat={mats.metal} items={L.rails} />
      <Instances geo={geo.box} mat={strip} items={L.bundle} />
      <Instances geo={geo.box} mat={lamp} items={L.lamps} />
      <group ref={carriage} position={[nodeX(0, count), RAIL_Y + 0.22, 0]}>
        <mesh geometry={geo.box} material={mats.darkMetal} scale={[1.5, 0.22, 1.1]} />
        <mesh geometry={geo.box} material={own[0]} scale={[0.7, 0.04, 0.9]} position={[0, 0.13, 0]} />
      </group>

      {Array.from({ length: count }, (_, i) => (
        <group key={i} ref={(el) => { rings.current[i] = el; }} position={[nodeX(i, count), 0, -3.8]}>
          <mesh geometry={geo.ring} material={own[i]} />
          {!lite && <mesh geometry={geo.ringOuter} material={mats.metal} />}
          {!lite && <Instances geo={geo.tick} mat={mats.metal} items={L.ticks} />}
        </group>
      ))}
    </group>
  );
}
