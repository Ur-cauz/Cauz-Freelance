import Link from "next/link";
import { ClabMark } from "@/components/clab-mark";
import { ContactForm } from "@/components/contact-form";
import { Icon } from "@/components/icon";
import { MenuButton, SidebarNav, type NavGroup } from "@/components/panel-nav";
import { ThemeButton } from "@/components/theme-button";
import { projects, site, testimonials, type Project, type Service } from "@/lib/content";
import { getLabLive } from "@/lib/lab-status";

export const revalidate = 120; // refreshes the small "containers up" chip

const NAV: NavGroup[] = [
  {
    label: "Portfolio",
    items: [
      { href: "#top", label: "Intro", icon: "grid", spy: "top" },
      { href: "#work", label: "Selected work", icon: "box", spy: "work" },
      { href: "#services", label: "Services", icon: "layers", spy: "services" },
      { href: "#about", label: "About", icon: "code", spy: "about" }
    ]
  },
  {
    label: "More",
    items: [
      { href: "/lab", label: "C-LAB live view", icon: "network" },
      { href: "#contact", label: "Contact", icon: "upload", spy: "contact" }
    ]
  }
];

const pad = (n: number) => String(n).padStart(2, "0");

function ExtLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`}>
      {children}
      <Icon name="external" />
    </a>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <li className="reveal panel proj">
      <div className="panel-head">
        <h3 className="panel-title">{project.name}</h3>
        <span className="badges">
          {project.language ? <span className="badge">{project.language}</span> : null}
          {project.stars ? (
            <span className="badge">
              <span aria-hidden="true">★</span> {project.stars}
              <span className="sr-only"> GitHub {project.stars === 1 ? "star" : "stars"}</span>
            </span>
          ) : null}
        </span>
      </div>
      <div className="panel-body">
        <p>{project.description}</p>
        <ul className="chips" aria-label="Tags">
          {project.stack.slice(0, 2).map((item) => (
            <li key={item} className="badge">
              {item}
            </li>
          ))}
        </ul>
        <div className="links">
          {project.live ? (
            <ExtLink href={project.live} label={`${project.name} live site`}>
              Live site
            </ExtLink>
          ) : null}
          {project.github ? (
            <ExtLink href={project.github} label={`${project.name} source on GitHub`}>
              Source
            </ExtLink>
          ) : null}
        </div>
      </div>
    </li>
  );
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <li className="reveal panel svc">
      <div className="panel-head">
        <h3 className="panel-title">{service.title}</h3>
      </div>
      <div className="panel-body">
        <p>{service.note}</p>
        <ul className="chips" aria-label="Includes">
          {service.items.map((item) => (
            <li key={item} className="badge">
              {item}
            </li>
          ))}
        </ul>
        {service.links?.length ? (
          <div className="links">
            {service.links.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function SectionHead({ id, title, children }: { id: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="section-head">
      <h2 id={id} className="section-title lg">
        {title}
      </h2>
      {children ? <p className="section-sub">{children}</p> : null}
    </div>
  );
}

export default async function HomePage() {
  const year = new Date().getFullYear();
  const live = await getLabLive();

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <header className="topbar">
        <MenuButton />
        <a href="#top" className="brand" aria-label={`${site.name}, back to top`}>
          <ClabMark />
          <span className="brand-text">
            <span className="brand-name">{site.name}</span>
            <span className="brand-sub">Developer</span>
          </span>
        </a>
        <div className="topbar-spacer" />
        <div className="topbar-actions">
          <ThemeButton />
          <a href="#contact" className="btn btn-outline">
            Contact
          </a>
        </div>
      </header>

      <div className="card-main">
        <SidebarNav
          groups={NAV}
          footer={
            <>
              <div className="host-line">
                <span className="eng-label">Status</span>
                {live ? (
                  <span className="comms" data-state={live.up === live.total ? "ok" : "warn"}>
                    <span className="led" data-tone={live.up === live.total ? "ok" : "warn"} aria-hidden="true" />
                    C-LAB {live.up}/{live.total} up
                  </span>
                ) : (
                  <span className="comms">C-LAB</span>
                )}
              </div>
            </>
          }
        />
        <main id="main" className="main content enter" tabIndex={-1}>
        <div id="top">
          {/* Hero */}
          <header className="page-head">
            <div className="head-main">
              <span className="greet greet-sun">
                <Icon name="sun" />
                {site.role}
              </span>
              <h1 className="page-title hero-title">{site.headline}</h1>
              <p className="page-sub hero-sub">{site.intro}</p>
              <div className="hero-actions">
                <a href="#contact" className="btn btn-primary btn-lg">
                  Start a project
                </a>
                <a href="#work" className="btn btn-lg">
                  See selected work
                </a>
              </div>
            </div>
          </header>

          <div className="hero-grid">
            <aside className="panel" aria-labelledby="now-title">
              <div className="panel-head">
                <h2 id="now-title" className="panel-title">
                  Right now
                </h2>
                {live ? (
                  <a href="/lab" className="live-chip" aria-label={`Live: ${live.up} of ${live.total} containers up. Open the lab live view.`}>
                    <span className="led" data-tone={live.up === live.total ? "ok" : "warn"} aria-hidden="true" />
                    Live: <span className="num">{live.up}/{live.total}</span> containers up
                  </a>
                ) : (
                  <span className="badge">
                    <span className="led" data-tone="ok" aria-hidden="true" />
                    Building
                  </span>
                )}
              </div>
              <div className="panel-body">
                <p className="about-text" style={{ fontSize: 15 }}>
                  {site.now}
                </p>
                <ul className="chips" aria-label="What I work with" style={{ marginTop: 14 }}>
                  {site.services.map((s) => (
                    <li key={s.title} className="badge">
                      {s.title}
                    </li>
                  ))}
                </ul>
              </div>
            </aside>

            <section className="panel lab-teaser" aria-labelledby="lab">
              <div className="panel-head">
                <h2 id="lab" className="panel-title">
                  C-LAB
                </h2>
                <span className="badge">Live view</span>
              </div>
              <div className="panel-body">
                <p className="about-text" style={{ fontSize: 15 }}>
                  I run my own homelab, C-LAB, and you can watch it live: media streaming, cloud storage, DNS filtering and game servers on hardware at home.
                </p>
                <div className="teaser-actions">
                  <a href="/lab" className="btn btn-primary">
                    Open C-LAB live view
                  </a>
                  <Link href="/?topic=hosting&source=lab#contact" className="btn">
                    Ask about hosting
                  </Link>
                </div>
              </div>
            </section>
          </div>

          {/* Work */}
          <section className="section" aria-labelledby="work">
            <SectionHead id="work" title="Selected work">
              Real projects from my GitHub, plus what I am building now.
            </SectionHead>
            <ol className="proj-grid">
              {projects.map((project) => (
                <ProjectCard key={project.name} project={project} />
              ))}
            </ol>
            <p className="section-sub" style={{ marginTop: 14 }}>
              More on{" "}
              <a className="link-accent" href="https://github.com/Ur-cauz" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              .
            </p>
          </section>

          {/* Services + process */}
          <section className="section" aria-labelledby="services">
            <SectionHead id="services" title="What I can build for you" />
            <ul className="svc-grid">
              {site.services.map((service) => (
                <ServiceCard key={service.title} service={service} />
              ))}
            </ul>

            <div className="section-head" style={{ marginTop: 28 }}>
              <h3 className="section-title">How it works</h3>
            </div>
            <ol className="steps">
              {site.process.map((step, index) => (
                <li key={step.title} className="reveal tile step">
                  <span className="num">{pad(index + 1)}</span>
                  <strong>{step.title}</strong>
                  <p>{step.copy}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* About */}
          <section className="section" aria-labelledby="about">
            <div className="panel">
              <div className="panel-head">
                <h2 id="about" className="panel-title">
                  About
                </h2>
              </div>
              <div className="panel-body">
                <p className="about-text">{site.about}</p>
              </div>
            </div>
          </section>

          {/* Testimonials: only rendered when real quotes exist in content/testimonials.json */}
          {testimonials.length ? (
            <section className="section" aria-labelledby="kind-words">
              <SectionHead id="kind-words" title="Kind words" />
              <ul className="svc-grid">
                {testimonials.map((t) => (
                  <li key={`${t.name}-${t.quote.slice(0, 16)}`} className="reveal panel">
                    <figure className="panel-body">
                      <blockquote style={{ fontSize: 16 }}>“{t.quote}”</blockquote>
                      <figcaption className="section-sub" style={{ marginTop: 12 }}>
                        <strong style={{ color: "var(--text)" }}>{t.name}</strong>
                        {t.role ? `, ${t.role}` : null}
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Contact: the one primary action */}
          <section className="section" aria-labelledby="contact">
            <div className="contact-grid">
              <div>
                <p className="eng-label">Contact</p>
                <h2 id="contact" className="contact-title">
                  Got something brewing? Let’s make it really good.
                </h2>
                <p className="contact-lede">Tell me what you’re building. I’ll reply by email, and we can set up a short call if that helps.</p>
              </div>
              <div className="panel">
                <div className="panel-body">
                  <ContactForm services={site.contactServices} email={site.email} />
                </div>
              </div>
            </div>
          </section>

          <footer className="site-foot">
            <p>
              © {year} {site.name}. {site.footerNote}
            </p>
            <ul>
              <li>
                <a href="/lab">C-LAB</a>
              </li>
              {site.socials.map((social) => (
                <li key={social.label}>
                  <a href={social.href} {...(social.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    {social.label}
                  </a>
                </li>
              ))}
            </ul>
          </footer>
        </div>
        </main>
      </div>
    </div>
  );
}
