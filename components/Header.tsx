"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

interface Category {
  id: number;
  name: string;
  slug: string;
}

export default function Header() {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(data => setCategories(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isHome = pathname === "/";

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: "background 0.4s, backdrop-filter 0.4s, box-shadow 0.4s",
        background: scrolled || !isHome
          ? "rgba(13,31,60,0.97)"
          : "transparent",
        backdropFilter: scrolled || !isHome ? "blur(12px)" : "none",
        boxShadow: scrolled || !isHome ? "0 1px 0 rgba(200,169,126,0.15)" : "none",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600, color: "#c8a97e", letterSpacing: "0.02em" }}>
            AMO <span style={{ color: "#fffef9", fontStyle: "italic" }}>Infinitum</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav style={{ display: "flex", alignItems: "center", gap: "2rem" }} className="desktop-nav">
          <Link href="/" style={{ color: pathname === "/" ? "#c8a97e" : "#dfc4a2", textDecoration: "none", fontSize: "0.875rem", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", fontWeight: 400, transition: "color 0.2s" }}>
            Home
          </Link>
          {categories.slice(0, 4).map(cat => (
            <Link key={cat.id} href={`/?category=${cat.slug}`} style={{ color: pathname === "/" && typeof window !== "undefined" && window.location.search.includes(cat.slug) ? "#c8a97e" : "#8fa3b1", textDecoration: "none", fontSize: "0.8rem", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", fontWeight: 400, transition: "color 0.2s" }}>
              {cat.name}
            </Link>
          ))}
          <Link href="/about" style={{ color: pathname === "/about" ? "#c8a97e" : "#8fa3b1", textDecoration: "none", fontSize: "0.8rem", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", fontWeight: 400, transition: "color 0.2s" }}>
            About
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#c8a97e", padding: "0.5rem", display: "none" }}
          aria-label="Menu"
          className="mobile-menu-btn"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor">
            {menuOpen
              ? <path d="M4 4l14 14M4 18L18 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
              : <><rect y="4" width="22" height="1.5" rx="0.75" /><rect y="10" width="22" height="1.5" rx="0.75" /><rect y="16" width="22" height="1.5" rx="0.75" /></>
            }
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: "rgba(13,31,60,0.99)", borderTop: "1px solid rgba(200,169,126,0.15)", padding: "1rem 1.5rem 1.5rem" }}>
          <Link href="/" onClick={() => setMenuOpen(false)} style={{ display: "block", color: "#c8a97e", textDecoration: "none", padding: "0.75rem 0", borderBottom: "1px solid rgba(200,169,126,0.1)", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>Home</Link>
          {categories.map(cat => (
            <Link key={cat.id} href={`/?category=${cat.slug}`} onClick={() => setMenuOpen(false)} style={{ display: "block", color: "#8fa3b1", textDecoration: "none", padding: "0.75rem 0", borderBottom: "1px solid rgba(200,169,126,0.08)", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {cat.name}
            </Link>
          ))}
          <Link href="/about" onClick={() => setMenuOpen(false)} style={{ display: "block", color: "#8fa3b1", textDecoration: "none", padding: "0.75rem 0", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>About</Link>
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
