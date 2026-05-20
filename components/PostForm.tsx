"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Editor as TiptapEditorType } from "@tiptap/core";

function timeSince(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return m === 1 ? "1 min ago" : `${m} mins ago`;
}

const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 240 }} />,
});

interface Category { id: number; name: string; slug: string; color: string; }
interface PostData {
  id?: number; slug?: string; title?: string; content?: string;
  excerpt?: string; coverImage?: string | null;
  published?: boolean; featured?: boolean;
  categories?: { category: Category }[];
}

export default function PostForm({ post }: { post?: PostData }) {
  const router = useRouter();
  const coverImgRef = useRef<HTMLInputElement>(null);
  const bodyImgRef  = useRef<HTMLInputElement>(null);

  // Core post state
  const [postId,      setPostId]      = useState<number | undefined>(post?.id);
  const [postSlug,    setPostSlug]    = useState<string | undefined>(post?.slug);
  const [title,       setTitle]       = useState(post?.title || "");
  const [content,     setContent]     = useState(post?.content || "");
  const [excerpt,     setExcerpt]     = useState(post?.excerpt || "");
  const [coverImage,  setCoverImage]  = useState(post?.coverImage || "");
  const [published,   setPublished]   = useState(post?.published || false);
  const [featured,    setFeatured]    = useState(post?.featured || false);
  const [selectedCats, setSelectedCats] = useState<number[]>(
    post?.categories?.map(c => c.category.id) || []
  );
  const [categories, setCategories] = useState<Category[]>([]);

  // Save/upload state
  const [saving,     setSaving]     = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState("");
  const [saved,      setSaved]      = useState(false);
  const [lastSaved,  setLastSaved]  = useState<Date | null>(null);

  // UI state
  const [sheetOpen,      setSheetOpen]      = useState(false);
  const [styleOpen,      setStyleOpen]      = useState(false);
  const [alignOpen,      setAlignOpen]      = useState(false);
  const [catPickerOpen,  setCatPickerOpen]  = useState(false);
  const [mobileUrlMode,  setMobileUrlMode]  = useState<"link" | "image" | null>(null);
  const [mobileUrlValue, setMobileUrlValue] = useState("");
  const [deleting,       setDeleting]       = useState(false);

  // Mobile TipTap editor instance (exposed via onEditorReady)
  const [mobileEditor, setMobileEditor] = useState<TiptapEditorType | null>(null);
  // Force re-render when editor selection changes (for toolbar active states)
  const [, setEditorVersion] = useState(0);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  // Subscribe to editor transactions so toolbar active-states stay in sync
  useEffect(() => {
    if (!mobileEditor) return;
    const handler = () => setEditorVersion(v => v + 1);
    mobileEditor.on("transaction", handler);
    return () => { mobileEditor.off("transaction", handler); };
  }, [mobileEditor]);

  // ── Save logic ──────────────────────────────────────────
  const performSave = useCallback(async (options: { publish?: boolean; silent?: boolean } = {}) => {
    if (!title.trim() || !content.trim() || content === "<p></p>") return false;
    if (options.silent) setAutoSaving(true);
    else { setError(""); setSaving(true); }

    const body = { title, content, excerpt, coverImage, published: options.publish ?? published, featured, categoryIds: selectedCats };
    const url    = postId ? `/api/posts/${postId}` : "/api/posts";
    const method = postId ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        if (data.slug) setPostSlug(data.slug);
        if (!postId) {
          setPostId(data.id);
          if (options.silent) router.replace(`/inkwell/posts/${data.id}`);
          else router.push(`/inkwell/posts/${data.id}`);
        }
        if (options.publish !== undefined) setPublished(options.publish);
        setLastSaved(new Date());
        if (!options.silent) {
          setSaved(true); setSheetOpen(false);
          setTimeout(() => setSaved(false), 3000);
        }
        return true;
      } else {
        if (!options.silent) { const d = await res.json(); setError(d.error || "Something went wrong."); }
        return false;
      }
    } catch {
      if (!options.silent) setError("Network error. Try again.");
      return false;
    } finally {
      if (options.silent) setAutoSaving(false);
      else setSaving(false);
    }
  }, [title, content, excerpt, coverImage, published, featured, selectedCats, postId, router]);

  // Auto-save: 3 s after last change
  useEffect(() => {
    if (!title.trim() || !content.trim() || content === "<p></p>") return;
    const t = setTimeout(() => performSave({ silent: true }), 3000);
    return () => clearTimeout(t);
  }, [performSave]);

  const save = async (publish?: boolean) => {
    if (!title.trim()) { setError("Add a title first."); return; }
    if (!content.trim() || content === "<p></p>") { setError("Write something first."); return; }
    await performSave({ publish });
  };

  // ── Image upload ─────────────────────────────────────────
  const uploadCover = async (file: File) => {
    setUploading(true); setError("");
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setCoverImage(data.url);
      else setError(data.error || "Upload failed.");
    } catch { setError("Upload failed — check your connection."); }
    finally { setUploading(false); }
  };

  const uploadBodyImage = useCallback(async (file: File) => {
    if (!mobileEditor) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) { const { url } = await res.json(); mobileEditor.chain().focus().setImage({ src: url }).run(); return; }
    } catch { /* fall through */ }
    const reader = new FileReader();
    reader.onload = e => { if (e.target?.result) mobileEditor.chain().focus().setImage({ src: e.target.result as string }).run(); };
    reader.readAsDataURL(file);
  }, [mobileEditor]);

  const submitMobileUrl = useCallback(() => {
    if (!mobileEditor || !mobileUrlMode) return;
    const val = mobileUrlValue.trim();
    if (mobileUrlMode === "link") {
      if (!val) mobileEditor.chain().focus().extendMarkRange("link").unsetLink().run();
      else mobileEditor.chain().focus().extendMarkRange("link").setLink({ href: val }).run();
    } else {
      if (val) mobileEditor.chain().focus().setImage({ src: val }).run();
    }
    setMobileUrlMode(null); setMobileUrlValue("");
    mobileEditor.commands.focus();
  }, [mobileEditor, mobileUrlMode, mobileUrlValue]);

  const toggleCat = (id: number) =>
    setSelectedCats(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const isEdit = !!postId;

  // ── Toolbar button builder ────────────────────────────────
  const TB = (label: string, action: () => void, active?: boolean, extraStyle?: React.CSSProperties) => (
    <button
      key={label}
      onPointerDown={e => { e.preventDefault(); action(); }}
      style={{
        height: 38, padding: "0 9px",
        background: active ? "rgba(13,31,60,0.08)" : "transparent",
        color: "#1a1a1a", border: "none", borderRadius: 4,
        cursor: "pointer", fontSize: "0.82rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
        flexShrink: 0, display: "flex", alignItems: "center",
        touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
        ...extraStyle,
      }}
    >{label}</button>
  );

  const TSep = () => (
    <div style={{ width: 1, background: "rgba(0,0,0,0.12)", height: 18, margin: "0 3px", alignSelf: "center", flexShrink: 0 }} />
  );

  // ── Sidebar styles (desktop) ──────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#fffef9",
    border: "1px solid rgba(13,31,60,0.15)", borderRadius: 8,
    padding: "0.875rem 1rem", fontFamily: "Inter, sans-serif",
    fontSize: "0.95rem", color: "#0d1f3c", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.7rem",
    letterSpacing: "0.08em", textTransform: "uppercase", color: "#8fa3b1", marginBottom: "0.4rem",
  };

  // ── Status pill content ───────────────────────────────────
  const statusText = error
    ? "Error"
    : saved ? "Saved"
    : autoSaving ? "Saving…"
    : lastSaved ? `Saved ${timeSince(lastSaved)}`
    : published ? "Published" : "Draft";
  const statusDot = saved || lastSaved ? "#c8a97e" : "#8fa3b1";

  return (
    <>
      {/* ════════════════════════════════════
          MOBILE — Substack-style full canvas
      ════════════════════════════════════ */}
      <div className="mobile-write-wrap" style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* Backdrop for dropdowns */}
        {(styleOpen || alignOpen || catPickerOpen) && (
          <div onClick={() => { setStyleOpen(false); setAlignOpen(false); setCatPickerOpen(false); }}
            style={{ position: "fixed", inset: 0, zIndex: 310 }} />
        )}

        {/* ── Top bar ─────────────────────────────── */}
        <div style={{
          height: 52, display: "flex", alignItems: "center",
          padding: "0 12px", gap: 8,
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          background: "#fff", flexShrink: 0,
        }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "#555", padding: "8px 4px", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1, display: "flex", alignItems: "center" }}
          >‹</button>

          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              border: `1px solid ${error ? "rgba(192,64,64,0.3)" : "rgba(0,0,0,0.15)"}`,
              borderRadius: 20, padding: "4px 12px",
              fontFamily: "system-ui, sans-serif", fontSize: "0.78rem",
              color: error ? "#c04040" : "#333",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: error ? "#e07070" : statusDot,
                transition: "background 0.3s",
              }} />
              {statusText}
            </span>
          </div>

          <button
            onClick={() => setSheetOpen(true)}
            style={{
              background: "#0d1f3c", color: "#c8a97e",
              border: "none", borderRadius: 8,
              padding: "8px 18px",
              fontFamily: "system-ui, sans-serif",
              fontSize: "0.875rem", fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.02em",
            }}
          >Continue</button>
        </div>

        {/* ── Toolbar ─────────────────────────────── */}
        {mobileUrlMode ? (
          /* URL input replaces toolbar row */
          <div style={{
            height: 48, display: "flex", alignItems: "center", gap: 8,
            padding: "0 12px", borderBottom: "1px solid rgba(0,0,0,0.07)",
            background: "#fff", flexShrink: 0,
          }}>
            <input
              autoFocus
              value={mobileUrlValue}
              onChange={e => setMobileUrlValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); submitMobileUrl(); }
                if (e.key === "Escape") { setMobileUrlMode(null); setMobileUrlValue(""); }
              }}
              placeholder={mobileUrlMode === "link" ? "Paste a link URL…" : "Paste image URL…"}
              style={{
                flex: 1, background: "#f5f5f5", border: "none",
                borderRadius: 6, padding: "8px 12px",
                fontFamily: "system-ui, sans-serif", fontSize: "0.875rem",
                outline: "none", color: "#1a1a1a",
              }}
            />
            <button
              onPointerDown={e => { e.preventDefault(); submitMobileUrl(); }}
              style={{
                background: "#0d1f3c", color: "#c8a97e",
                border: "none", borderRadius: 6,
                padding: "7px 14px",
                fontFamily: "system-ui, sans-serif", fontSize: "0.82rem",
                fontWeight: 700, cursor: "pointer", flexShrink: 0,
              }}
            >{mobileUrlMode === "link" ? "Add Link" : "Insert"}</button>
            <button
              onPointerDown={e => { e.preventDefault(); setMobileUrlMode(null); setMobileUrlValue(""); }}
              style={{ background: "none", border: "none", color: "#888", fontSize: "1.1rem", cursor: "pointer", padding: "4px", flexShrink: 0 }}
            >✕</button>
          </div>
        ) : (
          <div style={{
            height: 44, display: "flex", alignItems: "center",
            padding: "0 4px",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            background: "#fff",
            overflowX: "auto", WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none", flexShrink: 0,
          }}>
            {/* Undo / Redo */}
            {TB("↩", () => mobileEditor?.chain().focus().undo().run())}
            {TB("↪", () => mobileEditor?.chain().focus().redo().run())}
            <TSep />

            {/* Style dropdown */}
            <div style={{ position: "relative", zIndex: 320, flexShrink: 0 }}>
              <button
                onPointerDown={e => { e.preventDefault(); setStyleOpen(s => !s); setCatPickerOpen(false); }}
                style={{
                  height: 38, padding: "0 9px",
                  background: "transparent", color: "#1a1a1a",
                  border: "none", borderRadius: 4, cursor: "pointer",
                  fontSize: "0.82rem", fontFamily: "system-ui, sans-serif",
                  display: "flex", alignItems: "center", gap: 4,
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                  flexShrink: 0,
                }}
              >Style <span style={{ fontSize: "0.6rem" }}>▾</span></button>
              {styleOpen && (
                <div style={{
                  position: "absolute", top: "100%", left: 0,
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 8,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  minWidth: 170, zIndex: 320, overflow: "hidden",
                }}>
                  {[
                    { label: "Normal text", fs: "0.95rem", fw: 400, action: () => mobileEditor?.chain().focus().setParagraph().run() },
                    { label: "Heading 1",   fs: "1.3rem",  fw: 700, action: () => mobileEditor?.chain().focus().toggleHeading({ level: 1 }).run() },
                    { label: "Heading 2",   fs: "1.1rem",  fw: 700, action: () => mobileEditor?.chain().focus().toggleHeading({ level: 2 }).run() },
                    { label: "Heading 3",   fs: "0.95rem", fw: 600, action: () => mobileEditor?.chain().focus().toggleHeading({ level: 3 }).run() },
                  ].map(item => (
                    <button
                      key={item.label}
                      onPointerDown={e => { e.preventDefault(); item.action(); setStyleOpen(false); }}
                      style={{
                        display: "block", width: "100%", padding: "10px 16px",
                        background: "none", border: "none", textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: item.fs, fontWeight: item.fw, color: "#1a1a1a",
                        borderBottom: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >{item.label}</button>
                  ))}
                </div>
              )}
            </div>
            <TSep />

            {/* Inline formatting */}
            {TB("B",    () => mobileEditor?.chain().focus().toggleBold().run(),       mobileEditor?.isActive("bold"),      { fontWeight: 700 })}
            {TB("I",    () => mobileEditor?.chain().focus().toggleItalic().run(),     mobileEditor?.isActive("italic"),    { fontStyle: "italic" })}
            {TB("U",    () => mobileEditor?.chain().focus().toggleUnderline().run(),  mobileEditor?.isActive("underline"), { textDecoration: "underline" })}
            {TB("S",    () => mobileEditor?.chain().focus().toggleStrike().run(),     mobileEditor?.isActive("strike"),    { textDecoration: "line-through" })}
            {TB("Mark", () => mobileEditor?.chain().focus().toggleHighlight().run(),  mobileEditor?.isActive("highlight"))}
            {TB("</>",  () => mobileEditor?.chain().focus().toggleCode().run(),       mobileEditor?.isActive("code"),      { fontFamily: "monospace", fontSize: "0.75rem" })}
            <TSep />

            {/* Alignment dropdown */}
            <div style={{ position: "relative", zIndex: 320, flexShrink: 0 }}>
              <button
                onPointerDown={e => { e.preventDefault(); setAlignOpen(s => !s); setStyleOpen(false); setCatPickerOpen(false); }}
                style={{
                  height: 38, padding: "0 9px",
                  background: alignOpen ? "rgba(13,31,60,0.08)" : "transparent",
                  color: "#1a1a1a", border: "none", borderRadius: 4, cursor: "pointer",
                  fontSize: "0.82rem", fontFamily: "system-ui, sans-serif",
                  display: "flex", alignItems: "center", gap: 4,
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent", flexShrink: 0,
                }}
              >Align <span style={{ fontSize: "0.6rem" }}>▾</span></button>
              {alignOpen && (
                <div style={{
                  position: "absolute", top: "100%", left: 0,
                  background: "#fff", border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  minWidth: 130, zIndex: 320, overflow: "hidden",
                }}>
                  {[
                    { label: "⬅ Left",   action: () => mobileEditor?.chain().focus().setTextAlign("left").run()   },
                    { label: "↔ Center", action: () => mobileEditor?.chain().focus().setTextAlign("center").run() },
                    { label: "➡ Right",  action: () => mobileEditor?.chain().focus().setTextAlign("right").run()  },
                  ].map(item => (
                    <button
                      key={item.label}
                      onPointerDown={e => { e.preventDefault(); item.action(); setAlignOpen(false); }}
                      style={{
                        display: "block", width: "100%", padding: "10px 16px",
                        background: "none", border: "none", textAlign: "left",
                        cursor: "pointer", fontFamily: "system-ui, sans-serif",
                        fontSize: "0.88rem", color: "#1a1a1a",
                        borderBottom: "1px solid rgba(0,0,0,0.05)",
                      }}
                    >{item.label}</button>
                  ))}
                </div>
              )}
            </div>
            <TSep />

            {/* Link */}
            {TB("🔗", () => {
              const href = mobileEditor?.getAttributes("link").href || "";
              setMobileUrlValue(href);
              setMobileUrlMode("link");
            }, mobileEditor?.isActive("link"))}

            {/* Image from gallery */}
            <button
              onPointerDown={e => { e.preventDefault(); bodyImgRef.current?.click(); }}
              style={{ height: 38, padding: "0 9px", background: "transparent", color: "#1a1a1a", border: "none", borderRadius: 4, cursor: "pointer", fontSize: "0.9rem", flexShrink: 0, display: "flex", alignItems: "center", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            >📷</button>

            {/* Image by URL */}
            {TB("Img", () => { setMobileUrlValue(""); setMobileUrlMode("image"); }, mobileUrlMode === "image")}
            <TSep />

            {/* Lists + blocks */}
            {TB("•",  () => mobileEditor?.chain().focus().toggleBulletList().run(),  mobileEditor?.isActive("bulletList"))}
            {TB("1.", () => mobileEditor?.chain().focus().toggleOrderedList().run(), mobileEditor?.isActive("orderedList"))}
            {TB("❝",  () => mobileEditor?.chain().focus().toggleBlockquote().run(), mobileEditor?.isActive("blockquote"))}
            {TB("—",  () => mobileEditor?.chain().focus().setHorizontalRule().run())}
          </div>
        )}

        {/* ── Scrollable writing canvas ──────────────── */}
        <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>

          {/* Title */}
          <textarea
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              const t = e.target; t.style.height = "auto"; t.style.height = t.scrollHeight + "px";
            }}
            placeholder="Title"
            rows={1}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "transparent", border: "none", outline: "none", resize: "none",
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "2.25rem", fontWeight: 700, color: "#1a1a1a",
              lineHeight: 1.2, padding: "20px 16px 6px",
              overflowY: "hidden",
            }}
          />

          {/* Subtitle / Excerpt */}
          <textarea
            value={excerpt}
            onChange={e => {
              setExcerpt(e.target.value);
              const t = e.target; t.style.height = "auto"; t.style.height = t.scrollHeight + "px";
            }}
            placeholder="Add a subtitle…"
            rows={1}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "transparent", border: "none", outline: "none", resize: "none",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "1.05rem", color: "#888", lineHeight: 1.5,
              padding: "0 16px 12px", overflowY: "hidden",
            }}
          />

          {/* Category chips */}
          {(categories.length > 0 || selectedCats.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 12px", alignItems: "center" }}>
              {selectedCats.map(id => {
                const cat = categories.find(c => c.id === id);
                if (!cat) return null;
                return (
                  <span key={id} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "rgba(0,0,0,0.05)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 20, padding: "3px 8px 3px 10px",
                    fontFamily: "system-ui, sans-serif", fontSize: "0.78rem", color: "#444",
                  }}>
                    {cat.name}
                    <button
                      onPointerDown={e => { e.preventDefault(); toggleCat(id); }}
                      style={{ background: "rgba(0,0,0,0.12)", border: "none", borderRadius: "50%", width: 16, height: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: "0.65rem", padding: 0 }}
                    >✕</button>
                  </span>
                );
              })}
              {/* + to open category picker */}
              <div style={{ position: "relative", zIndex: 320 }}>
                <button
                  onPointerDown={e => { e.preventDefault(); setCatPickerOpen(o => !o); setStyleOpen(false); }}
                  style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "rgba(0,0,0,0.05)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    color: "#555", cursor: "pointer",
                    fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
                    touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                  }}
                >+</button>
                {catPickerOpen && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0,
                    background: "#fff", border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    minWidth: 160, zIndex: 320, overflow: "hidden",
                  }}>
                    {categories.filter(c => !selectedCats.includes(c.id)).length === 0 ? (
                      <p style={{ padding: "10px 14px", color: "#999", fontFamily: "system-ui, sans-serif", fontSize: "0.8rem", margin: 0 }}>
                        All categories added
                      </p>
                    ) : categories.filter(c => !selectedCats.includes(c.id)).map(cat => (
                      <button
                        key={cat.id}
                        onPointerDown={e => { e.preventDefault(); toggleCat(cat.id); setCatPickerOpen(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          width: "100%", padding: "10px 14px",
                          background: "none", border: "none",
                          textAlign: "left", cursor: "pointer",
                          fontFamily: "system-ui, sans-serif", fontSize: "0.875rem",
                          color: "#1a1a1a", borderBottom: "1px solid rgba(0,0,0,0.05)",
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divider before body */}
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 0 4px" }} />

          {/* Body editor — compact, borderless */}
          <Editor
            content={content}
            onChange={setContent}
            placeholder="Start writing…"
            compact
            onEditorReady={setMobileEditor}
          />
        </div>

        {/* ── Bottom bar ──────────────────────────────── */}
        <div style={{
          height: 44, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 12px",
          borderTop: "1px solid rgba(0,0,0,0.07)",
          background: "#fff", flexShrink: 0,
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{
              width: 30, height: 30, borderRadius: "50%",
              border: "1px solid rgba(0,0,0,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.8rem", color: "#666",
            }}>ⓘ</span>
          </div>
          <button
            onClick={() => setSheetOpen(true)}
            title="Post settings"
            style={{
              width: 30, height: 30, borderRadius: "50%",
              border: "1px solid rgba(0,0,0,0.1)",
              background: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.85rem", color: "#666",
            }}
          >⚙</button>
        </div>

        {/* Body image hidden input */}
        <input ref={bodyImgRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadBodyImage(f); e.target.value = ""; }}
        />
      </div>

      {/* ════════════════════════════════════
          DESKTOP — two-column layout
      ════════════════════════════════════ */}
      <div className="desktop-write-wrap" style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: "2rem", alignItems: "start" }}>

          {/* Editor column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Post Title"
              style={{ ...inputStyle, fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, padding: "1rem 1.25rem", border: "none", borderBottom: "2px solid rgba(13,31,60,0.1)", borderRadius: 0, background: "transparent" }}
            />
            <div>
              <label style={labelStyle}>Excerpt <span style={{ color: "#c8a97e" }}>(optional)</span></label>
              <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="A short teaser shown in the post list…" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <Editor content={content} onChange={setContent} />
            {error && <div style={{ background: "#e0707018", border: "1px solid #e0707030", color: "#c04040", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>{error}</div>}
            {saved && <div style={{ background: "#4a9e7a18", border: "1px solid #4a9e7a30", color: "#2d7a5a", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>✓ Saved</div>}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "1.5rem" }}>
            <SettingsPanel {...{ published, featured, setFeatured, save, saving, isEdit, coverImage, setCoverImage, uploading, uploadCover, coverImgRef, categories, selectedCats, toggleCat, inputStyle, labelStyle, postSlug }} />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          BOTTOM SHEET — publish settings (mobile)
      ════════════════════════════════════ */}
      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(13,31,60,0.5)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 401,
            background: "#fffef9", borderRadius: "18px 18px 0 0",
            boxShadow: "0 -8px 40px rgba(13,31,60,0.18)",
            maxHeight: "88vh", overflowY: "auto",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}>
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "0.875rem 0 0" }}>
              <div style={{ width: 36, height: 4, background: "rgba(13,31,60,0.15)", borderRadius: 2 }} />
            </div>

            {/* Sheet header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1.25rem 0.625rem", borderBottom: "1px solid rgba(13,31,60,0.07)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#0d1f3c", margin: 0 }}>
                {published ? "Update post" : "Ready to publish?"}
              </h3>
              <button onClick={() => setSheetOpen(false)} style={{ background: "none", border: "none", color: "#8fa3b1", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Status badge */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#3a5068" }}>Status</span>
                <span style={{ background: published ? "#4a9e7a18" : "#c8a97e18", color: published ? "#4a9e7a" : "#c8a97e", border: `1px solid ${published ? "#4a9e7a30" : "#c8a97e30"}`, padding: "0.2rem 0.875rem", borderRadius: 20, fontFamily: "Inter, sans-serif", fontSize: "0.72rem", textTransform: "uppercase" }}>
                  {published ? "Published" : "Draft"}
                </span>
              </div>

              {/* Share link (when published) */}
              {published && postSlug && <ShareRow slug={postSlug} />}

              {/* Featured */}
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: 18, height: 18, accentColor: "#c8a97e" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "#3a5068" }}>Pin as Featured post</span>
              </label>

              {/* Cover image */}
              <div>
                <label style={labelStyle}>Cover Image</label>
                <button
                  onPointerDown={e => { e.preventDefault(); coverImgRef.current?.click(); }}
                  disabled={uploading}
                  style={{ width: "100%", background: uploading ? "rgba(45,125,154,0.1)" : "rgba(45,125,154,0.06)", color: "#2d7d9a", border: "1.5px dashed rgba(45,125,154,0.35)", borderRadius: 10, padding: "0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", cursor: uploading ? "default" : "pointer", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  {uploading ? <><SpinnerIcon />Uploading…</> : <>📷 Upload from gallery</>}
                </button>
                <input value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="Or paste image URL…" style={{ ...inputStyle, fontSize: "0.85rem" }} />
                {coverImage && (
                  <div style={{ marginTop: "0.625rem", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(13,31,60,0.1)", position: "relative" }}>
                    <img src={coverImage} alt="Cover" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <button onClick={() => setCoverImage("")} style={{ position: "absolute", top: 8, right: 8, background: "rgba(13,31,60,0.7)", color: "#fff", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                )}
              </div>

              {error && (
                <div style={{ background: "#e0707018", border: "1px solid #e0707030", color: "#c04040", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>{error}</div>
              )}

              {/* Publish actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", paddingTop: "0.25rem" }}>
                <button onClick={() => save(true)} disabled={saving} style={{ background: "#0d1f3c", color: "#c8a97e", border: "none", borderRadius: 12, padding: "1rem", fontFamily: "Inter, sans-serif", fontSize: "1rem", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Publishing…" : published ? "Update Post" : "Publish Now"}
                </button>
                <button onClick={() => save(false)} disabled={saving} style={{ background: "transparent", color: "#3a5068", border: "1px solid rgba(13,31,60,0.2)", borderRadius: 12, padding: "0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", cursor: "pointer" }}>
                  Save as Draft
                </button>
                {isEdit && published && (
                  <button onClick={() => save(false)} disabled={saving} style={{ background: "transparent", color: "#c04040", border: "1px solid rgba(192,64,64,0.25)", borderRadius: 12, padding: "0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", cursor: "pointer" }}>
                    Unpublish
                  </button>
                )}
                {isEdit && (
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this post? This cannot be undone.")) return;
                      setDeleting(true);
                      await fetch(`/api/posts/${postId}`, { method: "DELETE" });
                      router.push("/inkwell/posts");
                    }}
                    disabled={deleting}
                    style={{ background: "transparent", color: "#c04040", border: "none", borderRadius: 12, padding: "0.625rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer", opacity: deleting ? 0.6 : 1 }}
                  >
                    {deleting ? "Deleting…" : "🗑 Delete Post"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cover image file input */}
      <input ref={coverImgRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }}
      />

      <style>{`
        .mobile-write-wrap  { display: none; }
        .desktop-write-wrap { display: block; }
        @media (max-width: 768px) {
          .mobile-write-wrap  { display: flex !important; }
          .desktop-write-wrap { display: none !important; }
        }
      `}</style>
    </>
  );
}

/* ── Desktop sidebar panel ───────────────────────────── */
interface SettingsProps {
  published: boolean; featured: boolean;
  setFeatured: (v: boolean) => void;
  save: (p?: boolean) => void; saving: boolean; isEdit: boolean;
  coverImage: string; setCoverImage: (v: string) => void;
  uploading: boolean; uploadCover: (f: File) => void;
  coverImgRef: React.RefObject<HTMLInputElement | null>;
  categories: { id: number; name: string; color: string }[];
  selectedCats: number[]; toggleCat: (id: number) => void;
  inputStyle: React.CSSProperties; labelStyle: React.CSSProperties;
  postSlug?: string;
}

function SettingsPanel({ published, featured, setFeatured, save, saving, isEdit, coverImage, setCoverImage, uploading, uploadCover, coverImgRef, categories, selectedCats, toggleCat, inputStyle, labelStyle, postSlug }: SettingsProps) {
  return (
    <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.1)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid rgba(13,31,60,0.07)", background: "#f5f0e8" }}>
        <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "#0d1f3c", margin: 0, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Publish</h3>
      </div>
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#3a5068" }}>Status</span>
          <span style={{ background: published ? "#4a9e7a18" : "#c8a97e18", color: published ? "#4a9e7a" : "#c8a97e", border: `1px solid ${published ? "#4a9e7a30" : "#c8a97e30"}`, padding: "0.15rem 0.7rem", borderRadius: 12, fontFamily: "Inter, sans-serif", fontSize: "0.72rem", textTransform: "uppercase" }}>
            {published ? "Published" : "Draft"}
          </span>
        </div>

        {published && postSlug && <ShareRow slug={postSlug} />}

        <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
          <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: 15, height: 15, accentColor: "#c8a97e" }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#3a5068" }}>Mark as Featured</span>
        </label>

        <button onClick={() => save(true)} disabled={saving} style={{ width: "100%", background: "#0d1f3c", color: "#c8a97e", border: "none", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : published ? "Update" : "Publish"}
        </button>
        <button onClick={() => save(false)} disabled={saving} style={{ width: "100%", background: "transparent", color: "#3a5068", border: "1px solid rgba(13,31,60,0.2)", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.875rem", cursor: "pointer" }}>
          Save as Draft
        </button>
        {isEdit && published && (
          <button onClick={() => save(false)} disabled={saving} style={{ width: "100%", background: "transparent", color: "#c04040", border: "1px solid rgba(192,64,64,0.25)", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer" }}>
            Unpublish
          </button>
        )}

        {/* Cover image */}
        <div style={{ borderTop: "1px solid rgba(13,31,60,0.07)", paddingTop: "1rem" }}>
          <label style={labelStyle}>Cover Image</label>
          <button onClick={() => coverImgRef.current?.click()} disabled={uploading} style={{ width: "100%", background: "rgba(45,125,154,0.06)", color: "#2d7d9a", border: "1.5px dashed rgba(45,125,154,0.35)", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            {uploading ? <><SpinnerIcon />Uploading…</> : <>📷 Upload</>}
          </button>
          <input value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="Or paste URL…" style={{ ...inputStyle, fontSize: "0.8rem" }} />
          {coverImage && (
            <div style={{ marginTop: "0.5rem", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(13,31,60,0.1)", position: "relative" }}>
              <img src={coverImage} alt="Cover" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <button onClick={() => setCoverImage("")} style={{ position: "absolute", top: 6, right: 6, background: "rgba(13,31,60,0.7)", color: "#fff", border: "none", borderRadius: 4, width: 24, height: 24, cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          )}
        </div>

        {/* Categories */}
        <div style={{ borderTop: "1px solid rgba(13,31,60,0.07)", paddingTop: "1rem" }}>
          <label style={labelStyle}>Categories</label>
          {categories.length === 0 ? (
            <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", margin: 0 }}>
              No categories. <Link href="/inkwell/categories" style={{ color: "#2d7d9a" }}>Create some.</Link>
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {categories.map(cat => (
                <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={selectedCats.includes(cat.id)} onChange={() => toggleCat(cat.id)} style={{ accentColor: cat.color }} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#3a5068" }}>{cat.name}</span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, marginLeft: "auto" }} />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShareRow({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://amo-infinitum.vercel.app";
  const link = `${siteUrl}/blog/${slug}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { window.prompt("Copy this link:", link); }
  };
  return (
    <div style={{ background: "rgba(45,125,154,0.06)", border: "1px solid rgba(45,125,154,0.2)", borderRadius: 10, padding: "0.875rem 1rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#8fa3b1", margin: 0 }}>Share this post</p>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#2d7d9a", margin: 0, wordBreak: "break-all" }}>{link}</p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onPointerDown={e => { e.preventDefault(); copy(); }} style={{ flex: 1, background: copied ? "#4a9e7a" : "#2d7d9a", color: "#fff", border: "none", borderRadius: 8, padding: "0.6rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}>
          {copied ? "✓ Copied!" : "Copy Link"}
        </button>
        <a href={link} target="_blank" rel="noreferrer" style={{ flex: 1, background: "transparent", color: "#2d7d9a", border: "1px solid rgba(45,125,154,0.3)", borderRadius: 8, padding: "0.6rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", textDecoration: "none", textAlign: "center" }}>
          View Live ↗
        </a>
      </div>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="8" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
