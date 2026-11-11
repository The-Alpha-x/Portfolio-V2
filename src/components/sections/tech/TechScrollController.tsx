"use client";
import { useEffect, useRef, type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { registerTechScroll, resetFocus, resetTechState, setPhase, techState } from "@/lib/techState";
import { GROW_WINDOWS, INTRO_VIEW, PHASES, PHASE_COUNT, PHASE_POSES, PHASE_VIEWS, phaseAt } from "@/data/techStages";
import { useLenis } from "@/providers/SmoothScrollProvider";

/**
 * ONE scrubbed master timeline, 100 units long = 0–100 % of the pinned scroll, so phase boundaries are literal percentages:
 *  01 INIT 0–15 · 02 FRONTEND 15–35 · 03 BACKEND 35–55 · 04 SYSTEMS 55–75 · 05 INTEGRATIONS 75–90 · 06 COMPLETE 90–100.
 * Scroll position fully determines the scene, so scrolling up reverses everything. Under reduced motion there is no pin and no
 * scrub: the phase selector poses the scene directly (PHASE_POSES).
 */
export default function TechScrollController({ stageRef, lite = false }: { stageRef: RefObject<HTMLElement | null>; lite?: boolean }) {
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  useEffect(() => {
    const stage = stageRef.current; if (!stage) return;
    const mm = gsap.matchMedia();
    mm.add({ scroll: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" }, (ctx) => {
      const { scroll } = ctx.conditions as { scroll: boolean };
      techState.reduced = !scroll;
      stage.dataset.mode = scroll ? "scroll" : "static";

      ScrollTrigger.create({
        trigger: stage, start: "top 45%", end: "top top", invalidateOnRefresh: true,
        onUpdate: (s) => { techState.enter = s.progress; }, onRefresh: (s) => { techState.enter = s.progress; },
      });

      const apply = (i: number) => {
        const k = Math.min(PHASE_COUNT - 1, Math.max(0, i)), p = PHASE_POSES[k];
        p.grow.forEach((v, j) => { techState.grow[j] = v; });
        techState.pulse = p.pulse; techState.final = p.final;
        techState.progress = k / (PHASE_COUNT - 1); // static (reduced-motion) mode has no scrub: keep progress-driven set dressing in step
        Object.assign(techState.view, PHASE_VIEWS[k]);
        setPhase(k);
      };

      if (!scroll) {
        apply(0);
        registerTechScroll(apply);
        return () => { registerTechScroll(null); delete stage.dataset.mode; };
      }

      techState.grow.fill(0); techState.pulse = 0; techState.final = 0; Object.assign(techState.view, INTRO_VIEW);
      const head = stage.querySelector<HTMLElement>("[data-tech-head]");
      const sel = stage.querySelector<HTMLElement>("[data-tech-selector]");
      const D = 100;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage, start: "top top", end: () => `+=${Math.round(window.innerHeight * (lite ? 5.2 : 6.4))}`,
          pin: true, scrub: lite ? 0.5 : 0.8, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (s) => { techState.progress = s.progress; setPhase(phaseAt(s.progress * 100)); },
          onRefresh: (s) => { techState.progress = s.progress; setPhase(phaseAt(s.progress * 100)); },
        },
      });

      // network growth, one channel per technology group
      GROW_WINDOWS.forEach(([a, b], j) => tl.to(techState.grow, { [j]: 1, duration: b - a, ease: "power1.inOut" }, a));
      // energy: data movement (phase 03) → integration pulses (phase 05) → full illumination (phase 06)
      tl.to(techState, { pulse: 0.5, duration: 9, ease: "power1.inOut" }, 40);
      tl.to(techState, { pulse: 0.85, duration: 10, ease: "power1.inOut" }, 76);
      tl.to(techState, { pulse: 1, final: 1, duration: 8, ease: "power2.inOut" }, 91);
      // controlled camera: one dolly per phase, arriving shortly after the phase begins
      PHASE_VIEWS.forEach((v, i) => {
        const [a, b] = PHASES[i].range;
        tl.to(techState.view, { ...v, duration: i === 0 ? 10 : Math.min(11, b - a - 3), ease: "power2.inOut" }, i === 0 ? 0 : Math.max(0, a - 1));
      });
      if (head) tl.fromTo(head, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 7, ease: "power2.out" }, 1);
      if (sel) tl.fromTo(sel, { "--fill": 0 }, { "--fill": 1, duration: D, immediateRender: true }, 0);
      tl.set({}, {}, D);

      registerTechScroll((i) => {
        const st = tl.scrollTrigger; if (!st) return;
        const k = Math.min(PHASE_COUNT - 1, Math.max(0, i));
        const pct = k === PHASE_COUNT - 1 ? 100 : PHASES[k].range[1] - 1.2; // settled, still inside the phase
        const y = st.start + (pct / D) * (st.end - st.start);
        const l = lenisRef.current;
        if (l) l.scrollTo(y, { duration: 1.8 }); else window.scrollTo({ top: y, behavior: "smooth" });
      });
      return () => { registerTechScroll(null); delete stage.dataset.mode; };
    });
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => { cancelAnimationFrame(raf); mm.revert(); registerTechScroll(null); resetFocus(); resetTechState(); };
  }, [stageRef, lite]);

  return null;
}
