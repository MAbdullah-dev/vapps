import { jsPDF } from "jspdf";

export function buildRecoveryCodesPdfBuffer(params: {
  email: string;
  recoveryCodes: string[];
}): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  let y = margin;

  doc.setFontSize(18);
  doc.text("Vie — Two-Step Verification Recovery Codes", margin, y);
  y += 10;

  doc.setFontSize(11);
  doc.text(`Account: ${params.email}`, margin, y);
  y += 8;
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 12;

  doc.setFontSize(10);
  const warning =
    "Store these codes in a safe place. Each code can be used only once. " +
    "If you lose access to your authenticator app, use a recovery code to sign in.";
  const warningLines = doc.splitTextToSize(warning, 170);
  doc.text(warningLines, margin, y);
  y += warningLines.length * 5 + 8;

  doc.setFontSize(12);
  doc.text("Recovery codes:", margin, y);
  y += 8;

  doc.setFont("courier", "normal");
  doc.setFontSize(11);
  for (const code of params.recoveryCodes) {
    doc.text(`  •  ${code}`, margin, y);
    y += 7;
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  y += 6;
  doc.text(
    "Do not share this document. Regenerate codes from Account settings if compromised.",
    margin,
    y
  );

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

/** Browser download (Account page). */
export function downloadRecoveryCodesPdfClient(params: {
  email: string;
  recoveryCodes: string[];
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20;
  let y = margin;

  doc.setFontSize(18);
  doc.text("Vie — Two-Step Verification Recovery Codes", margin, y);
  y += 10;
  doc.setFontSize(11);
  doc.text(`Account: ${params.email}`, margin, y);
  y += 8;
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
  y += 12;
  doc.setFontSize(10);
  const warning =
    "Store these codes in a safe place. Each code can be used only once.";
  const warningLines = doc.splitTextToSize(warning, 170);
  doc.text(warningLines, margin, y);
  y += warningLines.length * 5 + 8;
  doc.setFontSize(12);
  doc.text("Recovery codes:", margin, y);
  y += 8;
  doc.setFont("courier", "normal");
  doc.setFontSize(11);
  for (const code of params.recoveryCodes) {
    doc.text(`  •  ${code}`, margin, y);
    y += 7;
  }
  doc.save("vie-recovery-codes.pdf");
}
