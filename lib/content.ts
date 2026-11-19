import projectsJson from "@/content/projects.json";
import siteJson from "@/content/site.json";
import testimonialsJson from "@/content/testimonials.json";

// Content lives in /content/*.json (schema: content/README.md).
// It is validated at build time: a malformed file fails `next build`,
// so a bad commit from the dashboard never reaches production.

export type Link = { label: string; href: string };
export type Service = { title: string; note: string; items: string[] };
export type Step = { title: string; copy: string };

export type Site = {
  name: string;
  role: string;
  headline: string;
  intro: string;
  about: string;
  now: string;
  email: string;
  socials: Link[];
  services: Service[];
  process: Step[];
  contactServices: string[];
  footerNote: string;
  seo: { title: string; description: string; url: string; ogImage: string; ogImageAlt: string };
};

export type Project = {
  name: string;
  description: string;
  stack: string[];
  live?: string;
  github?: string;
};

export type Testimonial = { quote: string; name: string; role?: string };

function fail(file: string, path: string, expected: string): never {
  throw new Error(`content/${file}: ${path} must be ${expected}`);
}

function str(file: string, path: string, value: unknown, max = 2000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) fail(file, path, `a non-empty string ≤ ${max} chars`);
  return value;
}

function url(file: string, path: string, value: unknown): string {
  const raw = str(file, path, value, 500);
  if (!/^(https:\/\/|mailto:)/.test(raw)) fail(file, path, "an https:// or mailto: URL");
  return raw;
}

function strList(file: string, path: string, value: unknown): string[] {
  if (!Array.isArray(value)) fail(file, path, "an array of strings");
  return value.map((item, i) => str(file, `${path}[${i}]`, item, 80));
}

function list<T>(file: string, path: string, value: unknown, map: (item: Record<string, unknown>, at: string) => T): T[] {
  if (!Array.isArray(value)) fail(file, path, "an array");
  return value.map((item, i) => {
    if (!item || typeof item !== "object") fail(file, `${path}[${i}]`, "an object");
    return map(item as Record<string, unknown>, `${path}[${i}]`);
  });
}

function parseSite(raw: Record<string, unknown>): Site {
  const f = "site.json";
  const seo = (raw.seo ?? {}) as Record<string, unknown>;
  return {
    name: str(f, "name", raw.name, 60),
    role: str(f, "role", raw.role, 120),
    headline: str(f, "headline", raw.headline, 120),
    intro: str(f, "intro", raw.intro, 400),
    about: str(f, "about", raw.about, 1200),
    now: str(f, "now", raw.now, 400),
    email: str(f, "email", raw.email, 254),
    socials: list(f, "socials", raw.socials, (s, at) => ({ label: str(f, `${at}.label`, s.label, 40), href: url(f, `${at}.href`, s.href) })),
    services: list(f, "services", raw.services, (s, at) => ({
      title: str(f, `${at}.title`, s.title, 80),
      note: str(f, `${at}.note`, s.note, 200),
      items: strList(f, `${at}.items`, s.items)
    })),
    process: list(f, "process", raw.process, (s, at) => ({ title: str(f, `${at}.title`, s.title, 80), copy: str(f, `${at}.copy`, s.copy, 300) })),
    contactServices: strList(f, "contactServices", raw.contactServices),
    footerNote: str(f, "footerNote", raw.footerNote, 200),
    seo: {
      title: str(f, "seo.title", seo.title, 120),
      description: str(f, "seo.description", seo.description, 300),
      url: url(f, "seo.url", seo.url),
      ogImage: url(f, "seo.ogImage", seo.ogImage),
      ogImageAlt: str(f, "seo.ogImageAlt", seo.ogImageAlt, 200)
    }
  };
}

export const site: Site = parseSite(siteJson as Record<string, unknown>);

export const projects: Project[] = list("projects.json", "projects", projectsJson, (p, at) => ({
  name: str("projects.json", `${at}.name`, p.name, 80),
  description: str("projects.json", `${at}.description`, p.description, 400),
  stack: strList("projects.json", `${at}.stack`, p.stack),
  ...(p.live === undefined ? {} : { live: url("projects.json", `${at}.live`, p.live) }),
  ...(p.github === undefined ? {} : { github: url("projects.json", `${at}.github`, p.github) })
}));

export const testimonials: Testimonial[] = list("testimonials.json", "testimonials", testimonialsJson, (t, at) => ({
  quote: str("testimonials.json", `${at}.quote`, t.quote, 600),
  name: str("testimonials.json", `${at}.name`, t.name, 100),
  ...(t.role === undefined ? {} : { role: str("testimonials.json", `${at}.role`, t.role, 100) })
}));
