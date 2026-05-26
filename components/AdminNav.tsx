"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AdminGuard";
import { useState } from "react";

export default function AdminNav() {
  const pathname = usePathname();
  const { logout, username } = useAuth();
  const [open, setOpen] = useState(false);
  const base = `/${username}/inkwell`;

  const links = [
    { href: base, label: "Dashboard", icon: "⌂" },
    { href: `${base}/analytics`, label: "Analytics", icon: "◎" },
    { href: `${base}/posts/new`, label: "New Post", icon: "✎" },
    { href: `${base}/posts`, label: "All Posts", icon: "≡" },
    { href: `${base}/categories`, label: "Categories", icon: "◈" },
    { href: `${base}/about`, label: "About Page", icon: "✦" },
    { href: `${base}/settings`, label: "Settings", icon: "⚙" },
  ];

  const NavContent = () => (
    <>
      <div style={{ padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.09)" }}>
        <Link href={`/${username}`} target="_blank" style={{ textDecoration: "none" }} onClick={() => setOpen(false)}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "var(--admin-accent)" }}>
            /{username}
          </span>
        </Link>
        <p style={{ color: "var(--admin-sidebar-muted)", fontSize: "0.68rem", fontFamily: "Inter, sans-serif", margin: "0.3rem 0 0", letterSpacing: "0.08em", textTransform: "uppercase" }}>Writing Panel</p>
      </div>
      <nav style={{ flex: 1, padding: "1rem 0.75rem" }}>
        {links.map(l => {
          const active = l.href === base ? pathname === base : pathname.startsWith(l.href);
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
            </Link>
          );
        })}
      </nav>
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
