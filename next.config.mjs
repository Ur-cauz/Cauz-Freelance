const isDev = process.env.NODE_ENV !== "production";
const turnstile = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

const csp = (directives) =>
  Object.entries(directives)
    .map(([key, values]) => [key, ...values].join(" "))
    .join("; ");

// Main site CSP.
// script-src needs 'unsafe-inline': the App Router streams the RSC payload in
// inline <script> tags, and the home page is statically prerendered, so a
// per-request nonce is not possible without making every page dynamic.
// The site renders no user-supplied HTML, which keeps this low risk.
// style-src 'unsafe-inline' covers React style attributes and next/font.
const siteCsp = csp({
  "default-src": ["'self'"],
  "script-src": ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : []), ...(turnstile ? [TURNSTILE_ORIGIN] : [])],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:"],
  "font-src": ["'self'"],
  "connect-src": ["'self'", ...(isDev ? ["ws:"] : [])],
  "frame-src": turnstile ? [TURNSTILE_ORIGIN] : ["'none'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  ...(isDev ? {} : { "upgrade-insecure-requests": [] })
});

// /lab is a static, read-only homelab status viewer in public/lab/ that only
// talks to the GitHub API. It gets a tighter policy with no inline anything.
const labCsp = csp({
  "default-src": ["'self'"],
  "script-src": ["'self'"],
  "style-src": ["'self'"],
  "img-src": ["'self'", "data:"],
  "connect-src": ["'self'", "https://api.github.com"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'none'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"]
});

const common = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      // Everything except /lab and /lab/*.
      { source: "/((?!lab(?:/|$)).*)", headers: [...common, { key: "Content-Security-Policy", value: siteCsp }] },
      { source: "/lab", headers: [...common, { key: "Content-Security-Policy", value: labCsp }] },
      { source: "/lab/:path*", headers: [...common, { key: "Content-Security-Policy", value: labCsp }] }
    ];
  },
  async rewrites() {
    return [{ source: "/lab", destination: "/lab/index.html" }];
  }
};

export default nextConfig;
