#!/usr/bin/env node
/* Builds the course site from course.json.
 *
 *   node make-site.js
 *
 * Writes index.html (the twelve-week programme) and week-01..week-12.html.
 * The simulator lives at simulator.html and is one of the tools the weeks link
 * into — the course comes first, the drill sits inside it.
 */
const fs = require("fs");
const path = require("path");

const dir = __dirname;
const course = JSON.parse(fs.readFileSync(path.join(dir, "course.json"), "utf8"));
const techs = JSON.parse(fs.readFileSync(path.join(dir, "techniques.json"), "utf8"));
const byKey = {}; techs.forEach(t => byKey[t.n + " " + t.name] = t);

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");
const pad2 = n => String(n).padStart(2, "0");
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fileBase = t => {
  const n = t.n.length < 5 ? t.n.replace(/^10\.(\d)$/, "10.0$1") : t.n;
  return n.replace("10.", "") + "-" + slug(t.name);
};

const KANAMES = { 2: "Key Concepts", 3: "BA Planning and Monitoring", 4: "Elicitation and Collaboration",
  5: "Requirements Life Cycle Management", 6: "Strategy Analysis",
  7: "Requirements Analysis and Design Definition", 8: "Solution Evaluation", 11: "Perspectives" };

/* ---------- shared chrome ---------- */
const CSS = `/* Course site — shared with the simulator's palette so the two read as one thing. */
:root{
  color-scheme:light;
  --surface-1:#fcfcfb; --plane:#f9f9f7;
  --ink:#0b0b0b; --ink-2:#52514e; --muted:#898781;
  --grid:#e1e0d9; --axis:#c3c2b7; --border:rgba(11,11,11,.10);
  --accent:#2a78d6; --accent-soft:#cde2fb; --accent-deep:#184f95;
  --warning:#fab219; --sel:#e9f1fd;
  --shadow:0 1px 2px rgba(11,11,11,.05), 0 8px 24px rgba(11,11,11,.06);
}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
  color-scheme:dark;
  --surface-1:#1a1a19; --plane:#0d0d0d;
  --ink:#fff; --ink-2:#c3c2b7; --muted:#898781;
  --grid:#2c2c2a; --axis:#383835; --border:rgba(255,255,255,.10);
  --accent:#3987e5; --accent-soft:#184f95; --accent-deep:#86b6ef;
  --sel:#12233a; --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35);
}}
:root[data-theme="dark"]{
  color-scheme:dark;
  --surface-1:#1a1a19; --plane:#0d0d0d;
  --ink:#fff; --ink-2:#c3c2b7; --muted:#898781;
  --grid:#2c2c2a; --axis:#383835; --border:rgba(255,255,255,.10);
  --accent:#3987e5; --accent-soft:#184f95; --accent-deep:#86b6ef;
  --sel:#12233a; --shadow:0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35);
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--plane);color:var(--ink);
  font:16px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:920px;margin:0 auto;padding:0 20px 90px}
a{color:var(--accent-deep)}
nav.bar{position:sticky;top:0;z-index:20;background:var(--plane);border-bottom:1px solid var(--border);
  padding:11px 0;margin-bottom:34px}
nav.bar .wrap{padding-bottom:0;display:flex;gap:14px;align-items:center;flex-wrap:wrap}
nav.bar a{text-decoration:none;color:var(--ink-2);font-size:14.5px}
nav.bar a:hover{color:var(--ink)}
nav.bar a.home{font-weight:650;color:var(--ink);margin-right:4px}
nav.bar .sp{flex:1}
h1{font-size:34px;line-height:1.15;margin:0 0 10px;letter-spacing:-.02em}
h2{font-size:20px;margin:38px 0 12px;letter-spacing:-.01em}
h3{font-size:16px;margin:26px 0 8px;letter-spacing:-.005em}
p{margin:0 0 14px}
.lede{font-size:18px;color:var(--ink-2);margin-bottom:22px}
.sub{color:var(--ink-2);font-size:15px}
.muted{color:var(--muted);font-size:14px}
.rule{height:1px;background:var(--grid);margin:30px 0}

.weeks{display:grid;gap:12px}
.wk{display:grid;grid-template-columns:64px 1fr;gap:16px;background:var(--surface-1);
  border:1px solid var(--border);border-radius:12px;padding:18px 20px;box-shadow:var(--shadow);
  text-decoration:none;color:inherit}
.wk:hover{border-color:var(--accent)}
.wk .n{font-size:12px;font-weight:700;letter-spacing:.06em;color:#fff;background:var(--accent);
  border-radius:99px;padding:4px 0;text-align:center;height:fit-content}
.wk .n.ctx{background:var(--surface-1);color:var(--accent-deep);border:1px solid var(--accent)}
.wk h3{margin:0 0 3px;font-size:17px}
.wk .ch{font-size:12.5px;color:var(--muted);font-variant-numeric:tabular-nums;margin-bottom:6px}
.wk .st{font-size:14.5px;color:var(--ink-2);margin:0}

.tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.tool{background:var(--surface-1);border:1px solid var(--border);border-radius:12px;padding:18px;
  box-shadow:var(--shadow);text-decoration:none;color:inherit;display:block}
.tool:hover{border-color:var(--accent)}
.tool b{display:block;font-size:16px;margin-bottom:5px}
.tool span{font-size:14px;color:var(--ink-2)}

.card{background:var(--surface-1);border:1px solid var(--border);border-radius:12px;
  padding:20px 22px;box-shadow:var(--shadow);margin-bottom:14px}
table{width:100%;border-collapse:collapse;font-size:15px}
th,td{padding:10px 14px;border-bottom:1px solid var(--grid);text-align:left;vertical-align:top}
thead th{background:var(--accent);color:#fff;font-size:13px;font-weight:650;border-bottom:0}
tbody tr:last-child td{border-bottom:0}
tbody tr:nth-child(even){background:var(--plane)}
.tw{font-size:13.5px;color:var(--ink-2);display:block;margin-top:3px}
ul.tight{margin:0 0 6px;padding-left:20px}
ul.tight li{margin-bottom:7px}
.trap{border-left:3px solid var(--warning);padding-left:14px;margin:0 0 12px;color:var(--ink-2);font-size:15px}
.tt{display:inline-flex;align-items:center;gap:8px;font-size:13.5px;color:var(--ink-2);
  border:1px solid var(--border);border-radius:99px;padding:4px 12px;margin:0 6px 6px 0;
  text-decoration:none;background:var(--surface-1)}
.tt:hover{border-color:var(--accent);color:var(--ink)}
.cta{display:flex;flex-wrap:wrap;gap:10px;margin:22px 0 6px}
.btn{display:inline-block;text-decoration:none;border-radius:9px;padding:11px 18px;font-size:15px;
  border:1px solid var(--border);background:var(--surface-1);color:var(--ink)}
.btn:hover{border-color:var(--axis)}
.btn.pri{background:var(--accent);border-color:var(--accent);color:#fff;font-weight:600}
.btn.pri:hover{background:var(--accent-deep);border-color:var(--accent-deep)}
.pager{display:flex;justify-content:space-between;gap:12px;margin-top:34px;
  padding-top:20px;border-top:1px solid var(--grid);font-size:15px}
.pager a{text-decoration:none}
footer{margin-top:44px;padding-top:20px;border-top:1px solid var(--grid);
  font-size:13.5px;color:var(--muted)}
@media (max-width:640px){ h1{font-size:27px} .wk{grid-template-columns:52px 1fr;gap:12px} }
@media print{ nav.bar,.cta,.pager{display:none} body{background:#fff} }`;

const FOOT = `<footer>${esc(course.note)}<br>
  <strong>CBAP®</strong>, <strong>BABOK®</strong> and <strong>IIBA®</strong> are registered trade marks of the
  International Institute of Business Analysis. This site is not affiliated with, endorsed by, or sponsored by IIBA®.
</footer>`;

const nav = here => `<nav class="bar"><div class="wrap">
  <a class="home" href="index.html">BABOK® v3 in twelve weeks</a>
  <a href="index.html#weeks"${here === "weeks" ? ' style="color:var(--ink)"' : ""}>Weeks</a>
  <a href="simulator.html">Practice</a>
  <a href="index.html#tools">Tools</a>
  <span class="sp"></span>
  <a href="#" onclick="document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';return false">◐</a>
</div></nav>`;

const page = (title, body, desc) => `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc || "")}">
<link rel="stylesheet" href="site.css">
</head>
<body>
${body}
</body>
</html>`;

/* ---------- home ---------- */
function home() {
  const weeks = course.weeks.map(w => {
    const ctx = w.kas.some(k => k === 2 || k === 11);
    return `<a class="wk" href="week-${pad2(w.week)}.html">
      <div class="n${ctx ? " ctx" : ""}">WK ${w.week}</div>
      <div>
        <h3>${esc(w.title)}</h3>
        <div class="ch">${esc(w.chapter)}${ctx ? " · outside the blueprint weighting" : ""}</div>
        <p class="st">${esc(w.strap)}</p>
      </div></a>`;
  }).join("");

  const body = `${nav("weeks")}
<div class="wrap">
  <h1>${esc(course.name)}</h1>
  <p class="lede">${esc(course.strap)}</p>
  ${course.intro.map(p => `<p class="sub">${esc(p)}</p>`).join("")}

  <h2 id="weeks">The twelve weeks</h2>
  <div class="weeks">${weeks}</div>

  <h2 id="tools">The tools</h2>
  <div class="tools">
    <a class="tool" href="simulator.html"><b>Practice questions</b>
      <span>A full 120-item timed sitting, a coached study session over any knowledge areas, or a week from the plan. 208 original items.</span></a>
    <a class="tool" href="simulator.html#technique"><b>Technique lab</b>
      <span>All 50 BABOK techniques: what each is for, what it is confused with, and the artefact it produces — drawn, not described.</span></a>
    <a class="tool" href="CBAP-Technique-Templates.zip"><b>Templates</b>
      <span>Every technique as PowerPoint, Word and Excel — a worked example and a blank template each, 300 files.</span></a>
    <a class="tool" href="simulator.html#story"><b>One scenario, end to end</b>
      <span>A single engagement worked through sixteen techniques, each step taking what the one before it produced.</span></a>
  </div>

  ${FOOT}
</div>`;
  return page(course.name, body, course.strap);
}

/* ---------- a week ---------- */
function weekPage(w, prev, next) {
  const tasks = w.tasks.length ? `
    <h2>Tasks in scope</h2>
    <table><thead><tr><th style="width:74px">Task</th><th>What it is for, and what to watch</th></tr></thead>
    <tbody>${w.tasks.map(t => `<tr>
      <td><b>${esc(t.n)}</b></td>
      <td><b>${esc(t.name)}</b><br>${esc(t.what)}<span class="tw"><b>Watch:</b> ${esc(t.watch)}</span></td>
    </tr>`).join("")}</tbody></table>` : "";

  const concepts = w.concepts.length ? `
    <h2>Be precise about these</h2>
    <table><thead><tr><th style="width:30%">Term</th><th>What it means</th></tr></thead>
    <tbody>${w.concepts.map(c => `<tr><td><b>${esc(c.term)}</b></td><td>${esc(c.meaning)}</td></tr>`).join("")}</tbody></table>` : "";

  const techniques = w.techniques.length ? `
    <h2>Techniques for this session</h2>
    <p class="sub">Each links to its blank template. The worked example for every one is in the technique lab.</p>
    <div>${w.techniques.map(k => {
      const t = byKey[k];
      return t ? `<a class="tt" href="templates/${fileBase(t)}-template.pptx" download>${esc(k)} ↓</a>` : "";
    }).join("")}</div>` : "";

  const areas = w.kas.map(k => KANAMES[k]).filter(Boolean).join(" · ");

  const body = `${nav()}
<div class="wrap">
  <p class="muted">Week ${w.week} of 12 · ${esc(w.chapter)}${areas ? " · " + esc(areas) : ""}</p>
  <h1>${esc(w.title)}</h1>
  <p class="lede">${esc(w.strap)}</p>

  ${w.overview.map(p => `<p>${esc(p)}</p>`).join("")}

  <div class="cta">
    <a class="btn pri" href="simulator.html#week=${w.week}">Drill week ${w.week} — ${w.len} questions</a>
    <a class="btn" href="simulator.html#technique">Technique lab</a>
  </div>

  ${tasks}
  ${concepts}
  ${techniques}

  <h2>What the exam does with this</h2>
  ${w.traps.map(t => `<p class="trap">${esc(t)}</p>`).join("")}

  <h2>Before the session</h2>
  <ul class="tight">${w.prepare.map(p => `<li>${esc(p)}</li>`).join("")}</ul>

  <h2>Worth discussing</h2>
  <ul class="tight">${w.discuss.map(p => `<li>${esc(p)}</li>`).join("")}</ul>

  <div class="cta">
    <a class="btn pri" href="simulator.html#week=${w.week}">Drill this week</a>
  </div>

  <div class="pager">
    <span>${prev ? `<a href="week-${pad2(prev.week)}.html">← Week ${prev.week} · ${esc(prev.title)}</a>` : `<a href="index.html">← All weeks</a>`}</span>
    <span>${next ? `<a href="week-${pad2(next.week)}.html">Week ${next.week} · ${esc(next.title)} →</a>` : `<a href="simulator.html">Practice →</a>`}</span>
  </div>

  ${FOOT}
</div>`;
  return page(`Week ${w.week} · ${w.title}`, body, w.strap);
}

/* ---------- write ---------- */
fs.writeFileSync(path.join(dir, "site.css"), CSS);
fs.writeFileSync(path.join(dir, "index.html"), home());
course.weeks.forEach((w, i) => {
  fs.writeFileSync(path.join(dir, `week-${pad2(w.week)}.html`),
    weekPage(w, course.weeks[i - 1], course.weeks[i + 1]));
});

const words = course.weeks.reduce((s, w) =>
  s + JSON.stringify(w).split(/\s+/).length, 0);
console.log("site written");
console.log("  index.html + " + course.weeks.length + " week pages + site.css");
console.log("  course words   ~" + words);
console.log("  tasks          " + course.weeks.reduce((s, w) => s + w.tasks.length, 0));
console.log("  concepts       " + course.weeks.reduce((s, w) => s + w.concepts.length, 0));
console.log("  traps          " + course.weeks.reduce((s, w) => s + w.traps.length, 0));
