"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExt from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import ImageExt from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { useCallback, useEffect, useRef } from "react";

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function Editor({ content, onChange, placeholder = "Begin writing…" }: EditorProps) {
  const imgInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      LinkExt.configure({ openOnClick: false }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Typography,
      CharacterCount,
      ImageExt.configure({ inline: false, allowBase64: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "tiptap-editor prose-amo" },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("Paste link URL:", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const insertImageUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Paste image URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const uploadInlineImage = useCallback(async (file: File) => {
    if (!editor) return;
    // Try Vercel Blob upload first
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        editor.chain().focus().setImage({ src: url }).run();
        return;
      }
    } catch { /* fall through to base64 */ }
    // Fallback: base64
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result) editor.chain().focus().setImage({ src: e.target.result as string }).run();
    };
    reader.readAsDataURL(file);
  }, [editor]);

  if (!editor) return null;

  // Touch-safe button: onPointerDown with preventDefault keeps editor focused on mobile
  const B = (
    active: boolean,
    action: () => void,
    label: string,
    title: string,
    extraStyle?: React.CSSProperties
  ) => (
    <button
      key={title}
      onPointerDown={e => { e.preventDefault(); action(); }}
      title={title}
      style={{
        height: 36, minWidth: 36, padding: "0 8px",
        background: active ? "#2d7d9a" : "transparent",
        color: active ? "#fff" : "#0d1f3c",
        border: "1px solid " + (active ? "#2d7d9a" : "rgba(13,31,60,0.18)"),
        borderRadius: 5, cursor: "pointer",
        fontSize: "0.78rem", fontFamily: "Inter, sans-serif", fontWeight: 500,
        flexShrink: 0, whiteSpace: "nowrap",
        display: "flex", alignItems: "center", justifyContent: "center",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
        ...extraStyle,
      }}
    >{label}</button>
  );

  const Sep = () => <div style={{ width: 1, background: "rgba(13,31,60,0.15)", margin: "0 3px", height: 22, alignSelf: "center", flexShrink: 0 }} />;

  return (
    <div style={{ border: "1px solid rgba(13,31,60,0.18)", borderRadius: 8, overflow: "hidden", background: "#fffef9" }}>
      {/* ── Toolbar ── swipe left on mobile for more tools */}
      <div style={{
        display: "flex", alignItems: "center", gap: 3,
        padding: "8px 10px",
        borderBottom: "1px solid rgba(13,31,60,0.1)",
        background: "#f5f0e8",
        overflowX: "auto", WebkitOverflowScrolling: "touch",
        msOverflowStyle: "none", scrollbarWidth: "none",
      }}>
        {/* Headings */}
        {B(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1", "Heading 1")}
        {B(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", "Heading 2")}
        {B(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3", "Heading 3")}
        <Sep />
        {/* Inline formatting */}
        {B(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B", "Bold", { fontWeight: 700 })}
        {B(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I", "Italic", { fontStyle: "italic" })}
        {B(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "U", "Underline", { textDecoration: "underline" })}
        {B(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "Stk", "Strikethrough", { textDecoration: "line-through" })}
        {B(editor.isActive("highlight"), () => editor.chain().focus().toggleHighlight().run(), "Mark", "Highlight")}
        <Sep />
        {/* Alignment */}
        {B(editor.isActive({ textAlign: "left" }), () => editor.chain().focus().setTextAlign("left").run(), "Left", "Align left")}
        {B(editor.isActive({ textAlign: "center" }), () => editor.chain().focus().setTextAlign("center").run(), "Center", "Align center")}
        {B(editor.isActive({ textAlign: "right" }), () => editor.chain().focus().setTextAlign("right").run(), "Right", "Align right")}
        <Sep />
        {/* Lists */}
        {B(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• List", "Bullet list")}
        {B(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1. List", "Numbered list")}
        <Sep />
        {/* Blocks */}
        {B(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "Quote", "Blockquote")}
        {B(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), "Code", "Inline code", { fontFamily: "monospace" })}
        {B(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), "{ }", "Code block")}
        <Sep />
        {/* Link */}
        {B(editor.isActive("link"), setLink, "Link", "Insert link")}
        {/* Inline image — upload or URL */}
        <button
          onPointerDown={e => { e.preventDefault(); imgInputRef.current?.click(); }}
          title="Insert image from gallery"
          style={{ height: 36, minWidth: 36, padding: "0 8px", background: "transparent", color: "#0d1f3c", border: "1px solid rgba(13,31,60,0.18)", borderRadius: 5, cursor: "pointer", fontSize: "0.78rem", fontFamily: "Inter, sans-serif", flexShrink: 0, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
        >Img</button>
        {B(false, insertImageUrl, "Img URL", "Insert image by URL")}
        {B(false, () => editor.chain().focus().setHorizontalRule().run(), "---", "Divider")}
        <Sep />
        {/* History */}
        {B(false, () => editor.chain().focus().undo().run(), "Undo", "Undo")}
        {B(false, () => editor.chain().focus().redo().run(), "Redo", "Redo")}
      </div>

      {/* Writing area */}
      <div style={{ padding: "1.25rem 1rem", minHeight: 300 }}>
        <EditorContent editor={editor} />
      </div>

      {/* Word count */}
      <div style={{
        padding: "5px 12px", borderTop: "1px solid rgba(13,31,60,0.07)",
        background: "#f5f0e8", textAlign: "right",
        color: "#8fa3b1", fontSize: "0.7rem", fontFamily: "Inter, sans-serif",
      }}>
        {editor.storage.characterCount.words()} words · {editor.storage.characterCount.characters()} chars
      </div>

      {/* Hidden file input for inline image upload */}
      <input
        ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadInlineImage(f); e.target.value = ""; }}
      />

      <style>{`
        .tiptap-editor .ProseMirror { outline: none; min-height: 260px; font-size: 1rem; line-height: 1.75; }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: #8fa3b1; content: attr(data-placeholder); float: left; height: 0; pointer-events: none;
        }
        .tiptap-editor .ProseMirror img { max-width: 100%; border-radius: 6px; margin: 1rem 0; cursor: pointer; }
        .tiptap-editor .ProseMirror img.ProseMirror-selectednode { outline: 2px solid #2d7d9a; }
        .tiptap-editor .ProseMirror [style*="text-align: center"] { text-align: center; }
        .tiptap-editor .ProseMirror [style*="text-align: right"] { text-align: right; }
      `}</style>
    </div>
  );
}
