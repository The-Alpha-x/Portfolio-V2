"use client";
import { useEffect, useRef, type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { careerState, resetCareerState } from "@/lib/careerState";
import { selectCareer } from "@/lib/careerSelection";
import { registerCareerScroll } from "@/lib/careerScroll";
import { nodePose, overviewPose } from "@/components/canvas/scenes/career/careerConfig";
import { useLenis } from "@/providers/SmoothScrollProvider";

// Passive effect on purpose: this component is a CHILD of the stage element, and React attaches a parent's ref only after
// its children's layout effects have run — a layout effect here would see `stageRef.current === null` on mount, return
// early and never build the ScrollTriggers (deps never change, so it never retries). Passive effects run after refs attach.
const useIsoLayoutEffect = useEffect;

/**
 * Master timeline, in abstract time units (1 unit = D⁄… of the pinned scroll distance). Everything is positioned on ONE
 * scrubbed timeline; nothing here is wall-clock time.
 *   0 ─ 2.2   overview → node 0 (camera, arc)          9.2 ─ 11.4  node 1 → node 2
 *   1.4 ─ 2.4 node 0 ignites                            10.6 ─ 11.6 node 2 ignites
 *   2.1 ─ 4.2 info 0 in / hold / out                    11.4 ─ 14   info 2 in, hold, slow push-in
 *   4.4 ─ 6.6 node 0 → node 1, link 0 energises        (info 1: in 6.6, out 9.0)
 */
const D = 14;
const HOLD = [3.0, 7.8, 12.6]; // time of each entry's "reading" hold — used by goToCareer
const PANEL_IN = [2.1, 6.6, 11.4];
const PANEL_OUT = [4.2, 9.0]; // last panel stays
const SWITCH = [5.5, 10.3]; // times at which the HTML selection moves to entry 1 / 2

interface Props {
  /** The pinned stage element; contains [data-career-panel] slots and [data-career-spine]. */
  stageRef: RefObject<HTMLElement | null>;
  count: number;
  /** Tablet tier: shorter pin distance, lighter scrub. */
  lite?: boolean;
}

/** Headless controller. GSAP writes `careerState`; React Three Fiber reads it in useFrame. No React state per frame. */
export default function CareerScrollController({ stageRef, count, lite = false }: Props) {
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  useIsoLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const mm = gsap.matchMedia();

    mm.add(
      {
        scroll: "(prefers-reduced-motion: no-preference)",
        reduced: "(prefers-reduced-motion: reduce)",
      },
      (ctx) => {
        const { scroll } = ctx.conditions as { scroll: boolean; reduced: boolean };
        const small = false; // <768px never reaches this controller (list tier); `small` kept for pose lookups
        const poses = Array.from({ length: count }, (_, i) => nodePose(i, count, small));
        const overview = overviewPose(small);
        const cam = careerState.cam;
        careerState.reduced = !scroll;
        stage.dataset.mode = scroll ? "scroll" : "static";

        /* ── A. Entry blend: shared camera → career rig (all modes). Ends exactly when the pin starts. ── */
        const entry = ScrollTrigger.create({
          trigger: stage,
          start: "top 90%",
          end: "top top",
          invalidateOnRefresh: true,
          onUpdate: (s) => { careerState.enter = s.progress; },
          onRefresh: (s) => { careerState.enter = s.progress; },
        });
        careerState.enter = entry.progress; // correct from the first frame (StrictMode remount / deep link / reload mid-page)

        /* ── B2. Static / reduced-motion: no pin, no scrub — selection poses the rig directly. ── */
        if (!scroll) {
          const apply = (i: number) => {
            Object.assign(cam, poses[i]);
            careerState.focus.forEach((_, j) => (careerState.focus[j] = j === i ? 1 : j < i ? 0.4 : 0));
            careerState.link.forEach((_, j) => (careerState.link[j] = j < i ? 1 : 0));
            careerState.arc = 0;
            careerState.pulse = 0.4;
          };
          apply(careerState.active);
          registerCareerScroll((i) => { selectCareer(i); apply(careerState.active); });
          return () => {
            registerCareerScroll(null);
            delete stage.dataset.mode;
          };
        }

        /* ── B1. Scroll mode: one pinned, scrubbed master timeline. ── */
        const panels = Array.from({ length: count }, (_, i) => stage.querySelector<HTMLElement>(`[data-career-panel="${i}"]`));
        const items = panels.map((p) => (p ? Array.from(p.querySelectorAll<HTMLElement>("[data-ci]:not([data-ci='divider'])")) : []));
        const dividers = panels.map((p) => p?.querySelector<HTMLElement>("[data-ci='divider']") ?? null);
        const spine = stage.querySelector<HTMLElement>("[data-career-spine]");

        Object.assign(cam, overview);
        careerState.focus.fill(0);
        careerState.link.fill(0);
        careerState.pulse = 0;
        careerState.arc = 0;
        gsap.set(panels.filter(Boolean), { autoAlpha: 0 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            end: () => `+=${Math.round(window.innerHeight * (lite ? 4 : 5))}`,
            pin: true,
            scrub: lite ? 0.5 : 0.8,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (s) => {
              careerState.progress = s.progress;
              const t = s.progress * D;
              selectCareer(t < SWITCH[0] ? 0 : t < SWITCH[1] ? 1 : 2); // no-op unless the index changes
            },
            onRefresh: (s) => { careerState.progress = s.progress; },
          },
        });

        const move = (from: typeof overview, to: typeof overview, at: number, dur: number) =>
          tl.fromTo(cam, { ...from }, { ...to, duration: dur, ease: "power2.inOut", immediateRender: false }, at);
        const arc = (at: number, dur: number) =>
          tl.to(careerState, { arc: 1, duration: dur / 2, ease: "sine.inOut" }, at)
            .to(careerState, { arc: 0, duration: dur / 2, ease: "sine.inOut" }, at + dur / 2);
        const to = (obj: object, vars: gsap.TweenVars, at: number) => tl.to(obj, { ease: "power2.inOut", ...vars }, at);

        // Camera: overview → n0 (arc) · hold · n0 → n1 · hold · n1 → n2 · slow final push-in
        move(overview, poses[0], 0, 2.2); arc(0, 2.2);
        if (count > 1) { move(poses[0], poses[1], 4.4, 2.2); arc(4.4, 2.2); }
        if (count > 2) {
          move(poses[1], poses[2], 9.2, 2.2); arc(9.2, 2.2);
          move(poses[2], { ...poses[2], pz: poses[2].pz - 1, fov: poses[2].fov - 2 }, 12.4, 1.6);
        }

        // Node activation (inactive nodes stay visible: unvisited 0, visited 0.4)
        to(careerState.focus, { 0: 1, duration: 1 }, 1.4);
        to(careerState.focus, { 0: 0.4, duration: 1 }, 4.4);
        if (count > 1) { to(careerState.focus, { 1: 1, duration: 1 }, 5.8); to(careerState.focus, { 1: 0.4, duration: 1 }, 9.2); }
        if (count > 2) to(careerState.focus, { 2: 1, duration: 1 }, 10.6);

        // Connections energise while the camera travels
        to(careerState.link, { 0: 1, duration: 1.8 }, 4.4);
        if (count > 2) to(careerState.link, { 1: 1, duration: 1.8 }, 9.2);

        // Particle activity: non-overlapping ramps around each arrival
        const pulse = (v: number, at: number, dur: number) => to(careerState, { pulse: v, duration: dur }, at);
        pulse(1, 1.6, 0.8); pulse(0.3, 3.0, 1.0); pulse(0.8, 5.0, 1.2); pulse(1, 6.2, 0.5); pulse(0.3, 7.6, 1.0);
        pulse(0.8, 9.8, 1.2); pulse(1, 11.2, 0.5); pulse(0.45, 12.6, 1.4);

        // Selector spine fills in step with the camera (CSS variable, no React)
        if (spine) {
          tl.fromTo(spine, { "--fill": 0 }, { "--fill": 0.5, duration: 2.2, ease: "power2.inOut", immediateRender: true }, 4.4);
          tl.to(spine, { "--fill": 1, duration: 2.2, ease: "power2.inOut" }, 9.2);
        }

        // Text: opacity + transform only, staggered per panel (no per-character splitting)
        for (let i = 0; i < count; i++) {
          const p = panels[i];
          if (!p) continue;
          tl.fromTo(p, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, PANEL_IN[i]);
          tl.fromTo(items[i], { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.09, ease: "power3.out", immediateRender: false }, PANEL_IN[i]);
          if (dividers[i]) tl.fromTo(dividers[i], { scaleX: 0, transformOrigin: "left center" }, { scaleX: 1, duration: 0.9, ease: "power3.out", immediateRender: false }, PANEL_IN[i] + 0.25);
          if (i < PANEL_OUT.length) {
            tl.to(items[i], { autoAlpha: 0, y: -18, duration: 0.5, stagger: 0.03, ease: "power2.in" }, PANEL_OUT[i]);
            if (dividers[i]) tl.to(dividers[i], { scaleX: 0, duration: 0.4, ease: "power2.in" }, PANEL_OUT[i]);
            tl.to(p, { autoAlpha: 0, duration: 0.1 }, PANEL_OUT[i] + 0.55);
          }
        }
        tl.set({}, {}, D); // pad: timeline duration is exactly D

        // "Go to entry i" → scroll to that entry's reading hold (Lenis when present).
        registerCareerScroll((i) => {
          const st = tl.scrollTrigger;
          if (!st) return;
          const y = st.start + (HOLD[Math.min(i, HOLD.length - 1)] / D) * (st.end - st.start);
          const l = lenisRef.current;
          // Glide time follows the distance in timeline units: one hop ≈ the authored 2.2-unit travel (≈2.4 s), two hops ≈ 3.6 s —
          // the camera always travels node-to-node instead of whipping across the whole rig in a fixed 1.8 s.
          const hops = Math.abs(y - window.scrollY) / ((st.end - st.start) * (2.2 / D));
          if (l) l.scrollTo(y, { duration: Math.min(3.6, Math.max(1.2, 1.2 + hops * 1.2)) });
          else window.scrollTo({ top: y, behavior: "smooth" });
        });

        return () => {
          registerCareerScroll(null);
          delete stage.dataset.mode;
        };
      }
    );

    // One refresh after the tier swap (server list → pinned stage) so downstream trigger positions are re-measured.
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(raf);
      mm.revert(); // kills tweens + ScrollTriggers created above and unpins
      registerCareerScroll(null);
      selectCareer(0); // notify React first, then reset the mutable bridge
      resetCareerState();
    };
    // Built once per mount; matchMedia rebuilds on breakpoint / reduced-motion changes. No refresh loops.
  }, [stageRef, count, lite]);

  return null;
}
