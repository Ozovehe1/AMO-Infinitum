"use client";
import { useState, useEffect, useRef } from "react";

interface UserStat {
  id: number; username: string; email: string; role: string;
  onboarded: boolean; createdAt: string; posts: number; subscribers: number;
}
interface RecentPost {
  id: number; title: string; slug: string;
  publishedAt: string | null; views: number;
  user: { username: string };
}
interface Stats {
  totalUsers: number; totalPosts: number; totalSubscribers: number;
  users: UserStat[]; recentPosts: RecentPost[];
}

function fmt(date: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function timeAgo(date: string | null) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

function StatCard({ label, value, sub, accent, suffix = "" }: { label: string; value: number; sub: string; accent: string; suffix?: string }) {
  const count = useCountUp(value);
  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${accent}22`, borderRadius: 16, padding: "2rem 1.75rem", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}44)` }} />
      <div style={{ position: "absolute", bottom: -20, right: -10, width: 80, height: 80, borderRadius: "50%", background: accent, opacity: 0.04 }} />
      <p style={{ margin: "0 0 1rem", color: "rgba(143,163,177,0.6)", fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</p>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "3rem", color: accent, lineHeight: 1, marginBottom: "0.6rem", fontWeight: 600 }}>
        {count}{suffix}
      </div>
      <p style={{ margin: 0, color: "rgba(143,163,177,0.45)", fontSize: "0.72rem" }}>{sub}</p>
    </div>
  );
}

export default function InfinitumManager() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [logging, setLogging] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [tab, setTab] = useState<"overview" | "users" | "activity">("overview");
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    fetch("/api/manager/stats")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { setAuthed(true); setStats(data); } setChecking(false); })
      .catch(() => setChecking(false));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(id);
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(""); setLogging(true);
    const res = await fetch("/api/manager/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password }),
    });
    const data = await res.json();
    if (!res.ok) { setLoginError(data.error || "Invalid access code"); setLogging(false); return; }
    setAuthed(true); setLoadingStats(true);
    const sr = await fetch("/api/manager/stats");
    const sd = await sr.json();
    setStats(sd); setLoadingStats(false); setLogging(false);
  };

  const logout = async () => {
    await fetch("/api/manager/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) });
    setAuthed(false); setStats(null);
  };

  if (checking) return (
    <div style={{ minHeight: "100vh", background: "#080f1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: 48, height: 48 }}>
        <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(200,169,126,0.1)", borderTop: "2px solid rgba(200,169,126,0.4)", borderRadius: "50%", animation: "spin 1.4s linear infinite" }} />
        <div style={{ position: "absolute", inset: 8, border: "2px solid rgba(200,169,126,0.06)", borderTop: "2px solid #c8a97e", borderRadius: "50%", animation: "spin 0.7s linear infinite reverse" }} />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!authed) return (
    <div style={{ minHeight: "100vh", background: "#080f1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <div style={{ display: "inline-flex", width: 56, height: 56, alignItems: "center", justifyContent: "center", background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.18)", borderRadius: 16, marginBottom: "1.5rem" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8a97e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", color: "#fffef9", margin: "0 0 0.5rem", fontWeight: 600 }}>Infinitum Manager</h1>
          <p style={{ color: "rgba(143,163,177,0.5)", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", margin: 0, letterSpacing: "0.05em" }}>Authorized access only</p>
        </div>
        <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "0.6rem" }}>Access Code</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="············" required autoFocus
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: 10, padding: "1rem 1.1rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "1rem", outline: "none", letterSpacing: "0.18em" }} />
          </div>
          {loginError && <p style={{ margin: 0, color: "#e07070", fontFamily: "Inter, sans-serif", fontSize: "0.8rem" }}>✕ {loginError}</p>}
          <button type="submit" disabled={logging} style={{ background: "#c8a97e", color: "#080f1a", border: "none", borderRadius: 10, padding: "1rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", fontWeight: 700, cursor: logging ? "default" : "pointer", opacity: logging ? 0.7 : 1, letterSpacing: "0.03em", transition: "opacity 0.15s" }}>
            {logging ? "Verifying…" : "Enter Platform →"}
          </button>
        </form>
      </div>
    </div>
  );

  if (loadingStats || !stats) return (
    <div style={{ minHeight: "100vh", background: "#080f1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>Loading platform data…</p>
    </div>
  );

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";
  const onboardedCount = stats.users.filter(u => u.onboarded).length;
  const avgPosts = stats.users.length ? (stats.totalPosts / stats.users.length).toFixed(1) : "0";
  const completionPct = stats.users.length ? Math.round((onboardedCount / stats.users.length) * 100) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#080f1a", color: "#e6edf3", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .mgr-card { animation: fadeUp 0.35s ease both; }
        .mgr-row:hover { background: rgba(255,255,255,0.025) !important; }
        .mgr-tab { transition: all 0.15s ease; }
        @media (max-width: 700px) { .stat-grid { grid-template-columns: 1fr 1fr !important; } .overview-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Topbar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(8,15,26,0.92)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(200,169,126,0.08)", height: 58 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4a9e7a", boxShadow: `0 0 ${pulse ? "8px" : "4px"} #4a9e7a`, transition: "box-shadow 1s ease" }} />
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#c8a97e", fontWeight: 600, letterSpacing: "-0.01em" }}>Infinitum Manager</span>
            </div>
            <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>Platform Oversight · Read Only</span>
          </div>
          <button onClick={logout} style={{ background: "transparent", color: "#8fa3b1", border: "1px solid rgba(143,163,177,0.15)", borderRadius: 8, padding: "0.4rem 1rem", fontSize: "0.75rem", cursor: "pointer", letterSpacing: "0.04em" }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ paddingTop: 58 }}>

        {/* Hero stats */}
        <div style={{ background: "linear-gradient(160deg, rgba(13,31,60,0.6) 0%, rgba(8,15,26,0) 100%)", borderBottom: "1px solid rgba(200,169,126,0.07)", padding: "3rem 2rem 2.5rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <p style={{ margin: "0 0 0.4rem", color: "rgba(200,169,126,0.5)", fontSize: "0.65rem", letterSpacing: "0.18em", textTransform: "uppercase" }}>Live overview</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.4rem, 3vw, 1.9rem)", color: "#fffef9", margin: "0 0 2.5rem", fontWeight: 600 }}>Platform at a glance</h2>
            <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem" }}>
              <StatCard label="Blogs" value={stats.totalUsers} sub={`${onboardedCount} fully active`} accent="#c8a97e" />
              <StatCard label="Posts" value={stats.totalPosts} sub={`avg ${avgPosts} per blog`} accent="#4a9e8e" />
              <StatCard label="Subscribers" value={stats.totalSubscribers} sub="confirmed only" accent="#7c6fff" />
              <StatCard label="Onboarded" value={completionPct} sub="completion rate" accent="#c8943a" suffix="%" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: "1px solid rgba(200,169,126,0.07)", background: "rgba(8,15,26,0.6)", backdropFilter: "blur(8px)", position: "sticky", top: 58, zIndex: 40 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem", display: "flex", gap: "0" }}>
            {(["overview", "users", "activity"] as const).map(t => (
              <button key={t} className="mgr-tab" onClick={() => setTab(t)} style={{
                padding: "1rem 1.5rem", background: "transparent", border: "none",
                borderBottom: `2px solid ${tab === t ? "#c8a97e" : "transparent"}`,
                color: tab === t ? "#c8a97e" : "rgba(143,163,177,0.5)",
                fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer", fontWeight: tab === t ? 600 : 400,
              }}>
                {t === "users" ? "All Blogs" : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2.5rem 2rem 4rem" }}>

          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div className="overview-grid mgr-card" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,169,126,0.08)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "1.5rem 1.75rem", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#fffef9", fontSize: "0.9rem", fontWeight: 600 }}>Top Writers</span>
                  <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>By Posts</span>
                </div>
                {[...stats.users].sort((a, b) => b.posts - a.posts).slice(0, 6).map((u, i) => {
                  const maxPosts = Math.max(...stats.users.map(x => x.posts), 1);
                  return (
                    <div key={u.id} className="mgr-row" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1rem 1.75rem", borderBottom: "1px solid rgba(255,255,255,0.025)" }}>
                      <span style={{ color: "rgba(143,163,177,0.25)", fontSize: "0.7rem", width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: "#fffef9", fontSize: "0.85rem", fontWeight: 500, marginBottom: "0.4rem" }}>@{u.username}</div>
                        <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(u.posts / maxPosts) * 100}%`, background: "#c8a97e", borderRadius: 2, opacity: 0.7, transition: "width 0.8s ease" }} />
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ color: "#c8a97e", fontSize: "0.85rem", fontWeight: 700 }}>{u.posts}</div>
                        <div style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.65rem" }}>{u.subscribers} subs</div>
                      </div>
                    </div>
                  );
                })}
                {stats.users.length === 0 && <p style={{ padding: "3rem", textAlign: "center", color: "rgba(143,163,177,0.3)", fontSize: "0.85rem", margin: 0 }}>No blogs yet.</p>}
              </div>

              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,169,126,0.08)", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "1.5rem 1.75rem", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#fffef9", fontSize: "0.9rem", fontWeight: 600 }}>Latest Posts</span>
                  <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>Across All Blogs</span>
                </div>
                {stats.recentPosts.slice(0, 7).map(p => (
                  <div key={p.id} className="mgr-row" style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1rem 1.75rem", borderBottom: "1px solid rgba(255,255,255,0.025)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fffef9", fontSize: "0.84rem", lineHeight: 1.4, marginBottom: "0.3rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span style={{ color: "#c8a97e", fontSize: "0.7rem", fontWeight: 600 }}>@{p.user.username}</span>
                        <span style={{ color: "rgba(143,163,177,0.25)", fontSize: "0.6rem" }}>·</span>
                        <span style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.7rem" }}>{timeAgo(p.publishedAt)}</span>
                        {p.views > 0 && <><span style={{ color: "rgba(143,163,177,0.25)", fontSize: "0.6rem" }}>·</span><span style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.7rem" }}>{p.views} views</span></>}
                      </div>
                    </div>
                    <a href={`${siteUrl}/${p.user.username}/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2d7d9a", textDecoration: "none", fontSize: "0.75rem", flexShrink: 0, opacity: 0.7, marginTop: "0.1rem" }}>↗</a>
                  </div>
                ))}
                {stats.recentPosts.length === 0 && <p style={{ padding: "3rem", textAlign: "center", color: "rgba(143,163,177,0.3)", fontSize: "0.85rem", margin: 0 }}>No posts yet.</p>}
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {tab === "users" && (
            <div className="mgr-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,169,126,0.08)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "1.5rem 1.75rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: "#fffef9", fontSize: "0.9rem", fontWeight: 600 }}>{stats.totalUsers} {stats.totalUsers === 1 ? "Blog" : "Blogs"} on the Platform</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      {["Writer", "Role", "Status", "Posts", "Subscribers", "Joined", ""].map(h => (
                        <th key={h} style={{ padding: "0.875rem 1.5rem", textAlign: "left", color: "rgba(143,163,177,0.4)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.users.map(u => (
                      <tr key={u.id} className="mgr-row" style={{ borderBottom: "1px solid rgba(255,255,255,0.025)" }}>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <div style={{ color: "#fffef9", fontWeight: 500, marginBottom: "0.2rem" }}>@{u.username}</div>
                          <div style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.72rem" }}>{u.email}</div>
                        </td>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <span style={{ display: "inline-block", background: u.role === "owner" ? "rgba(200,169,126,0.12)" : "rgba(255,255,255,0.04)", color: u.role === "owner" ? "#c8a97e" : "#8fa3b1", borderRadius: 5, padding: "0.2rem 0.65rem", fontSize: "0.65rem", letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase" }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: u.onboarded ? "#4a9e7a" : "#c8943a", boxShadow: `0 0 5px ${u.onboarded ? "#4a9e7a" : "#c8943a"}` }} />
                            <span style={{ color: u.onboarded ? "#4a9e7a" : "#c8943a", fontSize: "0.75rem" }}>{u.onboarded ? "Active" : "Pending"}</span>
                          </div>
                        </td>
                        <td style={{ padding: "1rem 1.5rem", color: u.posts > 0 ? "#fffef9" : "rgba(143,163,177,0.3)", fontWeight: u.posts > 0 ? 600 : 400 }}>{u.posts}</td>
                        <td style={{ padding: "1rem 1.5rem", color: u.subscribers > 0 ? "#fffef9" : "rgba(143,163,177,0.3)" }}>{u.subscribers}</td>
                        <td style={{ padding: "1rem 1.5rem", color: "rgba(143,163,177,0.4)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{fmt(u.createdAt)}</td>
                        <td style={{ padding: "1rem 1.5rem" }}>
                          <a href={`${siteUrl}/${u.username}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2d7d9a", textDecoration: "none", fontSize: "0.75rem", opacity: 0.8 }}>View blog ↗</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ACTIVITY TAB */}
          {tab === "activity" && (
            <div className="mgr-card" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,169,126,0.08)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ padding: "1.5rem 1.75rem", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "#fffef9", fontSize: "0.9rem", fontWeight: 600 }}>Recent Publications</span>
                <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{stats.recentPosts.length} posts</span>
              </div>
              {stats.recentPosts.map((p, i) => (
                <div key={p.id} className="mgr-row" style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem", padding: "1.25rem 1.75rem", borderBottom: i < stats.recentPosts.length - 1 ? "1px solid rgba(255,255,255,0.025)" : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.1rem" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c8a97e" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#fffef9", fontSize: "0.88rem", lineHeight: 1.45, marginBottom: "0.4rem" }}>{p.title}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
                      <a href={`${siteUrl}/${p.user.username}`} target="_blank" rel="noopener noreferrer" style={{ color: "#c8a97e", fontSize: "0.73rem", textDecoration: "none", fontWeight: 600 }}>@{p.user.username}</a>
                      <span style={{ color: "rgba(143,163,177,0.25)" }}>·</span>
                      <span style={{ color: "rgba(143,163,177,0.45)", fontSize: "0.73rem" }}>Published {timeAgo(p.publishedAt)}</span>
                      {p.views > 0 && <><span style={{ color: "rgba(143,163,177,0.25)" }}>·</span><span style={{ color: "rgba(143,163,177,0.45)", fontSize: "0.73rem" }}>{p.views.toLocaleString()} views</span></>}
                    </div>
                  </div>
                  <a href={`${siteUrl}/${p.user.username}/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2d7d9a", textDecoration: "none", fontSize: "0.75rem", flexShrink: 0, marginTop: "0.25rem", opacity: 0.7 }}>
                    Read ↗
                  </a>
                </div>
              ))}
              {stats.recentPosts.length === 0 && (
                <div style={{ padding: "4rem", textAlign: "center" }}>
                  <p style={{ color: "rgba(143,163,177,0.3)", fontSize: "0.85rem", margin: 0 }}>No published posts yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
