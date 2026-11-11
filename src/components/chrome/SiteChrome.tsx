"use client";
import { useCallback, useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { SCENES } from "@/lib/scenes";
import { sceneState, useActiveScene } from "@/lib/sceneState";
import { useLenis } from "@/providers/SmoothScrollProvider";
import { useAnchorScroll } from "@/hooks/useAnchorScroll";
import { onPreloaderRelease } from "@/lib/preloaderState";
import styles from "./chrome.module.css";

/** Persistent navigation, scroll-progress hairline and scene counter. Sits above every scene (z-50/60). */
export default function SiteChrome() {
  const active = useActiveScene();
  const go = useAnchorScroll();
  const lenis = useLenis();
  const lenisRef = useRef(lenis);
  lenisRef.current = lenis;
  const bar = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) btnRef.current?.focus();
  }, []);

  // Overlay open: lock page scroll (Lenis + native), make the page inert, trap focus, Esc closes, close if the viewport grows to desktop.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    lenisRef.current?.stop();
    const siblings = Array.from(document.querySelectorAll<HTMLElement>("main")); // page content goes inert; the nav + overlay stay live
    siblings.forEach((el) => el.setAttribute("inert", ""));

    const first = overlayRef.current?.querySelector<HTMLElement>("a, button");
    first?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key !== "Tab") return;
      const nodes = Array.from(overlayRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
      const all = btnRef.current ? [btnRef.current, ...nodes] : nodes;
      if (!all.length) return;
      const firstEl = all[0], lastEl = all[all.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => { if (mq.matches) close(false); };
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      siblings.forEach((el) => el.removeAttribute("inert"));
      html.style.overflow = prevOverflow;
      lenisRef.current?.start();
    };
  }, [open, close]);

  // Section links inside the overlay: close first, then glide (Lenis was stopped while open → restart happens in the cleanup above).
  const navTo = (e: MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setOpen(false);
    requestAnimationFrame(() => requestAnimationFrame(() => go(e, href)));
  };

  // Scroll progress — written straight to the DOM from GSAP's ticker (no React renders).
  useEffect(() => {
    let last = -1;
    const tick = () => {
      const p = sceneState.progress;
      if (p === last || !bar.current) return; // no style write on idle frames
      last = p;
      bar.current.style.transform = `scaleX(${p})`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  // Deep links (#scene-02) + no stale browser scroll restoration fighting the intro.
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    const id = window.location.hash.slice(1);
    if (!SCENES.some((s) => s.id === id)) return;
    // Sections swap from their server "list" markup to pinned stages after hydration, and pin spacers / fonts change the page
    // height. Jump once the pre-loader has released and fonts are in, then re-assert once layout has settled.
    const timers: number[] = [];
    const jump = () => {
      const el = document.getElementById(id);
      if (!el) return;
      ScrollTrigger.refresh();
      if (lenisRef.current) lenisRef.current.scrollTo(el, { immediate: true });
      else el.scrollIntoView();
    };
    const unsub = onPreloaderRelease(() => {
      const ready = document.fonts?.ready ?? Promise.resolve();
      ready.then(() => {
        timers.push(window.setTimeout(jump, 120));
        timers.push(window.setTimeout(jump, 900)); // layout settled (tier swap, lazy chunks): idempotent, lands on the same section
      });
    });
    return () => { unsub(); timers.forEach((t) => window.clearTimeout(t)); };
  }, []);

  // Keep the URL in sync with the current scene (no jump, no history spam).
  useEffect(() => {
    const url = active === 0 ? window.location.pathname + window.location.search : `#${SCENES[active].id}`;
    history.replaceState(null, "", url);
  }, [active]);

  return (
    <>
      <div className={styles.progress} aria-hidden="true">
        <span ref={bar} className={styles.bar} />
      </div>

      <nav aria-label="Primary" className={`${styles.nav} label-mono`} data-open={open || undefined}>
        <a href="#scene-01" className={styles.brand} onClick={(e) => go(e, "#scene-01")} aria-label="Human × Machine — back to top">
          <span className={styles.brandMark}>N/A</span>
          <span className={styles.brandText}>HUMAN <span style={{ color: "var(--c-crimson)" }}>×</span> MACHINE</span>
        </a>

        {/* ≥1024px: full scene links */}
        <ul className={styles.links}>
          {SCENES.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={styles.link}
                aria-current={SCENES[active].id === s.id ? "true" : undefined}
                onClick={(e) => go(e, `#${s.id}`)}
              >
                <i>{s.label}</i>
                <span className={styles.name}>{s.name}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.actions}>
          {/* Always-visible contact CTA (phones, tablets and desktop). */}
          <a href="#scene-06" className={styles.contactCta} onClick={(e) => go(e, "#scene-06")}>
            <span>CONTACT</span>
          </a>
          {/* <1024px: compact menu */}
          <button
            ref={btnRef}
            type="button"
            className={styles.menuBtn}
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span className={styles.burger} aria-hidden="true"><i /><i /></span>
            <span className={styles.menuText} aria-hidden="true">{open ? "CLOSE" : "MENU"}</span>
          </button>
        </div>
      </nav>

      {/* Full-screen overlay (<1024px). Rendered only while open → no cost, nothing to tab into when closed. */}
      {open && (
        <div ref={overlayRef} id={menuId} className={styles.overlay} role="dialog" aria-modal="true" aria-label="Site navigation">
          <p className={`${styles.overlayKicker} label-mono`} aria-hidden="true">SYSTEM INDEX — {String(SCENES.length).padStart(2, "0")} SCENES</p>
          <ol className={styles.overlayList}>
            {SCENES.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={styles.overlayLink}
                  aria-current={SCENES[active].id === s.id ? "true" : undefined}
                  onClick={(e) => navTo(e, `#${s.id}`)}
                >
                  <i className="label-mono">{s.label}</i>
                  <span>{s.name}</span>
                </a>
              </li>
            ))}
          </ol>
          <a href="#scene-06" className={styles.overlayCta} onClick={(e) => navTo(e, "#scene-06")}>
            <span className="label-mono">ESTABLISH CONNECTION</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      )}

      <p className={`${styles.counter} label-mono`} aria-hidden="true">
        {SCENES[active].label} / 0{SCENES.length} — {SCENES[active].name}
      </p>
    </>
  );
}
