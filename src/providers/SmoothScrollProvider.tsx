"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { createGlobalProgressTrigger, prefersReducedMotion } from "@/lib/animations";

const LenisContext = createContext<Lenis | null>(null);
export const useLenis = () => useContext(LenisContext);

export default function SmoothScrollProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    const progress = createGlobalProgressTrigger();
    let stopProbe: (() => void) | undefined;
    if (new URLSearchParams(window.location.search).has("perf")) import("@/lib/perfProbe").then((m) => { stopProbe = m.startPerfProbe(); });
    document.fonts?.ready.then(() => ScrollTrigger.refresh()); // fonts change layout → re-measure triggers
    let instance: Lenis | null = null;
    let tick: ((t: number) => void) | null = null;

    // Touch devices already have native momentum scrolling; Lenis would only add a per-frame loop (and iOS edge cases). Wheel/trackpad only.
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!prefersReducedMotion() && fine) {
      instance = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        autoRaf: false, // GSAP's ticker drives Lenis → one RAF loop for everything
      });
      instance.on("scroll", ScrollTrigger.update);
      tick = (time) => instance!.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      setLenis(instance);
    }

    return () => {
      progress.kill();
      stopProbe?.();
      if (tick) gsap.ticker.remove(tick);
      instance?.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
