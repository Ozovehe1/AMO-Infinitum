"use client";
import AdminNav from "@/components/AdminNav";
import { useState, useEffect } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  _count?: { posts: number };
}

const PRESET_COLORS = ["#2d7d9a", "#c8a97e", "#4a9e7a", "#7a6aba", "#c04040", "#3a7a6a", "#8a5a3a", "#5a6a9a"];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", color: "#2d7d9a" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/categories").then(r => r.json()).then(data => { setCategories(data); setLoading(false); });
  };
  useEffect(load, []);

  const openCreate = () => { setForm({ name: "", description: "", color: "#2d7d9a" }); setEditing(null); setCreating(true); setError(""); };
  const openEdit = (cat: Category) => { setForm({ name: cat.name, description: cat.description || "", color: cat.color }); setEditing(cat); setCreating(true); setError(""); };
  const close = () => { setCreating(false); setEditing(null); setError(""); };

  const save = async () => {
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError("");
    const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { close(); load(); } else { const d = await res.json(); setError(d.error || "Error saving."); }
    setSaving(false);
  };

  const del = async (id: number) => {
    if (!confirm("Delete this category? Posts won't be deleted, just unlinked.")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    load();
  };

  const inputStyle: React.CSSProperties = { width: "100%", background: "#fffef9", border: "1px solid rgba(13,31,60,0.18)", borderRadius: 6, padding: "0.7rem 0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "#0d1f3c", outline: "none", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#8fa3b1", marginBottom: "0.35rem" };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f0e8" }}>
      <AdminNav />
      <main style={{ marginLeft: 220, flex: 1, padding: "2.5rem" }}>
        <div style={{ maxWidth: 700 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
            <div>
              <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>Categories · {categories.length}</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#0d1f3c", margin: 0, fontWeight: 600 }}>Sections & Topics</h1>
            </div>
            <button onClick={openCreate} style={{ background: "#0d1f3c", color: "#c8a97e", border: "none", borderRadius: 6, padding: "0.65rem 1.25rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer" }}>
              + New Category
            </button>
          </div>

          {/* Create / Edit Modal */}
          {creating && (
            <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.12)", borderRadius: 10, padding: "1.75rem", marginBottom: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#0d1f3c", margin: "0 0 1.25rem", fontWeight: 600 }}>
                {editing ? `Edit: ${editing.name}` : "New Category"}
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Philosophy, Life, Travel…" style={inputStyle} autoFocus />
                </div>
                <div>
                  <label style={labelStyle}>Description (optional)</label>
                  <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Color</label>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                    {PRESET_COLORS.map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: form.color === c ? "3px solid #0d1f3c" : "2px solid transparent", cursor: "pointer", outline: "none", flexShrink: 0 }} title={c} />
                    ))}
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 36, height: 28, border: "1px solid rgba(13,31,60,0.2)", borderRadius: 4, cursor: "pointer", padding: 2 }} title="Custom color" />
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#8fa3b1" }}>{form.color}</span>
                  </div>
                </div>
                {error && <p style={{ color: "#c04040", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", margin: 0 }}>{error}</p>}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <button onClick={save} disabled={saving} style={{ background: "#0d1f3c", color: "#c8a97e", border: "none", borderRadius: 6, padding: "0.65rem 1.5rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Saving…" : editing ? "Save Changes" : "Create"}
                  </button>
                  <button onClick={close} style={{ background: "transparent", color: "#3a5068", border: "1px solid rgba(13,31,60,0.2)", borderRadius: 6, padding: "0.65rem 1.25rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Categories list */}
          <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.08)", borderRadius: 8, overflow: "hidden" }}>
            {loading ? (
              <p style={{ padding: "2rem", textAlign: "center", color: "#8fa3b1", fontFamily: "Inter, sans-serif" }}>Loading…</p>
            ) : categories.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center" }}>
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#0d1f3c", margin: "0 0 0.5rem" }}>No categories yet.</p>
                <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", margin: 0 }}>Create your first section to organize your writing.</p>
              </div>
            ) : (
              categories.map((cat, i) => (
                <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.25rem", borderBottom: i < categories.length - 1 ? "1px solid rgba(13,31,60,0.05)" : "none" }}>
                  <div style={{ width: 12, height: 12, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "#0d1f3c" }}>{cat.name}</div>
                    {cat.description && <div style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.75rem", marginTop: "0.15rem" }}>{cat.description}</div>}
                  </div>
                  <span style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.75rem", flexShrink: 0 }}>
                    {cat._count?.posts ?? 0} {(cat._count?.posts ?? 0) === 1 ? "post" : "posts"}
                  </span>
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    <button onClick={() => openEdit(cat)} style={{ background: "transparent", color: "#2d7d9a", border: "none", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", cursor: "pointer", padding: "0.2rem 0.5rem" }}>Edit</button>
                    <button onClick={() => del(cat.id)} style={{ background: "transparent", color: "#c04040", border: "none", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", cursor: "pointer", padding: "0.2rem 0.5rem" }}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
