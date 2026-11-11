import { gsap, ScrollTrigger } from "./gsap";
import { sceneState, setActiveScene } from "./sceneState";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface RevealOptions {
  y?: number;
  duration?: number;
  start?: string;
  ease?: string;
}

/** Fade-up reveal for a single element. No-op under reduced motion. Call inside a gsap context. */
export function revealOnScroll(el: Element, { y = 32, duration = 0.9, start = "top 88%", ease = "power3.out" }: RevealOptions = {}) {
  if (prefersReducedMotion()) return;
  const delay = Number((el as HTMLElement).dataset.revealDelay ?? 0);
  gsap.from(el, { autoAlpha: 0, y, duration, delay, ease, scrollTrigger: { trigger: el, start, once: true } });
}

/** Reveal every [data-reveal] inside root. */
export function revealAll(root: ParentNode, opts?: RevealOptions) {
  root.querySelectorAll("[data-reveal]").forEach((el) => revealOnScroll(el, opts));
}

/**
 * Connects one section to the shared 3D state. Call inside a gsap context.
 *
 * `refreshPriority: -1` is load-bearing. These triggers are created in <Section>'s layout effect, i.e. BEFORE the pinned
 * stages (Career, Archive, Tech, Connect) create their pin triggers in their passive effects. ScrollTrigger refreshes in
 * creation order unless told otherwise, so without a priority each section trigger is measured before the pin spacers
 * of the sections above it exist: Archive/Tech/Connect then think they start 5+ viewports too early, `sceneState.active`
 * jumps ahead while Career is still pinned, SceneSlot hides slot 2 and the scene goes black. A negative priority makes
 * every section trigger refresh AFTER all pins have added their spacing, so start/end reflect the real layout.
 */
export function createSceneTrigger(section: Element, index: number) {
  ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    refreshPriority: -1,
    onUpdate: (self) => {
      sceneState.local[index] = self.progress;
    },
  });
  ScrollTrigger.create({
    trigger: section,
    start: "top center",
    end: "bottom center",
    refreshPriority: -1,
    onToggle: (self) => {
      if (self.isActive) setActiveScene(index);
    },
  });
}

/** Whole-page progress 0..1. */
export function createGlobalProgressTrigger() {
  return ScrollTrigger.create({
    trigger: document.documentElement,
    start: 0,
    end: "max",
    onUpdate: (self) => {
      sceneState.progress = self.progress;
    },
  });
}

/** Cinematic pinned timeline helper for scenes that need scroll-scrubbing. */
export function createScrubTimeline(trigger: Element, build: (tl: gsap.core.Timeline) => void, scrollLength = "+=150%") {
  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: { trigger, start: "top top", end: scrollLength, scrub: 0.6, pin: true, anticipatePin: 1 },
  });
  build(tl);
  return tl;
}
