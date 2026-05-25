"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); setLoading(false); return; }
      sessionStorage.setItem("amo_session", "1");
      if (!data.onboarded) {
        router.push(`/${data.username}/inkwell/setup`);
      } else {
        router.push(`/${data.username}/inkwell`);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const wrapStyle: React.CSSProperties = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1f3c", padding: "2rem" };
  const cardStyle: React.CSSProperties = { width: "100%", maxWidth: 420, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 12, padding: "2.5rem" };
  const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: 6, padding: "0.875rem 1rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "0.95rem", outline: "none", marginBottom: "1rem" };
  const labelStyle: React.CSSProperties = { display: "block", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" };

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#fffef9", margin: "0 0 0.5rem", fontWeight: 600 }}>Welcome back</h1>
          <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", margin: 0 }}>Sign in to your blog</p>
        </div>

        <form onSubmit={submit}>
          <div>
            <label style={labelStyle}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required style={inputStyle} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={inputStyle} />
          </div>

          {error && <p style={{ color: "#e07070", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", margin: "0 0 1rem" }}>{error}</p>}

          <button type="submit" disabled={loading} style={{ width: "100%", background: "#c8a97e", color: "#0d1f3c", border: "none", borderRadius: 6, padding: "0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.95rem", fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", marginTop: "1.5rem", margin: "1.5rem 0 0" }}>
          Don&apos;t have a blog yet?{" "}
          <Link href="/register" style={{ color: "#c8a97e", textDecoration: "none" }}>Create one →</Link>
        </p>
      </div>
    </div>
  );
}
