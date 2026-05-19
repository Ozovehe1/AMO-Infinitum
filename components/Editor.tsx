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

type ToolBtn = {
  label: string;
  title: string;
  active: boolean;
  action: () => void;
  style?: React.CSSProperties;
};

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
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const tools: (ToolBtn | "sep")[] = [
    { label: "H1", title: "Heading 1", active: editor.isActive("heading", { level: 1 }), action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "H2", title: "Heading 2", active: editor.isActive("heading", { level: 2 }), action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "H3", title: "Heading 3", active: editor.isActive("heading", { level: 3 }), action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    "sep",
    { label: "B", title: "Bold", active: editor.isActive("bold"), action: () => editor.chain().focus().toggleBold().run(), style: { fontWeight: 700 } },
    { label: "I", title: "Italic", active: editor.isActive("italic"), action: () => editor.chain().focus().toggleItalic().run(), style: { fontStyle: "italic" } },
    { label: "U", title: "Underline", active: editor.isActive("underline"), action: () => editor.chain().focus().toggleUnderline().run(), style: { textDecoration: "underline" } },
    { label: "Mark", title: "Highlight", active: editor.isActive("highlight"), action: () => editor.chain().focus().toggleHighlight().run() },
    { label: "Stk", title: "Strikethrough", active: editor.isActive("strike"), action: () => editor.chain().focus().toggleStrike().run(), style: { textDecoration: "line-through" } },
    "sep",
    { label: "• List", title: "Bullet list", active: editor.isActive("bulletList"), action: () => editor.chain().focus().toggleBulletList().run() },
    { label: "1. List", title: "Numbered list", active: editor.isActive("orderedList"), action: () => editor.chain().focus().toggleOrderedList().run() },
    "sep",
    { label: "Quote", title: "Blockquote", active: editor.isActive("blockquote"), action: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Code", title: "Inline code", active: editor.isActive("code"), action: () => editor.chain().focus().toggleCode().run(), style: { fontFamily: "monospace" } },
    { label: "{ }", title: "Code block", active: editor.isActive("codeBlock"), action: () => editor.chain().focus().toggleCodeBlock().run() },
    "sep",
    { label: "Link", title: "Link", active: editor.isActive("link"), action: setLink },
    { label: "---", title: "Divider", active: false, action: () => editor.chain().focus().setHorizontalRule().run() },
    "sep",
    { label: "Undo", title: "Undo", active: false, action: () => editor.chain().focus().undo().run() },
    { label: "Redo", title: "Redo", active: false, action: () => editor.chain().focus().redo().run() },
  ];

  return (
    <div style={{ border: "1px solid rgba(13,31,60,0.18)", borderRadius: 8, overflow: "hidden", background: "#fffef9" }}>
      {/* Scrollable toolbar — swipe left for more */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4,
        padding: "8px 10px",
        borderBottom: "1px solid rgba(13,31,60,0.1)",
        background: "#f5f0e8",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        msOverflowStyle: "none",
        scrollbarWidth: "none",
      }}>
        {tools.map((tool, i) => {
          if (tool === "sep") {
            return <div key={`sep-${i}`} style={{ width: 1, background: "rgba(13,31,60,0.15)", margin: "0 2px", height: 22, alignSelf: "center", flexShrink: 0 }} />;
          }
          return (
            <button
              key={tool.title}
              // onPointerDown fires before blur — keeps editor focused on mobile
              onPointerDown={e => { e.preventDefault(); tool.action(); }}
              title={tool.title}
              style={{
                height: 36,
                minWidth: 36,
                padding: "0 8px",
                background: tool.active ? "#2d7d9a" : "transparent",
                color: tool.active ? "#fff" : "#0d1f3c",
                border: "1px solid " + (tool.active ? "#2d7d9a" : "rgba(13,31,60,0.18)"),
                borderRadius: 5,
                cursor: "pointer",
                fontSize: "0.78rem",
                fontFamily: "Inter, sans-serif",
                fontWeight: 500,
                flexShrink: 0,
                whiteSpace: "nowrap",
                display: "flex", alignItems: "center", justifyContent: "center",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
                ...tool.style,
              }}
            >
              {tool.label}
            </button>
          );
        })}
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

      <style>{`
        .tiptap-editor .ProseMirror {
          outline: none;
          min-height: 260px;
          font-size: 1rem;
          line-height: 1.75;
        }
        .tiptap-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: #8fa3b1;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
