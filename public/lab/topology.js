/* CAUZ LAB live view: interactive riser diagram built from the PUBLIC snapshot only.
 * Adapted from infrastructure/dashboard/public/topology.js. Buses = published networks, taps =
 * published memberships, socket wires = Docker API gateways. No addresses, ports or protocols exist
 * in the data, so none can be drawn. Loaded after app.js and shares its globals. */
"use strict";

const TOPO = { GUT: 214, COL0: 236, PITCH: 168, NW: 154, NH: 54, BP: 108, LAYOUT_KEY: "cauz_lab_topo_layout", VIEW_KEY: "cauz_lab_topo_mode", HIDDEN_KEY: "cauz_lab_topo_hidden" };
const label = n => String(n || "").replace(/\s*\(.*\)$/, "");
function topoLoad(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }
function topoSave(key, v) { try { if (v === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }

/* ---------- Model ---------- */
function topoModel(d, hidden) {
  const allNets = (d.networks || []).map(n => ({ id: n.name, purpose: n.purpose || null, internal: !!n.internal, members: n.members.slice() }));
  const memberOf = {};
  for (const n of allNets) for (const m of n.members) (memberOf[m] = memberOf[m] || []).push(n.id);
  const nodes = (d.containers || []).map(c => ({ name: c.name, state: c.state, health: c.health, status: c.status, kind: c.kind, project: c.stack || "", networks: (memberOf[c.name] || []).slice() }));
  const byName = Object.fromEntries(nodes.map(n => [n.name, n]));
  const nets = allNets.filter(n => !hidden.has(n.id));
  const bandOf = Object.fromEntries(nets.map((n, i) => [n.id, i]));
  const links = (d.links || []).filter(l => byName[l.from] && byName[l.to]);

  // Docker API gateways and their consumers: reported links first, then shared internal network.
  const proxies = nodes.filter(n => n.kind === "proxy");
  const served = new Map();
  for (const p of proxies) {
    const set = new Set(links.filter(l => l.to === p.name).map(l => l.from));
    if (!set.size) for (const net of p.networks) for (const m of (allNets.find(x => x.id === net) || { members: [] }).members) if (m !== p.name && byName[m] && byName[m].kind !== "proxy") set.add(m);
    served.set(p.name, set);
  }
  const ingress = (d.ingress || []).filter(x => byName[x]);
  const topTargets = new Set(ingress);
  const visible = n => !n.networks.length || n.networks.some(x => !hidden.has(x));
  const shown = nodes.filter(visible);
  const hostBand = nets.length, engineBand = nets.length + 1;
  const ownBand = n => { const bs = n.networks.filter(x => x in bandOf).map(x => bandOf[x]); return bs.length ? Math.min(...bs) : hostBand; };
  const lowBand = n => {
    if (proxies.includes(n)) return engineBand;
    const bs = n.networks.filter(x => x in bandOf).map(x => bandOf[x]);
    return bs.length ? Math.max(...bs) : hostBand;
  };
  const occ = new Map();
  const free = (c, a, b) => { for (let i = a; i <= b; i++) if ((occ.get(i) || new Set()).has(c)) return false; return true; };
  const take = (c, a, b) => { for (let i = a; i <= b; i++) { if (!occ.has(i)) occ.set(i, new Set()); occ.get(i).add(c); } };
  const order = shown.slice().sort((a, b) => (topTargets.has(b.name) - topTargets.has(a.name)) || (ownBand(a) - ownBand(b)) ||
    String(a.project).localeCompare(String(b.project)) || a.name.localeCompare(b.name));
  for (const n of order) {
    const a = topTargets.has(n.name) ? 0 : ownBand(n), b = lowBand(n);
    let c = 0;
    while (!free(c, a, b)) c++;
    take(c, a, b);
    n.col = c;
    n.band = ownBand(n);
  }
  const maxCol = Math.max(0, ...shown.map(n => n.col));
  const edgeBottom = 24 + 44;
  const lanes0 = edgeBottom + 18;
  const bandsTop = lanes0 + ingress.length * 10 + 26;
  const nodeY = b => bandsTop + b * TOPO.BP;
  const busY = b => nodeY(b) + TOPO.NH + 24;
  const W = TOPO.COL0 + (maxCol + 1) * TOPO.PITCH + 24;
  const hasHost = shown.some(n => n.band === hostBand);
  const engineY = proxies.length ? nodeY(hasHost ? hostBand + 1 : hostBand) - 6 : null;
  const H = (engineY !== null ? engineY + 70 : nodeY(hasHost ? hostBand + 1 : hostBand)) + 10;
  for (const n of shown) { n.x = TOPO.COL0 + n.col * TOPO.PITCH; n.y = nodeY(n.band); }
  return { nets, allNets, nodes: shown, byName, proxies, served, ingress, edgeBottom, lanes0, bandsTop, busY, nodeY, W, H, engineY, hostBand, links };
}

/* ---------- Rendering ---------- */
function topoNodeState(n) {
  if (n.state !== "running") return "stop";
  if (n.status === "unhealthy" || n.status === "degraded") return "fault";
  return "run";
}
function hopPath(x, y1, y2, crossYs) {
  const dir = y2 > y1 ? 1 : -1;
  let d = `M${x} ${y1}`;
  const ys = crossYs.filter(y => (y - y1) * dir > 7 && (y2 - y) * dir > 7).sort((a, b) => (a - b) * dir);
  for (const y of ys) d += `V${y - 6 * dir}a6 6 0 0 ${dir > 0 ? 1 : 0} 0 ${12 * dir}`;
  return d + `V${y2}`;
}

function TopoDiagram(host, opts) {
  const canvas = h("div", { class: "topo-canvas" });
  const svg = s("svg", { class: "topo-svg", tabindex: 0, role: "group", "aria-label": "Network diagram. Drag to pan, pinch or Ctrl+scroll to zoom, arrow keys pan, Tab through equipment." });
  const world = s("g", { class: "topo-world" });
  const L = { bus: s("g"), wire: s("g"), edge: s("g"), link: s("g", { class: "topo-links" }), node: s("g") };
  world.append(L.bus, L.wire, L.edge, L.node, L.link);
  svg.append(s("defs", null, s("marker", { id: "tarw", viewBox: "0 0 8 8", refX: 7, refY: 4, markerWidth: 6, markerHeight: 6, orient: "auto-start-reverse" }, s("path", { d: "M0 0L8 4L0 8z", class: "tarw" }))), world);
  canvas.append(svg);
  host.append(canvas);

  let M = null, layout = topoLoad(TOPO.LAYOUT_KEY) || {}, view = { x: 16, y: 8, k: 1 }, fitted = false, hl = null, match = null;
  const apply = () => world.setAttribute("transform", `translate(${view.x.toFixed(1)} ${view.y.toFixed(1)}) scale(${view.k.toFixed(4)})`);
  const pos = n => layout[n.name] ? { x: layout[n.name][0], y: layout[n.name][1] } : { x: n.x, y: n.y };

  function renderBuses() {
    L.bus.replaceChildren();
    const maxX = Math.max(M.W, ...M.nodes.map(n => pos(n).x + TOPO.NW + 24));
    M.nets.forEach((net, i) => {
      const y = M.busY(i);
      const g = s("g", { class: "bus", data: { rel: net.members.join("|"), net: net.id, internal: net.internal ? "1" : null } });
      g.append(s("line", { x1: 18, y1: y, x2: maxX, y2: y, class: "bus-line" }));
      g.append(s("text", { x: 18, y: y - 30, class: "bus-name", text: net.id }));
      if (net.purpose) g.append(s("text", { x: 18, y: y - 15, class: "bus-sub", text: net.purpose.length > 30 ? net.purpose.slice(0, 29) + "…" : net.purpose }, s("title", { text: net.purpose })));
      if (net.internal) g.append(s("path", { class: "bus-lock", d: `M18 ${y + 8}h9v7h-9z M20 ${y + 8}v-2.5a2.5 2.5 0 0 1 5 0v2.5`, transform: "translate(0 2)" }));
      g.append(s("text", { x: net.internal ? 32 : 18, y: y + 17, class: "bus-tag", text: net.internal ? "INTERNAL" : "ROUTED" }));
      L.bus.append(g);
    });
    if (M.engineY !== null) {
      const y = M.engineY + 30;
      const g = s("g", { class: "bus bus-engine", data: { rel: M.proxies.map(p => p.name).join("|") } });
      g.append(s("line", { x1: 18, y1: y, x2: maxX, y2: y, class: "bus-line" }));
      g.append(s("text", { x: 18, y: y - 26, class: "bus-name", text: "DOCKER ENGINE" }));
      g.append(s("text", { x: 18, y: y - 12, class: "bus-sub", text: "read-only via API gateways" }));
      L.bus.append(g);
    }
    if (M.nodes.some(n => n.band === M.hostBand)) {
      L.bus.append(s("text", { x: 18, y: M.nodeY(M.hostBand) + 20, class: "bus-name", text: "NO SHARED NETWORK" }),
        s("text", { x: 18, y: M.nodeY(M.hostBand) + 35, class: "bus-sub", text: "host network or private" }));
    }
  }

  function renderWires() {
    L.wire.replaceChildren();
    const busYs = M.nets.map((_, i) => M.busY(i)).concat(M.engineY !== null ? [M.engineY + 30] : []);
    for (const n of M.nodes) {
      const p = pos(n);
      const cx = p.x + TOPO.NW / 2;
      const att = n.networks.filter(x => M.nets.some(y => y.id === x)).map(x => M.busY(M.nets.findIndex(y => y.id === x)));
      if (M.proxies.includes(n) && M.engineY !== null) att.push(M.engineY + 30);
      if (!att.length) continue;
      const running = topoNodeState(n) !== "stop";
      const g = s("g", { class: "tw", data: { rel: n.name, state: topoNodeState(n) } });
      const below = att.filter(y => y > p.y + TOPO.NH / 2), above = att.filter(y => y <= p.y + TOPO.NH / 2);
      const segs = [];
      if (below.length) segs.push(hopPath(cx, p.y + TOPO.NH, Math.max(...below), busYs.filter(y => !att.includes(y))));
      if (above.length) segs.push(hopPath(cx, p.y, Math.min(...above), busYs.filter(y => !att.includes(y))));
      for (const d of segs) {
        g.append(s("path", { d, class: "tw-base" }));
        if (running) g.append(s("path", { d, class: "tw-flow" }));
      }
      for (const y of att) g.append(s("circle", { cx, cy: y, r: 4.2, class: "tw-dot" + (y === M.engineY + 30 ? " sock" : "") }));
      L.wire.append(g);
    }
  }

  function renderEdge() {
    L.edge.replaceChildren();
    const busYs = M.nets.map((_, i) => M.busY(i));
    const rel = ["edge", ...M.ingress].join("|");
    L.edge.append(s("g", { class: "tp tp-cloud", transform: "translate(18 15)", data: { rel } },
      s("path", { d: "M26 52h112a20 20 0 0 0 0-40a26 26 0 0 0-50-10a22 22 0 0 0-40 14a18 18 0 0 0-22 36z" }),
      s("text", { x: 74, y: 30, "text-anchor": "middle", class: "tp-l", text: "PRIVATE NET" }),
      s("text", { x: 74, y: 45, "text-anchor": "middle", class: "tp-s", text: "encrypted mesh" })));
    const sx = 236, y = 24;
    L.edge.append(s("path", { class: "ew", d: `M178 48H206V${y + 17}H${sx}`, data: { rel } }));
    L.edge.append(s("g", { class: "tp tp-serve", transform: `translate(${sx} ${y})`, data: { rel } },
      s("rect", { width: 186, height: 34, rx: 17 }), s("text", { x: 14, y: 21, class: "tp-l", text: "HTTPS" }),
      s("text", { x: 172, y: 21, "text-anchor": "end", class: "tp-s", text: "named hosts" }), s("title", { text: "Private network → web gateway (TLS)" })));
    M.ingress.map(n => M.byName[n]).filter(t => M.nodes.includes(t)).sort((a, b) => pos(a).x - pos(b).x).forEach((t, i) => {
      const tp = pos(t);
      const tx = tp.x + TOPO.NW / 2;
      const ly = M.lanes0 + i * 10, rx = sx + 186 + 16 + i * 12;
      const d = `M${sx + 186} ${y + 17}H${rx}V${ly}H${tx}` + hopPath(tx, ly, tp.y, busYs).replace(/^M[^V]+/, "");
      const g = s("g", { class: "ew-g", data: { rel } }, s("path", { class: "ew", d, "marker-end": "url(#tarw)" }));
      if (t.state === "running") g.append(s("path", { class: "ew-flow", d }));
      L.edge.append(g);
    });
    L.edge.append(s("text", { x: 236, y: 14, class: "bus-sub", text: "INGRESS" }));
  }

  function renderNodes() {
    L.node.replaceChildren();
    for (const n of M.nodes) {
      const p = pos(n);
      const st = topoNodeState(n);
      const prox = M.served.get(n.name);
      const line2 = prox ? `→ ${Array.from(prox).map(label).join(", ") || "no consumer"}` : (n.project || "");
      const g = s("g", { class: "tn", transform: `translate(${p.x} ${p.y})`, tabindex: 0, role: "button",
        "aria-label": `${n.name}, ${n.status}, networks ${n.networks.join(", ") || "none"}. Open details.`,
        data: { id: n.name, state: st, proxy: prox ? "1" : null } },
        s("rect", { class: "tn-box", width: TOPO.NW, height: TOPO.NH, rx: 3 }),
        s("circle", { class: "tn-led", cx: 14, cy: 18, r: 5 }),
        s("text", { class: "tn-name", x: 26, y: 23, text: label(n.name) }),
        s("text", { class: "tn-sub", x: 12, y: 43, text: line2.length > 19 ? line2.slice(0, 18) + "…" : line2 }),
        s("text", { class: "tn-word", x: TOPO.NW - 8, y: 43, "text-anchor": "end", text: st === "run" ? "" : (st === "fault" ? "FAULT" : "STOP") }),
        s("title", { text: `${n.name}\nstack: ${n.project || "none"}\nnetworks: ${n.networks.join(", ") || "none"}` }));
      L.node.append(g);
    }
    for (const t of L.node.querySelectorAll(".tn-name")) {
      try { if (t.getComputedTextLength() > TOPO.NW - 32) { t.setAttribute("textLength", String(TOPO.NW - 32)); t.setAttribute("lengthAdjust", "spacingAndGlyphs"); } } catch (e) { /* not rendered */ }
    }
  }

  function renderAll() { renderBuses(); renderWires(); renderEdge(); renderNodes(); if (hl) highlight(hl); }

  function relatedTo(name) {
    const set = new Set([name]);
    for (const l of M.links) { if (l.from === name) set.add(l.to); if (l.to === name) set.add(l.from); }
    const sv = M.served.get(name);
    if (sv) sv.forEach(x => set.add(x));
    for (const [p, cs] of M.served) if (cs.has(name)) set.add(p);
    return set;
  }
  function highlight(name) {
    hl = name;
    L.link.replaceChildren();
    if (!name) { svg.classList.remove("hl"); for (const el of world.querySelectorAll(".on")) el.classList.remove("on"); return; }
    const set = relatedTo(name);
    svg.classList.add("hl");
    for (const el of world.querySelectorAll("[data-rel]")) el.classList.toggle("on", el.dataset.rel.split("|").includes(name));
    for (const el of L.node.querySelectorAll(".tn")) el.classList.toggle("on", set.has(el.dataset.id));
    const n = M.byName[name];
    if (!n) return;
    const c = (x, off) => { const p = pos(x); return [p.x + TOPO.NW / 2 + off, p.y]; };
    const pairs = [];
    for (const l of M.links) {
      if (l.from === name && M.nodes.includes(M.byName[l.to])) pairs.push([n, M.byName[l.to]]);
      else if (l.to === name && M.nodes.includes(M.byName[l.from])) pairs.push([M.byName[l.from], n]);
    }
    const sv = M.served.get(name);
    if (sv) sv.forEach(x => M.byName[x] && M.nodes.includes(M.byName[x]) && !pairs.some(([a, b]) => a.name === x && b === n) && pairs.push([M.byName[x], n]));
    for (const [a, b] of pairs) {
      const [x1, y1] = c(a, -18), [x2, y2] = c(b, 18);
      const mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.max(34, Math.abs(x2 - x1) * 0.16 + Math.abs(y2 - y1) * 0.25);
      L.link.append(s("path", { class: "l7", d: `M${x1} ${y1}Q${mx} ${my} ${x2} ${y2}`, "marker-end": "url(#tarw)" }));
    }
  }

  function fit(widthOnly) {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch || !M) return;
    const W = Math.max(M.W, ...M.nodes.map(n => pos(n).x + TOPO.NW + 30)), H = Math.max(M.H, ...M.nodes.map(n => pos(n).y + TOPO.NH + 30));
    view.k = Math.max(0.18, Math.min(1.4, widthOnly ? cw / W : Math.min(cw / W, ch / H)));
    view.x = (cw - W * view.k) / 2;
    view.y = widthOnly ? 4 : (ch - H * view.k) / 2;
    apply();
  }
  function zoomAt(px, py, f) {
    const k2 = Math.max(0.18, Math.min(2.6, view.k * f));
    view.x = px - (px - view.x) * (k2 / view.k);
    view.y = py - (py - view.y) * (k2 / view.k);
    view.k = k2;
    apply();
  }
  function centerOn(n) {
    const p = pos(n);
    view.k = Math.max(view.k, 0.8);
    view.x = canvas.clientWidth / 2 - (p.x + TOPO.NW / 2) * view.k;
    view.y = canvas.clientHeight / 2 - (p.y + TOPO.NH / 2) * view.k;
    apply();
  }

  const pts = new Map();
  let drag = null, pinch = null;
  svg.addEventListener("pointerdown", e => {
    if (e.button !== undefined && e.button !== 0) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { svg.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    if (pts.size === 2) {
      const [a, b] = Array.from(pts.values());
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k };
      drag = null;
      return;
    }
    const tn = e.target.closest && e.target.closest(".tn");
    drag = { sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false, node: tn ? M.byName[tn.dataset.id] : null };
    if (drag.node) { const p = pos(drag.node); drag.nx = p.x; drag.ny = p.y; }
  });
  svg.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId)) {
      const tn = e.target.closest && e.target.closest(".tn");
      if (!drag && (tn ? tn.dataset.id : null) !== hl && !svg.contains(document.activeElement)) highlight(tn ? tn.dataset.id : null);
      else if (!drag && tn && tn.dataset.id !== hl) highlight(tn.dataset.id);
      return;
    }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pts.size === 2) {
      const [a, b] = Array.from(pts.values());
      const r = svg.getBoundingClientRect();
      zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d) * pinch.k / view.k);
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    drag.moved = true;
    if (drag.node) {
      layout[drag.node.name] = [Math.round(drag.nx + dx / view.k), Math.round(drag.ny + dy / view.k)];
      const g = L.node.querySelector(`.tn[data-id="${CSS.escape(drag.node.name)}"]`);
      if (g) g.setAttribute("transform", `translate(${layout[drag.node.name][0]} ${layout[drag.node.name][1]})`);
      renderBuses(); renderWires(); renderEdge();
      if (hl) highlight(hl);
      canvas.dataset.dragging = "node";
    } else {
      view.x = drag.vx + dx; view.y = drag.vy + dy; apply();
      canvas.dataset.dragging = "pan";
    }
  });
  const end = e => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (!drag) return;
    const d = drag;
    drag = null;
    delete canvas.dataset.dragging;
    if (d.node && d.moved) { topoSave(TOPO.LAYOUT_KEY, layout); opts.onLayout && opts.onLayout(true); }
    else if (d.node && !d.moved && e.type === "pointerup") opts.onOpen(d.node.name);
  };
  svg.addEventListener("pointerup", end);
  svg.addEventListener("pointercancel", end);
  svg.addEventListener("pointerleave", () => { if (!drag && !svg.contains(document.activeElement)) highlight(null); });
  svg.addEventListener("wheel", e => {
    if (!e.ctrlKey && !e.metaKey) { opts.onWheelHint && opts.onWheelHint(); return; }
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)));
  }, { passive: false });
  svg.addEventListener("focusin", e => { const tn = e.target.closest(".tn"); if (tn) highlight(tn.dataset.id); });
  svg.addEventListener("focusout", e => { if (!svg.contains(e.relatedTarget)) highlight(null); });
  svg.addEventListener("keydown", e => {
    const tn = e.target.closest && e.target.closest(".tn");
    const step = 60;
    if (e.key === "ArrowLeft") { view.x += step; apply(); e.preventDefault(); }
    else if (e.key === "ArrowRight") { view.x -= step; apply(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { view.y += step; apply(); e.preventDefault(); }
    else if (e.key === "ArrowDown") { view.y -= step; apply(); e.preventDefault(); }
    else if (e.key === "+" || e.key === "=") { zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.2); e.preventDefault(); }
    else if (e.key === "-") { zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1 / 1.2); e.preventDefault(); }
    else if ((e.key === "Enter" || e.key === " ") && tn) { e.preventDefault(); opts.onOpen(tn.dataset.id); }
  });

  return {
    canvas,
    set(model) {
      M = model;
      const phone = window.matchMedia("(max-width: 639px)").matches;
      const cw = canvas.clientWidth || host.clientWidth || 800;
      canvas.style.height = phone ? "68vh" : `${Math.round(Math.min(Math.max(M.H * (cw / M.W) + 12, 460), 2200))}px`; // CSSOM, allowed under CSP
      renderAll();
      if (!fitted) {
        fitted = true;
        if (phone) { view = { x: 8, y: 8, k: 0.62 }; apply(); } else fit(true);
      }
    },
    fit: () => fit(false),
    zoom: f => zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, f),
    reset() { layout = {}; topoSave(TOPO.LAYOUT_KEY, null); renderAll(); fit(true); opts.onLayout && opts.onLayout(false); },
    hasLayout: () => Object.keys(layout).length > 0,
    find(q) {
      for (const el of L.node.querySelectorAll(".tn.match")) el.classList.remove("match");
      match = null;
      if (!q || !M) return null;
      const n = M.nodes.find(x => x.name.toLowerCase().includes(q)) || null;
      if (n) {
        match = n.name;
        const g = L.node.querySelector(`.tn[data-id="${CSS.escape(n.name)}"]`);
        if (g) g.classList.add("match");
        centerOn(n);
      }
      return n;
    },
    focusMatch() { const g = match && L.node.querySelector(`.tn[data-id="${CSS.escape(match)}"]`); if (g) g.focus(); },
  };
}

/* ----- Topology view ----- */
VIEWS.topology = {
  nav: "topology", title: "Topology",
  mount(root) {
    let data = null;
    const hidden = new Set((topoLoad(TOPO.HIDDEN_KEY) || []).filter(x => typeof x === "string"));
    let mode = topoLoad(TOPO.VIEW_KEY) === "list" ? "list" : "graph";
    const modeSeg = segmented("View", [["graph", "Diagram"], ["list", "List view"]], mode, v => { mode = v; topoSave(TOPO.VIEW_KEY, v); render(); });
    root.append(pageHead("Topology", "Docker networks as bus bars; every tap is a real network membership. Addresses are not published.", null, "Monitor"));
    const body = h("div");
    root.append(h("div", { class: "toolbar" }, modeSeg), body);

    const search = h("input", { class: "input", type: "search", placeholder: "Locate equipment", "aria-label": "Locate equipment in the diagram" });
    const findMsg = h("span", { class: "muted small", "aria-live": "polite" });
    const chips = h("div", { class: "net-chips", role: "group", "aria-label": "Show networks" });
    const resetBtn = h("button", { class: "btn btn-sm", type: "button", disabled: true }, icon("rollback"), "Reset layout");
    const ctrls = h("div", { class: "topo-ctrls", role: "group", "aria-label": "Zoom" },
      h("button", { class: "icon-btn", type: "button", "aria-label": "Zoom in", data: { z: "in" } }, h("span", { class: "zl", text: "+" })),
      h("button", { class: "icon-btn", type: "button", "aria-label": "Zoom out", data: { z: "out" } }, h("span", { class: "zl", text: "−" })),
      h("button", { class: "icon-btn", type: "button", "aria-label": "Fit to screen", data: { z: "fit" } }, icon("grid")));
    const graphWrap = h("div", { class: "topo" });
    const hint = h("div", { class: "topo-hint", hidden: true, text: "Hold Ctrl (⌘ on Mac) and scroll to zoom, or use + / −" });
    let hintTimer = null;
    const diagramHost = h("div", { class: "topo-stage" });
    const legend = h("div", { class: "plant-legend topo-legend", "aria-label": "Legend" },
      h("span", null, h("span", { class: "led", data: { tone: "ok" } }), "Running"),
      h("span", null, h("span", { class: "led", data: { tone: "err" } }), "Fault"),
      h("span", null, h("span", { class: "led", data: { tone: "off" } }), "Stopped"),
      h("span", null, h("span", { class: "lg-dot" }), "Tap: attached to bus"),
      h("span", null, h("span", { class: "lg-hop" }), "Hop: crosses, not attached"),
      h("span", null, h("span", { class: "lg-bus internal" }), "Internal network"),
      h("span", null, h("span", { class: "lg-bus engine" }), "Docker API (via gateway)"),
      h("span", null, h("span", { class: "lg-edge" }), "Ingress path"),
      h("span", { class: "muted" }, "Hover or focus equipment to trace its wiring and service links. Drag to rearrange."));
    graphWrap.append(h("div", { class: "toolbar topo-bar" }, h("div", { class: "search grow" }, icon("search"), search), findMsg, resetBtn),
      chips, h("div", { class: "topo-frame" }, diagramHost, ctrls, hint), legend);
    const diagram = TopoDiagram(diagramHost, {
      onOpen: name => openContainerDrawer(name),
      onLayout: has => { resetBtn.disabled = !has; },
      onWheelHint: () => { hint.hidden = false; clearTimeout(hintTimer); hintTimer = setTimeout(() => { hint.hidden = true; }, 1400); },
    });
    resetBtn.disabled = !diagram.hasLayout();
    resetBtn.addEventListener("click", () => diagram.reset());
    ctrls.addEventListener("click", e => {
      const b = e.target.closest("button[data-z]");
      if (!b) return;
      if (b.dataset.z === "fit") diagram.fit(); else diagram.zoom(b.dataset.z === "in" ? 1.25 : 0.8);
    });
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      const n = diagram.find(q);
      findMsg.textContent = q ? (n ? `Found ${n.name}` : "No match") : "";
    });
    search.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); diagram.focusMatch(); } });
    chips.addEventListener("click", e => {
      const b = e.target.closest("button[data-net]");
      if (!b) return;
      const id = b.dataset.net;
      if (hidden.has(id)) hidden.delete(id); else hidden.add(id);
      topoSave(TOPO.HIDDEN_KEY, Array.from(hidden));
      render();
    });

    function renderList(d) {
      const map = byName();
      const cards = (d.networks || []).map(net => h("div", { class: "card" },
        h("div", { class: "card-head" },
          h("div", null, h("div", { class: "card-title mono", text: net.name }), h("div", { class: "card-sub", text: [net.purpose, net.internal ? "Internal" : "Routed"].filter(Boolean).join(" · ") })),
          h("span", { class: "muted num", text: plural(net.members.length, "member") })),
        net.members.length ? h("div", { class: "card-list" }, net.members.map(n => {
          const c = map[n] || { status: "stopped" };
          return h("button", { type: "button", class: "card-row", data: { action: "container-drawer", name: n } }, dot(ctLed(c), c.status), h("span", { text: n }), h("span", { class: "muted", text: c.stack || "" }));
        })) : h("p", { class: "muted", text: "No members." })));
      const links = (d.links || []).map(l => h("tr", null, td(l.from, "nowrap"), td(l.to, "nowrap")));
      return h("div", null,
        section("Networks", null, cards.length ? h("div", { class: "cards" }, cards) : stateBlock({ title: "No networks published" })),
        section("Service links", null, links.length ? table(["From", "To"], links, { label: "Service links" }) : stateBlock({ title: "No links published" })),
        section("Ingress", null, h("p", { class: "muted", text: (d.ingress || []).length ? `Requests from the private network enter through: ${d.ingress.join(", ")}.` : "No ingress published." })));
    }

    function render() {
      if (!data) return;
      if (mode === "list") { body.replaceChildren(renderList(data)); return; }
      if (!(data.containers || []).length) { body.replaceChildren(stateBlock({ icon: "network", title: "No containers published" })); return; }
      if (graphWrap.parentNode !== body) body.replaceChildren(graphWrap);
      const model = topoModel(data, hidden);
      chips.replaceChildren(h("span", { class: "eng-label", text: "Networks" }), ...model.allNets.map(n => h("button", { class: "net-chip", type: "button", "aria-pressed": String(!hidden.has(n.id)), data: { net: n.id, internal: n.internal ? "1" : null } },
        h("span", { class: "chip-bar" }), n.id, h("span", { class: "num muted", text: String(n.members.length) }))));
      diagram.set(model);
    }
    return { body, update(d) { data = d; render(); } };
  },
};
