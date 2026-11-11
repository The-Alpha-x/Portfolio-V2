"use client";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { categoryOf, connectedTo, projectsOf, techById, type Technology } from "@/data/technologies";
import { clearSelection, selectProject, selectTech, techState, useTechFocus } from "@/lib/techState";
import { getLogo } from "./techIcons";
import styles from "./tech.module.css";

/** Name · category · description · project references · connected technologies. No proficiency numbers, no invented associations. */
export function TechDetailBody({ tech, interactive = true }: { tech: Technology; interactive?: boolean }) {
  const { project } = useTechFocus();
  const Icon = getLogo(tech.icon);
  const projects = projectsOf(tech.id);
  const connected = connectedTo(tech.id);
  return (
    <div className={styles.detail}>
      <p className={`${styles.detailCat} label-mono`}>{categoryOf(tech.category).label}</p>
      <h3 className={styles.detailName}><Icon size={22} aria-hidden /> <span>{tech.name}</span></h3>
      <p className={styles.detailText}>{tech.description}</p>
      {projects.length > 0 && (
        <>
          <p className={`${styles.sub} label-mono`}>USED IN{interactive ? " — SELECT TO TRACE" : ""}</p>
          <ul className={styles.used}>
            {projects.map((p) => (
              <li key={p.id}>
                {interactive ? (
                  <button type="button" aria-pressed={project === p.id} title={p.note} onClick={() => selectProject(p.id)}>{p.name}</button>
                ) : <span title={p.note}>{p.name}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {connected.length > 0 && (
        <>
          <p className={`${styles.sub} label-mono`}>CONNECTED</p>
          <ul className={styles.used}>
            {connected.map((c) => {
              const t = techById(c.id);
              if (!t) return null;
              return (
                <li key={c.id}>
                  {interactive ? <button type="button" title={c.via} onClick={() => selectTech(c.id)}>{t.name}</button> : <span title={c.via}>{t.name}</span>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/** Right-hand HUD. Idle: live network status. Hover: preview. Click/Enter: locked details with project tracing. */
export default function TechnologyInformationPanel() {
  const { selected, hover } = useTechFocus();
  const tech = techById(selected) ?? techById(hover);
  const locked = !!techById(selected);
  const nodesRef = useRef<HTMLSpanElement>(null);
  const linksRef = useRef<HTMLSpanElement>(null);

  // live counters straight from the 3D state — textContent only, no React renders
  useEffect(() => {
    let n = 0;
    const tick = () => {
      if (++n % 6) return;
      const o = techState.online;
      if (nodesRef.current) nodesRef.current.textContent = `${String(o.nodes).padStart(2, "0")} / ${String(o.nodesTotal).padStart(2, "0")}`;
      if (linksRef.current) linksRef.current.textContent = `${String(o.links).padStart(2, "0")} / ${String(o.linksTotal || 0).padStart(2, "0")}`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <aside id="tech-detail" className={styles.info} aria-label="Technology inspector">
      <div className={styles.infoHead}>
        <span className={`${styles.infoTitle} label-mono`}><i aria-hidden="true" />{tech ? (locked ? "NODE LOCKED" : "NODE PREVIEW") : "SYSTEM STATUS"}</span>
        {locked && <button type="button" className={`${styles.clear} label-mono`} onClick={clearSelection} aria-label="Clear selection (Escape)">CLEAR ✕</button>}
      </div>
      <div className={styles.infoBody} aria-live="polite">
        {tech ? <TechDetailBody tech={tech} interactive={locked} /> : (
          <div className={styles.status}>
            <p className={`${styles.statusRow} label-mono`}><span>NODES ONLINE</span><span ref={nodesRef}>00 / 00</span></p>
            <p className={`${styles.statusRow} label-mono`}><span>PATHWAYS</span><span ref={linksRef}>00 / 00</span></p>
            <p className={styles.hint}>Select a node — in the network or in the list — to inspect it and trace where it is used.</p>
          </div>
        )}
      </div>
    </aside>
  );
}
