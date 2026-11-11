"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/animations";
import { SCENES } from "@/lib/scenes";
import { claimPreloader, releasePreloader, unclaimPreloader, preloaderState } from "@/lib/preloaderState";
import { trackAssets } from "@/lib/assetProgress";
import { getDeviceProfile } from "@/lib/deviceProfile";
import { useLenis } from "@/providers/SmoothScrollProvider";
import { BOOT_LINES, limits, PORTRAIT, PRELOADER } from "./content";
import styles from "./preloader.module.css";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Mode = "desktop" | "mobile" | "reduced";
const DOTS = ".".repeat(48);
const NAME_WORDS = PRELOADER.name.split(" ");
const hide = styles.hide;

/**
 * CRIMSON PROTOCOL — SYSTEM INITIALIZATION.
 *
 * Flow:  intro beats (black → identity → scan line → eye → ring)  ‖  real asset progress (lib/assetProgress)
 *        → boot log + ring follow the *displayed* progress → WELCOME → SYSTEM STATUS → NAME → shutters open.
 *
 * Contract with the rest of the site (see PRELOADER_HANDOFF.md):
 *   - `html[data-preloader]` = active | exit | done  (set by the inline script in layout.tsx, then by this component)
 *   - `lib/preloaderState` tells HeroSection when it may start its opening sequence.
 *   - It renders no <Canvas>; it only observes the existing one through `heroState.ready`.
 */
export default function Preloader() {
  const [gone, setGone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;

  // Lenis is created after first paint: if it appears while we are still active, stop it too.
  useEffect(() => {
    if (lenis && preloaderState.status === "active") lenis.stop();
  }, [lenis]);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const html = document.documentElement;
    const app = document.getElementById("app-shell");

    /* Deep links (#scene-03 …) and late hydration (the inline watchdog already unlocked the page) skip the intro entirely. */
    const hash = window.location.hash.slice(1);
    const deepLink = SCENES.some((s) => s.id === hash && s.id !== SCENES[0].id);
    if (deepLink || html.dataset.preloader === "expired" || preloaderState.status === "released") {
      html.dataset.preloader = "done";
      releasePreloader();
      setGone(true);
      return;
    }

    /* ───────── lock the page ───────── */
    claimPreloader();
    html.dataset.preloader = "active"; // CSS: overflow hidden + chrome animation paused
    app?.setAttribute("inert", ""); // keeps keyboard focus and assistive tech out of the hidden page
    lenisRef.current?.stop();

    const reduced = prefersReducedMotion();
    const mobile = window.matchMedia(PORTRAIT.mobileQuery).matches;
    const mode: Mode = reduced ? "reduced" : mobile ? "mobile" : "desktop";
    const desktop = mode === "desktop";

    /* ───────── DOM handles ───────── */
    const $ = <T extends HTMLElement = HTMLElement>(k: string) => root.querySelector<T>(`[data-pl="${k}"]`);
    const $$ = (k: string) => Array.from(root.querySelectorAll<HTMLElement>(`[data-pl="${k}"]`));
    const ringProg = root.querySelector<SVGCircleElement>('[data-pl="ring-prog"]');
    const percentEl = $("percent-num");
    const seqEl = $("seq");
    const bar = $("core"); // role="progressbar"
    const liveEl = $("live");
    const lineEls = $$("line");
    const say = (t: string) => {
      if (liveEl) liveEl.textContent = t;
    };

    /* ───────── real loading status ───────── */
    // The pre-loader only waits for the 3D scene when this device will actually render it (static tier → nothing to wait for).
    const webgl = getDeviceProfile().canvas !== "none";
    const tracker = trackAssets({
      portraitSrc: mobile ? PORTRAIT.mobile : PORTRAIT.desktop,
      webgl,
      stallMs: limits().assetStallMs,
      onChange: () => {}, // progress is polled by the ticker; nothing to push
    });

    /* ───────── state ───────── */
    let display = 0; // what the user sees (0..1) — chases the real progress, never passes it
    let shown = 0; // boot lines revealed so far
    let bootOn = false; // ring + log may start (after the intro reaches them)
    let introDone = false;
    let finaleStarted = false;
    let exiting = false;
    let released = false;
    let finished = false;
    let lastSay = -1;
    let holdCall: gsap.core.Tween | undefined;
    let last = performance.now();
    /** Minimum time for the ring to fill, even when everything is cached. Reduced motion: no floor. */
    const maxRate = reduced ? Infinity : mobile ? 1 / 1.0 : 1 / 1.4;

    const release = () => {
      if (released) return;
      released = true;
      html.dataset.preloader = "exit"; // unlocks scroll, resumes the site chrome animation
      app?.removeAttribute("inert");
      lenisRef.current?.start();
      root.style.pointerEvents = "none"; // the page is usable while the shutters are still opening
      releasePreloader(); // → HeroSection starts its opening sequence
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(ceiling);
      window.removeEventListener("keydown", onKey);
      gsap.ticker.remove(tick);
      tracker.stop();
      release();
      html.dataset.preloader = "done";
      setGone(true);
      holdCall?.kill();
      ctx.kill(); // stop the ambient ring rotations etc. (no revert: the overlay is being removed anyway)
    };

    /* ───────── timelines (all created inside the context → reverted on unmount) ───────── */
    let intro: gsap.core.Timeline | undefined;
    let fin: gsap.core.Timeline | undefined;
    let exit: gsap.core.Timeline | undefined;
    const lineTls: gsap.core.Timeline[] = [];

    const ctx = gsap.context(() => {
      const stage = $("stage");
      const nameChars = $$("char");

      if (reduced) {
        /* Reduced motion: no movement at all. Static HUD, real progress, instant swaps, one short fade at the end. */
        gsap.set([...$$("title"), ...$$("kicker"), ...$$("rule"), ...$$("core"), ...$$("ring"), ...$$("percent"), ...$$("hud"), ...$$("hud-item"), ...$$("skip")], { autoAlpha: 1 });
        gsap.set($$("dim"), { opacity: 0.5 });
        gsap.set($$("glow"), { opacity: 0.85 });
        gsap.set($$("title"), { letterSpacing: "0.42em" });
        bootOn = true;
        exit = gsap.timeline({ paused: true, onComplete: finish }).call(release, [], 0).to(root, { autoAlpha: 0, duration: 0.2, ease: "none" }, 0);
        return;
      }

      /* Ambient mechanical motion (killed with the context). */
      const spin = (sel: string, dir: number, dur: number) => {
        const g = $$(sel);
        if (g.length) gsap.to(g, { rotation: 360 * dir, svgOrigin: "100 100", duration: dur, ease: "none", repeat: -1 });
      };
      spin("spin-a", 1, 60);
      if (desktop) spin("spin-b", -1, 34);

      /* 1–5. black → identity → scan line → eye → ring */
      intro = gsap.timeline({
        defaults: { ease: "power2.out" },
        onComplete: () => {
          introDone = true;
          step();
        },
      });
      intro
        // 1. completely black until 0.2 s
        // 2. CRIMSON PROTOCOL identity
        .fromTo($$("title"), { autoAlpha: 0, letterSpacing: "0.9em" }, { autoAlpha: 1, letterSpacing: "0.42em", duration: 1.1, ease: "power3.out" }, 0.2)
        .fromTo($$("kicker"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8 }, 0.55)
        .fromTo($$("rule"), { autoAlpha: 1, scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "power3.inOut" }, 0.4)
        .fromTo($$("hud"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0.5)
        .fromTo($$("hud-item"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: 0.07 }, 0.55)
        .fromTo($$("skip"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, 0.7);

      // 3. thin red scan line sweeps the screen (desktop; mobile gets the lens-only effect below)
      if (desktop) {
        intro
          .fromTo($$("scan"), { autoAlpha: 1, y: 0 }, { y: () => window.innerHeight, duration: 1.15, ease: "power1.inOut" }, 0.8)
          .to($$("scan"), { autoAlpha: 0, duration: 0.2, ease: "none" }, 1.95);
      }

      // 4. illuminate the cybernetic eye
      intro
        .fromTo($$("core"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, desktop ? 1.15 : 0.7)
        .fromTo($$("lens"), { scale: 0.92 }, { scale: 1, duration: 0.9, ease: "power3.out" }, desktop ? 1.15 : 0.7);
      if (desktop) {
        // ignition flicker, then steady
        const flicker = gsap.timeline({ defaults: { ease: "none" } });
        flicker
          .set($$("glow"), { opacity: 0 })
          .to($$("glow"), { opacity: 1, duration: 0.3 })
          .to($$("glow"), { opacity: 0.35, duration: 0.07 })
          .to($$("glow"), { opacity: 1, duration: 0.1 })
          .to($$("glow"), { opacity: 0.7, duration: 0.05 })
          .to($$("glow"), { opacity: 1, duration: 0.25 });
        intro.add(flicker, 1.5);
      } else {
        intro.fromTo($$("glow"), { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.in" }, 0.95);
      }
      intro.to($$("dim"), { opacity: 0.5, duration: 0.9, ease: "power2.inOut" }, desktop ? 1.9 : 1.2);

      // 5. circular indicator draws in; the boot log + progress start from here
      intro
        .fromTo($$("ring"), { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.7, ease: "power3.out" }, desktop ? 1.35 : 0.8)
        .fromTo($$("percent"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, desktop ? 1.75 : 1.1)
        .call(() => {
          bootOn = true;
        }, [], desktop ? 1.8 : 1.15)
        .set({}, {}, desktop ? 2.2 : 1.5); // timeline end = intro complete

      /* 6. boot messages, one by one (each plays when the displayed progress reaches its threshold) */
      lineEls.forEach((li) => {
        const label = li.querySelector<HTMLElement>("[data-pl='label']");
        const leader = li.querySelector<HTMLElement>("[data-pl='leader']");
        const state = li.querySelector<HTMLElement>("[data-pl='state']");
        const tl = gsap.timeline({ paused: true });
        tl.set(li, { autoAlpha: 1 });
        if (label) tl.fromTo(label, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.4, ease: "steps(14)" }, 0);
        if (leader) tl.fromTo(leader, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: "none" }, 0.25);
        if (state) tl.fromTo(state, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0.5).fromTo(state, { textShadow: "0 0 14px rgb(255 38 56 / 0.9)" }, { textShadow: "0 0 0 rgb(255 38 56 / 0)", duration: 0.5, ease: "power2.out" }, 0.5);
        lineTls.push(tl);
      });

      /* 8–9. SYSTEM STATUS: OPERATIONAL → name */
      fin = gsap.timeline({ paused: true, defaults: { ease: "power3.out" }, onComplete: startExit });
      fin
        .to($$("log"), { autoAlpha: 0, duration: 0.35, ease: "power1.in" }, 0.6)
        .to($$("glow"), { opacity: 1, duration: 0.3 }, 0.6)
        .to($$("dim"), { opacity: 0.25, duration: 0.8, ease: "power2.inOut" }, 0.6)
        .fromTo($$("status-line"), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.75)
        .set($$("name"), { autoAlpha: 1 }, 1.0)
        .fromTo($$("name"), { letterSpacing: "0.12em" }, { letterSpacing: "0.02em", duration: 1.2 }, 1.0)
        .fromTo(nameChars, { yPercent: 110 }, { yPercent: 0, duration: 0.9, ease: "power4.out", stagger: 0.04 }, 1.0)
        .to({}, { duration: 0.4 }); // hold on the name

      /* 10. transition into the hero: HUD out → shutters part (desktop) / dissolve (mobile) */
      exit = gsap.timeline({ paused: true, onComplete: finish });
      if (desktop) {
        exit
          .to(stage, { autoAlpha: 0, duration: 0.45, ease: "power1.in" }, 0)
          .call(release, [], 0.3) // hero opening sequence starts as the doors begin to part
          .to($$("edge"), { autoAlpha: 1, duration: 0.2, ease: "none" }, 0.3)
          .to($$("shutter-top"), { yPercent: -100, duration: 0.95, ease: "power4.inOut" }, 0.4)
          .to($$("shutter-bottom"), { yPercent: 100, duration: 0.95, ease: "power4.inOut" }, 0.4);
      } else {
        exit
          .to(stage, { autoAlpha: 0, duration: 0.35, ease: "power1.in" }, 0)
          .call(release, [], 0.2)
          .to(root, { autoAlpha: 0, duration: 0.6, ease: "power1.inOut" }, 0.25);
      }
    }, root);

    function startExit() {
      if (exiting || finished) return;
      exiting = true;
      say(`${PRELOADER.statusLabel} ${PRELOADER.statusValue}`);
      exit?.play(0);
    }

    /** Skip / Escape / hard ceiling: abandon the sequence and go straight to the transition. */
    function skip() {
      if (exiting || finished) return;
      intro?.pause();
      fin?.pause();
      exit?.timeScale(mode === "reduced" ? 1 : 1.6);
      startExit();
    }

    /* ───────── progress + log driver (one gsap.ticker callback; no React renders) ───────── */
    const reveal = (i: number) => {
      const li = lineEls[i];
      if (!li) return;
      if (BOOT_LINES[i]?.id === "visual" && tracker.status("scene") !== "ready") {
        const st = li.querySelector<HTMLElement>("[data-pl='state']");
        if (st) st.textContent = "FALLBACK"; // WebGL unavailable / timed out: be honest about it
      }
      if (reduced) gsap.set(li, { autoAlpha: 1 });
      else lineTls[i]?.play(0);
      if (seqEl) seqEl.textContent = `${String(Math.min(i + 1, BOOT_LINES.length + 1)).padStart(2, "0")}/05`;
    };

    const paint = () => {
      const pct = Math.round(display * 100);
      if (ringProg) ringProg.style.strokeDashoffset = String(100 - display * 100);
      if (percentEl) percentEl.textContent = `${String(pct).padStart(3, "0")}%`;
      if (bar) bar.setAttribute("aria-valuenow", String(pct));
      const band = Math.floor(pct / 25);
      if (band !== lastSay && band < 4) {
        lastSay = band;
        say(`System initialization ${band * 25} percent.`);
      }
    };

    function step() {
      if (finaleStarted || exiting || (!reduced && !introDone)) return;
      if (display < 1 || shown <= BOOT_LINES.length) return;
      finaleStarted = true;
      say(`${PRELOADER.welcome} ${PRELOADER.statusLabel} ${PRELOADER.statusValue}. ${PRELOADER.name}.`);
      if (reduced) {
        gsap.set($$("log"), { autoAlpha: 0 });
        gsap.set([...$$("status-line"), ...$$("name")], { autoAlpha: 1 });
        gsap.set($$("char"), { yPercent: 0 });
        gsap.set($$("dim"), { opacity: 0.25 });
        holdCall = gsap.delayedCall(0.6, startExit); // brief read time, then a short fade
      } else fin?.play(0);
    }

    function tick() {
      const now = performance.now();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!bootOn || finaleStarted || exiting) return;

      const target = tracker.progress();
      if (display < target) {
        const diff = target - display;
        const eased = diff * (1 - Math.exp(-7 * dt));
        display = diff < 0.002 ? target : Math.min(target, display + Math.min(Math.max(eased, 0.0004), maxRate * dt));
        paint();
      }
      while (shown < BOOT_LINES.length && display >= BOOT_LINES[shown].at - 1e-6) reveal(shown++);
      if (shown === BOOT_LINES.length && display >= 1) {
        reveal(shown++); // "WELCOME, HUMAN."
        step();
      }
    }
    gsap.ticker.add(tick);
    if (reduced) tick();

    /* ───────── escape hatches ───────── */
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") skip();
    }
    window.addEventListener("keydown", onKey);
    const skipBtn = $("skip");
    const onSkip = () => skip();
    skipBtn?.addEventListener("click", onSkip);
    // Last resort: whatever happens above, never keep the visitor behind the pre-loader.
    const ceiling = window.setTimeout(skip, limits().hardCeilingMs);

    return () => {
      window.clearTimeout(ceiling);
      window.removeEventListener("keydown", onKey);
      skipBtn?.removeEventListener("click", onSkip);
      gsap.ticker.remove(tick);
      tracker.stop();
      holdCall?.kill();
      ctx.revert(); // kills every timeline/tween created above
      if (!released) {
        // unmounted before releasing (StrictMode double-invoke, HMR): leave the page unlocked and unclaimed
        html.dataset.preloader = "done";
        app?.removeAttribute("inert");
        lenisRef.current?.start();
        unclaimPreloader();
      }
    };
  }, []);

  if (gone) return null;

  const lens = { "--zoom": PORTRAIT.zoom, "--ex": PORTRAIT.eye.x, "--ey": PORTRAIT.eye.y } as CSSProperties;

  return (
    <div ref={rootRef} data-preloader-root className={styles.root} aria-busy="true">
      {/* closed shutters = the full-screen black background */}
      <div data-pl="shutter-top" className={`${styles.shutter} ${styles.shutterTop}`}>
        <span data-pl="edge" className={styles.edge} />
      </div>
      <div data-pl="shutter-bottom" className={`${styles.shutter} ${styles.shutterBottom}`}>
        <span data-pl="edge" className={styles.edge} />
      </div>

      <div data-pl="stage" className={styles.stage}>
        <i data-pl="scan" className={`${styles.scan} ${hide}`} aria-hidden="true" />

        {/* HUD */}
        <div data-pl="hud" className={`${styles.hud} ${hide}`} aria-hidden="true">
          <i data-pl="hud-item" className={`${styles.corner} ${styles.cTL}`} />
          <i data-pl="hud-item" className={`${styles.corner} ${styles.cTR}`} />
          <i data-pl="hud-item" className={`${styles.corner} ${styles.cBL}`} />
          <i data-pl="hud-item" className={`${styles.corner} ${styles.cBR}`} />
          <span data-pl="hud-item" className={`${styles.tele} ${styles.tTL}`}>SYS.BOOT <b>●</b></span>
          <span data-pl="hud-item" className={`${styles.tele} ${styles.tTR}`}>HUMAN × MACHINE</span>
          <span data-pl="hud-item" className={`${styles.tele} ${styles.tBL}`}>SEQ <span data-pl="seq">00/05</span></span>
          <i data-pl="hud-item" className={`${styles.ruler} ${styles.rL}`} />
          <i data-pl="hud-item" className={`${styles.ruler} ${styles.rR}`} />
        </div>

        {/* identity */}
        <header className={styles.identity}>
          <span data-pl="kicker" className={`${styles.kicker} ${hide}`}>{PRELOADER.kicker}</span>
          <p data-pl="title" className={`${styles.brand} ${hide}`}>
            CRIMSON <b>PROTOCOL</b>
          </p>
          <span data-pl="rule" className={`${styles.idRule} ${hide}`} aria-hidden="true" />
        </header>

        {/* core: portrait close-up (the existing hero asset) inside a circular mechanical indicator */}
        <div
          data-pl="core"
          className={`${styles.core} ${hide}`}
          role="progressbar"
          aria-label="System initialization"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
        >
          <div data-pl="lens" className={styles.lens}>
            <div className={styles.lensInner} style={lens}>
              {/* Reuses the hero portrait: same URL as the <link rel="preload"> tags → already cached by the time this paints. */}
              <picture className={styles.lensPic}>
                <source media={PORTRAIT.mobileQuery} srcSet={PORTRAIT.mobile} type="image/webp" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className={styles.lensImg} src={PORTRAIT.desktop} alt="" aria-hidden="true" decoding="async" fetchPriority="high" draggable={false} />
              </picture>
              <div data-pl="dim" className={styles.lensDim} />
              <div data-pl="glow" className={styles.eyeGlow} />
              <div className={styles.lensScan} />
            </div>
          </div>

          <div data-pl="ring" className={hide} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
            <svg className={styles.ring} viewBox="0 0 200 200">
              <g data-pl="spin-a">
                <circle className={styles.ringTicks} cx="100" cy="100" r="95" pathLength="360" strokeDasharray="0.6 4.4" />
              </g>
              <g data-pl="spin-b">
                <circle className={styles.ringArcs} cx="100" cy="100" r="88" pathLength="360" strokeDasharray="70 20" />
              </g>
              <circle className={styles.ringTrack} cx="100" cy="100" r="80" />
              <circle data-pl="ring-prog" className={styles.ringProg} cx="100" cy="100" r="80" pathLength="100" transform="rotate(-90 100 100)" />
              <path className={styles.ringNotch} d="M100 12v9M100 179v9M12 100h9M179 100h9" />
            </svg>
          </div>

          <p data-pl="percent" className={`${styles.percent} ${hide}`} aria-hidden="true">
            <span>INITIALIZING</span>
            <span data-pl="percent-num" className={styles.percentNum}>000%</span>
          </p>
        </div>

        {/* boot log ⇄ final status + name */}
        <div className={styles.bottom}>
          <ul data-pl="log" className={styles.log} aria-hidden="true">
            {BOOT_LINES.map((l) => (
              <li key={l.id} data-pl="line" className={styles.line}>
                <span data-pl="label" className={styles.label}>{l.label}</span>
                <span data-pl="leader" className={styles.leader}>{DOTS}</span>
                <span data-pl="state" className={styles.state}>{l.status}</span>
              </li>
            ))}
            <li data-pl="line" className={`${styles.line} ${styles.welcome}`}>
              <span data-pl="label" className={styles.label}>{PRELOADER.welcome}</span>
            </li>
          </ul>

          <div className={styles.finale} aria-hidden="true">
            <p data-pl="status-line" className={`${styles.statusLine} ${hide}`}>
              {PRELOADER.statusLabel} <strong>{PRELOADER.statusValue}</strong>
            </p>
            <p data-pl="name" className={`${styles.name} ${hide}`}>
              {NAME_WORDS.map((word, wi) => (
                <span key={wi} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                  {wi > 0 && <span className={styles.gap} />}
                  {[...word].map((ch, ci) => (
                    <span key={ci} className={styles.mask}>
                      <span data-pl="char" className={styles.char}>{ch}</span>
                    </span>
                  ))}
                </span>
              ))}
            </p>
          </div>
        </div>

        <button data-pl="skip" type="button" className={`${styles.skip} ${hide}`}>
          {PRELOADER.skip} <kbd aria-hidden="true">ESC</kbd>
        </button>
      </div>

      {/* Accessible status: polite live region, updated at 25 % steps and on completion (not every frame). */}
      <p data-pl="live" role="status" aria-live="polite" className="sr-only">
        Initializing system, 0 percent.
      </p>
    </div>
  );
}
