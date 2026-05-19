"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExt from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import { useCallback, useEffect } from "react";

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export default function Editor({ content, onChange, placeholder = "Begin writing…" }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      LinkExt.configure({ openOnClick: false }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Typography,
      CharacterCount,
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
    const url = window.prompt("URL", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const btn = (active: boolean, onClick: () => void, label: string, title: string, extraStyle?: React.CSSProperties) => (
    <button
      key={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      style={{
        minWidth: 40, height: 40,
        background: active ? "#2d7d9a" : "transparent",
        color: active ? "#fff" : "#0d1f3c",
        border: "1px solid " + (active ? "#2d7d9a" : "rgba(13,31,60,0.18)"),
        borderRadius: 6,
        cursor: "pointer",
        fontSize: "0.82rem",
        fontFamily: "Inter, sans-serif",
        fontWeight: 500,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.15s",
        padding: "0 0.5rem",
        ...extraStyle,
      }}
    >
      {label}
    </button>
  );

  const sep = <div key={Math.random()} style={{ width: 1, background: "rgba(13,31,60,0.12)", margin: "0 4px", height: 24, alignSelf: "center", flexShrink: 0 }} />;

  return (
    <div style={{ border: "1px solid rgba(13,31,60,0.18)", borderRadius: 8, overflow: "hidden", background: "#fffef9" }}>
      {/* Scrollable toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "8px 10px",
        borderBottom: "1px solid rgba(13,31,60,0.1)",
        background: "#f5f0e8",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
      }}>
        {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "H1", "Heading 1")}
        {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "H2", "Heading 2")}
        {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "H3", "Heading 3")}
        {sep}
        {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "B", "Bold", { fontWeight: 700 })}
        {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "I", "Italic", { fontStyle: "italic" })}
        {btn(editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), "U", "Underline", { textDecoration: "underline" })}
        {btn(editor.isActive("highlight"), () => editor.chain().focus().toggleHighlight().run(), "✦", "Highlight")}
        {btn(editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), "S̶", "Strikethrough")}
        {sep}
        {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "• List", "Bullet list")}
        {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "1. List", "Numbered list")}
        {sep}
        {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "❝", "Blockquote")}
        {btn(editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), "`code`", "Inline code")}
        {btn(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), "```", "Code block")}
        {sep}
        {btn(editor.isActive("link"), setLink, "🔗", "Link")}
        {btn(false, () => editor.chain().focus().setHorizontalRule().run(), "—", "Divider")}
        {sep}
        {btn(false, () => editor.chain().focus().undo().run(), "↩", "Undo")}
        {btn(false, () => editor.chain().focus().redo().run(), "↪", "Redo")}
      </div>

      {/* Writing area */}
      <div style={{ padding: "1.25rem 1.5rem", minHeight: 320 }}>
        <EditorContent editor={editor} />
      </div>

      {/* Word count */}
      <div style={{
        padding: "6px 12px",
        borderTop: "1px solid rgba(13,31,60,0.07)",
        background: "#f5f0e8",
        textAlign: "right",
        color: "#8fa3b1",
        fontSize: "0.7rem",
        fontFamily: "Inter, sans-serif",
      }}>
        {editor.storage.characterCount.words()} words · {editor.storage.characterCount.characters()} chars
      </div>

      <style>{`
        .tiptap-editor .ProseMirror { outline: none; min-height: 280px; }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: #8fa3b1; content: attr(data-placeholder);
          float: left; height: 0; pointer-events: none;
        }
        /* Hide scrollbar on toolbar */
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
