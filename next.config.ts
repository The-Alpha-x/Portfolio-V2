import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: "export",
  // Mobile-first image pipeline (next/image): AVIF/WebP, phone-sized candidates, long CDN/browser cache.
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1600],
    imageSizes: [96, 160, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  // Import only the icons/modules actually used (smaller client bundles).
  experimental: {
    optimizePackageImports: ["lucide-react", "react-icons/fa", "react-icons/si", "@react-three/drei"],
  },
  // Long-lived caching for the hero portrait (hashed filenames are not needed: assets are immutable per release).
  async headers() {
    return [{ source: "/images/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] }];
  },
};

export default nextConfig;
