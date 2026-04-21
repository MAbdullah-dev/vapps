import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/** Row shape for Master Document List PDF export (from dashboard). */
export type MasterDocumentPdfRow = {
  documentRef: string;
  title: string;
  /** P, F, or EXT */
  type: string;
  site: string;
  process: string;
  standard: string;
  clause: string;
  subclause: string;
  docNumber: string;
  version: string;
  planDate: string;
  releaseDate: string;
  workflowStatus: "draft" | "in_review" | "in_approval" | "approved";
  docPosition: string;
  docStatus: string;
  mainContent: string;
  createdByName: string;
  /** Intended reviewer (form) — used when DB reviewer not set yet */
  processOwnerName: string;
  approverName: string;
  /** Set when review step completed (DB) */
  reviewedByRecordName: string;
  /** Set when approval completed (DB) */
  approvedByRecordName: string;
  createdByUserId: string;
  processOwnerUserId: string;
  approverUserId: string;
  approvedByUserId: string;
  /** dd-mm-yyyy or empty */
  reviewedAtLabel: string;
  /** dd-mm-yyyy or empty */
  approvedAtLabel: string;
};

/** ~96 DPI: CSS px per PDF mm */
const MM_TO_PX = 3.779527559;

function pTypeDocument(docType: string): boolean {
  return String(docType ?? "").trim().toUpperCase() === "P";
}

function htmlToPlain(value: string): string {
  const s = String(value ?? "");
  if (!s.trim()) return "";
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .split("\n")
    .map((x) => x.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function sanitizeEditorHtml(html: string): string {
  let s = String(html ?? "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  s = s.replace(/<object[\s\S]*?<\/object>/gi, "");
  s = s.replace(/<embed[\s\S]*?>/gi, "");
  s = s.replace(/on\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  return s;
}

function nz(v: string, fallback = "na"): string {
  const t = String(v ?? "").trim();
  return t.length > 0 ? t : fallback;
}

function shortId(raw: string, docNumber: string): string {
  const s = String(raw ?? "").replace(/-/g, "").trim();
  if (s.length >= 6) return s.slice(0, 8);
  const d = String(docNumber ?? "").trim();
  if (d) return d.replace(/[^A-Za-z0-9]/g, "").slice(0, 8) || "na";
  return "na";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatNowDate(): string {
  const d = new Date();
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

function formatNowTime(): string {
  const d = new Date();
  return `${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`;
}

function recordsArchiveYm(releaseDate: string): string {
  const t = String(releaseDate ?? "").trim();
  if (!t || t === "-") return "—";
  const parts = t.split(/[./-]/).filter(Boolean);
  if (parts.length >= 3) {
    const dd = parts[0];
    const mm = parts[1];
    const yyyy = parts[2];
    return `${yyyy} / ${mm}`;
  }
  return t;
}

function drawPlainBody(
  pdf: jsPDF,
  bodyPlain: string,
  x: number,
  bodyInnerTop: number,
  bodyWidthMm: number,
  maxYFirstPage: number,
  maxYNextPage: number
): number {
  const lineHeight = 4.3;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(17, 24, 39);
  const contentLines = pdf.splitTextToSize(bodyPlain, bodyWidthMm) as string[];
  let cy = bodyInnerTop;
  let pageIndex = 1;
  for (const line of contentLines) {
    const limit = pageIndex === 1 ? maxYFirstPage : maxYNextPage;
    if (cy > limit) {
      pdf.addPage();
      pageIndex += 1;
      cy = 14;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(17, 24, 39);
    }
    pdf.text(line, x, cy);
    cy += lineHeight;
  }
  return cy;
}

/**
 * Rasterize Froala/HTML body so tables, bold, italic, lists match the editor (via browser layout + canvas).
 */
async function embedRichHtmlBody(
  pdf: jsPDF,
  html: string,
  xMm: number,
  yStartMm: number,
  widthMm: number,
  maxYFirstPage: number,
  maxYNextPage: number
): Promise<number> {
  const host = document.createElement("div");
  const widthPx = Math.max(280, Math.round(widthMm * MM_TO_PX));
  host.style.cssText = [
    "position:fixed",
    "left:-12000px",
    "top:0",
    `width:${widthPx}px`,
    "box-sizing:border-box",
    "padding:10px",
    "background:#ffffff",
    "color:#111827",
    "font-family:Helvetica,Arial,sans-serif",
    "font-size:13px",
    "line-height:1.5",
    "word-wrap:break-word",
    "overflow:visible",
  ].join(";");
  host.innerHTML = sanitizeEditorHtml(html);
  const sheet = document.createElement("style");
  sheet.textContent = [
    "table{border-collapse:collapse;width:100%;margin:10px 0;font-size:12px}",
    "th,td{border:1px solid #9ca3af;padding:5px 7px;vertical-align:top}",
    "th{font-weight:700;background:#f3f4f6}",
    "ul,ol{margin:0.5em 0 0.5em 1.25em;padding:0}",
    "strong,b{font-weight:700}",
    "em,i{font-style:italic}",
    "u{text-decoration:underline}",
    "p{margin:0.35em 0}",
    "h1,h2,h3{margin:0.5em 0 0.25em;font-weight:700}",
  ].join("");
  host.insertBefore(sheet, host.firstChild);
  document.body.appendChild(host);

  try {
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
    const canvas = await html2canvas(host, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const pxPerMm = canvas.width / widthMm;
    let srcYPx = 0;
    let cy = yStartMm;
    let pageIndex = 1;

    while (srcYPx < canvas.height - 0.5) {
      const limitY = pageIndex === 1 ? maxYFirstPage : maxYNextPage;
      let availMm = limitY - cy;
      if (availMm < 6) {
        pdf.addPage();
        pageIndex += 1;
        cy = 14;
        availMm = limitY - cy;
      }
      const slicePx = Math.min(
        Math.ceil(availMm * pxPerMm),
        canvas.height - srcYPx
      );
      if (slicePx <= 0) break;

      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = slicePx;
      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(canvas, 0, srcYPx, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
      const dataUrl = sliceCanvas.toDataURL("image/png");
      const sliceHmm = slicePx / pxPerMm;
      pdf.addImage(dataUrl, "PNG", xMm, cy, widthMm, sliceHmm, undefined, "FAST");

      srcYPx += slicePx;
      cy += sliceHmm;
    }

    return cy;
  } finally {
    host.remove();
  }
}

/**
 * Master document PDF: dynamic header/body/footer; body preserves Froala HTML (tables, bold, etc.) via html2canvas.
 * Falls back to plain text when there is no HTML or capture fails.
 */
export async function generateMasterDocumentListPdfAsync(
  docRow: MasterDocumentPdfRow,
  organizationName: string
): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const isP = pTypeDocument(docRow.type);
  const ref = docRow.documentRef || "-";
  const title = docRow.title || "-";
  const site = nz(docRow.site, "—");
  const process = nz(docRow.process, "—");
  const standard = nz(docRow.standard, "—");
  const clause = nz(docRow.clause, "—");
  const subClause = nz(docRow.subclause, "—");

  const wf = docRow.workflowStatus;
  const hasReviewed = wf === "in_approval" || wf === "approved";
  const hasApproved = wf === "approved";

  const createdName = nz(docRow.createdByName, "na");
  const createdId = shortId(docRow.createdByUserId, docRow.docNumber);
  const createdDate = nz(
    docRow.planDate !== "-" ? docRow.planDate : docRow.releaseDate,
    "na"
  );

  const reviewedName = hasReviewed
    ? nz(docRow.reviewedByRecordName || docRow.processOwnerName, "na")
    : "na";
  const reviewedId = hasReviewed ? shortId(docRow.processOwnerUserId, docRow.docNumber) : "na";
  const reviewedDate = hasReviewed ? nz(docRow.reviewedAtLabel, "na") : "na";

  const approvedName = hasApproved
    ? nz(docRow.approvedByRecordName || docRow.approverName, "na")
    : "na";
  const approvedId = hasApproved
    ? shortId(docRow.approvedByUserId || docRow.approverUserId, docRow.docNumber)
    : "na";
  const approvedDate = hasApproved ? nz(docRow.approvedAtLabel, "na") : "na";

  const captureName = createdName;
  const captureId = createdId;
  const captureDate = createdDate;

  const verifyName = hasApproved
    ? nz(docRow.approvedByRecordName || docRow.approverName, "na")
    : "na";
  const verifyId = hasApproved
    ? shortId(docRow.approvedByUserId || docRow.approverUserId, docRow.docNumber)
    : "na";
  const verifyDate = hasApproved ? nz(docRow.approvedAtLabel, "na") : "na";

  const commentsText = `Workflow: ${docRow.docPosition} (${docRow.docStatus})`;
  const rawMain = String(docRow.mainContent ?? "").trim();
  const bodyPlain =
    htmlToPlain(rawMain).trim() || (title !== "-" ? title : "—");

  const M = 7;
  const PAGE_W = 210;
  const TEXT_W = PAGE_W - M * 2;
  const bodyX = M + 4;
  const bodyWidthMm = TEXT_W - 8;
  const maxYFirstPage = 248;
  const maxYNextPage = 268;

  let y = 10;

  pdf.setFillColor(245, 245, 245);
  pdf.rect(M, y, PAGE_W - 2 * M, 16, "F");
  pdf.setDrawColor(180);
  pdf.setLineWidth(0.3);
  pdf.rect(M, y, PAGE_W - 2 * M, 16);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  if (isP) {
    pdf.setTextColor(109, 40, 217);
  } else {
    pdf.setTextColor(234, 88, 12);
  }
  pdf.text(organizationName || "Company Name", M + 1, y + 7);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);
  pdf.setTextColor(17, 24, 39);
  pdf.text(`Ref# ${ref}`, PAGE_W - M, y + 7, { align: "right" });

  y += 18;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(0, 0, 0);
  const titlePrefix = isP ? "Policy/Procedure/SOP Title:" : "Form/Blank Template Title:";
  pdf.text(titlePrefix, M + 1, y);
  pdf.setFont("helvetica", "normal");
  const titleX = M + 1 + pdf.getTextWidth(titlePrefix) + 2;
  pdf.text(title, titleX, y);

  y += 6;
  const metaLine = `Site: ${site}  |  Process: ${process}  |  Standard: ${standard}  |  Clause: ${clause}  |  Subclause: ${subClause}`;
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  const metaLines = pdf.splitTextToSize(metaLine, TEXT_W - 2) as string[];
  for (const line of metaLines) {
    pdf.text(line, M + 1, y);
    y += 3.8;
  }

  if (!isP) {
    pdf.setDrawColor(160);
    pdf.line(M, y + 1, PAGE_W - M, y + 1);
    y += 4;
    const lotLine = `Lot/Batch/Serial# ${nz(docRow.docNumber, "—")} | Std Clause Ref# ${clause} | Shift: — | Records Archive: ${recordsArchiveYm(docRow.releaseDate)} | System Date: ${formatNowDate()} | Time: ${formatNowTime()}`;
    pdf.setFontSize(7.5);
    const lotSplit = pdf.splitTextToSize(lotLine, TEXT_W - 2) as string[];
    for (const line of lotSplit) {
      pdf.text(line, M + 1, y);
      y += 3.5;
    }
  }

  y += 3;
  const bodyTop = y;
  pdf.setDrawColor(210);
  pdf.setLineWidth(0.2);
  pdf.line(M, bodyTop, PAGE_W - M, bodyTop);

  const bodyInnerTop = bodyTop + 5;

  const hasMarkup =
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    rawMain.length > 0 &&
    /<\/?[a-z][\s\S]*?>/i.test(rawMain);

  let cyBottom = bodyInnerTop;
  if (hasMarkup) {
    try {
      cyBottom = await embedRichHtmlBody(
        pdf,
        rawMain,
        bodyX,
        bodyInnerTop,
        bodyWidthMm,
        maxYFirstPage,
        maxYNextPage
      );
    } catch {
      cyBottom = drawPlainBody(
        pdf,
        bodyPlain,
        bodyX,
        bodyInnerTop,
        bodyWidthMm,
        maxYFirstPage,
        maxYNextPage
      );
    }
  } else {
    cyBottom = drawPlainBody(
      pdf,
      bodyPlain,
      bodyX,
      bodyInnerTop,
      bodyWidthMm,
      maxYFirstPage,
      maxYNextPage
    );
  }

  const footerY = 271;
  if (cyBottom > footerY - 12) {
    pdf.addPage();
  }

  const footerH = isP ? 14 : 17;
  pdf.setFillColor(245, 245, 245);
  pdf.rect(M, footerY, TEXT_W, footerH, "F");
  pdf.setDrawColor(180);
  pdf.rect(M, footerY, TEXT_W, footerH);

  const box = (xx: number, yy: number, checked: boolean) => {
    pdf.setLineWidth(0.25);
    pdf.setDrawColor(0);
    pdf.rect(xx, yy, 3.2, 3.2);
    if (checked) {
      pdf.setFontSize(7);
      pdf.text("X", xx + 0.6, yy + 2.4);
    }
  };

  pdf.setTextColor(0);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);

  if (isP) {
    box(M + 2, footerY + 5, true);
    pdf.text(
      `Created By: ${createdName}   ID#${createdId}   Date: ${createdDate}`,
      M + 6,
      footerY + 7.2
    );
    pdf.text("→", M + 62, footerY + 7.2);
    box(M + 68, footerY + 5, hasReviewed);
    pdf.text(
      `Reviewed By: ${reviewedName}   ID#${reviewedId}   Date: ${reviewedDate}`,
      M + 72,
      footerY + 7.2
    );
    pdf.text("→", M + 128, footerY + 7.2);
    box(M + 134, footerY + 5, hasApproved);
    pdf.text(
      `Approved By: ${approvedName}   ID#${approvedId}   Date: ${approvedDate}`,
      M + 138,
      footerY + 7.2
    );
  } else {
    box(M + 2, footerY + 4, true);
    pdf.text(
      `Capture By: ${captureName}   ID#${captureId}   Date: ${captureDate}`,
      M + 6,
      footerY + 6.2
    );
    pdf.text("→", M + 100, footerY + 6.2);
    box(M + 126, footerY + 4, hasApproved);
    pdf.text(
      `Verified By: ${verifyName}   ID#${verifyId}   Date: ${verifyDate}`,
      M + 130,
      footerY + 6.2
    );

    pdf.setFont("helvetica", "bold");
    pdf.text("DISCARD", M + 6, footerY + 11.5);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Comments (if any): ${commentsText}`, M + 28, footerY + 11.5);
  }

  pdf.setFontSize(7);
  pdf.setTextColor(75, 85, 99);
  pdf.text(
    "Note: The system record may be archived as a PDF with a unique reference. Retention follows your organization procedures.",
    M + 1,
    footerY + footerH + 3,
    { maxWidth: TEXT_W - 2 }
  );

  return pdf;
}
