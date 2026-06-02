"use client";

import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

export {
  DEFAULT_EDITOR_IMAGE_UPLOAD_URL,
  createHandleImageUpload,
  handleImageUpload,
  MAX_FILE_SIZE,
} from "@/lib/editor-image-upload";

export type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  /** Minimum height of the editing area in pixels */
  minHeight?: number;
  className?: string;
  /** Toolbar + image upload; when false, same as read-only body */
  showToolbar?: boolean;
  /** POST target for multipart field `file` (must return JSON with `link` or `url`) */
  imageUploadUrl?: string;
  /** Change to remount the editor (e.g. when opening a different record in a dialog). */
  instanceKey?: string;
};

const HugerteEditorInner = dynamic(
  () =>
    import("@/components/editor/hugerte-editor-inner").then((m) => m.HugerteEditorInner),
  {
    ssr: false,
    loading: ({ className, minHeight = 160 }: RichTextEditorProps) => (
      <div
        className={cn(
          "rounded-md border border-border bg-muted animate-pulse",
          className
        )}
        style={{ minHeight }}
        aria-hidden
      />
    ),
  }
);

export function RichTextEditor(props: RichTextEditorProps) {
  return <HugerteEditorInner {...props} />;
}
