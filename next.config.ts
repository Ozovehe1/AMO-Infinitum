import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async redirects() {
    return [
      { source: "/blog/:slug", destination: "/abdul/blog/:slug", permanent: true },
      { source: "/about", destination: "/abdul/about", permanent: true },
      { source: "/inkwell", destination: "/abdul/inkwell", permanent: true },
      { source: "/inkwell/:path*", destination: "/abdul/inkwell/:path*", permanent: true },
      { source: "/category/:slug", destination: "/abdul?category=:slug", permanent: true },
    ];
  },
};

export default nextConfig;
