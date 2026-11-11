import type { CareerEntry } from "@/components/sections/career/career.types";

/**
 * Career timeline — oldest first.
 * SOURCE: Nirmal_Amanda_Full-Stack_Engineer_CV.docx (authoritative);
 */
export const CAREER: CareerEntry[] = [
  {
    id: "xoom-associate",
    company: "Xoom Softwares",
    position: "Associate Software Engineer",
    location: "Sri Lanka",
    startDate: "Feb 2021",
    endDate: "Jan 2025",
    description: null,
    responsibilities: [
      "Developed Riyapuhunuwa, a multi-branch driving school management system covering student, instructor, lesson, examination and payment management, with SMS notifications, dashboards and automation.",
      "Built Pulse, a Slack-integrated workflow automation platform with customizable questionnaires, scheduling and Slack-bot automation using the Slack API.",
      "Built web and mobile grocery e-commerce applications with responsive interfaces, cart management, checkout workflows and LankaPay payment processing.",
    ],
    projects: [
      {
        id: "riyapuhunuwa",
        name: "Riyapuhunuwa",
        summary: "A multi-branch driving school management system covering student, instructor, lesson, examination and payment management, with SMS notifications, dashboards and automation.",
        nameConfirmed: true,
      },
      {
        id: "pulse",
        name: "Pulse",
        summary: "A Slack-integrated workflow automation platform with customizable questionnaires, scheduling and Slack-bot automation using the Slack API.",
        nameConfirmed: true,
      },
      {
        id: "grocery-ecommerce",
        name: "Grocery e-commerce applications",
        summary: "Web and mobile grocery e-commerce applications with responsive interfaces, cart management, checkout workflows and LankaPay payment processing.",
        nameConfirmed: false,
      },
    ],
    needsConfirmation: [],
  },
  {
    id: "us-nova",
    company: "US NOVA",
    position: "Software Engineer",
    location: "USA",
    startDate: "Jan 2025",
    endDate: "Feb 2026",
    description: null,
    responsibilities: [
      "Engineered Cubicle Kitchens, a full-stack platform that streamlines daily restaurant workflows, automates operations and integrates e-commerce functionality.",
      "Developed Chelsie, a conversational web UI with user history management, dynamic prompt suggestions and real-time interaction states.",
    ],
    projects: [
      {
        id: "cubicle-kitchens",
        name: "Cubicle Kitchens",
        summary: "A full-stack platform that streamlines daily restaurant workflows, automates operations and integrates e-commerce functionality.",
        nameConfirmed: true,
      },
      {
        id: "chelsie",
        name: "Chelsie",
        summary: "A conversational web UI with user history management, dynamic prompt suggestions and real-time interaction states.",
        nameConfirmed: true,
      },
    ],
    needsConfirmation: [],
  },
  {
    id: "xoom-engineer",
    company: "Xoom Softwares",
    position: "Software Engineer",
    location: "Sri Lanka",
    startDate: "Jan 2026",
    endDate: "Aug 2026",
    description: null,
    responsibilities: [
      "Built Sweatmate, a sports facility booking platform covering reservation management, automated workflows, waitlist allocation, analytics dashboards, commission tracking and financial reporting.",
    ],
    projects: [
      {
        id: "sweatmate",
        name: "Sweatmate",
        summary: "A sports facility booking platform covering reservation management, automated workflows, waitlist allocation, analytics dashboards, commission tracking and financial reporting.",
        nameConfirmed: true,
      },
    ],
    needsConfirmation: [],
  },
];

/** "2021 – 2025" / "2026 – Present" */
export const formatPeriod = (e: Pick<CareerEntry, "startDate" | "endDate">) =>
  `${e.startDate} – ${e.endDate ?? "Present"}`;
