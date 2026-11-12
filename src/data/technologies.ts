import { PROJECTS } from "@/data/projects";

/**
 * Scene 05 — NEURAL ARCHITECTURE. Single typed source for the 3D network, the HTML interface and the mobile list.
 *
 * RULES
 *  - Only technologies from the owner's brief (Task 06 §4). Nothing invented. No proficiency numbers.
 *  - `PROJECT_STACKS` mirrors the project context given in the brief (§7). A technology is linked to a project ONLY there.
 *  - `TECH_LINKS` are generic, factual "is built on / is used with" relations (e.g. Next.js ↔ React). They are not project claims.
 *  - IDs are stable: they key 3D nodes, connections, hotspots and focus state.
 *  - Pure data (no three.js) so DOM code can import it without pulling three into the page bundle.
 */
export type TechCategoryId = "frontend" | "backend" | "data" | "tools" | "integrations";

export interface TechCategory {
  id: TechCategoryId;
  label: string;
  /** Name of the subsystem in the "machine" metaphor — shown on the 3D hub label. */
  subsystem: string;
}

export const TECH_CATEGORIES: readonly TechCategory[] = [
  { id: "frontend", label: "Frontend", subsystem: "Interface layer" },
  { id: "backend", label: "Backend", subsystem: "Server core" },
  { id: "data", label: "Data & Cloud", subsystem: "Memory & cloud" },
  { id: "tools", label: "Tools & Frameworks", subsystem: "Dev systems" },
  { id: "integrations", label: "Integrations", subsystem: "External links" },
];

export interface Technology {
  id: string;
  name: string;
  category: TechCategoryId;
  /** Key into techIcons.ts (authentic brand logo, or a neutral glyph where no brand logo exists). */
  icon: string;
  /** Brand tint (hex), used on the node while it is highlighted. */
  brand: string;
  description: string;
}

export const TECHNOLOGIES: readonly Technology[] = [
  // Frontend
  { id: "react", name: "React.js", category: "frontend", icon: "react", brand: "#61dafb", description: "Component-based user interfaces." },
  { id: "nextjs", name: "Next.js", category: "frontend", icon: "nextjs", brand: "#f2eeee", description: "React framework for full-stack web applications." },
  { id: "react-native", name: "React Native", category: "frontend", icon: "reactnative", brand: "#61dafb", description: "Cross-platform mobile applications built with React." },
  { id: "typescript", name: "TypeScript", category: "frontend", icon: "typescript", brand: "#3178c6", description: "Typed JavaScript for safer, more maintainable application code." },
  { id: "javascript", name: "JavaScript", category: "frontend", icon: "javascript", brand: "#f7df1e", description: "The language of the web, shared across front-end and server code." },
  { id: "html", name: "HTML", category: "frontend", icon: "html", brand: "#e34f26", description: "Semantic, accessible markup for every interface." },
  { id: "css", name: "CSS", category: "frontend", icon: "css", brand: "#1572b6", description: "Responsive layout and styling." },
  { id: "tailwind", name: "Tailwind CSS", category: "frontend", icon: "tailwind", brand: "#38bdf8", description: "Utility-first styling for consistent, responsive interfaces." },
  { id: "primereact", name: "PrimeReact", category: "frontend", icon: "primereact", brand: "#6366f1", description: "Rich React component library for data-heavy interfaces." },
  // Backend
  { id: "laravel", name: "Laravel", category: "backend", icon: "laravel", brand: "#ff2d20", description: "PHP framework for structured back-end applications." },
  { id: "php", name: "PHP", category: "backend", icon: "php", brand: "#777bb4", description: "Server-side language behind the Laravel applications." },
  { id: "nodejs", name: "Node.js", category: "backend", icon: "nodejs", brand: "#5fa04e", description: "JavaScript runtime for server-side services and APIs." },
  // Data & Cloud
  { id: "firebase", name: "Firebase", category: "data", icon: "firebase", brand: "#ffca28", description: "Managed backend and cloud services." },
  { id: "mysql", name: "MySQL", category: "data", icon: "mysql", brand: "#4479a1", description: "Relational database for application data." },
  { id: "mongodb", name: "MongoDB", category: "data", icon: "mongodb", brand: "#47a248", description: "NoSQL database for flexible data storage." },
  // Tools & Frameworks
  { id: "git", name: "Git", category: "tools", icon: "git", brand: "#f05032", description: "Version control and collaborative development." },
  { id: "slack", name: "Slack API", category: "tools", icon: "slack", brand: "#e01e5a", description: "Slack bots and workflow automation through the Slack API." },
  { id: "stripe", name: "Stripe API", category: "tools", icon: "stripe", brand: "#635bff", description: "Payment processing and financial reporting through the Stripe API." },
  { id: "mailchimp", name: "Mailchimp API", category: "tools", icon: "mailchimp", brand: "#ffe01b", description: "Email marketing and automation through the Mailchimp API." },
  { id: "sms-gateway", name: "SMS Gateway", category: "tools", icon: "sms", brand: "#ff626b", description: "SMS delivery and notifications through a third-party SMS gateway." },
  { id: "google-cloud", name: "Google Cloud Functions", category: "tools", icon: "googlecloud", brand: "#4285f4", description: "Serverless functions for backend automation and integrations." },
  { id: "jira", name: "Jira", category: "tools", icon: "jira", brand: "#0052cc", description: "Project management and issue tracking." },
  { id: "shadcn", name: "ShadCN", category: "tools", icon: "shadcn", brand: "#f2eeee", description: "Accessible, composable UI component primitives." },
  // Integrations
  { id: "rest-api", name: "REST API Integrations", category: "integrations", icon: "api", brand: "#ff626b", description: "Connecting applications to internal and external services over REST." },
  { id: "payments", name: "Payment Gateway Integrations", category: "integrations", icon: "payments", brand: "#ff626b", description: "Checkout and payment-processing flows." },
  { id: "third-party", name: "Third-Party Service Integrations", category: "integrations", icon: "thirdparty", brand: "#ff626b", description: "Connecting applications with external platforms and services." },
];

export const TECH_COUNT = TECHNOLOGIES.length;
const INDEX = new Map(TECHNOLOGIES.map((t, i) => [t.id, i]));
export const techIndex = (id: string): number => INDEX.get(id) ?? -1;
export const techById = (id: string): Technology | undefined => TECHNOLOGIES[techIndex(id)];
export const techsIn = (c: TechCategoryId): Technology[] => TECHNOLOGIES.filter((t) => t.category === c);
export const categoryOf = (id: TechCategoryId): TechCategory => TECH_CATEGORIES.find((c) => c.id === id) ?? TECH_CATEGORIES[0];

/** Generic, factual relations between technologies (not project claims). Drawn as physical links in the network. */
export const TECH_LINKS: readonly (readonly [string, string])[] = [
  ["react", "nextjs"],
  ["react", "react-native"],
  ["nextjs", "typescript"],
  ["javascript", "typescript"],
  ["html", "css"],
  ["css", "tailwind"],
  ["laravel", "php"],
  ["rest-api", "payments"],
  ["rest-api", "third-party"],
  ["slack", "third-party"],
];

export interface ProjectStack {
  /** Matches `src/data/projects.ts`. */
  id: string;
  name: string;
  note: string;
  members: readonly string[];
  chain: readonly (readonly [string, string])[];
}

const nameOf = (id: string, fallback: string) => PROJECTS.find((p) => p.id === id)?.name ?? fallback;

export const PROJECT_STACKS: readonly ProjectStack[] = [
  {
    id: "cubicle-kitchens", name: nameOf("cubicle-kitchens", "Cubicle Kitchens"), note: "Restaurant ordering and operations platform",
    members: ["react", "nextjs", "typescript", "tailwind", "nodejs", "mongodb", "rest-api", "stripe", "payments", "git", "jira"],
    chain: [["react", "nextjs"], ["nextjs", "typescript"], ["typescript", "nodejs"], ["nodejs", "mongodb"], ["rest-api", "stripe"], ["stripe", "payments"]],
  },
  {
    id: "riyapuhunuwa", name: nameOf("riyapuhunuwa", "Riyapuhunuwa"), note: "Multi-branch driving school management platform",
    members: ["laravel", "php", "mysql", "sms-gateway", "git", "jira"],
    chain: [["laravel", "php"], ["php", "mysql"], ["mysql", "sms-gateway"]],
  },
    {
    id: "sweatmate", name: nameOf("sweatmate", "Sweatmate"), note: "Multi-branch driving school management platform",
    members: ["react", "javascript", "firebase", "mailchimp", "primereact", "git", "jira"],
    chain: [["react", "javascript"], ["javascript", "firebase"], ["firebase", "mailchimp"], ["mailchimp", "primereact"]],
  },
  {
    id: "pulse", name: nameOf("pulse", "Pulse"), note: "Slack scheduled questionnaires",
    members: ["react", "javascript", "slack", "third-party", "firebase", "google-cloud", "stripe", "payments", "git", "jira"],
    chain: [["react", "javascript"], ["javascript", "slack"], ["slack", "third-party"], ["third-party", "firebase"], ["firebase", "google-cloud"], ["google-cloud", "stripe"], ["stripe", "payments"]],
  },
  {
    id: "grocery-ecommerce", name: nameOf("grocery-ecommerce", "Grocery E-commerce"), note: "Web and mobile grocery application",
    members: ["react", "react-native", "javascript", "payments", "git", "jira"],
    chain: [["react", "react-native"], ["react-native", "javascript"], ["javascript", "payments"]],
  },

];

export const projectsOf = (techId: string): ProjectStack[] => PROJECT_STACKS.filter((p) => p.members.includes(techId));

export interface ConnectedTech { id: string; via: string }
/** Technologies connected to `techId`: generic links + technologies used alongside it in the same projects. */
export function connectedTo(techId: string): ConnectedTech[] {
  const out = new Map<string, string>();
  for (const [a, b] of TECH_LINKS) {
    if (a === techId) out.set(b, "Linked");
    else if (b === techId) out.set(a, "Linked");
  }
  for (const p of projectsOf(techId)) for (const m of p.members) if (m !== techId) out.set(m, p.name);
  return [...out].map(([id, via]) => ({ id, via })).filter((c) => techIndex(c.id) >= 0);
}

/** Technologies to highlight for a selection: members of the selected technology's projects (or of one chosen project). */
export function relatedIds(selected: string, project: string): ReadonlySet<string> {
  const ids = new Set<string>();
  if (!selected) return ids;
  for (const p of projectsOf(selected)) {
    if (project && p.id !== project) continue;
    for (const m of p.members) ids.add(m);
  }
  ids.delete(selected);
  return ids;
}
