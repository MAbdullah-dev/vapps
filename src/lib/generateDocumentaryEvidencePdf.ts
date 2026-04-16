import jsPDF from "jspdf";

/** All fields needed for the single-page documentary evidence PDF template. */
export type EvidencePdfData = {
  recordId: string;
  reference: string;
  formTitle: string;
  /** HTML or plain text from the document editor — `<table>` is rendered as a grid in the PDF; other HTML is plain text. */
  capturedData: string;
  verifierName: string;
  verifierUserId: string;
  verificationComments: string;
  archiveLocation: string;
  retentionPeriod: string;
  archiveDate: string;
  retentionExpiry: string;
  /** Optional — filled when available from org / template / capture */
  companyName?: string;
  siteLabel?: string;
  processLabel?: string;
  standardLabel?: string;
  clauseLabel?: string;
  subClauseLabel?: string;
  lotBatchSerial?: string;
  shiftLabel?: string;
  /** e.g. clause ref display */
  stdClauseRef?: string;
  /** Morning / Evening (or "—") */
  sessionPeriod?: string;
  /** Capture operator (support) */
  captureByName?: string;
  captureByUserId?: string;
  /** Formatted labels for footer */
  captureDateLabel?: string;
  captureTimeLabel?: string;
  verifyDateLabel?: string;
  verifyTimeLabel?: string;
  /** Records archive year/month display */
  recordsArchiveYm?: string;
  systemDateLabel?: string;
  systemTimeLabel?: string;
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 14;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const ORANGE: [number, number, number] = [234, 88, 12];
const DARK = "#111827";
const MUTED = "#6B7280";
const LINE = "#D1D5DB";
const BODY_FILL = "#FAFAFA";
const BODY_BORDER = "#E5E7EB";

function d(v: string | undefined, fallback = "—"): string {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : fallback;
}

/** Strip rich-text HTML to readable plain text for jsPDF (no table structure). */
function htmlToPlainText(html: string): string {
  if (!html?.trim()) return "";
  let t = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/tr>/gi, "\n");
  t = t.replace(/<[^>]+>/g, "");
  t = t
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
  return t
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

type BodySegment =
  | { type: "text"; text: string }
  | { type: "table"; rows: string[][] };

function isEditorWatermarkNoise(s: string): boolean {
  const t = s.toLowerCase();
  return (
    t.includes("powered by froala") ||
    t.includes("powered by tiptap") ||
    t.includes("trial license") ||
    t.includes("purchase a license") ||
    t.includes("pricing page") ||
    t.includes("contact sales")
  );
}

function cleanCellText(s: string | null | undefined): string {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Read `<table>` rows using the DOM API so `<td>` / `<th>` boundaries are preserved. */
function extractTableRowsFromElement(table: Element): string[][] {
  const htmlTable = table as HTMLTableElement;
  const rows: string[][] = [];
  if (typeof htmlTable.rows !== "undefined") {
    for (let i = 0; i < htmlTable.rows.length; i++) {
      const row = htmlTable.rows[i];
      const cells: string[] = [];
      for (let j = 0; j < row.cells.length; j++) {
        cells.push(cleanCellText(row.cells[j].textContent));
      }
      if (cells.length) rows.push(cells);
    }
    return rows;
  }
  table.querySelectorAll("tr").forEach((tr) => {
    const cells: string[] = [];
    tr.querySelectorAll("th, td").forEach((cell) => {
      cells.push(cleanCellText(cell.textContent));
    });
    if (cells.length) rows.push(cells);
  });
  return rows;
}

/** Split captured HTML into ordered text + table blocks (tables keep grid for PDF). */
function segmentsFromCapturedHtml(html: string): BodySegment[] {
  if (!html?.trim()) return [{ type: "text", text: "" }];
  if (typeof DOMParser === "undefined") {
    return [{ type: "text", text: htmlToPlainText(html) }];
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="pdf-capture-root">${html}</div>`, "text/html");
  const root = doc.getElementById("pdf-capture-root");
  if (!root) return [{ type: "text", text: htmlToPlainText(html) }];

  const raw: BodySegment[] = [];

  function appendTextChunk(chunk: string) {
    const t = cleanCellText(chunk);
    if (!t || isEditorWatermarkNoise(t)) return;
    const last = raw[raw.length - 1];
    if (last?.type === "text") {
      last.text = `${last.text}\n${t}`.trim();
    } else {
      raw.push({ type: "text", text: t });
    }
  }

  function walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      appendTextChunk(node.textContent || "");
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName;
    if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return;
    if (tag === "TABLE") {
      const rows = extractTableRowsFromElement(el);
      if (rows.length) raw.push({ type: "table", rows });
      return;
    }
    el.childNodes.forEach((c) => walk(c));
  }

  root.childNodes.forEach((c) => walk(c));

  const merged: BodySegment[] = [];
  for (const seg of raw) {
    if (seg.type === "text" && !seg.text.trim()) continue;
    if (seg.type === "table" && !seg.rows.length) continue;
    merged.push(seg);
  }
  if (!merged.length) {
    const fallback = htmlToPlainText(html).trim() || "—";
    return [{ type: "text", text: fallback }];
  }
  return merged;
}

/** Draw a bordered table; returns Y just below the table. */
function drawPdfTable(
  doc: jsPDF,
  x: number,
  yTop: number,
  totalWidth: number,
  rows: string[][],
  yMax: number
): number {
  if (!rows.length) return yTop;
  const colCount = Math.max(1, ...rows.map((r) => r.length));
  const colW = totalWidth / colCount;
  const padX = 1.8;
  const padY = 1.6;
  const lineH = 3.35;
  let y = yTop;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(DARK);

  for (let ri = 0; ri < rows.length; ri++) {
    const row = [...rows[ri]];
    while (row.length < colCount) row.push("");
    const cellLineBlocks = row.map((cell) => {
      const t = cell.length ? cell : " ";
      return doc.splitTextToSize(t, colW - padX * 2) as string[];
    });
    const linesInRow = Math.max(1, ...cellLineBlocks.map((b) => b.length));
    const rowH = linesInRow * lineH + padY * 2;

    if (y + rowH > yMax) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(MUTED);
      doc.text("… (table continues beyond this page — export raw record for full data)", x, y + 3);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(DARK);
      return y + 6;
    }

    doc.setDrawColor(40);
    doc.setLineWidth(0.2);
    for (let ci = 0; ci < colCount; ci++) {
      const cx = x + ci * colW;
      doc.rect(cx, y, colW, rowH);
      let ty = y + padY + lineH * 0.9;
      for (const line of cellLineBlocks[ci]) {
        doc.text(line, cx + padX, ty);
        ty += lineH;
      }
    }
    y += rowH;
  }
  return y;
}

function fitTextLines(
  doc: jsPDF,
  text: string,
  maxWidthMm: number,
  maxLines: number,
  fontSize: number
): string[] {
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, maxWidthMm) as string[];
  if (lines.length <= maxLines) return lines;
  const out = lines.slice(0, maxLines);
  const last = String(out[maxLines - 1] ?? "");
  const shortened = last.length > 24 ? `${last.slice(0, 24)}…` : `${last}…`;
  out[maxLines - 1] = shortened;
  return out;
}

function drawRule(doc: jsPDF, y: number) {
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.35);
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
}

function drawCheckSquare(doc: jsPDF, x: number, y: number, filled: boolean) {
  const s = 2.8;
  doc.setDrawColor(90);
  doc.setLineWidth(0.25);
  doc.rect(x, y - s + 0.8, s, s);
  if (filled) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(40);
    doc.text("✓", x + 0.55, y - 0.15);
  }
}

export function generateDocumentaryEvidencePdf(data: EvidencePdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const company = d(data.companyName, "Company Name");
  const ref = d(data.reference);
  const formTitle = d(data.formTitle, "Form / Blank Template Title");
  const site = d(data.siteLabel);
  const proc = d(data.processLabel);
  const std = d(data.standardLabel);
  const clause = d(data.clauseLabel);
  const sub = d(data.subClauseLabel);
  const lot = d(data.lotBatchSerial);
  const stdRef = d(data.stdClauseRef, "00");
  const session = d(data.sessionPeriod, "—");
  const shift = d(data.shiftLabel);
  const recArch = d(data.recordsArchiveYm, data.archiveDate || "—");
  const sysDate = d(data.systemDateLabel);
  const sysTime = d(data.systemTimeLabel);

  const capName = d(data.captureByName, "—");
  const capId = d(data.captureByUserId, "—");
  const capDate = d(data.captureDateLabel);
  const capTime = d(data.captureTimeLabel);

  const verName = d(data.verifierName);
  const verId = d(data.verifierUserId);
  const verDate = d(data.verifyDateLabel);
  const verTime = d(data.verifyTimeLabel);

  const bodySegments = segmentsFromCapturedHtml(data.capturedData);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultSysDate = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
  const defaultSysTime = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

  let y = 12;

  // ── Header: company + ref ──
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(company, MARGIN_X, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text(`Ref# ${ref}`, PAGE_W - MARGIN_X, y + 5, { align: "right" });

  y += 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.text("Form / Blank Template Title:", MARGIN_X, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(MUTED);
  doc.text(formTitle, MARGIN_X + 52, y);

  y += 7;
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED);
  const row2 = `| Site: ${site} | Process: ${proc} | Standard: ${std} | Clause: ${clause} | Subclause: ${sub} |`;
  const row2Lines = doc.splitTextToSize(row2, CONTENT_W) as string[];
  doc.text(row2Lines, MARGIN_X, y);
  y += Math.max(row2Lines.length * 3.6, 4);

  drawRule(doc, y + 1);
  y += 5;

  doc.setFontSize(7);
  const row3 = `Lot/Batch/Serial# ${lot} | Std Clause Ref#${stdRef} | ${session} | Shift: ${shift} | Records Archive: ${recArch} | System Date: ${d(sysDate, defaultSysDate)} | Time: ${d(sysTime, defaultSysTime)}`;
  const row3Lines = doc.splitTextToSize(row3, CONTENT_W) as string[];
  doc.text(row3Lines, MARGIN_X, y);
  y += row3Lines.length * 3.4 + 4;

  drawRule(doc, y);
  y += 6;

  // ── Main content (body) — single bounded region ──
  const bodyTop = y;
  const bodyBottomLimit = 198;
  const bodyH = Math.max(92, bodyBottomLimit - bodyTop);

  doc.setFillColor(BODY_FILL);
  doc.setDrawColor(BODY_BORDER);
  doc.setLineWidth(0.35);
  doc.roundedRect(MARGIN_X, bodyTop, CONTENT_W, bodyH, 1.2, 1.2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
  doc.text("Main content — documentary evidence", MARGIN_X + 4, bodyTop + 6);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor("#9CA3AF");
  doc.text("Captured record (read-only)", MARGIN_X + 4, bodyTop + 11);

  const innerX = MARGIN_X + 4;
  const innerW = CONTENT_W - 8;
  const textStartY = bodyTop + 17;
  const bottomLimit = bodyTop + bodyH - 4;
  const lineHeight = 4.1;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(DARK);

  let ty = textStartY;
  for (const seg of bodySegments) {
    if (ty >= bottomLimit) break;
    if (seg.type === "text") {
      const block = seg.text.trim() || "—";
      const remaining = bottomLimit - ty;
      const maxLines = Math.max(1, Math.floor(remaining / lineHeight));
      const lines = fitTextLines(doc, block, innerW, maxLines, 9);
      for (const line of lines) {
        if (ty >= bottomLimit) break;
        doc.text(line, innerX, ty);
        ty += lineHeight;
      }
    } else {
      ty = drawPdfTable(doc, innerX, ty, innerW, seg.rows, bottomLimit);
      ty += 3;
    }
  }

  y = bodyTop + bodyH + 8;

  // ── Footer: capture / verify (two clean rows; arrow hint between) ──
  drawRule(doc, y);
  y += 7;

  doc.setFontSize(8);
  doc.setTextColor(DARK);

  const footY1 = y;
  drawCheckSquare(doc, MARGIN_X, footY1, true);
  doc.setFont("helvetica", "normal");
  const capLine = `Capture By: ${capName}  ID#${capId}  Date: ${d(capDate, defaultSysDate)}${capTime ? `  Time: ${capTime}` : ""}`;
  const capParts = doc.splitTextToSize(capLine, CONTENT_W - 8) as string[];
  doc.text(capParts, MARGIN_X + 5, footY1);
  y = footY1 + Math.max(capParts.length * 4, 5) + 3;

  const footY2 = y;
  drawCheckSquare(doc, MARGIN_X, footY2, Boolean(data.verificationComments?.trim()));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(DARK);
  const verLine = `Verified By: ${verName}  ID#${verId}  Date: ${d(verDate, defaultSysDate)}${verTime ? `  Time: ${verTime}` : ""}`;
  const verParts = doc.splitTextToSize(verLine, CONTENT_W - 8) as string[];
  doc.text(verParts, MARGIN_X + 5, footY2);
  y = footY2 + Math.max(verParts.length * 4, 5) + 4;

  drawCheckSquare(doc, MARGIN_X, y, false);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(DARK);
  doc.text("DISCARD", MARGIN_X + 5, y);

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text("Comments (if any):", MARGIN_X, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(DARK);
  const comm = d(data.verificationComments, "—");
  const commLines = doc.splitTextToSize(comm, CONTENT_W - 8) as string[];
  doc.text(commLines, MARGIN_X, y);

  y += Math.max(commLines.length * 4.2, 5) + 6;

  doc.setFontSize(6.5);
  doc.setTextColor(MUTED);
  const note =
    "Note: The system record has been archived as a PDF document, which is identified by a unique ID e.g., Lot/Batch/Serial number. " +
    "This record has been assigned a specific retention period, after which it will be subject to disposal according to established procedures.";
  const noteLines = doc.splitTextToSize(note, CONTENT_W) as string[];
  doc.text(noteLines, MARGIN_X, y);

  y += noteLines.length * 3.2 + 5;

  // Archive strip (compact, bottom of page)
  doc.setDrawColor(LINE);
  doc.setLineWidth(0.25);
  doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(MUTED);
  doc.text(
    `Archive: ${d(data.archiveLocation, "Cloud")}  ·  Retention: ${d(data.retentionPeriod, "3 Years")}  ·  Expiry year: ${d(data.retentionExpiry)}  ·  ${data.recordId}`,
    MARGIN_X,
    y
  );

  // Single-page footer line
  doc.setFontSize(6.5);
  doc.text("Documentary evidence — single-page certificate", PAGE_W / 2, PAGE_H - 8, { align: "center" });

  return doc;
}
