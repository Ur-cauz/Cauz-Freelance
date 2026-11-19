import { PortfolioShell } from "@/components/portfolio-shell";
import { portfolioData } from "@/lib/portfolio-data";
import { projects, site, testimonials } from "@/lib/content";

export default function HomePage() {
  return <PortfolioShell data={{ ...portfolioData, projects: projects.map((p) => ({ ...p, live: p.live ?? p.github ?? "", github: p.github ?? "" })) }} content={{ now: site.now, caseStudyTitle: "The interesting problems are usually hiding in plain sight.", caseStudyCopy: site.process[2].copy, contactEmail: site.email }} testimonials={testimonials.map((t) => ({ ...t, role: t.role ?? "" }))} />;
}
