"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import type { Editor as TiptapEditorType } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExt from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import ImageExt from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { Node, mergeAttributes } from "@tiptap/core";
import { GrammarExtension, grammarPluginKey, buildGrammarDecos } from "@/lib/grammar-decorations";

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const YoutubeEmbed = Node.create({
  name: "youtubeEmbed",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return { videoId: { default: null } };
  },
  parseHTML() {
    return [{ tag: "div[data-youtube-video]" }];
  },
  renderHTML({ node }) {
    const id = node.attrs.videoId;
    if (!id) return ["div", {}];
    return ["div", mergeAttributes({ "data-youtube-video": "" }),
      ["iframe", {
        src: `https://www.youtube-nocookie.com/embed/${id}`,
        frameborder: "0",
        allowfullscreen: "true",
        allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
        style: "width:100%;aspect-ratio:16/9;height:auto;border-radius:8px;display:block;",
      }],
    ];
  },
});
import { useCallback, useEffect, useRef, useState } from "react";

interface EditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  compact?: boolean;
  onEditorReady?: (editor: TiptapEditorType) => void;
}

export default function Editor({
  content,
  onChange,
  placeholder = "Begin writing…",
  compact = false,
  onEditorReady,
}: EditorProps) {
  const imgInputRef = useRef<HTMLInputElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [urlBar, setUrlBar] = useState<{ mode: "link" | "image" | "youtube"; value: string } | null>(null);
  const [grammarOn, setGrammarOn] = useState(false);
  const [grammarLoading, setGrammarLoading] = useState(false);
  const [grammarError, setGrammarError] = useState(false);

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
      YoutubeEmbed,
      GrammarExtension,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: "tiptap-editor prose-amo" } },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (urlBar) setTimeout(() => urlInputRef.current?.focus(), 50);
  }, [urlBar?.mode]);

  const openLinkBar = useCallback(() => {
    if (!editor) return;
    if (urlBar?.mode === "link") { setUrlBar(null); return; }
    setUrlBar({ mode: "link", value: editor.getAttributes("link").href || "" });
  }, [editor, urlBar]);

  const openImageBar = useCallback(() => {
    if (urlBar?.mode === "image") { setUrlBar(null); return; }
    setUrlBar({ mode: "image", value: "" });
  }, [urlBar]);

  const submitUrl = useCallback(() => {
    if (!editor || !urlBar) return;
    const val = urlBar.value.trim();
    if (urlBar.mode === "link") {
      if (!val) editor.chain().focus().extendMarkRange("link").unsetLink().run();
      else editor.chain().focus().extendMarkRange("link").setLink({ href: val }).run();
    } else if (urlBar.mode === "youtube") {
      const videoId = getYouTubeId(val);
      if (videoId) editor.chain().focus().insertContent({ type: "youtubeEmbed", attrs: { videoId } }).run();
    } else {
      if (val) editor.chain().focus().setImage({ src: val }).run();
    }
    setUrlBar(null);
    editor.commands.focus();
  }, [editor, urlBar]);

  const uploadInlineImage = useCallback(async (file: File) => {
    if (!editor) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        editor.chain().focus().setImage({ src: url }).run();
        return;
      }
    } catch { /* fall through */ }
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result) editor.chain().focus().setImage({ src: e.target.result as string }).run();
    };
    reader.readAsDataURL(file);
  }, [editor]);

  const checkGrammar = useCallback(async () => {
    if (!editor || grammarLoading) return;
    const text = editor.getText();
    if (!text.trim()) return;
    setGrammarLoading(true);
    setGrammarError(false);
    try {
      const res = await fetch("/api/grammar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const { corrections } = await res.json();
        editor.view.dispatch(
          editor.state.tr.setMeta(grammarPluginKey, buildGrammarDecos(editor.state.doc, corrections || []))
        );
      } else {
        setGrammarError(true);
      }
    } catch { setGrammarError(true); }
    setGrammarLoading(false);
  }, [editor, grammarLoading]);

  if (!editor) return null;

  // ── COMPACT MODE: no chrome, used by PostForm mobile ──
  if (compact) {
    return (
      <div>
        <div style={{ padding: "0 16px 80px", minHeight: 240 }}>
          <EditorContent editor={editor} />
        </div>
        <input
          ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadInlineImage(f); e.target.value = ""; }}
        />
        <style>{`
          /* .tiptap-editor IS the ProseMirror contenteditable div — target it directly */
          .tiptap-editor {
            min-height: 220px !important;
            font-size: 1.05rem;
            line-height: 1.75;
            color: #1a1a1a;
            font-family: Georgia, 'Source Serif 4', serif;
            padding: 0 !important;
          }
          .tiptap-editor p { margin: 0 0 1.4em; padding: 0; }
          .tiptap-editor p.is-editor-empty:first-child::before {
            color: #aaa; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; font-family: system-ui, sans-serif;
          }
          .tiptap-editor h1 { font-size: 1.8rem; font-weight: 700; margin: 2rem 0 0.6rem; line-height: 1.2; font-family: 'Playfair Display', Georgia, serif; }
          .tiptap-editor h2 { font-size: 1.4rem; font-weight: 700; margin: 1.75rem 0 0.5rem; line-height: 1.25; font-family: 'Playfair Display', Georgia, serif; }
          .tiptap-editor h3 { font-size: 1.15rem; font-weight: 600; margin: 1.5rem 0 0.4rem; line-height: 1.3; font-family: 'Playfair Display', Georgia, serif; }
          .tiptap-editor blockquote { border-left: 3px solid #c8a97e; padding-left: 1.25rem; color: #555; margin: 1.5rem 0; font-style: italic; border-radius: 0; }
          .tiptap-editor ul { list-style-type: disc; padding-left: 1.75rem; margin: 0 0 1.4em; }
          .tiptap-editor ol { list-style-type: decimal; padding-left: 1.75rem; margin: 0 0 1.4em; }
          .tiptap-editor li { margin-bottom: 0.4em; }
          .tiptap-editor img { max-width: 100%; border-radius: 6px; margin: 1.5rem auto; display: block; }
          .tiptap-editor img.ProseMirror-selectednode { outline: 2px solid #0d1f3c; }
          .tiptap-editor a { color: #2d7d9a; text-decoration: underline; }
          .tiptap-editor code { background: rgba(0,0,0,0.06); padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.88em; font-family: 'Courier New', monospace; }
          .tiptap-editor pre { background: #0d1f3c; color: #f5f0e8; padding: 1rem 1.25rem; border-radius: 6px; overflow-x: auto; margin: 1.5rem 0; }
          .tiptap-editor pre code { background: none; padding: 0; color: inherit; font-size: 0.9em; }
          .tiptap-editor mark { background: #fff3b0; border-radius: 2px; padding: 0.05em 0.2em; }
          .tiptap-editor hr { border: none; border-top: 1px solid rgba(0,0,0,0.12); margin: 2rem 0; }
          .tiptap-editor [style*="text-align: center"] { text-align: center; }
          .tiptap-editor [style*="text-align: right"] { text-align: right; }
          .tiptap-editor [style*="text-align: justify"] { text-align: justify; }
          .tiptap-editor div[data-youtube-video] { margin: 1.5rem 0; }
          .tiptap-editor div[data-youtube-video] iframe { width: 100%; aspect-ratio: 16/9; height: auto; border-radius: 8px; display: block; }
          .grammar-error { text-decoration: underline wavy #e74c3c; text-decoration-skip-ink: none; background: rgba(231,76,60,0.06); border-radius: 2px; }
        `}</style>
      </div>
    );
  }

  // ── FULL MODE: complete editor with toolbar, used by desktop ──
  const btn = (
    active: boolean, action: () => void, label: string, title: string,
    extraStyle?: React.CSSProperties
  ) => (
    <button key={title} onPointerDown={e => { e.preventDefault(); action(); }} title={title}
      style={{
        height: 34, minWidth: 34, padding: "0 7px",
        background: active ? "#2d7d9a" : "transparent",
        color: active ? "#fff" : "#0d1f3c",
        border: "1px solid " + (active ? "#2d7d9a" : "rgba(13,31,60,0.15)"),
        borderRadius: 5, cursor: "pointer", fontSize: "0.77rem",
        fontFamily: "Inter, sans-serif", fontWeight: 500, flexShrink: 0,
        whiteSpace: "nowrap", display: "flex", alignItems: "center", justifyContent: "center",
        WebkitTapHighlightColor: "transparent", touchAction: "manipulation", ...extraStyle,
      }}
    >{label}</button>
  );

  const Sep = () => (
    <div style={{ width: 1, background: "rgba(13,31,60,0.12)", margin: "0 2px", height: 20, alignSelf: "center", flexShrink: 0 }} />
  );

  return (
    <div style={{ border: "1px solid rgba(13,31,60,0.15)", borderRadius: 8, overflow: "hidden", background: "#fffef9" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "7px 8px", borderBottom: "1px solid rgba(13,31,60,0.1)", background: "#f5f0e8", overflowX: "auto", WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
        {btn(editor.isActive("heading",{level:1}),()=>editor.chain().focus().toggleHeading({level:1}).run(),"H1","Heading 1")}
        {btn(editor.isActive("heading",{level:2}),()=>editor.chain().focus().toggleHeading({level:2}).run(),"H2","Heading 2")}
        {btn(editor.isActive("heading",{level:3}),()=>editor.chain().focus().toggleHeading({level:3}).run(),"H3","Heading 3")}
        <Sep />
        {btn(editor.isActive("bold"),()=>editor.chain().focus().toggleBold().run(),"B","Bold",{fontWeight:700})}
        {btn(editor.isActive("italic"),()=>editor.chain().focus().toggleItalic().run(),"I","Italic",{fontStyle:"italic"})}
        {btn(editor.isActive("underline"),()=>editor.chain().focus().toggleUnderline().run(),"U","Underline",{textDecoration:"underline"})}
        {btn(editor.isActive("strike"),()=>editor.chain().focus().toggleStrike().run(),"Stk","Strikethrough",{textDecoration:"line-through"})}
        {btn(editor.isActive("highlight"),()=>editor.chain().focus().toggleHighlight().run(),"Mark","Highlight")}
        <Sep />
        {btn(editor.isActive({textAlign:"left"}),()=>editor.chain().focus().setTextAlign("left").run(),"Left","Left")}
        {btn(editor.isActive({textAlign:"center"}),()=>editor.chain().focus().setTextAlign("center").run(),"Center","Center")}
        {btn(editor.isActive({textAlign:"right"}),()=>editor.chain().focus().setTextAlign("right").run(),"Right","Right")}
        <Sep />
        {btn(editor.isActive("bulletList"),()=>editor.chain().focus().toggleBulletList().run(),"• List","Bullet list")}
        {btn(editor.isActive("orderedList"),()=>editor.chain().focus().toggleOrderedList().run(),"1.","Numbered list")}
        {btn(editor.isActive("blockquote"),()=>editor.chain().focus().toggleBlockquote().run(),"Quote","Blockquote")}
        {btn(editor.isActive("codeBlock"),()=>editor.chain().focus().toggleCodeBlock().run(),"{ }","Code block")}
        <Sep />
        {btn(editor.isActive("link")||urlBar?.mode==="link",openLinkBar,"Link","Insert link")}
        <button onPointerDown={e=>{e.preventDefault();imgInputRef.current?.click();}} title="Insert image" style={{height:34,minWidth:34,padding:"0 7px",background:"transparent",color:"#0d1f3c",border:"1px solid rgba(13,31,60,0.15)",borderRadius:5,cursor:"pointer",fontSize:"0.77rem",fontFamily:"Inter, sans-serif",flexShrink:0,touchAction:"manipulation",WebkitTapHighlightColor:"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>📷</button>
        {btn(urlBar?.mode==="image",openImageBar,"Img URL","Image by URL")}
        {btn(false,()=>editor.chain().focus().setHorizontalRule().run(),"—","Divider")}
        {btn(urlBar?.mode==="youtube",()=>{ if(urlBar?.mode==="youtube"){setUrlBar(null);}else{setUrlBar({mode:"youtube",value:""}); } },"▶ YouTube","Embed YouTube video")}
        <Sep />
        {btn(false,()=>editor.chain().focus().undo().run(),"↩","Undo")}
        {btn(false,()=>editor.chain().focus().redo().run(),"↪","Redo")}
        <Sep />
        <button key="grammar" onPointerDown={e => {
          e.preventDefault();
          if (grammarOn) {
            editor.view.dispatch(editor.state.tr.setMeta(grammarPluginKey, buildGrammarDecos(editor.state.doc, [])));
            setGrammarOn(false);
            setGrammarError(false);
          } else {
            setGrammarOn(true);
            checkGrammar();
          }
        }} title={grammarError ? "Grammar check failed — click to retry" : "Toggle grammar checker"}
          style={{ height: 34, minWidth: 34, padding: "0 8px", background: grammarError ? "#e74c3c" : grammarOn ? "#4a9e7a" : "transparent", color: grammarError ? "#fff" : grammarOn ? "#fff" : "#0d1f3c", border: "1px solid " + (grammarError ? "#e74c3c" : grammarOn ? "#4a9e7a" : "rgba(13,31,60,0.15)"), borderRadius: 5, cursor: grammarLoading ? "default" : "pointer", fontSize: "0.75rem", fontFamily: "Inter, sans-serif", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, WebkitTapHighlightColor: "transparent", touchAction: "manipulation", opacity: grammarLoading ? 0.6 : 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>
          </svg>
          {grammarLoading ? "…" : grammarError ? "Failed" : "Grammar"}
        </button>
      </div>

      {urlBar && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "#eef4f7", borderBottom: "1px solid rgba(13,31,60,0.1)" }}>
          <input ref={urlInputRef} value={urlBar.value}
            onChange={e => setUrlBar(u => u ? { ...u, value: e.target.value } : null)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submitUrl(); } if (e.key === "Escape") setUrlBar(null); }}
            placeholder={urlBar.mode === "link" ? "Paste or type a URL…" : urlBar.mode === "youtube" ? "Paste YouTube URL…" : "Paste image URL…"}
            style={{ flex: 1, background: "#fff", border: "1px solid rgba(13,31,60,0.18)", borderRadius: 6, padding: "0.5rem 0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "#0d1f3c", outline: "none" }}
          />
          <button onPointerDown={e => { e.preventDefault(); submitUrl(); }}
            style={{ background: "#2d7d9a", color: "#fff", border: "none", borderRadius: 6, padding: "0.5rem 0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            {urlBar.mode === "link" ? "Add Link" : urlBar.mode === "youtube" ? "Embed" : "Insert"}
          </button>
          <button onPointerDown={e => { e.preventDefault(); setUrlBar(null); }}
            style={{ background: "transparent", color: "#8fa3b1", border: "none", padding: "0.5rem 0.25rem", fontSize: "1rem", cursor: "pointer", flexShrink: 0 }}>✕</button>
        </div>
      )}

      <div style={{ padding: "1.25rem 1rem", minHeight: 280 }}>
        <EditorContent editor={editor} />
      </div>

      <div style={{ padding: "4px 12px", borderTop: "1px solid rgba(13,31,60,0.07)", background: "#f5f0e8", textAlign: "right", color: "#8fa3b1", fontSize: "0.68rem", fontFamily: "Inter, sans-serif" }}>
        {editor.storage.characterCount.words()} words · {editor.storage.characterCount.characters()} chars
      </div>

      <input ref={imgInputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadInlineImage(f); e.target.value = ""; }}
      />

      <style>{`
        /* .tiptap-editor IS the ProseMirror div — target it directly, not as a descendant */
        .tiptap-editor { min-height: 240px; font-size: 1rem; line-height: 1.75; font-family: Georgia, 'Source Serif 4', serif; padding: 0 !important; }
        .tiptap-editor p { margin: 0 0 1.4em; }
        .tiptap-editor p.is-editor-empty:first-child::before { color: #8fa3b1; content: attr(data-placeholder); float: left; height: 0; pointer-events: none; }
        .tiptap-editor h1 { font-family: 'Playfair Display', serif; font-size: 2rem; font-weight: 700; margin: 2rem 0 0.6rem; line-height: 1.2; }
        .tiptap-editor h2 { font-family: 'Playfair Display', serif; font-size: 1.5rem; font-weight: 700; margin: 1.75rem 0 0.5rem; line-height: 1.25; }
        .tiptap-editor h3 { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 600; margin: 1.5rem 0 0.4rem; line-height: 1.3; }
        .tiptap-editor blockquote { border-left: 3px solid #c8a97e; padding-left: 1.25rem; color: #555; margin: 1.5rem 0; font-style: italic; }
        .tiptap-editor ul { list-style-type: disc; margin: 0 0 1.4em; padding-left: 1.75rem; }
        .tiptap-editor ol { list-style-type: decimal; margin: 0 0 1.4em; padding-left: 1.75rem; }
        .tiptap-editor li { margin-bottom: 0.4em; }
        .tiptap-editor a { color: #2d7d9a; text-decoration: underline; }
        .tiptap-editor code { background: rgba(13,31,60,0.07); padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.88em; font-family: 'Courier New', monospace; }
        .tiptap-editor pre { background: #0d1f3c; color: #f5f0e8; padding: 1rem 1.25rem; border-radius: 6px; overflow-x: auto; margin: 1.5rem 0; }
        .tiptap-editor pre code { background: none; padding: 0; color: inherit; }
        .tiptap-editor mark { background: #fff3b0; padding: 0.05em 0.2em; border-radius: 2px; }
        .tiptap-editor img { max-width: 100%; border-radius: 6px; margin: 1.5rem auto; display: block; cursor: pointer; }
        .tiptap-editor img.ProseMirror-selectednode { outline: 2px solid #2d7d9a; }
        .tiptap-editor hr { border: none; border-top: 1px solid rgba(13,31,60,0.12); margin: 2rem 0; }
        .tiptap-editor [style*="text-align: center"] { text-align: center; }
        .tiptap-editor [style*="text-align: right"] { text-align: right; }
        .tiptap-editor [style*="text-align: justify"] { text-align: justify; }
        .tiptap-editor div[data-youtube-video] { margin: 1.5rem 0; }
        .tiptap-editor div[data-youtube-video] iframe { width: 100%; aspect-ratio: 16/9; height: auto; border-radius: 8px; display: block; }
        .tiptap-editor div[data-youtube-video].ProseMirror-selectednode iframe { outline: 2px solid #2d7d9a; border-radius: 8px; }
        .grammar-error { text-decoration: underline wavy #e74c3c; text-decoration-skip-ink: none; background: rgba(231,76,60,0.06); border-radius: 2px; }
      `}</style>
    </div>
  );
}
