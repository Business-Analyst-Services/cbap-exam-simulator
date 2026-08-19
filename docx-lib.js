/* Minimal .docx writer.
   Formatting is applied directly to runs and cells rather than through named
   styles, so the output does not depend on the template's style set. Tables are
   real Word tables — the point of the Word format is that you type into it. */
const path = require("path");
const { zip, esc, chassis } = require("./ooxml.js");

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const TW = n => Math.round(n * 1440);          // inches to twips
const HP = n => Math.round(n * 2);             // points to half-points

const C = { ink: "0B0B0B", muted: "6B6A66", accent: "2A78D6", deep: "184F95",
  plane: "F7F7F5", sel: "E9F1FD", grid: "D9D8D0", white: "FFFFFF", amber: "FAB219" };

function run(t, o = {}) {
  return `<w:r><w:rPr>` +
    `<w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>` +
    (o.bold ? "<w:b/>" : "") + (o.italic ? "<w:i/>" : "") +
    (o.caps ? "<w:caps/>" : "") +
    `<w:color w:val="${o.color || C.ink}"/><w:sz w:val="${HP(o.size || 10)}"/>` +
    (o.spacing ? `<w:spacing w:val="${o.spacing}"/>` : "") +
    `</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
}

function para(text, o = {}) {
  const runs = Array.isArray(text) ? text.map(x => run(x.text, x)).join("") : run(text, o);
  const bdr = o.rule ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:color="${o.rule}"/></w:pBdr>` : "";
  const shd = o.shade ? `<w:shd w:val="clear" w:fill="${o.shade}"/>` : "";
  const ind = o.indent ? `<w:ind w:left="${TW(o.indent)}"/>` : "";
  return `<w:p><w:pPr>${shd}${bdr}${ind}` +
    `<w:spacing w:before="${(o.before || 0) * 20}" w:after="${(o.after == null ? 4 : o.after) * 20}" w:line="252" w:lineRule="auto"/>` +
    (o.align ? `<w:jc w:val="${o.align}"/>` : "") + `</w:pPr>` +
    (Array.isArray(text) ? runs : (text === "" ? "" : runs)) + `</w:p>`;
}

function bullet(text, o = {}) {
  return para([{ text: "•   ", color: C.accent, bold: true, size: o.size || 10 },
               { text, size: o.size || 10, color: o.color || C.ink }], { indent: 0.16, after: 2 });
}

/* rows: [[{text, bold, shade, color, span, align}| string]] */
function table(rows, o = {}) {
  const widths = o.widths || [];
  const grid = widths.map(w => `<w:gridCol w:w="${TW(w)}"/>`).join("");
  const body = rows.map((cells, ri) => {
    const tr = cells.map((c, ci) => {
      const cell = typeof c === "object" && c !== null ? c : { text: c };
      const head = ri === 0 && o.header;
      const shade = cell.shade || (head ? C.accent : (cell.total ? C.sel : (ri % 2 === 0 ? C.plane : C.white)));
      const color = cell.color || (head ? C.white : C.ink);
      return `<w:tc><w:tcPr>` +
        (widths[ci] ? `<w:tcW w:w="${TW(widths[ci])}" w:type="dxa"/>` : "") +
        (cell.span ? `<w:gridSpan w:val="${cell.span}"/>` : "") +
        `<w:shd w:val="clear" w:fill="${shade}"/>` +
        `<w:tcMar><w:top w:w="72" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="72" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tcMar>` +
        `<w:vAlign w:val="${head ? "center" : "top"}"/></w:tcPr>` +
        para(String(cell.text == null ? "" : cell.text),
          { bold: head || cell.bold || cell.total, color, size: o.size || 9.5, after: 0, align: cell.align }) +
        `</w:tc>`;
    }).join("");
    return `<w:tr>${ri === 0 && o.header ? "<w:trPr><w:tblHeader/></w:trPr>" : ""}${tr}</w:tr>`;
  }).join("");
  const line = `w:sz="6" w:space="0" w:color="${C.grid}"`;
  return `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/>` +
    `<w:tblBorders><w:top w:val="single" ${line}/><w:left w:val="single" ${line}/><w:bottom w:val="single" ${line}/>` +
    `<w:right w:val="single" ${line}/><w:insideH w:val="single" ${line}/><w:insideV w:val="single" ${line}/></w:tblBorders>` +
    `<w:tblLayout w:type="fixed"/></w:tblPr><w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>` + para("", { after: 6 });
}

/* Landscape A4 with modest margins — these documents are mostly grids. */
function build(bodyXml, opts = {}) {
  const tpl = path.join(__dirname, "docx-template");
  const files = chassis(tpl, ["[Content_Types].xml"]);

  const sect = `<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>` +
    `<w:pgMar w:top="${TW(0.6)}" w:right="${TW(0.6)}" w:bottom="${TW(0.6)}" w:left="${TW(0.6)}" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>`;

  files.push({ name: "word/document.xml", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${NS}><w:body>${bodyXml}${sect}</w:body></w:document>` });

  files.push({ name: "word/_rels/document.xml.rels", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${REL}/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId2" Type="${REL}/settings" Target="settings.xml"/>` +
    `<Relationship Id="rId3" Type="${REL}/webSettings" Target="webSettings.xml"/>` +
    `<Relationship Id="rId4" Type="${REL}/fontTable" Target="fontTable.xml"/>` +
    `<Relationship Id="rId5" Type="${REL}/theme" Target="theme/theme1.xml"/></Relationships>` });

  files.push({ name: "_rels/.rels", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/></Relationships>` });

  files.push({ name: "docProps/core.xml", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(opts.title || "")}</dc:title><dc:creator>${esc(opts.creator || "Business Analyst Services")}</dc:creator><cp:lastModifiedBy>${esc(opts.creator || "Business Analyst Services")}</cp:lastModifiedBy></cp:coreProperties>` });
  files.push({ name: "docProps/app.xml", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Word</Application></Properties>` });

  files.push({ name: "[Content_Types].xml", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
    `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
    `<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>` +
    `<Override PartName="/word/webSettings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.webSettings+xml"/>` +
    `<Override PartName="/word/fontTable.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml"/>` +
    `<Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` });

  return zip(files);
}

module.exports = { build, para, run, table, bullet, C, TW };
