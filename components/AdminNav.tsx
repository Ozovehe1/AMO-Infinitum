"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AdminGuard";
import { useState, useEffect } from "react";

export default function AdminNav() {
  const pathname = usePathname();
  const { logout, username } = useAuth();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<"free" | "premium" | null>(null);
  const base = `/${username}/inkwell`;

  useEffect(() => {
    fetch("/api/billing/status")
      .then(r => r.json())
      .then(d => setPlan(d.plan))
      .catch(() => setPlan("free"));
  }, []);

  const links = [
    { href: base, label: "Dashboard", icon: "⌂" },
    { href: `${base}/analytics`, label: "Analytics", icon: "◎", premiumOnly: true },
    { href: `${base}/posts/new`, label: "New Post", icon: "✎" },
    { href: `${base}/posts`, label: "All Posts", icon: "≡" },
    { href: `${base}/categories`, label: "Categories", icon: "◈" },
    { href: `${base}/about`, label: "About Page", icon: "✦" },
    { href: `${base}/settings`, label: "Settings", icon: "⚙" },
    { href: `${base}/billing`, label: "Billing", icon: "◇" },
  ];

  const NavContent = () => (
    <>
      <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
        <Link href={`/${username}`} target="_blank" style={{ textDecoration: "none", display: "block" }} onClick={() => setOpen(false)}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "var(--admin-accent)" }}>
            /{username}
          </span>
        </Link>

        {plan === "premium" ? (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0.35rem",
            marginTop: "0.75rem",
            padding: "0.3rem 0.75rem",
            borderRadius: 4,
            background: "rgba(200,169,126,0.12)",
            border: "1px solid rgba(200,169,126,0.35)",
          }}>
            <span style={{ color: "var(--admin-accent)", fontSize: "0.78rem" }}>✦</span>
            <span style={{
              fontFamily: "Inter, sans-serif", fontSize: "0.72rem",
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: "var(--admin-accent)", fontWeight: 600,
            }}>Premium</span>
          </div>
        ) : (
          <p style={{ color: "var(--admin-sidebar-muted)", fontSize: "0.68rem", fontFamily: "Inter, sans-serif", margin: "0.75rem 0 0", letterSpacing: "0.08em", textTransform: "uppercase" }}>Writing Panel</p>
        )}
      </div>
      <nav style={{ flex: 1, padding: "1rem 0.75rem" }}>
        {links.map(l => {
          const active = l.href === base ? pathname === base : pathname.startsWith(l.href);
          const locked = (l as { premiumOnly?: boolean }).premiumOnly && plan === "free";
          return (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} style={{
              display: "flex", alignItems: "center", gap: "0.625rem",
              padding: "0.75rem 0.875rem", borderRadius: 6, marginBottom: "0.25rem",
              textDecoration: "none",
              background: active ? "rgba(255,255,255,0.09)" : "transparent",
              color: active ? "var(--admin-accent)" : "var(--admin-sidebar-muted)",
              fontFamily: "Inter, sans-serif", fontSize: "0.9rem",
              borderLeft: active ? "2px solid var(--admin-accent)" : "2px solid transparent",
            }}>
              <span style={{ fontSize: "1.1rem" }}>{l.icon}</span>
              {l.label}
              {locked && (
                <span style={{ marginLeft: "auto", fontSize: "0.6rem", color: "var(--admin-accent)", opacity: 0.6, letterSpacing: "0.06em", fontFamily: "Inter, sans-serif" }}>✦</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Mature upgrade card — free users only, pinned above footer */}
      {plan === "free" && (
        <div style={{ margin: "0 0.75rem 0.75rem", padding: "0.875rem 1rem", borderRadius: 6, background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.15)" }}>
          <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.82rem", color: "var(--admin-accent)", margin: "0 0 0.3rem", letterSpacing: "0.02em" }}>✦ Premium</p>
          <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.75rem", fontStyle: "italic", color: "var(--admin-sidebar-muted)", margin: "0 0 0.7rem", lineHeight: 1.5 }}>
            AI writing, audio, analytics & custom theme.
          </p>
          <Link href={`${base}/billing`} onClick={() => setOpen(false)} style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "var(--admin-accent)", textDecoration: "none", letterSpacing: "0.06em" }}>
            First month free · then $9/mo → Start trial
          </Link>
        </div>
      )}

      <div style={{ padding: "1rem 0.75rem", borderTop: "1px solid rgba(255,255,255,0.09)" }}>
        <Link href={`/${username}`} target="_blank" onClick={() => setOpen(false)} style={{ display: "block", color: "var(--admin-sidebar-muted)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", padding: "0.5rem 0.875rem", marginBottom: "0.25rem" }}>
          ↗ View Blog
        </Link>
        <button onClick={logout} style={{ width: "100%", background: "transparent", border: "none", color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", cursor: "pointer", padding: "0.5rem 0.875rem", textAlign: "left", borderRadius: 4 }}>
          ⎋ Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      <aside className="admin-sidebar-desktop" style={{
        width: 220, minHeight: "100vh", background: "var(--admin-primary)",
        borderRight: "1px solid rgba(255,255,255,0.09)",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, zIndex: 50,
      }}>
        <NavContent />
      </aside>

      <div className="admin-topbar-mobile" style={{
        display: "none", position: "fixed", top: 0, left: 0, right: 0,
        height: 56, background: "var(--admin-primary)", zIndex: 100,
        alignItems: "center", justifyContent: "space-between",
        padding: "0 1rem", borderBottom: "1px solid rgba(255,255,255,0.09)",
      }}>
        <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "var(--admin-accent)", fontSize: "1.4rem", cursor: "pointer", padding: "0.25rem 0.5rem", lineHeight: 1 }}>☰</button>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "var(--admin-accent)" }}>/{username}</span>
        <Link href={`${base}/posts/new`} style={{ background: "rgba(255,255,255,0.1)", color: "var(--admin-accent)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.75rem", padding: "0.35rem 0.75rem", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)" }}>✎ Write</Link>
      </div>

      {open && <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 149 }} />}

      <aside className="admin-sidebar-mobile" style={{
        display: "none", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, width: 260,
        background: "var(--admin-primary)", zIndex: 150,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s ease",
        borderRight: "1px solid rgba(255,255,255,0.09)",
      }}>
        <button onClick={() => setOpen(false)} style={{ position: "absolute", top: "0.75rem", right: "0.75rem", background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: "1.5rem", cursor: "pointer", lineHeight: 1, padding: "0.25rem" }}>×</button>
        <NavContent />
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar-desktop { display: none !important; }
          .admin-topbar-mobile { display: flex !important; }
          .admin-sidebar-mobile { display: flex !important; }
          .admin-main { margin-left: 0 !important; padding-top: 72px !important; padding-left: 1rem !important; padding-right: 1rem !important; }
        }
        @media (min-width: 769px) {
          .admin-main { margin-left: 220px; padding: 2.5rem; }
        }
      `}</style>
    </>
  );
}
