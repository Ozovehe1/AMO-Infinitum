"use client";
import { useState, useEffect, createContext, useContext } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthCtx { logout: () => void }
const AuthContext = createContext<AuthCtx>({ logout: () => {} });
export const useAuth = () => useContext(AuthContext);

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authed" | "login">("loading");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [logging, setLogging] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/check")
      .then(r => setStatus(r.ok ? "authed" : "login"))
      .catch(() => setStatus("login"));
  }, [pathname]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogging(true);
    setError("");
    const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", password }) });
    if (res.ok) {
      setStatus("authed");
    } else {
      const data = await res.json();
      setError(data.error || "Invalid password");
    }
    setLogging(false);
  };

  const logout = async () => {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setStatus("login");
    router.push("/inkwell");
  };

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1f3c" }}>
        <div style={{ width: 32, height: 32, border: "2px solid rgba(200,169,126,0.3)", borderTop: "2px solid #c8a97e", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "login") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1f3c", padding: "1.5rem" }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", color: "#fffef9", margin: "0 0 0.5rem" }}>
              AMO <span style={{ fontStyle: "italic", color: "#c8a97e" }}>Infinitum</span>
            </h1>
            <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>Admin — enter your password</p>
          </div>
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: 4, padding: "0.85rem 1rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "1rem", outline: "none" }}
            />
            {error && <p style={{ color: "#e07070", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", margin: 0 }}>{error}</p>}
            <button type="submit" disabled={logging || !password} style={{ background: "#2d7d9a", color: "#fff", border: "none", borderRadius: 4, padding: "0.85rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", cursor: "pointer", opacity: logging ? 0.7 : 1, transition: "opacity 0.2s" }}>
              {logging ? "Entering…" : "Enter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={{ logout }}>{children}</AuthContext.Provider>;
}
