"use client";
import { useState, useEffect } from "react";
import type { CSSProperties } from "react";
import AdminNav from "@/components/AdminNav";

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
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "12M", value: "12m" },
];

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

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <div style={{ width: 72, height: 28 }} />;
  const max = Math.max(...values, 1);
  const allZero = values.every(v => v === 0);
  const W = 72, H = 28;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - (v / max) * (H - 4) - 2,
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block", flexShrink: 0 }}>
      {allZero
        ? <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="rgba(13,31,60,0.12)" strokeWidth="1.5" />
        : <path d={d} fill="none" stroke="#c8a97e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function TrendBadge({ curr, prev }: { curr: number; prev: number }) {
  if (prev === 0 && curr === 0) return <span style={{ fontSize: "0.72rem", color: "#8fa3b1", fontFamily: "Inter,sans-serif" }}>no prior data</span>;
  if (prev === 0) return <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4a9e7a", fontFamily: "Inter,sans-serif" }}>↑ new growth</span>;
  const pct = Math.round(((curr - prev) / prev) * 100);
  const up = pct >= 0;
  return (
    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: up ? "#4a9e7a" : "#e05c5c", fontFamily: "Inter,sans-serif" }}>
      {up ? "↑" : "↓"} {Math.abs(pct)}% vs prev period
    </span>
  );
}

function StatCard({ label, value, sub, sparkValues, trend }: {
  label: string; value: string | number; sub?: string;
  sparkValues?: number[]; trend?: { curr: number; prev: number };
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid rgba(13,31,60,0.08)", borderRadius: 12, padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: 0 }}>
      <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "0.68rem", color: "#8fa3b1", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "2.25rem", fontWeight: 800, color: "#0d1f3c", lineHeight: 1, letterSpacing: "-0.02em" }}>{value}</p>
        {sparkValues && <Sparkline values={sparkValues} />}
      </div>
      <div style={{ minHeight: 18, display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {trend ? <TrendBadge curr={trend.curr} prev={trend.prev} /> : null}
        {sub && <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.72rem", color: "#8fa3b1" }}>{sub}</span>}
      </div>
    </div>
  );
}

/* ── Y-axis number abbreviation (GA4 / Mixpanel / Stripe standard) ── */
function fmtAxis(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${+(v / 1_000_000).toPrecision(3)}M`;
  if (Math.abs(v) >= 1_000)     return `${+(v / 1_000).toPrecision(3)}K`;
  return String(v);
}

/* ── Monthly label: show year only on first visible label and when year changes ── *
 * Input labels are "Jun '25" format (unique keys from API).
 * Output: "Jun '25" → first / year-change; "Jun" → same year as previous.
 * Daily/weekly labels ("5 May") pass through unchanged.
 */
function getDisplayLabel(label: string, prevVisibleLabel: string | null): string {
  if (!label.includes("'")) return label; // daily or weekly — no year in key
  const spaceIdx = label.indexOf(" ");
  const month = label.slice(0, spaceIdx);           // "Jun"
  const yearPart = label.slice(spaceIdx + 1);       // "'25"
  if (!prevVisibleLabel || !prevVisibleLabel.includes("'")) return label; // first label
  const prevYear = prevVisibleLabel.slice(prevVisibleLabel.indexOf(" ") + 1);
  return yearPart !== prevYear ? label : month;     // year changed → full; same year → month only
}

/* ── X-axis label density: target 6–8 labels regardless of point count ── */
function getLabelStep(count: number): number {
  if (count <= 6) return 1;   // ≤6 points: show all
  if (count <= 12) return 2;  // 7–12: every 2nd  (~6 labels)
  if (count <= 20) return 3;  // 13–20: every 3rd (~6 labels)
  return 4;                   // 21–30: every 4th (~7 labels)
}

/* ── Smart Y-axis ticks (positive only) ── */
function computeYAxis(dataMax: number): { ticks: number[]; axisMax: number } {
  if (dataMax <= 0) return { ticks: [0, 1], axisMax: 1 };
  if (dataMax <= 5) {
    return { ticks: Array.from({ length: dataMax + 1 }, (_, i) => i), axisMax: dataMax };
  }
  const rawStep = dataMax / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = ([1, 2, 5, 10].map(s => s * magnitude).find(s => s >= rawStep)) ?? magnitude * 10;
  const axisMax = Math.ceil(dataMax / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= axisMax + step * 0.01; v += step) ticks.push(Math.round(v));
  return { ticks, axisMax };
}

/* ── Smart Y-axis ticks (supports negative values) ── */
function computeYAxisRange(dataMin: number, dataMax: number): { ticks: number[]; axisMin: number; axisMax: number } {
  const absMax = Math.max(Math.abs(dataMax), Math.abs(dataMin), 1);
  if (absMax <= 5) {
    const lo = Math.min(Math.floor(dataMin), 0);
    const hi = Math.max(Math.ceil(dataMax), 1);
    const ticks: number[] = [];
    for (let v = lo; v <= hi; v++) ticks.push(v);
    return { ticks, axisMin: lo, axisMax: hi };
  }
  const rawStep = absMax / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = ([1, 2, 5, 10].map(s => s * magnitude).find(s => s >= rawStep)) ?? magnitude * 10;
  const axisMax = Math.ceil(Math.max(dataMax, 0) / step) * step || step;
  const axisMin = dataMin < 0 ? Math.floor(dataMin / step) * step : 0;
  const ticks: number[] = [];
  for (let v = axisMin; v <= axisMax + step * 0.01; v += step) ticks.push(Math.round(v));
  return { ticks, axisMin, axisMax };
}

function LineChart({ data }: { data: Record<string, number> }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const labels = Object.keys(data);
  const values = Object.values(data);
  const allZero = values.every(v => v === 0);
  const { ticks: yTicks, axisMax } = computeYAxis(Math.max(...values, 0));
  const W = 480, H = 160, PAD = { t: 20, r: 14, b: 36, l: 40 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const pts = values.map((v, i) => ({
    x: labels.length <= 1 ? PAD.l + iW / 2 : PAD.l + (i / (labels.length - 1)) * iW,
    y: PAD.t + (1 - v / axisMax) * iH,
  }));
  const lineD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = pts.length > 0 ? `${lineD} L${pts[pts.length-1].x.toFixed(1)},${(PAD.t+iH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD.t+iH).toFixed(1)} Z` : "";
  if (allZero) return (
    <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "#8fa3b1" }}>No subscribers yet</p>
    </div>
  );
  const tipIdx = activeIdx;
  const tipX = tipIdx !== null ? Math.min(Math.max(pts[tipIdx].x, PAD.l + 38), W - PAD.r - 38) : 0;
  const tipY = tipIdx !== null ? Math.max(4, pts[tipIdx].y - 52) : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", aspectRatio: `${W} / ${H}`, display: "block", overflow: "hidden" }}>
      <defs>
        <linearGradient id="lgSub" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8a97e" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#c8a97e" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((v, i) => {
        const y = PAD.t + (1 - v / axisMax) * iH;
        const isEdge = i === 0 || i === yTicks.length - 1;
        return (
          <g key={v}>
            <line x1={PAD.l} x2={W-PAD.r} y1={y} y2={y} stroke={isEdge ? "rgba(13,31,60,0.1)" : "rgba(13,31,60,0.05)"} strokeWidth="1" />
            <text x={PAD.l-6} y={y+4} textAnchor="end" style={{ fontSize: 9, fill: "#aab8c2", fontFamily: "Inter,sans-serif" }}>{fmtAxis(v)}</text>
          </g>
        );
      })}
      <path d={areaD} fill="url(#lgSub)" />
      <path d={lineD} fill="none" stroke="#c8a97e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {tipIdx !== null && <line x1={pts[tipIdx].x} x2={pts[tipIdx].x} y1={PAD.t} y2={PAD.t+iH} stroke="#c8a97e" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3" />}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={tipIdx===i ? 5.5 : 3.5} fill={tipIdx===i ? "#fff" : "#c8a97e"} stroke="#c8a97e" strokeWidth={tipIdx===i ? 2.5 : 0} />
      ))}
      {(() => {
        const step = getLabelStep(labels.length);
        let prevVisible: string | null = null;
        return labels.map((l, i) => {
          const isFirst = i === 0;
          // Force last label only when it won't crowd the previous one
          const isLast = i === labels.length - 1 && (labels.length - 1) % step >= Math.ceil(step / 2);
          if (!isFirst && !isLast && i % step !== 0) return null;
          const display = getDisplayLabel(l, prevVisible);
          prevVisible = l;
          return <text key={i} x={pts[i].x} y={H-8} textAnchor="middle" style={{ fontSize: 9, fill: tipIdx===i ? "#0d1f3c" : "#aab8c2", fontFamily: "Inter,sans-serif", fontWeight: tipIdx===i ? "bold" : "normal" }}>{display}</text>;
        });
      })()}
      {tipIdx !== null && (
        <g style={{ pointerEvents: "none" }}>
          <rect x={tipX-38} y={tipY} width={76} height={36} rx={5} fill="#0d1f3c" />
          <text x={tipX} y={tipY+13} textAnchor="middle" style={{ fontSize: 9, fill: "#8fa3b1", fontFamily: "Inter,sans-serif" }}>{labels[tipIdx]}</text>
          <text x={tipX} y={tipY+28} textAnchor="middle" style={{ fontSize: 13, fill: "#c8a97e", fontFamily: "Inter,sans-serif", fontWeight: "bold" }}>{values[tipIdx].toLocaleString()}</text>
        </g>
      )}
      <rect x={PAD.l} y={PAD.t} width={iW} height={iH} fill="transparent" style={{ cursor: "crosshair" }}
        onMouseMove={e => {
          const svg = (e.currentTarget as SVGElement).closest("svg")!;
          const rect = svg.getBoundingClientRect();
          const svgX = ((e.clientX - rect.left) / rect.width) * W;
          setActiveIdx(Math.max(0, Math.min(labels.length-1, Math.round(((svgX-PAD.l)/iW)*(labels.length-1)))));
        }}
        onMouseLeave={() => setActiveIdx(null)}
      />
    </svg>
  );
}

function BarChart({ data, unit = "", emptyMsg = "No data this period", allowNegative = false }: {
  data: Record<string, number>;
  unit?: string;
  emptyMsg?: string;
  allowNegative?: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const labels = Object.keys(data);
  const values = Object.values(data);
  const allZero = values.every(v => v === 0);

  const rawMin = allowNegative ? Math.min(...values, 0) : 0;
  const rawMax = Math.max(...values, 0);
  const { ticks, axisMin, axisMax } = computeYAxisRange(rawMin, rawMax);
  const totalRange = axisMax - axisMin;

  const W = 480, H = 160, PAD = { t: 20, r: 14, b: 36, l: 40 };
  const iW = W - PAD.l - PAD.r, iH = H - PAD.t - PAD.b;
  const slot = iW / labels.length;
  const barW = Math.max(6, slot * 0.55);

  // Y-position of the zero baseline
  const zeroY = PAD.t + (1 - (0 - axisMin) / totalRange) * iH;

  if (allZero) return (
    <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "#8fa3b1" }}>{emptyMsg}</p>
    </div>
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", aspectRatio: `${W} / ${H}`, display: "block", overflow: "hidden" }}>
      {ticks.map((v, i) => {
        const y = PAD.t + (1 - (v - axisMin) / totalRange) * iH;
        const isZero = v === 0 && allowNegative && axisMin < 0;
        const isEdge = i === 0 || i === ticks.length - 1;
        return (
          <g key={v}>
            <line x1={PAD.l} x2={W-PAD.r} y1={y} y2={y}
              stroke={isZero ? "rgba(13,31,60,0.25)" : isEdge ? "rgba(13,31,60,0.1)" : "rgba(13,31,60,0.05)"}
              strokeWidth={isZero ? 1.5 : 1} />
            <text x={PAD.l-6} y={y+4} textAnchor="end" style={{ fontSize: 9, fill: "#aab8c2", fontFamily: "Inter,sans-serif" }}>{fmtAxis(v)}</text>
          </g>
        );
      })}
      {values.map((v, i) => {
        const isPositive = v >= 0;
        const barH = (Math.abs(v) / totalRange) * iH;
        const cx = PAD.l + i * slot + slot / 2;
        const bx = cx - barW / 2;
        const by = isPositive ? zeroY - barH : zeroY;
        const isActive = activeIdx === i;
        const barFill = allowNegative && !isPositive
          ? (isActive ? "#c94040" : "#e05c5c")
          : (isActive ? "#b8966a" : "#c8a97e");
        const tipX = Math.min(Math.max(cx, PAD.l+38), W-PAD.r-38);
        const tipY = isPositive
          ? Math.max(4, by - 52)
          : Math.min(zeroY + barH + 8, H - 48);
        const step = getLabelStep(labels.length);
        const isFirst = i === 0;
        const isLast = i === labels.length - 1 && (labels.length - 1) % step >= Math.ceil(step / 2);
        const showLabel = isFirst || isLast || i % step === 0;
        const prevVisibleLabel = showLabel ? (i >= step ? labels[i - step] : null) : null;
        const tipLabel = allowNegative
          ? `${v > 0 ? "+" : ""}${v} net`
          : (unit === "" ? `${v} subscriber${v !== 1 ? "s" : ""}` : `${v}${unit}`);
        return (
          <g key={i}>
            <rect x={bx} y={by} width={barW} height={Math.max(barH, 0)} rx={3}
              fill={barFill} opacity={isActive ? 1 : 0.8}
              style={{ cursor: "default", transition: "opacity 0.1s,fill 0.1s" }}
              onMouseEnter={() => setActiveIdx(i)} onMouseLeave={() => setActiveIdx(null)} />
            {showLabel && <text x={cx} y={H-8} textAnchor="middle" style={{ fontSize: 9, fill: isActive ? "#0d1f3c" : "#aab8c2", fontFamily: "Inter,sans-serif", fontWeight: isActive ? "bold" : "normal" }}>{getDisplayLabel(labels[i], prevVisibleLabel)}</text>}
            {isActive && v !== 0 && (
              <g style={{ pointerEvents: "none" }}>
                <rect x={tipX-38} y={tipY} width={76} height={36} rx={5} fill="#0d1f3c" />
                <text x={tipX} y={tipY+13} textAnchor="middle" style={{ fontSize: 9, fill: "#8fa3b1", fontFamily: "Inter,sans-serif" }}>{labels[i]}</text>
                <text x={tipX} y={tipY+28} textAnchor="middle" style={{ fontSize: 13, fill: isPositive ? "#c8a97e" : "#e05c5c", fontFamily: "Inter,sans-serif", fontWeight: "bold" }}>{tipLabel}</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function AnalyticsPage() {
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

  const card: CSSProperties = { background: "#fff", border: "1px solid rgba(13,31,60,0.08)", borderRadius: 12, padding: "1.5rem" };
  const secLabel: CSSProperties = { margin: "0 0 1.25rem", fontFamily: "Inter,sans-serif", fontSize: "0.7rem", fontWeight: 700, color: "#0d1f3c", letterSpacing: "0.12em", textTransform: "uppercase" };

  const TH = ({ col, children }: { col: SortKey; children: React.ReactNode }) => (
    <th onClick={() => handleSort(col)} style={{
      textAlign: "left", padding: "0 0.75rem 0.75rem 0",
      fontFamily: "Inter,sans-serif", fontSize: "0.68rem",
      color: sortKey === col ? "#0d1f3c" : "#8fa3b1",
      letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700,
      borderBottom: "2px solid rgba(13,31,60,0.08)", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
    }}>
      {children}{sortKey === col ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  const sparkSubs = data ? Object.values(data.subscribersByMonth) : [];
  const sparkPosts = data ? Object.values(data.postsByMonth) : [];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f0e8" }}>
      <AdminNav />
      <main className="admin-main" style={{ flex: 1, minWidth: 0 }}>
    <div style={{ maxWidth: 980, width: "100%", paddingBottom: "4rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontFamily: "Inter,sans-serif", fontSize: "1.5rem", fontWeight: 800, color: "#0d1f3c", letterSpacing: "-0.02em" }}>Analytics</h1>
          <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "0.78rem", color: "#8fa3b1" }}>
            {updatedAt ? `Updated at ${updatedAt}` : "Your blog at a glance"}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.25rem", background: "rgba(13,31,60,0.07)", borderRadius: 8, padding: "4px" }}>
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)} style={{
              background: range === r.value ? "#0d1f3c" : "transparent",
              color: range === r.value ? "#fff" : "#8fa3b1",
              border: "none", borderRadius: 5, padding: "5px 16px",
              fontFamily: "Inter,sans-serif", fontSize: "0.78rem", fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
            }}>{r.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="stats-grid">
            {[0,1,2,3].map(i => <Skeleton key={i} h={116} />)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }} className="charts-grid">
            <Skeleton h={240} /><Skeleton h={240} />
          </div>
          <Skeleton h={320} /><Skeleton h={180} />
        </div>
      ) : !data ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#e05c5c", fontFamily: "Inter,sans-serif", fontSize: "0.875rem" }}>Failed to load analytics.</div>
      ) : (
        <>
          <div className="stats-grid" style={{ marginBottom: "1.5rem" }}>
            <StatCard label="Subscribers" value={data.totalSubscribers.toLocaleString()}
              sub={data.pendingSubscribers > 0 ? `${data.pendingSubscribers} pending` : "verified"} sparkValues={sparkSubs} />
            <StatCard label="New this period" value={data.newSubscribers.toLocaleString()}
              sparkValues={sparkSubs} trend={{ curr: data.newSubscribers, prev: data.prevNewSubscribers }} />
            <StatCard label="Total Views" value={data.totalViews.toLocaleString()} sub="all time" sparkValues={sparkPosts} />
            <StatCard label="Posts Published" value={data.totalPublished.toLocaleString()} sub="all time" sparkValues={sparkPosts} />
          </div>

          {/* Subscriber growth — full width card with two stacked charts, Ghost-style */}
          <div style={{ ...card, marginBottom: "1.5rem" }}>
            <p style={secLabel}>Subscriber Growth</p>
            <p style={{ margin: "0 0 1rem", fontFamily: "Inter,sans-serif", fontSize: "0.72rem", color: "#8fa3b1", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total subscribers over time</p>
            <LineChart data={data.subscribersByMonth} />
            <div style={{ margin: "1.75rem 0 1rem", borderTop: "1px solid rgba(13,31,60,0.06)", paddingTop: "1.5rem" }}>
              <p style={{ margin: "0 0 1rem", fontFamily: "Inter,sans-serif", fontSize: "0.72rem", color: "#8fa3b1", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Net new subscribers per period</p>
              <BarChart data={data.newSubscribersByMonth} unit="" emptyMsg="No subscriber changes this period" allowNegative />
            </div>
          </div>

          {/* Publishing activity */}
          <div style={{ ...card, marginBottom: "1.5rem" }}>
            <p style={secLabel}>Publishing Activity</p>
            <BarChart data={data.postsByMonth} unit=" posts" emptyMsg="No posts published this period" />
          </div>

          <div style={{ ...card, marginBottom: "1.5rem" }}>
            {/* Table header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", gap: "1rem", flexWrap: "wrap" }}>
              <p style={{ ...secLabel, margin: 0 }}>All Posts by Views</p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="Search posts…"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  style={{
                    fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "#0d1f3c",
                    border: "1px solid rgba(13,31,60,0.12)", borderRadius: 6,
                    padding: "0.4rem 0.75rem", outline: "none", background: "#f5f0e8",
                    width: 180,
                  }}
                />
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.72rem", color: "#8fa3b1", whiteSpace: "nowrap" }}>
                  {sortedPosts.length} post{sortedPosts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            {data.topPosts.length === 0 ? (
              <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "0.85rem", color: "#8fa3b1" }}>No views yet — readers need to spend 5+ seconds on a post.</p>
            ) : sortedPosts.length === 0 ? (
              <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "0.85rem", color: "#8fa3b1" }}>No posts match &ldquo;{search}&rdquo;.</p>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                    <thead>
                      <tr>
                        <TH col="title">Post</TH>
                        <TH col="views">Views</TH>
                        <TH col="readingTime">Read time</TH>
                        <TH col="publishedAt">Published</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedPosts.map((p, i) => (
                        <tr key={p.id} style={{ borderBottom: i < pagedPosts.length - 1 ? "1px solid rgba(13,31,60,0.06)" : "none" }} className="tr-hover">
                          <td style={{ padding: "0.85rem 0.75rem 0.85rem 0", maxWidth: 300 }}>
                            <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer"
                              style={{ fontFamily: "Inter,sans-serif", fontSize: "0.85rem", color: "#0d1f3c", textDecoration: "none", fontWeight: 500, lineHeight: 1.4, display: "block" }}>
                              {p.title}
                            </a>
                          </td>
                          <td style={{ padding: "0.85rem 0.75rem 0.85rem 0", whiteSpace: "nowrap" }}>
                            <span style={{ fontFamily: "Inter,sans-serif", fontSize: "1.1rem", fontWeight: 800, color: "#0d1f3c" }}>{p.views.toLocaleString()}</span>
                          </td>
                          <td style={{ padding: "0.85rem 0.75rem 0.85rem 0", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "#8fa3b1", whiteSpace: "nowrap" }}>{p.readingTime} min</td>
                          <td style={{ padding: "0.85rem 0 0.85rem 0", fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "#8fa3b1", whiteSpace: "nowrap" }}>
                            {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid rgba(13,31,60,0.06)" }}>
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.75rem", color: "#8fa3b1" }}>
                      Page {page} of {totalPages}
                    </span>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
                        fontFamily: "Inter,sans-serif", fontSize: "0.78rem", fontWeight: 600,
                        padding: "0.35rem 0.85rem", borderRadius: 6, border: "1px solid rgba(13,31,60,0.12)",
                        background: page === 1 ? "transparent" : "#fff", color: page === 1 ? "#c8d0d6" : "#0d1f3c",
                        cursor: page === 1 ? "default" : "pointer",
                      }}>← Prev</button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(n => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                        .reduce<(number | "…")[]>((acc, n, idx, arr) => {
                          if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push("…");
                          acc.push(n);
                          return acc;
                        }, [])
                        .map((n, i) => n === "…"
                          ? <span key={`e${i}`} style={{ padding: "0.35rem 0.5rem", fontFamily: "Inter,sans-serif", fontSize: "0.78rem", color: "#8fa3b1" }}>…</span>
                          : <button key={n} onClick={() => setPage(n as number)} style={{
                            fontFamily: "Inter,sans-serif", fontSize: "0.78rem", fontWeight: 600,
                            padding: "0.35rem 0.75rem", borderRadius: 6,
                            border: "1px solid " + (page === n ? "#0d1f3c" : "rgba(13,31,60,0.12)"),
                            background: page === n ? "#0d1f3c" : "#fff",
                            color: page === n ? "#fff" : "#0d1f3c", cursor: "pointer",
                          }}>{n}</button>
                        )}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
                        fontFamily: "Inter,sans-serif", fontSize: "0.78rem", fontWeight: 600,
                        padding: "0.35rem 0.85rem", borderRadius: 6, border: "1px solid rgba(13,31,60,0.12)",
                        background: page === totalPages ? "transparent" : "#fff", color: page === totalPages ? "#c8d0d6" : "#0d1f3c",
                        cursor: page === totalPages ? "default" : "pointer",
                      }}>Next →</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={card}>
            <p style={secLabel}>Posts by Category</p>
            {data.categories.filter(c => c.count > 0).length === 0 ? (
              <p style={{ margin: 0, fontFamily: "Inter,sans-serif", fontSize: "0.85rem", color: "#8fa3b1" }}>No categories yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {data.categories.filter(c => c.count > 0).sort((a, b) => b.count - a.count).map(c => {
                  const maxCount = Math.max(...data.categories.map(x => x.count), 1);
                  return (
                    <div key={c.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                          <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.85rem", color: "#0d1f3c", fontWeight: 500 }}>{c.name}</span>
                        </div>
                        <span style={{ fontFamily: "Inter,sans-serif", fontSize: "0.82rem", color: "#8fa3b1", fontWeight: 600 }}>{c.count} post{c.count!==1?"s":""}</span>
                      </div>
                      <div style={{ height: 8, background: "rgba(13,31,60,0.06)", borderRadius: 4 }}>
                        <div style={{ height: "100%", width: `${(c.count/maxCount)*100}%`, background: c.color, borderRadius: 4, transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
      </main>
    </div>
  );
}
