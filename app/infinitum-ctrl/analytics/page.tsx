"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MGR } from "../layout";

type Range = "1m" | "3m" | "6m" | "12m";

interface TopPost { id: number; title: string; slug: string; views: number; publishedAt: string | null; readingTime: number; user: { username: string } }
interface TopBlog { username: string; posts: number; subscribers: number; views: number }
interface Data {
  totalViews: number; totalSubscribers: number; totalPosts: number; totalUsers: number;
  activeBlogs: number; recentlyActive: number;
  newUsersPeriod: number; prevNewUsers: number;
  newPostsPeriod: number; prevNewPosts: number;
  newSubscribersPeriod: number; prevNewSubscribers: number;
  usersByPeriod: Record<string, number>;
  postsByPeriod: Record<string, number>;
  subscribersByPeriod: Record<string, number>;
  granularity: "day" | "week" | "month";
  topBlogs: TopBlog[]; topPosts: TopPost[];
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtN(n: number) { if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`; if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`; return String(n); }
function fmtDate(d: string | null) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
function timeAgo(d: string | null) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "today"; if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`; return fmtDate(d);
}
function trendStr(curr: number, prev: number): { label: string; color: string } {
  if (prev === 0 && curr === 0) return { label: "no data", color: MGR.textDim };
  if (prev === 0) return { label: "new", color: "#34d399" };
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { label: `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs prev`, color: pct >= 0 ? "#34d399" : "#f87171" };
}
function yAxis(max: number): { ticks: number[]; axisMax: number } {
  if (max <= 0) return { ticks: [0, 1], axisMax: 1 };
  if (max <= 5) return { ticks: Array.from({ length: max + 1 }, (_, i) => i), axisMax: max };
  const rawStep = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = ([1, 2, 5, 10].map(s => s * mag).find(s => s >= rawStep)) ?? mag * 10;
  const axisMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= axisMax + step * 0.01; v += step) ticks.push(Math.round(v));
  return { ticks, axisMax };
}
function labelStep(n: number) { return n <= 6 ? 1 : n <= 12 ? 2 : n <= 20 ? 3 : 4; }

// ── useContainerWidth — makes any chart responsive ────────────────────────────
function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(500);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(e => setW(Math.floor(e[0].contentRect.width)));
    ro.observe(ref.current);
    setW(ref.current.getBoundingClientRect().width || 500);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, color, title }: { data: Record<string, number>; color: string; title: string }) {
  const { ref, w } = useContainerWidth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const H = 170, PAD = { t: 14, r: 12, b: 36, l: 38 };
  const labels = Object.keys(data), values = Object.values(data);
  const allZero = values.every(v => v === 0);
  const { ticks, axisMax } = yAxis(Math.max(...values, 0));
  const iW = w - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const gap = iW / (labels.length || 1);
  const barW = Math.max(3, gap * 0.55);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || w < 10) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = H * dpr;
    canvas.style.width = `${w}px`; canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, H);

    ticks.forEach((v, i) => {
      const y = Math.round(PAD.t + (1 - v / axisMax) * iH) + 0.5;
      ctx.beginPath(); ctx.strokeStyle = i === 0 ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1; ctx.moveTo(PAD.l, y); ctx.lineTo(w - PAD.r, y); ctx.stroke();
      ctx.font = "9px Inter,sans-serif"; ctx.fillStyle = MGR.textDim;
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(fmtN(v), PAD.l - 5, y);
    });

    if (allZero) {
      ctx.font = "11px Inter,sans-serif"; ctx.fillStyle = MGR.textDim;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("No data for this period", w / 2, H / 2); return;
    }

    values.forEach((v, i) => {
      const x = PAD.l + i * gap + (gap - barW) / 2;
      const bH = Math.max(2, (v / axisMax) * iH);
      const y = PAD.t + iH - bH;
      ctx.beginPath();
      const r = 3; ctx.moveTo(x + r, y); ctx.lineTo(x + barW - r, y);
      ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
      ctx.lineTo(x + barW, y + bH); ctx.lineTo(x, y + bH); ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
      ctx.fillStyle = i === hover ? color + "cc" : color + "66"; ctx.fill();
    });

    const step = labelStep(labels.length);
    labels.forEach((l, i) => {
      if (i % step !== 0 && i !== labels.length - 1) return;
      ctx.font = "9px Inter,sans-serif"; ctx.fillStyle = MGR.textDim;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(l, PAD.l + i * gap + gap / 2, PAD.t + iH + 7);
    });
  }, [w, values, ticks, axisMax, allZero, hover, gap, barW, labels, color, iH]);

  const onMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (w / rect.width);
    const idx = Math.floor((mx - PAD.l) / gap);
    setHover(idx >= 0 && idx < labels.length ? idx : null);
  }, [w, gap, labels.length]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
        <span style={{ color: MGR.text, fontSize: "0.82rem", fontWeight: 600 }}>{title}</span>
        {hover !== null && <span style={{ color, fontSize: "0.75rem", fontWeight: 700 }}>{labels[hover]}: {values[hover]}</span>}
      </div>
      <div ref={ref} style={{ width: "100%" }}>
        <canvas ref={canvasRef} style={{ display: "block", cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </div>
    </div>
  );
}

// ── Line chart ────────────────────────────────────────────────────────────────
function LineChart({ data, color, title }: { data: Record<string, number>; color: string; title: string }) {
  const { ref, w } = useContainerWidth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const H = 170, PAD = { t: 14, r: 12, b: 36, l: 38 };
  const labels = Object.keys(data), values = Object.values(data);
  const allZero = values.every(v => v === 0);
  const { ticks, axisMax } = yAxis(Math.max(...values, 0));
  const iW = w - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const pts = values.map((v, i) => ({
    x: labels.length <= 1 ? PAD.l + iW / 2 : PAD.l + (i / (labels.length - 1)) * iW,
    y: PAD.t + (1 - v / axisMax) * iH,
  }));

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || w < 10) return;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = H * dpr;
    canvas.style.width = `${w}px`; canvas.style.height = `${H}px`;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, H);

    ticks.forEach((v, i) => {
      const y = Math.round(PAD.t + (1 - v / axisMax) * iH) + 0.5;
      ctx.beginPath(); ctx.strokeStyle = i === 0 ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)";
      ctx.lineWidth = 1; ctx.moveTo(PAD.l, y); ctx.lineTo(w - PAD.r, y); ctx.stroke();
      ctx.font = "9px Inter,sans-serif"; ctx.fillStyle = MGR.textDim;
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(fmtN(v), PAD.l - 5, y);
    });

    if (allZero) {
      ctx.font = "11px Inter,sans-serif"; ctx.fillStyle = MGR.textDim;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("No data for this period", w / 2, H / 2); return;
    }

    if (pts.length > 1) {
      const grad = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + iH);
      grad.addColorStop(0, color + "25"); grad.addColorStop(1, color + "00");
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length-1].x, PAD.t + iH); ctx.lineTo(pts[0].x, PAD.t + iH);
      ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    }
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();

    if (hover !== null) {
      ctx.beginPath(); ctx.setLineDash([3, 4]);
      ctx.strokeStyle = color + "40"; ctx.lineWidth = 1;
      ctx.moveTo(pts[hover].x, PAD.t); ctx.lineTo(pts[hover].x, PAD.t + iH);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(pts[hover].x, pts[hover].y, 5, 0, Math.PI * 2);
      ctx.fillStyle = MGR.surface; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
    }

    const step = labelStep(labels.length);
    labels.forEach((l, i) => {
      if (i % step !== 0 && i !== labels.length - 1) return;
      ctx.font = "9px Inter,sans-serif"; ctx.fillStyle = MGR.textDim;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      ctx.fillText(l, pts[i].x, PAD.t + iH + 7);
    });
  }, [w, values, ticks, axisMax, allZero, hover, pts, labels, color, iH]);

  const onMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (w / rect.width);
    let closest = 0, minD = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(p.x - mx); if (d < minD) { minD = d; closest = i; } });
    setHover(minD < 50 ? closest : null);
  }, [pts, w]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
        <span style={{ color: MGR.text, fontSize: "0.82rem", fontWeight: 600 }}>{title}</span>
        {hover !== null && <span style={{ color, fontSize: "0.75rem", fontWeight: 700 }}>{labels[hover]}: {values[hover]}</span>}
      </div>
      <div ref={ref} style={{ width: "100%" }}>
        <canvas ref={canvasRef} style={{ display: "block", cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, curr, prev, accent }: { label: string; value: string | number; sub?: string; curr?: number; prev?: number; accent: string }) {
  const t = curr !== undefined && prev !== undefined ? trendStr(curr, prev) : null;
  return (
    <div style={{ background: MGR.card, border: `1px solid ${MGR.border}`, borderRadius: 10, padding: "1.25rem 1rem", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${accent}, transparent)` }} />
      <p style={{ margin: "0 0 0.75rem", color: MGR.textDim, fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</p>
      <div style={{ fontSize: "1.9rem", color: accent, fontWeight: 700, lineHeight: 1, marginBottom: "0.4rem", letterSpacing: "-0.02em", fontFamily: "Inter, sans-serif" }}>{value}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minHeight: 14 }}>
        {t && <span style={{ fontSize: "0.65rem", fontWeight: 700, color: t.color }}>{t.label}</span>}
        {sub && <span style={{ color: MGR.textDim, fontSize: "0.65rem" }}>{sub}</span>}
      </div>
    </div>
  );
}

function Shimmer() {
  return <div style={{ height: "100%", minHeight: 80, borderRadius: 8, background: `linear-gradient(90deg, ${MGR.card} 25%, rgba(255,255,255,0.04) 50%, ${MGR.card} 75%)`, backgroundSize: "400px 100%", animation: "mgr-shimmer 1.4s infinite linear" }} />;
}

const RANGES: { label: string; value: Range }[] = [{ label: "30D", value: "1m" }, { label: "3M", value: "3m" }, { label: "6M", value: "6m" }, { label: "12M", value: "12m" }];

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("3m");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    setLoading(true);
    fetch(`/api/manager/analytics?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  return (
    <div className="mgr-fade">
      <style>{`
        @keyframes mgr-shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .ana-grid-6 { display:grid; grid-template-columns:repeat(6,1fr); gap:0.875rem; }
        .ana-grid-3 { display:grid; grid-template-columns:repeat(3,1fr); gap:0.875rem; }
        .ana-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
        @media (max-width:1300px) { .ana-grid-6 { grid-template-columns:repeat(3,1fr) !important; } }
        @media (max-width:900px)  { .ana-grid-6 { grid-template-columns:repeat(2,1fr) !important; } .ana-grid-3 { grid-template-columns:repeat(2,1fr) !important; } .ana-grid-2 { grid-template-columns:1fr !important; } }
        @media (max-width:580px)  { .ana-grid-6 { grid-template-columns:1fr 1fr !important; } .ana-grid-3 { grid-template-columns:1fr 1fr !important; } }
      `}</style>

      {/* Header */}
      <div style={{ padding: "2rem 2rem 1.75rem", borderBottom: `1px solid ${MGR.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <p style={{ margin: "0 0 0.2rem", color: MGR.textDim, fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase" }}>Platform</p>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.5rem", color: MGR.text, margin: 0, fontWeight: 700, letterSpacing: "-0.02em" }}>Analytics</h1>
        </div>
        <div style={{ display: "flex", gap: "0.2rem", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "0.2rem" }}>
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)} style={{ background: range === r.value ? MGR.dim : "transparent", color: range === r.value ? MGR.accent : MGR.textDim, border: "none", borderRadius: 6, padding: "0.38rem 0.8rem", fontSize: "0.72rem", fontWeight: range === r.value ? 700 : 400, cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.13s" }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "1.75rem 2rem 3rem" }}>

        {/* 6-metric grid */}
        <div className="ana-grid-6" style={{ marginBottom: "1.5rem" }}>
          {loading ? Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ background: MGR.card, border: `1px solid ${MGR.border}`, borderRadius: 10, padding: "1.25rem 1rem", minHeight: 90 }}><Shimmer /></div>) : data ? (
            <>
              <StatCard label="Total Views" value={fmtN(data.totalViews)} sub="all time" accent={MGR.accent} />
              <StatCard label="Active Readers" value={fmtN(data.totalSubscribers)} sub="confirmed" curr={data.newSubscribersPeriod} prev={data.prevNewSubscribers} accent="#34d399" />
              <StatCard label="Published Posts" value={fmtN(data.totalPosts)} curr={data.newPostsPeriod} prev={data.prevNewPosts} accent="#a78bfa" />
              <StatCard label="Total Blogs" value={data.totalUsers} curr={data.newUsersPeriod} prev={data.prevNewUsers} sub={`${data.activeBlogs} active`} accent="#fb923c" />
              <StatCard label="New Signups" value={data.newUsersPeriod} curr={data.newUsersPeriod} prev={data.prevNewUsers} sub="this period" accent={MGR.accent} />
              <StatCard label="New Readers" value={data.newSubscribersPeriod} curr={data.newSubscribersPeriod} prev={data.prevNewSubscribers} sub="this period" accent="#34d399" />
            </>
          ) : null}
        </div>

        {/* Platform health — 3 bars */}
        <div className="ana-grid-3" style={{ marginBottom: "1.5rem" }}>
          {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ background: MGR.card, border: `1px solid ${MGR.border}`, borderRadius: 10, padding: "1.25rem", minHeight: 80 }}><Shimmer /></div>) : data ? (
            [
              { label: "Active blogs", val: data.activeBlogs, of: data.totalUsers, color: "#34d399", desc: "published ≥1 post" },
              { label: "Recently active", val: data.recentlyActive, of: data.activeBlogs || 1, color: MGR.accent, desc: "posted in last 30 days" },
              { label: "Silent blogs", val: data.activeBlogs - data.recentlyActive, of: data.activeBlogs || 1, color: "#fb923c", desc: "no recent posts" },
            ].map(h => {
              const pct = Math.round((h.val / h.of) * 100);
              return (
                <div key={h.label} style={{ background: MGR.card, border: `1px solid ${MGR.border}`, borderRadius: 10, padding: "1.1rem 1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.6rem" }}>
                    <span style={{ color: MGR.sub, fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>{h.label}</span>
                    <span style={{ color: h.color, fontSize: "1.2rem", fontWeight: 700 }}>{h.val}</span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden", marginBottom: "0.4rem" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: h.color, borderRadius: 2, opacity: 0.7 }} />
                  </div>
                  <span style={{ color: MGR.textDim, fontSize: "0.65rem" }}>{pct}% · {h.desc}</span>
                </div>
              );
            })
          ) : null}
        </div>

        {/* Charts — bar pair + line */}
        <div className="ana-grid-2" style={{ marginBottom: "1.25rem" }}>
          {[
            { dataKey: "usersByPeriod" as keyof Data, color: MGR.accent, title: "New Signups" },
            { dataKey: "postsByPeriod" as keyof Data, color: "#a78bfa", title: "Posts Published" },
          ].map(c => (
            <div key={c.title} style={{ background: MGR.card, border: `1px solid ${MGR.border}`, borderRadius: 12, padding: "1.25rem" }}>
              {loading ? <div style={{ height: 200 }}><Shimmer /></div>
                : data ? <BarChart data={data[c.dataKey] as Record<string, number>} color={c.color} title={c.title} />
                : null}
            </div>
          ))}
        </div>
        <div style={{ background: MGR.card, border: `1px solid ${MGR.border}`, borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem" }}>
          {loading ? <div style={{ height: 200 }}><Shimmer /></div>
            : data ? <LineChart data={data.subscribersByPeriod} color="#34d399" title="Platform Subscribers — Running Total" />
            : null}
        </div>

        {/* Rankings */}
        <div className="ana-grid-2">
          {/* Top Blogs */}
          <div style={{ background: MGR.card, border: `1px solid ${MGR.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${MGR.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: MGR.text, fontSize: "0.85rem", fontWeight: 600 }}>Top Blogs</span>
              <span style={{ color: MGR.textDim, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>by views</span>
            </div>
            {loading ? <div style={{ padding: "1.25rem" }}><Shimmer /></div>
              : !data?.topBlogs.length ? <p style={{ padding: "2.5rem", textAlign: "center", color: MGR.textDim, fontSize: "0.82rem", margin: 0 }}>No data yet.</p>
              : data.topBlogs.map((b, i) => {
                const maxV = data.topBlogs[0]?.views || 1;
                return (
                  <div key={b.username} className="mgr-hover" style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.8rem 1.25rem", borderBottom: `1px solid rgba(255,255,255,0.02)`, transition: "background 0.1s" }}>
                    <span style={{ color: MGR.textDim, fontSize: "0.65rem", width: 12, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <a href={`${siteUrl}/${b.username}`} target="_blank" rel="noopener noreferrer" style={{ color: MGR.text, fontSize: "0.8rem", fontWeight: 500, textDecoration: "none" }}>@{b.username}</a>
                        <span style={{ color: MGR.textDim, fontSize: "0.62rem" }}>{b.posts}p · {b.subscribers}r</span>
                      </div>
                      <div style={{ height: 2, background: "rgba(255,255,255,0.04)", borderRadius: 1, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(b.views / maxV) * 100}%`, background: MGR.accent, opacity: 0.6, borderRadius: 1 }} />
                      </div>
                    </div>
                    <span style={{ color: MGR.accent, fontSize: "0.8rem", fontWeight: 700, flexShrink: 0 }}>{fmtN(b.views)}</span>
                  </div>
                );
              })}
          </div>

          {/* Top Posts */}
          <div style={{ background: MGR.card, border: `1px solid ${MGR.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: `1px solid ${MGR.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: MGR.text, fontSize: "0.85rem", fontWeight: 600 }}>Top Posts</span>
              <span style={{ color: MGR.textDim, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>all blogs</span>
            </div>
            {loading ? <div style={{ padding: "1.25rem" }}><Shimmer /></div>
              : !data?.topPosts.length ? <p style={{ padding: "2.5rem", textAlign: "center", color: MGR.textDim, fontSize: "0.82rem", margin: 0 }}>No posts yet.</p>
              : data.topPosts.map((p, i) => (
                <div key={p.id} className="mgr-hover" style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.8rem 1.25rem", borderBottom: `1px solid rgba(255,255,255,0.02)`, transition: "background 0.1s" }}>
                  <span style={{ color: MGR.textDim, fontSize: "0.65rem", width: 12, textAlign: "right", flexShrink: 0, marginTop: "0.15rem" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: MGR.text, fontSize: "0.8rem", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "0.2rem" }}>{p.title}</div>
                    <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ color: MGR.accent, fontSize: "0.65rem", fontWeight: 600 }}>@{p.user.username}</span>
                      <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                      <span style={{ color: MGR.textDim, fontSize: "0.65rem" }}>{timeAgo(p.publishedAt)}</span>
                      <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
                      <span style={{ color: MGR.textDim, fontSize: "0.65rem" }}>{p.readingTime}min</span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.2rem" }}>
                    <span style={{ color: "#a78bfa", fontSize: "0.8rem", fontWeight: 700 }}>{fmtN(p.views)}</span>
                    <a href={`${siteUrl}/${p.user.username}/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ color: MGR.textDim, fontSize: "0.65rem", textDecoration: "none" }} className="mgr-btn">↗</a>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
