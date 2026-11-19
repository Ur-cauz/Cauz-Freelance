import { ContactForm } from "@/components/contact-form";
import { projects, site, testimonials, type Project } from "@/lib/content";

const pad = (n: number) => String(n).padStart(2, "0");

function External({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
      className="group/link inline-flex min-h-11 items-center gap-1 text-sm font-medium text-fg transition-colors hover:text-accent-ink"
    >
      {children}
      <span aria-hidden="true" className="transition-transform duration-200 group-hover/link:-translate-y-0.5 group-hover/link:translate-x-0.5">
        ↗
      </span>
    </a>
  );
}

function ProjectRow({ project, index }: { project: Project; index: number }) {
  return (
    <li className="reveal grid gap-x-8 gap-y-3 border-t border-line py-8 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:py-10">
      <span className="text-sm tabular-nums text-muted sm:pt-2">{pad(index + 1)}</span>
      <div>
        <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</h3>
        <p className="mt-2 max-w-2xl text-muted">{project.description}</p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted" aria-label="Stack">
          {project.stack.slice(0, 3).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="flex gap-6 sm:flex-col sm:items-end sm:gap-0 sm:pt-1">
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

function SectionHead({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
      <h2 id={id} className="text-3xl font-semibold tracking-tight sm:text-5xl">
        {title}
      </h2>
      {children ? <p className="max-w-md text-muted sm:justify-self-end">{children}</p> : null}
    </div>
  );
}

export default function HomePage() {
  const year = new Date().getFullYear();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-fg focus:px-4 focus:py-2 focus:text-bg"
      >
        Skip to content
      </a>

      <header className="page flex items-center justify-between py-5">
        <a href="#top" className="inline-flex min-h-11 items-center text-lg font-semibold tracking-tight">
          {site.name}
          <span aria-hidden="true" className="ml-0.5 text-accent">
            .
          </span>
        </a>
        <nav aria-label="Primary" className="flex items-center gap-6 text-sm font-medium">
          <a href="#work" className="hidden min-h-11 items-center text-muted transition-colors hover:text-fg sm:inline-flex">
            Work
          </a>
          <a href="#services" className="hidden min-h-11 items-center text-muted transition-colors hover:text-fg sm:inline-flex">
            Services
          </a>
          <a href="#about" className="hidden min-h-11 items-center text-muted transition-colors hover:text-fg sm:inline-flex">
            About
          </a>
          <a href="#contact" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 transition-colors hover:border-fg">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
            Contact
          </a>
        </nav>
      </header>

      <main id="main">
        {/* Hero */}
        <section id="top" className="page pb-20 pt-16 sm:pb-32 sm:pt-28" aria-labelledby="hero-title">
          <p className="eyebrow rise">{site.role}</p>
          <h1
            id="hero-title"
            className="rise mt-5 max-w-[14ch] text-[clamp(2.75rem,8vw,6.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]"
            style={{ "--d": "60ms" } as React.CSSProperties}
          >
            {site.headline}
          </h1>
          <p className="rise mt-8 max-w-xl text-lg text-muted sm:text-xl" style={{ "--d": "140ms" } as React.CSSProperties}>
            {site.intro}
          </p>
          <div className="rise mt-10 flex flex-wrap items-center gap-x-8 gap-y-4" style={{ "--d": "220ms" } as React.CSSProperties}>
            <a href="#contact" className="btn-primary">
              Start a project <span aria-hidden="true">→</span>
            </a>
            <a href="#work" className="link inline-flex min-h-11 items-center text-base font-medium">
              See selected work
            </a>
          </div>
        </section>

        {/* Work */}
        <section className="page py-16 sm:py-24" aria-labelledby="work">
          <SectionHead id="work" title="Selected work">
            Some of these were client ideas, some were late-night rabbit holes. All of them taught me something I didn’t know before.
          </SectionHead>
          <ol className="mt-10 border-b border-line sm:mt-14">
            {projects.map((project, index) => (
              <ProjectRow key={project.name} project={project} index={index} />
            ))}
          </ol>
        </section>

        {/* Services + process */}
        <section className="page py-16 sm:py-24" aria-labelledby="services">
          <SectionHead id="services" title="What I can build for you" />
          <ul className="mt-10 grid gap-px overflow-hidden border-y border-line bg-line sm:mt-14 sm:grid-cols-2">
            {site.services.map((service) => (
              <li key={service.title} className="reveal bg-bg py-8 sm:p-8 sm:first:pl-0 sm:[&:nth-child(odd)]:pl-0">
                <h3 className="text-xl font-semibold tracking-tight">{service.title}</h3>
                <p className="mt-2 text-muted">{service.note}</p>
                <p className="mt-4 text-sm text-muted">{service.items.join(" · ")}</p>
              </li>
            ))}
          </ul>

          <h3 className="mt-16 text-sm font-medium text-muted sm:mt-20">How it works</h3>
          <ol className="mt-6 grid gap-8 sm:grid-cols-3">
            {site.process.map((step, index) => (
              <li key={step.title} className="reveal">
                <span className="text-sm tabular-nums text-accent-ink">{pad(index + 1)}</span>
                <p className="mt-2 text-lg font-semibold tracking-tight">{step.title}</p>
                <p className="mt-1 text-muted">{step.copy}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* About */}
        <section className="page py-16 sm:py-24" aria-labelledby="about">
          <div className="grid gap-10 border-t border-line pt-12 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:gap-16 sm:pt-16">
            <h2 id="about" className="text-3xl font-semibold tracking-tight sm:text-4xl">
              I’m into the overlap between good taste and things that just work.
            </h2>
            <div className="space-y-5 text-lg text-muted">
              <p>{site.about}</p>
              <p className="text-base">
                <span className="font-medium text-fg">Right now: </span>
                {site.now}
              </p>
            </div>
          </div>
        </section>

        {/* Testimonials: only rendered when real quotes exist in content/testimonials.json */}
        {testimonials.length ? (
          <section className="page py-16 sm:py-24" aria-labelledby="kind-words">
            <SectionHead id="kind-words" title="Kind words" />
            <ul className="mt-10 grid gap-10 sm:mt-14 sm:grid-cols-2">
              {testimonials.map((t) => (
                <li key={`${t.name}-${t.quote.slice(0, 16)}`} className="reveal">
                  <figure className="border-t border-line pt-6">
                    <blockquote className="text-xl leading-snug tracking-tight">“{t.quote}”</blockquote>
                    <figcaption className="mt-4 text-sm text-muted">
                      <span className="font-medium text-fg">{t.name}</span>
                      {t.role ? `, ${t.role}` : null}
                    </figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Contact: the one primary action */}
        <section className="page py-16 sm:py-28" aria-labelledby="contact">
          <div className="grid gap-12 rounded-3xl bg-fg/[0.035] px-5 py-12 sm:px-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
            <div>
              <h2 id="contact" className="text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1] tracking-[-0.035em]">
                Got something brewing? Let’s make it really good.
              </h2>
              <p className="mt-6 max-w-sm text-lg text-muted">
                Tell me what you’re building. I’ll reply by email, and we can set up a short call if that helps.
              </p>
            </div>
            <ContactForm services={site.contactServices} email={site.email} />
          </div>
        </section>
      </main>

      <footer className="page flex flex-col gap-6 border-t border-line py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year} {site.name}. <span className="block sm:inline">{site.footerNote}</span>
        </p>
        <ul className="flex gap-6">
          {site.socials.map((social) => (
            <li key={social.label}>
              <a
                href={social.href}
                {...(social.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="inline-flex min-h-11 items-center font-medium text-fg transition-colors hover:text-accent-ink"
              >
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </>
  );
}
