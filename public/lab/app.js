/* Cauz Lab /lab: visitor-facing, read-only live view (feed schema v2).
 * Reads the redacted public snapshot from api.github.com (ETag / If-None-Match), renders with
 * textContent and SVG DOM calls only (no innerHTML), no cookies, no login, no actions. */
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

function ago(sec) {
  if (!isNum(sec) || sec < 0) return "–";
  if (sec < 90) return Math.round(sec) + " s ago";
  if (sec < 5400) return Math.round(sec / 60) + " min ago";
  if (sec < 172800) return Math.round(sec / 3600) + " h ago";
  return Math.round(sec / 86400) + " d ago";
}

/* ---------- Gauge: 270-degree dial, same geometry as the control panel ---------- */
function drawGauge(fig, value, readText, unit, caption, warn, crit) {
  const dial = $(".gauge-dial", fig);
  const cx = 60, cy = 60, r = 46;
  const pt = (f, rr) => { const a = (135 + 270 * f) * Math.PI / 180; return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
  const [sx, sy] = pt(0, r), [ex, ey] = pt(1, r);
  const arc = `M${sx.toFixed(2)} ${sy.toFixed(2)} A${r} ${r} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  const frac = isNum(value) ? Math.max(0, Math.min(1, value / 100)) : 0;
  const tone = !isNum(value) ? "" : value >= crit ? "crit" : value >= warn ? "warn" : "";
  fig.dataset.tone = tone;
  let val = $(".g-val", dial);
  if (!val) {
    const svg = s("svg", { viewBox: "0 0 120 108", class: "gauge-svg", "aria-hidden": "true", focusable: "false" });
    svg.append(s("path", { d: arc, class: "g-track", pathLength: 100 }));
    for (let i = 0; i <= 10; i++) {
      const [x1, y1] = pt(i / 10, r - 8), [x2, y2] = pt(i / 10, r - (i % 5 === 0 ? 13 : 10.5));
      svg.append(s("line", { x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2), class: "g-tick" }));
    }
    val = s("path", { d: arc, class: "g-val", pathLength: 100, "stroke-dasharray": "0 100" });
    svg.append(val);
    const read = h("div", { class: "gauge-read" }, h("span", { class: "n num" }), h("span", { class: "u" }));
    dial.replaceChildren(svg, read);
    requestAnimationFrame(() => requestAnimationFrame(() => val.setAttribute("stroke-dasharray", `${(frac * 100).toFixed(2)} 100`)));
  } else {
    val.setAttribute("stroke-dasharray", `${(frac * 100).toFixed(2)} 100`);
  }
  $(".n", dial).textContent = readText;
  $(".u", dial).textContent = unit;
  $(".gauge-cap", fig).textContent = caption;
  fig.setAttribute("role", "img");
  fig.setAttribute("aria-label", `${$(".eng-label", fig).textContent}: ${readText}${unit}${tone === "crit" ? ", critical" : tone === "warn" ? ", high" : ""}`);
}

function tile(key, tone, value, sub, extra) {
  const t = $(`.tile[data-key="${key}"]`);
  if (!t) return;
  t.dataset.tone = tone || "";
  $(".tile-v", t).textContent = value;
  $(".tile-s", t).textContent = sub;
  const old = $("progress", t);
  if (old) old.remove();
  if (extra) t.append(extra);
}

function render(d) {
  const sum = d.summary || {}, m = d.metrics || {}, host = d.host || {}, b = d.backup || {};
  const now = Date.now() / 1000;
  const alarms = sum.alarms_active || 0;
  const allUp = sum.running === sum.containers_total && !sum.unhealthy;

  $("#hs-containers").textContent = `${sum.running ?? "–"}/${sum.containers_total ?? "–"}`;
  $("#hs-services").textContent = `${sum.services_ok ?? "–"}/${sum.services_total ?? "–"}`;
  $("#uptime-text").textContent = host.uptime_human ? `Up ${host.uptime_human}` : "";
  $("#sp-up").textContent = host.uptime_human || "–";
  $("#sp-mem").textContent = isNum(m.mem_total_gib) ? `${fmt(m.mem_total_gib)} GiB RAM` : "–";
  $("#sp-disk").textContent = isNum(m.disk_total_gib) ? `${fmt(m.disk_total_gib)} GiB SSD storage` : "–";

  const g = (k) => $(`.gauge[data-key="${k}"]`);
  drawGauge(g("cpu"), m.cpu_percent, fmt(m.cpu_percent), "%", `${host.cpu_threads || "–"} threads`, 75, 90);
  drawGauge(g("mem"), m.mem_percent, fmt(m.mem_percent), "%", isNum(m.mem_used_gib) ? `${fmt(m.mem_used_gib, 1)} of ${fmt(m.mem_total_gib, 1)} GiB` : "", 80, 92);
  drawGauge(g("disk"), m.disk_percent, fmt(m.disk_percent), "%", isNum(m.disk_used_gib) ? `${fmt(m.disk_used_gib)} of ${fmt(m.disk_total_gib)} GiB` : "", 80, 92);

  tile("alerts", alarms ? "crit" : "ok", alarms ? `${alarms} active` : "All systems normal", alarms ? "Something needs attention" : allUp ? "Every service is up" : "Some services are down");
  const bOk = b.status === "success";
  tile("backup", bOk ? "ok" : b.status === "running" ? "warn" : "crit", bOk ? "Backups OK" : b.status === "running" ? "Running now" : "Needs attention",
    isNum(b.last_success_at) ? `Last good backup ${ago(b.last_success_age_seconds)}` : "No good backup on record");

  const migs = (d.migrations || []).filter((x) => isNum(x.percent));
  if (migs.length) {
    const done = migs.reduce((a, x) => a + (x.done_gib || 0), 0), total = migs.reduce((a, x) => a + (x.total_gib || 0), 0);
    const pct = total > 0 ? (done / total) * 100 : migs.reduce((a, x) => a + x.percent, 0) / migs.length;
    const active = migs.some((x) => x.active);
    tile("sync", active ? "warn" : "ok", `${pct.toFixed(0)}% synced`, active ? "Moving the media library to cloud storage" : "Paused between runs",
      h("progress", { max: 100, value: Math.min(100, pct), "aria-label": "Cloud sync progress" }));
  } else tile("sync", "ok", "Idle", "No transfer in progress");

  const st = d.media?.active_streams;
  tile("streams", "", isNum(st) ? String(st) : "–", isNum(st) ? (st === 1 ? "stream playing right now" : "streams playing right now") : "Not reported");

  // Service cards from the container list (generic public names only)
  const by = new Map(Object.keys(GROUPS).concat("platform").map((k) => [k, []]));
  for (const c of d.containers || []) by.get(GROUP_OF.get(c.name) || "platform").push(c);
  for (const [key, list] of by) {
    const card = $(`.svc[data-group="${key}"]`);
    if (!card) continue;
    const up = list.filter((c) => c.status === "running").length;
    const state = !list.length ? "unknown" : up === list.length ? "up" : up === 0 ? "down" : "degraded";
    card.dataset.s = state;
    const dot = $(".dot", card);
    dot.dataset.s = state;
    dot.setAttribute("role", "img");
    dot.setAttribute("aria-label", state === "up" ? "All up" : state === "down" ? "Down" : state === "degraded" ? "Partly down" : "Unknown");
    $(".svc-meta", card).textContent = list.length ? `${up} of ${list.length} up` : "No data";
    $(".chips", card).replaceChildren(...list.map((c) => h("li", {}, h("span", { class: "dot", "data-s": c.status === "running" ? "up" : "down", "aria-hidden": "true" }), c.name, h("span", { class: "sr", text: c.status === "running" ? " (up)" : " (down)" }))));
  }
}

function validate(d) {
  return d && typeof d === "object" && d.schema_version === SCHEMA && isNum(d.generated_at) && d.summary && Array.isArray(d.containers);
}

function setPulse(state, text, note) {
  $("#pulse").dataset.state = state;
  $("#pulse-text").textContent = text;
  $("#live-note").textContent = note;
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
  $("#hs-updated").textContent = age < 90 ? "now" : ago(age).replace(" ago", "");
  if (age > DEAD_S) { setPulse("err", "Unknown", "Feed stopped " + ago(age)); banner("The lab has not reported for " + ago(age).replace(" ago", "") + ". What you see is the last known state, not current.", "err"); }
  else if (age > STALE_S) { setPulse("stale", online ? "Online" : "Degraded", "Updated " + ago(age)); banner("Data is " + ago(age).replace(" ago", "") + " old. The lab may be briefly offline.", "warn"); }
  else { setPulse(online ? "ok" : "stale", online ? "Online" : "Degraded", "Updated " + ago(age)); banner(null); }
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
    else { setPulse("err", "Unavailable", "Offline"); banner("Could not load live data (" + (e.message || "network") + "). Retrying.", "err"); }
  }
  feed.timer = setTimeout(load, POLL_MS);
}

function initTheme() {
  let t = null;
  try { t = localStorage.getItem("lab-theme"); } catch (e) { /* storage blocked */ }
  if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  $("#theme-btn").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("lab-theme", next); } catch (e) { /* ignore */ }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  load();
  setInterval(tick, 15000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
});
