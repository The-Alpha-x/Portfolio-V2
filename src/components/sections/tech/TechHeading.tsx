import styles from "./tech.module.css";

/** Section identifier, title and subtitle (Task 06 §3). `data-tech-head` lets the scroll timeline fade it in. */
export default function TechHeading({ id = "tech-title", animate = false }: { id?: string; animate?: boolean }) {
  return (
    <header className={styles.head} data-tech-head={animate || undefined}>
      <p className={`${styles.eyebrow} label-mono`}><span className={styles.mark} aria-hidden="true" />05 / 06 — TECHNICAL ARSENAL</p>
      <h2 id={id} className={styles.title}>NEURAL ARCHITECTURE</h2>
      <p className={`${styles.subtitle} label-mono`}>THE SYSTEMS BEHIND THE MACHINE.</p>
    </header>
  );
}
