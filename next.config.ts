import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createBundleAnalyzer from "@next/bundle-analyzer";
import { canonicalRedirects } from "./src/lib/site-routes";

const withBundleAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const allowCloudflareInsights = process.env.CSP_ALLOW_CLOUDFLARE_INSIGHTS === "true";
const connectSrcParts = [
  "'self'",
  "https://*.supabase.co",
  "https://us.i.posthog.com",
  "https://*.posthog.com",
  "https://*.sentry.io",
  "https://challenges.cloudflare.com",
];
const scriptSrcParts = [
  "'self'",
  "'unsafe-inline'",
  "https://challenges.cloudflare.com",
  "https://us.i.posthog.com",
  "https://*.posthog.com",
];
if (allowCloudflareInsights) {
  connectSrcParts.push("https://cloudflareinsights.com");
  scriptSrcParts.push("https://static.cloudflareinsights.com");
}
const cspPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src ${connectSrcParts.join(" ")}`,
  `script-src ${scriptSrcParts.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  "frame-src 'self' https://challenges.cloudflare.com",
].join("; ");
const cspHeaderKey =
  process.env.CSP_REPORT_ONLY === "true"
    ? "Content-Security-Policy-Report-Only"
    : "Content-Security-Policy";

const nextConfig: NextConfig = {
  // Fewer parallel writers avoids flaky ENOENTs on Windows (e.g. OneDrive-synced repos).
  experimental: {
    cpus: 1,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  allowedDevOrigins: ["127.0.0.1"],
  async redirects() {
    return canonicalRedirects.map((redirect) => ({
      ...redirect,
      permanent: true,
    }));
  },
  async headers() {
    return [
      {
        source: "/portal",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, no-cache, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/portal/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, no-cache, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
          },
          {
            key: cspHeaderKey,
            value: cspPolicy,
          },
        ],
      },
    ];
  },
};

const sentryWrappedConfig = withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
  webpack: {
    reactComponentAnnotation: {
      enabled: true,
    },
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: false,
  },
});

export default withBundleAnalyzer(sentryWrappedConfig);

import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
