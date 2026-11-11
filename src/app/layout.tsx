import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { interTight, jetbrainsMono } from "@/lib/fonts";
import SmoothScrollProvider from "@/providers/SmoothScrollProvider";
import CanvasMount from "@/components/canvas/CanvasMount";
import SiteChrome from "@/components/chrome/SiteChrome";
import { Preloader } from "@/components/preloader";
import { SITE, SITE_URL } from "@/lib/site";
import { CONTACT } from "@/data/contact";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE.title,
  description: SITE.description,
  applicationName: "HUMAN × MACHINE",
  authors: [{ name: SITE.name }],
  keywords: ["full stack developer", "Next.js", "React", "TypeScript", "Laravel", "Node.js", "web developer portfolio", "Sri Lanka"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: { type: "website", url: "/", siteName: "HUMAN × MACHINE", title: SITE.title, description: SITE.description, locale: "en_US" },
  twitter: { card: "summary_large_image", title: SITE.title, description: SITE.description },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: SITE.name,
  jobTitle: "Full Stack Developer",
  url: SITE_URL,
  email: `mailto:${CONTACT.email}`,
  sameAs: [CONTACT.linkedin, CONTACT.github].filter((u) => /^https:\/\//.test(u)),
  knowsAbout: ["Full-stack development", "Next.js", "React", "TypeScript", "Laravel", "API integration", "Payment integration"],
};

// viewport-fit=cover lets the header/overlay use the safe-area insets on notched phones. Zoom is NOT disabled (accessibility).
export const viewport: Viewport = { themeColor: "#080809", colorScheme: "dark", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${interTight.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        {/*
          Pre-loader lock, applied before first paint (JS-only: without JS the attribute never exists, so the overlay
          and the scroll lock never apply). "expired" is a watchdog: if React has not taken over after 25 s the
          overlay hides itself and the page unlocks — the pre-loader can never strand a visitor.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(d){d.dataset.preloader="active";setTimeout(function(){if(d.dataset.preloader==="active")d.dataset.preloader="expired"},25000)})(document.documentElement)`,
          }}
        />
        {/* Start fetching the hero portrait before JS boots (mobile gets the smaller file). */}
        <link rel="preload" as="image" type="image/webp" fetchPriority="high" href="/images/hero/portrait-1080.webp" media="(min-width: 768px)" />
        <link rel="preload" as="image" type="image/webp" fetchPriority="high" href="/images/hero/portrait-720.webp" media="(max-width: 767px)" />
      </head>
      <body className="bg-bg text-fg">
        {/* Without JS the hero's hidden-until-animated elements would stay hidden. */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <noscript>
          <style>{`[data-hero-intro],[data-word]{visibility:visible!important}[data-char]{transform:none!important}`}</style>
        </noscript>
        <SmoothScrollProvider>
          {/* First on purpose: its layout effect must run before HeroSection's so the hero knows to wait. */}
          <Preloader />
          {/* Made `inert` while the pre-loader plays (keyboard + assistive tech stay out of the hidden page). */}
          <div id="app-shell">
            <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:border focus:border-crimson focus:bg-bg focus:px-4 focus:py-3">Skip to content</a>
            <CanvasMount />
            <SiteChrome />
            <main id="main" tabIndex={-1} className="relative z-10 outline-none">{children}</main>
          </div>
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
