import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/** Register plugins exactly once. Always import gsap from here, never from "gsap". */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
  // Mobile browsers resize the viewport as the URL bar shows/hides; without this every swipe re-measures all triggers (jank, jumps).
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: "power3.out", duration: 0.9 });
}

export { gsap, ScrollTrigger };
