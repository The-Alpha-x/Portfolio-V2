"use client";
import { useEffect, useMemo } from "react";
import { TECH_CATEGORIES, techsIn } from "@/data/technologies";
import { resetFocus, selectTech, useTechFocus } from "@/lib/techState";
import { getLogo } from "./techIcons";
import TechHeading from "./TechHeading";
import { TechDetailBody } from "./TechnologyInformationPanel";
import styles from "./tech.module.css";

const VB = { w: 360, h: 176 };

/**
 * Compact neural-network visualisation for the list tier: root → 5 category hubs → 20 nodes. Deliberately small — no relays, no
 * particles, no camera. Pure SVG + CSS (no WebGL), decorative (aria-hidden); the buttons below are the accessible controls.
 */
function MiniNetwork() {
  const { selected, related } = useTechFocus();
  const net = useMemo(() => {
    const hubs = TECH_CATEGORIES.map((c, i) => ({ c, x: 56 + i * 64, y: i % 2 ? 98 : 80 }));
    const dots = hubs.flatMap((h) => {
      const list = techsIn(h.c.id);
      const r = list.length > 6 ? 36 : 24;
      return list.map((t, j) => {
        const a = (-90 + (j * 360) / list.length) * (Math.PI / 180);
        return { id: t.id, hx: h.x, hy: h.y, x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r };
      });
    });
    return { hubs, dots };
  }, []);
  const trunk = `M12 ${VB.h / 2 - 8} L${net.hubs.map((h) => `${h.x} ${h.y}`).join(" L")}`;
  return (
    <svg className={styles.mini} viewBox={`0 0 ${VB.w} ${VB.h}`} aria-hidden="true" focusable="false">
      <path d={trunk} className={styles.miniTrunk} />
      <path d={trunk} className={styles.miniFlow} />
      {net.dots.map((d) => (
        <line key={`l-${d.id}`} x1={d.hx} y1={d.hy} x2={d.x} y2={d.y} className={styles.miniLine} data-active={selected === d.id || related.has(d.id) || undefined} />
      ))}
      <circle cx={12} cy={VB.h / 2 - 8} r={5} className={styles.miniRoot} />
      {net.hubs.map((h) => <rect key={h.c.id} x={h.x - 5} y={h.y - 5} width={10} height={10} className={styles.miniHub} />)}
      {net.dots.map((d) => (
        <circle key={d.id} cx={d.x} cy={d.y} r={selected === d.id ? 5 : 3.2} className={styles.miniDot} data-active={selected === d.id || undefined} data-related={related.has(d.id) || undefined} />
      ))}
    </svg>
  );
}

/** Simplified mobile / no-WebGL / low-power / SSR layout: no 3D, no pin. Tap a tile to read its description, projects and connections. */
export default function TechList() {
  const { selected } = useTechFocus();
  useEffect(() => () => resetFocus(), []);
  return (
    <div className={styles.list} data-tech-mode="list">
      <TechHeading />
      <MiniNetwork />
      {TECH_CATEGORIES.map((c) => {
        const items = techsIn(c.id);
        const openHere = items.find((t) => t.id === selected) ?? null;
        return (
          <section key={c.id} aria-labelledby={`tl-${c.id}`} className={styles.listGroup}>
            <h3 id={`tl-${c.id}`} className={`${styles.groupTitle} label-mono`}>{c.label}<span className={styles.groupCount}>{String(items.length).padStart(2, "0")}</span></h3>
            <ul className={styles.tiles}>
              {items.map((t) => {
                const Icon = getLogo(t.icon); const isOpen = selected === t.id;
                return (
                  <li key={t.id}>
                    <button type="button" className={styles.tile} aria-expanded={isOpen} aria-controls={`td-${t.id}`} onClick={() => selectTech(t.id)}>
                      <Icon size={22} aria-hidden /> <span>{t.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {/* Details open BELOW the grid (tiles never move under the finger) and are announced politely. */}
            <div aria-live="polite" className={styles.detailSlot}>
              {openHere && <div id={`td-${openHere.id}`} className={styles.tileDetail}><TechDetailBody tech={openHere} /></div>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
