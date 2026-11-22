import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import { projects, site, testimonials, type Project } from "@/lib/content";

const pad = (n: number) => String(n).padStart(2, "0");
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as React.CSSProperties;

function External({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      className="group/link inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-accent hover:underline"
    >
      {children}
      <span aria-hidden="true" className="transition-transform duration-200 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5">
        ↗
      </span>
    </a>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <li className="reveal panel flex flex-col gap-3 p-5 transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-line-strong">
      <h3 className="text-lg font-bold tracking-tight">{project.name}</h3>
      <p className="text-[15px] text-muted">{project.description}</p>
      <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
        {project.language ? <li className="chip text-fg">{project.language}</li> : null}
        {project.stack.slice(0, 2).map((item) => (
          <li key={item} className="chip">
            {item}
          </li>
        ))}
        {project.stars ? (
          <li className="chip">
            <span aria-hidden="true">★</span> {project.stars}
            <span className="sr-only"> GitHub {project.stars === 1 ? "star" : "stars"}</span>
          </li>
        ) : null}
      </ul>
      <div className="mt-auto flex gap-5 border-t border-line pt-2">
        {project.live ? (
          <External href={project.live} label={`${project.name} live site`}>
            Live site
          </External>
        ) : null}
        {project.github ? (
          <External href={project.github} label={`${project.name} source on GitHub`}>
            Source
          </External>
        ) : null}
      </div>
    </li>
  );
}

function SectionHead({ id, eyebrow, title, children }: { id: string; eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">
        {title}
      </h2>
      {children ? <p className="mt-3 text-muted">{children}</p> : null}
    </div>
  );
}

export default function HomePage() {
  const year = new Date().getFullYear();
  const navLink = "hidden min-h-11 items-center text-sm font-medium text-muted transition-colors hover:text-fg sm:inline-flex";

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-20 border-b border-line bg-panel">
        <div className="page flex min-h-[60px] items-center justify-between gap-4">
          <a href="#top" className="flex items-center gap-2.5" aria-label={`${site.name}, back to top`}>
            <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true" focusable="false">
              <rect width="32" height="32" rx="5" fill="var(--panel-3)" />
              <path d="M7 25V13l9-6 9 6v12M12 25v-7h8v7M7 25h18" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24" cy="8" r="3" fill="var(--run)" />
            </svg>
            <span className="flex flex-col leading-tight">
              <span className="text-[15px] font-extrabold uppercase tracking-[0.1em]">{site.name}</span>
              <span className="text-[11px] uppercase tracking-[0.08em] text-faint">Developer</span>
            </span>
          </a>
          <nav aria-label="Primary" className="flex items-center gap-5">
            <a href="#work" className={navLink}>
              Work
            </a>
            <a href="#services" className={navLink}>
              Services
            </a>
            <a href="/lab" className={navLink}>
              Lab
            </a>
            <a href="#about" className={navLink}>
              About
            </a>
            <a href="#contact" className="btn !min-h-10 !px-4">
              <span aria-hidden="true" className="led" />
              Contact
            </a>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section id="top" className="border-b border-line bg-gradient-to-b from-bg-2 to-bg" aria-labelledby="hero-title">
          <div className="page grid gap-10 pb-14 pt-14 sm:pb-20 sm:pt-20 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
            <div>
              <p className="eyebrow rise">{site.role}</p>
              <h1
                id="hero-title"
                className="rise mt-4 max-w-[16ch] text-[clamp(2.4rem,7vw,4.75rem)] font-extrabold leading-[1] tracking-[-0.035em]"
                style={delay(60)}
              >
                {site.headline}
              </h1>
              <p className="rise mt-6 max-w-xl text-lg text-muted" style={delay(140)}>
                {site.intro}
              </p>
              <div className="rise mt-8 flex flex-wrap items-center gap-3" style={delay(220)}>
                <a href="#contact" className="btn-primary">
                  Start a project <span aria-hidden="true">→</span>
                </a>
                <a href="#work" className="btn !min-h-12 !px-6">
                  See selected work
                </a>
              </div>
            </div>

            <aside className="rise panel" style={delay(180)} aria-labelledby="now-title">
              <h2 id="now-title" className="panel-h">
                <span>Right now</span>
                <span className="inline-flex items-center gap-2 font-normal normal-case tracking-normal text-faint">
                  <span className="relative inline-block h-2 w-2 rounded-full bg-run ping" aria-hidden="true" />
                  Building
                </span>
              </h2>
              <div className="p-4">
                <p className="text-[15px] text-muted">{site.now}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="What I work with">
                  {site.services.map((s) => (
                    <li key={s.title} className="chip">
                      {s.title}
                    </li>
                  ))}
                </ul>
              </div>
              <a
                href="/lab"
                className="flex min-h-11 items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm font-semibold text-accent hover:bg-panel-2"
              >
                <span>See my homelab running live</span>
                <span aria-hidden="true">→</span>
              </a>
            </aside>
          </div>
        </section>

        {/* Work */}
        <section className="page py-16 sm:py-20" aria-labelledby="work">
          <SectionHead id="work" eyebrow="Projects" title="Selected work">
            Real projects from my GitHub. Some were client ideas, some were late-night rabbit holes. All of them taught me something.
          </SectionHead>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.name} project={project} />
            ))}
          </ol>
          <p className="mt-6 text-sm text-muted">
            More on{" "}
            <a className="link text-fg" href="https://github.com/Ur-cauz" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            .
          </p>
        </section>

        {/* Lab teaser */}
        <section className="page pb-16 sm:pb-20" aria-labelledby="lab">
          <div className="panel grid gap-6 border-l-4 border-l-accent p-6 sm:p-8 lg:grid-cols-[minmax(0,1.4fr)_auto] lg:items-center">
            <div>
              <p className="eyebrow">Homelab</p>
              <h2 id="lab" className="mt-2 text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">
                I run my own lab, and you can watch it live.
              </h2>
              <p className="mt-3 max-w-2xl text-muted">
                Cauz Lab is a self-hosted setup at home: media streaming, cloud storage, DNS filtering and game servers. See what is running right now, or ask about hosting your own service on it.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a href="/lab" className="btn-primary">
                Open the live view
              </a>
              <Link href="/?topic=hosting&source=lab#contact" className="btn !min-h-12 !px-6">
                Ask about hosting
              </Link>
            </div>
          </div>
        </section>

        {/* Services + process */}
        <section className="border-y border-line bg-bg-2 py-16 sm:py-20" aria-labelledby="services">
          <div className="page">
            <SectionHead id="services" eyebrow="Services" title="What I can build for you" />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {site.services.map((service) => (
                <li key={service.title} className="reveal panel p-5">
                  <h3 className="text-lg font-bold tracking-tight">{service.title}</h3>
                  <p className="mt-1.5 text-[15px] text-muted">{service.note}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tools">
                    {service.items.map((item) => (
                      <li key={item} className="chip">
                        {item}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <h3 className="eng-label mt-14">How it works</h3>
            <ol className="mt-4 grid gap-4 sm:grid-cols-3">
              {site.process.map((step, index) => (
                <li key={step.title} className="reveal panel border-t-4 border-t-primary p-5">
                  <span className="font-mono text-sm tabular-nums text-accent">{pad(index + 1)}</span>
                  <p className="mt-2 text-lg font-bold tracking-tight">{step.title}</p>
                  <p className="mt-1 text-[15px] text-muted">{step.copy}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* About */}
        <section className="page py-16 sm:py-20" aria-labelledby="about">
          <div className="panel grid gap-8 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-14">
            <div>
              <p className="eyebrow">About</p>
              <h2 id="about" className="mt-2 text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">
                I’m into the overlap between good taste and things that just work.
              </h2>
            </div>
            <p className="text-lg text-muted">{site.about}</p>
          </div>
        </section>

        {/* Testimonials: only rendered when real quotes exist in content/testimonials.json */}
        {testimonials.length ? (
          <section className="page pb-16 sm:pb-20" aria-labelledby="kind-words">
            <SectionHead id="kind-words" eyebrow="Feedback" title="Kind words" />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {testimonials.map((t) => (
                <li key={`${t.name}-${t.quote.slice(0, 16)}`} className="reveal panel p-5">
                  <figure>
                    <blockquote className="text-lg leading-snug">“{t.quote}”</blockquote>
                    <figcaption className="mt-4 text-sm text-muted">
                      <span className="font-semibold text-fg">{t.name}</span>
                      {t.role ? `, ${t.role}` : null}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Contact: the one primary action */}
        <section className="border-t border-line bg-bg-2 py-16 sm:py-24" aria-labelledby="contact">
          <div className="page grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
            <div>
              <p className="eyebrow">Contact</p>
              <h2 id="contact" className="mt-2 text-[clamp(2rem,5vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
                Got something brewing? Let’s make it really good.
              </h2>
              <p className="mt-5 max-w-sm text-lg text-muted">
                Tell me what you’re building. I’ll reply by email, and we can set up a short call if that helps.
              </p>
            </div>
            <div className="panel p-5 sm:p-7">
              <ContactForm services={site.contactServices} email={site.email} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="page flex flex-col gap-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {site.name}. <span className="block sm:inline">{site.footerNote}</span>
          </p>
          <ul className="flex flex-wrap gap-x-6">
            <li>
              <a href="/lab" className="inline-flex min-h-11 items-center font-semibold text-fg transition-colors hover:text-accent">
                Lab
              </a>
            </li>
            {site.socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  {...(social.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="inline-flex min-h-11 items-center font-semibold text-fg transition-colors hover:text-accent"
                >
                  {social.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </>
  );
}
