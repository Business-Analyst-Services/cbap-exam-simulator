#!/usr/bin/env node
/* The scenario walkthrough, in all three formats.
 *
 *   node make-scenario.js
 *
 * One engagement worked end to end. Each step names what it takes from the step
 * before and what it hands to the next, so the chain is on the page rather than
 * implied.
 */
const fs = require("fs");
const path = require("path");
const { toGrid } = require("./artefact-grid.js");
const PPT = require("./make-pptx.js");
const X = require("./xlsx-lib.js");
const D = require("./docx-lib.js");

const dir = __dirname;
const sc = JSON.parse(fs.readFileSync(path.join(dir, "scenario.json"), "utf8"));
const techs = JSON.parse(fs.readFileSync(path.join(dir, "techniques.json"), "utf8"));
const byKey = {};
techs.forEach(t => byKey[t.n + " " + t.name] = t);

const P = PPT.P, C = PPT.C, PAGE = PPT.PAGE, M = PPT.M;
const clip = (s, n) => { s = String(s == null ? "" : s); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; };

/* ---------- PowerPoint ---------- */
function stepSlide(st) {
  const t = byKey[st.technique] || {};
  let s = P.shape({ x: M, y: 0.3, cx: 1.0, cy: 0.44, geom: "roundRect", adj: 20000, fill: C.accent, line: C.accent,
    paras: [{ text: "STEP " + st.seq, size: 10, bold: true, color: "FFFFFF", align: "ctr" }] });
  s += P.shape({ x: M + 1.14, y: 0.28, cx: 9.5, cy: 0.48, fill: "none", line: "none",
    paras: [{ text: st.technique, size: 20, bold: true, color: C.ink }], text: { anchor: "ctr", ins: 0 } });
  s += P.shape({ x: PAGE.w - M - 2.6, y: 0.34, cx: 2.6, cy: 0.36, fill: "none", line: "none",
    paras: [{ text: t.group || "", size: 10, color: C.muted, align: "r" }], text: { anchor: "ctr", ins: 0 } });
  s += P.shape({ x: M, y: 0.8, cx: 11.5, cy: 0.34, fill: "none", line: "none",
    paras: [{ text: st.question, size: 13.5, italic: true, color: C.deep }], text: { anchor: "ctr", ins: 0 } });
  s += P.connector({ x1: M, y1: 1.22, x2: PAGE.w - M, y2: 1.22, color: C.grid });

  const bw = (PAGE.w - 2 * M - 0.2) / 2;
  const box = (x, label, text, accent) =>
    P.shape({ x, y: 1.34, cx: bw, cy: 0.78, geom: "rect", fill: C.plane, line: "none",
      paras: [{ text: label, size: 8, bold: true, color: C.muted },
              { text: clip(text, 190), size: 9.5, color: C.ink }], text: { anchor: "t", ins: 0.1 } }) +
    (accent ? P.shape({ x, y: 1.34, cx: 0.035, cy: 0.78, fill: C.accent, line: "none" }) : "");
  s += box(M, "TAKES", st.takes, false);
  s += box(M + bw + 0.2, "GIVES", st.gives, true);

  s += P.shape({ x: M, y: 2.24, cx: 11.5, cy: 0.26, fill: "none", line: "none",
    paras: [{ text: clip(st.artefact.title || "", 110), size: 11, bold: true, color: C.deep }], text: { anchor: "b", ins: 0 } });
  s += PPT.artefactIn(st.artefact, { x: M, y: 2.56, w: PAGE.w - 2 * M, h: 4.0 });
  if (st.artefact.note) s += P.shape({ x: M, y: PAGE.h - 0.86, cx: 11.5, cy: 0.42, fill: "none", line: "none",
    paras: [{ text: clip(st.artefact.note, 200), size: 8.5, color: C.muted }], text: { anchor: "t", ins: 0 } });
  s += P.shape({ x: M, y: PAGE.h - 0.4, cx: 9, cy: 0.24, fill: "none", line: "none",
    paras: [{ text: sc.name, size: 8, color: C.muted }], text: { anchor: "ctr", ins: 0 } });
  return { shapes: s };
}

function pptx() {
  P.resetIds();
  const slides = [];
  slides.push({ shapes:
    P.shape({ x: 0, y: 0, cx: PAGE.w, cy: PAGE.h, fill: C.plane, line: "none" })
    + P.shape({ x: 1.1, y: 1.9, cx: 11, cy: 0.7, fill: "none", line: "none",
        paras: [{ text: "One scenario, sixteen techniques", size: 40, bold: true, color: C.ink }] })
    + P.shape({ x: 1.1, y: 2.66, cx: 11, cy: 0.5, fill: "none", line: "none",
        paras: [{ text: sc.name, size: 17, color: C.deep }] })
    + P.connector({ x1: 1.1, y1: 3.3, x2: 5.2, y2: 3.3, color: C.accent, w: 28575 })
    + P.shape({ x: 1.1, y: 3.6, cx: 10.8, cy: 1.6, fill: "none", line: "none",
        paras: [{ text: sc.brief, size: 12, color: C.ink }], text: { anchor: "t", ins: 0 } })
    + P.shape({ x: 1.1, y: 6.3, cx: 11, cy: 0.4, fill: "none", line: "none",
        paras: [{ text: "business-analyst.services · generated from scenario.json · not affiliated with IIBA®", size: 9.5, color: C.muted }] }) });

  // the chain, on one slide, before the detail
  let chain = P.shape({ x: M, y: 0.4, cx: 11, cy: 0.5, fill: "none", line: "none",
    paras: [{ text: "The chain", size: 24, bold: true, color: C.ink }] })
    + P.connector({ x1: M, y1: 1.0, x2: PAGE.w - M, y2: 1.0, color: C.grid });
  const per = 4, bw2 = (PAGE.w - 2 * M - (per - 1) * 0.18) / per, bh2 = 1.28;
  sc.steps.forEach((st, i) => {
    const col = i % per, row = Math.floor(i / per);
    const x = M + col * (bw2 + 0.18), y = 1.2 + row * (bh2 + 0.14);
    chain += P.shape({ x, y, cx: bw2, cy: bh2, geom: "roundRect", adj: 6000, fill: "FFFFFF", line: C.line,
      paras: [{ text: "STEP " + st.seq, size: 8, bold: true, color: C.accent },
              { text: clip(st.technique, 46), size: 9.5, bold: true, color: C.ink },
              { text: "→ " + clip(st.gives, 74), size: 8, color: C.muted }],
      text: { anchor: "t", ins: 0.08 } });
  });
  slides.push({ shapes: chain });

  sc.steps.forEach(st => slides.push(stepSlide(st)));
  slides.push({ shapes:
    P.shape({ x: 1.1, y: 2.4, cx: 11, cy: 0.6, fill: "none", line: "none",
      paras: [{ text: "Why the chain matters", size: 30, bold: true, color: C.ink }] })
    + P.shape({ x: 1.1, y: 3.2, cx: 10.8, cy: 2.2, fill: "none", line: "none",
      paras: [{ text: sc.closing, size: 13, color: C.ink }], text: { anchor: "t", ins: 0 } }) });
  return P.build(slides, { title: "CBAP Scenario Walkthrough", creator: "Business Analyst Services" });
}

/* ---------- Word ---------- */
function docx() {
  const K = D.C;
  let b = D.para("One scenario, sixteen techniques", { size: 22, bold: true, after: 2 });
  b += D.para(sc.name, { size: 13, color: K.deep, after: 6 });
  b += D.para(sc.brief, { size: 10.5, shade: K.plane, after: 12 });

  b += D.para("THE CHAIN", { size: 9, bold: true, color: K.muted, caps: true, spacing: 20, after: 4 });
  b += D.table([["#", "Technique", "Takes", "Gives"],
    ...sc.steps.map(st => [String(st.seq), st.technique, st.takes, st.gives])],
    { header: true, widths: [0.4, 2.9, 3.9, 4.2], size: 8.5 });

  sc.steps.forEach(st => {
    const t = byKey[st.technique] || {};
    b += D.para("STEP " + st.seq + "  ·  " + st.technique,
      { size: 14, bold: true, color: K.ink, before: 14, after: 2, rule: K.grid });
    b += D.para(st.question, { size: 11, italic: true, color: K.deep, after: 6 });
    b += D.table([[{ text: "Takes", bold: true }, st.takes], [{ text: "Gives", bold: true }, st.gives]],
      { widths: [1.0, 10.4], size: 9 });
    const g = toGrid(st.artefact);
    b += D.para(g.title, { size: 11, bold: true, after: 4 });
    b += D.table([g.head, ...g.rows.map((r, ri) =>
      g.head.map((_, ci) => ({ text: r[ci] == null ? "" : r[ci], total: ri === g.totalAt })))],
      { header: true, widths: g.widths, size: 8.5 });
    if (g.note) b += D.para(g.note, { size: 9, italic: true, color: K.muted, after: 4 });
    if (t.confused) b += D.para("Why this and not its neighbour: " + t.confused, { size: 9, color: K.muted, after: 6 });
  });

  b += D.para("Why the chain matters", { size: 15, bold: true, before: 16, after: 4 });
  b += D.para(sc.closing, { size: 10.5, after: 8 });
  b += D.para("CBAP® Technique Pack · BABOK® Guide v3 · business-analyst.services · not affiliated with IIBA®",
    { size: 8, color: K.muted });
  return D.build(b, { title: "CBAP Scenario Walkthrough" });
}

/* ---------- Excel ---------- */
function xlsx() {
  const chain = {
    name: "The chain", widths: [5, 38, 52, 58], heights: [24, 18],
    rows: [
      [{ v: "One scenario, sixteen techniques", s: X.S.TITLE, span: 4 }],
      [{ v: sc.name, s: X.S.SUB, span: 4 }],
      [],
      [{ v: "Step", s: X.S.HEAD }, { v: "Technique", s: X.S.HEAD }, { v: "Takes", s: X.S.HEAD }, { v: "Gives", s: X.S.HEAD }],
      ...sc.steps.map((st, i) => {
        const s = i % 2 ? X.S.BAND : X.S.CELL;
        return [{ v: st.seq, s }, { v: st.technique, s }, { v: st.takes, s }, { v: st.gives, s }];
      }),
      [],
      [{ v: sc.closing, s: X.S.NOTE, span: 4 }]
    ]
  };
  const sheets = [chain];
  sc.steps.forEach(st => {
    const g = toGrid(st.artefact);
    const w = Math.max(g.head.length, 2);
    const rows = [
      [{ v: "Step " + st.seq + " · " + st.technique, s: X.S.TITLE, span: w }],
      [{ v: st.question, s: X.S.SUB, span: w }],
      [{ v: "Takes: " + st.takes, s: X.S.NOTE, span: w }],
      [{ v: "Gives: " + st.gives, s: X.S.NOTE, span: w }],
      [],
      [{ v: g.title, s: X.S.LABEL, span: w }],
      g.head.map(h => ({ v: h, s: X.S.HEAD })),
      ...g.rows.map((r, ri) => {
        const s = ri === g.totalAt ? X.S.TOTAL : (ri % 2 ? X.S.BAND : X.S.CELL);
        return g.head.map((_, ci) => ({ v: r[ci] == null ? "" : r[ci], s }));
      })
    ];
    if (g.note) { rows.push([]); rows.push([{ v: g.note, s: X.S.NOTE, span: w }]); }
    sheets.push({ name: String(st.seq).padStart(2, "0") + " " + st.technique.split(" ")[0],
      rows, widths: g.widths.map(x => Math.round(x * 9)), heights: [22, 18] });
  });
  return X.build(sheets, { title: "CBAP Scenario Walkthrough" });
}

const out = [["pptx", pptx()], ["docx", docx()], ["xlsx", xlsx()]];
out.forEach(([ext, buf]) => fs.writeFileSync(path.join(dir, "CBAP-Scenario-Walkthrough." + ext), buf));
console.log("scenario walkthrough written");
out.forEach(([ext, buf]) => console.log("  ." + ext.padEnd(6) + (buf.length / 1024).toFixed(0) + " KB"));

module.exports = { pptx, docx, xlsx };
