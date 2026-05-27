"use client";
import { useState } from "react";

interface Props {
  feature: string;
  description?: string;
  inline?: boolean;  // true = compact banner, false = full overlay
}

export default function UpgradePrompt({ feature, description, inline = false }: Props) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setLoading(false);
    }
  };

  if (inline) {
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap",
        padding: "0.75rem 1rem", borderRadius: 6,
        background: "color-mix(in srgb, var(--admin-accent) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--admin-accent) 25%, transparent)",
      }}>
        <span style={{ fontSize: "1rem" }}>🔒</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontFamily: "'Playfair Display', serif", fontSize: "0.88rem",
            color: "var(--admin-primary)", fontWeight: 500,
          }}>
            {feature}
          </span>
          {description && (
            <span style={{
              fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.8rem",
              fontStyle: "italic", color: "var(--admin-muted)", marginLeft: "0.4rem",
            }}>
              — {description}
            </span>
          )}
        </div>
        <button
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            background: "var(--admin-primary)", color: "var(--admin-accent)",
            border: "none", borderRadius: 3, padding: "0.4rem 0.875rem",
            fontFamily: "Inter, sans-serif", fontSize: "0.75rem", letterSpacing: "0.06em",
            cursor: "pointer", whiteSpace: "nowrap", opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Loading…" : "Upgrade"}
        </button>
      </div>
    );
  }

  // Full overlay
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 10,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      background: "rgba(250,249,246,0.92)", backdropFilter: "blur(4px)",
      borderRadius: 8, textAlign: "center", padding: "2rem",
    }}>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c8a97e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "1rem" }}>
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <p style={{
        fontFamily: "'Playfair Display', serif", fontSize: "1.15rem",
        color: "var(--admin-primary)", margin: "0 0 0.5rem", fontWeight: 500,
      }}>
        {feature}
      </p>
      {description && (
        <p style={{
          fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.88rem",
          fontStyle: "italic", color: "var(--admin-muted)", margin: "0 0 1.5rem", maxWidth: 300,
        }}>
          {description}
        </p>
      )}
      <button
        onClick={handleUpgrade}
        disabled={loading}
        style={{
          background: "var(--admin-primary)", color: "var(--admin-accent)",
          border: "none", borderRadius: 3, padding: "0.75rem 1.75rem",
          fontFamily: "Inter, sans-serif", fontSize: "0.8rem", letterSpacing: "0.1em",
          textTransform: "uppercase", cursor: "pointer", opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Loading…" : "Start free trial — 1 month free, then $9/mo"}
      </button>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "var(--admin-muted)", marginTop: "0.75rem" }}>
        Cancel anytime · Card required
      </p>
    </div>
  );
}
