/* Minimal .xlsx writer.
   Values are written as inline strings, so there is no shared-string table to
   keep in step. Styles are generated rather than inherited, so the header band
   matches the PowerPoint pack and the web app. */
const fs = require("fs");
const path = require("path");
const { zip, esc, chassis } = require("./ooxml.js");

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

/* Style indices used by callers. */
const S = { PLAIN: 0, HEAD: 1, CELL: 2, BAND: 3, TOTAL: 4, TITLE: 5, NOTE: 6, LABEL: 7, SUB: 8 };

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="6">
 <font><sz val="11"/><color rgb="FF0B0B0B"/><name val="Aptos Narrow"/></font>
 <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Aptos Narrow"/></font>
 <font><b/><sz val="11"/><color rgb="FF0B0B0B"/><name val="Aptos Narrow"/></font>
 <font><b/><sz val="15"/><color rgb="FF0B0B0B"/><name val="Aptos Narrow"/></font>
 <font><sz val="10"/><color rgb="FF6B6A66"/><name val="Aptos Narrow"/></font>
 <font><b/><sz val="9"/><color rgb="FF6B6A66"/><name val="Aptos Narrow"/></font>
</fonts>
<fills count="5">
 <fill><patternFill patternType="none"/></fill>
 <fill><patternFill patternType="gray125"/></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FF2A78D6"/><bgColor indexed="64"/></patternFill></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FFF7F7F5"/><bgColor indexed="64"/></patternFill></fill>
 <fill><patternFill patternType="solid"><fgColor rgb="FFE9F1FD"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
 <border><left/><right/><top/><bottom/><diagonal/></border>
 <border>
  <left style="thin"><color rgb="FFD9D8D0"/></left><right style="thin"><color rgb="FFD9D8D0"/></right>
  <top style="thin"><color rgb="FFD9D8D0"/></top><bottom style="thin"><color rgb="FFD9D8D0"/></bottom><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="9">
 <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
 <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
 <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
 <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
 <xf numFmtId="0" fontId="2" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
 <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
 <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
 <xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0" applyFont="1"/>
 <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function colName(i) {
  let s = "";
  for (i += 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
}

/* rows: [[{v, s, span} | string | null, ...], ...]  — null leaves the cell empty */
function sheetXml(sheet) {
  const merges = [];
  const rows = sheet.rows.map((cells, ri) => {
    const parts = [];
    let ci = 0;
    cells.forEach(cell => {
      if (cell === undefined) { ci++; return; }
      const o = (cell === null || typeof cell !== "object") ? { v: cell } : cell;
      const ref = colName(ci) + (ri + 1);
      const st = o.s === undefined ? S.PLAIN : o.s;
      const v = o.v == null ? "" : String(o.v);
      parts.push(v === ""
        ? `<c r="${ref}" s="${st}"/>`
        : `<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`);
      if (o.span && o.span > 1) {
        merges.push(`${ref}:${colName(ci + o.span - 1)}${ri + 1}`);
        for (let k = 1; k < o.span; k++) parts.push(`<c r="${colName(ci + k)}${ri + 1}" s="${st}"/>`);
        ci += o.span;
      } else ci++;
    });
    const h = sheet.heights && sheet.heights[ri];
    return `<row r="${ri + 1}"${h ? ` ht="${h}" customHeight="1"` : ""}>${parts.join("")}</row>`;
  }).join("");
  const cols = (sheet.widths || []).map((w, i) =>
    `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet ${NS}><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>` +
    `<sheetFormatPr defaultRowHeight="15"/>${cols ? `<cols>${cols}</cols>` : ""}<sheetData>${rows}</sheetData>` +
    (merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "") +
    `<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>` +
    `<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

/* sheets: [{name, rows, widths, heights}] */
function build(sheets, opts = {}) {
  const tpl = path.join(__dirname, "xlsx-template");
  const files = chassis(tpl, ["[Content_Types].xml"]);
  files.push({ name: "xl/styles.xml", data: STYLES });

  sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s) }));

  files.push({ name: "xl/workbook.xml", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook ${NS}><sheets>` +
    sheets.map((s, i) => `<sheet name="${esc(String(s.name).slice(0, 31).replace(/[\\\/\?\*\[\]:]/g, "-"))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
    `</sheets></workbook>` });

  files.push({ name: "xl/_rels/workbook.xml.rels", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("") +
    `<Relationship Id="rIdS" Type="${REL}/styles" Target="styles.xml"/>` +
    `<Relationship Id="rIdT" Type="${REL}/theme" Target="theme/theme1.xml"/></Relationships>` });

  files.push({ name: "_rels/.rels", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/></Relationships>` });

  files.push({ name: "docProps/core.xml", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(opts.title || "")}</dc:title><dc:creator>${esc(opts.creator || "Business Analyst Services")}</dc:creator><cp:lastModifiedBy>${esc(opts.creator || "Business Analyst Services")}</cp:lastModifiedBy></cp:coreProperties>` });
  files.push({ name: "docProps/app.xml", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>` });

  files.push({ name: "[Content_Types].xml", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `<Override PartName="/xl/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>` +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` });

  return zip(files);
}

module.exports = { build, S, colName };
