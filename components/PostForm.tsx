"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Editor = dynamic(() => import("./Editor"), { ssr: false, loading: () => <div style={{ height: 400, background: "#f5f0e8", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8fa3b1", fontFamily: "Inter, sans-serif" }}>Loading editor…</div> });

interface Category { id: number; name: string; slug: string; color: string; }

interface PostData {
  id?: number;
  title?: string;
  content?: string;
  excerpt?: string;
  coverImage?: string;
  published?: boolean;
  featured?: boolean;
  categories?: { category: Category }[];
}

export default function PostForm({ post }: { post?: PostData }) {
  const router = useRouter();
  const isEdit = !!post?.id;

  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [coverImage, setCoverImage] = useState(post?.coverImage || "");
  const [published, setPublished] = useState(post?.published || false);
  const [featured, setFeatured] = useState(post?.featured || false);
  const [selectedCats, setSelectedCats] = useState<number[]>(post?.categories?.map(c => c.category.id) || []);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories);
  }, []);

  const save = async (publish?: boolean) => {
    if (!title.trim()) { setError("A title is required."); return; }
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
      if (!isEdit) router.push(`/admin/posts/${data.id}`);
      if (publish !== undefined) setPublished(publish);
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
    }
    setSaving(false);
  };

  const toggleCat = (id: number) => setSelectedCats(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const inputStyle: React.CSSProperties = { width: "100%", background: "#fffef9", border: "1px solid rgba(13,31,60,0.18)", borderRadius: 6, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "#0d1f3c", outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#8fa3b1", marginBottom: "0.4rem" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: "1.5rem", alignItems: "start" }} className="post-form-grid">
      {/* Main editor area */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Title */}
        <div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Post Title"
            style={{ ...inputStyle, fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", fontWeight: 600, padding: "0.875rem 1rem", border: "1px solid rgba(13,31,60,0.15)" }}
          />
        </div>

        {/* Excerpt */}
        <div>
          <label style={labelStyle}>Excerpt (optional)</label>
          <textarea
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="A short teaser for the post listing…"
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        {/* Editor */}
        <div>
          <label style={labelStyle}>Content</label>
          <Editor content={content} onChange={setContent} />
        </div>

        {error && (
          <div style={{ background: "#e0707018", border: "1px solid #e0707030", color: "#c04040", borderRadius: 6, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>
            {error}
          </div>
        )}

        {saved && (
          <div style={{ background: "#4a9e7a18", border: "1px solid #4a9e7a30", color: "#2d7a5a", borderRadius: 6, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>
            ✓ Saved successfully
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", position: "sticky", top: "1.5rem" }}>
        {/* Publish panel */}
        <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.1)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(13,31,60,0.07)", background: "#f5f0e8" }}>
            <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#0d1f3c", margin: 0, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Publish</h3>
          </div>
          <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#3a5068" }}>Status</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", background: published ? "#4a9e7a18" : "#c8a97e18", color: published ? "#4a9e7a" : "#c8a97e", border: `1px solid ${published ? "#4a9e7a30" : "#c8a97e30"}`, padding: "0.15rem 0.6rem", borderRadius: 12 }}>
                {published ? "Published" : "Draft"}
              </span>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
              <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#c8a97e" }} />
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#3a5068" }}>Mark as Featured</span>
            </label>

            <button
              onClick={() => save(true)}
              disabled={saving}
              style={{ width: "100%", background: "#0d1f3c", color: "#c8a97e", border: "none", borderRadius: 6, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", cursor: "pointer", opacity: saving ? 0.7 : 1, transition: "opacity 0.2s" }}
            >
              {saving ? "Saving…" : published ? "Update & Publish" : "Publish"}
            </button>
            <button
              onClick={() => save(false)}
              disabled={saving}
              style={{ width: "100%", background: "transparent", color: "#3a5068", border: "1px solid rgba(13,31,60,0.2)", borderRadius: 6, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", cursor: "pointer" }}
            >
              Save as Draft
            </button>

            {isEdit && published && (
              <button
                onClick={() => save(false)}
                disabled={saving}
                style={{ width: "100%", background: "transparent", color: "#c04040", border: "1px solid rgba(192,64,64,0.3)", borderRadius: 6, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer" }}
              >
                Unpublish
              </button>
            )}
          </div>
        </div>

        {/* Cover image */}
        <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.1)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(13,31,60,0.07)", background: "#f5f0e8" }}>
            <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#0d1f3c", margin: 0, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Cover Image</h3>
          </div>
          <div style={{ padding: "1.25rem" }}>
            <input
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              placeholder="Paste image URL…"
              style={{ ...inputStyle, fontSize: "0.82rem" }}
            />
            {coverImage && (
              <div style={{ marginTop: "0.75rem", borderRadius: 4, overflow: "hidden", border: "1px solid rgba(13,31,60,0.1)" }}>
                <img src={coverImage} alt="Cover preview" style={{ width: "100%", height: 120, objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
        </div>

        {/* Categories */}
        <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.1)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(13,31,60,0.07)", background: "#f5f0e8" }}>
            <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#0d1f3c", margin: 0, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>Categories</h3>
          </div>
          <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {categories.length === 0 ? (
              <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", margin: 0 }}>
                No categories yet. <a href="/admin/categories" style={{ color: "#2d7d9a" }}>Create some.</a>
              </p>
            ) : (
              categories.map(cat => (
                <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={selectedCats.includes(cat.id)} onChange={() => toggleCat(cat.id)} style={{ accentColor: cat.color }} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#3a5068" }}>{cat.name}</span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, marginLeft: "auto" }} />
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 900px) { .post-form-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
