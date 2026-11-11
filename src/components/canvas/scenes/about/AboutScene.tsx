"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { aboutExit, aboutState } from "@/lib/aboutState";
import { careerState } from "@/lib/careerState";
import { BUDGET, useDeviceProfile, type CanvasBudget } from "@/lib/deviceProfile";
import {
  dustFragment, dustVertex, hazeFragment, hazeVertex, ringFragment, ringVertex,
  stripFragment, stripVertex, surfaceFragment, surfaceVertex,
} from "./shaders";

/* ───────────── corridor dimensions (corridor-local space) ───────────── */
const HW = 3; // half width
const HH = 2; // half height
const Z_NEAR = 10; // entrance (behind the camera at the start)
const Z_FAR = -100; // end wall
const RIB_STEP = 5;

/* ───────────── camera journey ───────────── */
const CAM_START = 4; // camera's z inside the corridor at the start
const PRE = 6; // distance travelled while the section scrolls into view
const MAIN = 78; // distance travelled while pinned → camera ends at z = −80

/** Light strips: [x, y]. Mounted just inside the walls/ceiling. */
const STRIP_BASE: [number, number][] = [[-2.97, 1.5], [2.97, 1.5], [-2.97, -1.5], [2.97, -1.5], [0, 1.97]];
/** …and where they gather when the corridor becomes the timeline path. */
const STRIP_END: [number, number][] = [[-1.1, -1.65], [1.1, -1.65], [-0.55, -1.65], [0.55, -1.65], [0, -1.65]];
const STRIP_LEN = 170;
const STRIP_Z0 = -75; // centre of the strip ribbons (z from +10 to −160)

/** Timeline nodes, in the corridor's continuation beyond the end wall. */
const RING_Z = [-90, -102, -114, -126, -138];

const { damp, smoothstep, lerp } = THREE.MathUtils;

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Uniforms = Record<string, THREE.IUniform>;

/** Builds the whole corridor imperatively; AboutScene only updates uniforms per frame. */
function buildCorridor(budget: CanvasBudget) {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(o: T) => (disposables.push(o), o);

  const shared = {
    uTime: { value: 0 },
    uFade: { value: 0 },
    uExit: { value: 0 },
    uStripI: { value: 1 },
    uPixelRatio: { value: 1 },
    uCam: { value: new THREE.Vector3() },
    uStrips: { value: STRIP_BASE.map(([x, y]) => new THREE.Vector2(x, y)) },
  };

  /* ── shell (walls, floor, ceiling) ── */
  const surfaceMat = (flip: number, rib: number, side: THREE.Side) =>
    track(
      new THREE.ShaderMaterial({
        uniforms: { ...shared, uFlip: { value: flip }, uRib: { value: rib } } as Uniforms,
        vertexShader: surfaceVertex, fragmentShader: surfaceFragment, side,
      })
    );

  const shellGeo = track(new THREE.BoxGeometry(HW * 2, HH * 2, Z_NEAR - Z_FAR));
  shellGeo.translate(0, 0, (Z_NEAR + Z_FAR) / 2);
  const shell = new THREE.Mesh(shellGeo, surfaceMat(-1, 0, THREE.BackSide));
  shell.frustumCulled = false;
  group.add(shell);

  /* ── structural ribs: real geometry, so walls have depth and parallax ── */
  const ribZs: number[] = [];
  for (let z = 5; z >= -95; z -= RIB_STEP * budget.ribStride) ribZs.push(z);
  const boxGeo = track(new THREE.BoxGeometry(1, 1, 1));
  const ribs = new THREE.InstancedMesh(boxGeo, surfaceMat(1, 1, THREE.FrontSide), ribZs.length * 4);
  ribs.frustumCulled = false;
  const dummy = new THREE.Object3D();
  let n = 0;
  ribZs.forEach((z, k) => {
    const heavy = k % 4 === 0;
    const t = heavy ? 0.5 : 0.35; // bar thickness
    const d = heavy ? 0.5 : 0.35; // bar depth along z
    const bars: [number, number, number, number, number][] = [
      [0, HH - t / 2, 2 * HW, t, d], // top
      [0, -HH + t / 2, 2 * HW, t, d], // bottom
      [-HW + t / 2, 0, t, 2 * HH, d], // left
      [HW - t / 2, 0, t, 2 * HH, d], // right
    ];
    bars.forEach(([x, y, sx, sy, sz]) => {
      dummy.position.set(x, y, z);
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();
      ribs.setMatrixAt(n++, dummy.matrix);
    });
  });
  ribs.instanceMatrix.needsUpdate = true;
  group.add(ribs);

  /* ── light strips: two crossed gaussian ribbons = a glowing tube from any angle ── */
  const gH = track(new THREE.PlaneGeometry(1.2, STRIP_LEN));
  gH.rotateX(-Math.PI / 2);
  const gV = track(new THREE.PlaneGeometry(1.2, STRIP_LEN));
  gV.rotateX(-Math.PI / 2);
  gV.rotateZ(Math.PI / 2);
  const stripMats: THREE.ShaderMaterial[] = [];
  const stripMeshes: THREE.Mesh[][] = [];
  STRIP_BASE.forEach(([x, y], i) => {
    const mat = track(
      new THREE.ShaderMaterial({
        uniforms: { uTime: shared.uTime, uIntensity: { value: 0 }, uSeed: { value: i }, uW: { value: 1.2 }, uZ0: { value: STRIP_Z0 } },
        vertexShader: stripVertex, fragmentShader: stripFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      })
    );
    const pair = [gH, gV].map((g) => {
      const m = new THREE.Mesh(g, mat);
      m.position.set(x, y, STRIP_Z0);
      m.frustumCulled = false;
      group.add(m);
      return m;
    });
    stripMats.push(mat);
    stripMeshes.push(pair);
  });

  /* ── atmospheric haze: noise slices that glow near the strips ── */
  const hazeCount = budget.corridorHaze;
  const hazeGeo = track(new THREE.PlaneGeometry(HW * 2.5, HH * 2.7));
  const hazeMats: THREE.ShaderMaterial[] = [];
  for (let i = 0; i < hazeCount; i++) {
    const mat = track(
      new THREE.ShaderMaterial({
        uniforms: { uTime: shared.uTime, uStrips: shared.uStrips, uSeed: { value: i * 1.37 }, uIntensity: { value: 0 } },
        vertexShader: hazeVertex, fragmentShader: hazeFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    const m = new THREE.Mesh(hazeGeo, mat);
    m.position.z = 6 - (i + 0.5) * (96 / hazeCount);
    m.frustumCulled = false;
    group.add(m);
    hazeMats.push(mat);
  }

  /* ── floating dust ── */
  const dustCount = budget.corridorDust;
  const rnd = mulberry32(5);
  const pos = new Float32Array(dustCount * 3);
  const seed = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    pos.set([(rnd() - 0.5) * (HW * 2 - 0.4), (rnd() - 0.5) * 4, 8 - rnd() * 108], i * 3);
    seed.set([rnd(), rnd(), rnd()], i * 3);
  }
  const dustGeo = track(new THREE.BufferGeometry());
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
  const dustMat = track(
    new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.uTime, uPixelRatio: shared.uPixelRatio, uStrips: shared.uStrips,
        uSize: { value: 1.4 }, uIntensity: { value: 0 },
      },
      vertexShader: dustVertex, fragmentShader: dustFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    })
  );
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  group.add(dust);

  /* ── timeline nodes ── */
  const ringGeo = track(new THREE.PlaneGeometry(3.4, 3.4));
  const ringMats: THREE.ShaderMaterial[] = [];
  const ringMeshes = RING_Z.map((z, i) => {
    const mat = track(
      new THREE.ShaderMaterial({
        uniforms: { uTime: shared.uTime, uIntensity: { value: 0 }, uSeed: { value: i * 1.1 } },
        vertexShader: ringVertex, fragmentShader: ringFragment,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      })
    );
    const m = new THREE.Mesh(ringGeo, mat);
    m.position.set(0, -0.3, z);
    m.frustumCulled = false;
    m.visible = false;
    group.add(m);
    ringMats.push(mat);
    return m;
  });

  return {
    group, shared, shell, ribs, stripMats, stripMeshes, hazeMats, dustMat, ringMats, ringMeshes,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

/* ═══════════════════════════════  scene  ═══════════════════════════════ */
export default function AboutScene() {
  const profile = useDeviceProfile();
  const budget = BUDGET[profile.canvas === "full" ? "full" : "lite"];
  const assets = useMemo(() => buildCorridor(budget), [budget]);
  useEffect(() => () => assets.dispose(), [assets]);

  const root = useRef<THREE.Group>(null);
  const rig = useRef<THREE.Group>(null);
  const look = useRef<THREE.Group>(null);
  const world = useRef<THREE.Group>(null);
  const ptr = useRef({ tx: 0, ty: 0, x: 0, y: 0 });
  const travel = useRef({ cur: 0, init: false });

  // Pointer look-around (fine pointers only).
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      ptr.current.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.current.ty = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, dt) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const { enter, release, reduced } = aboutState;
    const p = reduced ? 0.4 : aboutState.progress;
    const exit = aboutExit();
    const fade = smoothstep(enter, 0.05, 0.7) * (1 - smoothstep(release, 0, 0.85)); // eased dissolve into the career hand-off
    const visible = enter > 0.001 && release < 0.999;
    if (root.current) root.current.visible = visible;

    // Wider lens + longer far plane while inside the corridor; restored to the shared defaults after.
    const wantFov = visible ? 40 + 16 * fade : 40;
    const wantFar = visible ? 220 : 100;
    // Once Scene 03 owns the camera (careerState.enter > 0) About must not pull its fov back to 40 every frame.
    const fovFree = !visible && careerState.enter > 0.001;
    if ((!fovFree && Math.abs(camera.fov - wantFov) > 0.01) || camera.far !== wantFar) {
      if (!fovFree) camera.fov = damp(camera.fov, wantFov, 3, dt);
      camera.far = wantFar;
      camera.updateProjectionMatrix();
    }
    if (!visible) { travel.current.init = false; return; }

    const rg = rig.current, lk = look.current, wd = world.current;
    if (!rg || !lk || !wd) return;
    const t = state.clock.elapsedTime;
    const a = assets;
    const s = ptr.current;

    // The rig rides on the shared camera; the corridor moves past it.
    rg.position.copy(camera.position);
    rg.quaternion.copy(camera.quaternion);

    s.x = damp(s.x, s.tx, 2.5, dt);
    s.y = damp(s.y, s.ty, 2.5, dt);

    // Slow journey: pre-roll while arriving + scroll-driven travel, with inertia.
    const target = reduced ? 30 * enter : PRE * enter + MAIN * p;
    const tr = travel.current;
    tr.cur = tr.init ? damp(tr.cur, target, 4, dt) : target;
    tr.init = true;
    const camZ = CAM_START - tr.cur;
    const camX = Math.sin(t * 0.11) * 0.18;
    const camY = Math.sin(t * 0.17) * 0.06;
    wd.position.set(-camX, -camY, -camZ);
    lk.rotation.set(-s.y * 0.02, -s.x * 0.03, Math.sin(t * 0.09) * 0.004);

    // Shared uniforms
    const u = a.shared;
    u.uTime.value = t;
    u.uPixelRatio.value = state.viewport.dpr;
    u.uFade.value = fade;
    u.uExit.value = exit;
    u.uStripI.value = 1 - 0.3 * exit;
    u.uCam.value.set(camX, camY, camZ);

    // Light strips gather into the timeline path as the shell dissolves.
    const m = smoothstep(exit, 0.15, 0.7);
    a.stripMeshes.forEach((pair, i) => {
      const x = lerp(STRIP_BASE[i][0], STRIP_END[i][0], m);
      const y = lerp(STRIP_BASE[i][1], STRIP_END[i][1], m);
      u.uStrips.value[i].set(x, y);
      pair.forEach((mesh) => mesh.position.set(x, y, STRIP_Z0));
      a.stripMats[i].uniforms.uIntensity.value = fade;
    });

    a.hazeMats.forEach((mat) => (mat.uniforms.uIntensity.value = fade * (1 - 0.6 * exit)));
    a.dustMat.uniforms.uIntensity.value = fade * (1 - 0.5 * exit);

    // Timeline nodes appear in sequence
    a.ringMeshes.forEach((mesh, i) => {
      const k = smoothstep(exit, 0.45 + i * 0.07, 0.8 + i * 0.07);
      mesh.visible = k > 0.001;
      mesh.scale.setScalar(Math.max(k, 0.0001));
      a.ringMats[i].uniforms.uIntensity.value = (k * fade) / (1 + i * 0.35);
    });
  });

  return (
    <group ref={root} visible={false}>
      <group ref={rig}>
        <group ref={look}>
          <group ref={world}>
            <primitive object={assets.group} />
          </group>
        </group>
      </group>
    </group>
  );
}
