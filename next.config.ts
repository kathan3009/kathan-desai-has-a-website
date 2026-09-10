import type { NextConfig } from "next";

// Hand tracking runs in the page, on this origin, only after an explicit opt-in.
const ADMIN_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH || "admin";
const NO_CAMERA = "camera=(), microphone=(), geolocation=()";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2560, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      { protocol: "https", hostname: "img.youtube.com", pathname: "/vi/**" },
      { protocol: "https", hostname: "pub-e6b13b1038d84eb5b4a3c0cf7bf0e50a.r2.dev" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
      // Later matches win, so the editing surfaces keep the camera switched off.
      ...["/admin", `/${ADMIN_PATH}`].flatMap((prefix) => [
        { source: prefix, headers: [{ key: "Permissions-Policy", value: NO_CAMERA }] },
        { source: `${prefix}/:path*`, headers: [{ key: "Permissions-Policy", value: NO_CAMERA }] },
      ]),
    ];
  },
};

export default nextConfig;
