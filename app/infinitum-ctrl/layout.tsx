"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface UserStat {
  id: number; username: string; email: string; role: string;
  onboarded: boolean; createdAt: string; posts: number; subscribers: number;
}
export interface RecentPost {
  id: number; title: string; slug: string;
  publishedAt: string | null; views: number;
  user: { username: string };
}
export interface PlatformStats {
  totalUsers: number; totalPosts: number; totalSubscribers: number;
  users: UserStat[]; recentPosts: RecentPost[];
}

interface ManagerCtx {
  stats: PlatformStats | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const ManagerContext = createContext<ManagerCtx>({ stats: null, refresh: async () => {}, logout: async () => {} });
export const useManager = () => useContext(ManagerContext);

const NAV = [
  { href: "/infinitum-ctrl", label: "Overview", exact: true,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href: "/infinitum-ctrl/blogs", label: "All Blogs", exact: false,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: "/infinitum-ctrl/activity", label: "Activity", exact: false,
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
];

function Sidebar({ stats, onLogout }: { stats: PlatformStats | null; onLogout: () => void }) {
  const pathname = usePathname();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <aside style={{
      position: "fixed", top: 0, left: 0, bottom: 0, width: 220,
      background: "#050b14", borderRight: "1px solid rgba(255,255,255,0.05)",
      display: "flex", flexDirection: "column", zIndex: 60,
    }}>
      {/* Logo */}
      <div style={{ padding: "1.5rem 1.25rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4a9e7a", flexShrink: 0, boxShadow: `0 0 ${pulse ? "8px" : "3px"} #4a9e7a`, transition: "box-shadow 1.2s ease" }} />
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "#c8a97e", fontWeight: 600, letterSpacing: "-0.01em" }}>Infinitum</span>
        </div>
        <p style={{ margin: 0, color: "rgba(143,163,177,0.35)", fontSize: "0.62rem", letterSpacing: "0.12em", textTransform: "uppercase", paddingLeft: "1.1rem" }}>Manager</p>
      </div>

      {/* Nav */}
      <nav style={{ padding: "1rem 0.75rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.15rem" }}>
        {NAV.map(n => {
          const active = n.exact ? pathname === n.href : pathname.startsWith(n.href) && !n.exact;
          return (
            <Link key={n.href} href={n.href} style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.65rem 0.875rem", borderRadius: 8, textDecoration: "none",
              background: active ? "rgba(200,169,126,0.08)" : "transparent",
              color: active ? "#c8a97e" : "rgba(143,163,177,0.55)",
              fontSize: "0.82rem", fontFamily: "Inter, sans-serif",
              borderLeft: `2px solid ${active ? "#c8a97e" : "transparent"}`,
              transition: "all 0.15s ease",
            }}>
              {n.icon}
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Platform mini stats */}
      {stats && (
        <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <p style={{ margin: "0 0 0.75rem", color: "rgba(143,163,177,0.25)", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Platform</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {[
              [stats.totalUsers, "blogs"],
              [stats.totalPosts, "posts"],
              [stats.totalSubscribers, "readers"],
            ].map(([n, label]) => (
              <div key={String(label)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.72rem" }}>{label}</span>
                <span style={{ color: "#fffef9", fontSize: "0.78rem", fontWeight: 600 }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign out */}
      <div style={{ padding: "1rem 0.75rem" }}>
        <button onClick={onLogout} style={{
          width: "100%", background: "transparent", color: "rgba(143,163,177,0.4)",
          border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8,
          padding: "0.6rem", fontSize: "0.75rem", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          fontFamily: "Inter, sans-serif", letterSpacing: "0.03em",
          transition: "all 0.15s ease",
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function LoginScreen({ onLogin }: { onLogin: (stats: PlatformStats) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/manager/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password }),
    });
    if (!res.ok) { setError((await res.json()).error || "Invalid access code"); setLoading(false); return; }
    const sr = await fetch("/api/manager/stats");
    if (!sr.ok) { setError("Failed to load platform data"); setLoading(false); return; }
    onLogin(await sr.json());
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050b14", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "inline-flex", width: 52, height: 52, alignItems: "center", justifyContent: "center", background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 14, marginBottom: "1.5rem" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8a97e" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#fffef9", margin: "0 0 0.4rem", fontWeight: 600 }}>Infinitum Manager</h1>
          <p style={{ color: "rgba(143,163,177,0.4)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", margin: 0, letterSpacing: "0.04em" }}>Authorized access only</p>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", color: "rgba(143,163,177,0.5)", fontFamily: "Inter, sans-serif", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Access Code</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="············" required autoFocus
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.18)", borderRadius: 10, padding: "0.9rem 1rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "1.1rem", outline: "none", letterSpacing: "0.25em" }} />
          </div>
          {error && <p style={{ margin: 0, color: "#e07070", fontFamily: "Inter, sans-serif", fontSize: "0.78rem" }}>✕ {error}</p>}
          <button type="submit" disabled={loading} style={{ background: "#c8a97e", color: "#050b14", border: "none", borderRadius: 10, padding: "0.9rem", fontFamily: "Inter, sans-serif", fontSize: "0.88rem", fontWeight: 700, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, letterSpacing: "0.03em" }}>
            {loading ? "Verifying…" : "Enter Platform →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    fetch("/api/manager/stats")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setAuthed(true); setStats(data); } else setAuthed(false); })
      .catch(() => setAuthed(false));
  }, []);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/manager/stats");
    if (r.ok) setStats(await r.json());
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/manager/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setAuthed(false); setStats(null);
  }, []);

  if (authed === null) return (
    <div style={{ minHeight: "100vh", background: "#050b14", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 44, height: 44 }}>
        <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(200,169,126,0.1)", borderTop: "2px solid rgba(200,169,126,0.5)", borderRadius: "50%", animation: "spin 1.2s linear infinite" }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!authed) return <LoginScreen onLogin={data => { setAuthed(true); setStats(data); }} />;

  return (
    <ManagerContext.Provider value={{ stats, refresh, logout }}>
      <div style={{ minHeight: "100vh", background: "#080f1a", fontFamily: "Inter, sans-serif" }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
          .mgr-fade { animation: fadeUp 0.28s ease both; }
          .mgr-hover:hover { background: rgba(255,255,255,0.03) !important; }
          .mgr-row-hover:hover { background: rgba(255,255,255,0.025) !important; cursor: pointer; }
          .mgr-btn:hover { opacity: 1 !important; }
          @media (max-width: 768px) { .mgr-sidebar { display: none !important; } .mgr-main { margin-left: 0 !important; } }
        `}</style>
        <div className="mgr-sidebar"><Sidebar stats={stats} onLogout={logout} /></div>
        <main className="mgr-main" style={{ marginLeft: 220, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          {children}
        </main>
      </div>
    </ManagerContext.Provider>
  );
}
