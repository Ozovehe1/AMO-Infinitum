"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AdminGuard";

const links = [
  { href: "/admin", label: "Dashboard", icon: "⌂" },
  { href: "/admin/posts/new", label: "New Post", icon: "✎" },
  { href: "/admin/posts", label: "All Posts", icon: "≡" },
  { href: "/admin/categories", label: "Categories", icon: "◈" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside style={{ width: 220, minHeight: "100vh", background: "#0d1f3c", borderRight: "1px solid rgba(200,169,126,0.12)", display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, zIndex: 50 }}>
      {/* Logo */}
      <div style={{ padding: "1.5rem 1.25rem 1rem", borderBottom: "1px solid rgba(200,169,126,0.1)" }}>
        <Link href="/" target="_blank" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#c8a97e" }}>
            AMO <span style={{ fontStyle: "italic", color: "#fffef9" }}>Infinitum</span>
          </span>
        </Link>
        <p style={{ color: "#8fa3b1", fontSize: "0.68rem", fontFamily: "Inter, sans-serif", margin: "0.3rem 0 0", letterSpacing: "0.08em", textTransform: "uppercase" }}>Admin</p>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "1rem 0.75rem" }}>
        {links.map(l => {
          const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} style={{
              display: "flex", alignItems: "center", gap: "0.625rem",
              padding: "0.65rem 0.75rem", borderRadius: 6, marginBottom: "0.2rem",
              textDecoration: "none",
              background: active ? "rgba(45,125,154,0.2)" : "transparent",
              color: active ? "#c8a97e" : "#8fa3b1",
              fontFamily: "Inter, sans-serif", fontSize: "0.85rem",
              transition: "all 0.15s",
              borderLeft: active ? "2px solid #c8a97e" : "2px solid transparent",
            }}>
              <span style={{ fontSize: "1rem" }}>{l.icon}</span>
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "1rem 0.75rem", borderTop: "1px solid rgba(200,169,126,0.1)" }}>
        <Link href="/" target="_blank" style={{ display: "block", color: "#8fa3b1", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", padding: "0.5rem 0.75rem", marginBottom: "0.25rem" }}>
          ↗ View Blog
        </Link>
        <button onClick={logout} style={{ width: "100%", background: "transparent", border: "none", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", cursor: "pointer", padding: "0.5rem 0.75rem", textAlign: "left", borderRadius: 4, transition: "color 0.15s" }}>
          ⎋ Sign Out
        </button>
      </div>
    </aside>
  );
}
