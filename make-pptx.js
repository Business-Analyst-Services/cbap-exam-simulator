#!/usr/bin/env node
/* Builds CBAP-Technique-Pack.pptx from techniques.json.
 *
 *   node make-pptx.js [outfile]
 *
 * One pair of slides per technique: the worked example, then the blank template.
 * Everything is drawn as native PowerPoint shapes and tables, so the template
 * half is genuinely fillable rather than a picture of a form.
 *
 * Generated from the same data the web app embeds, so the two cannot drift.
 */
const fs = require("fs");
const path = require("path");
const P = require("./pptx-lib.js");

const OUT = process.argv[2] || path.join(__dirname, "CBAP-Technique-Pack.pptx");
const techs = JSON.parse(fs.readFileSync(path.join(__dirname, "techniques.json"), "utf8"));

/* ---------- page geometry, inches on a 13.333 x 7.5 slide ---------- */
const PAGE = { w: 13.333, h: 7.5 };
const M = 0.5;
const SIDE = { x: M, y: 1.32, w: 3.0 };
const MAIN = { x: 3.85, y: 1.32, w: PAGE.w - 3.85 - M, h: 5.35 };

const C = {
  ink: "0B0B0B", muted: "6B6A66", line: "C3C2B7", grid: "D9D8D0",
  accent: "2A78D6", deep: "184F95", soft: "E9F1FD", plane: "F7F7F5",
  red: "D03B3B", white: "FFFFFF", band: "FBFBF9"
};

const clip = (s, n) => { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };

/* ---------- chrome ---------- */
function header(t, kind) {
  const isTpl = kind === "tpl";
  return P.shape({ x: M, y: 0.34, cx: 8.2, cy: 0.52, fill: "none", line: "none",
      paras: [{ text: `${t.n}  ${t.name}`, size: 22, bold: true, color: C.ink }], text: { anchor: "b", ins: 0 } })
    + P.shape({ x: M, y: 0.86, cx: 8.2, cy: 0.28, fill: "none", line: "none",
      paras: [{ text: t.group, size: 10.5, color: C.muted }], text: { anchor: "t", ins: 0 } })
    + P.shape({ x: PAGE.w - M - 2.25, y: 0.42, cx: 2.25, cy: 0.34, geom: "roundRect", adj: 20000,
      fill: isTpl ? C.white : C.accent, line: isTpl ? C.accent : C.accent,
      paras: [{ text: isTpl ? "BLANK TEMPLATE" : "WORKED EXAMPLE", size: 9.5, bold: true,
        color: isTpl ? C.accent : C.white, align: "ctr" }] })
    + P.connector({ x1: M, y1: 1.18, x2: PAGE.w - M, y2: 1.18, color: C.grid, w: 9525 })
    + P.shape({ x: M, y: PAGE.h - 0.42, cx: 9, cy: 0.24, fill: "none", line: "none",
      paras: [{ text: "CBAP® Technique Pack · BABOK® Guide v3 · business-analyst.services", size: 8, color: C.muted }], text: { anchor: "ctr", ins: 0 } })
    + P.shape({ x: PAGE.w - M - 1.2, y: PAGE.h - 0.42, cx: 1.2, cy: 0.24, fill: "none", line: "none",
      paras: [{ text: t.n, size: 8, color: C.muted, align: "r" }], text: { anchor: "ctr", ins: 0 } });
}

function sidebar(t, kind) {
  const blocks = [];
  let y = SIDE.y;
  const lab = (text) => {
    const s = P.shape({ x: SIDE.x, y, cx: SIDE.w, cy: 0.2, fill: "none", line: "none",
      paras: [{ text, size: 8, bold: true, color: C.muted }], text: { anchor: "b", ins: 0 } });
    y += 0.22; return s;
  };
  const body = (text, h, size) => {
    const s = P.shape({ x: SIDE.x, y, cx: SIDE.w, cy: h, fill: "none", line: "none",
      paras: [{ text, size: size || 9.5, color: C.ink }], text: { anchor: "t", ins: 0 } });
    y += h + 0.1; return s;
  };
  if (kind === "ex") {
    blocks.push(lab("WHAT IT IS FOR"), body(t.purpose, 0.85));
    blocks.push(lab("REACH FOR IT WHEN"), body(t.use, 0.85));
  } else {
    blocks.push(lab("HOW TO FILL IT IN"), body(t.template.note || t.visual.lead || "", 1.0));
    blocks.push(lab("WHAT IT IS FOR"), body(t.purpose, 0.8));
  }
  blocks.push(lab("MOST OFTEN CONFUSED WITH"));
  const ch = kind === "ex" ? 1.85 : 1.9;
  blocks.push(P.shape({ x: SIDE.x, y, cx: SIDE.w, cy: ch, geom: "rect", fill: C.plane, line: "none",
    paras: [{ text: t.confused, size: 9, color: C.ink }], text: { anchor: "t", ins: 0.1 } }));
  blocks.push(P.shape({ x: SIDE.x, y, cx: 0.035, cy: ch, fill: "FAB219", line: "none" }));
  y += ch + 0.12;
  const tasks = (t.tasks || []).slice(0, 3).join(" · ");
  if (tasks && y < 6.6) blocks.push(P.shape({ x: SIDE.x, y, cx: SIDE.w, cy: 0.55, fill: "none", line: "none",
    paras: [{ text: "Tasks: " + tasks, size: 8, color: C.muted }], text: { anchor: "t", ins: 0 } }));
  return blocks.join("");
}

function caption(text, note) {
  let s = P.shape({ x: MAIN.x, y: MAIN.y - 0.02, cx: MAIN.w, cy: 0.26, fill: "none", line: "none",
    paras: [{ text: clip(text, 105), size: 10.5, bold: true, color: C.deep }], text: { anchor: "b", ins: 0 } });
  if (note) s += P.shape({ x: MAIN.x, y: PAGE.h - 0.86, cx: MAIN.w, cy: 0.42, fill: "none", line: "none",
    paras: [{ text: clip(note, 210), size: 8.5, color: C.muted }], text: { anchor: "t", ins: 0 } });
  return s;
}

/* ---------- artefact renderers ---------- */
const AREA = () => ({ x: MAIN.x, y: MAIN.y + 0.32, w: MAIN.w, h: MAIN.h - 0.95 });

function rTable(x, a) {
  const cols = x.cols.length;
  const rows = x.rows.slice(0, 11);
  // first column gets more room; the rest share what is left
  const first = cols > 2 ? Math.min(2.6, a.w * 0.3) : a.w / cols;
  const rest = (a.w - first) / (cols - 1 || 1);
  const colW = cols === 1 ? [a.w] : [first, ...Array(cols - 1).fill(rest)];
  const rowH = Math.min(0.42, Math.max(0.26, (a.h - 0.1) / (rows.length + 1)));
  return P.table({ x: a.x, y: a.y, colW, header: true, rowH, size: rows.length > 8 ? 8 : 9,
    headFill: C.accent,
    rows: [x.cols, ...rows.map(r => r.map((c, i) => ({ text: c, align: (x.align || [])[i] === "num" ? "r" : "l" })))] });
}

function rMatrix(x, a) {
  const cols = x.cols.length, rows = x.rows.length;
  const lead = 1.5, cw = (a.w - lead) / cols, chh = Math.min(1.5, (a.h - 0.4) / rows);
  let s = P.shape({ x: a.x + lead, y: a.y, cx: a.w - lead, cy: 0.26, fill: "none", line: "none",
    paras: [{ text: (x.xLabel || "") + " →", size: 9, color: C.muted, align: "ctr" }] });
  x.cols.forEach((c, i) => { s += P.shape({ x: a.x + lead + i * cw, y: a.y + 0.26, cx: cw, cy: 0.26,
    fill: "none", line: "none", paras: [{ text: c, size: 9, bold: true, color: C.muted, align: "ctr" }] }); });
  x.rows.forEach((r, ri) => {
    const y = a.y + 0.55 + ri * chh;
    s += P.shape({ x: a.x, y, cx: lead - 0.1, cy: chh - 0.08, fill: "none", line: "none",
      paras: [{ text: r, size: 9, bold: true, color: C.muted, align: "r" }] });
    (x.cells[ri] || []).forEach((c, ci) => {
      const items = ((c && c.items) || []).filter(Boolean);
      const paras = [];
      if (c && c.tag) paras.push({ text: String(c.tag).toUpperCase(), size: 8, bold: true, color: C.deep });
      items.slice(0, 4).forEach(t => paras.push({ text: "• " + clip(t, 42), size: 8.5, color: C.ink }));
      if (!paras.length) paras.push({ text: "" });
      s += P.shape({ x: a.x + lead + ci * cw + 0.04, y, cx: cw - 0.08, cy: chh - 0.08,
        geom: "roundRect", adj: 6000, fill: C.white, line: C.line,
        paras, text: { anchor: "t", ins: 0.08 } });
    });
  });
  if (x.yLabel) s += P.shape({ x: a.x - 0.05, y: a.y + 0.55, cx: 1.4, cy: 0.24, fill: "none", line: "none",
    paras: [{ text: "↑ " + x.yLabel, size: 8.5, color: C.muted }] });
  return s;
}

/* Panel rectangles for the real canvas: partners tall left, value proposition
   through the centre, segments tall right, cost and revenue across the foot.
   Panel order is the one techniques.json uses. */
function bmcRects(a) {
  const cw = a.w / 5, topH = a.h * 0.66, halfH = topH / 2, botH = a.h - topH;
  const X = i => a.x + i * cw, TY = a.y, BY = a.y + topH;
  return [
    { x: X(0), y: TY, w: cw, h: topH },              // 0 key partners
    { x: X(1), y: TY, w: cw, h: halfH },             // 1 key activities
    { x: X(2), y: TY, w: cw, h: topH },              // 2 value proposition
    { x: X(3), y: TY, w: cw, h: halfH },             // 3 customer relationship
    { x: X(3), y: TY + halfH, w: cw, h: halfH },     // 4 channels
    { x: X(4), y: TY, w: cw, h: topH },              // 5 customer segments
    { x: X(3), y: BY, w: cw * 2, h: botH },          // 6 revenue streams
    { x: X(0), y: BY, w: cw * 3, h: botH },          // 7 cost structure
    { x: X(1), y: TY + halfH, w: cw, h: halfH }      // 8 key resources
  ];
}

function rCanvas(x, a) {
  const n = x.panels.length;
  const bmc = x.layout === "bmc" && n === 9;
  const rects = bmc ? bmcRects(a) : null;
  const cols = x.cols || 3;
  const rowsN = Math.ceil(n / cols);
  const cw = a.w / cols, chh = Math.min(1.7, a.h / rowsN);
  let s = "";
  x.panels.forEach((p, i) => {
    const r = rects && rects[i];
    const cx0 = r ? r.x : a.x + (i % cols) * cw;
    const cy0 = r ? r.y : a.y + Math.floor(i / cols) * chh;
    const pw = r ? r.w : cw, ph = r ? r.h : chh;
    const paras = [{ text: p.label.toUpperCase(), size: 8, bold: true, color: C.deep }];
    (p.items || []).filter(Boolean).slice(0, 5).forEach(t => paras.push({ text: "• " + clip(t, 44), size: 8, color: C.ink }));
    if (paras.length === 1) paras.push({ text: "" });
    s += P.shape({ x: cx0 + 0.03, y: cy0 + 0.03, cx: pw - 0.06, cy: ph - 0.06, geom: "rect",
      fill: C.white, line: C.line, paras, text: { anchor: "t", ins: 0.08 } });
  });
  return s;
}

function rTree(x, a) {
  const flat = [];
  (function walk(ns, d) { ns.forEach(n => { flat.push({ d, label: n.label, note: n.note }); if (n.children) walk(n.children, d + 1); }); })(x.nodes, 0);
  const rows = flat.slice(0, 16);
  const rh = Math.min(0.42, (a.h - 0.3) / rows.length);
  let s = "";
  if (x.levels) s += P.shape({ x: a.x, y: a.y - 0.24, cx: a.w, cy: 0.22, fill: "none", line: "none",
    paras: [{ text: x.levels.map((l, i) => `${i + 1}. ${l}`).join("    "), size: 8.5, color: C.muted }] });
  rows.forEach((r, i) => {
    const ind = r.d * 0.42;
    const y = a.y + i * rh;
    s += P.shape({ x: a.x + ind, y, cx: a.w - ind, cy: rh - 0.05, geom: "roundRect", adj: 8000,
      fill: r.d === 0 ? C.soft : C.white, line: r.d === 0 ? C.accent : C.line,
      paras: [{ text: clip(r.label + (r.note ? "  (" + r.note + ")" : ""), 90), size: r.d === 0 ? 9.5 : 9,
        bold: r.d === 0, color: C.ink }], text: { anchor: "ctr", ins: 0.09 } });
    if (r.d > 0) s += P.connector({ x1: a.x + ind - 0.14, y1: y + (rh - 0.05) / 2, x2: a.x + ind, y2: y + (rh - 0.05) / 2, color: C.line, w: 6350 });
  });
  return s;
}

function rFlow(x, a) {
  const steps = x.steps.slice(0, 6);
  const gap = 0.22, bw = (a.w - gap * (steps.length - 1)) / steps.length;
  const bh = Math.min(1.5, a.h * 0.42);
  let s = "";
  steps.forEach((st, i) => {
    const bx = a.x + i * (bw + gap);
    const paras = [];
    if (st.actor) paras.push({ text: String(st.actor).toUpperCase(), size: 7.5, bold: true, color: C.deep });
    paras.push({ text: clip(st.label, 40), size: 9.5, bold: true, color: C.ink });
    if (st.note) paras.push({ text: clip(st.note, 60), size: 8, color: C.muted });
    s += P.shape({ x: bx, y: a.y, cx: bw, cy: bh, geom: "roundRect", adj: 7000, fill: C.white, line: C.line,
      paras, text: { anchor: "t", ins: 0.08 } });
    if (i < steps.length - 1) s += P.connector({ x1: bx + bw + 0.02, y1: a.y + bh / 2, x2: bx + bw + gap - 0.02, y2: a.y + bh / 2, arrow: true, color: C.line });
  });
  (x.branches || []).slice(0, 4).forEach((b, i) => {
    s += P.shape({ x: a.x, y: a.y + bh + 0.16 + i * 0.3, cx: a.w, cy: 0.28, fill: "none", line: "none",
      paras: [{ text: "↳ " + clip(b.from + " — " + b.label, 120), size: 8.5, color: C.muted }], text: { anchor: "ctr", ins: 0 } });
  });
  return s;
}

function rSwimlane(x, a) {
  const lanes = x.lanes, steps = x.steps;
  const lw = 1.2, laneH = Math.min(0.95, (a.h - 0.5) / lanes.length);
  const colW = (a.w - lw) / steps.length;
  const bw = Math.min(colW - 0.14, 1.35), bh = Math.min(0.52, laneH - 0.2);
  const cx = i => a.x + lw + i * colW + colW / 2;
  const cy = l => a.y + l * laneH + laneH / 2;
  let s = "";
  lanes.forEach((ln, i) => {
    s += P.shape({ x: a.x, y: a.y + i * laneH, cx: a.w, cy: laneH, geom: "rect",
      fill: i % 2 ? C.white : C.band, line: C.grid });
    s += P.shape({ x: a.x + 0.04, y: a.y + i * laneH, cx: lw - 0.08, cy: laneH, fill: "none", line: "none",
      paras: [{ text: clip(ln, 22), size: 8.5, bold: true, color: C.muted }] });
  });
  steps.forEach((st, i) => {
    if (i === steps.length - 1) return;
    const b = steps[i + 1];
    const x1 = cx(i) + bw / 2, x2 = cx(i + 1) - bw / 2, y1 = cy(st.lane), y2 = cy(b.lane);
    if (st.lane === b.lane) s += P.connector({ x1, y1, x2, y2, arrow: true, color: C.line });
    else {
      const mx = (x1 + x2) / 2;
      s += P.connector({ x1, y1, x2: mx, y2: y1, color: C.line });
      s += P.connector({ x1: mx, y1, x2: mx, y2, color: C.line });
      s += P.connector({ x1: mx, y1: y2, x2, y2, arrow: true, color: C.line });
    }
  });
  steps.forEach((st, i) => {
    s += P.shape({ x: cx(i) - bw / 2, y: cy(st.lane) - bh / 2, cx: bw, cy: bh, geom: "roundRect", adj: 8000,
      fill: C.white, line: C.line, paras: [{ text: clip(st.label, 34), size: 8.5, color: C.ink, align: "ctr" }] });
  });
  (x.flows || []).slice(0, 3).forEach((f, i) => {
    s += P.shape({ x: a.x, y: a.y + lanes.length * laneH + 0.06 + i * 0.26, cx: a.w, cy: 0.24, fill: "none", line: "none",
      paras: [{ text: "↳ " + clip(f.label || "exception", 120), size: 8.5, color: C.red }], text: { anchor: "ctr", ins: 0 } });
  });
  return s;
}

function rUsecase(x, a) {
  const L = x.actors.filter(t => t.side !== "right"), R = x.actors.filter(t => t.side === "right");
  const bw = 3.4, bx = a.x + (a.w - bw) / 2;
  const oh = Math.min(0.62, (a.h - 0.7) / x.cases.length), ow = bw - 0.5;
  const bh = x.cases.length * (oh + 0.12) + 0.34;
  let s = P.shape({ x: bx, y: a.y, cx: bw, cy: bh, geom: "rect", fill: "none", line: C.line, dash: "dash",
    paras: [{ text: "" }] });
  s += P.shape({ x: bx, y: a.y + 0.02, cx: bw, cy: 0.26, fill: "none", line: "none",
    paras: [{ text: x.system || "System", size: 9, bold: true, color: C.muted, align: "ctr" }] });
  x.cases.forEach((c, i) => {
    s += P.shape({ x: bx + 0.25, y: a.y + 0.32 + i * (oh + 0.12), cx: ow, cy: oh, geom: "ellipse",
      fill: C.white, line: C.line, paras: [{ text: clip(c.label, 34), size: 9, color: C.ink, align: "ctr" }] });
  });
const ocy = i => a.y + 0.32 + i * (oh + 0.12) + oh / 2;
  const place = new Map();
  const drawActors = (arr, ax) => arr.forEach((act, i) => {
    const ay = a.y + 0.4 + i * ((bh - 0.5) / Math.max(arr.length, 1));
    place.set(act, { ax, ay: ay + 0.27, right: ax > bx });
    s += P.shape({ x: ax, y: ay, cx: 1.5, cy: 0.55, geom: "roundRect", adj: 20000, fill: C.plane, line: C.line,
      paras: [{ text: clip(act.name || "Actor", 20), size: 8.5, color: C.ink, align: "ctr" }] });
  });
  drawActors(L, a.x);
  drawActors(R, a.x + a.w - 1.5);
  (x.links || []).forEach(l => {
    const act = x.actors[l.actor], pl = place.get(act);
    if (!pl || !x.cases[l.case]) return;
    const fromX = pl.right ? pl.ax : pl.ax + 1.5;
    const toX = pl.right ? bx + bw - 0.1 : bx + 0.1;
    s += P.connector({ x1: fromX, y1: pl.ay, x2: toX, y2: ocy(l.case), color: C.line, w: 6350 });
  });
  return s;
}

/* States run left to right, then the next row runs right to left. Laid out that
   way a wrapping transition lands directly beneath its predecessor, so it can be
   drawn as a short vertical arrow instead of being demoted to a footnote. */
function rState(x, a) {
  const n = x.states.length;
  const per = Math.min(n, 6);
  const rowsN = Math.ceil(n / per);
  // The gap has to fit the event label, not just separate the boxes.
  const gap = per > 4 ? 0.52 : 0.34, bh = 0.5;
  const bw = (a.w - (per - 1) * gap) / per;
  const rowGap = Math.min(1.15, Math.max(bh + 0.45, (a.h - 0.6) / rowsN));
  const size = per > 4 ? 8.5 : 9;

  const cell = i => {
    const r = Math.floor(i / per);
    const c = r % 2 === 1 ? per - 1 - (i % per) : i % per;   // serpentine
    return { r, c, x: a.x + c * (bw + gap), y: a.y + r * rowGap };
  };
  const inline = t => t.to === t.from + 1 && !t.illegal;

  let s = "";
  (x.transitions || []).filter(inline).forEach(t => {
    const p1 = cell(t.from), p2 = cell(t.to);
    if (p1.r === p2.r) {
      const ltr = p1.r % 2 === 0;
      const x1 = ltr ? p1.x + bw : p1.x;
      const x2 = ltr ? p2.x : p2.x + bw;
      const y = p1.y + bh / 2;
      s += P.connector({ x1, y1: y, x2, y2: y, arrow: true, color: C.line });
      if (t.label) s += P.shape({ x: Math.min(x1, x2) - 0.14, y: y - 0.34, cx: Math.abs(x2 - x1) + 0.28, cy: 0.24,
        fill: "none", line: "none",
        paras: [{ text: clip(t.label, 18), size: 7.5, color: C.muted, align: "ctr" }] });
    } else {
      // wrap: same column, one row down
      const cx0 = p1.x + bw / 2;
      s += P.connector({ x1: cx0, y1: p1.y + bh, x2: cx0, y2: p2.y, arrow: true, color: C.line });
      if (t.label) s += P.shape({ x: cx0 + 0.08, y: p1.y + bh + (p2.y - p1.y - bh) / 2 - 0.12, cx: bw, cy: 0.24,
        fill: "none", line: "none",
        paras: [{ text: clip(t.label, 18), size: 7.5, color: C.muted }] });
    }
  });

  x.states.forEach((st, i) => {
    const c = cell(i);
    s += P.shape({ x: c.x, y: c.y, cx: bw, cy: bh, geom: "roundRect", adj: 45000,
      fill: C.white, line: st.terminal ? C.ink : C.line, lineW: st.terminal ? 19050 : 9525,
      paras: [{ text: clip(st.label, 24), size, color: C.ink, align: "ctr" }] });
  });

  // Only genuinely non-sequential or forbidden transitions are listed underneath.
  const odd = (x.transitions || []).filter(t => !inline(t));
  odd.slice(0, 5).forEach((t, k) => {
    const from = x.states[t.from] ? x.states[t.from].label : "?";
    const to = x.states[t.to] ? x.states[t.to].label : "?";
    s += P.shape({ x: a.x, y: a.y + rowsN * rowGap + 0.02 + k * 0.26, cx: a.w, cy: 0.24, fill: "none", line: "none",
      paras: [{ text: (t.illegal ? "✕ " : "↳ ") + from + " → " + to + "   " + clip(t.label || "", 60),
        size: 8.5, color: t.illegal ? C.red : C.muted }], text: { anchor: "ctr", ins: 0 } });
  });
  return s;
}
function rSequence(x, a) {
  const n = x.participants.length;
  const pw = Math.min(1.9, (a.w - 0.2) / n), gap = (a.w - pw * n) / Math.max(n - 1, 1);
  const px = i => a.x + i * (pw + gap) + pw / 2;
  const top = a.y, msgTop = top + 0.62;
  const rowH = Math.min(0.46, (a.h - 0.9) / Math.max(x.messages.length, 1));
  let s = "";
  x.participants.forEach((p, i) => {
    s += P.shape({ x: px(i) - pw / 2, y: top, cx: pw, cy: 0.42, geom: "roundRect", adj: 8000,
      fill: C.white, line: C.line, paras: [{ text: clip(p, 22), size: 9, color: C.ink, align: "ctr" }] });
    s += P.connector({ x1: px(i), y1: top + 0.42, x2: px(i), y2: msgTop + x.messages.length * rowH + 0.1,
      color: C.grid, dash: "dash", w: 6350 });
  });
  x.messages.forEach((m, i) => {
    const y = msgTop + i * rowH + rowH / 2;
    s += P.connector({ x1: px(m.from), y1: y, x2: px(m.to), y2: y, arrow: true,
      color: m.late ? C.red : C.line, dash: m.async ? "dash" : undefined });
    const lx = Math.min(px(m.from), px(m.to)), lw = Math.abs(px(m.to) - px(m.from));
    s += P.shape({ x: lx, y: y - 0.28, cx: lw, cy: 0.24, fill: "none", line: "none",
      paras: [{ text: clip(m.label, 46), size: 8, color: m.late ? C.red : C.muted, align: "ctr" }] });
  });
  return s;
}

function rDfd(x, a) {
  const n = x.nodes.length;
  const nw = Math.min(1.9, (a.w - 0.3) / n), gap = (a.w - nw * n) / Math.max(n - 1, 1);
  const nh = 0.8, y = a.y + 0.5;
  const nx = i => a.x + i * (nw + gap);
  let s = "";
  (x.flows || []).forEach(f => {
    const x1 = nx(f.from) + nw, x2 = nx(f.to);
    s += P.connector({ x1, y1: y + nh / 2, x2, y2: y + nh / 2, arrow: true, color: C.line });
    if (f.label) s += P.shape({ x: x1 - 0.1, y: y + nh / 2 - 0.42, cx: (x2 - x1) + 0.2, cy: 0.32, fill: "none", line: "none",
      paras: [{ text: clip(f.label, 26), size: 7.5, color: C.muted, align: "ctr" }] });
  });
  x.nodes.forEach((nd, i) => {
    const geom = nd.kind === "process" ? "roundRect" : nd.kind === "store" ? "flowChartMagneticDrum" : "rect";
    s += P.shape({ x: nx(i), y, cx: nw, cy: nh, geom, adj: nd.kind === "process" ? 45000 : undefined,
      fill: nd.kind === "process" ? C.soft : C.white, line: nd.kind === "process" ? C.accent : C.line,
      paras: [{ text: clip(nd.label, 26), size: 8.5, color: C.ink, align: "ctr" }] });
    s += P.shape({ x: nx(i), y: y + nh + 0.03, cx: nw, cy: 0.22, fill: "none", line: "none",
      paras: [{ text: nd.kind === "store" ? "data store" : nd.kind, size: 7.5, color: C.muted, align: "ctr" }] });
  });
  return s;
}

function rDashboard(x, a) {
  const tiles = (x.tiles || []).slice(0, 4), bars = (x.bars || []).slice(0, 6);
  let s = "", y = a.y;
  if (tiles.length) {
    const tw = a.w / tiles.length;
    tiles.forEach((t, i) => {
      s += P.shape({ x: a.x + i * tw + 0.03, y, cx: tw - 0.06, cy: 0.9, geom: "rect", fill: C.plane, line: C.line,
        paras: [{ text: clip(t.label, 26), size: 8, color: C.muted },
                { text: clip(t.value, 18), size: 15, bold: true, color: C.ink },
                { text: clip(t.delta || "", 26), size: 7.5, color: t.dir === "down" ? C.red : t.dir === "up" ? "0A7A0A" : C.muted }],
        text: { anchor: "ctr", ins: 0.08 } });
    });
    y += 1.05;
  }
  const bh = Math.min(0.34, (a.h - (tiles.length ? 1.1 : 0)) / Math.max(bars.length, 1));
  bars.forEach((b, i) => {
    const by = y + i * bh;
    s += P.shape({ x: a.x, y: by, cx: 2.4, cy: bh - 0.06, fill: "none", line: "none",
      paras: [{ text: clip(b.label, 34), size: 8.5, color: C.ink }] });
    const trackX = a.x + 2.5, trackW = a.w - 2.5 - 1.5;
    s += P.shape({ x: trackX, y: by + (bh - 0.16) / 2, cx: trackW, cy: 0.13, geom: "roundRect", adj: 50000, fill: "ECEAE4", line: "none" });
    const pct = Math.max(0, Math.min(1, b.value / (b.max || 100)));
    if (pct > 0) s += P.shape({ x: trackX, y: by + (bh - 0.16) / 2, cx: Math.max(trackW * pct, 0.05), cy: 0.13, geom: "roundRect", adj: 50000, fill: C.accent, line: "none" });
    s += P.shape({ x: a.x + a.w - 1.45, y: by, cx: 1.45, cy: bh - 0.06, fill: "none", line: "none",
      paras: [{ text: clip(b.note != null ? b.note : b.value, 20), size: 8, color: C.muted }] });
  });
  return s;
}

const RENDER = { table: rTable, matrix: rMatrix, canvas: rCanvas, tree: rTree, flow: rFlow,
  swimlane: rSwimlane, usecase: rUsecase, state: rState, sequence: rSequence, dfd: rDfd, dashboard: rDashboard };

/* A blank table should fill the working area rather than leave two thirds of
   the slide empty, so pad it out to the number of rows that actually fit. */
function fillOut(x) {
  if (x.type !== "table") return x;
  const fits = Math.max(x.rows.length, Math.floor((MAIN.h - 1.0) / 0.42) - 1);
  if (fits <= x.rows.length) return x;
  const blank = x.cols.map(() => "");
  return Object.assign({}, x, { rows: x.rows.concat(Array.from({ length: fits - x.rows.length }, () => blank.slice())) });
}

function artefact(x) {
  const fn = RENDER[x.type];
  if (!fn) throw new Error("no PowerPoint renderer for exhibit type " + x.type);
  return fn(x, AREA());
}

/* ---------- slides ---------- */

function groupsOf(list) {
  const groups = [];
  list.forEach(t => {
    let g = groups.find(x => x.name === t.group);
    if (!g) groups.push(g = { name: t.group, items: [] });
    g.items.push(t);
  });
  return groups;
}

/* The two slides a technique gets: worked example, then blank template. */
/* The template slide carries no teaching copy — the sidebar of purpose, use and
   confused-with belongs on the worked example. Dropping it also hands the whole
   slide width to the form, which is the point of it. */
function templateSlide(t) {
  const FULL = { x: M, y: 1.86, w: PAGE.w - 2 * M, h: PAGE.h - 1.86 - 0.72 };
  return header(t, "tpl")
    + P.shape({ x: M, y: 1.32, cx: PAGE.w - 2 * M, cy: 0.3, fill: "none", line: "none",
        paras: [{ text: clip(t.template.title, 120), size: 12.5, bold: true, color: C.deep }],
        text: { anchor: "b", ins: 0 } })
    + (t.template.note
        ? P.shape({ x: M, y: PAGE.h - 0.84, cx: PAGE.w - 2 * M, cy: 0.38, fill: "none", line: "none",
            paras: [{ text: clip(t.template.note, 190), size: 8.5, color: C.muted }],
            text: { anchor: "t", ins: 0 } })
        : "")
    + artefactIn(fillOut(t.template), FULL);
}

function pair(t) {
  return [
    { shapes: header(t, "ex") + sidebar(t, "ex") + caption(t.visual.title, t.visual.note) + artefact(t.visual) },
    { shapes: templateSlide(t) }
  ];
}

function titleSlide(sub) {
  return { shapes:
    P.shape({ x: 0, y: 0, cx: PAGE.w, cy: PAGE.h, fill: C.plane, line: "none" })
    + P.shape({ x: 1.1, y: 2.15, cx: 11, cy: 0.9, fill: "none", line: "none",
        paras: [{ text: "CBAP® Technique Pack", size: 44, bold: true, color: C.ink }] })
    + P.shape({ x: 1.1, y: 3.05, cx: 11, cy: 0.5, fill: "none", line: "none",
        paras: [{ text: sub, size: 16, color: C.muted }] })
    + P.connector({ x1: 1.1, y1: 3.75, x2: 5.2, y2: 3.75, color: C.accent, w: 28575 })
    + P.shape({ x: 1.1, y: 4.0, cx: 11, cy: 0.9, fill: "none", line: "none",
        paras: [{ text: "Every diagram and table on the following slides is a native PowerPoint object.", size: 11, color: C.ink },
                { text: "Select it, type over it, recolour it, delete what you do not need.", size: 11, color: C.ink }] })
    + P.shape({ x: 1.1, y: 6.3, cx: 11, cy: 0.4, fill: "none", line: "none",
        paras: [{ text: "business-analyst.services  ·  generated from techniques.json  ·  not affiliated with IIBA®", size: 9.5, color: C.muted }] }) };
}

function contentsSlide(groups) {
  let contents = P.shape({ x: M, y: 0.4, cx: 11, cy: 0.6, fill: "none", line: "none",
      paras: [{ text: "Contents", size: 26, bold: true, color: C.ink }] })
    + P.connector({ x1: M, y1: 1.12, x2: PAGE.w - M, y2: 1.12, color: C.grid });
  groups.forEach((g, gi) => {
    const col = gi % 2, row = Math.floor(gi / 2);
    const gx = M + col * 6.3, gy = 1.3 + row * 2.0;
    contents += P.shape({ x: gx, y: gy, cx: 6.0, cy: 0.26, fill: "none", line: "none",
      paras: [{ text: g.name.toUpperCase(), size: 9, bold: true, color: C.deep }] });
    contents += P.shape({ x: gx, y: gy + 0.26, cx: 6.0, cy: 1.6, fill: "none", line: "none",
      paras: g.items.map(t => ({ text: t.n + "  " + t.name, size: 8.5, color: C.ink })), text: { anchor: "t", ins: 0 } });
  });
  return { shapes: contents };
}

/* The whole pack: title, contents, then every technique in group order. */
function buildPack(list) {
  P.resetIds();
  const groups = groupsOf(list);
  const slides = [titleSlide("All 50 BABOK® Guide v3 techniques — a worked example and a blank template for each"),
    contentsSlide(groups)];
  groups.forEach(g => g.items.forEach(t => slides.push(...pair(t))));
  return { buf: P.build(slides, { title: "CBAP Technique Pack", creator: "Business Analyst Services" }), slides };
}

/* One technique on its own: just the pair, no front matter. */
function buildOne(t, which) {
  P.resetIds();
  const slides = pair(t);
  const pick = which === "ex" ? [slides[0]] : which === "tpl" ? [slides[1]] : slides;
  const suffix = which === "ex" ? " — worked example" : which === "tpl" ? " — blank template" : "";
  return P.build(pick, { title: t.n + " " + t.name + suffix, creator: "Business Analyst Services" });
}

/* Render an artefact into an arbitrary rectangle, so callers that are not the
   technique pair (the scenario walkthrough) can lay slides out differently. */
function artefactIn(x, area) {
  const fn = RENDER[x.type];
  if (!fn) throw new Error("no PowerPoint renderer for exhibit type " + x.type);
  return fn(x, area);
}

module.exports = { buildPack, buildOne, artefact, artefactIn, fillOut, AREA, C, PAGE, MAIN, M, P };

if (require.main === module) {
  const { buf, slides } = buildPack(techs);
  fs.writeFileSync(OUT, buf);
  const byType = {};
  techs.forEach(t => byType[t.visual.type] = (byType[t.visual.type] || 0) + 1);
  console.log(path.basename(OUT) + " written");
  console.log("  slides      " + slides.length + " (title + contents + " + techs.length + " pairs)");
  console.log("  size        " + (buf.length / 1024).toFixed(0) + " KB");
  console.log("  artefacts   " + Object.entries(byType).map(([k, v]) => k + ":" + v).join("  "));
}
