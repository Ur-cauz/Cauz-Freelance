import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: site.seo.url, changeFrequency: "monthly", priority: 1 },
    { url: `${site.seo.url}/lab`, changeFrequency: "daily", priority: 0.6 }
  ];
}
