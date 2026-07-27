"use client";

import {
  createHandleImageUpload,
  DEFAULT_EDITOR_IMAGE_UPLOAD_URL,
  MAX_FILE_SIZE,
} from "@/lib/editor-image-upload";
import {
  HUGERTE_BLOCK_FORMATS,
  HUGERTE_MENUBAR,
  HUGERTE_PLUGINS,
  HUGERTE_TOOLBAR,
} from "@/lib/hugerte-bundle";
import "@/lib/hugerte-bundle";
import { cn } from "@/lib/utils";
import { Editor } from "@hugerte/hugerte-react";
import type { Editor as HugeRTEEditorInstance } from "hugerte";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import type { RichTextEditorProps } from "./rich-text-editor";

const ON_CHANGE_DEBOUNCE_MS = 100;
const TABLE_PICKER_SELECTOR = ".tox-insert-table-picker";
const TABLE_PICKER_SELECTED_CLASS = "tox-insert-table-picker__selected";

function syncTablePickerSelection(target: EventTarget | null) {
  if (!(target instanceof Element)) return;

  const cell = target.closest(`${TABLE_PICKER_SELECTOR} > div`);
  if (!(cell instanceof HTMLElement)) return;
  if (cell.classList.contains("tox-insert-table-picker__label")) return;

  const picker = cell.parentElement;
  if (!(picker instanceof HTMLElement) || !picker.matches(TABLE_PICKER_SELECTOR)) return;

  const cells = Array.from(picker.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && !child.classList.contains("tox-insert-table-picker__label")
  );
  const selectedIndex = cells.indexOf(cell);
  if (selectedIndex < 0) return;

  const columns = Math.max(1, Math.round(picker.clientWidth / Math.max(1, cell.offsetWidth)));
  const selectedColumn = selectedIndex % columns;
  const selectedRow = Math.floor(selectedIndex / columns);

  cells.forEach((candidate, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    candidate.classList.toggle(
      TABLE_PICKER_SELECTED_CLASS,
      row <= selectedRow && column <= selectedColumn
    );
  });

  const label = picker.querySelector(`.${TABLE_PICKER_SELECTOR.slice(1)}__label`);
  if (label instanceof HTMLElement) {
    label.textContent = `${selectedColumn + 1}x${selectedRow + 1}`;
  }
}

export function HugerteEditorInner({
  value,
  onChange,
  readOnly = false,
  placeholder = "",
  minHeight = 160,
  className,
  showToolbar = true,
  imageUploadUrl = DEFAULT_EDITOR_IMAGE_UPLOAD_URL,
  orgId: orgIdProp,
  instanceKey,
}: RichTextEditorProps) {
  const params = useParams();
  const orgId =
    orgIdProp?.trim() ||
    (typeof params?.orgId === "string" ? params.orgId : "") ||
    "";
  const editorId = useId().replace(/:/g, "");
  const [initialValue] = useState(() => (value?.trim() ? value : "<p></p>"));
  const lastEmittedHtml = useRef(value);
  const onChangeRef = useRef(onChange);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHtmlRef = useRef<string | null>(null);
  const editorRef = useRef<HugeRTEEditorInstance | null>(null);
  const readOnlyRef = useRef(readOnly);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  const flushPendingOnChange = useCallback(() => {
    if (debounceTimerRef.current != null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingHtmlRef.current != null) {
      const html = pendingHtmlRef.current;
      pendingHtmlRef.current = null;
      onChangeRef.current(html);
    }
  }, []);

  const scheduleParentOnChange = useCallback((html: string) => {
    pendingHtmlRef.current = html;
    if (debounceTimerRef.current != null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      if (pendingHtmlRef.current != null) {
        const next = pendingHtmlRef.current;
        pendingHtmlRef.current = null;
        onChangeRef.current(next);
      }
    }, ON_CHANGE_DEBOUNCE_MS);
  }, []);

  useEffect(
    () => () => {
      if (debounceTimerRef.current != null) clearTimeout(debounceTimerRef.current);
    },
    []
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      window.requestAnimationFrame(() => syncTablePickerSelection(event.target));
    };

    document.addEventListener("pointermove", handlePointerMove);
    return () => document.removeEventListener("pointermove", handlePointerMove);
  }, []);

  const uploadHandler = useMemo(
    () => createHandleImageUpload({ uploadUrl: imageUploadUrl, orgId }),
    [imageUploadUrl, orgId]
  );

  const handleEditorChange = useCallback(
    (content: string) => {
      if (readOnlyRef.current) return;
      const html = content || "";
      lastEmittedHtml.current = html;
      scheduleParentOnChange(html);
    },
    [scheduleParentOnChange]
  );

  const handleInit = useCallback(
    (_evt: unknown, editor: HugeRTEEditorInstance) => {
      editorRef.current = editor;
      editor.on("blur", () => {
        flushPendingOnChange();
      });
    },
    [flushPendingOnChange]
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || editor.removed) return;
    if (editor.hasFocus()) return;
    if (value === lastEmittedHtml.current) return;

    const next = value?.trim() ? value : "<p></p>";
    const current = editor.getContent();
    if (current === next) {
      lastEmittedHtml.current = value;
      return;
    }
    editor.setContent(next, { no_events: true });
    lastEmittedHtml.current = value;
  }, [value]);

  const toolbarVisible = showToolbar && !readOnly;

  const init = useMemo(
    () => ({
      height: minHeight + (toolbarVisible ? 120 : 8),
      menubar: toolbarVisible ? HUGERTE_MENUBAR : false,
      plugins: HUGERTE_PLUGINS,
      toolbar: toolbarVisible ? HUGERTE_TOOLBAR : false,
      block_formats: HUGERTE_BLOCK_FORMATS,
      placeholder: placeholder || undefined,
      skin_url: "default" as const,
      content_css: "default" as const,
      branding: false,
      promotion: false,
      resize: true,
      statusbar: toolbarVisible,
      automatic_uploads: true,
      file_picker_types: "image",
      images_file_types: "jpeg,jpg,png,gif,webp",
      // Menus/dialogs render in .tox-hugerte-aux on document.body (outside Radix dialogs).
      images_upload_handler: async (
        blobInfo: { blob: () => Blob; filename: () => string },
        progress: (percent: number) => void
      ) => {
        const blob = blobInfo.blob();
        const name = blobInfo.filename();
        const file = new File([blob], name, {
          type: blob.type || "image/png",
        });
        if (file.size > MAX_FILE_SIZE) {
          const msg = `File size exceeds maximum allowed (${MAX_FILE_SIZE / (1024 * 1024)}MB)`;
          toast.error(msg);
          throw new Error(msg);
        }
        try {
          return await uploadHandler(file, (e) => progress(e.progress));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Upload failed";
          toast.error(message);
          throw err;
        }
      },
      content_style: `
        body {
          font-family: var(--font-poppins, Poppins, system-ui, sans-serif);
          font-size: 14px;
          color: var(--foreground, #0f172a);
          margin: 8px 12px;
        }
        img { max-width: 100%; height: auto; border-radius: 6px; }
      `,
    }),
    [minHeight, placeholder, toolbarVisible, uploadHandler]
  );

  const editorReactKey = instanceKey ?? editorId;

  return (
    <div
      className={cn(
        "rich-text-editor-root rounded-md border border-border bg-background",
        className
      )}
    >
      <Editor
        key={editorReactKey}
        id={editorId}
        disabled={readOnly}
        initialValue={initialValue}
        onEditorChange={handleEditorChange}
        onInit={handleInit}
        plugins={HUGERTE_PLUGINS}
        toolbar={toolbarVisible ? HUGERTE_TOOLBAR : false}
        init={init}
      />
    </div>
  );
}
