import type { Metadata, Viewport } from "next";
import { site } from "@/lib/content";
import "./globals.css";

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
    { media: "(prefers-color-scheme: light)", color: "#e8ecf6" },
    { media: "(prefers-color-scheme: dark)", color: "#05070c" }
  ]
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
