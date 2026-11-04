"use client";

import { ExternalLink, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AuditUploadedFileRef = { name: string; key: string };

/** Normalize persisted file rows ({ name, key }, { fileName, s3Key }, etc.) for download links. */
export function normalizeAuditUploadedFileRef(raw: unknown): AuditUploadedFileRef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const key =
    typeof o.key === "string"
      ? o.key
      : typeof o.s3Key === "string"
        ? o.s3Key
        : typeof o.s3_key === "string"
          ? o.s3_key
          : null;
  if (!key) return null;
  const name =
    typeof o.name === "string"
      ? o.name
      : typeof o.fileName === "string"
        ? o.fileName
        : typeof o.file_name === "string"
          ? o.file_name
          : "Document";
  return { name, key };
}

type AuditUploadedFilesListProps = {
  files: unknown[] | AuditUploadedFileRef[];
  className?: string;
  listClassName?: string;
  emptyHint?: React.ReactNode;
  onRemove?: (file: AuditUploadedFileRef) => void;
  removeLabel?: string;
};

export function AuditUploadedFilesList({
  files,
  className,
  listClassName,
  emptyHint,
  onRemove,
  removeLabel = "Remove file",
}: AuditUploadedFilesListProps) {
  const normalized = (Array.isArray(files) ? files : [])
    .map(normalizeAuditUploadedFileRef)
    .filter((f): f is AuditUploadedFileRef => f != null);

  if (normalized.length === 0) {
    return emptyHint ? <div className={className}>{emptyHint}</div> : null;
  }

  return (
    <ul className={cn("w-full max-w-md space-y-2 text-left", listClassName, className)}>
      {normalized.map((f, i) => (
        <li key={`${f.key}-${i}`} className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <a
            href={`/api/files/download?key=${encodeURIComponent(f.key)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 truncate font-medium text-primary hover:underline"
          >
            {f.name}
          </a>
          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-70" aria-hidden />
          {onRemove ? (
            <button
              type="button"
              className="ml-auto shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-destructive"
              onClick={() => onRemove(f)}
              aria-label={removeLabel}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
