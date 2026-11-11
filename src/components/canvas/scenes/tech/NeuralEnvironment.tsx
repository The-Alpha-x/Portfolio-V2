"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BACKDROP_PANELS, PANEL_DEPTH } from "@/data/neuralNetwork";
import { techState } from "@/lib/techState";
import { slotIdle } from "@/lib/sceneGate";
import { NEURAL_COLORS, type TechQuality } from "./techConfig";
import { mulberry32 } from "./neuralRouting";
import type { NeuralModel } from "./neuralModel";

const smooth = (x: number) => { const c = x < 0 ? 0 : x > 1 ? 1 : x; return c * c * (3 - 2 * c); };

function panelShape(w: number, h: number, seed: number) {
  const r = mulberry32(seed), c = 0.9 + r() * 0.8, hw = w / 2, hh = h / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw + c, -hh); s.lineTo(hw - c, -hh); s.lineTo(hw, -hh + c); s.lineTo(hw, hh - c * 1.6);
  s.lineTo(hw - c * 1.6, hh); s.lineTo(-hw + c, hh); s.lineTo(-hw, hh - c); s.lineTo(-hw, -hh + c);
  s.closePath();
  return s;
}

/**
 * Set-dressing that makes the network read as the inside of a machine: dark circuit panels layered behind it (the "exposed
 * motherboard"), IC packages with status LEDs, solder pads, a few floating components and faint holographic brackets that
 * frame each subsystem. Everything is instanced / merged and sits behind the node volume (z ≤ −5.6).
 */
export default function NeuralEnvironment({ model, q }: { model: NeuralModel; q: TechQuality }) {
  const panels = useMemo(() => BACKDROP_PANELS.slice(0, q.panels), [q.panels]);
  const geo = useMemo(() => {
    const cyl = new THREE.CylinderGeometry(0.075, 0.075, 0.04, 10); cyl.rotateX(Math.PI / 2);
    return {
      panels: panels.map((p) => new THREE.ExtrudeGeometry(panelShape(p.w, p.h, p.seed), { depth: PANEL_DEPTH, bevelEnabled: false })),
      box: new THREE.BoxGeometry(1, 1, 1),
      pad: cyl,
    };
  }, [panels]);
  const mats = useMemo(() => ({
    panel: new THREE.MeshStandardMaterial({ color: "#241d21", metalness: 0.3, roughness: 0.62 }),
    ic: new THREE.MeshStandardMaterial({ color: "#1a1417", metalness: 0.45, roughness: 0.45 }),
    led: new THREE.MeshBasicMaterial({ color: NEURAL_COLORS.crimson, toneMapped: false }),
    pad: new THREE.MeshBasicMaterial({ color: NEURAL_COLORS.crimsonDeep, toneMapped: false }),
    part: new THREE.MeshStandardMaterial({ color: "#2a2226", metalness: 0.5, roughness: 0.4 }),
  }), []);

  // faint brackets around each subsystem cluster
  const holo = useMemo(() => {
    const pos: number[] = [];
    const seg = (a: number[], b: number[]) => pos.push(...a, ...b);
    model.clusters.forEach((c) => {
      const L = 0.9, { min, max, z } = c;
      const corners: [number, number, number, number][] = [[min.x, min.y, 1, 1], [max.x, min.y, -1, 1], [max.x, max.y, -1, -1], [min.x, max.y, 1, -1]];
      corners.forEach(([x, y, dx, dy]) => { seg([x, y, z], [x + dx * L, y, z]); seg([x, y, z], [x, y + dy * L, z]); });
      for (let t = 0; t < 7; t++) { const x = min.x + L + ((max.x - min.x - 2 * L) * (t + 0.5)) / 7; seg([x, max.y, z], [x, max.y - (t % 2 ? 0.14 : 0.26), z]); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(pos.length), 3));
    return g;
  }, [model]);
  const holoMat = useMemo(() => new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), []);
  const SEG_PER = 8 + 7;

  const ics = useRef<THREE.InstancedMesh>(null);
  const leds = useRef<THREE.InstancedMesh>(null);
  const pads = useRef<THREE.InstancedMesh>(null);
  const parts = useRef<THREE.InstancedMesh>(null);
  const o = useMemo(() => new THREE.Object3D(), []);
  const c = useMemo(() => new THREE.Color(), []);
  const crimson = useMemo(() => new THREE.Color(NEURAL_COLORS.crimson), []);

  useEffect(() => () => {
    geo.panels.forEach((g) => g.dispose()); geo.box.dispose(); geo.pad.dispose();
    Object.values(mats).forEach((m) => m.dispose());
    holo.dispose(); holoMat.dispose();
  }, [geo, mats, holo, holoMat]);

  useFrame((s) => {
    if (techState.enter < 0.001 || slotIdle(4)) return;
    const G = techState.grow, time = techState.reduced ? 0 : s.clock.elapsedTime, fin = techState.final;

    model.ics.forEach((ic, i) => {
      const v = Math.max(0.0001, smooth((G[ic.group] - ic.at) / 0.12));
      o.rotation.set(0, 0, 0);
      o.position.copy(ic.pos); o.scale.set(ic.w * v, ic.h * v, 0.18 * v); o.updateMatrix();
      ics.current?.setMatrixAt(i, o.matrix);
      o.position.set(ic.pos.x + ic.w * 0.36, ic.pos.y + ic.h * 0.34, ic.pos.z + 0.1); o.scale.setScalar(0.13 * v); o.updateMatrix();
      leds.current?.setMatrixAt(i, o.matrix);
    });
    model.pads.forEach((p, i) => {
      const v = Math.max(0.0001, smooth((G[p.group] - p.at) / 0.1));
      o.rotation.set(0, 0, 0); o.position.copy(p.pos); o.scale.setScalar(v); o.updateMatrix();
      pads.current?.setMatrixAt(i, o.matrix);
    });
    model.floating.forEach((p, i) => {
      const v = Math.max(0.0001, smooth(techState.progress * 4 - 0.4));
      o.position.set(p.x, p.y + (techState.reduced ? 0 : Math.sin(time * 0.5 + i * 2.3) * 0.12), p.z);
      o.rotation.set(0.3, 0.5 + i, 0.2); o.scale.set(0.55 * v, 0.34 * v, 0.14 * v); o.updateMatrix();
      parts.current?.setMatrixAt(i, o.matrix);
    });
    for (const m of [ics.current, leds.current, pads.current, parts.current]) if (m) m.instanceMatrix.needsUpdate = true;

    const col = holo.attributes.color as THREE.BufferAttribute;
    model.clusters.forEach((cl, k) => {
      const v = smooth(G[cl.group] * 1.05) * (0.22 + 0.2 * fin) * (0.85 + 0.15 * Math.sin(time * 0.8 + k));
      c.copy(crimson).multiplyScalar(v);
      for (let j = 0; j < SEG_PER * 2; j++) col.setXYZ(k * SEG_PER * 2 + j, c.r, c.g, c.b);
    });
    col.needsUpdate = true;
  });

  return (
    <>
      {panels.map((p, i) => <mesh key={i} geometry={geo.panels[i]} material={mats.panel} position={[p.cx, p.cy, p.z]} />)}
      <instancedMesh ref={ics} args={[geo.box, mats.ic, Math.max(1, model.ics.length)]} frustumCulled={false} count={model.ics.length} />
      <instancedMesh ref={leds} args={[geo.box, mats.led, Math.max(1, model.ics.length)]} frustumCulled={false} count={model.ics.length} />
      <instancedMesh ref={pads} args={[geo.pad, mats.pad, Math.max(1, model.pads.length)]} frustumCulled={false} count={model.pads.length} />
      <instancedMesh ref={parts} args={[geo.box, mats.part, Math.max(1, model.floating.length)]} frustumCulled={false} count={model.floating.length} />
      <lineSegments geometry={holo} material={holoMat} frustumCulled={false} renderOrder={1} />
    </>
  );
}
