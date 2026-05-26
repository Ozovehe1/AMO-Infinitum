"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface UserStat {
  id: number; username: string; email: string; role: string;
  onboarded: boolean; emailVerified: boolean; createdAt: string; posts: number; subscribers: number;
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

// Manager accent — clearly distinct from blog gold
export const MGR = {
  accent:  "#818cf8",   // indigo-400
  accent2: "#6366f1",   // indigo-500
  dim:     "rgba(129,140,248,0.12)",
  dimBorder: "rgba(129,140,248,0.2)",
  bg:      "#06080f",   // near-black, cooler than blog dark
  surface: "#0d1117",
  card:    "rgba(255,255,255,0.025)",
  border:  "rgba(255,255,255,0.06)",
  sub:     "rgba(148,163,184,0.45)",
  text:    "#e2e8f0",
  textDim: "rgba(148,163,184,0.35)",
};

const NAV = [
  { href: "/infinitum-ctrl",           label: "Overview",   exact: true,
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
  { href: "/infinitum-ctrl/analytics",  label: "Analytics",  exact: false,
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { href: "/infinitum-ctrl/blogs",      label: "All Blogs",  exact: false,
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: "/infinitum-ctrl/activity",   label: "Activity",   exact: false,
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
];

function Sidebar({ stats, onLogout }: { stats: PlatformStats | null; onLogout: () => void }) {
  const pathname = usePathname();
  const [live, setLive] = useState(false);
  useEffect(() => { const id = setInterval(() => setLive(l => !l), 2500); return () => clearInterval(id); }, []);

  return (
    <aside style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 220, background: MGR.bg, borderRight: `1px solid ${MGR.border}`, display: "flex", flexDirection: "column", zIndex: 60 }}>
      {/* Logo */}
      <div style={{ padding: "1.375rem 1.25rem", borderBottom: `1px solid ${MGR.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: MGR.dim, border: `1px solid ${MGR.dimBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={MGR.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: MGR.text, fontWeight: 700, letterSpacing: "-0.01em" }}>Infinitum</div>
            <div style={{ fontSize: "0.58rem", color: MGR.textDim, letterSpacing: "0.08em", textTransform: "uppercase" }}>Manager</div>
          </div>
          <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#34d399", flexShrink: 0, boxShadow: `0 0 ${live ? "8px" : "3px"} #34d399`, transition: "box-shadow 1.2s ease" }} />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "0.875rem 0.75rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.1rem" }}>
        {NAV.map(n => {
          const active = n.exact ? pathname === n.href : pathname.startsWith(n.href) && pathname !== "/infinitum-ctrl";
          const trueActive = n.exact ? pathname === n.href : pathname.startsWith(n.href);
          return (
            <Link key={n.href} href={n.href} style={{
              display: "flex", alignItems: "center", gap: "0.7rem",
              padding: "0.6rem 0.875rem", borderRadius: 8, textDecoration: "none",
              background: trueActive ? MGR.dim : "transparent",
              color: trueActive ? MGR.accent : MGR.sub,
              fontSize: "0.8rem", fontFamily: "Inter, sans-serif", fontWeight: trueActive ? 600 : 400,
              borderLeft: `2px solid ${trueActive ? MGR.accent : "transparent"}`,
              transition: "all 0.13s ease",
            }}>
              {n.icon}
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Mini stats */}
      {stats && (
        <div style={{ padding: "1rem 1.25rem", borderTop: `1px solid ${MGR.border}`, borderBottom: `1px solid ${MGR.border}` }}>
          <p style={{ margin: "0 0 0.6rem", color: MGR.textDim, fontSize: "0.57rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Platform</p>
          {[["Blogs", stats.totalUsers], ["Posts", stats.totalPosts], ["Readers", stats.totalSubscribers]].map(([l, v]) => (
            <div key={String(l)} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0" }}>
              <span style={{ color: MGR.textDim, fontSize: "0.72rem" }}>{l}</span>
              <span style={{ color: MGR.text, fontSize: "0.75rem", fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Sign out */}
      <div style={{ padding: "0.875rem 0.75rem" }}>
        <button onClick={onLogout} style={{ width: "100%", background: "transparent", color: MGR.textDim, border: `1px solid ${MGR.border}`, borderRadius: 8, padding: "0.55rem", fontSize: "0.72rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem", fontFamily: "Inter, sans-serif", transition: "all 0.13s" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

function LoginScreen({ onLogin }: { onLogin: (s: PlatformStats) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setLoading(true);
    const res = await fetch("/api/manager/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", password }) });
    if (!res.ok) { setError((await res.json()).error || "Invalid access code"); setLoading(false); return; }
    const sr = await fetch("/api/manager/stats");
    if (!sr.ok) { setError("Failed to load platform data"); setLoading(false); return; }
    onLogin(await sr.json());
  };

  return (
    <div style={{ minHeight: "100vh", background: MGR.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", width: 48, height: 48, alignItems: "center", justifyContent: "center", background: MGR.dim, border: `1px solid ${MGR.dimBorder}`, borderRadius: 14, marginBottom: "1.25rem" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={MGR.accent} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.25rem", color: MGR.text, margin: "0 0 0.3rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Infinitum Manager</h1>
          <p style={{ color: MGR.textDim, fontFamily: "Inter, sans-serif", fontSize: "0.75rem", margin: 0 }}>Authorized access only</p>
        </div>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Access code" required autoFocus
            style={{ width: "100%", boxSizing: "border-box", background: MGR.card, border: `1px solid ${MGR.dimBorder}`, borderRadius: 10, padding: "0.875rem 1rem", color: MGR.text, fontFamily: "Inter, sans-serif", fontSize: "1rem", outline: "none", letterSpacing: "0.2em" }} />
          {error && <p style={{ margin: 0, color: "#f87171", fontFamily: "Inter, sans-serif", fontSize: "0.76rem" }}>✕ {error}</p>}
          <button type="submit" disabled={loading} style={{ background: MGR.accent2, color: "#fff", border: "none", borderRadius: 10, padding: "0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", fontWeight: 700, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1, letterSpacing: "0.01em" }}>
            {loading ? "Verifying…" : "Enter Platform →"}
          </button>
        </form>
      </div>
    </div>
  );
}

function MobileTopBar({ onLogout }: { onLogout: () => void }) {
  const pathname = usePathname();
  const current = NAV.find(n => n.exact ? pathname === n.href : pathname.startsWith(n.href))?.label ?? "Manager";
  return (
    <header className="mgr-topbar" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 80, height: 52, background: MGR.bg, borderBottom: `1px solid ${MGR.border}`, alignItems: "center", justifyContent: "space-between", padding: "0 1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: MGR.dim, border: `1px solid ${MGR.dimBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={MGR.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        </div>
        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: MGR.text, fontWeight: 700 }}>{current}</span>
      </div>
      <button onClick={onLogout} style={{ background: "transparent", border: `1px solid ${MGR.border}`, borderRadius: 7, padding: "0.35rem 0.75rem", color: MGR.textDim, fontFamily: "Inter, sans-serif", fontSize: "0.68rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.35rem" }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Out
      </button>
    </header>
  );
}

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="mgr-bottomnav" style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 80, height: 64, background: MGR.bg, borderTop: `1px solid ${MGR.border}`, alignItems: "center", justifyContent: "space-around", padding: "0 0.5rem" }}>
      {NAV.map(n => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", textDecoration: "none", color: active ? MGR.accent : MGR.sub, padding: "0.3rem 1rem", flex: 1 }}>
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: active ? 32 : 24, height: active ? 26 : 24, background: active ? MGR.dim : "transparent", borderRadius: 8, transition: "all 0.15s" }}>{n.icon}</span>
            <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.58rem", fontWeight: active ? 700 : 400, letterSpacing: "0.02em" }}>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    fetch("/api/manager/stats")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setAuthed(true); setStats(d); } else setAuthed(false); })
      .catch(() => setAuthed(false));
  }, []);

  const doLogout = useCallback(async () => {
    await fetch("/api/manager/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setAuthed(false); setStats(null);
  }, []);

  // Auto-logout on tab close; re-verify session when tab regains visibility
  useEffect(() => {
    if (!authed) return;
    const onUnload = () => {
      navigator.sendBeacon("/api/manager/auth", new Blob([JSON.stringify({ action: "logout" })], { type: "application/json" }));
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetch("/api/manager/stats")
          .then(r => { if (!r.ok) { setAuthed(false); setStats(null); } })
          .catch(() => {});
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [authed]);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/manager/stats");
    if (r.ok) setStats(await r.json());
  }, []);

  if (authed === null) return (
    <div style={{ minHeight: "100vh", background: MGR.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 36, height: 36 }}>
        <div style={{ position: "absolute", inset: 0, border: `2px solid ${MGR.dim}`, borderTop: `2px solid ${MGR.accent}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!authed) return <LoginScreen onLogin={d => { setAuthed(true); setStats(d); }} />;

  return (
    <ManagerContext.Provider value={{ stats, refresh, logout: doLogout }}>
      <div style={{ minHeight: "100vh", background: MGR.surface, fontFamily: "Inter, sans-serif", color: MGR.text }}>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes mgr-up { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
          .mgr-fade { animation: mgr-up 0.25s ease both; }
          .mgr-hover:hover { background: rgba(255,255,255,0.03) !important; }
          .mgr-row-hover:hover { background: rgba(255,255,255,0.025) !important; }
          .mgr-btn { opacity: 0.65; }
          .mgr-btn:hover { opacity: 1 !important; }
          /* Desktop: sidebar visible, no mobile bars */
          .mgr-sidebar-wrap { display: block; }
          .mgr-topbar { display: none; }
          .mgr-bottomnav { display: none; }
          .mgr-main { margin-left: 220px; min-height: 100vh; padding-bottom: 0; }
          /* Mobile: hide sidebar, show top/bottom nav */
          @media (max-width: 900px) {
            .mgr-sidebar-wrap { display: none !important; }
            .mgr-main { margin-left: 0 !important; padding-top: 52px; padding-bottom: 64px; }
            .mgr-topbar { display: flex !important; }
            .mgr-bottomnav { display: flex !important; }
          }
          .mgr-stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:2.5rem; }
          .mgr-two-col { display:grid; grid-template-columns:1fr 1fr; gap:1.5rem; }
          .mgr-page-pad { padding:2rem 2.5rem; }
          .mgr-header-pad { padding:2.5rem 2.5rem 2rem; }
          @media (max-width:900px) { .mgr-stat-grid { grid-template-columns:repeat(2,1fr); } .mgr-two-col { grid-template-columns:1fr; } .mgr-page-pad { padding:1.25rem; } .mgr-header-pad { padding:1.5rem 1.25rem 1.25rem; } }
          @media (max-width:480px) { .mgr-stat-grid { grid-template-columns:repeat(2,1fr); gap:0.75rem; } }
        `}</style>

        {/* Desktop sidebar */}
        <div className="mgr-sidebar-wrap"><Sidebar stats={stats} onLogout={doLogout} /></div>

        {/* Mobile top bar */}
        <MobileTopBar onLogout={doLogout} />

        <main className="mgr-main" style={{ display: "flex", flexDirection: "column" }}>
          {children}
        </main>

        {/* Mobile bottom nav */}
        <MobileBottomNav />
      </div>
    </ManagerContext.Provider>
  );
}
