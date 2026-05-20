"use client";
import AdminNav from "@/components/AdminNav";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Editor = dynamic(() => import("@/components/Editor"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 240 }} />,
});

export default function EditAbout() {
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(data => {
        setHeroSubtitle(data.about_hero_subtitle || "");
        setBody(data.about_body || "");
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ about_hero_subtitle: heroSubtitle, about_body: body }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f0e8" }}>
      <AdminNav />
      {/* minWidth:0 prevents flex child from overflowing its container */}
      <main className="admin-main" style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
        <div style={{ maxWidth: 860, width: "100%" }}>

          {/* Header — wraps on small screens so Save button never goes off-screen */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
            <div>
              <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>Site</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#0d1f3c", margin: 0, fontWeight: 600 }}>Edit About Page</h1>
            </div>
            <button
              onClick={save}
              disabled={saving || loading}
              style={{
                background: saved ? "#4a9e7a" : "#0d1f3c",
                color: saved ? "#fff" : "#c8a97e",
                border: "none", borderRadius: 6,
                padding: "0.65rem 1.5rem",
                fontFamily: "Inter, sans-serif", fontSize: "0.85rem", fontWeight: 600,
                cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
              }}
            >
              {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
            </button>
          </div>

          {loading ? (
            <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif" }}>Loading…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

              {/* Hero subtitle */}
              <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.08)", borderRadius: 8, padding: "1.5rem", overflow: "hidden" }}>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8fa3b1", marginBottom: "0.75rem" }}>
                  Hero Subtitle
                </label>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#8fa3b1", margin: "0 0 0.75rem" }}>
                  The line that appears below &quot;AMO Infinitum&quot; on the about page hero.
                </p>
                <textarea
                  value={heroSubtitle}
                  onChange={e => setHeroSubtitle(e.target.value)}
                  rows={3}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "#f5f0e8", border: "1px solid rgba(13,31,60,0.1)",
                    borderRadius: 6, padding: "0.75rem 1rem",
                    fontFamily: "'Source Serif 4', serif", fontSize: "1rem",
                    color: "#0d1f3c", lineHeight: 1.6, resize: "vertical", outline: "none",
                  }}
                />
              </div>

              {/* Body content */}
              <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.08)", borderRadius: 8, padding: "1.5rem", overflow: "hidden" }}>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8fa3b1", marginBottom: "0.75rem" }}>
                  About Body
                </label>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#8fa3b1", margin: "0 0 1rem" }}>
                  The main content of your about page. Supports rich text — headings, bold, italic, blockquotes, links.
                </p>
                <div style={{ border: "1px solid rgba(13,31,60,0.1)", borderRadius: 6, overflow: "hidden", width: "100%", boxSizing: "border-box" }}>
                  <Editor
                    content={body}
                    onChange={setBody}
                    placeholder="Write about yourself and this blog…"
                    compact
                  />
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
