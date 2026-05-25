"use client";
import { useState, useEffect } from "react";

interface UserStat {
  id: number;
  username: string;
  email: string;
  role: string;
  onboarded: boolean;
  createdAt: string;
  posts: number;
  subscribers: number;
}

interface RecentPost {
  id: number;
  title: string;
  slug: string;
  publishedAt: string | null;
  views: number;
  user: { username: string };
}

interface Stats {
  totalUsers: number;
  totalPosts: number;
  totalSubscribers: number;
  users: UserStat[];
  recentPosts: RecentPost[];
}

function fmt(date: string | null) {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(date: string | null) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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

  useEffect(() => {
    fetch("/api/manager/stats")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) { setAuthed(true); setStats(data); }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(""); setLogging(true);
    const res = await fetch("/api/manager/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <div style={{ width: 36, height: 36, border: "2px solid rgba(200,169,126,0.15)", borderTop: "2px solid #c8a97e", borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (!authed) return (
    <div style={{ minHeight: "100vh", background: "#080f1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 48, height: 48, background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: 12, marginBottom: "1.25rem" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c8a97e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "#fffef9", margin: "0 0 0.35rem", fontWeight: 600 }}>Infinitum Manager</h1>
          <p style={{ color: "rgba(143,163,177,0.7)", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", margin: 0, letterSpacing: "0.04em" }}>Authorized access only</p>
        </div>

        <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Access Code</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter access code"
              required
              autoFocus
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,169,126,0.18)", borderRadius: 8, padding: "0.875rem 1rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", outline: "none", letterSpacing: "0.12em" }}
            />
          </div>
          {loginError && (
            <p style={{ margin: 0, color: "#e07070", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><circle cx="6" cy="6" r="6" opacity="0.2"/><path d="M6 4v2.5M6 8.5h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none"/></svg>
              {loginError}
            </p>
          )}
          <button type="submit" disabled={logging} style={{ background: logging ? "rgba(200,169,126,0.5)" : "#c8a97e", color: "#080f1a", border: "none", borderRadius: 8, padding: "0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.875rem", fontWeight: 700, cursor: logging ? "default" : "pointer", letterSpacing: "0.04em", transition: "background 0.15s" }}>
            {logging ? "Verifying…" : "Enter Platform"}
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

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "0.5rem 1rem",
    background: active ? "rgba(200,169,126,0.12)" : "transparent",
    border: "none",
    borderBottom: `2px solid ${active ? "#c8a97e" : "transparent"}`,
    color: active ? "#c8a97e" : "#8fa3b1",
    fontFamily: "Inter, sans-serif",
    fontSize: "0.78rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    cursor: "pointer",
    transition: "all 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#080f1a", color: "#e6edf3", fontFamily: "Inter, sans-serif" }}>

      {/* Topbar */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(8,15,26,0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(200,169,126,0.1)", height: 56, display: "flex", alignItems: "center", padding: "0 2rem" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#4a9e7a", boxShadow: "0 0 6px #4a9e7a" }} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "#c8a97e", fontWeight: 600 }}>Infinitum Manager</span>
          </div>
          <span style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.65rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>Platform Oversight · Read Only</span>
        </div>
        <button onClick={logout} style={{ background: "transparent", color: "#8fa3b1", border: "1px solid rgba(143,163,177,0.2)", borderRadius: 6, padding: "0.35rem 0.875rem", fontSize: "0.75rem", cursor: "pointer", letterSpacing: "0.04em", transition: "border-color 0.15s" }}>
          Sign Out
        </button>
      </div>

      <div style={{ paddingTop: 56 }}>

        {/* Summary strip */}
        <div style={{ background: "linear-gradient(135deg, rgba(13,31,60,0.8) 0%, rgba(8,15,26,0.6) 100%)", borderBottom: "1px solid rgba(200,169,126,0.08)", padding: "2rem" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ marginBottom: "1.75rem" }}>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", color: "#fffef9", margin: "0 0 0.3rem", fontWeight: 600 }}>Platform Overview</h2>
              <p style={{ color: "rgba(143,163,177,0.6)", fontSize: "0.75rem", margin: 0 }}>Live platform statistics — refreshes on page load</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
              {[
                { label: "Blogs", value: stats.totalUsers, sub: `${onboardedCount} active`, accent: "#c8a97e" },
                { label: "Posts", value: stats.totalPosts, sub: `avg ${avgPosts} per blog`, accent: "#4a9e8e" },
                { label: "Subscribers", value: stats.totalSubscribers, sub: "confirmed only", accent: "#7c6fff" },
                { label: "Completion", value: `${stats.users.length ? Math.round((onboardedCount / stats.users.length) * 100) : 0}%`, sub: "onboarding rate", accent: "#c8943a" },
              ].map(s => (
                <div key={s.label} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "1.25rem 1.5rem", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: s.accent, opacity: 0.6 }} />
                  <div style={{ color: "rgba(143,163,177,0.6)", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.75rem" }}>{s.label}</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.25rem", color: s.accent, lineHeight: 1, marginBottom: "0.4rem" }}>{s.value}</div>
                  <div style={{ color: "rgba(143,163,177,0.5)", fontSize: "0.7rem" }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: "1px solid rgba(200,169,126,0.08)", padding: "0 2rem" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: "0.25rem" }}>
            <button style={tabStyle(tab === "overview")} onClick={() => setTab("overview")}>Overview</button>
            <button style={tabStyle(tab === "users")} onClick={() => setTab("users")}>All Blogs</button>
            <button style={tabStyle(tab === "activity")} onClick={() => setTab("activity")}>Activity</button>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>

          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }} className="overview-grid">
              {/* Top blogs by posts */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,169,126,0.1)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(200,169,126,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#fffef9", fontSize: "0.85rem", fontWeight: 600 }}>Top Writers</span>
                  <span style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.68rem", letterSpacing: "0.06em" }}>BY POSTS</span>
                </div>
                {[...stats.users].sort((a, b) => b.posts - a.posts).slice(0, 6).map((u, i) => (
                  <div key={u.id} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.7rem", width: 14, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fffef9", fontSize: "0.82rem", fontWeight: 500 }}>@{u.username}</div>
                      <div style={{ color: "rgba(143,163,177,0.5)", fontSize: "0.7rem", marginTop: "0.1rem" }}>{u.subscribers} subscribers</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <div style={{ height: 4, width: Math.max(8, u.posts * 8), background: "#c8a97e", borderRadius: 2, opacity: 0.7, maxWidth: 80 }} />
                      <span style={{ color: "#c8a97e", fontSize: "0.72rem", fontWeight: 600 }}>{u.posts}</span>
                    </div>
                  </div>
                ))}
                {stats.users.length === 0 && <p style={{ padding: "2rem", textAlign: "center", color: "rgba(143,163,177,0.4)", fontSize: "0.82rem", margin: 0 }}>No blogs yet.</p>}
              </div>

              {/* Recent posts */}
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,169,126,0.1)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(200,169,126,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "#fffef9", fontSize: "0.85rem", fontWeight: 600 }}>Latest Posts</span>
                  <span style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.68rem", letterSpacing: "0.06em" }}>ACROSS ALL BLOGS</span>
                </div>
                {stats.recentPosts.slice(0, 8).map((p, i) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.875rem", padding: "0.875rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#fffef9", fontSize: "0.82rem", lineHeight: 1.35, marginBottom: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "#c8a97e", fontSize: "0.68rem" }}>@{p.user.username}</span>
                        <span style={{ color: "rgba(143,163,177,0.3)", fontSize: "0.6rem" }}>·</span>
                        <span style={{ color: "rgba(143,163,177,0.5)", fontSize: "0.68rem" }}>{timeAgo(p.publishedAt)}</span>
                        {p.views > 0 && <>
                          <span style={{ color: "rgba(143,163,177,0.3)", fontSize: "0.6rem" }}>·</span>
                          <span style={{ color: "rgba(143,163,177,0.45)", fontSize: "0.68rem" }}>{p.views} views</span>
                        </>}
                      </div>
                    </div>
                    <a href={`${siteUrl}/${p.user.username}/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2d7d9a", textDecoration: "none", fontSize: "0.7rem", flexShrink: 0, marginTop: "0.15rem", opacity: 0.8 }}>↗</a>
                  </div>
                ))}
                {stats.recentPosts.length === 0 && <p style={{ padding: "2rem", textAlign: "center", color: "rgba(143,163,177,0.4)", fontSize: "0.82rem", margin: 0 }}>No posts published yet.</p>}
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {tab === "users" && (
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,169,126,0.1)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(200,169,126,0.08)" }}>
                <span style={{ color: "#fffef9", fontSize: "0.85rem", fontWeight: 600 }}>{stats.totalUsers} {stats.totalUsers === 1 ? "Blog" : "Blogs"} on the Platform</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {["Writer", "Role", "Status", "Posts", "Subscribers", "Joined", ""].map(h => (
                        <th key={h} style={{ padding: "0.75rem 1.25rem", textAlign: "left", color: "rgba(143,163,177,0.5)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.users.map(u => (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.1s" }} className="user-row">
                        <td style={{ padding: "0.875rem 1.25rem" }}>
                          <div style={{ color: "#fffef9", fontWeight: 500, marginBottom: "0.15rem" }}>@{u.username}</div>
                          <div style={{ color: "rgba(143,163,177,0.45)", fontSize: "0.7rem" }}>{u.email}</div>
                        </td>
                        <td style={{ padding: "0.875rem 1.25rem" }}>
                          <span style={{ display: "inline-block", background: u.role === "owner" ? "rgba(200,169,126,0.15)" : "rgba(255,255,255,0.05)", color: u.role === "owner" ? "#c8a97e" : "#8fa3b1", borderRadius: 4, padding: "0.2rem 0.6rem", fontSize: "0.65rem", letterSpacing: "0.06em", fontWeight: 600 }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: "0.875rem 1.25rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: u.onboarded ? "#4a9e7a" : "#c8943a" }} />
                            <span style={{ color: u.onboarded ? "#4a9e7a" : "#c8943a", fontSize: "0.72rem" }}>{u.onboarded ? "Active" : "Setup pending"}</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.875rem 1.25rem", color: u.posts > 0 ? "#fffef9" : "rgba(143,163,177,0.4)", fontWeight: u.posts > 0 ? 600 : 400 }}>{u.posts}</td>
                        <td style={{ padding: "0.875rem 1.25rem", color: u.subscribers > 0 ? "#fffef9" : "rgba(143,163,177,0.4)" }}>{u.subscribers}</td>
                        <td style={{ padding: "0.875rem 1.25rem", color: "rgba(143,163,177,0.5)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{fmt(u.createdAt)}</td>
                        <td style={{ padding: "0.875rem 1.25rem" }}>
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
            <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(200,169,126,0.1)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(200,169,126,0.08)" }}>
                <span style={{ color: "#fffef9", fontSize: "0.85rem", fontWeight: 600 }}>Recent Publications</span>
              </div>
              {stats.recentPosts.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "flex-start", gap: "1rem", padding: "1.1rem 1.5rem", borderBottom: i < stats.recentPosts.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(200,169,126,0.08)", border: "1px solid rgba(200,169,126,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "0.1rem" }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c8a97e" strokeWidth="2" strokeLinecap="round">
                      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#fffef9", fontSize: "0.85rem", lineHeight: 1.4, marginBottom: "0.3rem" }}>{p.title}</div>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                      <a href={`${siteUrl}/${p.user.username}`} target="_blank" rel="noopener noreferrer" style={{ color: "#c8a97e", fontSize: "0.72rem", textDecoration: "none", fontWeight: 600 }}>@{p.user.username}</a>
                      <span style={{ color: "rgba(143,163,177,0.3)" }}>·</span>
                      <span style={{ color: "rgba(143,163,177,0.5)", fontSize: "0.72rem" }}>Published {timeAgo(p.publishedAt)}</span>
                      {p.views > 0 && (
                        <>
                          <span style={{ color: "rgba(143,163,177,0.3)" }}>·</span>
                          <span style={{ color: "rgba(143,163,177,0.5)", fontSize: "0.72rem" }}>{p.views.toLocaleString()} views</span>
                        </>
                      )}
                    </div>
                  </div>
                  <a href={`${siteUrl}/${p.user.username}/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "#2d7d9a", textDecoration: "none", fontSize: "0.75rem", flexShrink: 0, marginTop: "0.2rem", opacity: 0.8 }}>
                    Read post ↗
                  </a>
                </div>
              ))}
              {stats.recentPosts.length === 0 && (
                <div style={{ padding: "4rem", textAlign: "center" }}>
                  <p style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.85rem", margin: 0 }}>No published posts yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .overview-grid { @media (max-width: 768px) { grid-template-columns: 1fr !important; } }
        .user-row:hover { background: rgba(255,255,255,0.02) !important; }
        @media (max-width: 768px) { .overview-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
