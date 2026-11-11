import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: "export",
  // Static hosting has no Next.js image-optimization endpoint, so serve source assets directly.
  images: {
    unoptimized: true,
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
