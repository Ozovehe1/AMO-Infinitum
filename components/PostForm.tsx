"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

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
  const isEdit = !!post?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const [published, setPublished] = useState(post?.published || false);
  const [featured, setFeatured] = useState(post?.featured || false);
  const [selectedCats, setSelectedCats] = useState<number[]>(post?.categories?.map(c => c.category.id) || []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(true);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  const save = async (publish?: boolean) => {
    if (!title.trim()) { setError("Add a title first."); return; }
    if (!content.trim() || content === "<p></p>") { setError("Write something first."); return; }
    setError("");
    setSaving(true);

    const body = { title, content, excerpt, coverImage, published: publish ?? published, featured, categoryIds: selectedCats };
    const url = isEdit ? `/api/posts/${post.id}` : "/api/posts";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (res.ok) {
      const data = await res.json();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (!isEdit) router.push(`/inkwell/posts/${data.id}`);
      if (publish !== undefined) setPublished(publish);
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
    }
    setSaving(false);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setCoverImage(data.url);
    } else {
      setError(data.error || "Upload failed.");
    }
    setUploading(false);
  };

  const toggleCat = (id: number) =>
    setSelectedCats(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#fffef9",
    border: "1px solid rgba(13,31,60,0.18)", borderRadius: 6,
    padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif",
    fontSize: "0.9rem", color: "#0d1f3c", outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.7rem",
    letterSpacing: "0.08em", textTransform: "uppercase", color: "#8fa3b1", marginBottom: "0.35rem",
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>

      {/* ── Sticky mobile action bar ── */}
      <div className="mobile-action-bar" style={{
        display: "none", position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 90,
        background: "#fffef9", borderTop: "1px solid rgba(13,31,60,0.12)",
        padding: "0.75rem 1rem", gap: "0.75rem", alignItems: "center",
      }}>
        <button onClick={() => save(false)} disabled={saving} style={{
          flex: 1, background: "transparent", color: "#3a5068",
          border: "1px solid rgba(13,31,60,0.2)", borderRadius: 8,
          padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", cursor: "pointer",
        }}>
          {saving ? "Saving…" : "Draft"}
        </button>
        <button onClick={() => save(true)} disabled={saving} style={{
          flex: 2, background: "#0d1f3c", color: "#c8a97e",
          border: "none", borderRadius: 8,
          padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem",
          fontWeight: 600, cursor: "pointer",
        }}>
          {saving ? "…" : published ? "Update" : "Publish"}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            width: 46, height: 46, background: "transparent",
            border: "1px solid rgba(13,31,60,0.2)", borderRadius: 8,
            color: "#3a5068", fontSize: "1.2rem",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
          title="Upload cover image"
        >📷</button>
      </div>

      {/* ── DESKTOP: two-column layout ── */}
      <div className="post-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.5rem", alignItems: "start" }}>

        {/* Main column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post Title"
            style={{
              ...inputStyle,
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.2rem, 3vw, 1.6rem)",
              fontWeight: 600, padding: "0.875rem 1rem",
              border: "1px solid rgba(13,31,60,0.12)",
            }}
          />
          <div>
            <label style={labelStyle}>Excerpt <span style={{ color: "#c8a97e" }}>(optional)</span></label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)}
              placeholder="A short teaser shown in the post list…"
              rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
          <div>
            <label style={labelStyle}>Content</label>
            <Editor content={content} onChange={setContent} />
          </div>

          {/* Mobile-only settings accordion */}
          <div className="mobile-settings" style={{ display: "none" }}>
            <button onClick={() => setSettingsOpen(s => !s)} style={{
              width: "100%", background: "#fffef9",
              border: "1px solid rgba(13,31,60,0.15)", borderRadius: 8,
              padding: "0.875rem 1rem", fontFamily: "Inter, sans-serif",
              fontSize: "0.85rem", color: "#0d1f3c", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span>⚙ Post Settings</span>
              <span>{settingsOpen ? "▲" : "▼"}</span>
            </button>

            {settingsOpen && (
              <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.1)", borderRadius: 8, padding: "1.25rem", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                <SidebarContent {...{ published, featured, setFeatured, save, saving, isEdit, coverImage, setCoverImage, uploading, uploadImage, fileInputRef, categories, selectedCats, toggleCat, inputStyle, labelStyle }} />
              </div>
            )}
          </div>

          {error && <div style={{ background: "#e0707018", border: "1px solid #e0707030", color: "#c04040", borderRadius: 6, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>{error}</div>}
          {saved && <div style={{ background: "#4a9e7a18", border: "1px solid #4a9e7a30", color: "#2d7a5a", borderRadius: 6, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>✓ Saved</div>}
        </div>

        {/* Desktop sidebar */}
        <div className="desktop-sidebar" style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "sticky", top: "1.5rem" }}>
          <SidebarPanel title="Publish">
            <SidebarContent {...{ published, featured, setFeatured, save, saving, isEdit, coverImage, setCoverImage, uploading, uploadImage, fileInputRef, categories, selectedCats, toggleCat, inputStyle, labelStyle }} />
          </SidebarPanel>
          {error && <div style={{ background: "#e0707018", border: "1px solid #e0707030", color: "#c04040", borderRadius: 6, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>{error}</div>}
          {saved && <div style={{ background: "#4a9e7a18", border: "1px solid #4a9e7a30", color: "#2d7a5a", borderRadius: 6, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>✓ Saved</div>}
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />

      <style>{`
        @media (max-width: 768px) {
          .post-form-grid { grid-template-columns: 1fr !important; padding-bottom: 80px; }
          .desktop-sidebar { display: none !important; }
          .mobile-settings { display: block !important; }
          .mobile-action-bar { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function SidebarPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.1)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid rgba(13,31,60,0.07)", background: "#f5f0e8" }}>
        <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "#0d1f3c", margin: 0, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{title}</h3>
      </div>
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {children}
      </div>
    </div>
  );
}

interface SidebarProps {
  published: boolean; featured: boolean;
  setFeatured: (v: boolean) => void;
  save: (p?: boolean) => void; saving: boolean; isEdit: boolean;
  coverImage: string; setCoverImage: (v: string) => void;
  uploading: boolean; uploadImage: (f: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  categories: { id: number; name: string; color: string }[];
  selectedCats: number[]; toggleCat: (id: number) => void;
  inputStyle: React.CSSProperties; labelStyle: React.CSSProperties;
}

function SidebarContent({ published, featured, setFeatured, save, saving, isEdit, coverImage, setCoverImage, uploading, uploadImage, fileInputRef, categories, selectedCats, toggleCat, inputStyle, labelStyle }: SidebarProps) {
  return (
    <>
      {/* Status + Featured */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#3a5068" }}>Status</span>
        <span style={{ background: published ? "#4a9e7a18" : "#c8a97e18", color: published ? "#4a9e7a" : "#c8a97e", border: `1px solid ${published ? "#4a9e7a30" : "#c8a97e30"}`, padding: "0.15rem 0.7rem", borderRadius: 12, fontFamily: "Inter, sans-serif", fontSize: "0.72rem", textTransform: "uppercase" }}>
          {published ? "Published" : "Draft"}
        </span>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
        <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#c8a97e" }} />
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#3a5068" }}>Mark as Featured</span>
      </label>

      <button onClick={() => save(true)} disabled={saving} style={{ width: "100%", background: "#0d1f3c", color: "#c8a97e", border: "none", borderRadius: 6, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
        {saving ? "Saving…" : published ? "Update" : "Publish"}
      </button>
      <button onClick={() => save(false)} disabled={saving} style={{ width: "100%", background: "transparent", color: "#3a5068", border: "1px solid rgba(13,31,60,0.2)", borderRadius: 6, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.875rem", cursor: "pointer" }}>
        Save as Draft
      </button>
      {isEdit && published && (
        <button onClick={() => save(false)} disabled={saving} style={{ width: "100%", background: "transparent", color: "#c04040", border: "1px solid rgba(192,64,64,0.25)", borderRadius: 6, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer" }}>
          Unpublish
        </button>
      )}

      {/* Cover image */}
      <div style={{ borderTop: "1px solid rgba(13,31,60,0.08)", paddingTop: "0.875rem" }}>
        <label style={labelStyle}>Cover Image</label>

        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ width: "100%", background: uploading ? "rgba(45,125,154,0.1)" : "rgba(45,125,154,0.08)", color: "#2d7d9a", border: "1px dashed rgba(45,125,154,0.4)", borderRadius: 6, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", cursor: "pointer", marginBottom: "0.5rem" }}>
          {uploading ? "Uploading…" : "📷 Upload from phone"}
        </button>

        {/* Or URL */}
        <input value={coverImage} onChange={e => setCoverImage(e.target.value)}
          placeholder="Or paste image URL…"
          style={{ ...inputStyle, fontSize: "0.8rem" }} />

        {coverImage && (
          <div style={{ marginTop: "0.625rem", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(13,31,60,0.1)", position: "relative" }}>
            <img src={coverImage} alt="Cover" style={{ width: "100%", height: 120, objectFit: "cover" }}
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <button onClick={() => setCoverImage("")} style={{ position: "absolute", top: 6, right: 6, background: "rgba(13,31,60,0.7)", color: "#fff", border: "none", borderRadius: 4, width: 24, height: 24, cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        )}
      </div>

      {/* Categories */}
      <div style={{ borderTop: "1px solid rgba(13,31,60,0.08)", paddingTop: "0.875rem" }}>
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
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#3a5068" }}>{cat.name}</span>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, marginLeft: "auto", flexShrink: 0 }} />
              </label>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
