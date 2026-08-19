/* Minimal OOXML PowerPoint writer.
 *
 * There is no Python on the build box, so rather than reach for python-pptx this
 * emits the .pptx package directly: a ZIP of XML parts. Everything it draws is a
 * real PowerPoint shape or table, so the output is editable rather than a picture.
 */
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

/* ---------- zip ---------- */
const CRC = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

/* A zero DOS date decodes to day 0 of month 0, which strict OPC readers reject. */
const DOS_TIME = 0;                                   // 00:00:00
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1; // 2026-01-01

function zip(files) {
  const local = [], central = [];
  let offset = 0;
  for (const f of files) {
    const raw = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data, "utf8");
    const def = zlib.deflateRawSync(raw, { level: 9 });
    const name = Buffer.from(f.name, "utf8");
    const crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8); lh.writeUInt16LE(DOS_TIME, 10); lh.writeUInt16LE(DOS_DATE, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(def.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    local.push(lh, name, def);

    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(DOS_TIME, 12); ch.writeUInt16LE(DOS_DATE, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(def.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(name.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, name);
    offset += lh.length + name.length + def.length;
  }
  const cdOffset = offset;
  const cdSize = central.reduce((s, b) => s + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8); eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdSize, 12); eocd.writeUInt32LE(cdOffset, 16); eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...local, ...central, eocd]);
}

/* ---------- units and text ---------- */
const EMU = 914400;                    // per inch
const inch = n => Math.round(n * EMU);
const pt = n => Math.round(n * 100);   // font sizes are hundredths of a point
const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");

let SEQ = 1;
const nextId = () => ++SEQ;
const resetIds = () => { SEQ = 1; };

/* A run of paragraphs inside a shape. `paras` is [{text, size, bold, color, align, space}] */
function txBody(paras, opts = {}) {
  const o = Object.assign({ anchor: "ctr", wrap: true, ins: 0.06, autofit: false }, opts);
  const list = (Array.isArray(paras) ? paras : [paras]);
  if (!list.length) list.push({ text: "" });
  const body = list.map(p => {
    const runs = (p.text === "" || p.text == null)
      ? `<a:endParaRPr lang="en-AU" sz="${pt(p.size || 11)}"/>`
      : `<a:r><a:rPr lang="en-AU" sz="${pt(p.size || 11)}"${p.bold ? ' b="1"' : ""}${p.italic ? ' i="1"' : ""} dirty="0">` +
        `<a:solidFill><a:srgbClr val="${p.color || "0B0B0B"}"/></a:solidFill>` +
        `<a:latin typeface="Aptos"/></a:rPr><a:t>${esc(p.text)}</a:t></a:r>`;
    const pPr = p.space
      ? `<a:pPr algn="${p.align || "l"}"><a:spcBef><a:spcPts val="${pt(p.space)}"/></a:spcBef></a:pPr>`
      : `<a:pPr algn="${p.align || "l"}"/>`;
    return `<a:p>${pPr}${runs}</a:p>`;
  }).join("");
  return `<p:txBody><a:bodyPr wrap="${o.wrap ? "square" : "none"}" anchor="${o.anchor}" ` +
    `lIns="${inch(o.ins)}" rIns="${inch(o.ins)}" tIns="${inch(0.03)}" bIns="${inch(0.03)}">` +
    `${o.autofit ? "<a:normAutofit/>" : ""}</a:bodyPr><a:lstStyle/>${body}</p:txBody>`;
}

/* ---------- shapes ---------- */
/* geom: rect | roundRect | ellipse | flowChartMagneticDrum | line | chevron ... */
function shape(o) {
  const id = nextId();
  const fill = o.fill === "none" ? "<a:noFill/>" : `<a:solidFill><a:srgbClr val="${o.fill || "FFFFFF"}"/></a:solidFill>`;
  const line = o.line === "none"
    ? "<a:ln><a:noFill/></a:ln>"
    : `<a:ln w="${o.lineW || 9525}"${o.cap ? ` cap="${o.cap}"` : ""}><a:solidFill><a:srgbClr val="${o.line || "C3C2B7"}"/></a:solidFill>` +
      `${o.dash ? `<a:prstDash val="${o.dash}"/>` : ""}</a:ln>`;
  const adj = o.adj ? `<a:avLst><a:gd name="adj" fmla="val ${o.adj}"/></a:avLst>` : "<a:avLst/>";
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${esc(o.name || "shape" + id)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>` +
    `<p:spPr><a:xfrm><a:off x="${inch(o.x)}" y="${inch(o.y)}"/><a:ext cx="${inch(o.cx)}" cy="${inch(o.cy)}"/></a:xfrm>` +
    `<a:prstGeom prst="${o.geom || "rect"}">${adj}</a:prstGeom>${fill}${line}</p:spPr>` +
    txBody(o.paras || [], o.text || {}) + `</p:sp>`;
}

/* Straight connector. Arrowheads via tailEnd. */
function connector(o) {
  const id = nextId();
  const x1 = o.x1, y1 = o.y1, x2 = o.x2, y2 = o.y2;
  const x = Math.min(x1, x2), y = Math.min(y1, y2);
  const cx = Math.abs(x2 - x1), cy = Math.abs(y2 - y1);
  const flipH = x2 < x1 ? ' flipH="1"' : "";
  const flipV = y2 < y1 ? ' flipV="1"' : "";
  return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="conn${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr>` +
    `<p:spPr><a:xfrm${flipH}${flipV}><a:off x="${inch(x)}" y="${inch(y)}"/>` +
    `<a:ext cx="${Math.max(inch(cx), 1)}" cy="${Math.max(inch(cy), 1)}"/></a:xfrm>` +
    `<a:prstGeom prst="line"><a:avLst/></a:prstGeom>` +
    `<a:ln w="${o.w || 12700}"><a:solidFill><a:srgbClr val="${o.color || "C3C2B7"}"/></a:solidFill>` +
    `${o.dash ? `<a:prstDash val="${o.dash}"/>` : ""}` +
    `${o.arrow ? '<a:tailEnd type="triangle" w="med" len="med"/>' : ""}</a:ln></p:spPr></p:cxnSp>`;
}

/* Native PowerPoint table — the most useful output for the 22 table techniques. */
function table(o) {
  const id = nextId();
  const colW = o.colW.map(w => `<a:gridCol w="${inch(w)}"/>`).join("");
  const rowH = o.rowH || 0.28;
  const rows = o.rows.map((r, ri) => {
    const head = ri === 0 && o.header;
    const cells = r.map(c => {
      const txt = typeof c === "object" ? c.text : c;
      const al = typeof c === "object" && c.align ? c.align : "l";
      return `<a:tc>${txBody([{ text: txt, size: o.size || 9, bold: head, align: al,
        color: head ? "FFFFFF" : "0B0B0B" }], { anchor: "ctr", ins: 0.07 }).replace(/^<p:txBody>/, "<a:txBody>").replace(/<\/p:txBody>$/, "</a:txBody>")}` +
        `<a:tcPr marL="${inch(0.06)}" marR="${inch(0.06)}" marT="${inch(0.03)}" marB="${inch(0.03)}" anchor="ctr">` +
        `<a:lnL w="6350"><a:solidFill><a:srgbClr val="D9D8D0"/></a:solidFill></a:lnL>` +
        `<a:lnR w="6350"><a:solidFill><a:srgbClr val="D9D8D0"/></a:solidFill></a:lnR>` +
        `<a:lnT w="6350"><a:solidFill><a:srgbClr val="D9D8D0"/></a:solidFill></a:lnT>` +
        `<a:lnB w="6350"><a:solidFill><a:srgbClr val="D9D8D0"/></a:solidFill></a:lnB>` +
        `<a:solidFill><a:srgbClr val="${head ? (o.headFill || "2A78D6") : (ri % 2 ? "FFFFFF" : "FAFAF8")}"/></a:solidFill></a:tcPr></a:tc>`;
    }).join("");
    return `<a:tr h="${inch(head ? rowH : rowH)}">${cells}</a:tr>`;
  }).join("");
  return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="table${id}"/>` +
    `<p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>` +
    `<p:xfrm><a:off x="${inch(o.x)}" y="${inch(o.y)}"/><a:ext cx="${inch(o.colW.reduce((a, b) => a + b, 0))}" cy="${inch(rowH * o.rows.length)}"/></p:xfrm>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">` +
    `<a:tbl><a:tblPr firstRow="${o.header ? 1 : 0}" bandRow="1"/><a:tblGrid>${colW}</a:tblGrid>${rows}</a:tbl>` +
    `</a:graphicData></a:graphic></p:graphicFrame>`;
}

/* ---------- package ----------
   The chassis in pptx-template/ (master, layouts, theme, presProps, viewProps,
   tableStyles) is a known-good one produced by PowerPoint itself. Hand-authoring
   those parts is where a home-made .pptx usually goes wrong, so this only
   generates the slides, the presentation part and the package plumbing. */

const CT = {
  slideMaster: "application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml",
  slideLayout: "application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml",
  theme:       "application/vnd.openxmlformats-officedocument.theme+xml",
  presProps:   "application/vnd.openxmlformats-officedocument.presentationml.presProps+xml",
  viewProps:   "application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml",
  tableStyles: "application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"
};

function walk(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full, base) : [path.relative(base, full).split(path.sep).join("/")];
  });
}

function slideXml(shapes) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function build(slides, opts = {}) {
  const tpl = path.join(__dirname, "pptx-template");
  if (!fs.existsSync(tpl)) throw new Error("pptx-template/ is missing - it holds the PowerPoint chassis");
  const files = [];
  // Anything this function regenerates must not also be copied, or the zip
  // ends up with two entries of the same name and PowerPoint refuses the file.
  const GENERATED = ["[Content_Types].xml", "ppt/presentation.xml", "_rels/.rels",
    "ppt/_rels/presentation.xml.rels", "docProps/core.xml", "docProps/app.xml"];
  const chassis = walk(tpl).filter(f => !GENERATED.includes(f));
  chassis.forEach(f => files.push({ name: f, data: fs.readFileSync(path.join(tpl, f)) }));

  const layouts = chassis.filter(f => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(f));
  const n = slides.length;
  const slideRid = i => `rId${10 + i}`;

  // presentation.xml - keep PowerPoint defaults, swap in our slide list
  let pres = fs.readFileSync(path.join(tpl, "ppt/presentation.xml"), "utf8");
  pres = pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
    `<p:sldIdLst>${slides.map((s, i) => `<p:sldId id="${256 + i}" r:id="${slideRid(i)}"/>`).join("")}</p:sldIdLst>`);
  files.push({ name: "ppt/presentation.xml", data: pres });

  const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  files.push({ name: "ppt/_rels/presentation.xml.rels", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${REL}/slideMaster" Target="slideMasters/slideMaster1.xml"/>` +
    `<Relationship Id="rId2" Type="${REL}/presProps" Target="presProps.xml"/>` +
    `<Relationship Id="rId3" Type="${REL}/viewProps" Target="viewProps.xml"/>` +
    `<Relationship Id="rId4" Type="${REL}/theme" Target="theme/theme1.xml"/>` +
    `<Relationship Id="rId5" Type="${REL}/tableStyles" Target="tableStyles.xml"/>` +
    slides.map((s, i) => `<Relationship Id="${slideRid(i)}" Type="${REL}/slide" Target="slides/slide${i + 1}.xml"/>`).join("") +
    `</Relationships>` });

  slides.forEach((s, i) => {
    files.push({ name: `ppt/slides/slide${i + 1}.xml`, data: slideXml(s.shapes) });
    files.push({ name: `ppt/slides/_rels/slide${i + 1}.xml.rels`, data:
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout7.xml"/></Relationships>` });
  });

  files.push({ name: "_rels/.rels", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/></Relationships>` });

  files.push({ name: "docProps/core.xml", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(opts.title || "CBAP Technique Pack")}</dc:title><dc:creator>${esc(opts.creator || "Business Analyst Services")}</dc:creator><cp:lastModifiedBy>${esc(opts.creator || "Business Analyst Services")}</cp:lastModifiedBy></cp:coreProperties>` });

  files.push({ name: "docProps/app.xml", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>Microsoft Office PowerPoint</Application><Slides>${n}</Slides></Properties>` });

  files.push({ name: "[Content_Types].xml", data:
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>` +
    `<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="${CT.slideMaster}"/>` +
    layouts.map(l => `<Override PartName="/${l}" ContentType="${CT.slideLayout}"/>`).join("") +
    `<Override PartName="/ppt/theme/theme1.xml" ContentType="${CT.theme}"/>` +
    `<Override PartName="/ppt/presProps.xml" ContentType="${CT.presProps}"/>` +
    `<Override PartName="/ppt/viewProps.xml" ContentType="${CT.viewProps}"/>` +
    `<Override PartName="/ppt/tableStyles.xml" ContentType="${CT.tableStyles}"/>` +
    slides.map((s, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join("") +
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` });

  return zip(files);
}

module.exports = { build, shape, connector, table, txBody, inch, pt, esc, nextId, resetIds, EMU };
