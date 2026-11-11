/**
 * Scene 06 contact details — the ONLY place they live.
 *
 * SOURCE: Nirmal_Amanda_Full-Stack_Engineer_CV.docx (email, phone). Nothing here is invented.
 *  - `linkedin` / `github`: NOT in the CV or the brief → empty on purpose. Paste the full https:// profile URL and the
 *    link appears; while empty it is hidden in production (and shown as a dev-only reminder in `next dev`).
 *  - `phone.show`: you said "if I choose to display it" → off by default. Set to true to show it.
 */
export interface ContactConfig {
  name: string;
  email: string;
  phone: { display: string; tel: string; show: boolean };
  linkedin: string;
  github: string;
  cv: { href: string; filename: string };
}

export const CONTACT: ContactConfig = {
  name: "Nirmal Amanda",
  email: "nirmalamanda1998@gmail.com",
  phone: { display: "+94 70 408 1881", tel: "+94704081881", show: true },
  linkedin: "https://www.linkedin.com/in/nirmal-amanda-47b720315/", 
  github: "https://github.com/The-Alpha-x",
  cv: { href: "/cv/Nirmal_Amanda_Full-Stack_Engineer_CV.docx", filename: "Nirmal_Amanda_Full-Stack_Engineer_CV.docx" },
};

/** Only https URLs are ever rendered as links. */
export const isHttps = (u: string) => /^https:\/\/[^\s/$.?#].[^\s]*$/i.test(u);

/** "https://github.com/x/" → "github.com/x" */
export const prettyUrl = (u: string) => u.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
