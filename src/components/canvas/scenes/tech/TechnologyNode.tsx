"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TECHNOLOGIES, TECH_COUNT } from "@/data/technologies";
import { getLogo } from "@/components/sections/tech/techIcons";
import { techState } from "@/lib/techState";
import { slotIdle } from "@/lib/sceneGate";
import { LOGO_LIFT, NEURAL_COLORS, PLATE, TECH_ORIGIN } from "./techConfig";
import { rasterizeLogo } from "./logoTexture";
import type { NeuralModel } from "./neuralModel";

const METAL = new THREE.Color(NEURAL_COLORS.metal);
const DEEP = new THREE.Color(NEURAL_COLORS.crimsonDeep);
const RED = new THREE.Color(NEURAL_COLORS.crimson);
const HOT = new THREE.Color(NEURAL_COLORS.hot);
const WHITE = new THREE.Color("#ffffff");

/** Square frame (outer 1×1, `t` thick) as a flat mesh. */
function squareOutline(t: number) {
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.5); s.lineTo(0.5, -0.5); s.lineTo(0.5, 0.5); s.lineTo(-0.5, 0.5); s.closePath();
  const i = 0.5 - t, h = new THREE.Path();
  h.moveTo(-i, -i); h.lineTo(-i, i); h.lineTo(i, i); h.lineTo(i, -i); h.closePath();
  s.holes.push(h);
  return new THREE.ShapeGeometry(s);
}

/**
 * The 20 technology nodes. Each is a physical chip lying on its circuit layer, a short stem, and a floating logo plate that faces
 * the camera. Chips / pads / plates / frames are instanced (4 draw calls); logos are individually textured planes (20).
 */
export default function TechnologyNode({ model }: { model: NeuralModel }) {
  const chips = useRef<THREE.InstancedMesh>(null);
  const pads = useRef<THREE.InstancedMesh>(null);
  const plates = useRef<THREE.InstancedMesh>(null);
  const frames = useRef<THREE.InstancedMesh>(null);
  const logoMeshes = useRef<(THREE.Mesh | null)[]>([]);
  const logoMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const [tex, setTex] = useState<(THREE.CanvasTexture | null)[]>([]);

  const geo = useMemo(() => ({
    chip: new THREE.BoxGeometry(0.72, 0.12, 0.72),
    pad: new THREE.BoxGeometry(0.92, 0.02, 0.92),
    plane: new THREE.PlaneGeometry(1, 1),
    frame: squareOutline(0.045),
  }), []);
  const mats = useMemo(() => ({
    chip: new THREE.MeshStandardMaterial({ color: NEURAL_COLORS.steel, metalness: 0.5, roughness: 0.4 }),
    pad: new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    plate: new THREE.MeshBasicMaterial({ color: NEURAL_COLORS.surface, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }),
    frame: new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, depthWrite: false, toneMapped: false }),
  }), []);
  const brand = useMemo(() => TECHNOLOGIES.map((t) => new THREE.Color(t.brand).lerp(WHITE, 0.16)), []);
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), c: new THREE.Color(), v: new THREE.Vector3(), origin: new THREE.Vector3(...TECH_ORIGIN) }), []);

  useEffect(() => () => {
    geo.chip.dispose(); geo.pad.dispose(); geo.plane.dispose(); geo.frame.dispose();
    mats.chip.dispose(); mats.pad.dispose(); mats.plate.dispose(); mats.frame.dispose();
  }, [geo, mats]);

  // Authentic logos: the same react-icons components the HTML interface uses, rasterised to textures (tinted per node).
  useEffect(() => {
    let dead = false;
    const made: THREE.CanvasTexture[] = [];
    Promise.all(TECHNOLOGIES.map((t) => rasterizeLogo(getLogo(t.icon), 160))).then((r) => {
      if (dead) { r.forEach((x) => x?.dispose()); return; }
      r.forEach((x) => x && made.push(x));
      setTex(r);
    });
    return () => { dead = true; made.forEach((x) => x.dispose()); };
  }, []);

  useFrame((s) => {
    if (techState.enter < 0.001 || slotIdle(4)) return;
    const { rt } = model;
    const cam = s.camera as THREE.PerspectiveCamera;
    const time = techState.reduced ? 0 : s.clock.elapsedTime;
    const fin = techState.final;
    const lsc = techState.logoScale;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);

    for (let i = 0; i < TECH_COUNT; i++) {
      const ni = model.techNode[i];
      const n = model.nodes[ni];
      const vis = rt.nodeVis[ni];
      const f = rt.techFocus[i];
      const sv = Math.max(0.0001, vis);
      const bob = techState.reduced ? 0 : Math.sin(time * 0.7 + i * 1.7) * 0.05;

      // chip + pad (lie flat on the layer)
      tmp.o.quaternion.identity();
      tmp.o.position.copy(n.pos);
      tmp.o.scale.set(sv, sv, sv);
      tmp.o.updateMatrix();
      chips.current?.setMatrixAt(i, tmp.o.matrix);
      tmp.o.position.y -= 0.06;
      tmp.o.updateMatrix();
      pads.current?.setMatrixAt(i, tmp.o.matrix);
      tmp.c.copy(DEEP).multiplyScalar(0.55 + 0.4 * fin).lerp(RED, Math.min(1, f * 1.1));
      pads.current?.setColorAt(i, tmp.c);

      // floating logo group (billboard)
      const sc = lsc * (1 + 0.16 * f) * sv;
      tmp.o.position.set(n.pos.x, n.pos.y + LOGO_LIFT + bob, n.pos.z);
      tmp.o.quaternion.copy(cam.quaternion);
      tmp.o.scale.set(PLATE * sc, PLATE * sc, 1);
      tmp.o.updateMatrix();
      plates.current?.setMatrixAt(i, tmp.o.matrix);
      tmp.o.scale.set((PLATE + 0.05) * sc, (PLATE + 0.05) * sc, 1);
      tmp.o.updateMatrix();
      frames.current?.setMatrixAt(i, tmp.o.matrix);
      tmp.c.copy(DEEP).multiplyScalar(0.9 + 0.5 * fin).lerp(HOT, Math.min(1, f * 1.15));
      frames.current?.setColorAt(i, tmp.c);

      const lm = logoMeshes.current[i], mat = logoMats.current[i];
      if (lm && mat) {
        const dim = 1 - 0.5 * rt.dim * (1 - Math.min(1, f * 1.7));
        lm.visible = vis > 0.01;
        lm.position.set(n.pos.x, n.pos.y + LOGO_LIFT + bob, n.pos.z);
        lm.quaternion.copy(cam.quaternion);
        lm.scale.setScalar(PLATE * 0.6 * sc);
        mat.color.copy(METAL).lerp(brand[i], 0.55 + 0.45 * Math.min(1, f * 1.3));
        mat.opacity = vis * dim;
      }

      // projection for the HTML hotspot layer (centre + diameter in CSS px)
      tmp.v.set(n.pos.x, n.pos.y + LOGO_LIFT + bob, n.pos.z).add(tmp.origin);
      const dist = cam.position.distanceTo(tmp.v);
      tmp.v.project(cam);
      const sp = techState.screen[i];
      sp.x = tmp.v.x; sp.y = tmp.v.y;
      sp.d = (PLATE * lsc * (1 + 0.16 * f) * s.size.height) / (2 * tanHalf * Math.max(dist, 0.1));
      sp.on = vis > 0.7 && tmp.v.z < 1 ? 1 : 0;
    }
    for (const m of [chips.current, pads.current, plates.current, frames.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={chips} args={[geo.chip, mats.chip, TECH_COUNT]} frustumCulled={false} />
      <instancedMesh ref={pads} args={[geo.pad, mats.pad, TECH_COUNT]} frustumCulled={false} />
      <instancedMesh ref={plates} args={[geo.plane, mats.plate, TECH_COUNT]} frustumCulled={false} renderOrder={3} />
      <instancedMesh ref={frames} args={[geo.frame, mats.frame, TECH_COUNT]} frustumCulled={false} renderOrder={4} />
      {TECHNOLOGIES.map((t, i) => tex[i] && (
        <mesh key={t.id} ref={(m) => { logoMeshes.current[i] = m; }} geometry={geo.plane} visible={false} renderOrder={5} frustumCulled={false}>
          <meshBasicMaterial ref={(m) => { logoMats.current[i] = m; }} map={tex[i]} color={NEURAL_COLORS.metal} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
