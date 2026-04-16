"use client";

import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  createHandleImageUpload,
  DEFAULT_EDITOR_IMAGE_UPLOAD_URL,
  MAX_FILE_SIZE,
} from "@/lib/tiptap-utils";
import type { Editor } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extension-placeholder";
import { TextAlign } from "@tiptap/extension-text-align";
import { EditorContent, EditorContext, useEditor, useEditorState } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/image-upload-node/image-upload-node.scss";

/** Delay notifying parent (reduces re-renders of large parent forms while typing). */
const ON_CHANGE_DEBOUNCE_MS = 100;

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
};

function blockMenuValue(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "h1";
  if (editor.isActive("heading", { level: 2 })) return "h2";
  if (editor.isActive("heading", { level: 3 })) return "h3";
  return "p";
}

function currentTextAlign(editor: Editor): "left" | "center" | "right" {
  const p = editor.getAttributes("paragraph") as { textAlign?: string | null };
  const h = editor.getAttributes("heading") as { textAlign?: string | null };
  const raw = h.textAlign ?? p.textAlign ?? "left";
  if (raw === "center" || raw === "right") return raw;
  return "left";
}

function textAlignActive(editor: Editor, align: "left" | "center" | "right"): boolean {
  return currentTextAlign(editor) === align;
}

/**
 * Toolbar subscribes to editor transactions so active styles stay in sync
 * without relying on the parent re-rendering every keystroke.
 */
function RichTextToolbar({ editor }: { editor: Editor }) {
  useEditorState({
    editor,
    selector: ({ transactionNumber }) => transactionNumber,
  });

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[#E5E7EB] bg-white px-2 py-1.5">
      <Select
        value={blockMenuValue(editor)}
        onValueChange={(v) => {
          const chain = editor.chain().focus();
          if (v === "p") chain.setParagraph().run();
          else if (v === "h1") chain.toggleHeading({ level: 1 }).run();
          else if (v === "h2") chain.toggleHeading({ level: 2 }).run();
          else if (v === "h3") chain.toggleHeading({ level: 3 }).run();
        }}
      >
        <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Block type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="p">Paragraph</SelectItem>
          <SelectItem value="h1">
            <span className="inline-flex items-center gap-1">
              <Heading1 className="h-3.5 w-3.5" /> Heading 1
            </span>
          </SelectItem>
          <SelectItem value="h2">
            <span className="inline-flex items-center gap-1">
              <Heading2 className="h-3.5 w-3.5" /> Heading 2
            </span>
          </SelectItem>
          <SelectItem value="h3">
            <span className="inline-flex items-center gap-1">
              <Heading3 className="h-3.5 w-3.5" /> Heading 3
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      <Button
        type="button"
        variant={editor.isActive("bold") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Bold"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("italic") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Italic"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("underline") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Underline"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("strike") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Strikethrough"
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      <Button
        type="button"
        variant={textAlignActive(editor, "left") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Align left"
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={textAlignActive(editor, "center") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Align center"
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={textAlignActive(editor, "right") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Align right"
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      <Button
        type="button"
        variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
        size="sm"
        className="h-8 w-8 p-0"
        aria-label="Numbered list"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      <ImageUploadButton editor={editor} text="Image" showShortcut hideWhenUnavailable={false} />
    </div>
  );
}

function editorHasDomFocus(editor: Editor): boolean {
  try {
    return editor.view.hasFocus();
  } catch {
    return false;
  }
}

export function RichTextEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "",
  minHeight = 160,
  className,
  showToolbar = true,
  imageUploadUrl = DEFAULT_EDITOR_IMAGE_UPLOAD_URL,
}: RichTextEditorProps) {
  const lastEmittedHtml = useRef(value);
  const onChangeRef = useRef(onChange);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHtmlRef = useRef<string | null>(null);
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

  const upload = useMemo(
    () => createHandleImageUpload(imageUploadUrl),
    [imageUploadUrl]
  );

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Image.configure({
        allowBase64: false,
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-md",
        },
      }),
      ImageUploadNode.configure({
        accept: "image/jpeg,image/png,image/webp,image/gif",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload,
        onError: (error: Error) => toast.error(error.message),
      }),
      Placeholder.configure({
        placeholder: placeholder || " ",
        emptyEditorClass: "is-editor-empty",
      }),
    ],
    [upload, placeholder]
  );

  const editor = useEditor(
    {
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      extensions,
      content: value?.trim() ? value : "<p></p>",
      editable: !readOnly,
      editorProps: {
        attributes: {
          class: cn(
            "tiptap rich-text-prose max-w-none px-3 py-2 text-sm text-foreground focus:outline-none",
            "[&_img]:max-w-full [&_img]:h-auto",
            readOnly && "cursor-default"
          ),
        },
        handleDOMEvents: {
          blur: () => {
            flushPendingOnChange();
            return false;
          },
        },
      },
      onUpdate: ({ editor: ed }) => {
        if (!ed.isEditable || readOnlyRef.current) return;
        const html = ed.getHTML();
        lastEmittedHtml.current = html;
        scheduleParentOnChange(html);
      },
    },
    [extensions, flushPendingOnChange, scheduleParentOnChange]
  );

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor) return;
    // Do not replace content from props while typing — prevents lag and cursor loss.
    if (editorHasDomFocus(editor)) return;

    if (value === lastEmittedHtml.current) return;
    const next = value?.trim() ? value : "<p></p>";
    if (editor.getHTML() === next) {
      lastEmittedHtml.current = value;
      return;
    }
    editor.commands.setContent(next, { emitUpdate: false });
    lastEmittedHtml.current = next;
  }, [value, editor]);

  if (!editor) {
    return (
      <div
        className={cn("rounded-md border border-[#E5E7EB] bg-[#F9FAFB] animate-pulse", className)}
        style={{ minHeight }}
        aria-hidden
      />
    );
  }

  const toolbar = showToolbar && !readOnly;

  return (
    <EditorContext.Provider value={{ editor }}>
      <div
        className={cn(
          "overflow-hidden rounded-md border border-[#E5E7EB] bg-[#F9FAFB] rich-text-editor-root",
          className
        )}
        style={{ minHeight }}
      >
        {toolbar && <RichTextToolbar editor={editor} />}

        <div
          className="rich-text-editor-content bg-[#F9FAFB]"
          style={{
            minHeight: Math.max(80, minHeight - (toolbar ? 44 : 0)),
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </EditorContext.Provider>
  );
}
