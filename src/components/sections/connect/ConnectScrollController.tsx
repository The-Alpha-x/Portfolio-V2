"use client";
import { useEffect, type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { CAM_FINAL, CAM_START, applyConnectFinal, connectState, resetConnectState } from "@/lib/connectState";

/**
 * Scene 06 master timeline (one pinned, scrubbed stage). Units are arbitrary; the scroll distance maps onto D.
 *   0 – 2.0   machinery power drops to 25 % (sputters)          · camera starts pulling in
 *   1.4 – 3.8 environment fades into darkness, power → 0
 *   3.0 – 5.6 portrait revealed by light spreading from the eye  · 4.4 eye glow
 *   3.6       section title wipes in
 *   4.4 – 7.6 headline, staggered per letter
 *   6.0 – 8.0 contact channels, one by one
 *   7.0 – 8.0 call-to-action (then it starts pulsing: data-live)
 * Reduced motion: no pin, no scrub — the finished composition is applied directly.
 */
const D = 8.4;

export default function ConnectScrollController({ stageRef, lite = false }: { stageRef: RefObject<HTMLElement | null>; lite?: boolean }) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const mm = gsap.matchMedia();
    mm.add({ scroll: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" }, (ctx) => {
      const { scroll } = ctx.conditions as { scroll: boolean };
      connectState.reduced = !scroll;
      stage.dataset.mode = scroll ? "scroll" : "static";

      // Camera blend from Scene 05 (scroll-linked in both modes; it is position, not time-based motion).
      ScrollTrigger.create({
        trigger: stage, start: "top 60%", end: "top top", invalidateOnRefresh: true,
        onUpdate: (s) => { connectState.enter = s.progress; },
        onRefresh: (s) => { connectState.enter = s.progress; },
      });

      if (!scroll) {
        applyConnectFinal();
        return () => { delete stage.dataset.mode; };
      }

      const q = gsap.utils.selector(stage);
      const chars = q("[data-char]");
      const title = q("[data-c-title]");
      const items = q("[data-c-item]");
      const actions = q("[data-c-actions]");

      Object.assign(connectState, { power: 1, dark: 0, portrait: 0, eye: 0 });
      Object.assign(connectState.cam, CAM_START);
      gsap.set(chars, { yPercent: 110 });

      const cam = connectState.cam;
      let live = false;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: stage, start: "top top", end: () => `+=${Math.round(window.innerHeight * (lite ? 2.0 : 2.6))}`,
          pin: true, scrub: lite ? 0.5 : 0.8, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (s) => {
            const on = s.progress > 0.92;
            if (on !== live) { live = on; stage.toggleAttribute("data-live", on); }
          },
        },
      });

      tl.to(connectState, { power: 0.25, duration: 2.0, ease: "power1.inOut" }, 0)
        .to(cam, { ...CAM_FINAL, duration: 4.4, ease: "power2.inOut" }, 0)
        .to(connectState, { dark: 1, duration: 2.4, ease: "power2.inOut" }, 1.4)
        .to(connectState, { power: 0, duration: 1.6, ease: "power2.in" }, 2.2)
        .to(connectState, { portrait: 1, duration: 2.6, ease: "power2.inOut" }, 3.0)
        .to(connectState, { eye: 1, duration: 1.4, ease: "power2.out" }, 4.4)
        .fromTo(title, { autoAlpha: 0, clipPath: "inset(0 100% 0 0)" }, { autoAlpha: 1, clipPath: "inset(0 0% 0 0)", duration: 1.2, ease: "power3.inOut" }, 3.6)
        .to(chars, { yPercent: 0, duration: 1.2, ease: "power4.out", stagger: 0.045 }, 4.4)
        .fromTo(items, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.22 }, 6.0)
        .fromTo(actions, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.0, ease: "power3.out" }, 7.0)
        .set({}, {}, D);

      return () => { stage.removeAttribute("data-live"); delete stage.dataset.mode; };
    });
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => { cancelAnimationFrame(raf); mm.revert(); resetConnectState(); };
  }, [stageRef, lite]);

  return null;
}
