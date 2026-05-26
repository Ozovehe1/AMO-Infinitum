"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords don't match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, username: form.username, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
      sessionStorage.setItem("amo_session", "1");
      setSuccess(true);
      setTimeout(() => router.push(`/verify-email`), 2200);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d0d10", flexDirection: "column", gap: "1.25rem", textAlign: "center", padding: "2rem" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 36, height: 36, border: "2px solid rgba(200,169,126,0.2)", borderTop: "2px solid #c8a97e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "#fffef9", margin: 0, fontWeight: 400 }}>Blog created.</p>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "rgba(255,254,249,0.4)", lineHeight: 1.7, margin: 0, maxWidth: 320 }}>
          We&apos;re sending you a verification email. Once confirmed, your writing panel will be ready.
        </p>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    background: "transparent", border: "none",
    borderBottom: "1.5px solid rgba(26,24,20,0.18)",
    borderRadius: 0, padding: "0.7rem 0",
    color: "#1a1814", fontFamily: "Inter, sans-serif",
    fontSize: "1rem", outline: "none",
  };

  return (
    <>
      <style>{`
        .reg-input:focus { border-bottom-color: #c8a97e !important; }
        .reg-input::placeholder { color: rgba(26,24,20,0.28); }
        @media (max-width: 768px) { .reg-left { display: none !important; } .reg-right { padding: 3.5rem 1.75rem !important; } }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex" }}>

        {/* Left — editorial panel */}
        <div className="reg-left" style={{
          width: "42%", minHeight: "100vh", background: "#0d0d10",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "3rem 3.5rem", position: "relative", overflow: "hidden", flexShrink: 0,
        }}>
          {/* Watermark */}
          <div style={{
            position: "absolute", bottom: "-2rem", left: "-1rem",
            fontFamily: "'Playfair Display', serif",
            fontSize: "clamp(7rem, 14vw, 13rem)",
            color: "rgba(255,255,255,0.03)", lineHeight: 1,
            userSelect: "none", pointerEvents: "none", fontWeight: 700,
          }}>
            AMO
          </div>

          <div>
            <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", margin: 0 }}>
              AMO Infinitum
            </p>
          </div>

          <div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
              fontWeight: 400, color: "#fffef9", lineHeight: 1.2,
              margin: "0 0 1.5rem", maxWidth: 340,
            }}>
              Your writing deserves a home.
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "rgba(255,254,249,0.38)", lineHeight: 1.8, maxWidth: 300, margin: 0 }}>
              A personal blog — built around your voice, your rhythm, and your readers.
            </p>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem" }}>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "rgba(255,254,249,0.2)", letterSpacing: "0.06em", margin: 0 }}>
              Free to start · AI-powered setup · Your domain
            </p>
          </div>
        </div>

        {/* Right — form panel */}
        <div className="reg-right" style={{
          flex: 1, minHeight: "100vh", background: "#faf9f6",
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "4rem 8% 4rem 7%",
        }}>
          <div style={{ maxWidth: 420, width: "100%" }}>

            <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 2rem" }}>
              Create your blog
            </p>

            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              fontWeight: 400, color: "#1a1814", lineHeight: 1.2,
              margin: "0 0 0.5rem",
            }}>
              Start writing.
            </h1>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "#9a8e7e", margin: "0 0 2.75rem", lineHeight: 1.6 }}>
              Set up your free blog in a few minutes.
            </p>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

              <div>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a8e7e", marginBottom: "0.35rem" }}>
                  Email
                </label>
                <input
                  type="email" className="reg-input"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com" required autoFocus
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a8e7e", marginBottom: "0.35rem" }}>
                  Username
                </label>
                <input
                  type="text" className="reg-input"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  placeholder="yourname" required minLength={3} maxLength={30}
                  style={inputStyle}
                />
                {form.username && (
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "rgba(26,24,20,0.35)", margin: "0.4rem 0 0" }}>
                    amo-infinitum.vercel.app/<span style={{ color: "#1a1814" }}>{form.username}</span>
                  </p>
                )}
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a8e7e", marginBottom: "0.35rem" }}>
                  Password
                </label>
                <input
                  type="password" className="reg-input"
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="At least 8 characters" required minLength={8}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a8e7e", marginBottom: "0.35rem" }}>
                  Confirm Password
                </label>
                <input
                  type="password" className="reg-input"
                  value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat password" required
                  style={inputStyle}
                />
              </div>

              {error && (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#c0503a", margin: 0 }}>{error}</p>
              )}

              <div style={{ paddingTop: "0.5rem" }}>
                <button
                  type="submit" disabled={loading}
                  style={{ background: "#1a1814", color: "#faf9f6", border: "none", borderRadius: 2, padding: "0.875rem 2.5rem", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", cursor: loading ? "default" : "pointer", opacity: loading ? 0.4 : 1 }}
                >
                  {loading ? "Creating…" : "Create My Blog"}
                </button>
              </div>

              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "rgba(26,24,20,0.3)", lineHeight: 1.65, margin: 0 }}>
                After verifying your email, you&apos;ll be guided through a quick setup to personalize your writing panel.
              </p>
            </form>

            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#9a8e7e", marginTop: "2.5rem" }}>
              Already have a blog?{" "}
              <Link href="/login" style={{ color: "#1a1814", textDecoration: "underline", textUnderlineOffset: 3 }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
