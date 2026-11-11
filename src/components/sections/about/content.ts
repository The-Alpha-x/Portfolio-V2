/** All Scene 02 copy in one place. `em` = key phrase rendered in primary text colour. */
export interface Part { t: string; em?: boolean }

export const ABOUT = {
  eyebrow: "02 / 06 — HUMAN ORIGIN",
  heading: ["BEHIND THE", "MACHINE."],
  paragraphs: [
    [
      { t: "I’m a " }, { t: "full-stack developer", em: true }, { t: " with " }, { t: "5+ years", em: true },
      { t: " of experience building modern web applications, digital products, and scalable software solutions." },
    ],
    [
      { t: "I enjoy transforming " }, { t: "complex problems", em: true }, { t: " into " },
      { t: "practical, intuitive", em: true }, { t: " digital experiences." },
    ],
    [
      { t: "From frontend engineering to backend architecture and third-party integrations, I enjoy working across the " },
      { t: "entire development process", em: true }, { t: "." },
    ],
  ] as Part[][],
  /** `icon` keys are mapped to lucide icons in AboutSection. The first item is the animated number. */
  highlights: [
    { id: "exp", index: "H-01", number: 5, suffix: "+", label: "YEARS EXPERIENCE", sr: "5+ years experience" },
    { id: "full", index: "H-02", icon: "layers", label: "FULL-STACK DEVELOPMENT" },
    { id: "web", index: "H-03", icon: "globe", label: "WEB APPLICATIONS" },
    { id: "api", index: "H-04", icon: "plug", label: "API & PAYMENT INTEGRATIONS" },
  ] as const,
  label: "About — human origin",
} as const;
