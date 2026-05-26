"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useManager, MGR } from "./layout";

function useCountUp(target: number, duration = 900) {
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

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 64, H = 24;
  if (values.length < 2) return <div style={{ width: W, height: H }} />;
  const max = Math.max(...values, 1);
  const allZero = values.every(v => v === 0);
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - (v / max) * (H - 3) - 1.5,
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", flexShrink: 0 }}>
      {allZero
        ? <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke={`${color}30`} strokeWidth="1.5" />
        : <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function TrendPill({ curr, prev }: { curr: number; prev: number }) {
  if (prev === 0 && curr === 0) return <span style={{ fontSize: "0.65rem", color: MGR.textDim }}>—</span>;
  if (prev === 0) return <span style={{ fontSize: "0.65rem", color: MGR.textDim, letterSpacing: "0.04em" }}>↑ new</span>;
  const pct = Math.round(((curr - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span style={{ fontSize: "0.65rem", color: up ? "#4a9e7a" : "#c05050", letterSpacing: "0.04em" }}>
      {up ? "↑" : "↓"} {Math.abs(pct)}%
    </span>
  );
}

function KpiCard({ label, value, suffix = "", sub, accent, spark, curr, prev }: {
  label: string; value: number; suffix?: string; sub: string;
  accent: string; spark?: number[]; curr?: number; prev?: number;
}) {
  const count = useCountUp(value);
  return (
    <div style={{
      background: MGR.card, border: `1px solid ${MGR.border}`,
      borderTop: `2px solid ${accent}`,
      borderRadius: 4, padding: "1rem",
      display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 0,
    }}>
      <p style={{ margin: 0, color: MGR.textDim, fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.5rem" }}>
        <span style={{ fontSize: "1.9rem", fontWeight: 800, color: MGR.text, lineHeight: 1, letterSpacing: "-0.04em" }}>
          {count.toLocaleString()}{suffix}
        </span>
        {spark && <Sparkline values={spark} color={accent} />}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
        {curr !== undefined && prev !== undefined && <TrendPill curr={curr} prev={prev} />}
        <span style={{ fontSize: "0.65rem", color: MGR.textDim }}>{sub}</span>
      </div>
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
    <div style={{ padding: "4rem", display: "flex", alignItems: "center", justifyContent: "center", color: MGR.textDim, fontSize: "0.85rem" }}>Loading…</div>
  );

  const onboarded = stats.users.filter(u => u.onboarded).length;
  const avgPosts = stats.users.length ? (stats.totalPosts / stats.users.length).toFixed(1) : "0";
  const topWriters = [...stats.users].sort((a, b) => b.posts - a.posts).slice(0, 8);
  const maxPosts = Math.max(...topWriters.map(u => u.posts), 1);

  // Simple sparklines from user post counts (ordered by join date)
  const postSpark = stats.users.map(u => u.posts);
  const subSpark = stats.users.map(u => u.subscribers);

  return (
    <div className="mgr-fade">
      {/* Header */}
      <div className="mgr-header-pad" style={{ borderBottom: `1px solid ${MGR.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <p style={{ margin: "0 0 0.2rem", color: MGR.textDim, fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>Dashboard</p>
          <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.03em", color: MGR.text }}>Overview</h1>
        </div>
        <Link href="/infinitum-ctrl/analytics" style={{ fontSize: "0.75rem", color: MGR.accent, textDecoration: "none", border: `1px solid ${MGR.dimBorder}`, borderRadius: 7, padding: "0.45rem 0.875rem", background: MGR.dim }}>
          Full Analytics →
        </Link>
      </div>

      <div className="mgr-p">
        {/* KPI row */}
        <div className="mgr-kpi-grid">
          <KpiCard label="Total Blogs" value={stats.totalUsers} sub={`${onboarded} onboarded`} accent={MGR.accent} spark={postSpark} />
          <KpiCard label="Published Posts" value={stats.totalPosts} sub={`avg ${avgPosts}/blog`} accent="#4a9e8e" spark={postSpark} />
          <KpiCard label="Subscribers" value={stats.totalSubscribers} sub="confirmed readers" accent="#7c6fff" spark={subSpark} />
          <KpiCard label="Active Blogs" value={onboarded} suffix="" sub={`${stats.users.length - onboarded} pending setup`} accent="#f59e0b" />
        </div>

        {/* Panels */}
        <div className="mgr-panels">
          {/* Top writers */}
          <div style={{ background: MGR.card, border: `1px solid ${MGR.border}`, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ padding: "0.875rem 1.1rem", borderBottom: `1px solid ${MGR.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: MGR.text }}>Top Writers</span>
              <Link href="/infinitum-ctrl/blogs" style={{ color: MGR.accent, fontSize: "0.65rem", textDecoration: "none", opacity: 0.8 }}>See all →</Link>
            </div>
            {topWriters.length === 0
              ? <p style={{ padding: "2rem", textAlign: "center", color: MGR.textDim, fontSize: "0.8rem", margin: 0 }}>No blogs yet.</p>
              : topWriters.map((u, i) => (
                <div key={u.id} className="mgr-hover" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.7rem 1.1rem", borderBottom: i < topWriters.length - 1 ? `1px solid ${MGR.border}` : "none" }}>
                  <span style={{ color: MGR.textDim, fontSize: "0.62rem", width: 12, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `hsl(${(u.id * 67) % 360},40%,30%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#fff", fontSize: "0.6rem", fontWeight: 700 }}>{u.username[0].toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: MGR.text, fontSize: "0.78rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{u.username}</div>
                    <div style={{ height: 2, background: "rgba(255,255,255,0.05)", borderRadius: 1, marginTop: 4 }}>
                      <div style={{ height: "100%", width: `${(u.posts / maxPosts) * 100}%`, background: MGR.accent, borderRadius: 1, transition: "width 0.6s ease" }} />
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ color: MGR.accent, fontSize: "0.78rem", fontWeight: 700 }}>{u.posts}</div>
                    <div style={{ color: MGR.textDim, fontSize: "0.58rem" }}>{u.subscribers}r</div>
                  </div>
                </div>
              ))
            }
          </div>

          {/* Recent posts */}
          <div style={{ background: MGR.card, border: `1px solid ${MGR.border}`, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ padding: "0.875rem 1.1rem", borderBottom: `1px solid ${MGR.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 600, color: MGR.text }}>Latest Posts</span>
              <Link href="/infinitum-ctrl/activity" style={{ color: MGR.accent, fontSize: "0.65rem", textDecoration: "none", opacity: 0.8 }}>Full feed →</Link>
            </div>
            {stats.recentPosts.length === 0
              ? <p style={{ padding: "2rem", textAlign: "center", color: MGR.textDim, fontSize: "0.8rem", margin: 0 }}>No posts yet.</p>
              : stats.recentPosts.slice(0, 8).map((p, i) => (
                <div key={p.id} className="mgr-hover" style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.7rem 1.1rem", borderBottom: i < Math.min(stats.recentPosts.length, 8) - 1 ? `1px solid ${MGR.border}` : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: MGR.text, fontSize: "0.78rem", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.2rem" }}>{p.title}</div>
                    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                      <span style={{ color: MGR.accent, fontSize: "0.62rem", fontWeight: 600 }}>@{p.user.username}</span>
                      <span style={{ color: MGR.textDim, fontSize: "0.55rem" }}>·</span>
                      <span style={{ color: MGR.textDim, fontSize: "0.62rem" }}>{timeAgo(p.publishedAt)}</span>
                      {p.views > 0 && <><span style={{ color: MGR.textDim, fontSize: "0.55rem" }}>·</span><span style={{ color: MGR.textDim, fontSize: "0.62rem" }}>{p.views}v</span></>}
                    </div>
                  </div>
                  <a href={`${siteUrl}/${p.user.username}/blog/${p.slug}`} target="_blank" rel="noopener noreferrer"
                    style={{ color: MGR.textDim, textDecoration: "none", fontSize: "0.75rem", flexShrink: 0, paddingTop: "0.1rem" }} className="mgr-btn">↗</a>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
}
