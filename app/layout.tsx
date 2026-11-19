import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import { site } from "@/lib/content";
import "./globals.css";

// One variable font, self-hosted by next/font (no runtime request to Google).
const sans = Inter_Tight({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

const { seo } = site;

export const metadata: Metadata = {
  metadataBase: new URL(seo.url),
  title: seo.title,
  description: seo.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: seo.title,
    description: seo.description,
    url: "/",
    siteName: site.name,
    type: "website",
    images: [{ url: seo.ogImage, width: 1200, height: 630, alt: seo.ogImageAlt }]
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: [seo.ogImage]
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0d0c" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={sans.variable}>
      <body>{children}</body>
    </html>
  );
}
