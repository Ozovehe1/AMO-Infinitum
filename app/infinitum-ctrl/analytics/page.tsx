"use client";
import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";

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

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtN(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function timeAgo(d: string | null) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}
function trendLabel(curr: number, prev: number): { label: string; color: string } {
  if (prev === 0 && curr === 0) return { label: "no data", color: "#8fa3b1" };
  if (prev === 0) return { label: "↑ new", color: "#4a9e7a" };
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { label: `${pct >= 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs prev`, color: pct >= 0 ? "#4a9e7a" : "#e05c5c" };
}
function computeYAxis(dataMax: number): { ticks: number[]; axisMax: number } {
  if (dataMax <= 0) return { ticks: [0, 1], axisMax: 1 };
  if (dataMax <= 5) return { ticks: Array.from({ length: dataMax + 1 }, (_, i) => i), axisMax: dataMax };
  const rawStep = dataMax / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = ([1, 2, 5, 10].map(s => s * mag).find(s => s >= rawStep)) ?? mag * 10;
  const axisMax = Math.ceil(dataMax / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= axisMax + step * 0.01; v += step) ticks.push(Math.round(v));
  return { ticks, axisMax };
}
function labelStep(n: number) { return n <= 6 ? 1 : n <= 12 ? 2 : n <= 20 ? 3 : 4; }
function getDisplayLabel(label: string, prev: string | null): string {
  if (!label.includes("'")) return label;
  const sp = label.indexOf(" ");
  const year = label.slice(sp + 1);
  if (!prev || !prev.includes("'")) return label;
  return prev.slice(prev.indexOf(" ") + 1) !== year ? label : label.slice(0, sp);
}
function canvasRR(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// ── skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ h = 40, r = 10 }: { h?: number; r?: number }) {
  return (
    <>
      <div style={{ height: h, borderRadius: r, background: "linear-gradient(90deg,#ede7dc 25%,#f5efe4 50%,#ede7dc 75%)", backgroundSize: "600px 100%", animation: "plat-shimmer 1.5s infinite linear" }} />
      <style>{`@keyframes plat-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
    </>
  );
}

// ── bar chart — canvas, scales like <img> ─────────────────────────────────────

function BarChart({ data, color = "#c8a97e" }: { data: Record<string, number>; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 480, H = 160, PAD = { t: 20, r: 16, b: 36, l: 42 };
  const labels = Object.keys(data), values = Object.values(data);
  const allZero = values.every(v => v === 0);
  const { ticks, axisMax } = computeYAxis(Math.max(...values, 0));
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const slot = iW / (labels.length || 1);
  const barW = Math.max(6, slot * 0.55);

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    ticks.forEach((v, i) => {
      const y = PAD.t + (1 - v / axisMax) * iH;
      ctx.beginPath();
      ctx.strokeStyle = i === 0 ? "rgba(13,31,60,0.1)" : "rgba(13,31,60,0.05)";
      ctx.lineWidth = 1; ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      ctx.font = "9px Inter,sans-serif"; ctx.fillStyle = "#aab8c2";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(fmtN(v), PAD.l - 5, y);
    });

    if (allZero) {
      ctx.font = "11px Inter,sans-serif"; ctx.fillStyle = "#8fa3b1";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("No data for this period", W / 2, H / 2); return;
    }

    const step = labelStep(labels.length);
    let prevVis: string | null = null;
    values.forEach((v, i) => {
      const bH = Math.max(2, (v / axisMax) * iH);
      const cx = PAD.l + i * slot + slot / 2;
      const bx = cx - barW / 2;
      const by = PAD.t + iH - bH;
      const isAct = i === hover;
      ctx.fillStyle = isAct ? color : color + "bb";
      canvasRR(ctx, bx, by, barW, bH, 3); ctx.fill();

      const showLabel = i === 0 || i === labels.length - 1 || i % step === 0;
      if (showLabel) {
        const display = getDisplayLabel(labels[i], prevVis);
        prevVis = labels[i];
        ctx.font = isAct ? "bold 9px Inter,sans-serif" : "9px Inter,sans-serif";
        ctx.fillStyle = isAct ? "#0d1f3c" : "#aab8c2";
        ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
        ctx.fillText(display, cx, H - 6);
      }

      if (isAct && v > 0) {
        const tipX = Math.min(Math.max(cx, PAD.l + 44), W - PAD.r - 44);
        const tipY = Math.max(4, by - 46);
        canvasRR(ctx, tipX - 44, tipY, 88, 34, 5);
        ctx.fillStyle = "#0d1f3c"; ctx.fill();
        ctx.font = "9px Inter,sans-serif"; ctx.fillStyle = "#8fa3b1";
        ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
        ctx.fillText(labels[i], tipX, tipY + 13);
        ctx.font = "bold 13px Inter,sans-serif"; ctx.fillStyle = color;
        ctx.fillText(String(v), tipX, tipY + 28);
      }
    });
  });

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    if (x < PAD.l || x > W - PAD.r) { setHover(null); return; }
    setHover(Math.max(0, Math.min(labels.length - 1, Math.floor((x - PAD.l) / slot))));
  };

  return <canvas ref={ref} width={W} height={H} style={{ display: "block", width: "100%", height: "auto", cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} />;
}

// ── line chart — canvas, scales like <img> ────────────────────────────────────

function LineChart({ data, color = "#6366f1" }: { data: Record<string, number>; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 480, H = 160, PAD = { t: 20, r: 16, b: 36, l: 42 };
  const labels = Object.keys(data), values = Object.values(data);
  const allZero = values.every(v => v === 0);
  const { ticks, axisMax } = computeYAxis(Math.max(...values, 0));
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const pts = values.map((v, i) => ({
    x: labels.length <= 1 ? PAD.l + iW / 2 : PAD.l + (i / (labels.length - 1)) * iW,
    y: PAD.t + (1 - v / axisMax) * iH,
  }));

  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    ticks.forEach((v, i) => {
      const y = PAD.t + (1 - v / axisMax) * iH;
      ctx.beginPath();
      ctx.strokeStyle = i === 0 ? "rgba(13,31,60,0.1)" : "rgba(13,31,60,0.05)";
      ctx.lineWidth = 1; ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      ctx.font = "9px Inter,sans-serif"; ctx.fillStyle = "#aab8c2";
      ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(fmtN(v), PAD.l - 5, y);
    });

    if (allZero) {
      ctx.font = "11px Inter,sans-serif"; ctx.fillStyle = "#8fa3b1";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("No data for this period", W / 2, H / 2); return;
    }

    if (pts.length > 1) {
      const grad = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + iH);
      grad.addColorStop(0, color + "28"); grad.addColorStop(1, color + "00");
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, PAD.t + iH); ctx.lineTo(pts[0].x, PAD.t + iH);
      ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    }
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.stroke();

    const step = labelStep(labels.length);
    let prevVis: string | null = null;
    labels.forEach((l, i) => {
      const isAct = i === hover;
      if (!isAct && i !== 0 && i !== labels.length - 1 && i % step !== 0) return;
      const display = getDisplayLabel(l, prevVis); prevVis = l;
      ctx.font = isAct ? "bold 9px Inter,sans-serif" : "9px Inter,sans-serif";
      ctx.fillStyle = isAct ? "#0d1f3c" : "#aab8c2";
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText(display, pts[i].x, H - 6);
    });

    if (hover !== null) {
      ctx.beginPath(); ctx.setLineDash([3, 3]);
      ctx.strokeStyle = color + "50"; ctx.lineWidth = 1;
      ctx.moveTo(pts[hover].x, PAD.t); ctx.lineTo(pts[hover].x, PAD.t + iH);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(pts[hover].x, pts[hover].y, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();

      const tipX = Math.min(Math.max(pts[hover].x, PAD.l + 44), W - PAD.r - 44);
      const tipY = Math.max(4, pts[hover].y - 50);
      canvasRR(ctx, tipX - 44, tipY, 88, 34, 5);
      ctx.fillStyle = "#0d1f3c"; ctx.fill();
      ctx.font = "9px Inter,sans-serif"; ctx.fillStyle = "#8fa3b1";
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText(labels[hover], tipX, tipY + 13);
      ctx.font = "bold 13px Inter,sans-serif"; ctx.fillStyle = color;
      ctx.fillText(fmtN(values[hover]), tipX, tipY + 28);
    }
  });

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = ref.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    if (x < PAD.l || x > W - PAD.r) { setHover(null); return; }
    let closest = 0, minD = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(p.x - x); if (d < minD) { minD = d; closest = i; } });
    setHover(minD < 60 ? closest : null);
  };

  return <canvas ref={ref} width={W} height={H} style={{ display: "block", width: "100%", height: "auto", cursor: "crosshair" }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} />;
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, trend, accent }: {
  label: string; value: string | number; sub?: string;
  trend?: { curr: number; prev: number }; accent: string;
}) {
  const t = trend ? trendLabel(trend.curr, trend.prev) : null;
  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(13,31,60,0.07)", borderTop: `3px solid ${accent}`, padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 0 }}>
      <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "0.63rem", color: "#8fa3b1", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
      <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "2rem", fontWeight: 800, color: "#0d1f3c", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</p>
      <div style={{ minHeight: 16, display: "flex", alignItems: "center", gap: "0.4rem" }}>
        {t && <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.7rem", fontWeight: 700, color: t.color }}>{t.label}</span>}
        {sub && <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.7rem", color: "#8fa3b1" }}>{sub}</span>}
      </div>
    </div>
  );
}

// ── range toggle ──────────────────────────────────────────────────────────────

const RANGES: { label: string; value: Range }[] = [
  { label: "30D", value: "1m" },
  { label: "3M",  value: "3m" },
  { label: "6M",  value: "6m" },
  { label: "12M", value: "12m" },
];

// ── page ──────────────────────────────────────────────────────────────────────

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

  const card: CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid rgba(13,31,60,0.07)", padding: "1.25rem 1.5rem" };
  const secLabel: CSSProperties = { margin: "0 0 0.2rem", fontFamily: "Inter,sans-serif", fontSize: "0.68rem", fontWeight: 700, color: "#0d1f3c", letterSpacing: "0.1em", textTransform: "uppercase" };
  const subText: CSSProperties = { margin: "0 0 1rem", fontFamily: "Inter,sans-serif", fontSize: "0.75rem", color: "#8fa3b1" };

  return (
    <div className="mgr-fade" style={{ background: "#f5f0e8", minHeight: "100vh" }}>
      <style>{`
        .plat-stats { display:grid; grid-template-columns:repeat(2,1fr); gap:0.75rem; margin-bottom:1.25rem; }
        .plat-health { display:grid; grid-template-columns:repeat(3,1fr); gap:0.75rem; margin-bottom:1.25rem; }
        .plat-charts { display:grid; grid-template-columns:1fr; gap:1rem; margin-bottom:1rem; }
        .plat-rankings { display:grid; grid-template-columns:1fr; gap:1rem; }
        @media (min-width:640px) {
          .plat-stats { grid-template-columns:repeat(4,1fr); }
        }
        @media (min-width:900px) {
          .plat-charts { grid-template-columns:1fr 1fr; }
          .plat-rankings { grid-template-columns:1fr 1fr; }
          .plat-health { grid-template-columns:repeat(3,1fr); }
        }
        @media (max-width:480px) {
          .plat-health { grid-template-columns:1fr 1fr; }
        }
        .plat-row:hover { background: rgba(13,31,60,0.02); }
      `}</style>

      {/* Header */}
      <div style={{ padding: "1.5rem 1.75rem 1.25rem", background: "#fff", borderBottom: "1px solid rgba(13,31,60,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <p style={{ margin: "0 0 0.15rem", fontFamily: "Inter,sans-serif", fontSize: "0.62rem", color: "#8fa3b1", letterSpacing: "0.14em", textTransform: "uppercase" }}>Infinitum Manager</p>
          <h1 style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "1.35rem", fontWeight: 800, color: "#0d1f3c", letterSpacing: "-0.02em" }}>Analytics</h1>
        </div>
        <div style={{ display: "flex", background: "rgba(13,31,60,0.06)", borderRadius: 8, padding: 3, gap: 2 }}>
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)} style={{ background: range === r.value ? "#0d1f3c" : "transparent", color: range === r.value ? "#fff" : "#8fa3b1", border: "none", borderRadius: 6, padding: "5px 13px", fontFamily: "Inter,sans-serif", fontSize: "0.72rem", fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "1.25rem 1.75rem 3rem" }}>

        {/* Stat cards — 2 col mobile / 4 col desktop */}
        <div className="plat-stats">
          {loading
            ? [0,1,2,3].map(i => <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(13,31,60,0.07)", padding: "1.1rem 1.25rem", minHeight: 100 }}><Skeleton h={60} /></div>)
            : data ? (
              <>
                <StatCard label="Total Views"      value={fmtN(data.totalViews)}           accent="#c8a97e" sub="all time" />
                <StatCard label="Readers"          value={fmtN(data.totalSubscribers)}      accent="#4a9e7a" trend={{ curr: data.newSubscribersPeriod, prev: data.prevNewSubscribers }} />
                <StatCard label="Posts Published"  value={fmtN(data.totalPosts)}            accent="#6366f1" trend={{ curr: data.newPostsPeriod, prev: data.prevNewPosts }} />
                <StatCard label="Active Blogs"     value={data.activeBlogs}                 accent="#f59e0b" sub={`${data.totalUsers} total signups`} />
              </>
            ) : null}
        </div>

        {/* Platform health — 3 bar blocks */}
        <div className="plat-health">
          {loading
            ? [0,1,2].map(i => <div key={i} style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(13,31,60,0.07)", padding: "1.1rem 1.25rem", minHeight: 80 }}><Skeleton h={50} /></div>)
            : data ? [
                { label: "Active blogs",    val: data.activeBlogs,                         of: data.totalUsers || 1,      color: "#4a9e7a", desc: "published ≥1 post" },
                { label: "Recently active", val: data.recentlyActive,                       of: data.activeBlogs || 1,     color: "#c8a97e", desc: "posted last 30d" },
                { label: "Silent blogs",    val: Math.max(0, data.activeBlogs - data.recentlyActive), of: data.activeBlogs || 1, color: "#f59e0b", desc: "no recent posts" },
              ].map(h => {
                const pct = Math.round((h.val / h.of) * 100);
                return (
                  <div key={h.label} style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(13,31,60,0.07)", padding: "1rem 1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.62rem", color: "#8fa3b1", letterSpacing: "0.08em", textTransform: "uppercase" }}>{h.label}</span>
                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: "1.35rem", fontWeight: 800, color: h.color, lineHeight: 1 }}>{h.val}</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(13,31,60,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: "0.35rem" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: h.color, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.65rem", color: "#8fa3b1" }}>{pct}% · {h.desc}</span>
                  </div>
                );
              }) : null}
        </div>

        {/* Charts — 1 col mobile, 2 col desktop */}
        <div className="plat-charts" style={{ marginBottom: "1rem" }}>
          {/* New Signups */}
          <div style={card}>
            <p style={secLabel}>New Signups</p>
            <p style={subText}>New registrations over time</p>
            {loading ? <Skeleton h={160} /> : data ? <BarChart data={data.usersByPeriod} color="#c8a97e" /> : null}
          </div>
          {/* Posts Published */}
          <div style={card}>
            <p style={secLabel}>Posts Published</p>
            <p style={subText}>Published posts over time</p>
            {loading ? <Skeleton h={160} /> : data ? <BarChart data={data.postsByPeriod} color="#6366f1" /> : null}
          </div>
        </div>

        {/* Subscriber running total — full width */}
        <div style={{ ...card, marginBottom: "1rem" }}>
          <p style={secLabel}>Platform Readers</p>
          <p style={subText}>Confirmed subscribers — running total across all blogs</p>
          {loading ? <Skeleton h={160} /> : data ? <LineChart data={data.subscribersByPeriod} color="#4a9e7a" /> : null}
        </div>

        {/* Rankings — 1 col mobile, 2 col desktop */}
        <div className="plat-rankings">
          {/* Top Blogs */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(13,31,60,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(13,31,60,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.82rem", fontWeight: 700, color: "#0d1f3c" }}>Top Blogs</span>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.6rem", color: "#8fa3b1", letterSpacing: "0.1em", textTransform: "uppercase" }}>by views</span>
            </div>
            {loading
              ? <div style={{ padding: "1.25rem" }}><Skeleton h={120} /></div>
              : !data?.topBlogs.length
              ? <p style={{ padding: "2rem", textAlign: "center", color: "#8fa3b1", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", margin: 0 }}>No blogs yet.</p>
              : data.topBlogs.map((b, i) => {
                  const maxV = data.topBlogs[0]?.views || 1;
                  return (
                    <div key={b.username} className="plat-row" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(13,31,60,0.04)", transition: "background 0.1s" }}>
                      <span style={{ fontFamily: "Inter,sans-serif", color: "#8fa3b1", fontSize: "0.65rem", width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginBottom: "0.2rem" }}>
                          <a href={`${siteUrl}/${b.username}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "Inter,sans-serif", color: "#0d1f3c", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>@{b.username}</a>
                          <span style={{ fontFamily: "Inter,sans-serif", color: "#8fa3b1", fontSize: "0.62rem" }}>{b.posts}p · {b.subscribers}r</span>
                        </div>
                        <div style={{ height: 3, background: "rgba(13,31,60,0.06)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(b.views / maxV) * 100}%`, background: "#c8a97e", borderRadius: 2 }} />
                        </div>
                      </div>
                      <span style={{ fontFamily: "Inter,sans-serif", color: "#c8a97e", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0 }}>{fmtN(b.views)}</span>
                    </div>
                  );
                })}
          </div>

          {/* Top Posts */}
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid rgba(13,31,60,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(13,31,60,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.82rem", fontWeight: 700, color: "#0d1f3c" }}>Top Posts</span>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.6rem", color: "#8fa3b1", letterSpacing: "0.1em", textTransform: "uppercase" }}>all blogs</span>
            </div>
            {loading
              ? <div style={{ padding: "1.25rem" }}><Skeleton h={120} /></div>
              : !data?.topPosts.length
              ? <p style={{ padding: "2rem", textAlign: "center", color: "#8fa3b1", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", margin: 0 }}>No posts yet.</p>
              : data.topPosts.map((p, i) => (
                  <div key={p.id} className="plat-row" style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.75rem 1.25rem", borderBottom: "1px solid rgba(13,31,60,0.04)", transition: "background 0.1s" }}>
                    <span style={{ fontFamily: "Inter,sans-serif", color: "#8fa3b1", fontSize: "0.65rem", width: 14, textAlign: "right", flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={`${siteUrl}/${p.user.username}/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "Inter,sans-serif", color: "#0d1f3c", fontSize: "0.8rem", lineHeight: 1.4, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none", marginBottom: "0.2rem" }}>{p.title}</a>
                      <div style={{ display: "flex", gap: "0.3rem", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "Inter,sans-serif", color: "#c8a97e", fontSize: "0.63rem", fontWeight: 600 }}>@{p.user.username}</span>
                        <span style={{ color: "rgba(13,31,60,0.15)" }}>·</span>
                        <span style={{ fontFamily: "Inter,sans-serif", color: "#8fa3b1", fontSize: "0.63rem" }}>{timeAgo(p.publishedAt)}</span>
                        <span style={{ color: "rgba(13,31,60,0.15)" }}>·</span>
                        <span style={{ fontFamily: "Inter,sans-serif", color: "#8fa3b1", fontSize: "0.63rem" }}>{p.readingTime}min</span>
                      </div>
                    </div>
                    <span style={{ fontFamily: "Inter,sans-serif", color: "#6366f1", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0 }}>{fmtN(p.views)}</span>
                  </div>
                ))}
          </div>
        </div>

      </div>
    </div>
  );
}
