/* Turns any exhibit into a head/rows grid.
 *
 * PowerPoint can draw a swimlane or a sequence diagram. Word and Excel cannot,
 * not usefully — an embedded picture is worse than useless because you cannot
 * edit it. So the diagram types are expressed as the grid that carries the same
 * information: a swimlane becomes lanes down and steps across, a sequence
 * becomes ordered messages, a state model becomes from/event/to with a
 * permitted column. That is editable, sortable and printable, which a picture
 * of a diagram is not.
 */

const TOTAL = /^(total|net|weighted total|expected monetary value|break-even|overall)\b/i;

function flattenTree(nodes, depth, out, levels) {
  nodes.forEach(n => {
    out.push([levels && levels[depth] ? levels[depth] : "Level " + (depth + 1),
      "    ".repeat(depth) + n.label, n.note || ""]);
    if (n.children) flattenTree(n.children, depth + 1, out, levels);
  });
  return out;
}

function toGrid(x) {
  const g = { title: x.title || "", note: x.note || "", head: [], rows: [], widths: null, totalAt: -1 };

  if (x.type === "table") {
    g.head = x.cols.slice();
    g.rows = x.rows.map(r => r.slice());
    if (g.rows.length && TOTAL.test(String(g.rows[g.rows.length - 1][0] || ""))) g.totalAt = g.rows.length - 1;
  }

  else if (x.type === "matrix") {
    g.head = [(x.yLabel ? x.yLabel + " \\ " : "") + (x.xLabel || ""), ...x.cols];
    g.rows = x.rows.map((r, ri) => [r, ...(x.cells[ri] || []).map(c => {
      if (!c) return "";
      const tag = c.tag ? c.tag.toUpperCase() + "\n" : "";
      return tag + (c.items || []).filter(Boolean).join("\n");
    })]);
  }

  else if (x.type === "canvas") {
    g.head = ["Block", "Content"];
    g.rows = x.panels.map(p => [p.label, (p.items || []).filter(Boolean).join("\n")]);
  }

  else if (x.type === "tree") {
    g.head = ["Level", "Item", "Note"];
    g.rows = flattenTree(x.nodes, 0, [], x.levels);
  }

  else if (x.type === "flow") {
    g.head = ["#", "Stage", "Step", "Detail"];
    g.rows = x.steps.map((s, i) => [String(i + 1), s.actor || "", s.label, s.note || ""]);
    (x.branches || []).forEach(b => g.rows.push(["", "exception", b.from, b.label]));
  }

  else if (x.type === "swimlane") {
    // Lanes down, steps across: the shape of the diagram, as a grid.
    g.head = ["Lane", ...x.steps.map((s, i) => "Step " + (i + 1))];
    g.rows = x.lanes.map((lane, li) =>
      [lane, ...x.steps.map(s => (s.lane === li ? s.label : ""))]);
    (x.flows || []).forEach(f => {
      const from = x.steps[f.from], to = x.steps[f.to];
      g.rows.push(["exception", ...x.steps.map((s, i) =>
        i === f.from ? (f.label || "") + " → step " + (f.to + 1) : "")]);
      void from; void to;
    });
  }

  else if (x.type === "usecase") {
    g.head = ["Actor", "Use case", "System"];
    const seen = new Set();
    (x.links || []).forEach(l => {
      const a = x.actors[l.actor], c = x.cases[l.case];
      if (!a || !c) return;
      seen.add(l.case);
      g.rows.push([a.name || "", c.label || "", x.system || ""]);
    });
    x.cases.forEach((c, i) => { if (!seen.has(i)) g.rows.push(["", c.label || "", x.system || ""]); });
    (x.rels || []).forEach(r => g.rows.push([
      "«" + (r.kind || "include") + "»",
      (x.cases[r.from] || {}).label + " → " + (x.cases[r.to] || {}).label, ""]));
  }

  else if (x.type === "state") {
    g.head = ["From", "Event", "To", "Permitted"];
    g.rows = (x.transitions || []).map(t => [
      (x.states[t.from] || {}).label || "",
      t.label || "",
      (x.states[t.to] || {}).label || "",
      t.illegal ? "NO — forbidden" : "yes"]);
    const terminals = x.states.filter(s => s.terminal).map(s => s.label);
    if (terminals.length) g.note = (g.note ? g.note + "  " : "") + "Terminal states: " + terminals.join(", ") + ".";
  }

  else if (x.type === "sequence") {
    g.head = ["#", "From", "To", "Message", "Call"];
    g.rows = (x.messages || []).map((m, i) => [
      String(i + 1), x.participants[m.from] || "", x.participants[m.to] || "",
      m.label || "", m.late ? "arrives late" : m.async ? "async" : "blocking"]);
  }

  else if (x.type === "dfd") {
    g.head = ["#", "Element", "Kind", "Sends to", "Data carried"];
    g.rows = x.nodes.map((n, i) => {
      const out = (x.flows || []).filter(f => f.from === i);
      return [String(i + 1), n.label, n.kind === "store" ? "data store" : n.kind,
        out.map(f => (x.nodes[f.to] || {}).label).join(", "),
        out.map(f => f.label || "").filter(Boolean).join(", ")];
    });
  }

  else if (x.type === "dashboard") {
    g.head = ["Measure", "Value", "Against"];
    (x.tiles || []).forEach(t => g.rows.push([t.label, String(t.value), t.delta || ""]));
    (x.bars || []).forEach(b => g.rows.push([b.label, String(b.value) + (b.max ? " of " + b.max : ""),
      b.note != null ? String(b.note) : ""]));
  }

  else {
    g.head = ["Item"];
    g.rows = [["(no grid representation for exhibit type " + x.type + ")"]];
  }

  // Column widths, in inches, proportional to the longest cell but bounded.
  const cols = g.head.length;
  const longest = g.head.map((h, i) =>
    Math.max(String(h).length, ...g.rows.map(r => String(r[i] == null ? "" : r[i]).length)));
  const raw = longest.map(n => Math.min(3.4, Math.max(0.9, n * 0.085 + 0.35)));
  const totalW = raw.reduce((a, b) => a + b, 0);
  const target = 11.4;                                   // landscape A4 minus margins
  g.widths = raw.map(w => +(w * target / Math.max(totalW, target)).toFixed(2));
  void cols;
  return g;
}

/* A blank grid with three rows wastes the page. Pad it out to something worth
   filling in, without inventing content. */
function padBlank(g, rows) {
  const empty = g.head.map(() => "");
  const allBlank = g.rows.every(r => r.every(c => String(c == null ? "" : c).trim() === ""));
  if (!allBlank || g.rows.length >= rows) return g;
  return Object.assign({}, g, {
    rows: g.rows.concat(Array.from({ length: rows - g.rows.length }, () => empty.slice()))
  });
}

module.exports = { toGrid, TOTAL, padBlank };
