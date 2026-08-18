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

const all = questions.concat(techQuestions);
all.forEach(q => {
  const where = `item ${q.n}`;
  if (!q.options || q.options.length !== 4) errors.push(`${where}: ${q.options ? q.options.length : 0} options`);
  if (!(q.answer >= 0 && q.answer < 4)) errors.push(`${where}: answer out of range`);
  if (q.options && q.options.some(o => !o.text || !o.verdict)) errors.push(`${where}: option missing text or verdict`);
  ["ka", "kaName", "task", "trap", "stem", "why"].forEach(f => { if (!q[f]) errors.push(`${where}: missing ${f}`); });
  (q.techniques || []).forEach(k => { if (!keys.has(k)) errors.push(`${where}: unknown technique "${k}"`); });
  if (q.exhibit) {
    const x = q.exhibit;
    if (!["table", "dashboard"].includes(x.type)) errors.push(`${where}: exhibit type "${x.type}"`);
    if (x.type === "table") {
      if (!x.cols || !x.rows) errors.push(`${where}: table exhibit missing cols or rows`);
      else x.rows.forEach((r, i) => { if (r.length !== x.cols.length) errors.push(`${where}: table row ${i + 1} has ${r.length} cells, header has ${x.cols.length}`); });
    }
    if (x.type === "dashboard" && !x.tiles && !x.bars) errors.push(`${where}: dashboard exhibit is empty`);
  }
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

const exhibits = techQuestions.filter(q => q.exhibit).length;
const tagged = questions.filter(q => q.techniques && q.techniques.length).length;
console.log(`index.html written`);
console.log(`  exam bank        ${questions.length} items (${tagged} carry technique tags)`);
console.log(`  technique bank   ${techQuestions.length} items (${exhibits} with data exhibits)`);
console.log(`  techniques       ${techniques.length}`);
console.log(`  drill pool       ${techQuestions.length + tagged} items`);
