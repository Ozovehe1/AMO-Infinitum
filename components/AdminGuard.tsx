"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthCtx { logout: () => void; username: string }
const AuthContext = createContext<AuthCtx>({ logout: () => {}, username: "" });
export const useAuth = () => useContext(AuthContext);

interface Props { children: React.ReactNode; username: string }

export default function AdminGuard({ children, username }: Props) {
  const [status, setStatus] = useState<"loading" | "authed" | "login">("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [logging, setLogging] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/check")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.authenticated) {
          sessionStorage.removeItem("amo_session");
          setStatus("login");
          return;
        }
        fetch("/api/auth/me")
          .then(r => r.ok ? r.json() : null)
          .then(me => {
            if (me?.username !== username) {
              sessionStorage.removeItem("amo_session");
              setStatus("login");
              return;
            }
            sessionStorage.setItem("amo_session", "1");
            setStatus("authed");
            // If session is valid but user hasn't finished setup, redirect to setup
            // (skip if they're already on the setup page to avoid loop)
            if (!me.onboarded && !pathname.includes("/setup")) {
              router.push(`/${username}/inkwell/setup`);
            }
          })
          .catch(() => {
            sessionStorage.setItem("amo_session", "1");
            setStatus("authed");
          });
      })
      .catch(() => setStatus("login"));
  }, [pathname, username]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", email, password }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.username !== username) {
        setError("This account doesn't have access to this blog.");
        setLogging(false);
        return;
      }
      sessionStorage.setItem("amo_session", "1");
      setStatus("authed");
      if (!data.onboarded) {
        router.push(`/${username}/inkwell/setup`);
      } else {
        router.push(`/${username}/inkwell`);
      }
    } else {
      const data = await res.json();
      setError(data.error || "Invalid email or password");
    }
    setLogging(false);
  };

  const logout = async () => {
    sessionStorage.removeItem("amo_session");
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setStatus("login");
    router.push(`/${username}/inkwell`);
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--admin-primary, #0d1f3c)" }}>
        <div style={{ width: 32, height: 32, border: "2px solid rgba(255,255,255,0.12)", borderTop: "2px solid var(--admin-accent, #c8a97e)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "login") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--admin-primary, #0d1f3c)", padding: "1.5rem" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", color: "var(--admin-bg-card)", margin: "0 0 0.25rem" }}>
              <span style={{ color: "var(--admin-accent, #c8a97e)" }}>/{username}</span>
            </h1>
            <p style={{ color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", margin: 0 }}>
              Blog Admin — sign in to continue
            </p>
          </div>
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              autoFocus
              style={{ background: "color-mix(in srgb, var(--admin-bg-card) 6%, transparent)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, padding: "0.85rem 1rem", color: "var(--admin-bg-card)", fontFamily: "Inter, sans-serif", fontSize: "1rem", outline: "none" }}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              style={{ background: "color-mix(in srgb, var(--admin-bg-card) 6%, transparent)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 4, padding: "0.85rem 1rem", color: "var(--admin-bg-card)", fontFamily: "Inter, sans-serif", fontSize: "1rem", outline: "none" }}
            />
            {error && <p style={{ color: "#e07070", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", margin: 0 }}>{error}</p>}
            <button type="submit" disabled={logging || !email || !password} style={{ background: "var(--admin-accent, #c8a97e)", color: "var(--admin-primary, #0d1f3c)", border: "none", borderRadius: 4, padding: "0.85rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", cursor: "pointer", opacity: logging ? 0.7 : 1 }}>
              {logging ? "Signing in…" : "Sign In"}
            </button>
          </form>
          <p style={{ textAlign: "center", marginTop: "1.5rem", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "var(--admin-sidebar-muted)" }}>
            New here? <a href="/register" style={{ color: "var(--admin-accent, #c8a97e)", textDecoration: "none" }}>Create your blog →</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ logout, username }}>
      {children}
    </AuthContext.Provider>
  );
}
