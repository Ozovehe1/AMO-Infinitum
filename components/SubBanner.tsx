"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const MESSAGES: Record<string, string> = {
  confirmed: "You're subscribed! New posts will land in your inbox.",
  unsubscribed: "You've been unsubscribed. You won't receive any more emails.",
  invalid: "That link is invalid or has already been used.",
};

export default function SubBanner() {
  const params = useSearchParams();
  const sub = params.get("sub");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sub && MESSAGES[sub]) setVisible(true);
  }, [sub]);

  if (!visible || !sub || !MESSAGES[sub]) return null;

  const isError = sub === "invalid";
  const bg = isError ? "rgba(224,112,112,0.12)" : "rgba(200,169,126,0.12)";
  const border = isError ? "rgba(224,112,112,0.3)" : "rgba(200,169,126,0.3)";
  const color = isError ? "#e07070" : "#c8a97e";

  return (
    <div style={{
      position: "fixed",
      bottom: "1.5rem",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      background: "#0d1f3c",
      border: `1px solid ${border}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 6,
      padding: "0.875rem 1.25rem",
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      maxWidth: "calc(100vw - 2rem)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    }}>
      <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#fffef9" }}>
        {MESSAGES[sub]}
      </p>
      <button
        onClick={() => setVisible(false)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#8fa3b1", fontSize: "1.1rem", lineHeight: 1, padding: 0, flexShrink: 0 }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
