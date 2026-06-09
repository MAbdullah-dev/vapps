export const DRAFT_DOC_NUMBER = "D0";

/** Trailing version segment like v1, v12. */
export function parseVersionSegment(documentRef: string): string | null {
  const m = String(documentRef ?? "")
    .trim()
    .match(/\/(v\d+)$/i);
  return m ? m[1].toLowerCase() : null;
}

/** First path segment like D1, D12 (not P/F). */
export function parseDocNumberSegment(documentRef: string): string | null {
  const parts = documentRef.split("/").filter(Boolean);
  for (const seg of parts) {
    const m = /^D(\d+)$/i.exec(String(seg).trim());
    if (m) return `D${m[1]}`;
  }
  return null;
}

export function maxDocNumberAcrossRef(ref: string): number {
  const parts = ref.split("/").filter(Boolean);
  let max = 0;
  for (const seg of parts) {
    const m = /^D(\d+)$/i.exec(String(seg).trim());
    if (m) {
      const n = Number(m[1]);
      if (n > 0) max = Math.max(max, n);
    }
  }
  return max;
}

export function isDraftPlaceholderRef(ref: string): boolean {
  const seg = parseDocNumberSegment(ref);
  return seg?.toUpperCase() === DRAFT_DOC_NUMBER;
}

export function withDocNumberSegment(ref: string, docNumber: string): string {
  const parts = ref.split("/").filter(Boolean);
  let replaced = false;
  const next = parts.map((seg) => {
    if (/^D\d+$/i.test(seg)) {
      replaced = true;
      return docNumber;
    }
    return seg;
  });
  if (!replaced) {
    const typeIdx = next.findIndex((s) => /^(P|F|EXT)$/i.test(s));
    if (typeIdx >= 0) next.splice(typeIdx + 1, 0, docNumber);
    else next.push(docNumber);
  }
  return next.join("/");
}

export function withVersionSegment(ref: string, version: number): string {
  const v = Math.max(1, version);
  if (/\/v\d+$/i.test(ref)) return ref.replace(/\/v\d+$/i, `/v${v}`);
  return `${ref}/v${v}`;
}

export function bumpVersionInRef(ref: string): string {
  const m = ref.match(/\/v(\d+)$/i);
  const next = m ? Number(m[1]) + 1 : 2;
  return withVersionSegment(ref, next);
}

export function normalizeWizardDocSegment(
  wizard: unknown,
  docNumber: string
): Record<string, unknown> {
  const base =
    typeof wizard === "object" && wizard !== null && !Array.isArray(wizard)
      ? { ...(wizard as Record<string, unknown>) }
      : {};
  base.documentNumberSegment = docNumber;
  return base;
}

export function applyDraftPlaceholderRef(ref: string): string {
  return withDocNumberSegment(ref, DRAFT_DOC_NUMBER);
}

export type DocumentWorkflowPosition =
  | "Draft"
  | "Review Pending"
  | "Approval Pending"
  | "Active";

export function documentWorkflowPositionLabel(
  workflowStatus: string | null | undefined
): DocumentWorkflowPosition {
  const wf = String(workflowStatus ?? "").toLowerCase().trim();
  if (wf === "in_review") return "Review Pending";
  if (wf === "in_approval") return "Approval Pending";
  if (wf === "approved") return "Active";
  return "Draft";
}

type RefRow = { preview_doc_ref: string; wizard_data: unknown };

export function maxPublishedDocNumberFromRows(rows: RefRow[]): number {
  let max = 0;
  for (const row of rows) {
    const wizard = row.wizard_data as Record<string, unknown> | null;
    const fromWizard =
      typeof wizard?.documentNumberSegment === "string"
        ? parseDocNumberSegment(String(wizard.documentNumberSegment))
        : null;
    const fromRef = parseDocNumberSegment(String(row.preview_doc_ref ?? ""));
    const seg = fromWizard ?? fromRef;
    if (!seg) continue;
    const m = /^D(\d+)$/i.exec(seg);
    if (m) {
      const n = Number(m[1]);
      if (n > 0) max = Math.max(max, n);
    }
  }
  return max;
}

export async function fetchPublishedDocRefRows(
  client: { query: (sql: string) => Promise<{ rows: RefRow[] }> }
): Promise<RefRow[]> {
  const result = await client.query(
    `SELECT preview_doc_ref, wizard_data
     FROM document_module_records
     WHERE workflow_status <> 'draft'`
  );
  return result.rows as RefRow[];
}

export async function nextPublishedDocNumber(
  client: { query: (sql: string) => Promise<{ rows: RefRow[] }> }
): Promise<number> {
  const rows = await fetchPublishedDocRefRows(client);
  return maxPublishedDocNumberFromRows(rows) + 1;
}

export function assignPublishedDocNumber(ref: string, nextNum: number): string {
  return withDocNumberSegment(ref, `D${nextNum}`);
}
