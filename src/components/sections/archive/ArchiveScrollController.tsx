"use client";
import { useEffect, useRef, type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { archiveState, resetArchiveState, selectProject, registerArchiveScroll } from "@/lib/archiveState";
import { projectPose } from "@/components/canvas/scenes/archive/archiveConfig";
import { useLenis } from "@/providers/SmoothScrollProvider";

// Passive effect on purpose: this component is a CHILD of the stage element, and React attaches a parent's ref only after
// its children's layout effects have run — a layout effect here would see `stageRef.current === null` on mount, return
// early and never build the ScrollTriggers (deps never change, so it never retries). Passive effects run after refs attach.
const useIsoLayoutEffect = useEffect;

/**
 * ONE scrubbed master timeline (abstract units; STRIDE per project):
 *   t0 = i·STRIDE
 *   t0 … +1.3   camera i-1 → i (with arc) · platform i focus 0→1 at +0.4 · spin i scrubbed across the stride
 *   t0+0.9      panel i reveals (text stagger, image clip reveal, numeral parallax)
 *   t0+0.65     HTML selection switches to i (between panels, both hidden)
 *   t0+STRIDE-0.7 panel i leaves → next camera move
 * GSAP writes `archiveState`; R3F reads it in useFrame. No React state per frame; no second canvas.
 */
const STRIDE = 3.2;
const SWITCH = 0.65;

interface Props { stageRef: RefObject<HTMLElement | null>; count: number; lite?: boolean }

export default function ArchiveScrollController({ stageRef, count, lite = false }: Props) {
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  useIsoLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const mm = gsap.matchMedia();
    const D = count * STRIDE + 1.4;
    const holdAt = (i: number) => i * STRIDE + 1.9;

    mm.add({ scroll: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" }, (ctx) => {
      const { scroll } = ctx.conditions as { scroll: boolean };
      const poses = Array.from({ length: count }, (_, i) => projectPose(i));
      const cam = archiveState.cam;
      archiveState.reduced = !scroll;
      stage.dataset.mode = scroll ? "scroll" : "static";

      // A. entry blend (all modes): hand-over from the previous scene's camera to this one, ends as the pin starts
      ScrollTrigger.create({
        trigger: stage, start: "top 45%", end: "top top", invalidateOnRefresh: true,
        onUpdate: (s) => { archiveState.enter = s.progress; },
        onRefresh: (s) => { archiveState.enter = s.progress; },
      });

      // B2. reduced motion: no pin/scrub — selection poses the rig directly
      if (!scroll) {
        const apply = (i: number) => {
          Object.assign(cam, poses[i]);
          archiveState.focus.forEach((_, j) => (archiveState.focus[j] = j === i ? 1 : 0.35));
          archiveState.arc = 0; archiveState.pulse = 0.4;
        };
        apply(archiveState.active);
        registerArchiveScroll((i) => { selectProject(i); apply(archiveState.active); });
        return () => { registerArchiveScroll(null); delete stage.dataset.mode; };
      }

      // B1. scroll mode
      const panels = Array.from({ length: count }, (_, i) => stage.querySelector<HTMLElement>(`[data-archive-panel="${i}"]`));
      const items = panels.map((p) => (p ? Array.from(p.querySelectorAll<HTMLElement>("[data-ai]:not([data-ai='shot'])")) : []));
      const shots = panels.map((p) => p?.querySelector<HTMLElement>("[data-ai='shot']") ?? null);
      const numerals = panels.map((p) => p?.querySelector<HTMLElement>("[data-parallax]") ?? null);
      const sel = stage.querySelector<HTMLElement>("[data-archive-selector]");

      Object.assign(cam, poses[0]);
      archiveState.focus.fill(0); archiveState.spin.fill(0); archiveState.pulse = 0; archiveState.arc = 0;
      gsap.set(panels.filter(Boolean), { autoAlpha: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage, start: "top top",
          end: () => `+=${Math.round(window.innerHeight * (count * (lite ? 0.95 : 1.15) + 0.6))}`,
          pin: true, scrub: lite ? 0.5 : 0.8, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (s) => {
            archiveState.progress = s.progress;
            const t = s.progress * D;
            selectProject(Math.min(count - 1, Math.max(0, Math.floor((t - SWITCH) / STRIDE)))); // no-op unless index changes
          },
          onRefresh: (s) => { archiveState.progress = s.progress; },
        },
      });

      for (let i = 0; i < count; i++) {
        const t0 = i * STRIDE;
        // camera + arc
        if (i > 0) {
          tl.fromTo(cam, { ...poses[i - 1] }, { ...poses[i], duration: 1.3, ease: "power2.inOut", immediateRender: false }, t0);
          tl.to(archiveState, { arc: 1, duration: 0.65, ease: "sine.inOut" }, t0).to(archiveState, { arc: 0, duration: 0.65, ease: "sine.inOut" }, t0 + 0.65);
        }
        // platform focus + rotation + dust
        tl.to(archiveState.focus, { [i]: 1, duration: 0.8, ease: "power2.inOut" }, t0 + (i === 0 ? 0 : 0.4));
        if (i < count - 1) tl.to(archiveState.focus, { [i]: 0.35, duration: 0.8, ease: "power2.inOut" }, t0 + STRIDE - 0.4);
        tl.fromTo(archiveState.spin, { [i]: 0 }, { [i]: Math.PI * 0.9, duration: STRIDE + 0.6, immediateRender: false }, t0);
        tl.to(archiveState, { pulse: 1, duration: 0.5, ease: "power2.out" }, t0 + 0.2).to(archiveState, { pulse: 0.3, duration: 1.2 }, t0 + 1.2);

        // panel: fade slot, text stagger (opacity + transform only), image clip reveal, numeral parallax
        const p = panels[i]; if (!p) continue;
        const inAt = t0 + 0.9;
        tl.fromTo(p, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, inAt);
        tl.fromTo(items[i], { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.09, ease: "power3.out", immediateRender: false }, inAt);
        if (shots[i]) tl.fromTo(shots[i], { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1, ease: "power3.inOut", immediateRender: false }, inAt + 0.2);
        if (numerals[i]) tl.fromTo(numerals[i], { y: 60 }, { y: -60, duration: STRIDE, immediateRender: false }, t0 + 0.6);
        if (i < count - 1) {
          const outAt = t0 + STRIDE - 0.7;
          tl.to(items[i], { autoAlpha: 0, y: -18, duration: 0.5, stagger: 0.03, ease: "power2.in" }, outAt);
          if (shots[i]) tl.to(shots[i], { clipPath: "inset(0 0% 0 100%)", duration: 0.5, ease: "power2.in" }, outAt);
          tl.to(p, { autoAlpha: 0, duration: 0.1 }, outAt + 0.55);
        }
      }
      // slow final push-in
      const last = count - 1;
      tl.to(cam, { pz: poses[last].pz - 1, fov: poses[last].fov - 2, duration: 1.2, ease: "power1.inOut" }, last * STRIDE + 2.0);
      if (sel) tl.fromTo(sel, { "--fill": 0 }, { "--fill": 1, duration: D, immediateRender: true }, 0);
      tl.set({}, {}, D);

      registerArchiveScroll((i) => {
        const st = tl.scrollTrigger; if (!st) return;
        const y = st.start + (holdAt(Math.min(i, count - 1)) / D) * (st.end - st.start);
        const l = lenisRef.current;
        if (l) l.scrollTo(y, { duration: 1.8 }); else window.scrollTo({ top: y, behavior: "smooth" });
      });
      return () => { registerArchiveScroll(null); delete stage.dataset.mode; };
    });

    const raf = requestAnimationFrame(() => ScrollTrigger.refresh()); // one re-measure after the list → stage tier swap
    return () => {
      cancelAnimationFrame(raf);
      mm.revert(); // kills tweens + ScrollTriggers, unpins
      registerArchiveScroll(null);
      selectProject(0);
      resetArchiveState();
    };
  }, [stageRef, count, lite]);

  return null;
}
