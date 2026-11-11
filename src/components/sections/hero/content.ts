/** All Scene 01 copy in one place. */
export const HERO = {
  name: "NIRMAL AMANDA",
  title: "FULL STACK DEVELOPER",
  headline: [
    { text: "BETWEEN", em: false },
    { text: "HUMAN", em: true },
    { text: "INSTINCT", em: false },
    { text: "AND", em: false },
    { text: "MACHINE", em: true },
    { text: "PRECISION.", em: false },
  ],
  cta: { label: "EXPLORE MY WORLD", href: "#scene-02" },
  portraitAlt:
    "Portrait of Nirmal Amanda, split down the middle: a human face on the left and a cybernetic face with a glowing red eye on the right.",
  human: { label: "HUMAN", sub: "CREATIVITY" },
  machine: { label: "MACHINE", sub: "ENGINEERING" },
  eyebrow: "01 / 06 — IDENTITY INITIALIZATION",
  fallbackSrc: "/images/hero/portrait-1080.webp",
  fallbackSrcSet: "/images/hero/portrait-720.webp 720w, /images/hero/portrait-1080.webp 1080w",
} as const;

