"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { COLORS } from "@/lib/tokens";
import { gsap } from "@/lib/gsap";
import { sceneState } from "@/lib/sceneState";
import { aboutState } from "@/lib/aboutState";
import { BUDGET, degradeCanvas, markWebglFailed, useDeviceProfile } from "@/lib/deviceProfile";
import SceneRoot from "./SceneRoot";

const round = (n: number) => Math.round(n * 20) / 20;

/**
 * The ONE canvas. Fixed behind all HTML (z-0), non-interactive and hidden from assistive tech —
 * all meaningful content lives in the DOM above it.
 *
 * Mobile / low-power behaviour (all driven by lib/deviceProfile):
 *  - renderer: no MSAA on "lite" (or on ≥2× screens), default power preference, no stencil/alpha, refuses software GL;
 *  - resolution: capped per tier (lite 1.25×) and scaled between min..max by PerformanceMonitor; sustained <floor FPS on a
 *    lite device drops the 3D layer entirely (static tier) instead of limping;
 *  - on DOM-list layouts the canvas is only needed for scenes 01–02: once About has faded out the loop is stopped and the
 *    layer hidden, so ~70 % of the page costs the GPU nothing;
 *  - a lost context that does not come back within 4 s falls back to the static tier.
 */
export default function PersistentCanvas() {
  const profile = useDeviceProfile();
  const budget = BUDGET[profile.canvas === "full" ? "full" : "lite"];
  const deviceDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const maxDpr = Math.min(deviceDpr, budget.maxDpr);
  const minDpr = Math.min(maxDpr, budget.minDpr);
  const [dpr, setDpr] = useState(maxDpr);
  const [running, setRunning] = useState(true);
  const floorSince = useRef<number | null>(null);
  const lostTimer = useRef(0);
  const list = profile.layout === "list";

  // Tier / DPR changes (rotation, resize across a breakpoint) → clamp the current resolution.
  useEffect(() => setDpr((d) => Math.min(Math.max(d, minDpr), maxDpr)), [minDpr, maxDpr]);

  // Pause the render loop while nothing 3D can be visible (DOM-list layouts after the About corridor has faded out).
  useEffect(() => {
    if (!list) { setRunning(true); return; }
    const tick = () => {
      const want = sceneState.active <= 1 || aboutState.release < 0.999;
      setRunning((r) => (r === want ? r : want));
    };
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [list]);

  useEffect(() => () => window.clearTimeout(lostTimer.current), []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" style={running ? undefined : { visibility: "hidden" }}>
      <Canvas
        dpr={dpr}
        frameloop={running ? "always" : "never"}
        camera={{ position: [0, 0, 6], fov: 40, near: 0.1, far: 100 }}
        gl={{
          antialias: budget.antialias && deviceDpr < 2, // MSAA on a ≥2× screen costs memory and is barely visible
          powerPreference: budget.powerPreference,
          alpha: false,
          stencil: false,
          failIfMajorPerformanceCaveat: true, // software GL throws → CanvasBoundary → static tier, instead of 4 FPS
        }}
        onCreated={({ gl, scene }) => {
          if (new URLSearchParams(window.location.search).has("perf")) (window as unknown as { __hmGL: unknown }).__hmGL = gl; // read by lib/perfProbe
          gl.setClearColor(COLORS.bg);
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          scene.fog = new THREE.Fog(COLORS.bg, 8, 24);
          // preventDefault lets the browser restore the context; if it never does, give up on 3D instead of a dead canvas.
          const el = gl.domElement;
          el.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            window.clearTimeout(lostTimer.current);
            lostTimer.current = window.setTimeout(markWebglFailed, 4000);
          });
          el.addEventListener("webglcontextrestored", () => window.clearTimeout(lostTimer.current));
        }}
      >
        {/* Sustained low FPS → scale resolution between min..max; stuck at the floor for 4 s on a lite device → static tier. */}
        <PerformanceMonitor
          onChange={({ factor }) => {
            setDpr(Math.min(maxDpr, Math.max(minDpr, round(minDpr + (maxDpr - minDpr) * factor))));
            if (factor <= 0.05) {
              floorSince.current ??= performance.now();
              if (performance.now() - floorSince.current > 4000) degradeCanvas();
            } else floorSince.current = null;
          }}
          onFallback={() => { setDpr(minDpr); degradeCanvas(); }}
        />
        <Suspense fallback={null}>
          {/* No <Preload all/>: it would compile and upload every scene's assets up front. Scenes load as they are approached. */}
          <SceneRoot />
        </Suspense>
      </Canvas>
    </div>
  );
}
