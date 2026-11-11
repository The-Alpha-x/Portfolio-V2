"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { careerState } from "@/lib/careerState";
import * as THREE from "three";
import type { CareerMaterials } from "./careerMaterials";
import type { CareerQuality } from "@/lib/careerTier";
import { slotIdle } from "@/lib/sceneGate";

interface Props {
  from: number; // x of start
  to: number; // x of end
  mats: CareerMaterials;
  y?: number;
  /** Index into careerState.link (0..1 energised fill, growing from the `from` end). Omit for static end-rails. */
  link?: number;
  q?: CareerQuality;
}

/** Metallic twin rails with a thin crimson light core and spaced collars, running along X between two nodes. */
export default function TimelineConnection({ from, to, mats, y = 0, link, q }: Props) {
  const len = Math.abs(to - from);
  const lite = !!q && q.segments < 1;
  const mid = (from + to) / 2;
  const geo = useMemo(() => {
    const rail = new THREE.CylinderGeometry(0.035, 0.035, len, lite ? 6 : 8);
    const core = new THREE.CylinderGeometry(0.014, 0.014, len, 6);
    const collar = new THREE.CylinderGeometry(0.075, 0.075, 0.12, lite ? 8 : 12);
    return { rail, core, collar };
  }, [len, lite]);
  // dispose on unmount / change
  useDispose(geo);

  const fill = useRef<THREE.Mesh>(null);
  const own = useMemo(() => {
    const base = mats.crimson.clone();
    base.emissiveIntensity = 0.25;
    const lit = mats.crimson.clone();
    lit.emissiveIntensity = 2.6;
    return { base, lit };
  }, [mats]);
  useEffect(() => () => { own.base.dispose(); own.lit.dispose(); }, [own]);
  const fillGeo = useMemo(() => new THREE.CylinderGeometry(0.024, 0.024, len, 6), [len]);
  useEffect(() => () => fillGeo.dispose(), [fillGeo]);

  // Energy packets that travel along the lit part of the rail (the rail "carries current" once energised).
  const PACKETS = lite ? 1 : 3;
  const packets = useRef<(THREE.Mesh | null)[]>([]);
  const packetGeo = useMemo(() => new THREE.SphereGeometry(0.06, 8, 6), []);
  useEffect(() => () => packetGeo.dispose(), [packetGeo]);

  useFrame((s, dt) => {
    const m = fill.current;
    if (!m || link === undefined || careerState.enter < 0.001 || slotIdle(2)) return;
    const v = THREE.MathUtils.damp(m.scale.y, Math.max(0.0001, careerState.link[link] ?? 0), 10, dt);
    m.scale.y = v;
    m.visible = v > 0.002;
    m.position.y = (len / 2) * (1 - v); // group is rotated: local +Y = world −X, so the fill grows from the `from` end
    const run = v > 0.04 && !careerState.reduced;
    packets.current.forEach((p, j) => {
      if (!p) return;
      p.visible = run;
      if (!run) return;
      const u = (s.clock.elapsedTime * 0.35 + j / PACKETS) % 1;
      p.position.y = len / 2 - u * len * Math.min(1, v);
      p.scale.setScalar(0.4 + 1.2 * Math.sin(Math.PI * u));
    });
  });

  const collars = (lite ? [0] : [-0.25, 0, 0.25]).map((k) => k * len);
  return (
    <group position={[mid, y, 0]} rotation={[0, 0, Math.PI / 2]} name="timeline-connection">
      <mesh geometry={geo.core} material={own.base} />
      {link !== undefined && Array.from({ length: PACKETS }, (_, j) => (
        <mesh key={j} ref={(p) => { packets.current[j] = p; }} geometry={packetGeo} material={own.lit} visible={false} />
      ))}
      {link !== undefined && <mesh ref={fill} geometry={fillGeo} material={own.lit} scale={[1, 0.0001, 1]} visible={false} />}
      <mesh geometry={geo.rail} material={mats.metal} position={[0, 0, 0.1]} />
      <mesh geometry={geo.rail} material={mats.metal} position={[0, 0, -0.1]} />
      {collars.map((c) => (
        <group key={c} position={[c, 0, 0]}>
          <mesh geometry={geo.collar} material={mats.darkMetal} position={[0, 0, 0.1]} />
          <mesh geometry={geo.collar} material={mats.darkMetal} position={[0, 0, -0.1]} />
        </group>
      ))}
    </group>
  );
}

function useDispose(geo: Record<string, THREE.BufferGeometry>) {
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
}
