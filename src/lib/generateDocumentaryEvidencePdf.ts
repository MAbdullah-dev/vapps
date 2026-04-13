import jsPDF from "jspdf";

export type EvidencePdfData = {
  recordId: string;
  reference: string;
  formTitle: string;
  capturedData: string;
  verifierName: string;
  verifierUserId: string;
  verificationComments: string;
  archiveLocation: string;
  retentionPeriod: string;
  archiveDate: string;
  retentionExpiry: string;
};

const PAGE_W = 210;
const MARGIN_L = 20;
const MARGIN_R = 20;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;

const GREEN = "#22B323";
const DARK = "#111827";
const GRAY = "#6B7280";
const LIGHT_BG = "#F9FAFB";
const BORDER = "#E5E7EB";

function addNewPageIfNeeded(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > 270) {
    doc.addPage();
    return 20;
  }
  return y;
}

function drawHorizontalLine(doc: jsPDF, y: number) {
  doc.setDrawColor(BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
}

function drawLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  maxW: number
): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(GRAY);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(DARK);
  const lines = doc.splitTextToSize(value || "—", maxW);
  doc.text(lines, x, y + 5);
  return y + 5 + lines.length * 4.5;
}

function drawSectionHeader(doc: jsPDF, num: string, title: string, y: number): number {
  y = addNewPageIfNeeded(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(GREEN);
  doc.text(num, MARGIN_L, y);
  doc.setTextColor(DARK);
  doc.text(title, MARGIN_L + 7, y);
  return y + 7;
}

export function generateDocumentaryEvidencePdf(data: EvidencePdfData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // ── Header band ──
  doc.setFillColor(GREEN);
  doc.rect(0, 0, PAGE_W, 36, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#FFFFFF");
  doc.text("Documentary Evidence Record", MARGIN_L, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("ISO 9001:2015 — Clause 7.5.3  |  Retained Record", MARGIN_L, 24);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.recordId, PAGE_W - MARGIN_R, 16, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const now = new Date();
  doc.text(
    `Generated: ${now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}  ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
    PAGE_W - MARGIN_R,
    24,
    { align: "right" }
  );

  doc.setFillColor(LIGHT_BG);
  doc.rect(0, 36, PAGE_W, 8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(GRAY);
  doc.text(
    "This document is system-generated. Any manual alteration voids its compliance standing.",
    PAGE_W / 2,
    41,
    { align: "center" }
  );

  let y = 52;

  // ── 1. Record information ──
  y = drawSectionHeader(doc, "1.", "Record Information", y);
  drawHorizontalLine(doc, y);
  y += 4;

  const col1X = MARGIN_L;
  const col2X = MARGIN_L + CONTENT_W * 0.35;
  const col3X = MARGIN_L + CONTENT_W * 0.7;
  const colW = CONTENT_W * 0.3;

  const y1a = drawLabelValue(doc, "Record ID", data.recordId, col1X, y, colW);
  const y1b = drawLabelValue(doc, "Reference", data.reference, col2X, y, colW);
  const y1c = drawLabelValue(doc, "Form Title", data.formTitle, col3X, y, colW);
  y = Math.max(y1a, y1b, y1c) + 4;

  // ── 2. Captured data ──
  y = drawSectionHeader(doc, "2.", "Captured Data", y);
  drawHorizontalLine(doc, y);
  y += 4;

  doc.setFillColor(LIGHT_BG);
  const capturedLines = doc.splitTextToSize(data.capturedData || "—", CONTENT_W - 8);
  const boxH = Math.max(capturedLines.length * 4.5 + 8, 16);
  y = addNewPageIfNeeded(doc, y, boxH + 4);
  doc.roundedRect(MARGIN_L, y, CONTENT_W, boxH, 2, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(DARK);
  doc.text(capturedLines, MARGIN_L + 4, y + 6);
  y += boxH + 6;

  // ── 3. Verification ──
  y = drawSectionHeader(doc, "3.", "Verification", y);
  drawHorizontalLine(doc, y);
  y += 4;

  const halfW = CONTENT_W * 0.48;
  const y3a = drawLabelValue(doc, "Verified by", data.verifierName, col1X, y, halfW);
  const y3b = drawLabelValue(doc, "Verifier ID", data.verifierUserId, col2X, y, halfW);
  y = Math.max(y3a, y3b) + 2;

  y = addNewPageIfNeeded(doc, y, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(GRAY);
  doc.text("VERIFICATION COMMENTS", MARGIN_L, y);
  y += 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(DARK);
  const commLines = doc.splitTextToSize(data.verificationComments || "—", CONTENT_W - 8);
  const commH = Math.max(commLines.length * 4.5 + 8, 14);
  y = addNewPageIfNeeded(doc, y, commH + 6);
  doc.setFillColor("#F0FDF4");
  doc.setDrawColor("#BBF7D0");
  doc.roundedRect(MARGIN_L, y, CONTENT_W, commH, 2, 2, "FD");
  doc.text(commLines, MARGIN_L + 4, y + 6);
  y += commH + 6;

  // ── 4. Archive configuration ──
  y = drawSectionHeader(doc, "4.", "Archive Configuration", y);
  drawHorizontalLine(doc, y);
  y += 4;

  const y4a = drawLabelValue(doc, "Archive Location", data.archiveLocation || "Cloud", col1X, y, halfW);
  const y4b = drawLabelValue(doc, "Retention Period", data.retentionPeriod || "3 Years", col2X, y, halfW);
  y = Math.max(y4a, y4b) + 2;

  const y4c = drawLabelValue(doc, "Archive Date", data.archiveDate, col1X, y, halfW);
  const y4d = drawLabelValue(doc, "Retention Expiry", data.retentionExpiry, col2X, y, halfW);
  y = Math.max(y4c, y4d) + 6;

  // ── Date stamp ──
  y = addNewPageIfNeeded(doc, y, 20);
  drawHorizontalLine(doc, y);
  y += 7;

  const downloadDate = new Date();
  const dateStr = downloadDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(GRAY);
  doc.text("Date:", MARGIN_L, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(DARK);
  doc.text(dateStr, MARGIN_L + 14, y);
  y += 10;

  // ── Footer ──
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFillColor(LIGHT_BG);
    doc.rect(0, 287, PAGE_W, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(GRAY);
    doc.text(
      `ISO 9001:2015 Clause 7.5.3  —  ${data.reference}  —  Page ${p} of ${pageCount}`,
      PAGE_W / 2,
      292,
      { align: "center" }
    );
  }

  return doc;
}
