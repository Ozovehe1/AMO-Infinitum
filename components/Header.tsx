"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { Theme } from "@/lib/theme";
import { subtleColor } from "@/lib/utils";

interface Category { id: number; name: string; slug: string }

interface Props { username: string; theme: Theme }

export default function Header({ username, theme }: Props) {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const base = `/${username}`;
  const isHome = pathname === base || pathname === `${base}/`;

  useEffect(() => {
    fetch(`/api/categories?username=${username}`)
      .then(r => r.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [username]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const accent = theme.colorAccent || "#c8a97e";
  const primary = theme.colorPrimary || "#0d1f3c";
  const subtle = subtleColor(primary);

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      transition: "background 0.4s, backdrop-filter 0.4s, box-shadow 0.4s",
      background: scrolled || !isHome ? `${primary}f7` : "transparent",
      backdropFilter: scrolled || !isHome ? "blur(12px)" : "none",
      boxShadow: scrolled || !isHome ? `0 1px 0 ${accent}26` : "none",
    }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        <Link href={base} style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600, color: accent, letterSpacing: "0.02em" }}>
            {theme.siteName || "Blog"}
          </span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: "2rem" }} className="desktop-nav">
          <Link href={base} style={{ color: isHome ? accent : "#dfc4a2", textDecoration: "none", fontSize: "0.875rem", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", fontWeight: 400, transition: "color 0.2s" }}>
            Home
          </Link>
          {categories.slice(0, 4).map(cat => (
            <Link key={cat.id} href={`${base}?category=${cat.slug}`} style={{ color: subtle, textDecoration: "none", fontSize: "0.8rem", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", fontWeight: 400, transition: "color 0.2s" }}>
              {cat.name}
            </Link>
          ))}
          <Link href={`${base}/about`} style={{ color: pathname === `${base}/about` ? accent : subtle, textDecoration: "none", fontSize: "0.8rem", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", fontWeight: 400, transition: "color 0.2s" }}>
            About
          </Link>
        </nav>

        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: accent, padding: "0.5rem", display: "none" }} aria-label="Menu" className="mobile-menu-btn">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
            {menuOpen
              ? <path d="M4 4l14 14M4 18L18 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              : <><rect y="4" width="22" height="1.5" rx="0.75" /><rect y="10" width="22" height="1.5" rx="0.75" /><rect y="16" width="22" height="1.5" rx="0.75" /></>}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div style={{ background: `${primary}fc`, borderTop: `1px solid ${accent}26`, padding: "1rem 1.5rem 1.5rem" }}>
          <Link href={base} onClick={() => setMenuOpen(false)} style={{ display: "block", color: accent, textDecoration: "none", padding: "0.75rem 0", borderBottom: `1px solid ${accent}1a`, fontFamily: "Inter, sans-serif", fontSize: "0.9rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>Home</Link>
          {categories.map(cat => (
            <Link key={cat.id} href={`${base}?category=${cat.slug}`} onClick={() => setMenuOpen(false)} style={{ display: "block", color: subtle, textDecoration: "none", padding: "0.75rem 0", borderBottom: `1px solid ${accent}14`, fontFamily: "Inter, sans-serif", fontSize: "0.85rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {cat.name}
            </Link>
          ))}
          <Link href={`${base}/about`} onClick={() => setMenuOpen(false)} style={{ display: "block", color: subtle, textDecoration: "none", padding: "0.75rem 0", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>About</Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
      `}</style>
    </header>
  );
}
