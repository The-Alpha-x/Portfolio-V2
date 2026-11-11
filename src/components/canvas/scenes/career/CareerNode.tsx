"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { careerState } from "@/lib/careerState";
import type { CareerMaterials } from "./careerMaterials";
import { CAREER_COLORS as C, TIMELINE } from "./careerConfig";
import type { CareerQuality } from "@/lib/careerTier";
import { slotIdle } from "@/lib/sceneGate";
import { makeSoftSprite } from "./careerTextures";

interface Props {
  index: number;
  position: [number, number, number];
  mats: CareerMaterials;
  q: CareerQuality;
}

/** One career stop: outer mechanical rings, crimson emissive core, tick marks and left/right connection points. */
export default function CareerNode({ index, position, mats, q }: Props) {
  const R = TIMELINE.nodeRadius;
  const TICKS = q.ticks;
  const sg = (n: number) => Math.max(8, Math.round(n * q.segments));
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const root = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const focus = useRef(careerState.focus[index] ?? 0);
  const core = useRef<THREE.Mesh>(null);
  const shock = useRef<THREE.Mesh>(null);
  const sparks = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const fx = useRef({ prev: 0, shockT: 9 }); // arrival shockwave timer

  // Per-node emissive materials (shared ones would light every node at once). Cloned once, disposed on unmount.
  const own = useMemo(() => {
    const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false } as const;
    const sprite = makeSoftSprite();
    return {
      core: mats.crimson.clone(), ring: mats.crimsonDim.clone(), sprite,
      shock: new THREE.MeshBasicMaterial({ color: C.crimson, opacity: 0, ...additive }),
      glow: new THREE.MeshBasicMaterial({ color: C.crimson, map: sprite, opacity: 0.1, ...additive }),
    };
  }, [mats]);
  useEffect(() => () => { own.core.dispose(); own.ring.dispose(); own.shock.dispose(); own.glow.dispose(); own.sprite.dispose(); }, [own]);
  const SPARKS = q.segments < 1 ? 3 : 6;

  const geo = useMemo(
    () => ({
      core: new THREE.CylinderGeometry(R * 0.42, R * 0.42, 0.22, 40),
      coreRim: new THREE.TorusGeometry(R * 0.44, 0.04, 8, sg(48)),
      plate: new THREE.CylinderGeometry(R * 0.78, R * 0.78, 0.14, sg(48)),
      ringOuter: new THREE.TorusGeometry(R, 0.075, 10, sg(72)),
      ringMid: new THREE.TorusGeometry(R * 0.86, 0.035, 8, sg(72)),
      halo: new THREE.TorusGeometry(R * 1.2, 0.02, 6, sg(96)),
      tick: new THREE.BoxGeometry(0.05, 0.16, 0.05),
      port: new THREE.CylinderGeometry(0.09, 0.09, 0.22, 10),
      portCap: new THREE.SphereGeometry(0.07, 8, 6),
      shock: new THREE.RingGeometry(R * 0.96, R, sg(72)),
      spark: new THREE.SphereGeometry(0.05, 8, 6),
      glow: new THREE.PlaneGeometry(R * 6, R * 6),
    }),
    [R, q.segments]
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  const ticks = useMemo(
    () =>
      Array.from({ length: TICKS }, (_, i) => {
        const a = (i / TICKS) * Math.PI * 2;
        return { a, x: Math.cos(a) * R * 0.93, y: Math.sin(a) * R * 0.93, lit: i % (TICKS / 4) === 0 };
      }),
    [R, TICKS]
  );

  // Counter-rotating rings + core/light, all scaled by the GSAP-written activation value.
  useFrame((s, dt) => {
    if (careerState.enter < 0.001 || slotIdle(2)) return; // scene hidden → no per-frame work
    // Activation 0..1 written by GSAP (careerState.focus[index]); light damping only, GSAP owns the timing.
    const f = (focus.current = THREE.MathUtils.damp(focus.current, careerState.focus[index] ?? 0, 10, dt));
    const rm = careerState.reduced ? 0 : 1; // reduced motion: no idle spin
    if (outer.current) outer.current.rotation.z += dt * (0.05 + 0.25 * f) * rm;
    if (inner.current) inner.current.rotation.z -= dt * (0.1 + 0.6 * f) * rm;
    const t = s.clock.elapsedTime;
    // Feeling: a dormant core idles with a faint uneven flicker; an active one has a double-beat heartbeat.
    const idle = (1 - f) * 0.1 * Math.sin(t * 6.1 + index * 2.3) * rm;
    const b = Math.sin(t * 3.4);
    const beat = f > 0.05 ? (Math.pow(Math.max(0, b), 8) + 0.55 * Math.pow(Math.max(0, Math.sin(t * 3.4 - 1)), 8)) * f * rm : 0;
    own.core.emissiveIntensity = 0.45 + 2.9 * f + idle * 0.5 + 1.1 * beat;
    own.ring.emissiveIntensity = 0.2 + 1.3 * f + idle * 0.3 + 0.4 * beat;
    if (root.current) root.current.scale.setScalar(1 + 0.07 * f);
    if (core.current) core.current.scale.setScalar(1 + 0.09 * beat);
    // Arrival shockwave: one expanding ring when this node becomes the focus.
    const x = fx.current;
    if (f > 0.6 && x.prev <= 0.6 && !careerState.reduced) x.shockT = 0;
    x.prev = f;
    if (shock.current) {
      x.shockT += dt;
      const k = Math.min(1, x.shockT / 1.7), vis = k < 1;
      shock.current.visible = vis;
      if (vis) { shock.current.scale.setScalar(0.7 + 1.9 * (1 - Math.pow(1 - k, 3))); own.shock.opacity = 0.75 * Math.pow(1 - k, 2); }
    }
    // Soft bloom behind the node grows with focus and kicks with the heartbeat.
    own.glow.opacity = 0.07 + 0.38 * f + 0.2 * beat;
    // Orbiting sparks appear around the active core.
    if (sparks.current) { sparks.current.visible = f > 0.05; sparks.current.scale.setScalar(0.6 + 0.4 * f); sparks.current.rotation.z += dt * 0.9 * f * rm; }
    if (halo.current) { halo.current.visible = f > 0.01; halo.current.scale.setScalar(0.92 + 0.08 * f); }
    if (q.nodeLights && light.current) light.current.intensity = (1.2 + 5 * f) * (1 + Math.sin(s.clock.elapsedTime * 1.3 + index) * 0.06);
  });

  // Disc axes: cylinders default to Y; rotate so their axis faces the camera (+Z).
  return (
    <group ref={root} position={position} name={`career-node-${index}`}>
      {/* selection halo (visible only while focused) */}
      <mesh ref={halo} geometry={geo.halo} material={own.core} visible={false} />
      {/* back plate */}
      <mesh geometry={geo.plate} material={mats.darkMetal} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.1]} />
      {/* crimson core */}
      <mesh ref={core} geometry={geo.core} material={own.core} rotation={[Math.PI / 2, 0, 0]} />
      {/* soft bloom, arrival shockwave, orbiting sparks */}
      <mesh ref={glow} geometry={geo.glow} material={own.glow} position={[0, 0, -0.35]} renderOrder={-1} />
      <mesh ref={shock} geometry={geo.shock} material={own.shock} position={[0, 0, 0.05]} visible={false} />
      <group ref={sparks} rotation={[1.05, 0.35, 0]} visible={false}>
        {Array.from({ length: SPARKS }, (_, k) => {
          const a = (k / SPARKS) * Math.PI * 2;
          return <mesh key={k} geometry={geo.spark} material={own.core} position={[Math.cos(a) * R * 1.3, Math.sin(a) * R * 1.3, 0]} />;
        })}
      </group>
      <mesh geometry={geo.coreRim} material={mats.metal} position={[0, 0, 0.1]} />
      {/* rotating mid ring with ticks */}
      <group ref={inner}>
        <mesh geometry={geo.ringMid} material={own.ring} />
        {ticks.map((t) => (
          <mesh
            key={t.a}
            geometry={geo.tick}
            material={t.lit ? own.core : mats.metal}
            position={[t.x, t.y, 0]}
            rotation={[0, 0, t.a - Math.PI / 2]}
          />
        ))}
      </group>
      {/* outer structural ring */}
      <group ref={outer}>
        <mesh geometry={geo.ringOuter} material={mats.metal} />
      </group>
      {/* connection points (left / right) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (R + 0.08), 0, 0]}>
          <mesh geometry={geo.port} material={mats.darkMetal} rotation={[0, 0, Math.PI / 2]} />
          <mesh geometry={geo.portCap} material={own.ring} position={[s * 0.12, 0, 0]} />
        </group>
      ))}
      {q.nodeLights && <pointLight ref={light} color={C.crimson} intensity={3} distance={6} decay={2} position={[0, 0, 0.9]} />}
    </group>
  );
}
