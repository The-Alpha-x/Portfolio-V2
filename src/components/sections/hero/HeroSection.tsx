"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import Section from "@/components/layout/Section";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/animations";
import { heroState, onHeroReady, resetHeroState, setHeroTextHeight } from "@/lib/heroState";
import { getDeviceProfile, useDeviceProfile } from "@/lib/deviceProfile";
import { isPreloaderActive, onPreloaderRelease } from "@/lib/preloaderState";
import { HERO } from "./content";
import { useAnchorScroll } from "@/hooks/useAnchorScroll";
import styles from "./hero.module.css";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Hidden until GSAP reveals it. <noscript> (see page example) restores it without JS. */
const HIDDEN = { visibility: "hidden" } as const;

export default function HeroSection() {
  const scopeRef = useRef<HTMLDivElement>(null); // display:contents wrapper = GSAP scope (includes the nav)
  const bottomRef = useRef<HTMLDivElement>(null);
  const sidesRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const [fallback, setFallback] = useState<null | "anim" | "static">(null);
  const go = useAnchorScroll();
  const profile = useDeviceProfile();

  // Static tier (weak GPU / data-saver / WebGL crashed later): show the portrait as an image. If the 3D layer dies AFTER the
  // intro already ran, the poster must appear fully visible ("static"), not wait for an animation that has played.
  useEffect(() => {
    if (profile.reason !== "server" && profile.canvas === "none") setFallback((f) => f ?? "static"); // "server" = first hydration pass, not a real verdict
  }, [profile]);

  // Tell the 3D layer how tall the text stack is so the portrait is fitted above it (never under the face).
  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const report = () => setHeroTextHeight(el.offsetHeight);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    document.fonts?.ready.then(report);
    return () => ro.disconnect();
  }, []);

  useIsoLayoutEffect(() => {
    const root = scopeRef.current;
    const section = root?.querySelector("section");
    if (!root || !section) return;
    const q = gsap.utils.selector(root);
    const reduced = prefersReducedMotion();
    const webgl = getDeviceProfile().canvas !== "none";
    resetHeroState();
    if (!webgl) setFallback(reduced ? "static" : "anim");

    const setCounter = (v: number) => {
      if (counterRef.current) counterRef.current.textContent = `${String(Math.round(v * 100)).padStart(3, "0")}%`;
    };
    const setStatus = (s: string) => {
      if (statusRef.current) statusRef.current.textContent = s;
    };

    let started = false;
    let unsub = () => {};
    let unsubGate = () => {};
    let timer = 0;
    let watchdog = 0;
    let gateTimer = 0;

    const ctx = gsap.context(() => {
      const chars = q("[data-char]");

      /* Reduced motion: everything visible, nothing moves. */
      if (reduced) {
        gsap.set(q("[data-hero-intro], [data-word]"), { autoAlpha: 1 });
        gsap.set(chars, { yPercent: 0 });
        Object.assign(heroState, { reveal: 1, eye: 1, intro: 1, scan: 0, scanAmp: 0 });
        setCounter(1);
        setStatus("ONLINE");
        // Still release the canvas once the hero has scrolled away.
        ScrollTrigger.create({
          trigger: section, start: "top top", end: "bottom top",
          onUpdate: (self) => { heroState.scroll = self.progress; },
        });
        return;
      }

      gsap.set(chars, { yPercent: 110 });

      /* Scroll-driven exit: DOM fades out, 3D portrait dissolves (heroState.scroll → shaders). */
      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.6,
            onUpdate: (self) => {
              heroState.scroll = self.progress;
            },
          },
        })
        .to(sidesRef.current, { autoAlpha: 0, ease: "none", duration: 0.2 }, 0.02)
        .to(bottomRef.current, { autoAlpha: 0, y: -80, ease: "none", duration: 0.34 }, 0.04);
    }, root);

    /* Opening sequence — runs once the portrait is on the GPU. */
    const play = () => {
      if (started || reduced) return;
      started = true;
      ctx.add(() => {
        const name = q("[data-hero-name]");
        const tl = gsap.timeline({ delay: 0.35, defaults: { ease: "power3.out" } });

        // 1. darkness → light spreading from the cybernetic eye
        tl.to(
          heroState,
          {
            reveal: 1, duration: 3.4, ease: "power2.inOut",
            onUpdate: () => setCounter(heroState.reveal),
            onComplete: () => setStatus("ONLINE"),
          },
          0
        )
          .to(heroState, { eye: 1, duration: 1.4 }, 0.4)
          .to(heroState, { intro: 1, duration: 10, ease: "power2.out" }, 0) // slow push-in
          .to(heroState, { scan: 1, duration: 2.6, ease: "power1.inOut" }, 1.6) // red scan across the face

          // 2. name — masked per-letter rise + tracking collapse
          .set(name, { autoAlpha: 1 }, 2.3)
          .fromTo(name, { letterSpacing: window.innerWidth < 480 ? "0.03em" : "0.12em" }, { letterSpacing: "-0.02em", duration: 2.4 }, 2.3)
          .to(q("[data-char]"), { yPercent: 0, duration: 1.2, ease: "power4.out", stagger: 0.05 }, 2.3)

          // 3. title — wipe in
          .fromTo(
            q("[data-hero-title]"),
            { autoAlpha: 1, clipPath: "inset(0 100% 0 0)" },
            { clipPath: "inset(0 0% 0 0)", duration: 1.2, ease: "power3.inOut" },
            3.4
          )

          // 4. headline, annotations, CTA, nav, scroll cue
          .fromTo(q("[data-word]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07 }, 3.9)
          .fromTo(q("[data-hero-side]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, stagger: 0.12 }, 4.2)
          .fromTo(q("[data-hero-cta]"), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.9 }, 4.6)
          .fromTo(q("[data-hero-scroll]"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 5.0);

        // Static-tier poster fade (the <img> only exists when there is no WebGL canvas; an empty GSAP target would just warn).
        const poster = q("[data-poster]");
        if (poster.length) tl.to(poster, { opacity: 1, duration: 3.4, ease: "power2.inOut" }, 0);

        // Failsafe: the intro normally finishes ~6.5 s after it starts. If it has not (GSAP ticker stalled, timeline killed by
        // HMR / a remount), jump to the final state so the portrait + text can never stay hidden behind a half-played intro.
        watchdog = window.setTimeout(() => {
          const nameEl = q("[data-hero-name]")[0] as HTMLElement | undefined;
          const shown = nameEl ? getComputedStyle(nameEl).visibility !== "hidden" : true;
          if (heroState.reveal >= 0.999 && heroState.eye >= 0.999 && shown) return;
          tl.progress(1);
          heroState.reveal = 1;
          heroState.eye = 1;
          setCounter(1);
          setStatus("ONLINE");
          gsap.set(q("[data-hero-intro], [data-word]"), { autoAlpha: 1 });
          gsap.set(q("[data-char]"), { yPercent: 0 });
          gsap.set(q("[data-hero-title]"), { clipPath: "inset(0 0% 0 0)" });
          if (poster.length) gsap.set(poster, { opacity: 1 });
        }, 12000);

        // Subtle recurring scan after the intro
        gsap.fromTo(
          heroState,
          { scan: 0 },
          {
            scan: 1, duration: 2.6, ease: "power1.inOut", repeat: -1, repeatDelay: 7, delay: 8.4,
            immediateRender: false, onStart: () => { heroState.scanAmp = 0.45; },
          }
        );
      });
    };

    const arm = () => {
      if (!webgl) {
        timer = window.setTimeout(play, 60);
      } else {
        unsub = onHeroReady(play);
        timer = window.setTimeout(play, 5000); // safety net: never leave the page blank
      }
    };

    if (!reduced) {
      // While the pre-loader plays, the opening sequence (and its safety net) wait for its release so the
      // light-from-the-eye reveal happens on screen, not behind the overlay.
      // IMPORTANT: the pre-loader fires this release from inside one of ITS OWN GSAP timeline callbacks, where its gsap.context is
      // the active one. Anything created synchronously here would be adopted by that context, and the pre-loader's ctx.kill()
      // (when its shutters finish) would then kill the hero's half-played intro: eye half lit, portrait never revealed, text
      // stuck hidden. Hop out of the callback first so the hero's tweens belong to the hero's own context only.
      if (isPreloaderActive()) unsubGate = onPreloaderRelease(() => { gateTimer = window.setTimeout(arm, 0); });
      else arm();
    }

    return () => {
      unsubGate();
      unsub();
      window.clearTimeout(timer);
      window.clearTimeout(watchdog);
      window.clearTimeout(gateTimer);
      ctx.revert();
      resetHeroState();
    };
  }, []);

  return (
    <div ref={scopeRef} style={{ display: "contents" }}>
      <Section id="scene-01" index={0} label="Identity initialization" bare className={styles.scrollSpace}>
        <div className={styles.stage}>
          {/* The portrait itself lives in the persistent WebGL canvas; this is its accessible description. */}
          <p className="sr-only">{HERO.portraitAlt}</p>
          <noscript>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.poster} src={HERO.fallbackSrc} alt="" aria-hidden="true" />
          </noscript>

          <div className={styles.shade} aria-hidden="true" />

          {/* Side annotations: human = creativity, machine = engineering */}
          <div ref={sidesRef} className={styles.sides}>
            {fallback && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                data-poster
                className={styles.poster}
                style={fallback === "anim" ? { opacity: 0 } : undefined}
                src={HERO.fallbackSrc}
                srcSet={HERO.fallbackSrcSet}
                sizes="(max-width: 767px) 720px, 1080px"
                width={1080}
                height={1440}
                decoding="async"
                alt=""
                aria-hidden="true"
              />
            )}
            <div data-hero-side data-hero-intro style={HIDDEN} aria-hidden="true" className={`${styles.eyebrow} label-mono`}>
              {HERO.eyebrow}
            </div>
            <div data-hero-side data-hero-intro style={HIDDEN} aria-hidden="true" className={`${styles.telemetry} label-mono`}>
              SYS.IDENTITY&nbsp;
              <span ref={counterRef} className={styles.counter}>000%</span>
              &nbsp;—&nbsp;
              <span ref={statusRef} className={styles.status}>INITIALIZING</span>
            </div>

            <div data-hero-side data-hero-intro style={HIDDEN} className={`${styles.side} ${styles.sideLeft}`}>
              <div>
                <span className={styles.sideKey}>{HERO.human.label}</span>
                <span className={`${styles.sideVal} label-mono`}>{HERO.human.sub}</span>
              </div>
              <span className={styles.rule} aria-hidden="true" />
            </div>
            <div data-hero-side data-hero-intro style={HIDDEN} className={`${styles.side} ${styles.sideRight}`}>
              <div>
                <span className={styles.sideKey}>{HERO.machine.label}</span>
                <span className={`${styles.sideVal} label-mono`}>{HERO.machine.sub}</span>
              </div>
              <span className={styles.rule} aria-hidden="true" />
            </div>
          </div>

          <div ref={bottomRef} className={styles.bottom}>
            <h1 data-hero-name data-hero-intro style={HIDDEN} className={styles.name}>
              <span className="sr-only">{HERO.name}</span>
              <span aria-hidden="true">
                {HERO.name.split(" ").map((word, wi) => (
                  <span key={wi} style={{ display: "inline-block", whiteSpace: "nowrap" }}>
                    {wi > 0 && <span className={styles.gap} />}
                    {[...word].map((ch, ci) => (
                      <span key={ci} className={styles.mask}>
                        <span data-char className={styles.char}>{ch}</span>
                      </span>
                    ))}
                  </span>
                ))}
              </span>
            </h1>

            <p data-hero-title data-hero-intro style={HIDDEN} className={styles.title}>
              <span>{HERO.title}</span>
            </p>

            <div className={styles.row}>
              <p className={styles.headline}>
                {HERO.headline.map((w) => (
                  <span key={w.text} data-word style={HIDDEN} className={`${styles.word} ${w.em ? styles.em : ""}`}>
                    {w.text}{" "}
                  </span>
                ))}
              </p>

              <a
                data-hero-cta data-hero-intro style={HIDDEN}
                href={HERO.cta.href}
                className={styles.cta}
                onClick={(e) => go(e, HERO.cta.href)}
              >
                {HERO.cta.label}
                <ArrowRight size={16} aria-hidden="true" />
              </a>

              <div data-hero-scroll data-hero-intro style={HIDDEN} aria-hidden="true" className={`${styles.scroll} label-mono`}>
                <span className={styles.scrollText}>SCROLL</span>
                <span className={styles.scrollLine} />
              </div>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
