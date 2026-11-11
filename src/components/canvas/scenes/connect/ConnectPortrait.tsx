"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { connectState, CAM_FINAL } from "@/lib/connectState";
import { slotIdle } from "@/lib/sceneGate";
import { EYE_UV, PORTRAIT_ASPECT, PORTRAIT_DIST, PORTRAIT_SRC } from "./connectConfig";
import { eyeFragment, haloFragment, planeVertex, portraitFragment } from "./shaders";

const { damp, smoothstep, degToRad } = THREE.MathUtils;

/** Size / position of the portrait in world units. It sits in the RIGHT half so the copy keeps the left. */
function usePortraitLayout() {
  const w = useThree((s) => s.size.width);
  const h = useThree((s) => s.size.height);
  return useMemo(() => {
    const viewH = 2 * Math.tan(degToRad(CAM_FINAL.fov / 2)) * PORTRAIT_DIST;
    const viewW = viewH * (w / h);
    const wide = w / h >= 1.2; // desktop / landscape: use the empty right half; portrait / narrow keeps the original framing
    // Desktop: let the portrait run slightly taller than the viewport so it bleeds off the bottom edge (shoulders cropped, head intact).
    let H = viewH * (wide ? 1.16 : 0.94);
    let W = H * PORTRAIT_ASPECT;
    const maxW = viewW * (wide ? 0.5 : 0.46); // copy keeps the left half
    if (W > maxW) { W = maxW; H = W / PORTRAIT_ASPECT; }
    // wide: pin the top of the head just inside the frame; narrow: original centring
    const y = wide ? viewH / 2 - H / 2 - viewH * 0.015 : -viewH * 0.02;
    return { W, H, x: viewW / 2 - W / 2 - viewW * (wide ? 0.02 : 0.03), y };
  }, [w, h]);
}

/** The human/cyborg portrait, returning as the main visual: revealed by light spreading from the eye, calm crimson halo behind. */
export default function ConnectPortrait() {
  const mobile = useThree((s) => s.size.width < 768); // same breakpoint as the hero → same cached texture
  const tex = useTexture(mobile ? PORTRAIT_SRC.mobile : PORTRAIT_SRC.desktop) as THREE.Texture;
  const { W, H, x, y } = usePortraitLayout();
  const group = useRef<THREE.Group>(null);
  const ptr = useRef({ tx: 0, ty: 0, x: 0, y: 0 });

  // Normally already configured by Scene 01 (same cached texture); only touch it if we got here first.
  useEffect(() => {
    if (tex.colorSpace !== THREE.SRGBColorSpace) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.needsUpdate = true; }
  }, [tex]);

  const mats = useMemo(() => {
    const portrait = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uReveal: { value: 0 }, uTime: { value: 0 }, uAspect: { value: PORTRAIT_ASPECT }, uEyeUv: { value: new THREE.Vector2(...EYE_UV) } },
      vertexShader: planeVertex, fragmentShader: portraitFragment, transparent: true, depthWrite: false,
    });
    const additive = (frag: string) =>
      new THREE.ShaderMaterial({ uniforms: { uIntensity: { value: 0 } }, vertexShader: planeVertex, fragmentShader: frag, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    return { portrait, eye: additive(eyeFragment), halo: additive(haloFragment) };
  }, [tex]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  // Gentle pointer parallax (fine pointers only; never under reduced motion).
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
    const g = group.current;
    if (!g) return;
    const reveal = connectState.portrait;
    g.visible = reveal > 0.001;
    if (!g.visible || slotIdle(5)) return;

    const reduced = connectState.reduced;
    const t = reduced ? 0 : state.clock.elapsedTime;
    const p = ptr.current;
    if (!reduced) { p.x = damp(p.x, p.tx, 2.5, dt); p.y = damp(p.y, p.ty, 2.5, dt); }

    g.position.set(x + p.x * 0.05, y + p.y * 0.03, -0.25 + reveal * 0.25); // slow push-in as it appears
    g.rotation.y = p.x * 0.04;
    g.rotation.x = -p.y * 0.025;

    mats.portrait.uniforms.uReveal.value = reveal;
    mats.portrait.uniforms.uTime.value = t;
    mats.eye.uniforms.uIntensity.value = 0.55 * connectState.eye * (0.85 + 0.15 * Math.sin(t * 0.9));
    mats.halo.uniforms.uIntensity.value = 0.55 * smoothstep(reveal, 0, 0.6) * (0.92 + 0.08 * Math.sin(t * 0.6));
  });

  return (
    <group ref={group} visible={false}>
      <mesh position={[0, 0, -0.3]} renderOrder={0} material={mats.halo}>
        <planeGeometry args={[H * 1.6, H * 1.6]} />
      </mesh>
      <mesh renderOrder={1} material={mats.portrait}>
        <planeGeometry args={[W, H]} />
      </mesh>
      {/* <mesh position={[(EYE_UV[0] - 0.5) * W, (EYE_UV[1] - 0.5) * H, 0.02]} renderOrder={2} material={mats.eye}> */}
        <planeGeometry args={[H * 0.42, H * 0.42]} />
      {/* </mesh> */}
    </group>
  );
}
