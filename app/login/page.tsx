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
        .login-input:focus { border-bottom-color: #c8a97e !important; }
        .login-input::placeholder { color: rgba(26,24,20,0.28); }
        @media (max-width: 768px) { .login-left { display: none !important; } .login-right { padding: 3.5rem 1.75rem !important; } }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex" }}>

        {/* Left — editorial panel */}
        <div className="login-left" style={{
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
              Your writing is waiting.
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "rgba(255,254,249,0.38)", lineHeight: 1.8, maxWidth: 300, margin: 0 }}>
              Sign in and pick up exactly where you left off.
            </p>
          </div>

          <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "1.5rem" }}>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "rgba(255,254,249,0.2)", letterSpacing: "0.06em", margin: 0 }}>
              Free to start · AI-powered setup · Your domain
            </p>
          </div>
        </div>

        {/* Right — form panel */}
        <div className="login-right" style={{
          flex: 1, minHeight: "100vh", background: "#faf9f6",
          display: "flex", flexDirection: "column", justifyContent: "center",
          padding: "4rem 8% 4rem 7%",
        }}>
          <div style={{ maxWidth: 420, width: "100%" }}>

            <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 2rem" }}>
              Sign in
            </p>

            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
              fontWeight: 400, color: "#1a1814", lineHeight: 1.2,
              margin: "0 0 0.5rem",
            }}>
              Welcome back.
            </h1>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "#9a8e7e", margin: "0 0 2.75rem", lineHeight: 1.6 }}>
              Continue writing where you left off.
            </p>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

              <div>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a8e7e", marginBottom: "0.35rem" }}>
                  Email
                </label>
                <input
                  type="email" className="login-input"
                  value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoFocus
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#9a8e7e", marginBottom: "0.35rem" }}>
                  Password
                </label>
                <input
                  type="password" className="login-input"
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
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
                  {loading ? "Signing in…" : "Sign In"}
                </button>
              </div>

            </form>

            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#9a8e7e", marginTop: "2.5rem" }}>
              Don&apos;t have a blog yet?{" "}
              <Link href="/register" style={{ color: "#1a1814", textDecoration: "underline", textUnderlineOffset: 3 }}>Create one →</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
