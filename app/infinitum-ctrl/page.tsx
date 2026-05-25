"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useManager, MGR } from "./layout";

function useCountUp(target: number, duration = 1100) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

function StatCard({ label, value, suffix = "", sub, accent }: { label: string; value: number; suffix?: string; sub: string; accent: string }) {
  const count = useCountUp(value);
  return (
    <div style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${accent}18`, borderRadius: 14, padding: "1.75rem 1.5rem", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}cc, transparent)` }} />
      <p style={{ margin: "0 0 1.25rem", color: "rgba(143,163,177,0.5)", fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>{label}</p>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.75rem", color: accent, lineHeight: 1, marginBottom: "0.5rem", fontWeight: 600, letterSpacing: "-0.02em" }}>
        {count}{suffix}
      </div>
      <p style={{ margin: 0, color: "rgba(143,163,177,0.35)", fontSize: "0.7rem", lineHeight: 1.4 }}>{sub}</p>
    </div>
  );
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

export default function ManagerOverview() {
  const { stats } = useManager();
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  if (!stats) return (
    <div style={{ padding: "4rem", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(143,163,177,0.4)", fontSize: "0.85rem" }}>
      Loading…
    </div>
  );

  const onboarded = stats.users.filter(u => u.onboarded).length;
  const avgPosts = stats.users.length ? (stats.totalPosts / stats.users.length).toFixed(1) : "0";
  const completionPct = stats.users.length ? Math.round((onboarded / stats.users.length) * 100) : 0;
  const topWriters = [...stats.users].sort((a, b) => b.posts - a.posts).slice(0, 8);
  const maxPosts = Math.max(...topWriters.map(u => u.posts), 1);

  return (
    <div className="mgr-fade">
      {/* Page header */}
      <div style={{ padding: "2.5rem 2.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <p style={{ margin: "0 0 0.3rem", color: MGR.textDim, fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>Dashboard</p>
        <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.5rem", color: MGR.text, margin: 0, fontWeight: 700, letterSpacing: "-0.03em" }}>Overview</h1>
      </div>

      <div style={{ padding: "2rem 2.5rem" }}>
        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2.5rem" }}>
          <StatCard label="Total Blogs" value={stats.totalUsers} sub={`${onboarded} fully active`} accent={MGR.accent} />
          <StatCard label="Published Posts" value={stats.totalPosts} sub={`avg ${avgPosts} per blog`} accent="#4a9e8e" />
          <StatCard label="Subscribers" value={stats.totalSubscribers} sub="confirmed readers" accent="#7c6fff" />
          <StatCard label="Setup Complete" value={completionPct} suffix="%" sub={`${onboarded} of ${stats.users.length} onboarded`} accent="#e08060" />
        </div>

        {/* Two-column */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Top writers */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fffef9", fontSize: "0.88rem", fontWeight: 600 }}>Top Writers</span>
              <Link href="/infinitum-ctrl/blogs" style={{ color: MGR.accent, fontSize: "0.68rem", letterSpacing: "0.08em", textDecoration: "none", textTransform: "uppercase", opacity: 0.65 }}>See all →</Link>
            </div>
            <div>
              {topWriters.length === 0 && (
                <p style={{ padding: "2.5rem", textAlign: "center", color: "rgba(143,163,177,0.25)", fontSize: "0.82rem", margin: 0 }}>No blogs yet.</p>
              )}
              {topWriters.map((u, i) => (
                <div key={u.id} className="mgr-hover" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.02)", transition: "background 0.12s" }}>
                  <span style={{ color: "rgba(143,163,177,0.2)", fontSize: "0.68rem", width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#fffef9", fontSize: "0.83rem", fontWeight: 500, marginBottom: "0.35rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{u.username}</div>
                    <div style={{ height: 2, background: "rgba(255,255,255,0.04)", borderRadius: 1, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(u.posts / maxPosts) * 100}%`, background: `linear-gradient(90deg, ${MGR.accent}, ${MGR.accent}88)`, borderRadius: 1, transition: "width 0.7s ease" }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ color: MGR.accent, fontSize: "0.82rem", fontWeight: 700 }}>{u.posts}</div>
                    <div style={{ color: "rgba(143,163,177,0.3)", fontSize: "0.62rem" }}>{u.subscribers} readers</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent posts */}
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
            <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fffef9", fontSize: "0.88rem", fontWeight: 600 }}>Latest Posts</span>
              <Link href="/infinitum-ctrl/activity" style={{ color: MGR.accent, fontSize: "0.68rem", letterSpacing: "0.08em", textDecoration: "none", textTransform: "uppercase", opacity: 0.65 }}>Full feed →</Link>
            </div>
            <div>
              {stats.recentPosts.length === 0 && (
                <p style={{ padding: "2.5rem", textAlign: "center", color: "rgba(143,163,177,0.25)", fontSize: "0.82rem", margin: 0 }}>No posts yet.</p>
              )}
              {stats.recentPosts.slice(0, 8).map(p => (
                <div key={p.id} className="mgr-hover" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.02)", transition: "background 0.12s" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#fffef9", fontSize: "0.82rem", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.25rem" }}>{p.title}</div>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <span style={{ color: MGR.accent, fontSize: "0.68rem", fontWeight: 600 }}>@{p.user.username}</span>
                      <span style={{ color: "rgba(143,163,177,0.2)" }}>·</span>
                      <span style={{ color: "rgba(143,163,177,0.38)", fontSize: "0.68rem" }}>{timeAgo(p.publishedAt)}</span>
                      {p.views > 0 && <><span style={{ color: "rgba(143,163,177,0.2)" }}>·</span><span style={{ color: "rgba(143,163,177,0.38)", fontSize: "0.68rem" }}>{p.views} views</span></>}
                    </div>
                  </div>
                  <a href={`${siteUrl}/${p.user.username}/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(143,163,177,0.3)", textDecoration: "none", fontSize: "0.78rem", flexShrink: 0, transition: "color 0.15s" }} className="mgr-btn">↗</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
