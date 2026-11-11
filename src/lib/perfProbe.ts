import { ScrollTrigger } from "@/lib/gsap";

/**
 * Opt-in field probe: open the site with `?perf` and read the console (or call `hmPerf()`).
 * Reports LCP, CLS, worst interaction (INP proxy), long tasks, average FPS, live ScrollTrigger count and three.js GPU resources.
 * Loaded dynamically only when the flag is present — zero cost for normal visitors.
 */
export function startPerfProbe() {
  const m = { lcp: 0, cls: 0, inp: 0, longTasks: 0, longMs: 0, frames: 0, t0: performance.now() };
  const po = (type: string, cb: (e: PerformanceEntry & Record<string, any>) => void, opts: PerformanceObserverInit = {}) => {
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => cb(e as never))).observe({ type, buffered: true, ...opts }); } catch { /* unsupported (Safari) */ }
  };
  po("largest-contentful-paint", (e) => { m.lcp = e.startTime; });
  po("layout-shift", (e) => { if (!e.hadRecentInput) m.cls += e.value; });
  po("event", (e) => { if (e.interactionId) m.inp = Math.max(m.inp, e.duration); }, { durationThreshold: 16 } as never);
  po("longtask", (e) => { m.longTasks++; m.longMs += e.duration; });
  const raf = () => { m.frames++; requestAnimationFrame(raf); };
  requestAnimationFrame(raf);

  const report = () => {
    const gl = (window as unknown as { __hmGL?: { info: { memory: { geometries: number; textures: number }; programs?: unknown[] } } }).__hmGL;
    const row = {
      "LCP ms": Math.round(m.lcp), CLS: +m.cls.toFixed(3), "worst interaction ms": Math.round(m.inp),
      "long tasks": `${m.longTasks} (${Math.round(m.longMs)} ms)`,
      "avg FPS": +(m.frames / ((performance.now() - m.t0) / 1000)).toFixed(1),
      "ScrollTriggers": ScrollTrigger.getAll().length,
      "GL geometries": gl?.info.memory.geometries, "GL textures": gl?.info.memory.textures, "GL programs": gl?.info.programs?.length,
      "JS heap MB": Math.round(((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize ?? 0) / 1048576),
      tier: document.documentElement.dataset.canvas,
    };
    console.table(row);
    return row;
  };
  (window as unknown as { hmPerf: () => unknown }).hmPerf = report;
  const id = window.setInterval(report, 8000);
  return () => window.clearInterval(id);
}
