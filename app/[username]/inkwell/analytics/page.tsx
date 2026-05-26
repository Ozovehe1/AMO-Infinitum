"use client";
import { useState, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import AdminNav from "@/components/AdminNav";
import { useParams } from "next/navigation";

type Range = "1m" | "3m" | "6m" | "12m";
type SortKey = "views" | "readingTime" | "publishedAt" | "title";
type SortDir = "asc" | "desc";

interface TopPost {
  id: number;
  title: string;
  slug: string;
  views: number;
  publishedAt: string | null;
  readingTime: number;
}

interface AnalyticsData {
  totalSubscribers: number;
  newSubscribers: number;
  prevNewSubscribers: number;
  pendingSubscribers: number;
  totalViews: number;
  totalPublished: number;
  topPosts: TopPost[];
  granularity: "day" | "week" | "month";
  subscribersByMonth: Record<string, number>;
  newSubscribersByMonth: Record<string, number>;
  postsByMonth: Record<string, number>;
  categories: { name: string; color: string; count: number }[];
}

const RANGES: { label: string; value: Range }[] = [
  { label: "30D", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "12M", value: "12m" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtAxis(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${+(v / 1_000_000).toPrecision(3)}M`;
  if (Math.abs(v) >= 1_000) return `${+(v / 1_000).toPrecision(3)}K`;
  return String(v);
}

function getLabelStep(count: number): number {
  if (count <= 6) return 1;
  if (count <= 12) return 2;
  if (count <= 20) return 3;
  return 4;
}

function getDisplayLabel(label: string, prev: string | null): string {
  if (!label.includes("'")) return label;
  const sp = label.indexOf(" ");
  const month = label.slice(0, sp);
  const year = label.slice(sp + 1);
  if (!prev || !prev.includes("'")) return label;
  return prev.slice(prev.indexOf(" ") + 1) !== year ? label : month;
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

function computeYAxisRange(dataMin: number, dataMax: number): { ticks: number[]; axisMin: number; axisMax: number } {
  const absMax = Math.max(Math.abs(dataMax), Math.abs(dataMin), 1);
  if (absMax <= 5) {
    const lo = Math.min(Math.floor(dataMin), 0), hi = Math.max(Math.ceil(dataMax), 1);
    const ticks: number[] = [];
    for (let v = lo; v <= hi; v++) ticks.push(v);
    return { ticks, axisMin: lo, axisMax: hi };
  }
  const rawStep = absMax / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = ([1, 2, 5, 10].map(s => s * mag).find(s => s >= rawStep)) ?? mag * 10;
  const axisMax = Math.ceil(Math.max(dataMax, 0) / step) * step || step;
  const axisMin = dataMin < 0 ? Math.floor(dataMin / step) * step : 0;
  const ticks: number[] = [];
  for (let v = axisMin; v <= axisMax + step * 0.01; v += step) ticks.push(Math.round(v));
  return { ticks, axisMin, axisMax };
}

function canvasRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ h = 40, r = 10 }: { h?: number; r?: number }) {
  return (
    <>
      <div style={{
        height: h, borderRadius: r,
        background: "linear-gradient(90deg,#ede7dc 25%,#f5efe4 50%,#ede7dc 75%)",
        backgroundSize: "600px 100%",
        animation: "amo-shimmer 1.5s infinite linear",
      }} />
      <style>{`@keyframes amo-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}`}</style>
    </>
  );
}

// ── Sparkline (SVG, fixed size — replaced element, no sizing issues) ──────────

function Sparkline({ values }: { values: number[] }) {
  const W = 72, H = 28;
  if (values.length < 2) return <div style={{ width: W, height: H }} />;
  const max = Math.max(...values, 1);
  const allZero = values.every(v => v === 0);
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - (v / max) * (H - 4) - 2,
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", flexShrink: 0 }}>
      {allZero
        ? <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="color-mix(in srgb, var(--admin-primary) 15%, transparent)" strokeWidth="1.5" />
        : <path d={d} fill="none" stroke="var(--admin-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

// ── Trend badge ───────────────────────────────────────────────────────────────

function TrendBadge({ curr, prev }: { curr: number; prev: number }) {
  const base: CSSProperties = { fontSize: "0.72rem", fontWeight: 700, fontFamily: "Inter,sans-serif" };
  if (prev === 0 && curr === 0) return <span style={{ ...base, color: "var(--admin-sidebar-muted)", fontWeight: 400 }}>no prior data</span>;
  if (prev === 0) return <span style={{ ...base, color: "#4a9e7a" }}>↑ new growth</span>;
  const pct = Math.round(((curr - prev) / prev) * 100);
  const up = pct >= 0;
  return <span style={{ ...base, color: up ? "#4a9e7a" : "#e05c5c" }}>{up ? "↑" : "↓"} {Math.abs(pct)}% vs prev</span>;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, sparkValues, trend, accent = "var(--admin-accent)" }: {
  label: string; value: string | number; sub?: string;
  sparkValues?: number[]; trend?: { curr: number; prev: number }; accent?: string;
}) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      border: "1px solid var(--admin-primary-border)",
      borderTop: `3px solid ${accent}`,
      padding: "1.1rem 1.25rem",
      display: "flex", flexDirection: "column", gap: "0.4rem",
      minWidth: 0,
    }}>
      <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "0.65rem", color: "var(--admin-sidebar-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "0.5rem" }}>
        <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "2rem", fontWeight: 800, color: "var(--admin-primary)", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</p>
        {sparkValues && <Sparkline values={sparkValues} />}
      </div>
      <div style={{ minHeight: 16, display: "flex", alignItems: "center", gap: "0.4rem" }}>
        {trend && <TrendBadge curr={trend.curr} prev={trend.prev} />}
        {sub && <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.7rem", color: "var(--admin-sidebar-muted)" }}>{sub}</span>}
      </div>
    </div>
  );
}

// ── Canvas line chart ─────────────────────────────────────────────────────────
// Canvas is a replaced element — width:100% height:auto works exactly like
// <img> sizing. No SVG compositing bugs, no height computation issues.

function LineChart({ data }: { data: Record<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const W = 480, H = 160, PAD = { t: 20, r: 16, b: 36, l: 42 };
  const labels = Object.keys(data);
  const values = Object.values(data);
  const allZero = values.every(v => v === 0);
  const { ticks, axisMax } = computeYAxis(Math.max(...values, 0));
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const pts = values.map((v, i) => ({
    x: labels.length <= 1 ? PAD.l + iW / 2 : PAD.l + (i / (labels.length - 1)) * iW,
    y: PAD.t + (1 - v / axisMax) * iH,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    ticks.forEach((v, i) => {
      const y = PAD.t + (1 - v / axisMax) * iH;
      const isEdge = i === 0 || i === ticks.length - 1;
      ctx.beginPath();
      ctx.strokeStyle = isEdge ? "rgba(13,31,60,0.1)" : "rgba(13,31,60,0.05)";
      ctx.lineWidth = 1;
      ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      ctx.font = "9px Inter,sans-serif";
      ctx.fillStyle = "#aab8c2";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(fmtAxis(v), PAD.l - 6, y);
    });

    if (allZero) {
      ctx.font = "11px Inter,sans-serif";
      ctx.fillStyle = "#8fa3b1";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("No data yet for this period", W / 2, H / 2);
      return;
    }

    if (pts.length > 1) {
      const grad = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + iH);
      grad.addColorStop(0, "rgba(200,169,126,0.18)");
      grad.addColorStop(1, "rgba(200,169,126,0)");
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length - 1].x, PAD.t + iH);
      ctx.lineTo(pts[0].x, PAD.t + iH);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = "#c8a97e";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();

    if (activeIdx !== null) {
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = "rgba(200,169,126,0.4)";
      ctx.lineWidth = 1;
      ctx.moveTo(pts[activeIdx].x, PAD.t);
      ctx.lineTo(pts[activeIdx].x, PAD.t + iH);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    pts.forEach((p, i) => {
      const isAct = i === activeIdx;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isAct ? 5.5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isAct ? "#fff" : "#c8a97e";
      ctx.fill();
      if (isAct) { ctx.strokeStyle = "#c8a97e"; ctx.lineWidth = 2.5; ctx.stroke(); }
    });

    const step = getLabelStep(labels.length);
    let prevVis: string | null = null;
    labels.forEach((l, i) => {
      const isFirst = i === 0;
      const isLast = i === labels.length - 1 && (labels.length - 1) % step >= Math.ceil(step / 2);
      if (!isFirst && !isLast && i % step !== 0) return;
      const display = getDisplayLabel(l, prevVis);
      prevVis = l;
      ctx.font = i === activeIdx ? "bold 9px Inter,sans-serif" : "9px Inter,sans-serif";
      ctx.fillStyle = i === activeIdx ? "#0d1f3c" : "#aab8c2";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(display, pts[i].x, H - 6);
    });

    if (activeIdx !== null) {
      const p = pts[activeIdx];
      const tipX = Math.min(Math.max(p.x, PAD.l + 40), W - PAD.r - 40);
      const tipY = Math.max(4, p.y - 52);
      canvasRoundRect(ctx, tipX - 40, tipY, 80, 36, 5);
      ctx.fillStyle = "#0d1f3c";
      ctx.fill();
      ctx.font = "9px Inter,sans-serif";
      ctx.fillStyle = "#8fa3b1";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(labels[activeIdx], tipX, tipY + 13);
      ctx.font = "bold 13px Inter,sans-serif";
      ctx.fillStyle = "#c8a97e";
      ctx.fillText(values[activeIdx].toLocaleString(), tipX, tipY + 28);
    }
  });

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    if (x < PAD.l || x > W - PAD.r) { setActiveIdx(null); return; }
    setActiveIdx(Math.max(0, Math.min(labels.length - 1, Math.round(((x - PAD.l) / iW) * (labels.length - 1)))));
  };

  return (
    <canvas ref={canvasRef} width={W} height={H}
      style={{ display: "block", width: "100%", height: "auto", cursor: "crosshair" }}
      onMouseMove={handleMove} onMouseLeave={() => setActiveIdx(null)}
    />
  );
}

// ── Canvas bar chart ──────────────────────────────────────────────────────────

function BarChart({ data, unit = "", emptyMsg = "No data this period", allowNegative = false }: {
  data: Record<string, number>; unit?: string; emptyMsg?: string; allowNegative?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const W = 480, H = 160, PAD = { t: 20, r: 16, b: 36, l: 42 };
  const labels = Object.keys(data);
  const values = Object.values(data);
  const allZero = values.every(v => v === 0);
  const rawMin = allowNegative ? Math.min(...values, 0) : 0;
  const rawMax = Math.max(...values, 0);
  const { ticks, axisMin, axisMax } = computeYAxisRange(rawMin, rawMax);
  const totalRange = axisMax - axisMin;
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const slot = iW / labels.length;
  const barW = Math.max(6, slot * 0.55);
  const zeroY = PAD.t + (1 - (0 - axisMin) / totalRange) * iH;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);

    ticks.forEach((v, i) => {
      const y = PAD.t + (1 - (v - axisMin) / totalRange) * iH;
      const isZero = v === 0 && allowNegative && axisMin < 0;
      const isEdge = i === 0 || i === ticks.length - 1;
      ctx.beginPath();
      ctx.strokeStyle = isZero ? "rgba(13,31,60,0.25)" : isEdge ? "rgba(13,31,60,0.1)" : "rgba(13,31,60,0.05)";
      ctx.lineWidth = isZero ? 1.5 : 1;
      ctx.moveTo(PAD.l, y); ctx.lineTo(W - PAD.r, y); ctx.stroke();
      ctx.font = "9px Inter,sans-serif";
      ctx.fillStyle = "#aab8c2";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(fmtAxis(v), PAD.l - 6, y);
    });

    if (allZero) {
      ctx.font = "11px Inter,sans-serif";
      ctx.fillStyle = "#8fa3b1";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(emptyMsg, W / 2, H / 2);
      return;
    }

    const step = getLabelStep(labels.length);
    let prevVis: string | null = null;
    values.forEach((v, i) => {
      const isPos = v >= 0;
      const barH = (Math.abs(v) / totalRange) * iH;
      const cx = PAD.l + i * slot + slot / 2;
      const bx = cx - barW / 2;
      const by = isPos ? zeroY - barH : zeroY;
      const isAct = i === activeIdx;
      ctx.fillStyle = allowNegative && !isPos
        ? (isAct ? "#c94040" : "#e05c5c")
        : (isAct ? "#b8966a" : "#c8a97e");
      ctx.globalAlpha = isAct ? 1 : 0.82;
      canvasRoundRect(ctx, bx, by, barW, Math.max(barH, 0.5), 3);
      ctx.fill();
      ctx.globalAlpha = 1;

      const isFirst = i === 0;
      const isLast = i === labels.length - 1 && (labels.length - 1) % step >= Math.ceil(step / 2);
      const showLabel = isFirst || isLast || i % step === 0;
      if (showLabel) {
        const display = getDisplayLabel(labels[i], prevVis);
        prevVis = labels[i];
        ctx.font = isAct ? "bold 9px Inter,sans-serif" : "9px Inter,sans-serif";
        ctx.fillStyle = isAct ? "#0d1f3c" : "#aab8c2";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(display, cx, H - 6);
      }

      if (isAct && v !== 0) {
        const tipX = Math.min(Math.max(cx, PAD.l + 40), W - PAD.r - 40);
        const tipY = isPos ? Math.max(4, by - 52) : Math.min(zeroY + barH + 8, H - 48);
        canvasRoundRect(ctx, tipX - 40, tipY, 80, 36, 5);
        ctx.fillStyle = "#0d1f3c";
        ctx.fill();
        ctx.font = "9px Inter,sans-serif";
        ctx.fillStyle = "#8fa3b1";
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(labels[i], tipX, tipY + 13);
        const tipLabel = allowNegative ? `${v > 0 ? "+" : ""}${v} net` : unit === "" ? `${v} sub${v !== 1 ? "s" : ""}` : `${v}${unit}`;
        ctx.font = "bold 13px Inter,sans-serif";
        ctx.fillStyle = isPos ? "#c8a97e" : "#e05c5c";
        ctx.fillText(tipLabel, tipX, tipY + 28);
      }
    });
  });

  const handleMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    if (x < PAD.l || x > W - PAD.r) { setActiveIdx(null); return; }
    const idx = Math.floor((x - PAD.l) / slot);
    setActiveIdx(Math.max(0, Math.min(labels.length - 1, idx)));
  };

  return (
    <canvas ref={canvasRef} width={W} height={H}
      style={{ display: "block", width: "100%", height: "auto" }}
      onMouseMove={handleMove} onMouseLeave={() => setActiveIdx(null)}
    />
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function paginationPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3) pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { username } = useParams<{ username: string }>();
  const [range, setRange] = useState<Range>("1m");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("views");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?range=${range}`)
      .then(r => r.json())
      .then(d => {
        setData(d);
        setLoading(false);
        setUpdatedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      })
      .catch(() => setLoading(false));
  }, [range]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir(key === "title" ? "asc" : "desc"); }
    setPage(1);
  };

  const sortedPosts = data ? [...data.topPosts]
    .filter(p => p.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av: string | number, bv: string | number;
      if (sortKey === "title") { av = a.title.toLowerCase(); bv = b.title.toLowerCase(); }
      else if (sortKey === "publishedAt") { av = a.publishedAt ?? ""; bv = b.publishedAt ?? ""; }
      else { av = a[sortKey]; bv = b[sortKey]; }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    }) : [];

  const totalPages = Math.ceil(sortedPosts.length / PAGE_SIZE);
  const pagedPosts = sortedPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const card: CSSProperties = {
    background: "#fff", borderRadius: 12,
    border: "1px solid var(--admin-primary-border)",
    padding: "1.25rem 1.5rem",
  };
  const secLabel: CSSProperties = {
    margin: "0 0 0.25rem", fontFamily: "Inter,sans-serif",
    fontSize: "0.7rem", fontWeight: 700, color: "var(--admin-primary)",
    letterSpacing: "0.1em", textTransform: "uppercase",
  };
  const subText: CSSProperties = {
    margin: "0 0 1rem", fontFamily: "Inter,sans-serif",
    fontSize: "0.75rem", color: "var(--admin-sidebar-muted)",
  };

  const TH = ({ col, children }: { col: SortKey; children: React.ReactNode }) => (
    <th onClick={() => handleSort(col)} style={{
      textAlign: "left", padding: "0 0.75rem 0.75rem 0",
      fontFamily: "Inter,sans-serif", fontSize: "0.65rem",
      color: sortKey === col ? "var(--admin-primary)" : "var(--admin-sidebar-muted)",
      letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700,
      borderBottom: "2px solid var(--admin-primary-border)",
      cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
    }}>
      {children}{sortKey === col ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  const sparkSubs = data ? Object.values(data.subscribersByMonth) : [];
  const sparkPosts = data ? Object.values(data.postsByMonth) : [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--admin-bg)" }}>
      <AdminNav />
      <main className="admin-main" style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
        <div style={{ maxWidth: 960, width: "100%", paddingBottom: "4rem" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ margin: "0 0 3px", fontFamily: "Inter,sans-serif", fontSize: "1.4rem", fontWeight: 800, color: "var(--admin-primary)", letterSpacing: "-0.02em" }}>Analytics</h1>
              <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "0.75rem", color: "var(--admin-sidebar-muted)" }}>
                {updatedAt ? `Updated at ${updatedAt}` : "Your blog at a glance"}
              </p>
            </div>
            <div style={{ display: "flex", background: "color-mix(in srgb, var(--admin-primary) 6%, transparent)", borderRadius: 8, padding: 3, gap: 2 }}>
              {RANGES.map(r => (
                <button key={r.value} onClick={() => setRange(r.value)} style={{
                  background: range === r.value ? "var(--admin-primary)" : "transparent",
                  color: range === r.value ? "#fff" : "var(--admin-sidebar-muted)",
                  border: "none", borderRadius: 6, padding: "5px 14px",
                  fontFamily: "Inter,sans-serif", fontSize: "0.75rem", fontWeight: 600,
                  cursor: "pointer", transition: "all 0.15s",
                }}>{r.label}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div className="stats-grid">{[0,1,2,3].map(i => <Skeleton key={i} h={108} />)}</div>
              <div className="charts-grid"><Skeleton h={220} /><Skeleton h={220} /></div>
              <Skeleton h={300} /><Skeleton h={160} />
            </div>
          ) : !data ? (
            <p style={{ textAlign: "center", padding: "3rem", color: "#e05c5c", fontFamily: "Inter,sans-serif", fontSize: "0.875rem" }}>Failed to load analytics.</p>
          ) : (
            <>
              {/* Stat cards */}
              <div className="stats-grid" style={{ marginBottom: "1.25rem" }}>
                <StatCard label="Subscribers" value={data.totalSubscribers.toLocaleString()}
                  sub={data.pendingSubscribers > 0 ? `${data.pendingSubscribers} pending` : "verified"}
                  sparkValues={sparkSubs} accent="#4a9e7a" />
                <StatCard label="New this period" value={data.newSubscribers.toLocaleString()}
                  sparkValues={sparkSubs} trend={{ curr: data.newSubscribers, prev: data.prevNewSubscribers }} accent="var(--admin-accent)" />
                <StatCard label="Total Views" value={data.totalViews.toLocaleString()} sub="all time"
                  sparkValues={sparkPosts} accent="#6b9fd4" />
                <StatCard label="Posts Published" value={data.totalPublished.toLocaleString()} sub="all time"
                  sparkValues={sparkPosts} accent="#b07fd4" />
              </div>

              {/* Charts */}
              <div className="charts-grid" style={{ marginBottom: "1.25rem" }}>
                <div style={card}>
                  <p style={secLabel}>Subscriber Growth</p>
                  <p style={subText}>Cumulative subscribers over time</p>
                  <LineChart data={data.subscribersByMonth} />
                  <div style={{ margin: "1.5rem 0 0.75rem", paddingTop: "1.25rem", borderTop: "1px solid color-mix(in srgb, var(--admin-primary) 6%, transparent)" }}>
                    <p style={{ ...subText, margin: "0 0 0.75rem" }}>Net new per period</p>
                    <BarChart data={data.newSubscribersByMonth} unit="" emptyMsg="No subscriber changes this period" allowNegative />
                  </div>
                </div>
                <div style={card}>
                  <p style={secLabel}>Publishing Activity</p>
                  <p style={subText}>Posts published over time</p>
                  <BarChart data={data.postsByMonth} unit=" posts" emptyMsg="No posts this period" />
                </div>
              </div>

              {/* Top posts */}
              <div style={{ ...card, marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
                  <p style={{ ...secLabel, margin: 0 }}>All posts by views</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <input type="text" placeholder="Search…" value={search}
                      onChange={e => { setSearch(e.target.value); setPage(1); }}
                      style={{ fontFamily: "Inter,sans-serif", fontSize: "0.78rem", color: "var(--admin-primary)", background: "color-mix(in srgb, var(--admin-primary) 4%, transparent)", border: "1px solid color-mix(in srgb, var(--admin-primary) 10%, transparent)", borderRadius: 6, padding: "5px 10px", outline: "none", width: 140 }}
                    />
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.7rem", color: "var(--admin-sidebar-muted)", whiteSpace: "nowrap" }}>{sortedPosts.length} post{sortedPosts.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 420 }}>
                    <thead>
                      <tr><TH col="title">Post</TH><TH col="views">Views</TH><TH col="readingTime">Read time</TH><TH col="publishedAt">Published</TH></tr>
                    </thead>
                    <tbody>
                      {pagedPosts.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: "center", padding: "2rem", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "var(--admin-sidebar-muted)" }}>No posts match your search</td></tr>
                      ) : pagedPosts.map(post => (
                        <tr key={post.id} className="tr-hover">
                          <td style={{ padding: "0.55rem 0.75rem 0.55rem 0", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "var(--admin-primary)", borderBottom: "1px solid color-mix(in srgb, var(--admin-primary) 5%, transparent)" }}>
                            <a href={`/${username}/blog/${post.slug}`} target="_blank" rel="noreferrer" style={{ color: "var(--admin-primary)", textDecoration: "none" }}>{post.title}</a>
                          </td>
                          <td style={{ padding: "0.55rem 0.75rem 0.55rem 0", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "var(--admin-primary)", borderBottom: "1px solid color-mix(in srgb, var(--admin-primary) 5%, transparent)", whiteSpace: "nowrap" }}>{post.views.toLocaleString()}</td>
                          <td style={{ padding: "0.55rem 0.75rem 0.55rem 0", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "var(--admin-sidebar-muted)", borderBottom: "1px solid color-mix(in srgb, var(--admin-primary) 5%, transparent)", whiteSpace: "nowrap" }}>{post.readingTime} min</td>
                          <td style={{ padding: "0.55rem 0 0.55rem 0", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "var(--admin-sidebar-muted)", borderBottom: "1px solid color-mix(in srgb, var(--admin-primary) 5%, transparent)", whiteSpace: "nowrap" }}>
                            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid color-mix(in srgb, var(--admin-primary) 6%, transparent)", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.7rem", color: "var(--admin-sidebar-muted)" }}>Page {page} of {totalPages}</span>
                    <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                      {paginationPages(page, totalPages).map((p, i) =>
                        p === "…"
                          ? <span key={i} style={{ padding: "3px 7px", fontFamily: "Inter,sans-serif", fontSize: "0.75rem", color: "var(--admin-sidebar-muted)" }}>…</span>
                          : <button key={p} onClick={() => setPage(p as number)} style={{
                              padding: "3px 9px", borderRadius: 5, border: "none", cursor: "pointer",
                              background: page === p ? "var(--admin-primary)" : "color-mix(in srgb, var(--admin-primary) 6%, transparent)",
                              color: page === p ? "#fff" : "var(--admin-primary)",
                              fontFamily: "Inter,sans-serif", fontSize: "0.75rem", fontWeight: 600,
                            }}>{p}</button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Categories */}
              <div style={card}>
                <p style={secLabel}>Posts by category</p>
                {data.categories.length === 0 ? (
                  <p style={{ margin: "0.5rem 0 0", fontFamily: "Inter,sans-serif", fontSize: "0.8rem", color: "var(--admin-sidebar-muted)" }}>No categories yet</p>
                ) : (() => {
                  const sorted = [...data.categories].sort((a, b) => b.count - a.count);
                  const maxCount = Math.max(...sorted.map(c => c.count), 1);
                  return sorted.map(cat => (
                    <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.7rem" }}>
                      <div style={{ width: 9, height: 9, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.8rem", color: "var(--admin-primary)", width: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{cat.name}</span>
                      <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.75rem", color: "var(--admin-sidebar-muted)", width: 22, textAlign: "right", flexShrink: 0 }}>{cat.count}</span>
                      <div style={{ flex: 1, height: 5, background: "color-mix(in srgb, var(--admin-primary) 6%, transparent)", borderRadius: 3, minWidth: 0 }}>
                        <div style={{ height: "100%", width: `${(cat.count / maxCount) * 100}%`, background: cat.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
