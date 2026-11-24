import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "vbcdopdttqmplwnknppl.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "www.prettycornershopmm.com",
      },
      {
        protocol: "https",
        hostname: "prettycornershopmm.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  async rewrites() {
    const defaultSupabaseUrl = "https://vbcdopdttqmplwnknppl.supabase.co";
    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      defaultSupabaseUrl;

    return [
      {
        // Explicitly proxy Supabase REST, Auth, and Storage APIs to bypass Myanmar SNI blocking
        source: "/supabase/rest/v1/:path*",
        destination: `${supabaseUrl}/rest/v1/:path*`,
      },
      {
        source: "/supabase/auth/v1/:path*",
        destination: `${supabaseUrl}/auth/v1/:path*`,
      },
      {
        source: "/supabase/storage/v1/:path*",
        destination: `${supabaseUrl}/storage/v1/:path*`,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);

