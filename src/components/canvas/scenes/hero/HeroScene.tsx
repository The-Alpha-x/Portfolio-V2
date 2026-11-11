"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { heroExit, heroState, setHeroReady, useHeroTextHeight } from "@/lib/heroState";
import { fitPortrait } from "@/lib/heroLayout";
import { BUDGET, useDeviceProfile, type CanvasBudget } from "@/lib/deviceProfile";
import { COLORS } from "@/lib/tokens";
import {
  burstFragment, burstVertex, dustFragment, dustVertex,
  eyeFragment, planeVertex, portraitFragment, seamFragment,
} from "./shaders";

/* ─────────────────────────────  constants  ───────────────────────────── */
const SRC_DESKTOP = "/images/hero/portrait-1080.webp";
const SRC_MOBILE = "/images/hero/portrait-720.webp";
const IMG_ASPECT = 0.75; // 1080 × 1440 (same value as lib/heroLayout)
const SEAM = 0.5018; // x of the human / machine split, in UV space (measured from the artwork)
const EYE_UV = new THREE.Vector2(0.597, 0.664); // cybernetic eye (measured)
const CAM_Z = 6; // must match PersistentCanvas camera
const FOV = 40;

const { clamp, damp, smoothstep } = THREE.MathUtils;

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function configureTexture(t: THREE.Texture | THREE.Texture[], anisotropy = 8) {
  (Array.isArray(t) ? t : [t]).forEach((tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = anisotropy;
    tex.needsUpdate = true;
  });
}

/**
 * Size/position of the portrait in world units, derived from the viewport.
 *  - landscape / desktop: large centred portrait, text stack overlaps only the chest (shaded);
 *  - portrait screens (phones, tablets held upright): the portrait is FITTED into the band between the nav and the measured
 *    text stack — the face (top ~62 %) always lands inside that band, so no text can ever cover it. The artwork is wider than
 *    the face, so on narrow screens the edges are cropped (up to 35 % wider than the viewport) to keep the face large.
 */
function usePortraitLayout() {
  const w = useThree((s) => s.size.width);
  const h = useThree((s) => s.size.height);
  const textH = useHeroTextHeight();
  return useMemo(() => {
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM_Z;
    const viewW = viewH * (w / h);
    if (w / h < 1) {
      const f = fitPortrait(w, h, textH);
      const H = (f.Hpx / h) * viewH;
      return { W: H * IMG_ASPECT, H, y: (0.5 - f.centerPx / h) * viewH, fitted: true };
    }
    let H = viewH * 0.96;
    let W = H * IMG_ASPECT;
    if (W > viewW * 0.92) { W = viewW * 0.92; H = W / IMG_ASPECT; }
    return { W, H, y: viewH * 0.015, fitted: false };
  }, [w, h, textH]);
}

/* ─────────────────────────  ambient dust (depth)  ───────────────────────── */
function Dust({ W, H, budget }: { W: number; H: number; budget: CanvasBudget }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const { geometry, material } = useMemo(() => {
    const count = budget.heroDust;
    const rnd = mulberry32(7);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count * 3);
    const boxW = W * 2.2, boxH = H * 1.15;
    for (let i = 0; i < count; i++) {
      pos.set([(rnd() - 0.5) * boxW, (rnd() - 0.5) * boxH, -1.2 + rnd() * 3.4], i * 3);
      seed.set([rnd(), rnd(), rnd()], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seed, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uPixelRatio: { value: 1 }, uExit: { value: 0 }, uSize: { value: 1.4 },
        uMouse: { value: new THREE.Vector2() }, uBox: { value: new THREE.Vector2(boxW, boxH) },
        uOpacity: { value: 0 },
      },
      vertexShader: dustVertex, fragmentShader: dustFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, [W, H, budget]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state) => {
    const u = material.uniforms;
    const exit = heroExit();
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = dpr;
    u.uExit.value = exit;
    u.uMouse.value.set(heroState.sx, heroState.sy);
    u.uOpacity.value = heroState.reveal * (1 - smoothstep(exit, 0.6, 0.98));
  });

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={4} />;
}

/* ──────────────────  portrait → particles (exit transition)  ────────────────── */
function Burst({ tex, W, H, budget }: { tex: THREE.Texture; W: number; H: number; budget: CanvasBudget }) {
  const ref = useRef<THREE.Points>(null);
  const dpr = useThree((s) => s.viewport.dpr);
  const { geometry, material } = useMemo(() => {
    const count = budget.heroBurst;
    const rnd = mulberry32(21);
    const cols = Math.ceil(Math.sqrt(count * IMG_ASPECT));
    const rows = Math.ceil(count / cols);
    const uv = new Float32Array(count * 2);
    const rand = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const cx = i % cols, cy = Math.floor(i / cols);
      uv.set([(cx + rnd()) / cols, (cy + rnd()) / rows], i * 2); // jittered grid → even coverage
      rand.set([rnd(), rnd(), rnd()], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute("aUv", new THREE.BufferAttribute(uv, 2));
    geometry.setAttribute("aRand", new THREE.BufferAttribute(rand, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: tex }, uTime: { value: 0 }, uPixelRatio: { value: 1 },
        uExit: { value: 0 }, uSize: { value: 1.3 }, uPlane: { value: new THREE.Vector2(W, H) },
      },
      vertexShader: burstVertex, fragmentShader: burstFragment,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }, [tex, budget]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  useFrame((state) => {
    const exit = heroExit();
    if (ref.current) ref.current.visible = exit > 0.001;
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uPixelRatio.value = dpr;
    u.uExit.value = exit;
    u.uPlane.value.set(W, H);
  });

  return <points ref={ref} geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
}

/* ───────────────  mechanical shards flying off the machine side  ─────────────── */
function Shards({ W, H, count: COUNT }: { W: number; H: number; count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => {
    const rnd = mulberry32(99);
    return Array.from({ length: COUNT }, () => ({
      ox: (0.03 + rnd() * 0.42) * W, oy: (rnd() - 0.5) * H * 0.75, oz: 0.06 + rnd() * 0.2,
      vx: 0.6 + rnd() * 1.6, vy: (rnd() - 0.3) * 1.2, vz: 0.5 + rnd() * 1.8,
      rx: rnd() - 0.5, ry: rnd() - 0.5, rz: rnd() - 0.5,
      s: 0.7 + rnd() * 1.6, delay: rnd(),
    }));
  }, [W, H, COUNT]);

  useFrame(() => {
    const m = ref.current;
    if (!m) return;
    const e = heroExit();
    m.visible = e > 0.1 && e < 0.999;
    if (!m.visible) return;
    data.forEach((s, i) => {
      const t = clamp((e - 0.12 - s.delay * 0.3) / 0.6, 0, 1);
      const k = t * t;
      const life = Math.min(1, Math.sin(Math.PI * t) * 3);
      dummy.position.set(s.ox + s.vx * k * 1.6, s.oy + s.vy * k * 1.2, s.oz + s.vz * k * 2.2);
      dummy.rotation.set(s.rx * t * 5, s.ry * t * 5, s.rz * t * 5);
      dummy.scale.setScalar(s.s * life);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, COUNT]} frustumCulled={false} visible={false}>
      <boxGeometry args={[0.16, 0.05, 0.014]} />
      <meshStandardMaterial color={COLORS.metal} metalness={0.85} roughness={0.35} emissive={COLORS.crimsonDeep} emissiveIntensity={0.5} />
    </instancedMesh>
  );
}

/* ────────────────────────────────  scene  ──────────────────────────────── */
export default function HeroScene() {
  const profile = useDeviceProfile();
  const budget = BUDGET[profile.canvas === "full" ? "full" : "lite"];
  // Same breakpoint as the <link rel="preload"> tags and the pre-loader → one network request for the portrait.
  const small = useThree((s) => s.size.width < 768);
  const tex = useTexture(small ? SRC_MOBILE : SRC_DESKTOP, (t) => configureTexture(t, budget.anisotropy)) as THREE.Texture;
  const { W, H, y } = usePortraitLayout();

  const root = useRef<THREE.Group>(null);
  const group = useRef<THREE.Group>(null);
  const human = useRef<THREE.Mesh>(null);
  const machine = useRef<THREE.Group>(null);

  // Uniform objects are shared (same {value} refs) so one write drives both halves.
  const shared = useMemo(
    () => ({
      uTex: { value: tex }, uSeam: { value: SEAM }, uOverlap: { value: 0.008 },
      uReveal: { value: 0 }, uScan: { value: 0 }, uScanAmp: { value: 1 }, uExit: { value: 0 },
      uTime: { value: 0 }, uAspect: { value: IMG_ASPECT }, uEyeUv: { value: EYE_UV },
    }),
    [tex]
  );
  const mats = useMemo(() => {
    const make = (side: number) =>
      new THREE.ShaderMaterial({
        uniforms: { ...shared, uSide: { value: side } },
        vertexShader: planeVertex, fragmentShader: portraitFragment,
        transparent: true, depthWrite: false,
      });
    const additive = (frag: string) =>
      new THREE.ShaderMaterial({
        uniforms: { uIntensity: { value: 0 } },
        vertexShader: planeVertex, fragmentShader: frag,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
    return { human: make(0), machine: make(1), eye: additive(eyeFragment), seam: additive(seamFragment) };
  }, [shared]);

  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  // Tell the DOM layer the portrait is on the GPU → the intro may begin.
  useEffect(() => { setHeroReady(); }, []);

  // Pointer parallax (fine pointers only).
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      heroState.mx = (e.clientX / window.innerWidth - 0.5) * 2;
      heroState.my = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, dt) => {
    const r = root.current, g = group.current;
    if (!r || !g) return;
    const t = state.clock.elapsedTime;
    const exit = heroExit();

    r.visible = exit < 0.999; // fully dissolved → stop drawing the scene
    if (!r.visible) return;

    heroState.sx = damp(heroState.sx, heroState.mx, 2.5, dt);
    heroState.sy = damp(heroState.sy, heroState.my, 2.5, dt);

    const u = shared;
    u.uTime.value = t;
    u.uReveal.value = heroState.reveal;
    u.uScan.value = heroState.scan;
    u.uScanAmp.value = heroState.scanAmp;
    u.uExit.value = exit;

    // Slow camera push-in: intro (≈10 s) + scroll. Moving the layers toward a fixed camera.
    g.position.z = -0.7 + heroState.intro * 0.7 + heroState.scroll * 0.9;
    g.rotation.y = heroState.sx * 0.05;
    g.rotation.x = -heroState.sy * 0.03;

    // Depth: the two halves drift at slightly different speeds.
    if (human.current) human.current.position.x = heroState.sx * 0.035;
    if (machine.current) machine.current.position.x = heroState.sx * 0.06;

    const flick = 0.88 + 0.12 * Math.sin(t * 2.1) + 0.06 * Math.sin(t * 13.7);
    mats.eye.uniforms.uIntensity.value = heroState.eye * flick * (1 - smoothstep(exit, 0.05, 0.5));
    mats.seam.uniforms.uIntensity.value =
      0.28 * heroState.reveal * (0.8 + 0.2 * Math.sin(t * 1.3)) * (1 - smoothstep(exit, 0.0, 0.4));
  });

  return (
    <group ref={root}>
      <Dust W={W} H={H} budget={budget} />
      <group ref={group} position={[0, y, -0.7]}>
        {/* human half — back layer */}
        <mesh ref={human} renderOrder={1} material={mats.human}>
          <planeGeometry args={[W, H]} />
        </mesh>

        {/* machine half — front layer, carries the eye glow */}
        <group ref={machine} position={[0, 0, 0.06]}>
          <mesh renderOrder={2} material={mats.machine}>
            <planeGeometry args={[W, H]} />
          </mesh>
          <mesh
            position={[(EYE_UV.x - 0.5) * W, (EYE_UV.y - 0.5) * H, 0.02]}
            renderOrder={3}
            material={mats.eye}
          >
            <planeGeometry args={[H * 0.42, H * 0.42]} />
          </mesh>
        </group>

        {/* luminous seam */}
        <mesh position={[(SEAM - 0.5) * W, 0, 0.07]} renderOrder={3} material={mats.seam}>
          <planeGeometry args={[W * 0.03, H * 0.98]} />
        </mesh>

        <Burst tex={tex} W={W} H={H} budget={budget} />
        <Shards W={W} H={H} count={budget.heroShards} />
      </group>
    </group>
  );
}
