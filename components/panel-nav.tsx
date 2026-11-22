"use client";

import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icon";

type Item = { href: string; label: string; icon: IconName; spy?: string };
export type NavGroup = { label: string; items: Item[] };

const setOpen = (open: boolean) => {
  const shell = document.querySelector(".shell");
  shell?.classList.toggle("nav-open", open);
  document.getElementById("nav-toggle")?.setAttribute("aria-expanded", String(open));
  const back = document.getElementById("nav-backdrop");
  if (back) back.hidden = !open;
};

/** Hamburger shown below 1024px, same as the control panel. */
export function MenuButton() {
  return (
    <button
      type="button"
      id="nav-toggle"
      className="icon-btn only-mobile"
      aria-label="Open navigation"
      aria-controls="sidebar"
      aria-expanded="false"
      onClick={() => setOpen(!document.querySelector(".shell")?.classList.contains("nav-open"))}
    >
      <Icon name="menu" />
    </button>
  );
}

/** Panel-style left navigation: groups, icon links, current section marked while scrolling. */
export function SidebarNav({ groups, footer }: { groups: NavGroup[]; footer?: React.ReactNode }) {
  const [current, setCurrent] = useState("top");

  useEffect(() => {
    const ids = groups.flatMap((g) => g.items.map((i) => i.spy)).filter((x): x is string => Boolean(x));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setCurrent(e.target.id);
      },
      { rootMargin: "-20% 0px -65% 0px" }
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      io.disconnect();
      document.removeEventListener("keydown", onKey);
    };
  }, [groups]);

  return (
    <>
      <div className="nav-backdrop" id="nav-backdrop" hidden onClick={() => setOpen(false)} />
      <aside className="sidebar" id="sidebar" aria-label="Page navigation">
        <div className="sidebar-head only-mobile">
          <span className="nav-title">Menu</span>
          <button type="button" className="icon-btn" aria-label="Close navigation" onClick={() => setOpen(false)}>
            <Icon name="x" />
          </button>
        </div>
        <nav className="nav" aria-label="Sections">
          {groups.map((g) => (
            <div className="nav-group" key={g.label}>
              <div className="nav-group-label">{g.label}</div>
              {g.items.map((i) => {
                const active = i.spy === current;
                const inner = (
                  <>
                    <Icon name={i.icon} />
                    <span>{i.label}</span>
                  </>
                );
                return i.href.startsWith("#") ? (
                  <a key={i.label} className="nav-link" href={i.href} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}>
                    {inner}
                  </a>
                ) : (
                  <a key={i.label} className="nav-link" href={i.href}>
                    {inner}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>
        {footer ? <div className="sidebar-foot">{footer}</div> : null}
      </aside>
    </>
  );
}
