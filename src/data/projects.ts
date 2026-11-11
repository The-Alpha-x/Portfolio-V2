import { CAREER, formatPeriod } from "@/data/career";
import type { Project } from "@/components/sections/archive/archive.types";

/**
 * Engineering Archive — SOURCE OF TRUTH: owner brief + Nirmal_Amanda CV (via src/data/career.ts).
 * Nothing here is invented. Unknowns are `null` / [] and listed in `needsConfirmation`.
 * Role, company and period are DERIVED from the career entry that owns the project (no duplicate facts).
 *
 * SCREENSHOTS: add real images to /public/images/projects/<id>/ (WebP, ≤1600px wide) and list them in `screenshots`.
 * LINKS: add `links.live` / `links.github` only when they exist.
 */
const owner = (projectId: string) => {
  const e = CAREER.find((c) => c.projects.some((p) => p.id === projectId));
  if (!e) throw new Error(`Project ${projectId} not found in career data`);
  return { company: e.company, position: e.position, period: formatPeriod(e) };
};

const NO_SHOTS = "Screenshots (provide real images).";
const NO_LINKS = "Live demo / GitHub links, if they exist.";

export const PROJECTS: Project[] = [
  {
    id: "cubicle-kitchens", name: "Cubicle Kitchens", kind: "featured",
    tagline: "Restaurant ordering and operations platform.",
    summary: "A full-stack platform that streamlines daily restaurant workflows, automates operations and integrates e-commerce functionality.",
    ...owner("cubicle-kitchens"), verb: "Engineered",
    problem: null,
    features: ["Restaurant ordering", "Streamlined daily restaurant workflows", "Operations automation", "Integrated e-commerce functionality"],
    technical: ["Full-stack platform", "E-commerce functionality integrated with restaurant operations"],
    stack: ["Next.js", "React", "TypeScript", "Node.js", "Express", "MongoDB", "Stripe API"],
    links: { live: "https://cubiclekitchens.com", github: "" },
    screenshots: [{ src: "/images/projects/cubicle-kitchens/1.webp", alt: "Illustration of the cubicle kitchens platform", width: 1280, height: 800 }],
    needsConfirmation: [],
  },
  {
    id: "riyapuhunuwa", name: "Riyapuhunuwa", kind: "featured",
    tagline: "Multi-branch driving school management platform.",
    summary: "A multi-branch driving school management system covering student, instructor, lesson, examination and payment management, with SMS notifications, dashboards and automation.",
    ...owner("riyapuhunuwa"), verb: "Developed",
    problem: null,
    features: ["Student, instructor and lesson management", "Examination management", "Payment management", "SMS notifications", "Dashboards", "Automation", "Multi-branch operation"],
    technical: ["Multi-branch system", "SMS notification delivery", "Dashboards and automation"],
    stack: ["React", "Laravel", "PHP", "MySQL", "SMS gateway"],
    screenshots: [{ src: "/images/projects/riyapuhunuwa/dashboard-1280.webp", alt: "Illustration of the Riyapuhunuwa branch console: stats, branch activity, lessons, payments and SMS queue", width: 1280, height: 800 }], links: {},
    needsConfirmation: [],
  },
  {
    id: "sweatmate", name: "Sweatmate", kind: "featured",
    tagline: "Sports facility booking and management platform.",
    summary: "A sports facility booking platform covering reservation management, automated workflows, waitlist allocation, analytics dashboards, commission tracking and financial reporting.",
    ...owner("sweatmate"), verb: "Built",
    problem: null,
    features: ["Booking and reservation management", "Waitlist allocation", "Notifications", "Commission tracking", "Analytics dashboards", "Financial reporting", "Automated workflows"],
    technical: ["Automated booking workflows", "Waitlist allocation", "Analytics dashboards and financial reporting"],
    stack: ["React.js", "JavaScript", "Firebase", "Mailchimp"],
    screenshots: [{ src: "/images/projects/sweatmate/1.webp", alt: "Illustration of the Sweatmate platform: stats, facility availability, bookings and analytics", width: 1280, height: 800 }], links: {},
    needsConfirmation: [],
  },
  {
    id: "pulse", name: "Pulse", kind: "secondary",
    tagline: "Slack-integrated scheduled questionnaire and workflow automation platform.",
    summary: "A Slack-integrated workflow automation platform with customizable questionnaires, scheduling and Slack-bot automation using the Slack API and Google Cloud Functions.",
    ...owner("pulse"), verb: "Built",
    problem: null,
    features: ["Customizable questionnaires", "Scheduling", "Slack-bot automation"],
    technical: ["Slack API integration", "Slack-bot automation"],
    stack: ["React.js", "JavaScript", "SlackAPI", "Firebase", "GoogleCloudFunctions", "StripeAPI"],
    screenshots: [{ src: "/images/projects/pulse/1.webp", alt: "Illustration of the Pulse platform: customizable questionnaires, scheduling, and Slack-bot automation", width: 1280, height: 800 }], links: {},
    needsConfirmation: [],
  },
  {
    id: "grocery-ecommerce", name: "Grocery E-commerce", kind: "secondary",
    tagline: "Web and mobile grocery shopping application with LankaPay payment integration.",
    summary: "Web and mobile grocery e-commerce applications with responsive interfaces, cart management, checkout workflows and LankaPay payment processing.",
    ...owner("grocery-ecommerce"), verb: "Built",
    problem: null,
    features: ["Web and mobile applications", "Responsive interfaces", "Cart management", "Checkout workflows", "LankaPay payment processing"],
    technical: ["LankaPay payment integration", "Checkout workflow"],
    stack: ["React.js", "JavaScript", "ReactNative", "LankaPay"],
    screenshots: [{ src: "/images/projects/grocery-ecommerce/storefront-1280.webp", alt: "Illustration of the grocery storefront on web and the mobile checkout with LankaPay", width: 1280, height: 800 }], links: {},
    needsConfirmation: [],
  },
];

export const PROJECT_COUNT = PROJECTS.length;
