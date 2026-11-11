"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { archiveState, useArchiveSelection } from "@/lib/archiveState";
import { PROJECTS } from "@/data/projects";
import { useCareerTier } from "@/lib/careerTier";
import type { CareerMaterials } from "../career/careerMaterials";
import { ARCHIVE_COLORS as C, TEXTURE_MAX_W, platformLocal, platformScale, type ArchiveQuality } from "./archiveConfig";
import { loadScaledTexture } from "./textureLoader";
import { slotIdle } from "@/lib/sceneGate";

interface Props { index: number; mats: CareerMaterials; q: ArchiveQuality }

/** One project: floating metallic platform + turntable + orbit ring + floating product screen. */
export default function ProjectPlatform({ index, mats, q }: Props) {
  const project = PROJECTS[index];
  const pos = platformLocal(index);
  const s = platformScale(index);
  const tier = useCareerTier();
  const active = useArchiveSelection();
  const shot = project.screenshots[0];
  const sg = (n: number) => Math.max(10, Math.round(n * q.segments));

  const root = useRef<THREE.Group>(null);
  const turntable = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const screen = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const focus = useRef(0);

  const own = useMemo(() => ({ ring: mats.crimson.clone(), edge: mats.crimsonDim.clone() }), [mats]);
  useEffect(() => () => { own.ring.dispose(); own.edge.dispose(); }, [own]);

  const aspect = shot ? shot.height / shot.width : 0.625;
  const SW = 3.2, SH = Math.min(2.3, SW * aspect);
  const geo = useMemo(() => ({
    base: new THREE.CylinderGeometry(1.75, 1.45, 0.28, sg(56)),
    rim: new THREE.TorusGeometry(1.76, 0.04, 8, sg(80)),
    table: new THREE.CylinderGeometry(1.35, 1.35, 0.08, sg(48)),
    under: new THREE.CylinderGeometry(0.9, 0.5, 0.5, sg(32)),
    orbit: new THREE.TorusGeometry(2.25, 0.018, 6, sg(96)),
    frame: new THREE.BoxGeometry(SW + 0.16, SH + 0.16, 0.06),
    plane: new THREE.PlaneGeometry(SW, SH),
    bar: new THREE.PlaneGeometry(1, 1),
    node: new THREE.BoxGeometry(0.1, 0.1, 0.1),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [q.segments, SW, SH]);
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  // Abstract (non-UI) placeholder when no real screenshot exists — never a fake screenshot.
  const idle = useMemo(() => new THREE.MeshBasicMaterial({ color: "#0d0b0c", toneMapped: false }), []);
  const line = useMemo(() => new THREE.MeshBasicMaterial({ color: C.crimsonDeep, toneMapped: false, transparent: true, opacity: 0.7 }), []);
  useEffect(() => () => { idle.dispose(); line.dispose(); }, [idle, line]);

  // Lazy screenshot texture: only for the active project and its neighbours; disposed again when far away.
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  const near = Math.abs(active - index) <= 1;
  useEffect(() => {
    if (!shot || !near) return;
    const ac = new AbortController();
    let made: THREE.CanvasTexture | null = null;
    loadScaledTexture(shot.src, TEXTURE_MAX_W[tier === "lite" ? "lite" : "full"], ac.signal).then((t) => {
      if (!t) return;
      if (ac.signal.aborted) { t.dispose(); return; }
      made = t; setTex(t);
    });
    return () => { ac.abort(); made?.dispose(); setTex(null); };
  }, [shot, near, tier]);
  const shotMat = useMemo(() => (tex ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }) : null), [tex]);
  useEffect(() => () => shotMat?.dispose(), [shotMat]);

  useFrame((st, dt) => {
    if (archiveState.enter < 0.001 || slotIdle(3)) return;
    const f = (focus.current = THREE.MathUtils.damp(focus.current, archiveState.focus[index] ?? 0, 8, dt));
    const t = st.clock.elapsedTime;
    const live = archiveState.reduced ? 0 : 1;
    if (turntable.current) turntable.current.rotation.y = archiveState.spin[index] + t * 0.12 * f * live;
    if (orbit.current) { orbit.current.rotation.z += dt * (0.05 + 0.5 * f) * live; orbit.current.rotation.x = 1.25 + Math.sin(t * 0.4 + index) * 0.04 * live; }
    if (root.current) root.current.position.y = pos[1] + Math.sin(t * 0.7 + index * 1.3) * 0.08 * live * (1 - 0.4 * (1 - f));
    if (screen.current) {
      screen.current.position.y = 2.0 + 0.35 * f + Math.sin(t * 0.9 + index) * 0.05 * live;
      screen.current.scale.setScalar(0.88 + 0.12 * f); // platform scale already on the parent group
      screen.current.rotation.y = -0.28 + Math.sin(t * 0.3 + index) * 0.03 * live;
    }
    if (scan.current) scan.current.position.y = ((t * 0.35 + index * 0.3) % 1) * SH - SH / 2;
    own.ring.emissiveIntensity = 0.5 + 2.6 * f;
    own.edge.emissiveIntensity = 0.25 + 1.2 * f;
  });

  return (
    <group ref={root} position={pos} scale={s} name={`archive-platform-${project.id}`}>
      <mesh geometry={geo.under} material={mats.darkMetal} position={[0, -0.5, 0]} />
      <mesh geometry={geo.base} material={mats.darkMetal} />
      <mesh geometry={geo.rim} material={own.ring} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.14, 0]} />
      <group ref={turntable} position={[0, 0.2, 0]}>
        <mesh geometry={geo.table} material={mats.metal} />
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} geometry={geo.node} material={own.ring} position={[Math.cos((k * Math.PI) / 2) * 1.2, 0.08, Math.sin((k * Math.PI) / 2) * 1.2]} />
        ))}
      </group>
      <group ref={orbit} rotation={[1.25, 0, 0]} position={[0, 0.9, 0]}>
        <mesh geometry={geo.orbit} material={own.edge} />
      </group>
      {/* floating product screen (scale handled per frame; platform scale already applied to the group) */}
      <group ref={screen} position={[0.2, 2.0, -0.2]} scale={1}>
        <mesh geometry={geo.frame} material={mats.darkMetal} position={[0, 0, -0.04]} />
        <mesh geometry={geo.plane} material={shotMat ?? idle} />
        {!shotMat && (
          <>
            <mesh geometry={geo.bar} material={line} scale={[SW * 0.8, 0.05, 1]} position={[0, SH * 0.32, 0.01]} />
            <mesh geometry={geo.bar} material={line} scale={[SW * 0.5, 0.05, 1]} position={[-SW * 0.15, SH * 0.12, 0.01]} />
            <mesh geometry={geo.bar} material={line} scale={[SW * 0.65, 0.05, 1]} position={[-SW * 0.075, -SH * 0.08, 0.01]} />
            <mesh ref={scan} geometry={geo.bar} material={own.edge} scale={[SW, 0.012, 1]} position={[0, 0, 0.02]} />
          </>
        )}
        <mesh geometry={geo.bar} material={own.edge} scale={[SW + 0.16, 0.02, 1]} position={[0, -(SH + 0.16) / 2, 0.04]} />
      </group>
    </group>
  );
}
