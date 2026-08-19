#!/usr/bin/env node
/* One file per technique, in each of the three Office formats.
 *
 *   node make-files.js
 *
 * Writes templates/<nn>-<slug>.{pptx,docx,xlsx} and zips the lot into
 * CBAP-Technique-Templates.zip. Each file carries the worked example and the
 * blank template for that one technique, so it can be handed to someone on its
 * own without the other 49.
 */
const fs = require("fs");
const path = require("path");
const { zip, slug } = require("./ooxml.js");
const { toGrid, padBlank } = require("./artefact-grid.js");
const PPT = require("./make-pptx.js");
const X = require("./xlsx-lib.js");
const D = require("./docx-lib.js");

const dir = __dirname;
const OUTDIR = path.join(dir, "templates");
const techs = JSON.parse(fs.readFileSync(path.join(dir, "techniques.json"), "utf8"));

const pad = n => (n.length < 5 ? n.replace(/^10\.(\d)$/, "10.0$1") : n);
const baseName = t => pad(t.n).replace("10.", "") + "-" + slug(t.name);

/* ---------- Excel ---------- */
function xlsxFor(t, which) {
  const sheet = (x, label, pad) => {
    const g = pad ? padBlank(toGrid(x), pad) : toGrid(x);
    const rows = [];
    rows.push([{ v: t.n + "  " + t.name, s: X.S.TITLE, span: Math.max(g.head.length, 2) }]);
    rows.push([{ v: label + " · " + g.title, s: X.S.SUB, span: Math.max(g.head.length, 2) }]);
    rows.push([]);
    rows.push(g.head.map(h => ({ v: h, s: X.S.HEAD })));
    g.rows.forEach((r, ri) => {
      const st = ri === g.totalAt ? X.S.TOTAL : (ri % 2 ? X.S.BAND : X.S.CELL);
      rows.push(g.head.map((_, ci) => ({ v: r[ci] == null ? "" : r[ci], s: st })));
    });
    if (g.note) { rows.push([]); rows.push([{ v: g.note, s: X.S.NOTE, span: Math.max(g.head.length, 2) }]); }
    // Excel column widths are characters, not inches
    const widths = g.widths.map(w => Math.round(w * 9));
    return { name: label, rows, widths, heights: [22, 18] };
  };

  const guide = {
    name: "About", widths: [16, 92], heights: [22],
    rows: [
      [{ v: t.n + "  " + t.name, s: X.S.TITLE, span: 2 }],
      [{ v: t.group, s: X.S.SUB, span: 2 }],
      [],
      [{ v: "What it is for", s: X.S.LABEL }, { v: t.purpose, s: X.S.CELL }],
      [{ v: "Reach for it when", s: X.S.LABEL }, { v: t.use, s: X.S.CELL }],
      [{ v: "Confused with", s: X.S.LABEL }, { v: t.confused, s: X.S.CELL }],
      [{ v: "Tasks", s: X.S.LABEL }, { v: (t.tasks || []).join("  ·  "), s: X.S.CELL }],
      [{ v: "Knowledge areas", s: X.S.LABEL }, { v: (t.kas || []).join(", "), s: X.S.CELL }],
      [],
      [{ v: which === "ex" ? "The worked example is on the next sheet." : "The blank template is on the next sheet — fill it in.", s: X.S.NOTE, span: 2 }]
    ]
  };
  if (which !== "ex") {
    // No About sheet: the template workbook opens straight onto the form.
    return X.build([sheet(t.template, "Blank template", 20)], { title: t.n + " " + t.name + " — blank template" });
  }
  return X.build([guide, sheet(t.visual, "Worked example")], { title: t.n + " " + t.name });
}

/* ---------- Word ---------- */
const FOOTER = "CBAP® Technique Pack · BABOK® Guide v3 · business-analyst.services · not affiliated with IIBA®";

function docxFor(t, which) {
  if (which !== "ex") return docxTemplateFor(t);
  const C = D.C;
  let b = "";
  b += D.para(t.n + "  " + t.name, { size: 21, bold: true, after: 2 });
  b += D.para(t.group, { size: 10, color: C.muted, rule: C.grid, after: 10 });

  const block = (label, text) =>
    D.para(label, { size: 8, bold: true, color: C.muted, caps: true, spacing: 20, after: 2 }) +
    D.para(text, { size: 10, after: 8 });

  b += block("What it is for", t.purpose);
  b += block("Reach for it when", t.use);
  b += D.para("Most often confused with", { size: 8, bold: true, color: C.muted, caps: true, spacing: 20, after: 2 });
  b += D.para(t.confused, { size: 10, shade: C.plane, after: 10 });

  const section = (x, label) => {
    const g = toGrid(x);
    let s = D.para(label.toUpperCase(), { size: 9, bold: true, color: C.deep, spacing: 20, before: 8, after: 2 });
    s += D.para(g.title, { size: 12, bold: true, after: 6 });
    s += D.table([g.head, ...g.rows.map((r, ri) =>
      g.head.map((_, ci) => ({ text: r[ci] == null ? "" : r[ci], total: ri === g.totalAt })))],
      { header: true, widths: g.widths, size: 9 });
    if (g.note) s += D.para(g.note, { size: 9, italic: true, color: C.muted, after: 8 });
    return s;
  };

  b += section(t.visual, "Worked example");
  b += D.para((t.tasks || []).length ? "Tasks that use it: " + t.tasks.join("  ·  ") : "",
    { size: 9, color: C.muted, before: 6 });
  b += D.para(FOOTER, { size: 8, color: C.muted, before: 10 });
  return D.build(b, { title: t.n + " " + t.name });
}

/* The template document is the form. No purpose, no when-to-use, no
   confused-with, no task list — that material belongs on the worked example. */
function docxTemplateFor(t) {
  const C = D.C;
  const g = padBlank(toGrid(t.template), 12);
  let b = D.para(t.n + "  " + t.name, { size: 21, bold: true, after: 2 });
  b += D.para("Blank template", { size: 10, color: C.muted, rule: C.grid, after: 12 });
  b += D.para(g.title, { size: 12.5, bold: true, after: 6 });
  b += D.table([g.head, ...g.rows.map(r => g.head.map((_, ci) => (r[ci] == null ? "" : r[ci])))],
    { header: true, widths: g.widths, size: 9 });
  if (g.note) b += D.para(g.note, { size: 9, italic: true, color: C.muted, before: 2 });
  b += D.para(FOOTER, { size: 8, color: C.muted, before: 10 });
  return D.build(b, { title: t.n + " " + t.name + " — blank template" });
}

/* ---------- run ---------- */
fs.rmSync(OUTDIR, { recursive: true, force: true });
fs.mkdirSync(OUTDIR, { recursive: true });

/* Two files per technique per format: the worked example and the blank
   template separately, so a download matches the tab you are looking at. */
const entries = [];
let bytes = 0, count = 0;
techs.forEach(t => {
  const base = baseName(t);
  [["ex", "example"], ["tpl", "template"]].forEach(([which, label]) => {
    const made = [["pptx", PPT.buildOne(t, which)], ["docx", docxFor(t, which)], ["xlsx", xlsxFor(t, which)]];
    made.forEach(([ext, buf]) => {
      const name = base + "-" + label + "." + ext;
      fs.writeFileSync(path.join(OUTDIR, name), buf);
      entries.push({ name: "CBAP technique templates/" + name, data: buf });
      bytes += buf.length; count++;
    });
  });
});

const index = ["CBAP Technique Templates", "",
  "One file per technique, in three formats:", "",
  "  .pptx  the artefact drawn as PowerPoint shapes - swimlanes, use cases,",
  "         state machines and sequence diagrams keep their notation.",
  "  .docx  the same artefact as a Word table you type into.",
  "  .xlsx  the same artefact as a worksheet, with an About sheet beside it.", "",
  "Two files per technique per format:", "",
  "  -example   the artefact filled in",
  "  -template  the same artefact blank, for you to complete", "",
  "Each file covers one technique only, so it can be handed on without the",
  "other 49.", "",
  "Generated from techniques.json. Not affiliated with IIBA(R).", "",
  "----", ""];
techs.forEach(t => index.push(baseName(t).padEnd(44) + t.n + "  " + t.name));
["pptx", "docx", "xlsx"].forEach(ext => {
  const f = path.join(dir, "CBAP-Scenario-Walkthrough." + ext);
  if (fs.existsSync(f)) entries.push({ name: "CBAP technique templates/_scenario/CBAP-Scenario-Walkthrough." + ext, data: fs.readFileSync(f) });
});
index.push("", "----", "",
  "_scenario/  one engagement worked end to end across 16 techniques, each step",
  "            taking what the one before it produced. Same three formats.");
entries.push({ name: "CBAP technique templates/INDEX.txt", data: index.join("\r\n") });

const zipBuf = zip(entries);
fs.writeFileSync(path.join(dir, "CBAP-Technique-Templates.zip"), zipBuf);

console.log("templates/ written");
console.log("  techniques   " + techs.length);
console.log("  files        " + count + " (example + template, in each of pptx, docx, xlsx)");
console.log("  loose size   " + (bytes / 1024 / 1024).toFixed(1) + " MB");
console.log("  zip          " + (zipBuf.length / 1024 / 1024).toFixed(1) + " MB");
