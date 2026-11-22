/* CAUZ LAB /lab: read-only live viewer (schema v2).
 * Reads the redacted public snapshot from api.github.com (ETag / If-None-Match), renders it with
 * textContent only (no innerHTML), no cookies, no login, no actions. */
"use strict";

const FEED = "https://api.github.com/repos/Ur-cauz/lab-status-data/contents/status.json?ref=main";
const POLL_MS = 60000;
const STALE_S = 300;
const DEAD_S = 1800;
const SCHEMA = 2;

const $ = (s) => document.querySelector(s);
const feed = { data: null, etag: null, timer: null, error: null };

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("data-") || k === "aria-label" || k === "role") el.setAttribute(k, String(v));
    else if (k === "value" || k === "max") el[k] = v;
    else if (k === "open") el.open = true;
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid);
  return el;
}

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const fmt = (v, d = 0, unit = "") => (isNum(v) ? v.toFixed(d) + unit : "–");
const tone = (p, warn, crit) => (!isNum(p) ? "" : p >= crit ? "crit" : p >= warn ? "warn" : "");

function ago(sec) {
  if (!isNum(sec) || sec < 0) return "–";
  if (sec < 90) return Math.round(sec) + "s ago";
  if (sec < 5400) return Math.round(sec / 60) + " min ago";
  if (sec < 172800) return Math.round(sec / 3600) + " h ago";
  return Math.round(sec / 86400) + " d ago";
}
function when(epoch) {
  if (!isNum(epoch)) return "never";
  return new Date(epoch * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function meter(label, value, valueText, extra, t) {
  return h("div", { class: "meter" },
    h("div", { class: "meter-h" }, h("span", { class: "k", text: label }), h("span", { class: "num", text: valueText })),
    h("progress", { max: 100, value: isNum(value) ? Math.max(0, Math.min(100, value)) : 0, "data-tone": t || tone(value, 75, 90), "aria-label": label }),
    extra ? h("div", { class: "muted", text: extra }) : null);
}

function card(title, note, cls, ...body) {
  return h("section", { class: "card " + (cls || "") }, h("h2", {}, h("span", { text: title }), note ? h("span", { class: "h-note", text: note }) : null), ...body);
}

function groups(items, rowFn) {
  const by = new Map();
  for (const it of items || []) {
    if (!by.has(it.category)) by.set(it.category, []);
    by.get(it.category).push(it);
  }
  return [...by.entries()].map(([cat, list]) =>
    h("div", { class: "group" },
      h("div", { class: "group-h" }, h("span", { text: cat }), h("span", { class: "num", text: String(list.length) })),
      h("ul", { class: "list" }, list.map(rowFn))));
}

const statusLabel = { running: "Running", degraded: "Degraded", unhealthy: "Unhealthy", stopped: "Stopped" };

function render(d) {
  const sum = d.summary || {};
  const m = d.metrics || {};
  const host = d.host || {};
  const b = d.backup || {};
  const now = Date.now() / 1000;
  const view = $("#view");
  const alarms = sum.alarms_active || 0;
  const allUp = sum.running === sum.containers_total && !sum.unhealthy;

  const kpis = h("div", { class: "kpis" },
    kpi("Containers", `${sum.running ?? "–"}/${sum.containers_total ?? "–"}`, allUp ? "all running" : `${sum.stopped || 0} stopped, ${sum.unhealthy || 0} unhealthy`, allUp ? "" : "crit"),
    kpi("Services", `${sum.services_ok ?? "–"}/${sum.services_total ?? "–"}`, "operational", sum.services_ok === sum.services_total ? "" : "warn"),
    kpi("Alerts", String(alarms), alarms ? "active now" : "none active", alarms ? "crit" : ""),
    kpi("Streams", isNum(d.media?.active_streams) ? String(d.media.active_streams) : "–", "media playing now", ""),
    kpi("Uptime", host.uptime_human || "–", host.status === "online" ? "host online" : "host degraded", host.status === "online" ? "" : "warn"));

  const hostCard = card("Host", `${host.cpu_threads || "–"} threads`, "c-6",
    h("div", { class: "card-body" },
      meter("CPU", m.cpu_percent, fmt(m.cpu_percent, 1, "%")),
      meter("Memory", m.mem_percent, fmt(m.mem_percent, 1, "%"), isNum(m.mem_used_gib) ? `${fmt(m.mem_used_gib, 1)} of ${fmt(m.mem_total_gib, 1)} GiB` : ""),
      meter("Disk", m.disk_percent, fmt(m.disk_percent, 1, "%"), isNum(m.disk_used_gib) ? `${fmt(m.disk_used_gib)} of ${fmt(m.disk_total_gib)} GiB` : "", tone(m.disk_percent, 80, 92)),
      h("dl", { class: "facts" },
        h("dt", { text: "Load 1 / 5 / 15 min" }), h("dd", { class: "num", text: [m.load_1m, m.load_5m, m.load_15m].map((x) => fmt(x, 2)).join(" / ") }),
        h("dt", { text: "Temperature (CPU / NVMe)" }), h("dd", { class: "num", text: `${fmt(m.temps?.cpu, 0, "°C")} / ${fmt(m.temps?.nvme, 0, "°C")}` }))));

  const migs = d.migrations || [];
  const migCard = card("Teldrive migration", "library to cloud storage", "c-6",
    migs.length
      ? h("div", { class: "card-body" }, migs.map((x) =>
          meter(x.name, x.percent, fmt(x.percent, 0, "%"),
            `${fmt(x.done_gib, 1)} of ${fmt(x.total_gib, 1)} GiB · ${x.active ? "running" + (x.eta ? ", ETA " + x.eta : "") : x.state === "idle" ? "paused between runs" : x.state}`, x.active ? "run" : "")))
      : h("p", { class: "empty", text: "No migration in progress." }));

  const backupAge = b.last_success_age_seconds;
  const backupCard = card("Backups", null, "c-6",
    h("div", { class: "card-body" },
      h("dl", { class: "facts" },
        h("dt", { text: "Last backup" }), h("dd", {}, h("span", { class: "chip", "data-s": b.status || "unknown" }, h("span", { class: "dot", "data-s": b.status || "unknown" }), b.status || "unknown")),
        h("dt", { text: "Last successful" }), h("dd", { class: "num", text: isNum(b.last_success_at) ? `${when(b.last_success_at)} (${ago(backupAge)})` : "never" }),
        h("dt", { text: "Restore test" }), h("dd", {}, h("span", { class: "chip", "data-s": b.restore_test?.status || "never" }, b.restore_test?.status || "never"),
          isNum(b.restore_test?.last_run_at) ? h("span", { class: "muted", text: " " + ago(now - b.restore_test.last_run_at) }) : null))));

  const incs = d.incidents || [];
  const alertCard = card("Alerts", `${alarms} active`, "c-6",
    incs.length
      ? h("ul", { class: "list" }, incs.slice(0, 8).map((i) =>
          h("li", {}, h("span", { class: "dot", "data-s": i.state === "resolved" ? "ok" : i.severity === "critical" || i.severity === "high" ? "crit" : "warn" }),
            h("span", { class: "grow", text: i.title }),
            h("span", { class: "r", text: `${i.state} · ${ago(now - (i.updated_at || i.opened_at))}` }))))
      : h("p", { class: "empty", text: "No alerts on record." }));

  const phone = phoneScreen(d, alarms, now);

  const svcCard = card("Services", `${sum.services_ok ?? 0}/${sum.services_total ?? 0} operational`, "c-6",
    ...groups(d.services, (s) => h("li", {}, h("span", { class: "dot", "data-s": s.status }), h("span", { class: "grow", text: s.name }), h("span", { class: "r", text: statusLabel[s.status] || s.status }))));

  const ctCard = h("details", { class: "card", open: window.matchMedia("(min-width: 760px)").matches },
    h("summary", {}, h("h2", {}, h("span", { text: "Containers" }), h("span", { class: "h-note", text: `${sum.running ?? 0}/${sum.containers_total ?? 0} running` }))),
    ...groups(d.containers, (c) => h("li", {}, h("span", { class: "dot", "data-s": c.status }), h("span", { class: "grow", text: c.name }),
      h("span", { class: "r", text: c.state === "running" ? "up " + (c.uptime || "") : c.state }))));

  view.replaceChildren(kpis, hostCard, migCard, backupCard, alertCard, card("Phone status screen", "what the lab phone shows", "c-6", h("div", { class: "card-body" }, phone)), svcCard, ctCard);

  const bar = $("#alarmbar");
  if (alarms) { bar.dataset.state = incs.some((i) => i.state !== "resolved" && (i.severity === "critical" || i.severity === "high")) ? "crit" : "warn"; $("#alarm-msg").textContent = `${alarms} active alert${alarms > 1 ? "s" : ""}: ${incs.find((i) => i.state !== "resolved")?.title || ""}`; }
  else { bar.dataset.state = "ok"; $("#alarm-msg").textContent = "All systems normal. No active alerts."; }
}

function kpi(l, v, s, t) {
  return h("div", { class: "kpi", "data-tone": t || null }, h("div", { class: "l", text: l }), h("div", { class: "v num", text: v }), h("div", { class: "s", text: s }));
}

function phoneScreen(d, alarms, now) {
  const sum = d.summary || {};
  const m = d.metrics || {};
  const mig = (d.migrations || [])[0];
  const ok = !alarms && sum.running === sum.containers_total;
  const row = (k, v) => h("div", { class: "p-row" }, h("span", { class: "k", text: k }), h("span", { class: "num", text: v }));
  return h("div", { class: "phone", "data-tone": alarms ? "crit" : ok ? "ok" : "warn", role: "img", "aria-label": "Mock of the lab phone status screen" },
    h("div", { class: "p-t" }, h("span", { text: "CAUZ LAB" }), h("span", { class: "num", text: new Date((d.generated_at || now) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })),
    h("div", { class: "p-big", text: alarms ? `${alarms} ALERT${alarms > 1 ? "S" : ""}` : ok ? "ALL OK" : "CHECK" }),
    row("Containers", `${sum.running ?? "–"}/${sum.containers_total ?? "–"}`),
    row("CPU", fmt(m.cpu_percent, 0, "%")),
    row("RAM", fmt(m.mem_percent, 0, "%")),
    row("Disk", fmt(m.disk_percent, 0, "%")),
    row("Migration", mig ? `${mig.name} ${fmt(mig.percent, 0, "%")}` : "–"),
    row("Streams", isNum(d.media?.active_streams) ? String(d.media.active_streams) : "–"),
    row("Backup", isNum(d.backup?.last_success_age_seconds) ? ago(d.backup.last_success_age_seconds) : "–"));
}

function validate(d) {
  return d && typeof d === "object" && d.schema_version === SCHEMA && isNum(d.generated_at) && d.summary && Array.isArray(d.containers);
}

function setLive(state, text) {
  $("#live").dataset.state = state;
  $("#live-text").textContent = text;
}

function banner(text, tn) {
  const el = $("#banner");
  if (!text) { el.hidden = true; return; }
  el.hidden = false; el.dataset.tone = tn || "warn"; el.textContent = text;
}

function tick() {
  const d = feed.data;
  if (!d) return;
  const age = Date.now() / 1000 - d.generated_at;
  if (age > DEAD_S) { setLive("err", "Feed stopped " + ago(age)); banner("The lab has not published for " + ago(age).replace(" ago", "") + ". Values below are the last known state, not current.", "err"); }
  else if (age > STALE_S) { setLive("stale", "Updated " + ago(age)); banner("Data is " + ago(age).replace(" ago", "") + " old. The lab may be briefly offline.", "warn"); }
  else { setLive("ok", "Live · " + ago(age)); banner(null); }
}

async function load() {
  clearTimeout(feed.timer);
  try {
    const headers = { Accept: "application/vnd.github.raw+json" };
    if (feed.etag) headers["If-None-Match"] = feed.etag;
    const res = await fetch(FEED, { headers, cache: "no-cache", credentials: "omit", referrerPolicy: "no-referrer" });
    if (res.status === 304) { tick(); }
    else if (res.ok) {
      const data = await res.json();
      if (!validate(data)) throw new Error("unexpected data format");
      feed.data = data; feed.etag = res.headers.get("ETag") || null; feed.error = null;
      render(data); tick();
    } else if (res.status === 403 || res.status === 429) {
      throw new Error("rate limited by GitHub; retrying");
    } else throw new Error("feed error " + res.status);
  } catch (e) {
    feed.error = e;
    if (feed.data) { setLive("stale", "Reconnecting…"); tick(); banner("Could not refresh just now (" + (e.message || "network") + "). Showing the last data received.", "warn"); }
    else { setLive("err", "Offline"); banner("Could not load live data (" + (e.message || "network") + "). Retrying.", "err"); $("#view").replaceChildren(h("p", { class: "muted", text: "Waiting for data…" })); }
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
