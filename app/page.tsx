import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlatformLanding() {
  const [totalUsers, totalPosts] = await Promise.all([
    prisma.user.count({ where: { emailVerified: true, onboarded: true } }),
    prisma.post.count({ where: { published: true, user: { emailVerified: true, onboarded: true } } }),
  ]);

  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }
        .lp-link:hover { opacity: 0.6; }
        .lp-cta-primary:hover { color: #e0c090 !important; }
        @media (max-width: 640px) {
          .lp-nav-links { display: none !important; }
          .lp-hero-h1 { font-size: clamp(2.4rem, 10vw, 3.5rem) !important; }
          .about-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .lp-footer-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
        }
      `}</style>

      <div style={{ background: "#0d1f3c", color: "#fffef9" }}>

        {/* Nav */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: "rgba(13,31,60,0.97)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(200,169,126,0.07)", height: 58,
          display: "flex", alignItems: "center",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 400, color: "#fffef9" }}>
              AMO <em style={{ color: "#c8a97e" }}>Infinitum</em>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }} className="lp-nav-links">
              <Link href="/posts" className="lp-link" style={{ color: "rgba(255,254,249,0.45)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", transition: "opacity 0.2s" }}>Posts</Link>
              <Link href="/login" className="lp-link" style={{ color: "rgba(255,254,249,0.45)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", transition: "opacity 0.2s" }}>Sign in</Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "0 1.5rem 7rem" }}>

            <h1 className="lp-hero-h1" style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(3.25rem, 7vw, 6.5rem)",
              fontWeight: 400, color: "#fffef9", lineHeight: 1.05,
              margin: "0 0 2rem", maxWidth: 820, letterSpacing: "-0.01em",
            }}>
              For writers who<br />take words seriously.
            </h1>

            <p style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: "1.05rem",
              color: "rgba(255,254,249,0.45)", maxWidth: 440,
              lineHeight: 1.85, margin: "0 0 3rem",
            }}>
              AMO Infinitum is home to independent writers. AI sets up your blog — you do the writing.
            </p>

            <div style={{ display: "flex", alignItems: "baseline", gap: "2.5rem", flexWrap: "wrap" }}>
              <Link href="/register" className="lp-cta-primary" style={{
                color: "#c8a97e", fontFamily: "Inter, sans-serif",
                fontSize: "0.85rem", letterSpacing: "0.04em",
                textDecoration: "none",
                borderBottom: "1px solid rgba(200,169,126,0.5)",
                paddingBottom: "0.15rem", transition: "color 0.2s",
              }}>
                Begin writing →
              </Link>
              <Link href="/posts" className="lp-link" style={{
                color: "rgba(255,254,249,0.3)", fontFamily: "Inter, sans-serif",
                fontSize: "0.82rem", textDecoration: "none", transition: "opacity 0.2s",
              }}>
                Browse {totalPosts > 0 ? `${totalPosts} post${totalPosts === 1 ? "" : "s"}` : "posts"}
              </Link>
            </div>

            {(totalUsers > 0 || totalPosts > 0) && (
              <p style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: "0.82rem", color: "rgba(255,254,249,0.2)",
                margin: "3.5rem 0 0", letterSpacing: "0.01em", fontStyle: "italic",
              }}>
                {totalUsers > 0 && `${totalUsers} writer${totalUsers === 1 ? "" : "s"}`}
                {totalUsers > 0 && totalPosts > 0 && " · "}
                {totalPosts > 0 && `${totalPosts} published work${totalPosts === 1 ? "" : "s"}`}
              </p>
            )}
          </div>
        </section>

        {/* About section */}
        <section id="about" style={{ background: "#faf9f6", padding: "7rem 1.5rem", scrollMarginTop: 58 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6rem", alignItems: "start" }} className="about-grid">
            <div>
              <h2 style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "clamp(1.75rem, 3vw, 2.4rem)",
                fontWeight: 400, color: "#0d1f3c",
                lineHeight: 1.2, margin: "0 0 1.75rem",
              }}>
                A home for writers who take words seriously.
              </h2>
              <p style={{
                fontFamily: "'Source Serif 4', Georgia, serif",
                fontSize: "0.95rem", color: "rgba(26,24,20,0.5)",
                lineHeight: 1.85, margin: "0 0 2rem",
              }}>
                Not a social network. Not a content farm. A place where the writing matters and the reader came looking for it.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
              <div style={{ borderLeft: "2px solid #c8a97e", paddingLeft: "1.5rem" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 400, color: "#0d1f3c", margin: "0 0 0.6rem" }}>What this is.</h3>
                <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.92rem", color: "rgba(26,24,20,0.58)", lineHeight: 1.8, margin: 0 }}>
                  A multi-writer platform where every writer gets their own blog — their own space, their own readers. AI sets it up; you do the writing.
                </p>
              </div>
              <div style={{ borderLeft: "2px solid rgba(13,31,60,0.1)", paddingLeft: "1.5rem" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 400, color: "#0d1f3c", margin: "0 0 0.6rem" }}>Who it&apos;s for.</h3>
                <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.92rem", color: "rgba(26,24,20,0.58)", lineHeight: 1.8, margin: 0 }}>
                  Essayists, thinkers, storytellers, analysts. Anyone with something worth saying and the patience to say it properly.
                </p>
              </div>
              <div style={{ borderLeft: "2px solid rgba(13,31,60,0.1)", paddingLeft: "1.5rem" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", fontWeight: 400, color: "#0d1f3c", margin: "0 0 0.6rem" }}>What we believe.</h3>
                <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.92rem", color: "rgba(26,24,20,0.58)", lineHeight: 1.8, margin: 0 }}>
                  No likes, no follower counts, no feeds designed to maximise time-on-site. Just writing, and readers who came looking for it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ background: "#07131f", borderTop: "1px solid rgba(200,169,126,0.06)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "4rem 1.5rem 3rem", display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr", gap: "3rem" }} className="lp-footer-grid">
            <div>
              <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", color: "#c8a97e", fontStyle: "italic", textDecoration: "none", display: "block", marginBottom: "0.8rem" }}>
                AMO Infinitum
              </Link>
              <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.85rem", color: "rgba(255,254,249,0.22)", lineHeight: 1.75, margin: 0, maxWidth: 260 }}>
                A platform for independent writers. Each blog is its own world.
              </p>
            </div>
            <div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,254,249,0.18)", margin: "0 0 1rem" }}>Navigate</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                <Link href="/posts" className="lp-link" style={{ color: "rgba(255,254,249,0.38)", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", textDecoration: "none", transition: "opacity 0.2s" }}>Posts</Link>
                <a href="#about" className="lp-link" style={{ color: "rgba(255,254,249,0.38)", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", textDecoration: "none", transition: "opacity 0.2s" }}>About ↑</a>
                <Link href="/login" className="lp-link" style={{ color: "rgba(255,254,249,0.38)", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", textDecoration: "none", transition: "opacity 0.2s" }}>Sign in</Link>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.58rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(255,254,249,0.18)", margin: "0 0 1rem" }}>Join</p>
              <Link href="/register" className="lp-link" style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", textDecoration: "none", borderBottom: "1px solid rgba(200,169,126,0.3)", paddingBottom: "0.1rem", transition: "opacity 0.2s" }}>
                Begin writing →
              </Link>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "1.1rem 1.5rem" }}>
            <div style={{ maxWidth: 1200, margin: "0 auto" }}>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "rgba(255,254,249,0.13)", margin: 0 }}>
                © {new Date().getFullYear()} AMO Infinitum. All rights reserved.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
