"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", username: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      router.push(`/${form.username}/inkwell/setup`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const wrapStyle: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1f3c", padding: "2rem" };
  const cardStyle: React.CSSProperties = { width: "100%", maxWidth: 440, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 12, padding: "2.5rem" };
  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: 6, padding: "0.875rem 1rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "0.95rem", outline: "none", marginBottom: "1rem" };
  const labelStyle: React.CSSProperties = { display: "block", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" };

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.2em", textTransform: "uppercase", margin: "0 0 0.75rem" }}>AMO Infinitum</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#fffef9", margin: "0 0 0.5rem", fontWeight: 600 }}>Start your blog</h1>
          <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", margin: 0 }}>Your writing, your corner of the internet.</p>
        </div>

        <form onSubmit={submit}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" required style={inputStyle} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
              placeholder="yourname"
              required
              minLength={3}
              maxLength={30}
              style={inputStyle}
            />
            <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", margin: "-0.5rem 0 1rem" }}>
              Your blog will be at amo-infinitum.vercel.app/{form.username || "yourname"}
            </p>
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="At least 8 characters" required minLength={8} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat password" required style={inputStyle} />
          </div>

          {error && <p style={{ color: "#e07070", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", margin: "0 0 1rem" }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ width: "100%", background: "#c8a97e", color: "#0d1f3c", border: "none", borderRadius: 6, padding: "0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.95rem", fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Creating your blog…" : "Create My Blog →"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", marginTop: "1.5rem", margin: "1.5rem 0 0" }}>
          Already have a blog?{" "}
          <Link href="/login" style={{ color: "#c8a97e", textDecoration: "none" }}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
