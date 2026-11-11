"use client";
import { Fragment, useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { Globe, Layers, Plug } from "lucide-react";
import Section from "@/components/layout/Section";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/animations";
import { aboutState } from "@/lib/aboutState";
import { ABOUT, type Part } from "./content";
import styles from "./about.module.css";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
const ICONS = { layers: Layers, globe: Globe, plug: Plug } as const;

/** Splits parts into words (kept as separate spans so GSAP can reveal them one by one). */
function Words({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((part, pi) =>
        part.t.split(/(\s+)/).map((tok, ti) =>
          /^\s*$/.test(tok) ? (
            tok && <Fragment key={`${pi}-${ti}`}> </Fragment>
          ) : (
            <span key={`${pi}-${ti}`} data-ab-word className={part.em ? styles.em : undefined}>{tok}</span>
          )
        )
      )}
    </>
  );
}

/** Phase map: positions are fractions (0..1) of the pinned scroll distance. */
const PHASES = {
  desktop: { paras: [[0.1, 0.3], [0.3, 0.4], [0.4, 0.56]], cards: [0.2, 0.44, 0.52, 0.6], cardLen: 0.08, num: [0.22, 0.38], introOut: null, exit: 0.84 },
  mobile: { paras: [[0.08, 0.26], [0.26, 0.36], [0.36, 0.5]], cards: [0.58, 0.64, 0.7, 0.76], cardLen: 0.07, num: [0.6, 0.76], introOut: [0.52, 0.58], exit: 0.86 },
} as const;

export default function AboutSection() {
  const rootRef = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const section = root?.parentElement as HTMLElement | null;
    if (!root || !section) return;
    const q = gsap.utils.selector(root);
    const reduced = prefersReducedMotion();
    Object.assign(aboutState, { enter: 0, progress: 0, release: 0, reduced });

    /* ── 3D bridge: three ranges drive the corridor in every mode ── */
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: () => `top bottom+=${Math.round(window.innerHeight * 0.5)}`, // begins while the hero is still dissolving
        end: "top top",
        invalidateOnRefresh: true,
        onUpdate: (s) => { aboutState.enter = s.progress; },
        onRefresh: (s) => { aboutState.enter = s.progress; },
      });
      if (!reduced) {
        ScrollTrigger.create({
          trigger: section, start: "top top", end: "bottom bottom",
          onUpdate: (s) => { aboutState.progress = s.progress; },
          onRefresh: (s) => { aboutState.progress = s.progress; },
        });
      }
      ScrollTrigger.create({
        trigger: section, start: "bottom bottom", end: "bottom top",
        onUpdate: (s) => { aboutState.release = s.progress; },
        onRefresh: (s) => { aboutState.release = s.progress; },
      });
    }, root);

    /* ── content animation (responsive; nothing runs under reduced motion) ── */
    const mm = gsap.matchMedia(root);
    mm.add(
      {
        isDesktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
        isMobile: "(max-width: 1023px) and (prefers-reduced-motion: no-preference)",
      },
      (mctx) => {
        const desktop = !!mctx.conditions?.isDesktop;
        const T = desktop ? PHASES.desktop : PHASES.mobile;

        const content = q("[data-ab-content]")[0];
        const eyebrow = q("[data-ab-eyebrow]");
        const lines = q("[data-ab-line]");
        const intro = q("[data-ab-intro]")[0];
        const cards = q("[data-ab-card]");
        const wraps = q("[data-ab-wrap]");
        const num = q("[data-ab-num]")[0];
        const rail = q("[data-ab-rail]");

        /* A. Entrance — time-based, plays when the section arrives (not scrubbed). */
        gsap
          .timeline({
            defaults: { ease: "power3.out" },
            scrollTrigger: { trigger: section, start: "top 55%", toggleActions: "play none none reverse" },
          })
          .fromTo(eyebrow, { autoAlpha: 0, x: -16 }, { autoAlpha: 1, x: 0, duration: 0.9 }, 0)
          .fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.12, ease: "power4.out" }, 0.1);

        /* B. Pinned, scrubbed story. Timeline length = 1 = the whole pinned distance. */
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: section, start: "top top", end: "bottom bottom", scrub: 0.6 },
        });

        // Introduction: words brighten progressively, paragraph by paragraph.
        T.paras.forEach(([a, b], i) => {
          const words = q(`[data-ab-para="${i}"] [data-ab-word]`);
          const each = (b - a) / Math.max(words.length, 1);
          tl.fromTo(words, { opacity: 0.16 }, { opacity: 1, duration: each * 2.5, stagger: each }, a);
        });

        // Mobile: the text yields its space to the highlights.
        if (T.introOut) tl.to(intro, { autoAlpha: 0, y: -24, duration: T.introOut[1] - T.introOut[0], ease: "power1.in" }, T.introOut[0]);

        // Highlights: floating interface elements, revealed one after another.
        cards.forEach((card, i) => {
          tl.fromTo(
            card,
            { autoAlpha: 0, y: 36, scale: 0.94 },
            { autoAlpha: 1, y: 0, scale: 1, duration: T.cardLen, ease: "power2.out" },
            T.cards[i] ?? T.cards[T.cards.length - 1]
          );
        });

        // Experience number counts up.
        if (num) {
          const counter = { v: 0 };
          num.textContent = "0";
          tl.to(counter, { v: 5, duration: T.num[1] - T.num[0], onUpdate: () => { num.textContent = String(Math.round(counter.v)); } }, T.num[0]);
        }

        // Subtle depth: each card drifts at its own speed.
        if (desktop) {
          wraps.forEach((w, i) => {
            const d = 70 * (0.6 + 0.4 * i);
            tl.fromTo(w, { y: d }, { y: -d, duration: 1 }, 0);
          });
        }
        tl.fromTo(rail, { scaleY: 0 }, { scaleY: 1, duration: 1 }, 0);

        // Hand-off: content leaves while the corridor becomes the timeline path (3D, aboutExit).
        tl.to(content, { autoAlpha: 0, y: -70, duration: 0.1, ease: "power1.in" }, T.exit);

        /* C. Desktop mouse parallax on the floating cards (CSS vars → `translate`, never fights GSAP). */
        if (desktop && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
          const qx = gsap.quickTo(root, "--mx", { duration: 0.9, ease: "power3" });
          const qy = gsap.quickTo(root, "--my", { duration: 0.9, ease: "power3" });
          const onMove = (e: PointerEvent) => {
            qx((e.clientX / window.innerWidth - 0.5) * -1);
            qy((e.clientY / window.innerHeight - 0.5) * -1);
          };
          window.addEventListener("pointermove", onMove, { passive: true });
          return () => window.removeEventListener("pointermove", onMove);
        }
      }
    );

    return () => {
      mm.revert();
      ctx.revert();
      Object.assign(aboutState, { enter: 0, progress: 0, release: 0 });
    };
  }, []);

  return (
    <Section id="scene-02" index={1} label={ABOUT.label} bare className={styles.scrollSpace}>
      <div ref={rootRef} className={styles.stage}>
        <div className={styles.shade} aria-hidden="true" />

        <div data-ab-content className={styles.content}>
          <header className={styles.head}>
            <p data-ab-eyebrow className={`${styles.eyebrow} label-mono`}>
              <span className={styles.mark} aria-hidden="true" />
              {ABOUT.eyebrow}
            </p>
            <h2 className={styles.heading}>
              {ABOUT.heading.map((line) => (
                <span key={line} className={styles.lineMask}>
                  <span data-ab-line className={styles.lineInner}>
                    {line.endsWith(".") ? (
                      <>
                        {line.slice(0, -1)}
                        <span className={styles.dot}>.</span>
                      </>
                    ) : (
                      line
                    )}
                  </span>
                </span>
              ))}
            </h2>
          </header>

          <div data-ab-intro className={styles.intro}>
            {ABOUT.paragraphs.map((parts, i) => (
              <p key={i} data-ab-para={i} className={i === 0 ? styles.lead : styles.body}>
                <Words parts={parts} />
              </p>
            ))}
          </div>

          <ul role="list" className={styles.aside} aria-label="Highlights">
            {ABOUT.highlights.map((h, i) => {
              const Icon = "icon" in h ? ICONS[h.icon] : null;
              return (
                <li
                  key={h.id}
                  data-ab-wrap
                  className={`${styles.wrap} ${i === 0 ? styles.wide : ""} ${i === 2 ? styles.drop : ""} ${i === 3 ? styles.wide : ""}`}
                  style={{ "--depth": 10 + i * 7 } as CSSProperties}
                >
                  <div data-ab-card className={styles.card}>
                    <div className={styles.float} style={{ "--delay": `${-i * 1.7}s` } as CSSProperties}>
                      <span className={`${styles.idx} label-mono`} aria-hidden="true">{h.index}</span>
                      {"number" in h ? (
                        <>
                          <span className={styles.numRow} aria-hidden="true">
                            <span data-ab-num className={styles.num}>{h.number}</span>
                            <span className={styles.plus}>{h.suffix}</span>
                          </span>
                          <span className="sr-only">{h.sr}</span>
                        </>
                      ) : (
                        Icon && <Icon className={styles.icon} size={22} strokeWidth={1.25} aria-hidden="true" />
                      )}
                      <span className={`${styles.label} label-mono`} {...("number" in h ? { "aria-hidden": true } : {})}>{h.label}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={styles.rail} aria-hidden="true">
          <span data-ab-rail className={styles.railFill} />
        </div>
      </div>
    </Section>
  );
}
