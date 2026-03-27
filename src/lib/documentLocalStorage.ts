import type {
  DocumentSavePayload,
  DocumentSaveStatus,
  DocumentWizardSnapshot,
  Step1FormData,
} from "@/components/documents/types";

const storageKey = (orgId: string) => `vapps:documents:${orgId}`;

export type StoredDocumentRecord = {
  id: string;
  status: DocumentSaveStatus;
  savedAt: string;
  previewDocRef: string;
  formData: Step1FormData;
  wizard: DocumentWizardSnapshot;
};

const MAX_RECORDS = 200;

function generateRecordId(): string {
  const maybeCrypto = globalThis.crypto as Crypto | undefined;
  if (maybeCrypto?.randomUUID) return maybeCrypto.randomUUID();
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function appendDocumentRecord(
  orgId: string,
  status: DocumentSaveStatus,
  payload: DocumentSavePayload
): StoredDocumentRecord {
  const record: StoredDocumentRecord = {
    id: generateRecordId(),
    status,
    savedAt: payload.savedAt,
    previewDocRef: payload.previewDocRef,
    formData: payload.formData,
    wizard: payload.wizard,
  };

  if (typeof window === "undefined") return record;

  let list: StoredDocumentRecord[] = [];
  try {
    const raw = window.localStorage.getItem(storageKey(orgId));
    list = raw ? (JSON.parse(raw) as StoredDocumentRecord[]) : [];
    if (!Array.isArray(list)) list = [];
  } catch {
    list = [];
  }

  list.unshift(record);
  window.localStorage.setItem(storageKey(orgId), JSON.stringify(list.slice(0, MAX_RECORDS)));
  return record;
}

export function listDocumentRecords(orgId: string): StoredDocumentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey(orgId));
    const list = raw ? (JSON.parse(raw) as StoredDocumentRecord[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
