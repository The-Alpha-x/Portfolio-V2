"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { techState } from "@/lib/techState";
import { slotIdle } from "@/lib/sceneGate";
import { LOGO_LIFT, NEURAL_COLORS, TECH_FOV, TECH_ORIGIN } from "./techConfig";
import { HALO_FRAG, HALO_VERT } from "./neuralShaders";
import type { NeuralModel } from "./neuralModel";

const CORE_R = { root: 0.26, hub: 0.2, relay: 0.1, via: 0.055, tech: 0 } as const;
const HALO_R = { root: 1.5, hub: 1.1, relay: 0.55, via: 0, tech: 0 } as const;
const DEEP = new THREE.Color(NEURAL_COLORS.crimsonDeep);
const RED = new THREE.Color(NEURAL_COLORS.crimson);
const HOT = new THREE.Color(NEURAL_COLORS.hot);

/**
 * The structural nodes of the network — root, trunk relays, one processor-like hub per category, and small vias at the bends of long
 * traces — plus the soft halo sprites for every node (struct + technology). Hubs also publish their screen position so the HTML
 * layer can label them.
 */
export default function NeuralNode({ model, halos = true }: { model: NeuralModel; halos?: boolean }) {
  const struct = useMemo(() => model.nodes.map((n, i) => ({ n, i })).filter((x) => x.n.kind !== "tech"), [model]);
  const bodies = useMemo(() => struct.filter((x) => x.n.kind === "hub" || x.n.kind === "root"), [struct]);
  const haloList = useMemo(() => [...struct.filter((x) => x.n.kind !== "via"), ...model.techNode.map((i) => ({ n: model.nodes[i], i }))], [struct, model]);

  const core = useRef<THREE.InstancedMesh>(null);
  const body = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => ({ core: new THREE.IcosahedronGeometry(1, 1), body: new THREE.BoxGeometry(0.64, 0.16, 0.64) }), []);
  const mats = useMemo(() => ({
    core: new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false }),
    body: new THREE.MeshStandardMaterial({ color: NEURAL_COLORS.steel, metalness: 0.5, roughness: 0.42 }),
    halo: new THREE.ShaderMaterial({
      vertexShader: HALO_VERT, fragmentShader: HALO_FRAG, uniforms: { uScale: { value: 800 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  }), []);
  const haloGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(haloList.length * 3);
    haloList.forEach(({ n }, k) => {
      const lift = n.kind === "tech" ? LOGO_LIFT : 0;
      pos.set([n.pos.x, n.pos.y + lift, n.pos.z], k * 3);
    });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(haloList.length), 1));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(haloList.length), 1));
    g.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(haloList.length * 3), 3));
    return g;
  }, [haloList]);
  useEffect(() => () => { geo.core.dispose(); geo.body.dispose(); mats.core.dispose(); mats.body.dispose(); mats.halo.dispose(); haloGeo.dispose(); }, [geo, mats, haloGeo]);

  const tmp = useMemo(() => ({ o: new THREE.Object3D(), c: new THREE.Color(), v: new THREE.Vector3(), origin: new THREE.Vector3(...TECH_ORIGIN) }), []);

  useFrame((s) => {
    if (techState.enter < 0.001 || slotIdle(4)) return;
    const { rt } = model;
    const time = techState.reduced ? 0 : s.clock.elapsedTime;
    const fin = techState.final;
    const cam = s.camera as THREE.PerspectiveCamera;

    const coreMesh = core.current, bodyMesh = body.current;
    if (coreMesh) {
      struct.forEach(({ n, i }, k) => {
        const vis = rt.nodeVis[i];
        const pulse = n.kind === "root" ? 1 + 0.14 * Math.sin(time * 2.2) : 1;
        tmp.o.position.copy(n.pos);
        tmp.o.scale.setScalar(Math.max(0.0001, CORE_R[n.kind] * vis * pulse));
        tmp.o.updateMatrix();
        coreMesh.setMatrixAt(k, tmp.o.matrix);
        tmp.c.copy(RED).lerp(HOT, 0.22 + 0.4 * fin + (n.kind === "hub" ? 0.12 : 0));
        if (n.kind === "via") tmp.c.copy(DEEP).lerp(RED, 0.5 + 0.5 * fin);
        coreMesh.setColorAt(k, tmp.c);
      });
      coreMesh.instanceMatrix.needsUpdate = true;
      if (coreMesh.instanceColor) coreMesh.instanceColor.needsUpdate = true;
    }
    if (bodyMesh) {
      bodies.forEach(({ n, i }, k) => {
        const vis = rt.nodeVis[i];
        tmp.o.position.copy(n.pos);
        tmp.o.position.y -= 0.02;
        tmp.o.scale.set(Math.max(0.0001, vis), Math.max(0.0001, vis), Math.max(0.0001, vis));
        tmp.o.updateMatrix();
        bodyMesh.setMatrixAt(k, tmp.o.matrix);
      });
      bodyMesh.instanceMatrix.needsUpdate = true;
    }

    // halos (struct + technology nodes)
    if (halos) {
      const size = haloGeo.attributes.aSize as THREE.BufferAttribute, alpha = haloGeo.attributes.aAlpha as THREE.BufferAttribute, color = haloGeo.attributes.aColor as THREE.BufferAttribute;
      haloList.forEach(({ n, i }, k) => {
        const vis = rt.nodeVis[i];
        if (n.kind === "tech") {
          const f = rt.techFocus[n.tech];
          size.setX(k, (1.35 + 0.7 * f) * vis);
          alpha.setX(k, vis * (0.07 + 0.5 * f + 0.1 * fin));
          tmp.c.copy(RED).lerp(HOT, Math.min(1, f + 0.15));
        } else {
          size.setX(k, HALO_R[n.kind] * vis);
          alpha.setX(k, vis * (0.26 + 0.22 * fin + (n.kind === "root" ? 0.1 * Math.sin(time * 2.2) : 0)));
          tmp.c.copy(RED).lerp(HOT, 0.3);
        }
        color.setXYZ(k, tmp.c.r, tmp.c.g, tmp.c.b);
      });
      size.needsUpdate = true; alpha.needsUpdate = true; color.needsUpdate = true;
      mats.halo.uniforms.uScale.value = (s.size.height * s.gl.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(TECH_FOV) / 2));
    }

    // hub label anchors for the HTML layer
    model.hubNode.forEach((ni, c) => {
      const n = model.nodes[ni];
      tmp.v.copy(n.pos).add(tmp.origin).project(cam);
      const h = techState.hubScreen[c];
      h.x = tmp.v.x; h.y = tmp.v.y;
      h.on = rt.nodeVis[ni] > 0.7 && tmp.v.z < 1 ? 1 : 0;
    });
  });

  return (
    <>
      <instancedMesh ref={core} args={[geo.core, mats.core, struct.length]} frustumCulled={false} renderOrder={2} />
      <instancedMesh ref={body} args={[geo.body, mats.body, bodies.length]} frustumCulled={false} />
      {halos && <points geometry={haloGeo} material={mats.halo} frustumCulled={false} renderOrder={1} />}
    </>
  );
}
