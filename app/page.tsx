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
        .lp-posts-btn:hover { background: rgba(200,169,126,0.1) !important; }
        .lp-cta:hover { opacity: 0.9; }
        @media (max-width: 640px) {
          .lp-nav-secondary { display: none !important; }
          .lp-nav-cta { display: none !important; }
          .lp-hero-h1 { font-size: 2.6rem !important; line-height: 1.1 !important; }
          .lp-hero-sub { font-size: 1rem !important; }
          .lp-hero-ctarow { gap: 1.25rem !important; flex-direction: column !important; align-items: flex-start !important; }
          .about-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .lp-footer-links { flex-wrap: wrap !important; gap: 1rem !important; }
        }
      `}</style>

      <div style={{ background: "#0d1f3c", color: "#fffef9" }}>

        {/* Nav */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: "rgba(13,31,60,0.97)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(200,169,126,0.09)", height: 58,
          display: "flex", alignItems: "center",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 400, color: "#fffef9", flexShrink: 0 }}>
              AMO <em style={{ color: "#c8a97e" }}>Infinitum</em>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }} className="lp-nav-secondary">
                <Link href="/posts" className="lp-posts-btn" style={{
                  color: "#fffef9", textDecoration: "none",
                  fontFamily: "Inter, sans-serif", fontSize: "0.82rem",
                  padding: "0.375rem 0.875rem", borderRadius: 2,
                  border: "1px solid rgba(255,254,249,0.15)",
                  transition: "background 0.2s", whiteSpace: "nowrap",
                }}>Browse posts</Link>
                <Link href="/about" style={{ color: "rgba(255,254,249,0.4)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", whiteSpace: "nowrap" }}>About</Link>
                <Link href="/login" style={{ color: "rgba(255,254,249,0.4)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", whiteSpace: "nowrap" }}>Sign in</Link>
              </div>
              <Link href="/register" className="lp-nav-cta" style={{ color: "#c8a97e", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", letterSpacing: "0.04em", borderBottom: "1px solid rgba(200,169,126,0.4)", paddingBottom: "0.1rem", whiteSpace: "nowrap" }}>
                Begin writing →
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", width: "100%", padding: "0 1.5rem 6rem" }}>
            <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 1.5rem" }}>
              A platform for independent writers
            </p>
            <h1 className="lp-hero-h1" style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(3rem, 7.5vw, 6.5rem)",
              fontWeight: 400, color: "#fffef9", lineHeight: 1.05,
              margin: "0 0 1.75rem", maxWidth: 860,
            }}>
              For writers who<br />take words seriously.
            </h1>
            <p className="lp-hero-sub" style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: "clamp(1rem, 1.8vw, 1.1rem)",
              color: "rgba(255,254,249,0.5)", maxWidth: 480,
              lineHeight: 1.8, margin: "0 0 2.5rem",
            }}>
              AMO Infinitum is home to independent writers. AI sets up your blog — you do the writing.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "2rem" }} className="lp-hero-ctarow">
              <Link href="/register" className="lp-cta" style={{
                display: "inline-block",
                background: "#c8a97e", color: "#0d1f3c",
                textDecoration: "none", fontFamily: "Inter, sans-serif",
                fontSize: "0.82rem", fontWeight: 600,
                letterSpacing: "0.08em", textTransform: "uppercase",
                padding: "0.875rem 2rem", borderRadius: 2,
                transition: "opacity 0.2s",
              }}>
                Begin writing
              </Link>
              <Link href="/posts" style={{ color: "rgba(255,254,249,0.4)", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", textDecoration: "none" }}>
                Browse {totalPosts > 0 ? `${totalPosts} post${totalPosts === 1 ? "" : "s"}` : "posts"} →
              </Link>
            </div>

            {(totalUsers > 0 || totalPosts > 0) && (
              <div style={{ display: "flex", gap: "3rem", marginTop: "4.5rem", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
                {([[totalUsers, "writers"], [totalPosts, "posts published"]] as [number, string][]).map(([n, label]) => (
                  <div key={label}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.9rem", color: "#c8a97e", lineHeight: 1, fontWeight: 400 }}>{n}</div>
                    <div style={{ color: "rgba(255,254,249,0.28)", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", marginTop: "0.3rem", letterSpacing: "0.08em" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* About section */}
        <section style={{ background: "#faf9f6", padding: "6rem 1.5rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "start" }} className="about-grid">
            <div>
              <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 1.5rem" }}>About the platform</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 400, color: "#0d1f3c", lineHeight: 1.15, margin: "0 0 1.75rem" }}>
                A home for writers who take words seriously.
              </h2>
              <Link href="/about" style={{ color: "rgba(26,24,20,0.4)", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", textDecoration: "none", borderBottom: "1px solid rgba(26,24,20,0.15)", paddingBottom: "0.15rem" }}>
                Read more →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2.25rem" }}>
              <div style={{ borderLeft: "2px solid #c8a97e", paddingLeft: "1.5rem" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 400, color: "#0d1f3c", margin: "0 0 0.5rem" }}>What this is.</h3>
                <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.92rem", color: "rgba(26,24,20,0.62)", lineHeight: 1.8, margin: 0 }}>
                  A multi-writer blogging platform. Every writer gets their own blog — their own space, their own readers. AI sets it up; you do the writing.
                </p>
              </div>
              <div style={{ borderLeft: "2px solid rgba(13,31,60,0.12)", paddingLeft: "1.5rem" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 400, color: "#0d1f3c", margin: "0 0 0.5rem" }}>Who it&apos;s for.</h3>
                <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.92rem", color: "rgba(26,24,20,0.62)", lineHeight: 1.8, margin: 0 }}>
                  Essayists, thinkers, storytellers, analysts. Anyone with something worth saying and the patience to say it properly. Not content creators — writers.
                </p>
              </div>
              <div style={{ borderLeft: "2px solid rgba(13,31,60,0.12)", paddingLeft: "1.5rem" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", fontWeight: 400, color: "#0d1f3c", margin: "0 0 0.5rem" }}>What we believe.</h3>
                <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.92rem", color: "rgba(26,24,20,0.62)", lineHeight: 1.8, margin: 0 }}>
                  No likes, no follower counts, no feeds maximising time-on-site. Just writing, and readers who came looking for it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ background: "#0d1f3c", padding: "3rem 1.5rem", borderTop: "1px solid rgba(200,169,126,0.07)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#c8a97e", fontStyle: "italic", textDecoration: "none" }}>
              AMO Infinitum
            </Link>
            <div style={{ display: "flex", gap: "1.75rem", alignItems: "center" }} className="lp-footer-links">
              <Link href="/posts" style={{ color: "rgba(255,254,249,0.25)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none" }}>Posts</Link>
              <Link href="/about" style={{ color: "rgba(255,254,249,0.25)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none" }}>About</Link>
              <Link href="/login" style={{ color: "rgba(255,254,249,0.25)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none" }}>Sign in</Link>
              <Link href="/register" style={{ color: "rgba(255,254,249,0.4)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: "0.12rem" }}>
                Begin writing →
              </Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
