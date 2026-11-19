/* CAUZ LAB public live view: a READ-ONLY variant of the plant control UI.
 * Data: one sanitized status.json published by the home server to a public GitHub repo, fetched
 * client-side from api.github.com with ETag / If-None-Match. No login, no tokens, no actions:
 * nothing on this page can change anything on the server, and the server accepts no inbound traffic.
 * CSP-friendly: no inline handlers or styles, no innerHTML; SVG via createElementNS. */
"use strict";

const THEME_KEY = "cauz_lab_theme";
(function applyStoredTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark") document.documentElement.dataset.theme = t;
  } catch (e) { /* storage blocked: fall back to OS preference */ }
})();

// ---------------------------------------------------------------------------
// Utilities shared with the dashboard (copied from infrastructure/dashboard/public/app.js)
// ---------------------------------------------------------------------------
const DASH = "—";
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  } catch (e) { return null; }
  return value;
}

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

/* h("a", {class, href, text, data: {...}}, ...children). Strings become text nodes. */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = String(v);
      else if (k === "data") { for (const [dk, dv] of Object.entries(v)) if (dv !== null && dv !== undefined) el.dataset[dk] = String(dv); }
      else if (/^on/i.test(k) || k === "style") continue; // never inline handlers or styles
      else el.setAttribute(k, v === true ? "" : String(v));
    }
  }
  return append(el, kids);
}

const SVG_NS = "http://www.w3.org/2000/svg";
/* s("rect", {x, y, class}, ...children): SVG twin of h(). */
function s(tag, attrs, ...kids) {
  const el = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (/^on/i.test(k) || k === "style") continue;
      if (k === "text") el.textContent = String(v);
      else if (k === "data") { for (const [dk, dv] of Object.entries(v)) if (dv !== null && dv !== undefined) el.dataset[dk] = String(dv); }
      else el.setAttribute(k, String(v));
    }
  }
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}

const ICONS = (() => {
  const c = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  return {
    logo: ["M4 20V9l8-5 8 5v11", "M8 20v-6h8v6", "M4 20h16"],
    grid: ["M3.5 5.5h7v5h-7z", "M13.5 5.5h7v5h-7z", "M7 10.5v3.5h10v-3.5", "M12 14v4", "M8.5 18h7v2.5h-7z"],
    alert: ["M12 3.5 2.5 20h19L12 3.5z", "M12 10v4.5", "M12 17.2h.01"],
    bell: ["M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z", "M10 20.5a2 2 0 0 0 4 0"],
    network: [c(12, 5, 2.5), c(5, 19, 2.5), c(19, 19, 2.5), "M10.8 7.3 6.2 16.7", "M13.2 7.3l4.6 9.4", "M7.5 19h9"],
    box: ["M20.5 7.8 12 3 3.5 7.8v8.4L12 21l8.5-4.8z", "M3.5 7.8 12 12.6l8.5-4.8", "M12 12.6V21"],
    layers: ["M12 3.5 3 8l9 4.5L21 8z", "M3 12.2l9 4.5 9-4.5", "M3 16.2l9 4.5 9-4.5"],
    code: ["M8 7l-5 5 5 5", "M16 7l5 5-5 5", "M13.5 4.5l-3 15"],
    upload: ["M12 15.5V4", "M7.5 8.5 12 4l4.5 4.5", "M4.5 15v4a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1v-4"],
    archive: ["M3.5 4.5h17v4h-17z", "M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5", "M10 12.5h4"],
    shield: ["M12 3l7.5 3v6c0 4.6-3.2 7.8-7.5 9-4.3-1.2-7.5-4.4-7.5-9V6z", "M9 12l2 2 4-4"],
    list: ["M9 6h11", "M9 12h11", "M9 18h11", "M4.5 6h.01", "M4.5 12h.01", "M4.5 18h.01"],
    logout: ["M9.5 20H5.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4", "M15.5 16.5 20 12l-4.5-4.5", "M20 12H9.5"],
    menu: ["M4 6.5h16", "M4 12h16", "M4 17.5h16"],
    x: ["M6 6l12 12", "M18 6 6 18"],
    refresh: ["M19.5 11A7.5 7.5 0 0 0 6 6.6L4.5 8", "M4.5 4v4h4", "M4.5 13A7.5 7.5 0 0 0 18 17.4l1.5-1.4", "M19.5 20v-4h-4"],
    sun: [c(12, 12, 4), "M12 2.5v2", "M12 19.5v2", "M5.3 5.3l1.4 1.4", "M17.3 17.3l1.4 1.4", "M2.5 12h2", "M19.5 12h2", "M5.3 18.7l1.4-1.4", "M17.3 6.7l1.4-1.4"],
    moon: ["M20 14.2A8.2 8.2 0 1 1 9.8 4a6.6 6.6 0 0 0 10.2 10.2z"],
    more: [c(12, 5.5, 0.9), c(12, 12, 0.9), c(12, 18.5, 0.9)],
    search: [c(11, 11, 6.5), "M20 20l-4.3-4.3"],
    external: ["M14 4h6v6", "M20 4l-8.5 8.5", "M18 13.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5.5"],
    copy: ["M8.5 8.5h11v11h-11z", "M15.5 8.5v-4h-11v11h4"],
    chevron: ["M9 6l6 6-6 6"],
    play: ["M7.5 5v14l11-7z"],
    stop: ["M6.5 6.5h11v11h-11z"],
    restart: ["M3.5 12a8.5 8.5 0 1 0 2.8-6.3L3.5 8.2", "M3.5 3.5v4.7h4.7"],
    file: ["M14 3.5H6.5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V8z", "M14 3.5V8h4.5", "M9 13h6", "M9 16.5h6"],
    info: [c(12, 12, 8.5), "M12 11v5", "M12 8h.01"],
    check: ["M5 12.5l4.5 4.5L19 7.5"],
    inbox: ["M3.5 13.5h5l1.5 3h4l1.5-3h5", "M6 5h12l2.5 8.5V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-5.5z"],
    trash: ["M4.5 6.5h15", "M9.5 6.5V4.5h5v2", "M6.5 6.5l1 13h9l1-13", "M10.5 10.5v6", "M13.5 10.5v6"],
    rollback: ["M9 5 4.5 9.5 9 14", "M4.5 9.5H14a5.5 5.5 0 0 1 0 11h-3"],
    key: [c(8, 15, 3.5), "M10.5 12.5 19 4", "M16 7l2.5 2.5", "M14 9l2 2"],
    clock: [c(12, 12, 8.5), "M12 7.5V12l3 2"],
    eye: ["M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z", c(12, 12, 2.8)],
    wifiOff: ["M3 3l18 18", "M8.5 16.5a5 5 0 0 1 7 0", "M5 13a10 10 0 0 1 5-2.7", "M14 10.3A10 10 0 0 1 19 13", "M12 20h.01"],
  };
})();

function icon(name) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "i");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  for (const d of ICONS[name] || []) {
    const p = document.createElementNS(SVG_NS, "path");
    p.setAttribute("d", d);
    svg.append(p);
  }
  return svg;
}
function fillIcons(root = document) {
  for (const el of $$("[data-icon]", root)) {
    if (!el.firstChild) el.append(icon(el.dataset.icon));
  }
}

function safeUrl(u) {
  return typeof u === "string" && /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : null;
}

function isNum(v) { return typeof v === "number" && Number.isFinite(v); }
function fmtNum(v, suffix = "", digits = null) {
  if (!isNum(v)) return DASH;
  return (digits === null ? String(v) : v.toFixed(digits)) + suffix;
}
function fmtBytes(n) {
  if (!isNum(n)) return DASH;
  const units = ["B", "KiB", "MiB", "GiB", "TiB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${units[i]}`;
}
function toDate(t) {
  if (t === null || t === undefined || t === "") return null;
  let d;
  if (typeof t === "number") d = new Date(t < 1e12 ? t * 1000 : t);
  else {
    const s = String(t).trim();
    d = new Date(/^\d{4}-\d{2}-\d{2} \d/.test(s) ? s.replace(" ", "T") : s);
  }
  if (isNaN(d.getTime()) || d.getFullYear() < 2000) return null;
  return d;
}
function ago(t) {
  const d = toDate(t);
  if (!d) return DASH;
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
function fmtTime(t) {
  const d = toDate(t);
  if (!d) return DASH;
  return d.toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtStamp(t) {
  const d = toDate(t);
  if (!d) return DASH;
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
function clockTime(d = new Date()) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function fmtElapsed(ms) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}
function plural(n, one, many) { return `${n} ${n === 1 ? one : (many || one + "s")}`; }
function cap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }

/* Live value: tabular numerals with the unit in smaller muted text. */
function val(v, unit, cls) {
  return h("span", { class: "val" + (cls ? " " + cls : "") }, h("span", { class: "val-n", text: v }), unit && v !== DASH ? h("span", { class: "val-u", text: unit }) : null);
}

// ---------------------------------------------------------------------------
// Status tones. ISA-101: normal is grey; colour is reserved for abnormal states
// (crit red, warn amber, info cyan) and the small green "running" LED.
// ---------------------------------------------------------------------------
function containerTone(c) {
  const st = (c.state || "").toLowerCase();
  if (st === "running") return c.health === "unhealthy" ? "err" : (c.health === "starting" ? "warn" : "ok");
  if (st === "restarting" || st === "paused" || st === "created") return "warn";
  return "err";
}
/* LED colour for a container: green run, amber starting, red fault while running, hollow when stopped. */
function ledTone(c) { const t = containerTone(c); return t === "ok" ? "ok" : (t === "warn" ? "warn" : (c.state === "running" ? "err" : "off")); }
const serviceTone = s => s.operational_status === "operational" ? "ok" : (s.operational_status === "degraded" ? "warn" : "err");
const healthTone = h => h === "healthy" ? "ok" : (h === "unhealthy" ? "err" : (h === "starting" ? "warn" : null));
function pctTone(v, warn = 85, err = 95) { return !isNum(v) ? null : (v >= err ? "err" : (v >= warn ? "warn" : null)); }
/* Incident severity -> alarm priority (critical/high = Critical, medium = Warning, low = Info). */
function sevClass(sv) { sv = String(sv || "").toLowerCase(); return (sv === "critical" || sv === "high") ? "crit" : (sv === "medium" ? "warn" : "info"); }
const SEV_LABEL = { crit: "Critical", warn: "Warning", info: "Info" };
const SEV_RANK = { crit: 0, warn: 1, info: 2 };
const ALARM_STATE = { OPEN: "Active · Unacked", ACKNOWLEDGED: "Active · Acked", RESOLVED: "Returned" };

function badge(text, tone, withDot = true) {
  return h("span", { class: "badge", data: { tone } }, withDot && tone ? h("span", { class: "led", data: { tone } }) : null, text);
}
function dot(tone, label) {
  return h("span", { class: "led", data: { tone }, role: label ? "img" : null, "aria-label": label || null, "aria-hidden": label ? null : "true" });
}
function sevChip(sev, label) {
  const k = sevClass(sev);
  return h("span", { class: "sev-chip", data: { sev: k } }, h("span", { class: "sev-shape", "aria-hidden": "true" }), label || SEV_LABEL[k]);
}
const APP_TONE = { running: "ok", success: "ok", building: "info", queued: "info", failed: "err", stopped: null, superseded: null };
const deployOk = st => st === "running" || st === "success";
function appStatus(a) { return a.status || (a.state === "running" ? "running" : "stopped"); }
function statusChip(st) {
  st = String(st || "unknown").toLowerCase();
  const tone = st === "uploading" ? "info" : (APP_TONE[st] ?? null);
  return h("span", { class: "status-chip", data: { status: st, tone } }, h("span", { class: "led", data: { tone: tone || (st === "stopped" ? "off" : "nm") } }), cap(st));
}

function pageHead(title, sub, actions, kicker) {
  return h("div", { class: "page-head" },
    h("div", { class: "head-main" },
      kicker ? h("p", { class: "eng-label", text: kicker }) : null,
      h("h1", { class: "page-title", text: title }),
      h("p", { class: "page-sub", data: { slot: "sub" } }, sub || null)),
    h("div", { class: "page-actions" }, h("span", { class: "updated", data: { updated: "" }, "aria-live": "off" }), actions || null));
}
function stateBlock({ icon: ic = "inbox", title, body, action, tone }) {
  return h("div", { class: "state", data: { tone } },
    h("span", { class: "state-icon" }, icon(ic)),
    h("p", { class: "state-title", text: title }),
    body ? (body instanceof Node ? body : h("p", { class: "state-body", text: body })) : null,
    action || null);
}
function errorBlock(err, action = "retry") {
  return stateBlock({
    icon: "alert", tone: "err",
    title: "Couldn't load the live feed",
    body: (err && err.message) || "Unknown error.",
    action: h("button", { class: "btn", type: "button", data: { action } }, icon("refresh"), "Retry"),
  });
}
function skeletonTiles(n = 6) {
  return h("div", { class: "tiles" }, Array.from({ length: n }, () => h("span", { class: "sk sk-tile sk-pulse" })));
}
function skeletonRows(n = 6) {
  return h("div", { class: "rows" }, Array.from({ length: n }, (_, i) => h("span", { class: "sk sk-row sk-pulse" + (i === 0 ? " first" : "") })));
}
function skeletonPage() { return h("div", { class: "stack-v", "aria-busy": "true" }, h("span", { class: "sr-only", text: "Loading" }), skeletonTiles(4), skeletonRows(5)); }

function tile({ label, value, unit, sub, meter, tone, href, extra }) {
  const kids = [
    h("div", { class: "tile-label" }, h("span", { class: "eng-label", text: label }), extra || null),
    h("div", { class: "tile-value" }, val(value, unit)),
    sub !== undefined ? h("div", { class: "tile-sub", text: sub }) : null,
  ];
  if (meter !== undefined) {
    const bar = h("span");
    bar.style.width = `${isNum(meter) ? Math.max(0, Math.min(100, meter)) : 0}%`; // CSSOM, allowed under CSP
    kids.push(h("div", { class: "meter", data: { tone: pctTone(meter) }, role: "presentation" }, bar));
  }
  return href ? h("a", { class: "tile", href, data: { tone } }, kids) : h("div", { class: "tile", data: { tone } }, kids);
}

/* Equipment-list table. Header labels are copied to data-label so phones can show rows as cards. */
function table(headers, rows, { dense = false, label, cards = true } = {}) {
  const labels = headers.map(hd => typeof hd === "string" ? hd : (hd.label || ""));
  for (const tr of rows) {
    Array.from(tr.children).forEach((cell, i) => { if (labels[i] && !cell.dataset.label) cell.dataset.label = labels[i]; });
  }
  return h("div", { class: "table-wrap" + (cards ? " cardable" : ""), tabindex: "0", role: "region", "aria-label": label || null },
    h("table", { class: "tbl" + (dense ? " tbl-dense" : "") },
      h("thead", null, h("tr", null, headers.map(hd => typeof hd === "string" ? h("th", { scope: "col", text: hd }) : h("th", { scope: "col", class: hd.cls || null }, hd.label ? hd.label : h("span", { class: "sr-only", text: hd.sr }))))),
      h("tbody", null, rows)));
}
function td(content, cls) { return h("td", { class: cls || null }, content); }
function kv(pairs) {
  return h("dl", { class: "kv" }, pairs.filter(Boolean).map(([k, v]) => h("div", null, h("dt", { text: k }), h("dd", null, v === null || v === undefined || v === "" ? DASH : v))));
}
function section(title, right, ...body) {
  return h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", { class: "section-title", text: title }), right || null), body);
}
function panel(title, right, ...body) {
  return h("section", { class: "panel" }, title ? h("div", { class: "panel-head" }, h("h2", { class: "panel-title", text: title }), right || null) : null, h("div", { class: "panel-body" }, body));
}
function segmented(label, options, value, onChange) {
  const seg = h("div", { class: "seg", role: "group", "aria-label": label },
    options.map(([v, l]) => h("button", { type: "button", "aria-pressed": String(v === value), data: { value: v } }, l)));
  seg.addEventListener("click", e => {
    const b = e.target.closest("button[data-value]");
    if (!b) return;
    $$("button", seg).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    onChange(b.dataset.value);
  });
  return seg;
}

// ---------------------------------------------------------------------------
// Radial gauge (SVG): 270° arc, setpoint ticks for warn/crit, numeric readout.
// invert: low values are abnormal (e.g. security score).
// ---------------------------------------------------------------------------
function gauge({ label, value, unit, min = 0, max = 100, warn, crit, invert = false, caption, digits = 0, big = false, readout }) {
  const cx = 60, cy = 60, r = 46;
  const pt = (f, rr) => {
    const a = (135 + 270 * f) * Math.PI / 180;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
  const frac = v => Math.max(0, Math.min(1, (v - min) / (max - min)));
  const [sx, sy] = pt(0, r), [ex, ey] = pt(1, r);
  const arc = `M${sx.toFixed(2)} ${sy.toFixed(2)} A${r} ${r} 0 1 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  let tone = null;
  if (isNum(value)) {
    if (invert) tone = isNum(crit) && value <= crit ? "err" : (isNum(warn) && value <= warn ? "warn" : null);
    else tone = isNum(crit) && value >= crit ? "err" : (isNum(warn) && value >= warn ? "warn" : null);
  }
  const svg = s("svg", { viewBox: "0 0 120 108", class: "gauge-svg", "aria-hidden": "true", focusable: "false" },
    s("path", { d: arc, class: "g-track", pathLength: 100 }),
    // abnormal bands drawn as thin outer arcs
    ...[[warn, crit, "warn"], [crit, invert ? min : max, "err"]].filter(([a, b]) => isNum(a) && isNum(b)).map(([a, b, t]) => {
      const fa = invert ? frac(b) : frac(a), fb = invert ? frac(a) : frac(b);
      const [ax, ay] = pt(fa, r + 7), [bx, by] = pt(fb, r + 7);
      const large = (fb - fa) * 270 > 180 ? 1 : 0;
      return s("path", { d: `M${ax.toFixed(2)} ${ay.toFixed(2)} A${r + 7} ${r + 7} 0 ${large} 1 ${bx.toFixed(2)} ${by.toFixed(2)}`, class: "g-band", data: { tone: t } });
    }),
    ...Array.from({ length: 11 }, (_, i) => {
      const [x1, y1] = pt(i / 10, r - 8), [x2, y2] = pt(i / 10, r - (i % 5 === 0 ? 13 : 10.5));
      return s("line", { x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2), class: "g-tick" });
    }),
    ...[[warn, "warn"], [crit, "err"]].filter(([v]) => isNum(v)).map(([v, t]) => {
      const [x1, y1] = pt(frac(v), r - 6), [x2, y2] = pt(frac(v), r + 11);
      return s("line", { x1: x1.toFixed(2), y1: y1.toFixed(2), x2: x2.toFixed(2), y2: y2.toFixed(2), class: "g-sp", data: { tone: t } });
    }),
    isNum(value) ? s("path", { d: arc, class: "g-val", pathLength: 100, "stroke-dasharray": `${(frac(value) * 100).toFixed(2)} 100`, data: { tone } }) : null);
  const shown = isNum(value) ? value.toFixed(digits) : DASH;
  const sp = [isNum(warn) ? `W ${warn}` : null, isNum(crit) ? `C ${crit}` : null].filter(Boolean).join(" · ");
  return h("figure", { class: "gauge" + (big ? " gauge-big" : ""), data: { tone }, role: "img",
    "aria-label": `${label}: ${shown}${unit && isNum(value) ? " " + unit : ""}${tone ? (tone === "err" ? ", critical" : ", warning") : ""}` },
    h("div", { class: "gauge-dial" }, svg,
      h("div", { class: "gauge-read" }, readout || val(shown, unit, "val-lg"))),
    h("figcaption", null,
      h("span", { class: "eng-label", text: label }),
      caption ? h("span", { class: "gauge-cap", text: caption }) : null,
      sp ? h("span", { class: "gauge-sp num", text: `SP ${sp}` }) : null));
}

// ---------------------------------------------------------------------------
// Live feed: GitHub contents API, raw media type, conditional requests.
// ---------------------------------------------------------------------------
const GITHUB_FEED = "https://api.github.com/repos/Ur-cauz/lab-status-data/contents/status.json";
// Local preview only (localhost + ?feed=local): read ./status.json next to the page instead of GitHub.
const FEED_URL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).get("feed") === "local" ? "status.json" : GITHUB_FEED;
const POLL_MS = 120000;         // normal cadence (server pushes every ~2 min; keeps under GitHub 60 req/h)
const SLOW_POLL_MS = 180000;    // when the unauthenticated quota runs low
const STALE_S = 300;            // generated_at older than this = server offline
const SCHEMA = 1;

const feed = { data: null, etag: null, fetchedAt: 0, error: null, timer: null, busy: false, nextAt: 0 };

class FeedError extends Error {
  constructor(kind, message, retryAt) { super(message); this.kind = kind; this.retryAt = retryAt || 0; }
}

function validStatus(d) {
  return d && typeof d === "object" && d.schema_version === SCHEMA && isNum(d.generated_at) &&
    Array.isArray(d.containers) && Array.isArray(d.incidents) && d.metrics && typeof d.metrics === "object";
}

async function fetchFeed() {
  const headers = { Accept: "application/vnd.github.raw+json" };
  if (feed.etag) headers["If-None-Match"] = feed.etag;
  let res;
  try {
    res = await fetch(FEED_URL, { headers, cache: "no-store", credentials: "omit", referrerPolicy: "no-referrer", mode: "cors" });
  } catch (e) {
    throw new FeedError("net", "Can't reach GitHub. Check your connection; retrying automatically.");
  }
  const remaining = Number(res.headers.get("X-RateLimit-Remaining"));
  const reset = Number(res.headers.get("X-RateLimit-Reset"));
  if (res.status === 304) return { changed: false, remaining };
  if (res.status === 403 || res.status === 429) {
    const at = isNum(reset) && reset > 0 ? reset * 1000 : Date.now() + 10 * 60000;
    throw new FeedError("rate", `GitHub's hourly request limit for your network was reached. Retrying at ${clockTime(new Date(at)).slice(0, 5)}.`, at);
  }
  if (res.status === 404) throw new FeedError("missing", "No status snapshot has been published yet.");
  if (!res.ok) throw new FeedError("http", `GitHub answered HTTP ${res.status}. Retrying automatically.`);
  let d;
  try { d = await res.json(); } catch (e) { throw new FeedError("bad", "The status snapshot could not be read."); }
  if (!validStatus(d)) throw new FeedError("bad", "The status snapshot has an unexpected format.");
  feed.etag = res.headers.get("ETag") || null;
  return { changed: true, data: d, remaining };
}

function schedule(ms) {
  clearTimeout(feed.timer);
  feed.nextAt = Date.now() + ms;
  feed.timer = setTimeout(poll, ms);
}

async function poll() {
  if (feed.busy) return;
  if (document.hidden) { schedule(POLL_MS); return; }   // resume on visibilitychange
  feed.busy = true;
  const btn = $("#refresh-btn");
  btn.classList.add("spin");
  btn.setAttribute("aria-busy", "true");
  let next = POLL_MS;
  try {
    const r = await fetchFeed();
    feed.error = null;
    feed.fetchedAt = Date.now();
    if (isNum(r.remaining) && r.remaining < 8) next = SLOW_POLL_MS;
    if (r.changed) { feed.data = r.data; onData(); }
  } catch (e) {
    feed.error = e;
    if (e.kind === "rate" && e.retryAt) next = Math.max(30000, e.retryAt - Date.now() + 2000);
    else if (e.kind === "missing") next = 5 * 60000;
    onFeedError();
  } finally {
    feed.busy = false;
    btn.classList.remove("spin");
    btn.removeAttribute("aria-busy");
    tickLive();
    schedule(next);
  }
}

const D = () => feed.data;
const byName = () => Object.fromEntries(((D() && D().containers) || []).map(c => [c.name, c]));
const dataAge = () => D() ? Math.max(0, Date.now() / 1000 - D().generated_at) : null;
const isStale = () => { const a = dataAge(); return a !== null && a > STALE_S; };

function fmtAge(sec) {
  if (!isNum(sec)) return DASH;
  sec = Math.max(0, Math.round(sec));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, "0")}s`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ${Math.floor((sec % 3600) / 60)}m`;
  return `${Math.floor(sec / 86400)}d ${Math.floor((sec % 86400) / 3600)}h`;
}
function shortAge(sec) {
  if (!isNum(sec)) return DASH;
  if (sec < 90) return `${Math.round(sec)}s`;
  if (sec < 5400) return `${Math.round(sec / 60)}m`;
  if (sec < 129600) return `${Math.round(sec / 3600)}h`;
  return `${Math.round(sec / 86400)}d`;
}
function hhmm(epoch) {
  const d = toDate(epoch);
  return d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : DASH;
}
function shortUptime(u) {
  if (!u) return null;
  const m = /^(\d+) (second|minute|hour|day|week|month|year)s?$/.exec(u);
  if (m) return m[1] + { second: "s", minute: "m", hour: "h", day: "d", week: "w", month: "mo", year: "y" }[m[2]];
  return { "About a minute": "1m", "About an hour": "1h", "Less than a second": "<1s" }[u] || u;
}

/* Header "Live · updated Xs ago", feed LED and the offline banner; ticks every second. */
function tickLive() {
  const live = $("#live"), text = $("#live-text"), comms = $("#comms"), ctext = $("#comms-text"), ban = $("#offline");
  const d = D();
  const clock = $("#alarm-clock");
  if (clock) clock.textContent = clockTime();
  if (!d) {
    const err = feed.error;
    live.dataset.state = err ? "err" : "unknown";
    setText(text, err ? "No data" : "Connecting…");
    comms.dataset.state = err ? "err" : "unknown";
    setText(ctext, err ? "Unavailable" : "Connecting");
    return;
  }
  const age = dataAge();
  const stale = age > STALE_S;
  live.dataset.state = stale ? "stale" : (feed.error ? "stale" : "ok");
  const narrow = window.matchMedia("(max-width: 639px)").matches;
  setText(text, stale ? (narrow ? `Offline · ${shortAge(age)}` : `Offline · last data ${shortAge(age)} ago`) : (narrow ? `Live · ${shortAge(age)} ago` : `Live · updated ${shortAge(age)} ago`));
  live.title = `Snapshot generated ${fmtStamp(d.generated_at)}${feed.fetchedAt ? ` · checked ${clockTime(new Date(feed.fetchedAt))}` : ""}`;
  comms.dataset.state = stale ? "err" : "ok";
  setText(ctext, stale ? "Server offline" : "Live");
  ban.hidden = !(stale || feed.error);
  if (stale) {
    ban.dataset.tone = "warn";
    if (ban.dataset.since !== String(d.generated_at)) {
      ban.dataset.since = String(d.generated_at);
      ban.replaceChildren(icon("wifiOff"), h("span", null, `Server offline since ${hhmm(d.generated_at)}`,
        h("span", { class: "sub", text: ` · showing the last snapshot from ${fmtTime(d.generated_at)}. It will refresh on its own once the server is back.` })));
    }
  } else if (feed.error) {
    ban.dataset.tone = "err";
    ban.dataset.since = "";
    if (ban.dataset.msg !== feed.error.message) {
      ban.dataset.msg = feed.error.message;
      ban.replaceChildren(icon("alert"), h("span", null, h("span", { text: "Live feed interrupted · " }), h("span", { class: "sub", text: `${feed.error.message} Showing the last snapshot.` })));
    }
  }
  if (!feed.error) ban.dataset.msg = "";
}

// ---------------------------------------------------------------------------
// Alarm banner (read-only) and nav badge
// ---------------------------------------------------------------------------
const STATE_LABEL = { active: "Active · Unacked", acknowledged: "Active · Acked", resolved: "Returned" };
function sortAlarms(list) {
  return list.slice().sort((a, b) => (SEV_RANK[sevClass(a.severity)] - SEV_RANK[sevClass(b.severity)]) ||
    ((b.updated_at || b.opened_at || 0) - (a.updated_at || a.opened_at || 0)));
}
function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }
function updateAlarmBanner() {
  const d = D();
  const bar = $("#alarmbar"), msg = $("#alarm-msg"), nav = $("#nav-alarms");
  if (!d) {
    bar.dataset.state = "unknown";
    for (const k of ["crit", "warn", "info"]) setText($(`#ac-${k} .ac-n`), "–");
    setText(msg, feed.error ? "Alarm state unavailable." : "Reading alarm state…");
    return;
  }
  const active = d.incidents.filter(i => i.state !== "resolved");
  const counts = { crit: 0, warn: 0, info: 0 }, unacked = { crit: 0, warn: 0, info: 0 };
  for (const i of active) { const k = sevClass(i.severity); counts[k]++; if (i.state === "active") unacked[k]++; }
  for (const k of ["crit", "warn", "info"]) {
    const a = $(`#ac-${k}`);
    setText($(".ac-n", a), String(counts[k]));
    a.dataset.active = counts[k] ? (unacked[k] ? "unacked" : "acked") : "none";
    a.setAttribute("aria-label", `${SEV_LABEL[k]}: ${counts[k]} active`);
  }
  nav.hidden = active.length === 0;
  nav.textContent = String(active.length);
  nav.setAttribute("aria-label", plural(active.length, "active alarm"));
  const open = sortAlarms(active.filter(i => i.state === "active"));
  const top = open[0] || null;
  bar.dataset.state = top ? sevClass(top.severity) : (active.length ? "acked" : "normal");
  if (unacked.crit > 0) bar.dataset.flash = "1"; else delete bar.dataset.flash;
  if (top) setText(msg, `${SEV_LABEL[sevClass(top.severity)]} · ${hhmm(top.opened_at)} · ${top.title}${open.length > 1 ? ` (+${open.length - 1} more)` : ""}`);
  else setText(msg, active.length ? `${plural(active.length, "active alarm")}, all acknowledged by the operator` : "No active alarms · all points normal");
}

// ---------------------------------------------------------------------------
// Detail drawer: read-only side sheet (no actions).
// ---------------------------------------------------------------------------
const drawer = { spec: null, tab: null, opener: null };
function openDrawer(spec) {
  const dlg = $("#drawer");
  drawer.opener = document.activeElement;
  drawer.spec = spec;
  $("#drawer-kicker").textContent = spec.kicker || "";
  $("#drawer-title").textContent = spec.title;
  $("#drawer-chips").replaceChildren(...(spec.chips || []));
  const tabs = $("#drawer-tabs");
  tabs.hidden = spec.tabs.length < 2;
  tabs.setAttribute("aria-label", `${spec.title} sections`);
  tabs.replaceChildren(...spec.tabs.map(t => h("button", { class: "tab", type: "button", role: "tab", id: `dtab-${t.id}`, "aria-controls": "drawer-body", "aria-selected": "false", tabindex: "-1", data: { action: "drawer-tab", tab: t.id } }, t.label)));
  if (!dlg.open) dlg.showModal();
  selectDrawerTab(spec.tabs[0].id, false);
  const close = $("[data-action=drawer-close]", dlg);
  if (close) close.focus();
}
function selectDrawerTab(id, focus) {
  const sp = drawer.spec;
  if (!sp) return;
  drawer.tab = id;
  for (const b of $$("#drawer-tabs .tab")) {
    const on = b.dataset.tab === id;
    b.setAttribute("aria-selected", String(on));
    b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  }
  const body = $("#drawer-body");
  body.setAttribute("aria-labelledby", sp.tabs.length > 1 ? `dtab-${id}` : "drawer-title");
  body.replaceChildren();
  body.scrollTop = 0;
  (sp.tabs.find(x => x.id === id) || sp.tabs[0]).render(body);
}
function closeDrawer() { const dlg = $("#drawer"); if (dlg.open) dlg.close(); }
function onDrawerClosed() {
  drawer.spec = null;
  $("#drawer-body").replaceChildren();
  const o = drawer.opener;
  drawer.opener = null;
  if (o && o.isConnected && typeof o.focus === "function") o.focus();
}
function drawerTabKeys(e) {
  const tabs = $$("#drawer-tabs .tab");
  const i = tabs.indexOf(document.activeElement);
  if (i < 0) return;
  let n = null;
  if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
  else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
  else if (e.key === "Home") n = 0;
  else if (e.key === "End") n = tabs.length - 1;
  if (n === null) return;
  e.preventDefault();
  selectDrawerTab(tabs[n].dataset.tab, true);
}

/* Container status tone from the published status word. */
const STATUS_TONE = { running: "ok", degraded: "warn", unhealthy: "err", stopped: "off" };
function ctTone(c) { return c.status === "running" ? "ok" : (c.status === "degraded" ? "warn" : "err"); }
function ctLed(c) { return STATUS_TONE[c.status] || "off"; }

function containerPanel(c) {
  return h("div", null,
    panel("Equipment", null, kv([
      ["Status", badge(cap(c.status), c.status === "running" ? null : ctTone(c), c.status !== "running")],
      ["Health check", c.health && c.health !== "none" ? badge(c.health, healthTone(c.health) === "ok" ? null : healthTone(c.health), false) : h("span", { class: "muted", text: "No health check" })],
      ["Class", c.category],
      ["Stack", c.stack ? h("a", { class: "link-accent mono", href: "#/stacks", text: c.stack }) : DASH],
      ["Uptime", c.uptime || (c.state === "running" ? DASH : "Not running")],
      ["Memory", isNum(c.mem_percent) ? val(c.mem_percent.toFixed(1), "% of host") : DASH],
    ])),
    h("p", { class: "muted small section", text: "Read-only view. Names are public aliases; addresses, ports and versions are not published." }));
}
function networkPanel(c) {
  const d = D();
  const nets = (d.networks || []).filter(n => n.members.includes(c.name));
  const links = (d.links || []).filter(l => l.from === c.name || l.to === c.name);
  return h("div", null,
    section("Networks", null, nets.length ? table(["Network", "Isolation"], nets.map(n => h("tr", null,
      td(n.name, "mono-cell nowrap"), td(n.internal ? "Internal" : "Routed"))), { label: "Networks" })
      : h("p", { class: "muted", text: "Not attached to a published network." })),
    links.length ? section("Service links", null, table(["From", "To"], links.map(l => h("tr", null, td(l.from), td(l.to))), { label: "Service links" })) : null);
}
function openContainerDrawer(name) {
  const c = byName()[name];
  if (!c) return;
  openDrawer({
    kicker: `${c.category} · equipment`, title: c.name,
    chips: [badge(cap(c.status), c.status === "running" ? "ok" : ctTone(c)), c.stack ? h("span", { class: "mono muted", text: c.stack }) : null].filter(Boolean),
    tabs: [{ id: "status", label: "Status", render: b => b.append(containerPanel(c)) }, { id: "network", label: "Network", render: b => b.append(networkPanel(c)) }],
  });
}

// ---------------------------------------------------------------------------
// Plant schematic (public names)
// ---------------------------------------------------------------------------
const BW = 170, BH = 62;
const MEDIA_AUTOMATION = ["Movie library", "TV library", "Indexer manager", "Download client", "Subtitle manager", "Media requests"];
const SVC_ROWS = [["Control center", "Control center"], ["Cloud storage", "Cloud storage"], ["Media server", "Media server"], ["Dashboards", "Metrics dashboards"], ["DNS filter", "DNS filter"], ["Vault", "Credentials vault"]];
const PLANT_NODES = [
  { id: "users", label: "Visitors", x: 16, y: 250, group: "Ingress", kind: "host" },
  { id: "vpn", label: "Private network", x: 226, y: 250, group: "Ingress", kind: "host" },
  { id: "gw", label: "Web gateway", x: 436, y: 250, group: "Ingress", ct: "Web gateway" },
  ...SVC_ROWS.map(([l, n], i) => ({ id: `svc${i}`, label: l, x: 676, y: 36 + i * 72, group: "Services", ct: n })),
  { id: "apps", label: "Apps", x: 676, y: 468, group: "Services", kind: "apps" },
  { id: "db", label: "Database", x: 932, y: 82, group: "Data", ct: "Database" },
  { id: "cache", label: "Cache", x: 932, y: 166, group: "Data", ct: "Cache" },
  { id: "media", label: "Automation", x: 932, y: 282, group: "Media", kind: "group", members: MEDIA_AUTOMATION },
  { id: "hostt", label: "Host telemetry", x: 16, y: 574, group: "Telemetry", ct: "Host telemetry" },
  { id: "ctt", label: "Ctr telemetry", x: 226, y: 574, group: "Telemetry", ct: "Container telemetry" },
  { id: "tsdb", label: "Metrics DB", x: 436, y: 574, group: "Telemetry", ct: "Metrics database" },
  { id: "proxies", label: "API gateways", x: 676, y: 574, group: "Container engine", kind: "proxies" },
  { id: "docker", label: "Docker engine", x: 932, y: 574, group: "Container engine", kind: "docker" },
];
const PLANT_EDGES = [
  ["users", "vpn", "M186 281H226"],
  ["vpn", "gw", "M396 281H436"],
  ...SVC_ROWS.map((_, i) => ["gw", `svc${i}`, `M606 281H641V${36 + i * 72 + BH / 2}H676`]),
  ["gw", "apps", `M606 281H641V${468 + BH / 2}H676`],
  ["svc1", "db", "M846 139H889V113H932"],
  ["svc1", "cache", "M846 139H889V197H932"],
  ["svc2", "media", "M846 211H874V313H932"],
  ["ctt", "tsdb", "M396 605H436"],
  ["hostt", "tsdb", "M101 636V652H521V636"],
  ["proxies", "docker", "M846 605H932"],
];
const PLANT_GROUPS = [["Ingress", 16, 238], ["Services", 676, 24], ["Data", 932, 70], ["Media", 932, 270], ["Telemetry", 16, 562], ["Container engine", 676, 562]];

function plantModel(d) {
  const items = d.containers || [];
  const map = byName();
  const worst = list => list.map(c => c.status === "running" ? null : (c.status === "degraded" ? "warn" : (c.status === "unhealthy" ? "crit" : "warn"))).filter(Boolean).sort((a, b) => SEV_RANK[a] - SEV_RANK[b])[0] || null;
  return PLANT_NODES.map(n => {
    const m = { node: n, state: "nm", word: "N/M", value: "not monitored", alarm: null, ct: null };
    if (n.kind === "host") { m.value = n.id === "users" ? "read-only guests" : "encrypted mesh"; return m; }
    if (n.kind === "docker") {
      const run = items.filter(c => c.state === "running").length;
      if (!items.length) { m.state = "fault"; m.word = "NO DATA"; m.value = "no containers"; m.alarm = "warn"; }
      else { m.state = "run"; m.word = "RUN"; m.value = `${run}/${items.length} ctrs up`; }
      return m;
    }
    if (n.kind === "proxies" || n.kind === "group") {
      const px = n.kind === "proxies" ? items.filter(c => c.kind === "proxy") : n.members.map(x => map[x]).filter(Boolean);
      const run = px.filter(c => c.status === "running").length;
      if (!px.length) { m.state = "absent"; m.word = "NONE"; m.value = "not deployed"; return m; }
      m.state = run === px.length ? "run" : (run ? "fault" : "stop");
      m.word = run === px.length ? "RUN" : (run ? "PART" : "STOP");
      m.value = `${run}/${px.length} up`;
      m.alarm = worst(px);
      m.list = px;
      return m;
    }
    if (n.kind === "apps") {
      const list = d.apps || [];
      const run = list.filter(a => a.status === "running").length;
      const failed = list.filter(a => a.status === "failed").length;
      m.state = list.length ? (run ? "run" : "stop") : "absent";
      m.word = list.length ? (run ? "RUN" : "STOP") : "NONE";
      m.value = list.length ? `${run}/${list.length} running` : "none deployed";
      m.alarm = failed ? "warn" : null;
      return m;
    }
    const c = map[n.ct];
    if (!c) { m.state = "absent"; m.word = "NONE"; m.value = "not deployed"; return m; }
    m.ct = c;
    const running = c.state === "running";
    const bad = running && c.status !== "running";
    m.state = !running ? "stop" : (bad ? "fault" : "run");
    m.word = !running ? "STOP" : (bad ? "FAULT" : "RUN");
    m.alarm = worst([c]);
    m.value = !running ? "stopped" : [shortUptime(c.uptime) ? `up ${shortUptime(c.uptime)}` : null, isNum(c.mem_percent) ? `${c.mem_percent.toFixed(1)}%` : null].filter(Boolean).join(" · ") || "running";
    return m;
  });
}

function alarmGlyph(sev, x, y) {
  if (!sev) return null;
  const g = s("g", { class: "pn-alarm", data: { sev }, transform: `translate(${x} ${y})` });
  if (sev === "crit") g.append(s("rect", { x: -7, y: -7, width: 14, height: 14, transform: "rotate(45)" }));
  else if (sev === "warn") g.append(s("path", { d: "M0 -8 L8 7 H-8 Z" }));
  else g.append(s("circle", { r: 7.5 }));
  g.append(s("text", { y: sev === "warn" ? 5 : 4, "text-anchor": "middle", text: sev === "info" ? "i" : "!" }));
  return g;
}
function plantLabel(m) {
  return `${m.node.label}: ${m.word === "N/M" ? "not monitored" : m.word.toLowerCase()}, ${m.value}${m.alarm ? `, ${SEV_LABEL[m.alarm]} alarm` : ""}`;
}
function renderPlantSvg(model) {
  const byId = Object.fromEntries(model.map(m => [m.node.id, m]));
  const healthy = id => { const m = byId[id]; return m && (m.state === "run" || m.state === "nm"); };
  return s("svg", { viewBox: "0 0 1120 664", class: "plant-svg", role: "group", "aria-label": "Plant schematic: ingress, services, data, media, telemetry and container engine" },
    s("defs", null, s("marker", { id: "arw", viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, s("path", { d: "M0 0L8 4L0 8z", class: "arw" }))),
    s("line", { x1: 0, y1: 545, x2: 1120, y2: 545, class: "plant-sep" }),
    PLANT_GROUPS.map(([t, x, y]) => s("text", { x, y, class: "plant-group", text: t.toUpperCase() })),
    PLANT_EDGES.map(([a, b, d]) => {
      const ok = healthy(a) && healthy(b);
      const dead = (byId[a] && ["stop", "absent"].includes(byId[a].state)) || (byId[b] && ["stop", "absent"].includes(byId[b].state));
      return s("g", { class: "pipe", data: { state: dead ? "dead" : (ok ? "flow" : "fault") } },
        s("path", { d, class: "pipe-base", "marker-end": "url(#arw)" }), ok ? s("path", { d, class: "pipe-flow" }) : null);
    }),
    model.map(m => {
      const n = m.node;
      return s("g", { class: "pn", transform: `translate(${n.x} ${n.y})`, tabindex: 0, role: "button", "aria-label": plantLabel(m) + ". Open details.",
        data: { action: "plant-node", id: n.id, state: m.state, alarm: m.alarm } },
        s("rect", { class: "pn-box", width: BW, height: BH, rx: 3 }),
        s("rect", { class: "pn-hit", width: BW, height: BH, rx: 3 }),
        s("circle", { class: "pn-led", cx: 15, cy: 20, r: 5 }),
        s("text", { class: "pn-label", x: 27, y: 24, text: n.label.toUpperCase() }),
        s("text", { class: "pn-value", x: 14, y: 48, text: m.value }),
        s("text", { class: "pn-word", x: BW - 10, y: 48, "text-anchor": "end", text: m.word }),
        alarmGlyph(m.alarm, BW - 16, 18));
    }));
}
function renderPlantList(model) {
  const groups = [];
  for (const m of model) {
    let g = groups.find(x => x[0] === m.node.group);
    if (!g) groups.push(g = [m.node.group, []]);
    g[1].push(m);
  }
  return h("div", { class: "plant-list" }, groups.map(([name, ms]) => h("div", { class: "pl-group" },
    h("h3", { class: "eng-label", text: name }),
    h("ul", { role: "list" }, ms.map(m => h("li", null,
      h("button", { class: "pl-row", type: "button", data: { action: "plant-node", id: m.node.id, state: m.state, alarm: m.alarm }, "aria-label": plantLabel(m) + ". Open details." },
        h("span", { class: "led", data: { tone: m.state === "run" ? "ok" : (m.state === "fault" ? "warn" : (m.state === "stop" ? "off" : "nm")) } }),
        h("span", { class: "pl-name", text: m.node.label }),
        h("span", { class: "pl-value mono", text: m.value }),
        h("span", { class: "pl-word", text: m.word }),
        m.alarm ? h("span", { class: "sev-shape", data: { sev: m.alarm }, "aria-hidden": "true" }) : h("span", { class: "sev-none" }))))))));
}
function openPlantNode(id) {
  const d = D();
  if (!d) return;
  const m = plantModel(d).find(x => x.node.id === id);
  if (!m) return;
  const n = m.node;
  if (m.ct) { openContainerDrawer(m.ct.name); return; }
  if (n.kind === "apps") { location.hash = "#/apps"; return; }
  if (n.kind === "docker") { location.hash = "#/containers"; return; }
  if (m.list) {
    openDrawer({ kicker: `${n.group} · equipment group`, title: n.label, chips: [badge(m.word === "RUN" ? "All running" : `${m.value}`, m.word === "RUN" ? "ok" : "warn")],
      tabs: [{ id: "members", label: "Members", render: b => b.append(table(["Equipment", "State", "Uptime"], m.list.map(c => h("tr", { data: { alarm: c.status === "running" ? null : ctTone(c) } },
        td(h("button", { class: "link-btn", type: "button", data: { action: "container-drawer", name: c.name } }, dot(ctLed(c)), h("span", { text: c.name }))),
        td(badge(cap(c.status), c.status === "running" ? null : ctTone(c), false), "nowrap"),
        td(c.uptime || DASH, "nowrap"))), { label: n.label })) }] });
    return;
  }
  openDrawer({ kicker: `${n.group} · equipment`, title: n.label, chips: [badge(m.state === "absent" ? "Not deployed" : "Not monitored", null, false)],
    tabs: [{ id: "info", label: "Info", render: b => b.append(m.state === "absent"
      ? stateBlock({ icon: "box", title: `${n.label} not deployed`, body: "No matching equipment is in the published snapshot." })
      : kv([["Role", n.id === "users" ? "Visitors reach services only over an encrypted private network; nothing is exposed to the open internet." : "Private mesh network between devices and the home server."],
        ["Telemetry", "Not polled; state is inferred from the gateway and the services behind it."]])) }] });
}

// ---------------------------------------------------------------------------
// Views. Each: { nav, title, mount(root, route) -> { body, update(data) } }
// ---------------------------------------------------------------------------
const VIEWS = {};

VIEWS.overview = {
  nav: "overview", title: "Plant overview",
  mount(root) {
    const body = h("div");
    root.append(pageHead("Plant overview", "Live system schematic and host telemetry.", null, "Monitor"), body);
    return {
      body,
      update(d) {
        const host = d.host || {}, m = d.metrics || {}, t = m.temps || {}, sm = d.summary || {}, bk = d.backup || {}, rt = bk.restore_test || {};
        $("[data-slot=sub]", root).textContent = ["Home server", host.uptime_human ? `up ${host.uptime_human}` : null, isNum(host.cpu_threads) ? `${host.cpu_threads} CPU threads` : null].filter(Boolean).join(" · ");
        const model = plantModel(d);
        const plantBox = h("div", { class: "plant" }, h("div", { class: "plant-scroll" }, renderPlantSvg(model)), renderPlantList(model),
          h("div", { class: "plant-legend", "aria-label": "Legend" },
            h("span", null, h("span", { class: "led", data: { tone: "ok" } }), "Running"),
            h("span", null, h("span", { class: "led", data: { tone: "off" } }), "Stopped"),
            h("span", null, h("span", { class: "led", data: { tone: "nm" } }), "Not monitored"),
            h("span", null, h("span", { class: "sev-shape", data: { sev: "crit" } }), "Critical"),
            h("span", null, h("span", { class: "sev-shape", data: { sev: "warn" } }), "Warning"),
            h("span", { class: "muted" }, "Animated lines: flow between healthy equipment")));
        const gauges = h("div", { class: "gauges" },
          gauge({ label: "CPU", value: m.cpu_percent, unit: "%", warn: 85, crit: 95, digits: 1, caption: `Load ${fmtNum(m.load_1m)} · ${host.cpu_threads || "?"} threads` }),
          gauge({ label: "Memory", value: m.mem_percent, unit: "%", warn: 85, crit: 92, digits: 1, caption: isNum(m.swap_percent) ? `Swap ${m.swap_percent}%` : DASH }),
          gauge({ label: "Disk /", value: m.disk_percent, unit: "%", warn: 85, crit: 95, digits: 1, caption: "System volume" }),
          gauge({ label: "NVMe temp", value: t.nvme, unit: "°C", min: 20, max: 90, warn: 70, crit: 80, digits: 1, caption: `CPU ${fmtNum(t.cpu, " °C")}` }));
        const bAge = bk.last_success_age_seconds !== null && isNum(bk.last_success_at) ? Date.now() / 1000 - bk.last_success_at : null;
        const rAge = isNum(rt.last_run_at) ? Date.now() / 1000 - rt.last_run_at : null;
        const points = h("div", { class: "tiles" },
          tile({ label: "Containers", href: "#/containers", value: isNum(sm.running) ? String(sm.running) : DASH, unit: isNum(sm.containers_total) ? `/ ${sm.containers_total}` : null,
            tone: sm.unhealthy > 0 ? "err" : (sm.containers_total > 0 && sm.running < sm.containers_total ? "warn" : null),
            sub: `${sm.unhealthy || 0} unhealthy · ${sm.stopped || 0} stopped` }),
          tile({ label: "Active alarms", href: "#/alarms", value: String(sm.alarms_active || 0),
            tone: d.incidents.some(i => i.state !== "resolved" && sevClass(i.severity) === "crit") ? "err" : (sm.alarms_active ? "warn" : null),
            sub: `${sm.alarms_unacked || 0} unacknowledged` }),
          tile({ label: "Last backup", value: bk.status === "running" ? "Running" : (bAge !== null ? `${shortAge(bAge)} ago` : "None"),
            tone: bAge === null || bAge > 36 * 3600 || bk.status === "failed" ? "warn" : null,
            sub: bAge !== null ? `Verified · ${fmtTime(bk.last_success_at)}` : "No successful backup" }),
          tile({ label: "Restore test", value: rt.status === "passed" ? "Passed" : (rt.status === "failed" ? "Failed" : "Never run"),
            tone: rt.status === "failed" ? "err" : (rt.status !== "passed" || (rAge !== null && rAge > 40 * 86400) ? "warn" : null),
            sub: rAge !== null ? `${shortAge(rAge)} ago · ${fmtTime(rt.last_run_at)}` : "Monthly drill" }));
        const services = d.services || [];
        const okCount = services.filter(x => x.status === "running").length;
        const svcTable = services.length ? table(["Equipment", { label: "Class", cls: "hide-sm" }, "State"], services.map(x => {
          const tone = x.status === "running" ? "ok" : (x.status === "degraded" ? "warn" : "err");
          return h("tr", { data: { alarm: tone === "ok" ? null : tone } },
            td(h("button", { class: "link-btn", type: "button", data: { action: "container-drawer", name: x.name } }, dot(STATUS_TONE[x.status] || "off"), h("span", { text: x.name }))),
            td(x.category, "hide-sm muted"),
            td(badge(cap(x.status), tone === "ok" ? null : tone, false), "nowrap"));
        }), { label: "Services" }) : stateBlock({ title: "No services published" });
        const hostPanel = panel("Host", null, kv([
          ["Uptime", host.uptime_human],
          ["Load 1 / 5 / 15", val(`${fmtNum(m.load_1m)} / ${fmtNum(m.load_5m)} / ${fmtNum(m.load_15m)}`)],
          ["Temperatures", val([["CPU", t.cpu], ["NVMe", t.nvme], ["GPU", t.gpu]].map(([k, v]) => `${k} ${fmtNum(v, "°C")}`).join(" · "))],
          ["Swap", isNum(m.swap_percent) ? val(String(m.swap_percent), "%") : DASH],
          ["Snapshot", h("span", { class: "mono", text: fmtStamp(d.generated_at) })],
        ]));
        body.replaceChildren(
          h("div", { class: "ov-grid" },
            panel("System schematic", h("span", { class: "muted small", text: "Select equipment for details" }), plantBox),
            h("div", { class: "ov-side" }, panel("Host telemetry", h("span", { class: "muted small", text: "Setpoints W / C" }), gauges), points)),
          section("Equipment list", h("span", { class: "muted num", text: `${okCount} of ${services.length} operational` }), svcTable),
          hostPanel);
      },
    };
  },
};

VIEWS.alarms = {
  nav: "alarms", title: "Alarms",
  mount(root, r) {
    const f = { state: "active", sev: ["crit", "warn", "info"].includes(r.q.sev) ? r.q.sev : "all" };
    let data = null;
    const counts = {};
    const seg = h("div", { class: "seg", role: "group", "aria-label": "Alarm state" });
    for (const [v, l] of [["active", "Active"], ["unacked", "Unacked"], ["returned", "Returned"], ["all", "All"]]) {
      counts[v] = h("span", { class: "num seg-n" });
      seg.append(h("button", { type: "button", "aria-pressed": String(f.state === v), data: { value: v } }, `${l} `, counts[v]));
    }
    seg.addEventListener("click", e => {
      const b = e.target.closest("button[data-value]");
      if (!b) return;
      f.state = b.dataset.value;
      $$("button", seg).forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      render();
    });
    const sevSel = h("select", { class: "select", "aria-label": "Priority" },
      [["all", "All priorities"], ["crit", "Critical"], ["warn", "Warning"], ["info", "Info"]].map(([v, l]) => h("option", { value: v }, l)));
    sevSel.value = f.sev;
    sevSel.addEventListener("change", () => { f.sev = sevSel.value; render(); });
    const body = h("div");
    root.append(pageHead("Alarms", "Raised automatically from container state, health checks, disk and memory thresholds. Read-only.", null, "Monitor"),
      h("div", { class: "toolbar" }, seg, sevSel), body);
    function render() {
      if (!data) return;
      const all = data.incidents || [];
      const sets = { active: all.filter(i => i.state !== "resolved"), unacked: all.filter(i => i.state === "active"), returned: all.filter(i => i.state === "resolved"), all };
      for (const k of Object.keys(sets)) counts[k].textContent = sets[k].length;
      let list = sets[f.state].filter(i => f.sev === "all" || sevClass(i.severity) === f.sev);
      list = f.state === "returned" ? list.slice().sort((a, b) => (b.resolved_at || b.updated_at || 0) - (a.resolved_at || a.updated_at || 0)) : sortAlarms(list);
      if (!list.length) {
        body.replaceChildren(stateBlock(f.sev !== "all"
          ? { icon: "search", title: "No alarms match this priority" }
          : f.state === "returned" ? { title: "No returned alarms" }
          : f.state === "all" ? { title: "No alarms recorded" }
          : { icon: "check", title: f.state === "unacked" ? "Nothing unacknowledged" : "No active alarms", body: "All points normal." }));
        return;
      }
      body.replaceChildren(table(["Pri", "Opened", "Message", "State"], list.map(inc => h("tr", { class: "alarm-row", data: { sev: sevClass(inc.severity), state: inc.state === "resolved" ? "RESOLVED" : inc.state.toUpperCase() } },
        td(sevChip(inc.severity), "nowrap pri-cell"),
        td(h("span", { class: "mono", title: `Opened ${fmtTime(inc.opened_at)}`, text: fmtStamp(inc.opened_at) }), "nowrap"),
        td([h("div", { class: "row-title", text: inc.title }),
          inc.resolved_at ? h("div", { class: "cell-sub wrap", text: `Returned ${ago(inc.resolved_at)} · ${fmtTime(inc.resolved_at)}` })
            : h("div", { class: "cell-sub wrap", text: `Updated ${ago(inc.updated_at)}` })], "wrap msg-cell"),
        td(h("span", { class: "alarm-state", data: { state: inc.state === "resolved" ? "RESOLVED" : (inc.state === "acknowledged" ? "ACKNOWLEDGED" : "OPEN") }, text: STATE_LABEL[inc.state] || inc.state }), "nowrap"))), { label: "Alarms" }),
        h("p", { class: "table-foot num", text: `Showing ${list.length} of ${sets[f.state].length}` }));
    }
    return { body, update(d) { data = d; render(); } };
  },
};

VIEWS.containers = {
  nav: "containers", title: "Containers",
  mount(root, r) {
    const f = { q: (r.q.q || "").toLowerCase(), state: "all", stack: "all" };
    let list = null;
    const search = h("input", { class: "input", type: "search", placeholder: "Filter by name, class or stack", "aria-label": "Filter containers" });
    search.value = r.q.q || "";
    const seg = segmented("State", [["all", "All"], ["running", "Running"], ["stopped", "Stopped"]], "all", v => { f.state = v; render(); });
    const stackSel = h("select", { class: "select", "aria-label": "Stack" }, h("option", { value: "all" }, "All stacks"));
    const body = h("div");
    root.append(pageHead("Containers", null, null, "Plant"), h("div", { class: "toolbar" }, h("div", { class: "search grow" }, icon("search"), search), seg, stackSel), body);
    search.addEventListener("input", () => { f.q = search.value.trim().toLowerCase(); render(); });
    stackSel.addEventListener("change", () => { f.stack = stackSel.value; render(); });
    function render() {
      if (!list) return;
      const running = list.filter(c => c.state === "running").length;
      $("[data-slot=sub]", root).textContent = `${running} running · ${list.length - running} stopped · ${list.filter(c => c.status === "unhealthy").length} unhealthy`;
      const stacks = Array.from(new Set(list.map(c => c.stack).filter(Boolean))).sort();
      if ($$("option", stackSel).map(o => o.value).join("|") !== ["all", ...stacks].join("|")) {
        stackSel.replaceChildren(h("option", { value: "all" }, "All stacks"), stacks.map(x => h("option", { value: x }, x)));
        if (!stacks.includes(f.stack)) f.stack = "all";
        stackSel.value = f.stack;
      }
      const rows = list.filter(c => (f.state === "all" || (f.state === "running" ? c.state === "running" : c.state !== "running")) &&
        (f.stack === "all" || c.stack === f.stack) && (!f.q || [c.name, c.category, c.stack].some(x => String(x || "").toLowerCase().includes(f.q))));
      if (!rows.length) { body.replaceChildren(stateBlock({ icon: "search", title: list.length ? "No containers match these filters" : "No containers published" })); return; }
      body.replaceChildren(table(["Equipment", { label: "Stack", cls: "hide-sm" }, "State", { label: "Health", cls: "hide-sm" }, "Uptime", "Memory"], rows.map(c => {
        const tone = ctTone(c);
        return h("tr", { data: { alarm: tone === "ok" ? null : tone } },
          td([h("button", { class: "link-btn", type: "button", data: { action: "container-drawer", name: c.name } }, dot(ctLed(c)), h("span", { text: c.name })), h("div", { class: "cell-sub", text: c.category })]),
          td(c.stack || DASH, "mono-cell nowrap hide-sm"),
          td(badge(c.status, c.status === "running" ? null : tone, false), "nowrap"),
          td(c.health && c.health !== "none" ? badge(c.health, healthTone(c.health) === "ok" ? null : healthTone(c.health), false) : h("span", { class: "muted", text: DASH }), "hide-sm"),
          td(c.uptime || DASH, "nowrap"),
          td(isNum(c.mem_percent) ? val(c.mem_percent.toFixed(1), "%") : h("span", { class: "muted", text: DASH }), "nowrap"));
      }), { label: "Containers" }), h("p", { class: "table-foot num", text: `Showing ${rows.length} of ${list.length} · memory as % of host RAM` }));
    }
    return { body, update(d) { list = d.containers || []; render(); } };
  },
};

VIEWS.stacks = {
  nav: "stacks", title: "Stacks",
  mount(root) {
    const body = h("div");
    root.append(pageHead("Stacks", "Compose projects and their equipment.", null, "Plant"), body);
    return {
      body,
      update(d) {
        const projects = d.stacks || [];
        const map = byName();
        if (!projects.length) { body.replaceChildren(stateBlock({ icon: "layers", title: "No stacks published" })); return; }
        const tone = st => st === "healthy" ? null : (st === "degraded" ? "warn" : (st === "inactive" ? null : "err"));
        body.replaceChildren(h("div", { class: "cards" }, projects.map(p => h("div", { class: "card", data: { tone: tone(p.state) } },
          h("div", { class: "card-head" }, h("div", { class: "row-main" }, h("div", { class: "card-title mono", text: p.name })), badge(cap(p.state), tone(p.state), !!tone(p.state))),
          h("div", { class: "card-meta" }, val(`${p.running}/${p.total}`, "running")),
          p.members.length ? h("div", { class: "card-list" }, p.members.map(n => {
            const c = map[n] || { status: "stopped", uptime: null };
            return h("button", { type: "button", class: "card-row", data: { action: "container-drawer", name: n } },
              dot(ctLed(c), c.status), h("span", { text: n }), h("span", { class: "muted", text: c.uptime ? `up ${c.uptime.replace(/^About/, "about")}` : c.status }));
          })) : h("p", { class: "muted", text: "No containers in this stack." })))));
      },
    };
  },
};

VIEWS.apps = {
  nav: "apps", title: "Apps",
  mount(root) {
    const body = h("div");
    root.append(pageHead("Apps", "Self-hosted apps deployed with CAUZ Deploy.", null, "Plant"), body);
    return {
      body,
      update(d) {
        const apps = d.apps || [];
        $("[data-slot=sub]", root).textContent = `${plural(apps.length, "app")} · ${apps.filter(a => a.status === "running").length} running`;
        if (!apps.length) { body.replaceChildren(stateBlock({ icon: "code", title: "No apps deployed right now" })); return; }
        body.replaceChildren(table(["App", "Status"], apps.map(a => h("tr", { data: { alarm: a.status === "failed" ? "err" : null } },
          td(h("span", { class: "mono", text: a.name })), td(statusChip(a.status), "nowrap"))), { label: "Apps" }));
      },
    };
  },
};

// ---------------------------------------------------------------------------
// Router + data fan-out
// ---------------------------------------------------------------------------
function parseRoute() {
  let q = {};
  let raw = location.hash.replace(/^#\/?/, "");
  const qi = raw.indexOf("?");
  if (qi >= 0) {
    try { for (const [k, v] of new URLSearchParams(raw.slice(qi + 1))) q[k] = v; } catch (e) { q = {}; }
    raw = raw.slice(0, qi);
  }
  const a = raw.split("/").filter(Boolean)[0];
  if (!a) return { view: "overview", q };
  if (a === "incidents") return { view: "alarms", q };
  return { view: Object.prototype.hasOwnProperty.call(VIEWS, a) ? a : "notfound", q };
}

let current = null;
function setChrome(r, view) {
  const navKey = view ? view.nav : null;
  for (const a of $$(".nav-link")) { if (a.dataset.nav === navKey) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); }
  const title = view ? view.title : "Not found";
  $("#crumbs").replaceChildren(h("li", null, h("a", { href: "#/overview", text: "CAUZ LAB" })), h("li", null, h("span", { "aria-current": "page", text: title })));
  document.title = `${title} · CAUZ LAB live view`;
}
function enterRoute(fromHashChange) {
  closeDrawer();
  setNav(false);
  const r = parseRoute();
  const key = JSON.stringify(r);
  if (current && current.key === key) return;
  const root = $("#view");
  root.replaceChildren();
  const view = VIEWS[r.view];
  setChrome(r, view);
  if (!view) {
    current = null;
    root.append(stateBlock({ icon: "search", title: "Page not found", body: "That address doesn't match any page.", action: h("a", { class: "btn", href: "#/overview" }, "Go to Plant overview") }));
    return;
  }
  const ctl = view.mount(root, r);
  current = { key, r, view, ctl, root, shown: null };
  if (fromHashChange) { window.scrollTo(0, 0); root.focus({ preventScroll: true }); }
  renderCurrent();
}
function renderCurrent() {
  const c = current;
  if (!c) return;
  const d = D();
  if (!d) {
    c.ctl.body.replaceChildren(feed.error ? errorBlock(feed.error) : skeletonPage());
    return;
  }
  if (c.shown === d) return;
  c.shown = d;
  c.ctl.update(d);
  const up = $("[data-updated]", c.root);
  if (up) up.textContent = `Snapshot ${clockTime(new Date(d.generated_at * 1000))}`;
}
function onData() {
  updateAlarmBanner();
  renderCurrent();
}
function onFeedError() {
  updateAlarmBanner();
  if (!D()) renderCurrent();
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------
function setNav(open) {
  const shell = $("#app-view");
  const wasOpen = shell.classList.contains("nav-open");
  shell.classList.toggle("nav-open", open);
  $(".nav-backdrop").hidden = !open;
  $("#nav-toggle").setAttribute("aria-expanded", String(open));
  if (open) { const l = $(".nav-link[aria-current=page]") || $(".nav-link"); if (l) l.focus(); }
  else if (wasOpen && window.matchMedia("(max-width: 1023px)").matches) $("#nav-toggle").focus();
}
function effectiveTheme() {
  const t = document.documentElement.dataset.theme;
  return t || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
}
function syncThemeButton() {
  const btn = $("#theme-btn");
  const light = effectiveTheme() === "light";
  btn.setAttribute("aria-label", light ? "Switch to night mode" : "Switch to day mode");
  btn.replaceChildren(icon(light ? "moon" : "sun"));
}
function toggleTheme() {
  const next = effectiveTheme() === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  store(THEME_KEY, next);
  syncThemeButton();
}

function handleAction(el) {
  switch (el.dataset.action) {
    case "nav-open": setNav(true); break;
    case "nav-close": setNav(false); break;
    case "theme": toggleTheme(); break;
    case "refresh": case "retry": if (!feed.busy && !(feed.error && feed.error.kind === "rate")) poll(); break;
    case "drawer-close": closeDrawer(); break;
    case "drawer-tab": selectDrawerTab(el.dataset.tab, true); break;
    case "plant-node": openPlantNode(el.dataset.id); break;
    case "container-drawer": openContainerDrawer(el.dataset.name); break;
    default: break;
  }
}

function init() {
  fillIcons();
  syncThemeButton();
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", syncThemeButton);
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-action]");
    if (!el || el.disabled) return;
    handleAction(el);
  });
  document.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("g.pn[data-action]")) { e.preventDefault(); openPlantNode(e.target.dataset.id); return; }
    if (e.target.closest && e.target.closest("#drawer-tabs")) { drawerTabKeys(e); return; }
    if (e.key === "Escape" && $("#app-view").classList.contains("nav-open")) setNav(false);
  });
  const dlg = $("#drawer");
  dlg.addEventListener("close", onDrawerClosed);
  dlg.addEventListener("click", e => { if (e.target === dlg) closeDrawer(); });
  window.addEventListener("hashchange", () => enterRoute(true));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() - feed.fetchedAt > POLL_MS - 5000 && !(feed.error && feed.error.kind === "rate" && Date.now() < feed.error.retryAt)) poll();
  });
  enterRoute(false);
  setInterval(tickLive, 1000);
  tickLive();
  poll();
}

document.addEventListener("DOMContentLoaded", init);
