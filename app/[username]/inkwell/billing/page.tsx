"use client";
import { useEffect, useState } from "react";
import AdminNav from "@/components/AdminNav";

interface BillingStatus {
  plan: "free" | "premium";
  subscriptionStatus: string | null;
  subscriptionEndsAt: string | null;
  hasEverSubscribed: boolean;
  hasEmailToken: boolean;
}

const PREMIUM_FEATURES = [
  { icon: "◎", label: "Analytics Dashboard", desc: "Subscriber growth, post views, engagement charts." },
  { icon: "✎", label: "AI Writing Assistant", desc: "Brainstorm ideas, challenge arguments, explore angles." },
  { icon: "🎧", label: "Audio Narration", desc: "Auto-generated audio version of every post." },
  { icon: "⚙", label: "Custom Colors & Fonts", desc: "Full control over your blog's visual identity." },
];

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleCheckout = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { setActionLoading(false); }
  };

  const handlePortal = async () => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { setActionLoading(false); }
  };

  const isPremium    = status?.plan === "premium";
  const isNonRenew   = status?.subscriptionStatus === "non-renewing";
  const isPastDue    = status?.subscriptionStatus === "past_due";
  const isCancelled  = status?.subscriptionStatus === "cancelled";
  const isFirstTime  = !status?.hasEverSubscribed;
  const canManage    = status?.hasEmailToken;
  const endsAt       = status?.subscriptionEndsAt ? new Date(status.subscriptionEndsAt) : null;

  const ctaLabel = (): string => {
    if (isPastDue) return "Update Payment — restore access";
    if (isCancelled || (!isPremium && !isFirstTime)) return "Reactivate Premium — $9/month";
    if (isFirstTime) return "Get Premium — $9 / month";
    return "Manage Subscription";
  };

  const ctaAction = isPremium && canManage ? handlePortal : handleCheckout;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--admin-bg)" }}>
      <AdminNav />
      <main className="admin-main" style={{ flex: 1 }}>
        <div style={{ maxWidth: 700 }}>

          {/* Header */}
          <p style={{ color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>Subscription</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "var(--admin-primary)", margin: "0 0 2.5rem", fontWeight: 600 }}>Billing</h1>

          {loading ? (
            <p style={{ fontFamily: "Inter, sans-serif", color: "var(--admin-muted)", fontSize: "0.9rem" }}>Loading…</p>
          ) : (
            <>
              {/* Plan badge */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.35rem 0.875rem", borderRadius: 20,
                  background: isPremium
                    ? "color-mix(in srgb, var(--admin-accent) 15%, transparent)"
                    : "color-mix(in srgb, var(--admin-primary) 8%, transparent)",
                  color: isPremium ? "var(--admin-accent)" : "var(--admin-muted)",
                  fontFamily: "Inter, sans-serif", fontSize: "0.8rem", letterSpacing: "0.06em",
                  border: `1px solid ${isPremium
                    ? "color-mix(in srgb, var(--admin-accent) 30%, transparent)"
                    : "color-mix(in srgb, var(--admin-primary) 15%, transparent)"}`,
                }}>
                  {isPremium ? "✦ Premium" : "Free"}
                  {isNonRenew && <span style={{ opacity: 0.7, fontSize: "0.72rem" }}> · Cancelling</span>}
                </span>

                {isNonRenew && endsAt && (
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "var(--admin-muted)" }}>
                    Access until {endsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                )}
                {isCancelled && endsAt && (
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#c04040" }}>
                    Expired {endsAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                )}
              </div>

              {/* Past due warning */}
              {isPastDue && (
                <div style={{ background: "rgba(192,64,64,0.08)", border: "1px solid rgba(192,64,64,0.2)", borderRadius: 6, padding: "0.875rem 1rem", marginBottom: "1.5rem" }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "#c04040", margin: 0 }}>
                    ⚠ Your last payment failed. Update your card to continue Premium access.
                  </p>
                </div>
              )}

              {/* Features grid */}
              <div style={{ background: "var(--admin-bg-card)", border: "1px solid var(--admin-primary-border)", borderRadius: 8, overflow: "hidden", marginBottom: "2rem" }}>
                <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--admin-primary-border)" }}>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--admin-muted)", margin: 0 }}>
                    Premium Features · $9 / month
                  </p>
                </div>
                {PREMIUM_FEATURES.map((f, i) => (
                  <div key={f.label} style={{
                    display: "flex", alignItems: "flex-start", gap: "1rem",
                    padding: "1rem 1.5rem",
                    borderBottom: i < PREMIUM_FEATURES.length - 1 ? "1px solid var(--admin-primary-border)" : "none",
                  }}>
                    <span style={{ fontSize: "1.1rem", color: isPremium ? "var(--admin-accent)" : "var(--admin-muted)", opacity: isPremium ? 1 : 0.4, marginTop: 2 }}>{f.icon}</span>
                    <div>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.92rem", color: "var(--admin-primary)", margin: "0 0 0.2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {f.label}
                        {!isPremium && <span style={{ fontSize: "0.65rem", color: "var(--admin-muted)", fontFamily: "Inter, sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>Premium</span>}
                        {isPremium && <span style={{ fontSize: "0.65rem", color: "var(--admin-accent)", fontFamily: "Inter, sans-serif" }}>✓</span>}
                      </p>
                      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.82rem", fontStyle: "italic", color: "var(--admin-muted)", margin: 0 }}>
                        {f.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {!isPremium || isPastDue || isCancelled ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <button
                    onClick={ctaAction}
                    disabled={actionLoading}
                    style={{
                      background: "var(--admin-primary)", color: "var(--admin-accent)",
                      border: "none", borderRadius: 3, padding: "0.875rem 2rem",
                      fontFamily: "Inter, sans-serif", fontSize: "0.82rem", letterSpacing: "0.1em",
                      textTransform: "uppercase", cursor: "pointer", opacity: actionLoading ? 0.6 : 1,
                      alignSelf: "flex-start",
                    }}
                  >
                    {actionLoading ? "Loading…" : ctaLabel()}
                  </button>
                  {isFirstTime && (
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "var(--admin-muted)", margin: 0 }}>
                      Paid via Paystack · Cancel anytime from your subscription dashboard
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {canManage && (
                    <button
                      onClick={handlePortal}
                      disabled={actionLoading}
                      style={{
                        background: "transparent", color: "var(--admin-primary)",
                        border: "1px solid var(--admin-primary-border)", borderRadius: 3, padding: "0.75rem 1.5rem",
                        fontFamily: "Inter, sans-serif", fontSize: "0.82rem", letterSpacing: "0.06em",
                        cursor: "pointer", opacity: actionLoading ? 0.6 : 1, alignSelf: "flex-start",
                      }}
                    >
                      {actionLoading ? "Loading…" : "Manage Subscription"}
                    </button>
                  )}
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "var(--admin-muted)", margin: 0 }}>
                    Update your card, pause, or cancel — all from your Paystack subscription dashboard.
                  </p>
                </div>
              )}

            </>
          )}
        </div>
      </main>
    </div>
  );
}
