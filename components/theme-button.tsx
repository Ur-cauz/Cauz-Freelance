"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";

const KEY = "lab-theme"; // shared with /lab

export function ThemeButton() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {
      /* storage blocked */
    }
    if (stored === "light" || stored === "dark") document.documentElement.dataset.theme = stored;
    setLight((document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")) === "light");
  }, []);

  function toggle() {
    const next = light ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    setLight(!light);
  }

  return (
    <button type="button" id="theme-btn" className="icon-btn" onClick={toggle} aria-label={light ? "Switch to night mode" : "Switch to day mode"} title="Switch colour theme">
      <Icon name={light ? "moon" : "sun"} />
    </button>
  );
}
