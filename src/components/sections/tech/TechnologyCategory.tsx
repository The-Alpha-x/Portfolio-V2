"use client";
import { techsIn, type TechCategory } from "@/data/technologies";
import { hoverTech, selectTech, useTechFocus } from "@/lib/techState";
import { getLogo } from "./techIcons";
import styles from "./tech.module.css";

/**
 * One category of technologies as real buttons. Hover / focus preview the node in the 3D network (and light its pathways), click or
 * Enter locks it. The same state highlights the matching chip when the 3D node is hovered.
 */
export default function TechnologyCategory({ category, dense = false, showTitle = true }: { category: TechCategory; dense?: boolean; showTitle?: boolean }) {
  const { hover, selected, related } = useTechFocus();
  const items = techsIn(category.id);
  return (
    <section aria-label={category.label} className={styles.group}>
      {showTitle && (
        <h3 className={`${styles.groupTitle} label-mono`}>
          {category.label}<span className={styles.groupCount}>{String(items.length).padStart(2, "0")}</span>
        </h3>
      )}
      <ul className={styles.chips} data-dense={dense || undefined}>
        {items.map((t) => {
          const Icon = getLogo(t.icon);
          return (
            <li key={t.id}>
              <button
                type="button"
                className={styles.chip}
                aria-pressed={selected === t.id}
                aria-describedby="tech-detail"
                data-hover={hover === t.id || undefined}
                data-related={related.has(t.id) || undefined}
                onMouseEnter={() => hoverTech(t.id)}
                onMouseLeave={() => hoverTech(null)}
                onFocus={() => hoverTech(t.id)}
                onBlur={() => hoverTech(null)}
                onClick={() => selectTech(t.id)}
              >
                <Icon size={dense ? 15 : 18} aria-hidden /> <span>{t.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
