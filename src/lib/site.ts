/** Set NEXT_PUBLIC_SITE_URL (e.g. https://nirmalamanda.com) in the production environment; canonical / OG / sitemap derive from it. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
export const SITE = {
  name: "Nirmal Amanda",
  title: "Nirmal Amanda — Full Stack Developer | HUMAN × MACHINE",
  description: "Between human instinct and machine precision. Portfolio of Nirmal Amanda, full-stack developer with 5+ years building web applications, APIs and payment integrations.",
} as const;
