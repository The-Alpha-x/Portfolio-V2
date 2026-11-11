"use client";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { TECHNOLOGIES, TECH_CATEGORIES } from "@/data/technologies";
import { clearSelection, hoverTech, selectTech, techState, useTechFocus } from "@/lib/techState";
import styles from "./tech.module.css";

/**
 * Pointer layer. The canvas is pointer-events:none, so each 3D logo gets an invisible HTML button that follows its projected
 * position (written by TechnologyNode). They duplicate the real buttons in the list → aria-hidden and not tabbable. Clicking empty
 * space clears the selection. Category labels follow the hubs (decorative).
 */
export default function TechHotspots() {
  const wrap = useRef<HTMLDivElement>(null);
  const btns = useRef<(HTMLButtonElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const { focus } = useTechFocus();

  useEffect(() => {
    const tick = () => {
      const w = wrap.current; if (!w) return;
      const W = w.clientWidth, H = w.clientHeight, on = techState.enter > 0.001;
      for (let i = 0; i < TECHNOLOGIES.length; i++) {
        const b = btns.current[i]; if (!b) continue;
        const s = techState.screen[i];
        if (!on || s.on <= 0) { if (b.style.visibility !== "hidden") b.style.visibility = "hidden"; continue; }
        const d = Math.max(34, s.d);
        b.style.visibility = "visible";
        b.style.width = b.style.height = `${d}px`;
        b.style.transform = `translate3d(${(s.x * 0.5 + 0.5) * W - d / 2}px, ${(-s.y * 0.5 + 0.5) * H - d / 2}px, 0)`;
      }
      for (let c = 0; c < TECH_CATEGORIES.length; c++) {
        const l = labels.current[c]; if (!l) continue;
        const h = techState.hubScreen[c];
        if (!on || h.on <= 0) { if (l.style.visibility !== "hidden") l.style.visibility = "hidden"; continue; }
        l.style.visibility = "visible";
        l.style.transform = `translate3d(${(h.x * 0.5 + 0.5) * W + 14}px, ${(-h.y * 0.5 + 0.5) * H - 28}px, 0)`;
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div ref={wrap} className={styles.hot} aria-hidden="true" onClick={clearSelection}>
      {TECH_CATEGORIES.map((c, i) => (
        <span key={c.id} ref={(l) => { labels.current[i] = l; }} className={`${styles.hubLabel} label-mono`}>{c.subsystem}</span>
      ))}
      {TECHNOLOGIES.map((t, i) => (
        <button
          key={t.id}
          ref={(b) => { btns.current[i] = b; }}
          type="button"
          tabIndex={-1}
          className={styles.hotBtn}
          data-on={focus === t.id || undefined}
          onMouseEnter={() => hoverTech(t.id)}
          onMouseLeave={() => hoverTech(null)}
          onClick={(e) => { e.stopPropagation(); selectTech(t.id); }}
        >
          <span className={`${styles.hotName} label-mono`}>{t.name}</span>
        </button>
      ))}
    </div>
  );
}
