// Tiny layered architecture-diagram renderer → SVG string. Used by index.html (modal) and project.html.
(function () {
  const KIND = {
    client:  { f: "#e3edff", s: "#2563eb", n: "Client / UI" },
    edge:    { f: "#ecebe8", s: "#3f3f46", n: "Gateway / glue" },
    service: { f: "#ffffff", s: "#121212", n: "Service" },
    ml:      { f: "#efe9ff", s: "#7c3aed", n: "Model / logic" },
    data:    { f: "#fff3d6", s: "#b45309", n: "Storage" },
    ext:     { f: "#f4f4f2", s: "#71717a", n: "External / offline", dash: true },
    device:  { f: "#fdf0bf", s: "#a16207", n: "Hardware" }
  };
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const wrap = (s, max) => { const w = s.split(" "), out = [""]; for (const x of w) { const c = out[out.length - 1]; if ((c + " " + x).trim().length > max && c) out.push(x); else out[out.length - 1] = (c + " " + x).trim(); } return out.slice(0, 2); };

  function render(spec) {
    const W = 960, PAD = 56, NH = 66, LANE = 30, GAP = 58, GX = 22;
    const pos = {}; let y = 16; const lanes = [];
    spec.layers.forEach((L, li) => {
      const n = L.nodes.length, w = Math.min(232, (W - 2 * PAD - (n - 1) * GX) / n), tot = n * w + (n - 1) * GX; let x = (W - tot) / 2;
      lanes.push({ y, name: L.name });
      L.nodes.forEach(nd => { pos[nd.id] = { x, y: y + LANE, w, h: NH, li, nd }; x += w + GX; });
      y += LANE + NH + 16 + GAP;
    });
    const H = y - GAP + 4;
    // anchor spreading
    const outs = {}, ins = {};
    spec.edges.forEach((e, i) => { (outs[e[0]] = outs[e[0]] || []).push(i); (ins[e[1]] = ins[e[1]] || []).push(i); });
    const spread = (list, i, w) => { const k = list.indexOf(i), n = list.length; return n === 1 ? 0 : (k - (n - 1) / 2) * Math.min(26, (w * .6) / (n - 1)); };
    let paths = "", labels = "";
    spec.edges.forEach((e, i) => {
      const a = pos[e[0]], b = pos[e[1]]; if (!a || !b) return;
      const dash = e[3] === "dash", d = b.li - a.li; let p, mx, my;
      if (d === 0) {
        const l2r = a.x < b.x, sx = l2r ? a.x + a.w : a.x, ex = l2r ? b.x : b.x + b.w, sy = a.y + NH / 2;
        p = `M${sx},${sy} L${ex},${sy}`; mx = (sx + ex) / 2; my = a.y + NH + 9; // label sits under the gap, never on the nodes
      } else if (Math.abs(d) === 1) {
        const down = d > 0, sx = a.x + a.w / 2 + spread(outs[e[0]], i, a.w), sy = down ? a.y + NH : a.y,
          ex = b.x + b.w / 2 + spread(ins[e[1]], i, b.w), ey = down ? b.y : b.y + NH, c = (ey - sy) / 2;
        p = `M${sx},${sy} C${sx},${sy + c} ${ex},${ey - c} ${ex},${ey}`; mx = (sx + ex) / 2; my = (sy + ey) / 2;
      } else {
        // skip-layer edge: arc out through the side gutter so it never crosses a node
        const right = (a.x + a.w / 2 + b.x + b.w / 2) / 2 > W / 2, g = right ? W - 18 : 18,
          sx = right ? a.x + a.w : a.x, sy = a.y + NH / 2 + (d > 0 ? 10 : -10), ex = right ? b.x + b.w : b.x, ey = b.y + NH / 2;
        p = `M${sx},${sy} C${g},${sy} ${g},${ey} ${ex},${ey}`;
        // put the label in the empty gap right after the source row, found on the curve itself
        const bz = (t, p0, p1, p2, p3) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3;
        const ty = d > 0 ? a.y + NH + 8 + (GAP + 16) / 2 : a.y - 8 - (GAP + 16) / 2; let lo = 0, hi = 1;
        for (let k = 0; k < 30; k++) { const t = (lo + hi) / 2; ((bz(t, sy, sy, ey, ey) < ty) === (d > 0)) ? lo = t : hi = t; }
        mx = bz(lo, sx, g, g, ex); my = ty;
      }
      paths += `<path class="ae${dash ? " dsh" : ""}" d="${p}" marker-end="url(#ah)"/>`;
      if (e[2]) { const t = esc(e[2]), tw = t.length * 6.4 + 14; mx = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, mx)); labels += `<g transform="translate(${mx},${my})"><rect x="${-tw / 2}" y="-10" width="${tw}" height="20" rx="10" class="al"/><text class="alt" text-anchor="middle" y="4">${t}</text></g>`; }
    });
    let lanesSvg = lanes.map(l => `<rect x="6" y="${l.y}" width="${W - 12}" height="${LANE + NH + 14}" rx="16" class="ln"/><text x="22" y="${l.y + 20}" class="lnt">${esc(l.name.toUpperCase())}</text>`).join("");
    let nodes = "";
    Object.values(pos).forEach(({ x, y, w, nd }) => {
      const k = KIND[nd.k] || KIND.service, sub = nd.s ? wrap(nd.s, Math.floor((w - 20) / 6.3)) : [];
      const ty = sub.length === 2 ? y + 24 : sub.length ? y + 29 : y + 38;
      nodes += `<g class="an"><rect x="${x}" y="${y}" width="${w}" height="${NH}" rx="12" fill="${k.f}" stroke="${k.s}" stroke-width="1.4"${k.dash ? ' stroke-dasharray="5 4"' : ""}/>
        <rect x="${x}" y="${y + 14}" width="3" height="${NH - 28}" rx="1.5" fill="${k.s}"/>
        <text x="${x + w / 2}" y="${ty}" text-anchor="middle" class="ant">${esc(nd.t)}</text>${sub.map((s, j) => `<text x="${x + w / 2}" y="${ty + 17 + j * 14}" text-anchor="middle" class="ans">${esc(s)}</text>`).join("")}</g>`;
    });
    const used = [...new Set(spec.layers.flatMap(l => l.nodes.map(n => n.k)))];
    const legend = `<div class="alg">${used.map(k => `<span><i style="background:${KIND[k].f};border-color:${KIND[k].s}${KIND[k].dash ? ";border-style:dashed" : ""}"></i>${KIND[k].n}</span>`).join("")}<span><i class="dl"></i>request / data flow</span></div>`;
    return `<div class="asc"><svg class="arch" viewBox="0 0 ${W} ${H}" role="img" aria-label="Architecture diagram"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#121212"/></marker></defs>${lanesSvg}${paths}${nodes}${labels}</svg></div>${legend}`;
  }
  const CSS = `.asc{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -4px;padding:0 4px}
.arch{display:block;width:100%;min-width:720px;height:auto;font-family:Archivo,system-ui,sans-serif}
.arch .ln{fill:rgba(18,18,18,.025);stroke:rgba(18,18,18,.08);stroke-dasharray:3 4}
.arch .lnt{font:500 10.5px "JetBrains Mono",monospace;letter-spacing:.08em;fill:#8c877f}
.arch .ant{font-weight:700;font-size:15px;letter-spacing:-.01em;fill:#121212}
.arch .ans{font:11px "JetBrains Mono",monospace;fill:#55524c}
.arch .ae{fill:none;stroke:#121212;stroke-width:1.5;stroke-dasharray:6 5;animation:aflow 1.1s linear infinite}
.arch .ae.dsh{stroke:#8c877f;stroke-dasharray:2 5}
.arch .al{fill:#121212}.arch .alt{font:500 10.5px "JetBrains Mono",monospace;fill:#faf7f3}
.arch .an{transition:transform .3s}
@keyframes aflow{to{stroke-dashoffset:-22}}
@media (prefers-reduced-motion:reduce){.arch .ae{animation:none}}
.alg{display:flex;flex-wrap:wrap;gap:8px 16px;margin-top:14px;font-size:13px;color:#55524c}
.alg span{display:inline-flex;align-items:center;gap:7px}
.alg i{width:14px;height:14px;border-radius:4px;border:1.5px solid}
.alg i.dl{width:22px;height:0;border:0;border-top:1.5px dashed #121212;border-radius:0}`;
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  window.HZArch = { render };
})();
