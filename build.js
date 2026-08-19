#!/usr/bin/env node
/* Embeds the JSON data files into index.html.
 *
 *   node build.js
 *
 * questions.json           the 120-item blueprint-weighted exam bank
 * technique-questions.json the technique drill bank, including data exhibits
 * techniques.json          the 50 BABOK v3 techniques used by the learn view
 *
 * Edit the JSON, run this, commit both. The generated block in index.html sits
 * between the two sentinels below and must not be hand-edited.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const dir = __dirname;
const HTML = path.join(dir, "index.html");
const OPEN = "/* === generated data — see build.js, do not edit by hand === */";
const CLOSE = "/* === end generated data === */";

const read = f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
const questions = read("questions.json");
const techniques = read("techniques.json");
const techQuestions = read("technique-questions.json");

/* ---- checks that must hold before anything is written ---- */
const errors = [];
const keys = new Set(techniques.map(t => t.n + " " + t.name));

if (questions.length !== 120) errors.push(`exam bank is ${questions.length} items, expected 120`);

const spread = [0, 0, 0, 0];
questions.forEach(q => spread[q.answer]++);
if (spread.some(n => n !== 30)) errors.push(`exam answer key is ${spread.join("/")}, expected 30/30/30/30`);
for (let i = 1; i < questions.length; i++) {
  if (questions[i].answer === questions[i - 1].answer) errors.push(`items ${i} and ${i + 1} share an answer letter`);
  if (questions[i].ka === questions[i - 1].ka) errors.push(`items ${i} and ${i + 1} share a knowledge area`);
}

/* Exhibits appear on questions and inside technique explainers, so check them in one place. */
const EXHIBIT_TYPES = ["table", "dashboard", "tree", "matrix", "flow", "canvas",
  "swimlane", "usecase", "state", "sequence", "dfd"];
const DFD_KINDS = ["external", "process", "store"];
function checkExhibit(x, where) {
  if (!EXHIBIT_TYPES.includes(x.type)) { errors.push(`${where}: exhibit type "${x.type}" (expected ${EXHIBIT_TYPES.join(", ")})`); return; }
  if (x.type === "tree") {
    if (!x.nodes || !x.nodes.length) { errors.push(`${where}: tree has no nodes`); return; }
    let deepest = 0;
    (function walk(ns, d) {
      deepest = Math.max(deepest, d);
      ns.forEach(n => {
        if (!n.label) errors.push(`${where}: tree node at depth ${d} has no label`);
        if (n.children) walk(n.children, d + 1);
      });
    })(x.nodes, 1);
    if (x.levels && x.levels.length !== deepest) errors.push(`${where}: tree names ${x.levels.length} levels but is ${deepest} deep`);
  }
  if (x.type === "matrix") {
    if (!x.cols || !x.rows || !x.cells) { errors.push(`${where}: matrix missing cols, rows or cells`); return; }
    if (x.cells.length !== x.rows.length) errors.push(`${where}: matrix has ${x.cells.length} cell rows for ${x.rows.length} row labels`);
    x.cells.forEach((r, i) => { if (r.length !== x.cols.length) errors.push(`${where}: matrix row ${i + 1} has ${r.length} cells for ${x.cols.length} columns`); });
  }
  if (x.type === "flow") {
    if (!x.steps || !x.steps.length) { errors.push(`${where}: flow has no steps`); return; }
    x.steps.forEach((s, i) => { if (!s.label) errors.push(`${where}: flow step ${i + 1} has no label`); });
    (x.branches || []).forEach((b, i) => {
      if (!b.from || !b.label) errors.push(`${where}: branch ${i + 1} missing from or label`);
      else if (!x.steps.some(s => s.label === b.from)) errors.push(`${where}: branch ${i + 1} points at "${b.from}", which is not a step`);
    });
  }
  if (x.type === "canvas") {
    if (!x.panels || !x.panels.length) { errors.push(`${where}: canvas has no panels`); return; }
    x.panels.forEach((p, i) => { if (!p.label) errors.push(`${where}: canvas panel ${i + 1} has no label`); });
    if (x.layout === "bmc" && x.panels.length !== 9)
      errors.push(`${where}: bmc layout needs exactly 9 panels, has ${x.panels.length}`);
  }
  // Diagram types: every index must point at something that exists, or the SVG
  // silently draws an arrow to NaN.
  const idx = (v, arr, what) => {
    if (typeof v !== "number" || v < 0 || v >= arr.length) errors.push(`${where}: ${what} index ${v} is out of range (0..${arr.length - 1})`);
  };
  if (x.type === "swimlane") {
    if (!x.lanes || !x.lanes.length) { errors.push(`${where}: swimlane has no lanes`); return; }
    if (!x.steps || !x.steps.length) { errors.push(`${where}: swimlane has no steps`); return; }
    x.steps.forEach((s, i) => {
      if (typeof s.lane !== "number" || s.lane < 0 || s.lane >= x.lanes.length) errors.push(`${where}: step ${i + 1} sits in lane ${s.lane}, which does not exist`);
      if (s.label === undefined) errors.push(`${where}: step ${i + 1} has no label`);
    });
    (x.flows || []).forEach(f => { idx(f.from, x.steps, "flow from"); idx(f.to, x.steps, "flow to"); });
  }
  if (x.type === "usecase") {
    if (!x.actors || !x.actors.length) { errors.push(`${where}: usecase has no actors`); return; }
    if (!x.cases || !x.cases.length) { errors.push(`${where}: usecase has no cases`); return; }
    (x.links || []).forEach(l => { idx(l.actor, x.actors, "link actor"); idx(l.case, x.cases, "link case"); });
    (x.rels || []).forEach(r => { idx(r.from, x.cases, "rel from"); idx(r.to, x.cases, "rel to"); });
  }
  if (x.type === "state") {
    if (!x.states || !x.states.length) { errors.push(`${where}: state model has no states`); return; }
    (x.transitions || []).forEach(tr => { idx(tr.from, x.states, "transition from"); idx(tr.to, x.states, "transition to"); });
  }
  if (x.type === "sequence") {
    if (!x.participants || x.participants.length < 2) { errors.push(`${where}: sequence needs at least two participants`); return; }
    (x.messages || []).forEach(m => {
      idx(m.from, x.participants, "message from"); idx(m.to, x.participants, "message to");
      if (m.from === m.to) errors.push(`${where}: a message goes from a participant to itself`);
    });
  }
  if (x.type === "dfd") {
    if (!x.nodes || !x.nodes.length) { errors.push(`${where}: dfd has no nodes`); return; }
    x.nodes.forEach((n, i) => { if (!DFD_KINDS.includes(n.kind)) errors.push(`${where}: node ${i + 1} kind "${n.kind}" (expected ${DFD_KINDS.join(", ")})`); });
    (x.flows || []).forEach(f => { idx(f.from, x.nodes, "flow from"); idx(f.to, x.nodes, "flow to"); });
  }
  if (x.type === "table") {
    if (!x.cols || !x.rows) { errors.push(`${where}: table exhibit missing cols or rows`); return; }
    x.rows.forEach((r, i) => {
      if (r.length !== x.cols.length) errors.push(`${where}: table row ${i + 1} has ${r.length} cells, header has ${x.cols.length}`);
    });
    if (x.align && x.align.length !== x.cols.length) errors.push(`${where}: align has ${x.align.length} entries, header has ${x.cols.length}`);
  }
  if (x.type === "dashboard") {
    if (!x.tiles && !x.bars) { errors.push(`${where}: dashboard exhibit is empty`); return; }
    (x.tiles || []).forEach((t, i) => {
      if (!t.label || t.value === undefined) errors.push(`${where}: tile ${i + 1} missing label or value`);
      if (t.dir && !["up", "down", "flat"].includes(t.dir)) errors.push(`${where}: tile ${i + 1} has dir "${t.dir}" (expected up, down or flat)`);
    });
    (x.bars || []).forEach((b, i) => {
      if (!b.label) errors.push(`${where}: bar ${i + 1} missing label`);
      if (typeof b.value !== "number") errors.push(`${where}: bar ${i + 1} value is not a number`);
      if (b.max !== undefined && typeof b.max !== "number") errors.push(`${where}: bar ${i + 1} max is not a number`);
    });
  }
}

const all = questions.concat(techQuestions);
all.forEach(q => {
  const where = `item ${q.n}`;
  if (!q.options || q.options.length !== 4) errors.push(`${where}: ${q.options ? q.options.length : 0} options`);
  if (!(q.answer >= 0 && q.answer < 4)) errors.push(`${where}: answer out of range`);
  if (q.options && q.options.some(o => !o.text || !o.verdict)) errors.push(`${where}: option missing text or verdict`);
  ["ka", "kaName", "task", "trap", "stem", "why"].forEach(f => { if (!q[f]) errors.push(`${where}: missing ${f}`); });
  (q.techniques || []).forEach(k => { if (!keys.has(k)) errors.push(`${where}: unknown technique "${k}"`); });
  if (q.exhibit) checkExhibit(q.exhibit, where);
});

techniques.forEach(t => {
  if (t.visual) checkExhibit(t.visual, `${t.n} visual`);
  if (t.template) {
    const where = `${t.n} template`;
    checkExhibit(t.template, where);
    if (!t.visual) errors.push(`${where}: template without a worked example`);
    else {
      // The pair must stay structural twins, or the toggle teaches the wrong shape.
      if (t.template.type !== t.visual.type) errors.push(`${where}: type "${t.template.type}" but example is "${t.visual.type}"`);
      if (t.template.type === "table" && t.template.cols.join("|") !== t.visual.cols.join("|"))
        errors.push(`${where}: columns differ from the worked example`);
      if (t.template.type === "matrix") {
        if (t.template.cols.join("|") !== t.visual.cols.join("|")) errors.push(`${where}: matrix columns differ from the worked example`);
        if (t.template.rows.join("|") !== t.visual.rows.join("|")) errors.push(`${where}: matrix rows differ from the worked example`);
      }
      if (t.template.type === "canvas" && t.template.panels.map(p => p.label).join("|") !== t.visual.panels.map(p => p.label).join("|"))
        errors.push(`${where}: canvas panels differ from the worked example`);
      if (t.template.type === "flow" && t.template.steps.length !== t.visual.steps.length)
        errors.push(`${where}: ${t.template.steps.length} steps against the example's ${t.visual.steps.length}`);
      // A template that still carries findings has not been blanked properly.
      const leaked = JSON.stringify(t.template).match(/\$[\d,]{3,}|\b\d{2,}%/g);
      if (leaked) errors.push(`${where}: still carries example data (${[...new Set(leaked)].slice(0, 3).join(", ")})`);
    }
  }
  (t.explainers || []).forEach((x, i) => {
    const where = `${t.n} explainer ${i + 1}`;
    ["term", "formula", "plain"].forEach(f => { if (!x[f]) errors.push(`${where}: missing ${f}`); });
    if (!x.data) errors.push(`${where}: missing data table`); else checkExhibit(x.data, where + " data");
    if (!x.chart) errors.push(`${where}: missing dashboard`); else checkExhibit(x.chart, where + " chart");
  });
});

techQuestions.forEach(q => {
  if (!q.techniques || !q.techniques.length) errors.push(`technique item ${q.n}: no techniques tagged`);
});

const primary = new Set(techQuestions.map(q => q.techniques && q.techniques[0]));
const orphan = [...keys].filter(k => !primary.has(k));
if (orphan.length) errors.push(`${orphan.length} technique(s) have no item of their own: ${orphan.join(", ")}`);

if (errors.length) {
  console.error("build failed:\n" + errors.map(e => "  - " + e).join("\n"));
  process.exit(1);
}

/* ---- write ---- */
const block = [
  OPEN,
  "const QUESTIONS = " + JSON.stringify(questions, null, 1) + ";",
  "",
  "const TECHNIQUES = " + JSON.stringify(techniques, null, 1) + ";",
  "",
  "const TECHNIQUE_QUESTIONS = " + JSON.stringify(techQuestions, null, 1) + ";",
  CLOSE
].join("\n");

let html = fs.readFileSync(HTML, "utf8");
const start = html.indexOf(OPEN);
if (start !== -1) {
  const end = html.indexOf(CLOSE, start);
  if (end === -1) { console.error("build failed: opening sentinel found without a closing one"); process.exit(1); }
  html = html.slice(0, start) + block + html.slice(end + CLOSE.length);
} else {
  // First run: replace the hand-written array that predates this script.
  const s = html.indexOf("const QUESTIONS = [");
  if (s === -1) { console.error("build failed: cannot find the QUESTIONS array in index.html"); process.exit(1); }
  const m = /\r?\n\];\r?\n/.exec(html.slice(s));
  if (!m) { console.error("build failed: cannot find the end of the QUESTIONS array"); process.exit(1); }
  html = html.slice(0, s) + block + html.slice(s + m.index + m[0].length - 1);
}
fs.writeFileSync(HTML, html);

/* The PowerPoint pack is part of the product, not a side artefact: it is
   generated from the same data, in the same build, so it cannot fall behind. */
let pack = "skipped";
try {
  execFileSync(process.execPath, [path.join(dir, "make-pptx.js")], { stdio: "pipe" });
  const st = fs.statSync(path.join(dir, "CBAP-Technique-Pack.pptx"));
  pack = (st.size / 1024).toFixed(0) + " KB";
} catch (e) {
  console.error("warning: the PowerPoint pack did not rebuild -", (e.message || "").split("\n")[0]);
  pack = "FAILED";
}

const exhibits = techQuestions.filter(q => q.exhibit).length;
const tagged = questions.filter(q => q.techniques && q.techniques.length).length;
console.log(`index.html written`);
console.log(`  exam bank        ${questions.length} items (${tagged} carry technique tags)`);
console.log(`  technique bank   ${techQuestions.length} items (${exhibits} with data exhibits)`);
console.log(`  techniques       ${techniques.length}`);
console.log(`  drill pool       ${techQuestions.length + tagged} items`);
console.log(`  powerpoint pack  ${pack}`);
