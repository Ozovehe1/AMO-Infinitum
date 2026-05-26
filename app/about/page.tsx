import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "About — AMO Infinitum",
  description: "AMO Infinitum is a platform for independent writers who care about words. Learn what we stand for and who we're building for.",
};

export const dynamic = "force-dynamic";

export default async function PlatformAbout() {
  const [totalUsers, totalPosts] = await Promise.all([
    prisma.user.count({ where: { emailVerified: true, onboarded: true } }),
    prisma.post.count({ where: { published: true, user: { emailVerified: true, onboarded: true } } }),
  ]);

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .about-split { grid-template-columns: 1fr !important; }
          .about-left { display: none !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#faf9f6", color: "#1a1814" }}>

        {/* Nav */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(13,31,60,0.97)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(200,169,126,0.09)", height: 58,
          display: "flex", alignItems: "center",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ textDecoration: "none" }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 400, color: "#fffef9" }}>
                AMO <em style={{ color: "#c8a97e" }}>Infinitum</em>
              </span>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "1.75rem" }}>
              <Link href="/posts" style={{ color: "rgba(255,254,249,0.4)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>Posts</Link>
              <span style={{ color: "rgba(255,254,249,0.25)", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>About</span>
              <Link href="/login" style={{ color: "rgba(255,254,249,0.4)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>Sign in</Link>
              <Link href="/register" style={{ color: "#c8a97e", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", letterSpacing: "0.04em", borderBottom: "1px solid rgba(200,169,126,0.4)", paddingBottom: "0.1rem" }}>
                Begin writing →
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <div style={{ background: "#0d1f3c", padding: "5rem 1.5rem 4.5rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 1.25rem" }}>
              About
            </p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.25rem, 5vw, 4rem)", fontWeight: 400, color: "#fffef9", lineHeight: 1.1, margin: "0 0 1.5rem", maxWidth: 700 }}>
              A home for writers who take words seriously.
            </h1>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "clamp(1rem, 1.6vw, 1.1rem)", color: "rgba(255,254,249,0.5)", maxWidth: 560, lineHeight: 1.85, margin: 0 }}>
              AMO Infinitum exists because the internet needs more slow, deliberate, personal writing — and fewer algorithms deciding what matters.
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "5rem 1.5rem" }}>

          <div style={{ borderLeft: "2px solid #c8a97e", paddingLeft: "1.75rem", marginBottom: "4rem" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 400, color: "#0d1f3c", lineHeight: 1.25, margin: "0 0 1.25rem" }}>
              What this is.
            </h2>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "1.05rem", color: "rgba(26,24,20,0.75)", lineHeight: 1.85, margin: "0 0 1rem" }}>
              AMO Infinitum is a multi-writer blogging platform. Every writer gets their own blog — their own domain, their own design, their own readers. The platform handles the infrastructure; the writer handles the words.
            </p>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "1.05rem", color: "rgba(26,24,20,0.75)", lineHeight: 1.85, margin: 0 }}>
              When you sign up, an AI onboarding process interviews you about your niche, your voice, and the feeling you want your blog to have. It builds your theme, picks your typography, and writes your tagline. You open your writing panel and start writing.
            </p>
          </div>

          <div style={{ borderLeft: "2px solid rgba(13,31,60,0.15)", paddingLeft: "1.75rem", marginBottom: "4rem" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 400, color: "#0d1f3c", lineHeight: 1.25, margin: "0 0 1.25rem" }}>
              Who it&apos;s for.
            </h2>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "1.05rem", color: "rgba(26,24,20,0.75)", lineHeight: 1.85, margin: "0 0 1rem" }}>
              Writers who want a space of their own. Essayists, thinkers, storytellers, analysts — anyone with something worth saying and the patience to say it properly. Not content creators optimising for clicks. Writers.
            </p>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "1.05rem", color: "rgba(26,24,20,0.75)", lineHeight: 1.85, margin: 0 }}>
              If you have found yourself annoyed by every blogging platform that treats writing like a product — this is built with you in mind.
            </p>
          </div>

          <div style={{ borderLeft: "2px solid rgba(13,31,60,0.15)", paddingLeft: "1.75rem", marginBottom: "5rem" }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 400, color: "#0d1f3c", lineHeight: 1.25, margin: "0 0 1.25rem" }}>
              What we believe.
            </h2>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "1.05rem", color: "rgba(26,24,20,0.75)", lineHeight: 1.85, margin: "0 0 1rem" }}>
              That a blog should feel like the writer — not like the platform. That typography matters. That a good essay deserves a beautiful page. That readers will find good writing when good writing exists.
            </p>
            <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "1.05rem", color: "rgba(26,24,20,0.75)", lineHeight: 1.85, margin: 0 }}>
              We are not building a social network. There are no likes, no follower counts, no feeds designed to maximise time-on-site. Just writing, and readers who came looking for it.
            </p>
          </div>

          {/* Stats */}
          {(totalUsers > 0 || totalPosts > 0) && (
            <div style={{ display: "flex", gap: "3rem", paddingTop: "2.5rem", borderTop: "1px solid rgba(13,31,60,0.1)", flexWrap: "wrap", marginBottom: "4rem" }}>
              {([[totalUsers, "writers"], [totalPosts, "posts published"]] as [number, string][]).map(([n, label]) => (
                <div key={label}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2.25rem", color: "#0d1f3c", lineHeight: 1, fontWeight: 400 }}>{n}</div>
                  <div style={{ color: "rgba(26,24,20,0.35)", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", marginTop: "0.35rem", letterSpacing: "0.08em" }}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div style={{ paddingTop: "1rem" }}>
            <Link href="/register" style={{ display: "inline-block", background: "#0d1f3c", color: "#c8a97e", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.875rem 2.25rem", borderRadius: 2 }}>
              Start your blog
            </Link>
            <Link href="/posts" style={{ display: "inline-block", marginLeft: "1.5rem", color: "rgba(26,24,20,0.4)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>
              Read the writings →
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ background: "#0d1f3c", padding: "3rem 1.5rem", borderTop: "1px solid rgba(200,169,126,0.07)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#c8a97e", fontStyle: "italic", textDecoration: "none" }}>
              AMO Infinitum
            </Link>
            <div style={{ display: "flex", gap: "2rem" }}>
              <Link href="/posts" style={{ color: "rgba(255,254,249,0.25)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none" }}>Posts</Link>
              <Link href="/register" style={{ color: "rgba(255,254,249,0.35)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: "0.12rem" }}>Begin writing →</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
