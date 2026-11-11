# HUMAN × MACHINE — Crimson Protocol

Next.js 15 · React 19 · TypeScript · Tailwind 4 · React Three Fiber · drei · GSAP ScrollTrigger · Lenis

    npm install && npm run dev      # http://localhost:3000   (next/font needs network on first build)

## Architecture (one film, one canvas)
- `CanvasMount → PersistentCanvas`: ONE lazy, client-only R3F canvas fixed behind everything (error-boundary + context-loss safe, adaptive DPR).
- Scenes live in `components/canvas/scenes/*` and register in `scenes/index.tsx`; each reads a mutable state object (`heroState`, `aboutState`, `sceneState`) written by ScrollTrigger — no per-frame React renders.
- Sections (`components/sections/*`) are accessible HTML above the canvas, each a tall scroll-space with a sticky 100svh stage.
- `SiteChrome`: persistent nav, scroll-progress hairline, scene counter, deep links (#scene-02), URL sync.
- Hand-off: Hero dissolves into particles while the corridor fades in (`aboutState.enter`); the corridor ends as a light-path timeline (`aboutExit`, `release`) ready for the next scene.

## Add a scene
1. Add it to `lib/scenes.ts`. 2. Create `canvas/scenes/<name>/` and register by index. 3. Create `sections/<name>/` using `<Section bare>` + sticky stage.

## Integration fixes in this checkpoint
Nav moved from hero → global chrome (dead links removed) · global camera dolly removed (scenes own the camera) · scene counts/eyebrows 02 · canvas error boundary, context-loss guard, PerformanceMonitor DPR · font-load trigger refresh · deep-link + scroll-restoration handling · hero portrait preloaded · Tailwind theme circular var fixed.

## Audit notes
- GPU: all geometries/materials disposed on unmount/resize; hidden scenes skip drawing (hero after dissolve, corridor outside its range).
- GSAP: every timeline/trigger lives in a `gsap.context`/`matchMedia` reverted on unmount; Lenis driven by `gsap.ticker`.
- Textures: hero portrait WebP 1080/720 (131/65 KB), immutable cache headers.
- Reduced motion: Lenis off, no pinning/intro/morph, static corridor, all content visible.
- Not yet verified on device: run Lighthouse + a real-phone pass, tune strip brightness/fog in `about/shaders.ts`.

## Pre-loader
`components/preloader` — CRIMSON PROTOCOL boot sequence driven by real asset status (`lib/assetProgress.ts`), gated into the hero via `lib/preloaderState.ts`. See `docs/PRELOADER_HANDOFF.md`.

## Docs
Design and QA notes per scene live in `docs/` (start with `docs/PROJECT_STATE.md`).
