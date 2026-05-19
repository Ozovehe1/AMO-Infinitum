"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

function timeSince(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return m === 1 ? "1 min ago" : `${m} mins ago`;
}

const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: 320, background: "#f5f0e8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>
      Loading editor…
    </div>
  ),
});

interface Category { id: number; name: string; slug: string; color: string; }
interface PostData {
  id?: number;
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string;
  coverImage?: string | null;
  published?: boolean;
  featured?: boolean;
  categories?: { category: Category }[];
}

export default function PostForm({ post }: { post?: PostData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postId, setPostId] = useState<number | undefined>(post?.id);
  const [postSlug, setPostSlug] = useState<string | undefined>(post?.slug);
  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const [published, setPublished] = useState(post?.published || false);
  const [featured, setFeatured] = useState(post?.featured || false);
  const [selectedCats, setSelectedCats] = useState<number[]>(
    post?.categories?.map(c => c.category.id) || []
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  // Core save — used by both manual actions and auto-save
  const performSave = useCallback(async (options: {
    publish?: boolean;
    silent?: boolean; // true = auto-save (no error UI, no redirect)
  } = {}) => {
    if (!title.trim() || !content.trim() || content === "<p></p>") return false;

    if (options.silent) setAutoSaving(true);
    else { setError(""); setSaving(true); }

    const body = {
      title, content, excerpt, coverImage,
      published: options.publish ?? published,
      featured, categoryIds: selectedCats,
    };
    const url = postId ? `/api/posts/${postId}` : "/api/posts";
    const method = postId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
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
          setSaved(true);
          setSheetOpen(false);
          setTimeout(() => setSaved(false), 3000);
        }
        return true;
      } else {
        if (!options.silent) {
          const data = await res.json();
          setError(data.error || "Something went wrong.");
        }
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

  // Auto-save: 3 s after last change (debounced via useCallback deps)
  useEffect(() => {
    if (!title.trim() || !content.trim() || content === "<p></p>") return;
    const timer = setTimeout(() => performSave({ silent: true }), 3000);
    return () => clearTimeout(timer);
  }, [performSave]);

  const save = async (publish?: boolean) => {
    if (!title.trim()) { setError("Add a title first."); return; }
    if (!content.trim() || content === "<p></p>") { setError("Write something first."); return; }
    await performSave({ publish });
  };

  const isEdit = !!postId;

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setCoverImage(data.url);
      } else {
        setError(data.error || "Upload failed.");
      }
    } catch {
      setError("Upload failed — check your connection.");
    } finally {
      setUploading(false);
    }
  };

  const toggleCat = (id: number) =>
    setSelectedCats(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#fffef9",
    border: "1px solid rgba(13,31,60,0.15)", borderRadius: 8,
    padding: "0.875rem 1rem", fontFamily: "Inter, sans-serif",
    fontSize: "0.95rem", color: "#0d1f3c", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.7rem",
    letterSpacing: "0.08em", textTransform: "uppercase", color: "#8fa3b1",
    marginBottom: "0.4rem",
  };

  return (
    <>
      {/* ══════════════════════════════════════════
          MOBILE LAYOUT  (≤ 768 px)
          True full-screen overlay — covers nav & headers
      ══════════════════════════════════════════ */}
      <div className="mobile-write-wrap" style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "#fffef9", display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>

        {/* ── Top bar ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 1rem",
          height: 52,
          borderBottom: "1px solid rgba(13,31,60,0.08)",
          background: "#fffef9",
          flexShrink: 0,
        }}>
          {/* Back */}
          <button
            onClick={() => router.back()}
            style={{
              background: "none", border: "none", color: "#3a5068",
              fontFamily: "Inter, sans-serif", fontSize: "0.9rem",
              cursor: "pointer", padding: "0.5rem 0", display: "flex", alignItems: "center", gap: "0.3rem",
            }}
          >
            ← Back
          </button>

          {/* Save status */}
          <span style={{
            fontFamily: "Inter, sans-serif", fontSize: "0.75rem",
            color: error ? "#c04040" : saved ? "#4a9e7a" : "#8fa3b1",
          }}>
            {error ? error
              : saved ? "✓ Saved"
              : autoSaving ? "Saving…"
              : lastSaved ? `Saved ${timeSince(lastSaved)}`
              : published ? "Published" : "Draft"}
          </span>

          {/* Continue */}
          <button
            onClick={() => setSheetOpen(true)}
            style={{
              background: "#0d1f3c", color: "#c8a97e",
              border: "none", borderRadius: 8,
              padding: "0.55rem 1.1rem", fontFamily: "Inter, sans-serif",
              fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            Continue →
          </button>
        </div>

        {/* ── Scrollable writing area ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 0 40px" }}>
          {/* Title */}
          <textarea
            value={title}
            onChange={e => { setTitle(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
            placeholder="Title"
            rows={1}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "transparent", border: "none", outline: "none", resize: "none",
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.6rem, 6vw, 2.2rem)",
              fontWeight: 700, color: "#0d1f3c",
              lineHeight: 1.25, padding: "1.25rem 1.25rem 0.5rem",
              overflowY: "hidden",
            }}
          />
          {/* Divider */}
          <div style={{ height: 1, background: "rgba(13,31,60,0.08)", margin: "0.5rem 1.25rem" }} />
          {/* Body editor */}
          <div style={{ padding: "0 0.75rem" }}>
            <Editor content={content} onChange={setContent} placeholder="Start writing…" />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP LAYOUT  (> 768 px)
          Two-column: editor + sidebar
      ══════════════════════════════════════════ */}
      <div className="desktop-write-wrap" style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: "2rem", alignItems: "start" }}>

          {/* Main column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Post Title"
              style={{
                ...inputStyle,
                fontFamily: "'Playfair Display', serif",
                fontSize: "1.6rem", fontWeight: 700,
                padding: "1rem 1.25rem", border: "none",
                borderBottom: "2px solid rgba(13,31,60,0.1)",
                borderRadius: 0, background: "transparent",
              }}
            />
            <div>
              <label style={labelStyle}>Excerpt <span style={{ color: "#c8a97e" }}>(optional)</span></label>
              <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)}
                placeholder="A short teaser shown in the post list…"
                rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <Editor content={content} onChange={setContent} />
            {error && <div style={{ background: "#e0707018", border: "1px solid #e0707030", color: "#c04040", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>{error}</div>}
            {saved && <div style={{ background: "#4a9e7a18", border: "1px solid #4a9e7a30", color: "#2d7a5a", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>✓ Saved</div>}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "1.5rem" }}>
            <SettingsPanel
              {...{ published, featured, setFeatured, save, saving, isEdit, coverImage, setCoverImage, uploading, uploadImage, fileInputRef, categories, selectedCats, toggleCat, inputStyle, labelStyle, excerpt, setExcerpt }}
            />
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          PUBLISH SETTINGS BOTTOM SHEET  (mobile)
          Slides up from bottom when "Continue" tapped
      ══════════════════════════════════════════ */}
      {sheetOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setSheetOpen(false)}
            style={{
              position: "fixed", inset: 0, background: "rgba(13,31,60,0.55)",
              zIndex: 200, backdropFilter: "blur(2px)",
            }}
          />

          {/* Sheet */}
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            zIndex: 201, background: "#fffef9",
            borderRadius: "18px 18px 0 0",
            boxShadow: "0 -8px 40px rgba(13,31,60,0.2)",
            maxHeight: "90vh", overflowY: "auto",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}>
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "0.875rem 0 0" }}>
              <div style={{ width: 36, height: 4, background: "rgba(13,31,60,0.18)", borderRadius: 2 }} />
            </div>

            {/* Sheet header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "0.875rem 1.25rem 0.625rem",
              borderBottom: "1px solid rgba(13,31,60,0.07)",
            }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#0d1f3c", margin: 0 }}>
                Ready to publish?
              </h3>
              <button
                onClick={() => setSheetOpen(false)}
                style={{ background: "none", border: "none", color: "#8fa3b1", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, padding: "0 0.25rem" }}
              >×</button>
            </div>

            {/* Sheet content */}
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>

              {/* Status + share link */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#3a5068" }}>Status</span>
                <span style={{
                  background: published ? "#4a9e7a18" : "#c8a97e18",
                  color: published ? "#4a9e7a" : "#c8a97e",
                  border: `1px solid ${published ? "#4a9e7a30" : "#c8a97e30"}`,
                  padding: "0.2rem 0.875rem", borderRadius: 20,
                  fontFamily: "Inter, sans-serif", fontSize: "0.72rem", textTransform: "uppercase",
                }}>
                  {published ? "Published" : "Draft"}
                </span>
              </div>

              {/* Share / View Live — shown once post is published */}
              {published && postSlug && (
                <ShareRow slug={postSlug} />
              )}

              {/* Featured */}
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: "#c8a97e" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "#3a5068" }}>
                  Pin as Featured post
                </span>
              </label>

              {/* Excerpt */}
              <div>
                <label style={labelStyle}>Subtitle / Excerpt</label>
                <textarea
                  value={excerpt} onChange={e => setExcerpt(e.target.value)}
                  placeholder="A short teaser shown in the post list…"
                  rows={2}
                  style={{ ...inputStyle, resize: "none", fontSize: "0.9rem" }}
                />
              </div>

              {/* Cover image */}
              <div>
                <label style={labelStyle}>Cover Image</label>
                <button
                  onPointerDown={e => { e.preventDefault(); fileInputRef.current?.click(); }}
                  disabled={uploading}
                  style={{
                    width: "100%", background: uploading ? "rgba(45,125,154,0.1)" : "rgba(45,125,154,0.06)",
                    color: "#2d7d9a", border: "1.5px dashed rgba(45,125,154,0.35)",
                    borderRadius: 10, padding: "0.875rem",
                    fontFamily: "Inter, sans-serif", fontSize: "0.9rem",
                    cursor: uploading ? "default" : "pointer", marginBottom: "0.5rem",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                  }}
                >
                  {uploading ? (
                    <><SpinnerIcon />Uploading…</>
                  ) : (
                    <>📷 Upload from gallery</>
                  )}
                </button>
                <input
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  placeholder="Or paste image URL…"
                  style={{ ...inputStyle, fontSize: "0.85rem" }}
                />
                {coverImage && (
                  <div style={{ marginTop: "0.625rem", borderRadius: 8, overflow: "hidden", border: "1px solid rgba(13,31,60,0.1)", position: "relative" }}>
                    <img src={coverImage} alt="Cover"
                      style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                      onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <button
                      onClick={() => setCoverImage("")}
                      style={{ position: "absolute", top: 8, right: 8, background: "rgba(13,31,60,0.7)", color: "#fff", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >×</button>
                  </div>
                )}
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div>
                  <label style={labelStyle}>Categories</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {categories.map(cat => {
                      const on = selectedCats.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          onPointerDown={e => { e.preventDefault(); toggleCat(cat.id); }}
                          style={{
                            padding: "0.4rem 0.875rem", borderRadius: 20,
                            border: `1.5px solid ${on ? cat.color : "rgba(13,31,60,0.18)"}`,
                            background: on ? cat.color + "18" : "transparent",
                            color: on ? cat.color : "#3a5068",
                            fontFamily: "Inter, sans-serif", fontSize: "0.82rem",
                            cursor: "pointer",
                          }}
                        >{cat.name}</button>
                      );
                    })}
                  </div>
                </div>
              )}
              {categories.length === 0 && (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#8fa3b1", margin: 0 }}>
                  No categories yet.{" "}
                  <Link href="/inkwell/categories" style={{ color: "#2d7d9a" }}>Create some.</Link>
                </p>
              )}

              {error && (
                <div style={{ background: "#e0707018", border: "1px solid #e0707030", color: "#c04040", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>
                  {error}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", paddingTop: "0.25rem" }}>
                <button
                  onClick={() => save(true)}
                  disabled={saving}
                  style={{
                    background: "#0d1f3c", color: "#c8a97e", border: "none",
                    borderRadius: 12, padding: "1rem",
                    fontFamily: "Inter, sans-serif", fontSize: "1rem", fontWeight: 700,
                    cursor: "pointer", opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? "Publishing…" : published ? "Update Post" : "Publish Now"}
                </button>
                <button
                  onClick={() => save(false)}
                  disabled={saving}
                  style={{
                    background: "transparent", color: "#3a5068",
                    border: "1px solid rgba(13,31,60,0.2)", borderRadius: 12,
                    padding: "0.875rem", fontFamily: "Inter, sans-serif",
                    fontSize: "0.9rem", cursor: "pointer",
                  }}
                >
                  Save as Draft
                </button>
                {isEdit && published && (
                  <button
                    onClick={() => save(false)}
                    disabled={saving}
                    style={{
                      background: "transparent", color: "#c04040",
                      border: "1px solid rgba(192,64,64,0.25)", borderRadius: 12,
                      padding: "0.875rem", fontFamily: "Inter, sans-serif",
                      fontSize: "0.85rem", cursor: "pointer",
                    }}
                  >
                    Unpublish
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
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

/* ── Desktop sidebar panel ── */
interface SettingsProps {
  published: boolean; featured: boolean;
  setFeatured: (v: boolean) => void;
  save: (p?: boolean) => void; saving: boolean; isEdit: boolean;
  coverImage: string; setCoverImage: (v: string) => void;
  uploading: boolean; uploadImage: (f: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  categories: { id: number; name: string; color: string }[];
  selectedCats: number[]; toggleCat: (id: number) => void;
  inputStyle: React.CSSProperties; labelStyle: React.CSSProperties;
  excerpt: string; setExcerpt: (v: string) => void;
}

function SettingsPanel({ published, featured, setFeatured, save, saving, isEdit, coverImage, setCoverImage, uploading, uploadImage, fileInputRef, categories, selectedCats, toggleCat, inputStyle, labelStyle, excerpt, setExcerpt }: SettingsProps) {
  return (
    <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.1)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid rgba(13,31,60,0.07)", background: "#f5f0e8" }}>
        <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "#0d1f3c", margin: 0, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Publish</h3>
      </div>
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#3a5068" }}>Status</span>
          <span style={{ background: published ? "#4a9e7a18" : "#c8a97e18", color: published ? "#4a9e7a" : "#c8a97e", border: `1px solid ${published ? "#4a9e7a30" : "#c8a97e30"}`, padding: "0.15rem 0.7rem", borderRadius: 12, fontFamily: "Inter, sans-serif", fontSize: "0.72rem", textTransform: "uppercase" }}>
            {published ? "Published" : "Draft"}
          </span>
        </div>

        {/* Featured */}
        <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
          <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: 15, height: 15, accentColor: "#c8a97e" }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#3a5068" }}>Mark as Featured</span>
        </label>

        {/* Excerpt */}
        <div>
          <label style={labelStyle}>Excerpt</label>
          <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)}
            placeholder="Short teaser…" rows={2}
            style={{ ...inputStyle, resize: "vertical", fontSize: "0.82rem" }} />
        </div>

        {/* Publish / Draft buttons */}
        <button onClick={() => save(true)} disabled={saving}
          style={{ width: "100%", background: "#0d1f3c", color: "#c8a97e", border: "none", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : published ? "Update" : "Publish"}
        </button>
        <button onClick={() => save(false)} disabled={saving}
          style={{ width: "100%", background: "transparent", color: "#3a5068", border: "1px solid rgba(13,31,60,0.2)", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.875rem", cursor: "pointer" }}>
          Save as Draft
        </button>
        {isEdit && published && (
          <button onClick={() => save(false)} disabled={saving}
            style={{ width: "100%", background: "transparent", color: "#c04040", border: "1px solid rgba(192,64,64,0.25)", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer" }}>
            Unpublish
          </button>
        )}

        {/* Cover image */}
        <div style={{ borderTop: "1px solid rgba(13,31,60,0.07)", paddingTop: "1rem" }}>
          <label style={labelStyle}>Cover Image</label>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ width: "100%", background: "rgba(45,125,154,0.06)", color: "#2d7d9a", border: "1.5px dashed rgba(45,125,154,0.35)", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            {uploading ? <><SpinnerIcon />Uploading…</> : <>📷 Upload</>}
          </button>
          <input value={coverImage} onChange={e => setCoverImage(e.target.value)}
            placeholder="Or paste URL…"
            style={{ ...inputStyle, fontSize: "0.8rem" }} />
          {coverImage && (
            <div style={{ marginTop: "0.5rem", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(13,31,60,0.1)", position: "relative" }}>
              <img src={coverImage} alt="Cover" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }}
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <button onClick={() => setCoverImage("")}
                style={{ position: "absolute", top: 6, right: 6, background: "rgba(13,31,60,0.7)", color: "#fff", border: "none", borderRadius: 4, width: 24, height: 24, cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
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
  const siteUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://amo-infinitum.vercel.app";
  const link = `${siteUrl}/blog/${slug}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard blocked — show the link in a prompt fallback
      window.prompt("Copy this link:", link);
    }
  };

  return (
    <div style={{
      background: "rgba(45,125,154,0.06)", border: "1px solid rgba(45,125,154,0.2)",
      borderRadius: 10, padding: "0.875rem 1rem",
      display: "flex", flexDirection: "column", gap: "0.625rem",
    }}>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#8fa3b1", margin: 0 }}>
        Share this post
      </p>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#2d7d9a", margin: 0, wordBreak: "break-all" }}>
        {link}
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onPointerDown={e => { e.preventDefault(); copy(); }}
          style={{
            flex: 1, background: copied ? "#4a9e7a" : "#2d7d9a", color: "#fff",
            border: "none", borderRadius: 8, padding: "0.6rem",
            fontFamily: "Inter, sans-serif", fontSize: "0.82rem",
            fontWeight: 600, cursor: "pointer", transition: "background 0.2s",
          }}
        >
          {copied ? "✓ Copied!" : "Copy Link"}
        </button>
        <a
          href={link} target="_blank" rel="noreferrer"
          style={{
            flex: 1, background: "transparent", color: "#2d7d9a",
            border: "1px solid rgba(45,125,154,0.3)", borderRadius: 8,
            padding: "0.6rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem",
            textDecoration: "none", textAlign: "center",
          }}
        >
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
