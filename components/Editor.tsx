"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
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

export default function Editor({ content, onChange, placeholder = "Begin writing your thoughts..." }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "editor-link" } }),
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

  const btnStyle = (active: boolean) => ({
    background: active ? "#2d7d9a" : "transparent",
    color: active ? "#fff" : "#0d1f3c",
    border: "1px solid " + (active ? "#2d7d9a" : "rgba(13,31,60,0.2)"),
    borderRadius: 4,
    padding: "0.3rem 0.5rem",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontFamily: "Inter, sans-serif",
    fontWeight: 500,
    transition: "all 0.15s",
    lineHeight: 1,
    minWidth: 28,
  });

  const sep = () => <div style={{ width: 1, background: "rgba(13,31,60,0.12)", margin: "0 0.25rem", height: 20, alignSelf: "center" }} />;

  return (
    <div style={{ border: "1px solid rgba(13,31,60,0.2)", borderRadius: 8, overflow: "hidden", background: "#fffef9" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", padding: "0.625rem 0.75rem", borderBottom: "1px solid rgba(13,31,60,0.1)", background: "#f5f0e8" }}>
        {/* Headings */}
        <button style={btnStyle(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</button>
        <button style={btnStyle(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</button>
        <button style={btnStyle(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</button>
        {sep()}
        {/* Formatting */}
        <button style={{ ...btnStyle(editor.isActive("bold")), fontWeight: 700 }} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">B</button>
        <button style={{ ...btnStyle(editor.isActive("italic")), fontStyle: "italic" }} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">I</button>
        <button style={{ ...btnStyle(editor.isActive("underline")), textDecoration: "underline" }} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">U</button>
        <button style={btnStyle(editor.isActive("highlight"))} onClick={() => editor.chain().focus().toggleHighlight().run()} title="Highlight">✦</button>
        <button style={btnStyle(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()} title="Strikethrough"><s>S</s></button>
        {sep()}
        {/* Lists */}
        <button style={btnStyle(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">• List</button>
        <button style={btnStyle(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list">1. List</button>
        {sep()}
        {/* Blocks */}
        <button style={btnStyle(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">&ldquo;</button>
        <button style={btnStyle(editor.isActive("code"))} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">`code`</button>
        <button style={btnStyle(editor.isActive("codeBlock"))} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code block">```</button>
        {sep()}
        {/* Link + HR */}
        <button style={btnStyle(editor.isActive("link"))} onClick={setLink} title="Link">🔗</button>
        <button style={btnStyle(false)} onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">—</button>
        {sep()}
        {/* History */}
        <button style={btnStyle(false)} onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">↩</button>
        <button style={btnStyle(false)} onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">↪</button>
      </div>

      {/* Editor area */}
      <div style={{ padding: "1.5rem 2rem", minHeight: 400 }}>
        <EditorContent editor={editor} />
      </div>

      {/* Word count */}
      <div style={{ padding: "0.4rem 0.75rem", borderTop: "1px solid rgba(13,31,60,0.08)", background: "#f5f0e8", textAlign: "right", color: "#8fa3b1", fontSize: "0.72rem", fontFamily: "Inter, sans-serif" }}>
        {editor.storage.characterCount.words()} words · {editor.storage.characterCount.characters()} chars
      </div>
    </div>
  );
}
