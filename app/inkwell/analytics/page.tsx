"use client";
import { useState, useEffect } from "react";

type Range = "1m" | "3m" | "6m" | "12m";

interface AnalyticsData {
  totalSubscribers: number;
  newSubscribers: number;
  pendingSubscribers: number;
  totalViews: number;
  totalPublished: number;
  topPosts: { id: number; title: string; slug: string; views: number; publishedAt: string | null; readingTime: number }[];
  subscribersByMonth: Record<string, number>;
  postsByMonth: Record<string, number>;
  categories: { name: string; color: string; count: number }[];
}

const RANGES: { label: string; value: Range }[] = [
  { label: "1M", value: "1m" },
  { label: "3M", value: "3m" },
  { label: "6M", value: "6m" },
  { label: "12M", value: "12m" },
];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background: "#0d1f3c", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 10, padding: "1.25rem 1.5rem" }}>
      <p style={{ margin: "0 0 4px", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#8fa3b1", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: 0, fontFamily: "'Playfair Display', serif", fontSize: "2rem", fontWeight: 700, color: "#fffef9", lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: "4px 0 0", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#c8a97e" }}>{sub}</p>}
    </div>
  );
}

function LineChart({ data }: { data: Record<string, number> }) {
  const labels = Object.keys(data);
  const values = Object.values(data);
  const max = Math.max(...values, 1);
  const W = 500, H = 120, PAD = { t: 10, r: 10, b: 28, l: 28 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const pts = values.map((v, i) => ({
    x: PAD.l + (i / Math.max(labels.length - 1, 1)) * innerW,
    y: PAD.t + (1 - v / max) * innerH,
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaD = `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.t + innerH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD.t + innerH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c8a97e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#c8a97e" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[0, 0.5, 1].map(f => (
        <line key={f} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + (1 - f) * innerH} y2={PAD.t + (1 - f) * innerH}
          stroke="rgba(200,169,126,0.08)" strokeWidth="1" />
      ))}
      {/* Area fill */}
      <path d={areaD} fill="url(#lineGrad)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#c8a97e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#c8a97e" />
      ))}
      {/* X labels */}
      {labels.map((l, i) => (
        <text key={i} x={pts[i].x} y={H - 4} textAnchor="middle"
          style={{ fontSize: 9, fill: "#8fa3b1", fontFamily: "Inter, sans-serif" }}>{l}</text>
      ))}
    </svg>
  );
}

function BarChart({ data }: { data: Record<string, number> }) {
  const labels = Object.keys(data);
  const values = Object.values(data);
  const max = Math.max(...values, 1);
  const W = 500, H = 120, PAD = { t: 10, r: 10, b: 28, l: 28 };
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const barW = Math.max(4, (innerW / labels.length) * 0.6);
  const gap = innerW / labels.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      {[0, 0.5, 1].map(f => (
        <line key={f} x1={PAD.l} x2={W - PAD.r} y1={PAD.t + (1 - f) * innerH} y2={PAD.t + (1 - f) * innerH}
          stroke="rgba(200,169,126,0.08)" strokeWidth="1" />
      ))}
      {values.map((v, i) => {
        const barH = (v / max) * innerH;
        const x = PAD.l + i * gap + gap / 2 - barW / 2;
        const y = PAD.t + innerH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="2" fill="#c8a97e" opacity="0.8" />
            <text x={x + barW / 2} y={H - 4} textAnchor="middle"
              style={{ fontSize: 9, fill: "#8fa3b1", fontFamily: "Inter, sans-serif" }}>{labels[i]}</text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>("3m");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics?range=${range}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [range]);

  const cardStyle: React.CSSProperties = { background: "#0d1f3c", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 10, padding: "1.5rem" };
  const sectionTitle: React.CSSProperties = { margin: "0 0 1rem", fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#fffef9" };

  return (
    <div style={{ padding: "2rem", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, color: "#fffef9" }}>Analytics</h1>
          <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#8fa3b1" }}>Your blog at a glance</p>
        </div>
        {/* Range selector */}
        <div style={{ display: "flex", gap: "0.35rem", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "4px" }}>
          {RANGES.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)} style={{
              background: range === r.value ? "#c8a97e" : "transparent",
              color: range === r.value ? "#0d1f3c" : "#8fa3b1",
              border: "none", borderRadius: 6, padding: "5px 14px",
              fontFamily: "Inter, sans-serif", fontSize: "0.78rem", fontWeight: 600,
              cursor: "pointer", transition: "all 0.15s",
            }}>{r.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.875rem" }}>Loading…</div>
      ) : !data ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#e07070", fontFamily: "Inter, sans-serif", fontSize: "0.875rem" }}>Failed to load analytics.</div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
            <StatCard label="Subscribers" value={data.totalSubscribers} sub={`+${data.newSubscribers} this period`} />
            <StatCard label="Pending" value={data.pendingSubscribers} sub="awaiting confirmation" />
            <StatCard label="Total Views" value={data.totalViews.toLocaleString()} sub="all time" />
            <StatCard label="Published Posts" value={data.totalPublished} />
          </div>

          {/* Charts row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.75rem" }}>
            <div style={cardStyle}>
              <p style={sectionTitle}>Subscriber Growth</p>
              <LineChart data={data.subscribersByMonth} />
            </div>
            <div style={cardStyle}>
              <p style={sectionTitle}>Publishing Activity</p>
              <BarChart data={data.postsByMonth} />
            </div>
          </div>

          {/* Top posts */}
          <div style={{ ...cardStyle, marginBottom: "1.75rem" }}>
            <p style={sectionTitle}>Top Posts by Views</p>
            {data.topPosts.length === 0 ? (
              <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#8fa3b1" }}>No views recorded yet — readers need to spend 5+ seconds on a post.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Post", "Views", "Read time", "Published"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "0 0.75rem 0.75rem 0", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "#8fa3b1", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid rgba(200,169,126,0.1)", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.topPosts.map((p, i) => (
                    <tr key={p.id} style={{ borderBottom: i < data.topPosts.length - 1 ? "1px solid rgba(200,169,126,0.07)" : "none" }}>
                      <td style={{ padding: "0.75rem 0.75rem 0.75rem 0", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "#fffef9", maxWidth: 260 }}>
                        <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" style={{ color: "#fffef9", textDecoration: "none" }}>{p.title}</a>
                      </td>
                      <td style={{ padding: "0.75rem 0.75rem 0.75rem 0", fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 700, color: "#c8a97e", whiteSpace: "nowrap" }}>{p.views.toLocaleString()}</td>
                      <td style={{ padding: "0.75rem 0.75rem 0.75rem 0", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#8fa3b1", whiteSpace: "nowrap" }}>{p.readingTime} min</td>
                      <td style={{ padding: "0.75rem 0 0.75rem 0", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#8fa3b1", whiteSpace: "nowrap" }}>{p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Categories */}
          <div style={cardStyle}>
            <p style={sectionTitle}>Posts by Category</p>
            {data.categories.length === 0 ? (
              <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#8fa3b1" }}>No categories yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {data.categories.filter(c => c.count > 0).sort((a, b) => b.count - a.count).map(c => {
                  const maxCount = Math.max(...data.categories.map(x => x.count), 1);
                  return (
                    <div key={c.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: "#fffef9" }}>{c.name}</span>
                        <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#8fa3b1" }}>{c.count} post{c.count !== 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                        <div style={{ height: "100%", width: `${(c.count / maxCount) * 100}%`, background: c.color, borderRadius: 3, transition: "width 0.4s ease" }} />
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
  );
}
