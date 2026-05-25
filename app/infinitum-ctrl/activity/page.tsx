"use client";
import { useState, useMemo } from "react";
import { useManager, MGR } from "../layout";

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
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmt(date);
}

export default function ActivityPage() {
  const { stats } = useManager();
  const [filterUser, setFilterUser] = useState("all");
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  const posts = useMemo(() => {
    if (!stats) return [];
    if (filterUser === "all") return stats.recentPosts;
    return stats.recentPosts.filter(p => p.user.username === filterUser);
  }, [stats, filterUser]);

  const authors = useMemo(() => {
    if (!stats) return [];
    const seen = new Set<string>();
    return stats.recentPosts.reduce<string[]>((acc, p) => {
      if (!seen.has(p.user.username)) { seen.add(p.user.username); acc.push(p.user.username); }
      return acc;
    }, []);
  }, [stats]);

  return (
    <div className="mgr-fade">
      {/* Header */}
      <div className="mgr-header-pad" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: MGR.textDim, fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>Feed</p>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.5rem", color: MGR.text, margin: 0, fontWeight: 700, letterSpacing: "-0.03em" }}>Activity</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.72rem" }}>{posts.length} posts</span>
          {authors.length > 1 && (
            <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "0.5rem 0.875rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", outline: "none", cursor: "pointer" }}>
              <option value="all" style={{ background: "#0d1a2d" }}>All writers</option>
              {authors.map(a => <option key={a} value={a} style={{ background: "#0d1a2d" }}>@{a}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="mgr-page-pad">
        {posts.length === 0 ? (
          <div style={{ padding: "5rem", textAlign: "center", color: "rgba(143,163,177,0.25)", fontSize: "0.9rem" }}>
            {filterUser !== "all" ? `@${filterUser} hasn't published yet.` : "No published posts yet."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {posts.map((p, i) => (
              <div key={p.id} className="mgr-hover" style={{
                display: "flex", alignItems: "flex-start", gap: "1.25rem",
                padding: "1.25rem 1.5rem",
                borderBottom: i < posts.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                background: "rgba(255,255,255,0.015)", borderRadius: i === 0 ? "14px 14px 0 0" : i === posts.length - 1 ? "0 0 14px 14px" : 0,
                border: "1px solid rgba(255,255,255,0.05)",
                marginBottom: i < posts.length - 1 ? "-1px" : 0,
                transition: "background 0.12s",
              }}>
                {/* Timeline dot */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", flexShrink: 0, paddingTop: "0.15rem" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: MGR.accent, opacity: 0.6, flexShrink: 0 }} />
                  {i < posts.length - 1 && <div style={{ width: 1, height: "100%", background: MGR.dimBorder, flexShrink: 0, minHeight: 24 }} />}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.35rem", flexWrap: "wrap" }}>
                    <a href={`${siteUrl}/${p.user.username}`} target="_blank" rel="noopener noreferrer"
                      style={{ color: MGR.accent, fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
                      @{p.user.username}
                    </a>
                    <span style={{ color: "rgba(143,163,177,0.25)", fontSize: "0.65rem" }}>published</span>
                    <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.72rem" }}>{timeAgo(p.publishedAt)}</span>
                  </div>
                  <p style={{ margin: "0 0 0.5rem", color: "#fffef9", fontSize: "0.9rem", lineHeight: 1.45, fontFamily: "'Playfair Display', serif", fontWeight: 500 }}>{p.title}</p>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {p.views > 0 && (
                      <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.7rem" }}>
                        {p.views.toLocaleString()} views
                      </span>
                    )}
                    <span style={{ color: "rgba(143,163,177,0.2)", fontSize: "0.65rem" }}>{fmt(p.publishedAt)}</span>
                  </div>
                </div>

                <a href={`${siteUrl}/${p.user.username}/blog/${p.slug}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "rgba(143,163,177,0.35)", textDecoration: "none", fontSize: "0.72rem", flexShrink: 0, marginTop: "0.2rem", padding: "0.35rem 0.6rem", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, transition: "all 0.12s" }} className="mgr-btn">
                  Read ↗
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
