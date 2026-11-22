/* C-LAB /lab: visitor-facing, read-only live view (feed schema v2).
 * Reads the redacted public snapshot from api.github.com (ETag / If-None-Match) and renders it with
 * textContent and DOM calls only (no innerHTML). No cookies, no login, no actions.
 * Gauge, tile, badge and LED markup follow the control panel (dashboard/public/app.js). */
"use strict";

const FEED = "https://api.github.com/repos/Ur-cauz/lab-status-data/contents/status.json?ref=main";
const POLL_MS = 60000;
const STALE_S = 300;
const DEAD_S = 1800;
const SCHEMA = 2;
const SVGNS = "http://www.w3.org/2000/svg";

// Public service names (as published) -> card on the page. Unknown names land in "platform".
const GROUPS = {
  media: ["Media server", "Media requests", "Movie library", "TV library", "Indexer manager", "Download client", "Subtitle manager", "VPN gateway"],
  cloud: ["Cloud storage", "Credentials vault", "Cloud media storage", "Cloud media database", "Database", "Cache"],
  dns: ["DNS filter"],
  monitor: ["Host monitor", "Host monitor agent", "Metrics database", "Host telemetry", "Alert router", "Security sentinel"],
  auto: ["Automation engine", "Chat-ops bot", "Update notifier", "TV remote bridge"],
  games: ["Game server", "Game tunnel"],
};
const GROUP_OF = new Map(Object.entries(GROUPS).flatMap(([g, names]) => names.map((n) => [n, g])));

// Panel icon paths (verbatim from the control panel's ICONS).
const ICONS = {
  sun: ["M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "M12 2.5v2", "M12 19.5v2", "M5.3 5.3l1.4 1.4", "M17.3 17.3l1.4 1.4", "M2.5 12h2", "M19.5 12h2", "M5.3 18.7l1.4-1.4", "M17.3 6.7l1.4-1.4"],
  moon: ["M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z"],
  grid: ["M3.5 5.5h7v5h-7z", "M13.5 5.5h7v5h-7z", "M7 10.5v3.5h10v-3.5", "M12 14v4", "M8.5 18h7v2.5h-7z"],
  bell: ["M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z", "M10 20.5a2 2 0 0 0 4 0"],
  box: ["M20.5 7.8 12 3 3.5 7.8v8.4L12 21l8.5-4.8z", "M3.5 7.8 12 12.6l8.5-4.8", "M12 12.6V21"],
  layers: ["M12 3.5 3 8l9 4.5L21 8z", "M3 12.2l9 4.5 9-4.5", "M3 16.2l9 4.5 9-4.5"],
  code: ["M8 7l-5 5 5 5", "M16 7l5 5-5 5", "M13.5 4.5l-3 15"],
  menu: ["M4 6.5h16", "M4 12h16", "M4 17.5h16"],
  x: ["M6 6l12 12", "M18 6 6 18"],
  external: ["M14 4h6v6", "M20 4l-8.5 8.5", "M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5"],
};

const $ = (s, r = document) => r.querySelector(s);
const feed = { data: null, etag: null, timer: null };
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const fmt = (v, d = 0) => (isNum(v) ? v.toFixed(d) : "–");

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "value" || k === "max") el[k] = v;
    else el.setAttribute(k, String(v));
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}
function s(tag, attrs) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, String(v));
  return el;
}
function icon(name) {
  const svg = s("svg", { viewBox: "0 0 24 24", class: "i", "aria-hidden": "true", focusable: "false" });
  for (const d of ICONS[name] || []) svg.append(s("path", { d }));
  return svg;
}

function ago(sec) {
  if (!isNum(sec) || sec < 0) return "–";
  if (sec < 90) return Math.round(sec) + " s ago";
  if (sec < 5400) return Math.round(sec / 60) + " min ago";
  if (sec < 172800) return Math.round(sec / 3600) + " h ago";
  return Math.round(sec / 86400) + " d ago";
}

function setTone(el, tone) { el.dataset.tone = tone; }

/* ---------- Gauge: same geometry and parts as the control panel (270-degree dial, ticks, W/C setpoints) ---------- */
function drawGauge(fig, { value, readText, unit, caption, warn, crit, tone: forced }) {
  const dial = $(".gauge-dial", fig);
  const cx = 60, cy = 60, r = 46;
  const pt = (f, rr) => { const a = (135 + 270 * f) * Math.PI / 180; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
  const frac = (v) => Math.max(0, Math.min(1, v / 100));
  const [sx, sy] = pt(0, r), [ex, ey] = pt(1, r);
  const arc = `M${sx.toFixed(2)} ${sy.toFixed(2)} A${r} ${r} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  let tone = "";
  if (forced !== undefined) tone = forced;
  else if (isNum(value)) tone = isNum(crit) && value >= crit ? "err" : isNum(warn) && value >= warn ? "warn" : "";
  fig.dataset.tone = tone;
  let val = $(".g-val", dial);
  const dash = `${((isNum(value) ? frac(value) : 0) * 100).toFixed(2)} 100`;
  if (!val) {
    const svg = s("svg", { viewBox: "0 0 120 108", class: "gauge-svg", "aria-hidden": "true", focusable: "false" });
    svg.append(s("path", { d: arc, class: "g-track", pathLength: 100 }));
    for (const [a, b, t] of [[warn, crit, "warn"], [crit, 100, "err"]]) {
      if (!isNum(a) || !isNum(b)) continue;
      const [ax, ay] = pt(frac(a), r + 7), [bx, by] = pt(frac(b), r + 7);
      const large = (frac(b) - frac(a)) * 270 > 180 ? 1 : 0;
      svg.append(s("path", { d: `M${ax.toFixed(2)} ${ay.toFixed(2)} A${r + 7} ${r + 7} 0 ${large} 1 ${bx.toFixed(2)} ${by.toFixed(2)}`, class: "g-band", "data-tone": t }));
    }
    for (let i = 0; i <= 10; i++) {
      const [x1, y1] = pt(i / 10, r - 8), [x2, y2] = pt(i / 10, r - (i % 5 === 0 ? 13 : 10.5));
      svg.append(s("line", { x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2), class: "g-tick" }));
    }
    for (const [v, t] of [[warn, "warn"], [crit, "err"]]) {
      if (!isNum(v)) continue;
      const [x1, y1] = pt(frac(v), r - 6), [x2, y2] = pt(frac(v), r + 11);
      svg.append(s("line", { x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2), class: "g-sp", "data-tone": t }));
    }
    val = s("path", { d: arc, class: "g-val", pathLength: 100, "stroke-dasharray": "0 100" });
    svg.append(val);
    const read = h("div", { class: "gauge-read" }, h("span", { class: "val val-lg" }, h("span", { class: "val-n" }), h("span", { class: "val-u" })));
    dial.replaceChildren(svg, read);
    requestAnimationFrame(() => requestAnimationFrame(() => val.setAttribute("stroke-dasharray", dash)));
  } else val.setAttribute("stroke-dasharray", dash);
  $(".val-n", dial).textContent = readText;
  $(".val-u", dial).textContent = unit || "";
  $(".gauge-cap", fig).textContent = caption || "";
  const sp = [isNum(warn) ? `W ${warn}` : null, isNum(crit) ? `C ${crit}` : null].filter(Boolean).join(" · ");
  $(".gauge-sp", fig).textContent = sp ? `SP ${sp}` : "";
  fig.setAttribute("role", "img");
  fig.setAttribute("aria-label", `${$(".gauge-name", fig).textContent}: ${readText}${unit || ""}${tone === "err" ? ", critical" : tone === "warn" ? ", high" : ""}`);
}

function tile(key, tone, value, unit, sub, meter) {
  const t = $(`.tile[data-key="${key}"]`);
  if (!t) return;
  if (tone) t.dataset.tone = tone; else delete t.dataset.tone;
  $(".val-n", t).textContent = value;
  let u = $(".val-u", t);
  if (unit && !u) { u = h("span", { class: "val-u" }); $(".val", t).append(u); }
  if (u) u.textContent = unit || "";
  $(".tile-sub", t).textContent = sub;
  const old = $(".meter", t);
  if (old) old.remove();
  if (meter) t.append(h("div", { class: "meter", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(meter.pct), "aria-label": meter.label, "data-tone": meter.tone || null }, h("span", {})));
  const bar = $(".meter span", t);
  if (bar) { bar.style.width = "0%"; requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = Math.min(100, meter.pct).toFixed(1) + "%"; })); }
}

function render(d) {
  const sum = d.summary || {}, m = d.metrics || {}, host = d.host || {}, b = d.backup || {};
  const alarms = sum.alarms_active || 0;
  const allUp = sum.running === sum.containers_total && !sum.unhealthy;

  $("#uptime-text").textContent = host.uptime_human ? `Up ${host.uptime_human}` : "";
  $("#sp-up").textContent = host.uptime_human || "–";
  $("#sp-mem").textContent = isNum(m.mem_total_gib) ? `${fmt(m.mem_total_gib)} GiB RAM` : "–";
  $("#sp-disk").textContent = isNum(m.disk_total_gib) ? `${fmt(m.disk_total_gib)} GiB SSD storage` : "–";

  const g = (k) => $(`.gauge[data-key="${k}"]`);
  drawGauge(g("cpu"), { value: m.cpu_percent, readText: fmt(m.cpu_percent, 1), unit: "%", caption: `${host.cpu_threads || "–"} threads`, warn: 85, crit: 95 });
  drawGauge(g("mem"), { value: m.mem_percent, readText: fmt(m.mem_percent, 1), unit: "%", caption: isNum(m.mem_used_gib) ? `${fmt(m.mem_used_gib, 1)} / ${fmt(m.mem_total_gib, 1)} GiB` : "", warn: 85, crit: 92 });
  drawGauge(g("disk"), { value: m.disk_percent, readText: fmt(m.disk_percent, 1), unit: "%", caption: isNum(m.disk_used_gib) ? `${fmt(m.disk_used_gib)} / ${fmt(m.disk_total_gib)} GiB used` : "", warn: 85, crit: 95 });
  const up = sum.running, tot = sum.containers_total;
  drawGauge(g("ct"), { value: isNum(up) && tot ? (up / tot) * 100 : null, readText: isNum(up) ? String(up) : "–", unit: tot ? `/${tot}` : "", caption: allUp ? "All running" : `${sum.stopped || 0} stopped`, tone: allUp ? "" : "err" });

  tile("alerts", alarms ? "err" : "ok", alarms ? String(alarms) : "0", alarms ? "active" : "active", alarms ? "Something needs attention" : allUp ? "All systems normal. Every service is up." : "All systems normal, some services down");
  const bOk = b.status === "success";
  tile("backup", bOk ? "ok" : b.status === "running" ? "warn" : "err", bOk ? "OK" : b.status === "running" ? "Running" : "Check", "", isNum(b.last_success_at) ? `Last good backup ${ago(b.last_success_age_seconds)}` : "No good backup on record");

  const migs = (d.migrations || []).filter((x) => isNum(x.percent));
  if (migs.length) {
    const done = migs.reduce((a, x) => a + (x.done_gib || 0), 0), total = migs.reduce((a, x) => a + (x.total_gib || 0), 0);
    const pct = total > 0 ? (done / total) * 100 : migs.reduce((a, x) => a + x.percent, 0) / migs.length;
    const active = migs.some((x) => x.active);
    tile("sync", active ? "info" : "ok", pct.toFixed(0), "% synced", active ? "Moving the media library to cloud storage" : "Paused between runs", { pct, label: "Cloud sync progress" });
  } else tile("sync", "ok", "Idle", "", "No transfer in progress");

  const st = d.media?.active_streams;
  tile("streams", "", isNum(st) ? String(st) : "–", "", isNum(st) ? (st === 1 ? "stream playing right now" : "streams playing right now") : "Not reported");

  // Service cards from the container list (generic public names only)
  const by = new Map(Object.keys(GROUPS).concat("platform").map((k) => [k, []]));
  for (const c of d.containers || []) by.get(GROUP_OF.get(c.name) || "platform").push(c);
  for (const [key, list] of by) {
    const card = $(`.svc[data-group="${key}"]`);
    if (!card) continue;
    const upN = list.filter((c) => c.status === "running").length;
    const tone = !list.length ? "off" : upN === list.length ? "ok" : upN === 0 ? "err" : "warn";
    const badge = $(".panel-head .badge", card);
    setTone(badge, tone === "ok" ? "ok" : tone);
    setTone($(".led", badge), tone);
    $(".svc-state", badge).textContent = !list.length ? "No data" : upN === list.length ? `${upN}/${list.length} up` : `${upN}/${list.length} up`;
    $(".chips", card).replaceChildren(...list.map((c) => h("li", {}, h("span", { class: "led", "data-tone": c.status === "running" ? "ok" : "err", "aria-hidden": "true" }), c.name, h("span", { class: "sr-only", text: c.status === "running" ? " (up)" : " (down)" }))));
  }
}

function validate(d) {
  return d && typeof d === "object" && d.schema_version === SCHEMA && isNum(d.generated_at) && d.summary && Array.isArray(d.containers);
}

function setState(state, pulseText, commsText) {
  const tone = state === "ok" ? "ok" : state === "stale" ? "warn" : state === "err" ? "err" : "off";
  setTone($("#pulse"), tone); setTone($("#pulse-led"), tone); $("#pulse-text").textContent = pulseText;
  setTone($("#comms-side-led"), tone); $("#comms-side").dataset.state = state; $("#comms-side-text").textContent = commsText;
}

function banner(text, tone) {
  const el = $("#banner");
  if (!text) { el.hidden = true; return; }
  el.hidden = false; el.dataset.tone = tone || "warn"; el.textContent = text;
}

function tick() {
  const d = feed.data;
  if (!d) return;
  const age = Date.now() / 1000 - d.generated_at;
  const online = d.host?.status === "online";
  $("#updated").textContent = "Updated " + (age < 90 ? "just now" : ago(age));
  if (age > DEAD_S) { setState("err", "Unknown", "Feed stopped " + ago(age)); banner("The lab has not reported for " + ago(age).replace(" ago", "") + ". What you see is the last known state, not current.", "err"); }
  else if (age > STALE_S) { setState("stale", online ? "Online" : "Degraded", "Updated " + ago(age)); banner("Data is " + ago(age).replace(" ago", "") + " old. The lab may be briefly offline.", "warn"); }
  else { setState(online ? "ok" : "stale", online ? "Online" : "Degraded", "Live"); banner(null); }
}

async function load() {
  clearTimeout(feed.timer);
  try {
    const headers = { Accept: "application/vnd.github.raw+json" };
    if (feed.etag) headers["If-None-Match"] = feed.etag;
    const res = await fetch(FEED, { headers, cache: "no-cache", credentials: "omit", referrerPolicy: "no-referrer" });
    if (res.status === 304) tick();
    else if (res.ok) {
      const data = await res.json();
      if (!validate(data)) throw new Error("unexpected data format");
      feed.data = data; feed.etag = res.headers.get("ETag") || null;
      render(data); tick();
    } else if (res.status === 403 || res.status === 429) throw new Error("busy, retrying");
    else throw new Error("feed error " + res.status);
  } catch (e) {
    if (feed.data) { tick(); banner("Could not refresh just now (" + (e.message || "network") + "). Showing the last data received.", "warn"); }
    else { setState("err", "Unavailable", "Offline"); banner("Could not load live data (" + (e.message || "network") + "). Retrying.", "err"); }
  }
  feed.timer = setTimeout(load, POLL_MS);
}

function currentTheme() {
  return document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
}
function paintThemeIcon() {
  const btn = $("#theme-btn");
  const light = currentTheme() === "light";
  btn.replaceChildren(icon(light ? "moon" : "sun"));
  btn.setAttribute("aria-label", light ? "Switch to night mode" : "Switch to day mode");
}
function initTheme() {
  let t = null;
  try { t = localStorage.getItem("lab-theme"); } catch (e) { /* storage blocked */ }
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  paintThemeIcon();
  $("#theme-btn").addEventListener("click", () => {
    const next = currentTheme() === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("lab-theme", next); } catch (e) { /* ignore */ }
    paintThemeIcon();
  });
}

function fillIcons() {
  for (const el of document.querySelectorAll("[data-icon]")) if (!el.firstChild) el.append(icon(el.dataset.icon));
}

// Mobile nav drawer (same behaviour as the control panel) and a simple scroll-spy for the sidebar.
function initNav() {
  const shell = $(".shell"), toggle = $("#nav-toggle"), back = $("#nav-backdrop");
  const set = (open) => {
    shell.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    back.hidden = !open;
  };
  toggle.addEventListener("click", () => set(!shell.classList.contains("nav-open")));
  $("#nav-close").addEventListener("click", () => set(false));
  back.addEventListener("click", () => set(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
  for (const a of document.querySelectorAll(".sidebar .nav-link")) a.addEventListener("click", () => set(false));
  const links = new Map([...document.querySelectorAll("[data-spy]")].map((a) => [a.dataset.spy, a]));
  const mark = (id) => { for (const [k, a] of links) { if (k === id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); } };
  mark("top");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) mark(e.target.id);
    }, { rootMargin: "-20% 0px -65% 0px" });
    for (const id of links.keys()) { const el = document.getElementById(id); if (el) io.observe(el); }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fillIcons();
  initNav();
  initTheme();
  load();
  setInterval(tick, 15000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
});
