"use client";
import AdminNav from "@/components/AdminNav";
import UpgradePrompt from "@/components/UpgradePrompt";
import { useEffect, useState } from "react";

const PRESET_COLORS = {
  primary: ["#0d1f3c", "#1a2f4a", "#3d2b1f", "#0d0d0d", "#1a0533"],
  accent:  ["#c8a97e", "#4a9e8e", "#c8943a", "#7c6fff", "#e040fb"],
  bg:      ["#f5f0e8", "#f0f4f7", "#f5ede0", "#111827", "#fff9fe"],
};

const HEADING_FONTS = ["Playfair Display", "Lora", "Cormorant Garamond", "DM Serif Display", "Libre Baskerville", "Georgia"];
const BODY_FONTS    = ["Source Serif 4", "Lora", "Merriweather", "Georgia", "EB Garamond", "Inter"];

export default function SettingsPage() {
  const [form, setForm] = useState({
    site_name: "", site_tagline: "", site_hero_quote: "",
    color_primary: "#0d1f3c", color_accent: "#c8a97e", color_bg: "#f5f0e8",
    font_heading: "Playfair Display", font_body: "Source Serif 4",
    twitter_handle: "", footer_tagline: "", footer_copy: "",
    sub_confirm_message: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then(r => r.json()),
      fetch("/api/billing/status").then(r => r.json()),
    ]).then(([data, billing]) => {
      setForm(f => ({ ...f, ...Object.fromEntries(Object.keys(f).map(k => [k, data[k] ?? f[k as keyof typeof f]])) }));
      setIsPremium(billing.plan === "premium");
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box" as const,
    background: "var(--admin-bg-card)", border: "1px solid color-mix(in srgb, var(--admin-primary) 18%, transparent)",
    borderRadius: 6, padding: "0.7rem 0.875rem",
    fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "var(--admin-primary)", outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.72rem",
    letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-sidebar-muted)", marginBottom: "0.35rem",
  };

  if (loading) return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--admin-bg)" }}>
      <AdminNav />
      <main className="admin-main" style={{ flex: 1 }}>
        <p style={{ color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif" }}>Loading…</p>
      </main>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--admin-bg)" }}>
      <AdminNav />
      <main className="admin-main" style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
        <div style={{ maxWidth: 700, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
            <div>
              <p style={{ color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>Blog</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "var(--admin-primary)", margin: 0, fontWeight: 600 }}>Settings</h1>
            </div>
            <button onClick={save} disabled={saving} style={{ background: saved ? "#4a9e7a" : "var(--admin-primary)", color: saved ? "#fff" : "var(--admin-accent)", border: "none", borderRadius: 6, padding: "0.65rem 1.5rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
              {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Changes"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

            {/* Identity */}
            <div style={{ background: "var(--admin-bg-card)", border: "1px solid var(--admin-primary-border)", borderRadius: 8, padding: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "var(--admin-primary)", margin: "0 0 1rem" }}>Identity</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div><label style={labelStyle}>Blog Name</label><input value={form.site_name} onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Tagline</label><input value={form.site_tagline} onChange={e => setForm(f => ({ ...f, site_tagline: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Hero Quote</label><input value={form.site_hero_quote} onChange={e => setForm(f => ({ ...f, site_hero_quote: e.target.value }))} style={inputStyle} /></div>
              </div>
            </div>

            {/* Colors — Premium only */}
            <div style={{ position: "relative", background: "var(--admin-bg-card)", border: "1px solid var(--admin-primary-border)", borderRadius: 8, padding: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "var(--admin-primary)", margin: "0 0 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                Colors
                {!isPremium && <span style={{ fontSize: "0.65rem", color: "var(--admin-accent)", fontFamily: "Inter, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>✦ Premium</span>}
              </h3>
              {(["primary", "accent", "bg"] as const).map(type => {
                const key = `color_${type}` as keyof typeof form;
                return (
                  <div key={type} style={{ marginBottom: "1rem", opacity: isPremium ? 1 : 0.45, pointerEvents: isPremium ? "auto" : "none" }}>
                    <label style={labelStyle}>{type.charAt(0).toUpperCase() + type.slice(1)} Color</label>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                      {PRESET_COLORS[type].map(c => (
                        <button key={c} onClick={() => setForm(f => ({ ...f, [key]: c }))} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: form[key] === c ? `3px solid var(--admin-primary)` : `2px solid color-mix(in srgb, var(--admin-primary) 20%, transparent)`, cursor: "pointer", outline: "none" }} />
                      ))}
                      <input type="color" value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: 36, height: 28, border: `1px solid color-mix(in srgb, var(--admin-primary) 20%, transparent)`, borderRadius: 4, cursor: "pointer", padding: 2 }} />
                      <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "var(--admin-sidebar-muted)" }}>{form[key]}</span>
                    </div>
                  </div>
                );
              })}
              {!isPremium && (
                <UpgradePrompt feature="Custom Colors" description="Unlock full color control for your blog's visual identity." inline />
              )}
            </div>

            {/* Typography — Premium only */}
            <div style={{ position: "relative", background: "var(--admin-bg-card)", border: "1px solid var(--admin-primary-border)", borderRadius: 8, padding: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "var(--admin-primary)", margin: "0 0 0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                Typography
                {!isPremium && <span style={{ fontSize: "0.65rem", color: "var(--admin-accent)", fontFamily: "Inter, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>✦ Premium</span>}
              </h3>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "var(--admin-sidebar-muted)", margin: "0 0 1rem", lineHeight: 1.5 }}>
                Choose fonts for your blog&apos;s headings and body text.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", opacity: isPremium ? 1 : 0.45, pointerEvents: isPremium ? "auto" : "none" }}>
                {([["font_heading", "Heading Font", HEADING_FONTS], ["font_body", "Body Font", BODY_FONTS]] as const).map(([key, label, opts]) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {opts.map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setForm(fr => ({ ...fr, [key]: f }))}
                          style={{
                            padding: "0.4rem 0.875rem",
                            borderRadius: 4,
                            border: form[key] === f ? `2px solid var(--admin-primary)` : `1px solid color-mix(in srgb, var(--admin-primary) 20%, transparent)`,
                            background: form[key] === f ? "var(--admin-primary)" : "var(--admin-bg-card)",
                            color: form[key] === f ? "var(--admin-accent)" : "var(--admin-primary)",
                            fontFamily: `'${f}', Georgia, serif`,
                            fontSize: "0.88rem",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <p style={{ fontFamily: `'${form[key]}', Georgia, serif`, fontSize: "1.05rem", color: "var(--admin-primary)", margin: "0.75rem 0 0", lineHeight: 1.6 }}>
                      {key === "font_heading" ? "The quick brown fox jumps over the lazy dog" : "Reading is the quiet revolution of the self."}
                    </p>
                  </div>
                ))}
              </div>
              {!isPremium && (
                <div style={{ marginTop: "1rem" }}>
                  <UpgradePrompt feature="Custom Fonts" description="Choose heading and body fonts that match your writing style." inline />
                </div>
              )}
            </div>

            {/* Footer & Social */}
            <div style={{ background: "var(--admin-bg-card)", border: "1px solid var(--admin-primary-border)", borderRadius: 8, padding: "1.5rem" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "var(--admin-primary)", margin: "0 0 1rem" }}>Footer & Social</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div><label style={labelStyle}>Footer Tagline</label><input value={form.footer_tagline} onChange={e => setForm(f => ({ ...f, footer_tagline: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Footer Copyright</label><input value={form.footer_copy} onChange={e => setForm(f => ({ ...f, footer_copy: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Twitter / X Handle</label><input value={form.twitter_handle} onChange={e => setForm(f => ({ ...f, twitter_handle: e.target.value }))} placeholder="@yourhandle" style={inputStyle} /></div>
              </div>
            </div>

            {/* Subscribers */}
            <div style={{ background: "var(--admin-bg-card)", border: "1px solid var(--admin-primary-border)", borderRadius: 8, padding: "1.5rem" }}>
              <div style={{ marginBottom: "1rem" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "var(--admin-primary)", margin: "0 0 0.25rem" }}>Subscribers</h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "var(--admin-sidebar-muted)", margin: 0, lineHeight: 1.5 }}>
                  This message appears in the confirmation email sent when someone subscribes to your blog.
                </p>
              </div>
              <div>
                <label style={labelStyle}>Confirmation Email Message</label>
                <textarea
                  value={form.sub_confirm_message}
                  onChange={e => setForm(f => ({ ...f, sub_confirm_message: e.target.value }))}
                  placeholder={`Just one click to confirm your subscription to ${form.site_name || "your blog"} — and new posts will arrive straight in your inbox.`}
                  rows={4}
                  style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65, minHeight: 90 }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.4rem" }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "var(--admin-sidebar-muted)", margin: 0 }}>
                    Leave blank to use the default message. Plain text only — no HTML.
                  </p>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: form.sub_confirm_message.length > 300 ? "#e07070" : "var(--admin-sidebar-muted)" }}>
                    {form.sub_confirm_message.length}/300
                  </span>
                </div>
                {form.sub_confirm_message.length > 0 && (
                  <div style={{ marginTop: "0.875rem", background: "var(--admin-bg)", border: "1px solid var(--admin-primary-border)", borderRadius: 6, padding: "0.875rem 1rem" }}>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "var(--admin-sidebar-muted)", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 0.4rem" }}>Preview</p>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "var(--admin-primary)", margin: 0, lineHeight: 1.65 }}>
                      {form.sub_confirm_message}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
