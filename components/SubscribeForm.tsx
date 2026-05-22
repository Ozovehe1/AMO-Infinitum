"use client";

import { useState } from "react";

type State = "idle" | "loading" | "sent" | "already" | "error";

export default function SubscribeForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setState("error"); return; }
      setState(data.message === "already_subscribed" ? "already" : "sent");
    } catch {
      setState("error");
    }
  };

  const textColor  = dark ? "#fffef9" : "#0d1f3c";
  const subColor   = dark ? "#8fa3b1" : "#3a5068";
  const inputBg    = dark ? "rgba(255,254,249,0.06)" : "#fffef9";
  const inputBorder = dark ? "rgba(200,169,126,0.25)" : "rgba(13,31,60,0.18)";

  if (state === "sent" || state === "already") {
    return (
      <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
        <p style={{ margin: 0, fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#c8a97e" }}>
          {state === "sent"
            ? "Check your inbox — confirmation email on its way."
            : "You're already subscribed."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ width: "100%" }}>
      <p style={{ margin: "0 0 0.6rem", fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 600, color: textColor }}>
        Stay in the loop
      </p>
      <p style={{ margin: "0 0 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", color: subColor, lineHeight: 1.6 }}>
        New essays delivered straight to your inbox.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{
            flex: "1 1 180px",
            minWidth: 0,
            padding: "0.6rem 0.875rem",
            background: inputBg,
            border: `1px solid ${inputBorder}`,
            borderRadius: 4,
            fontFamily: "Inter, sans-serif",
            fontSize: "0.85rem",
            color: textColor,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          style={{
            padding: "0.6rem 1.25rem",
            background: "#c8a97e",
            border: "none",
            borderRadius: 4,
            fontFamily: "Inter, sans-serif",
            fontSize: "0.82rem",
            fontWeight: 600,
            color: "#0d1f3c",
            cursor: state === "loading" ? "not-allowed" : "pointer",
            opacity: state === "loading" ? 0.7 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {state === "loading" ? "Sending…" : "Subscribe"}
        </button>
      </div>
      {state === "error" && (
        <p style={{ margin: "0.5rem 0 0", fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "#e07070" }}>
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
