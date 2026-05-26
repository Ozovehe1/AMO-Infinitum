import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getDiscoveryPosts() {
  const posts = await prisma.post.findMany({
    where: { published: true, user: { emailVerified: true, onboarded: true } },
    include: { user: { include: { settings: true } } },
    orderBy: { publishedAt: "desc" },
  });

  return posts.map(p => {
    const s = (k: string) => p.user.settings.find(r => r.key === k)?.value || "";
    return {
      id: p.id, title: p.title, slug: p.slug,
      excerpt: p.excerpt || "", coverImage: p.coverImage || "",
      readingTime: p.readingTime,
      publishedAt: p.publishedAt, createdAt: p.createdAt,
      username: p.user.username,
      siteName: s("site_name") || p.user.username,
      accentColor: s("color_accent") || "#c8a97e",
    };
  });
}

export default async function PlatformLanding() {
  const [totalUsers, totalPosts] = await Promise.all([
    prisma.user.count({ where: { emailVerified: true, onboarded: true } }),
    prisma.post.count({ where: { published: true, user: { emailVerified: true, onboarded: true } } }),
  ]);

  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }
        .nav-read-btn:hover { background: rgba(200,169,126,0.12) !important; }
        @media (max-width: 768px) {
          .about-grid { grid-template-columns: 1fr !important; gap: 3rem !important; }
        }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0d1f3c", color: "#fffef9" }}>

        {/* Nav */}
        <nav style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
          background: "rgba(13,31,60,0.96)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(200,169,126,0.09)", height: 58,
          display: "flex", alignItems: "center",
        }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 400, color: "#fffef9" }}>
              AMO <em style={{ color: "#c8a97e" }}>Infinitum</em>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "1.75rem" }}>
              <Link href="/posts" className="nav-read-btn" style={{
                color: "#fffef9", textDecoration: "none",
                fontFamily: "Inter, sans-serif", fontSize: "0.82rem",
                padding: "0.4rem 0.875rem", borderRadius: 2,
                border: "1px solid rgba(255,254,249,0.15)",
                transition: "background 0.2s",
              }}>
                Browse posts
              </Link>
              <Link href="/about" style={{ color: "rgba(255,254,249,0.4)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>About</Link>
              <Link href="/login" style={{ color: "rgba(255,254,249,0.4)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>
                Sign in
              </Link>
              <Link href="/register" style={{ color: "#c8a97e", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", letterSpacing: "0.04em", borderBottom: "1px solid rgba(200,169,126,0.4)", paddingBottom: "0.1rem" }}>
                Begin writing →
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "relative", zIndex: 2, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "0 1.5rem 7rem" }}>
            <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 1.5rem" }}>
              A platform for independent writers
            </p>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(3rem, 7.5vw, 6.5rem)",
              fontWeight: 400, color: "#fffef9", lineHeight: 1.05,
              margin: "0 0 1.75rem", maxWidth: 860,
            }}>
              For writers who<br />take words seriously.
            </h1>
            <p style={{
              fontFamily: "'Source Serif 4', Georgia, serif",
              fontSize: "clamp(1rem, 1.8vw, 1.15rem)",
              color: "rgba(255,254,249,0.5)", maxWidth: 500,
              lineHeight: 1.8, margin: "0 0 2.75rem",
            }}>
              AMO Infinitum is home to independent writers. AI sets up your blog — you do the writing.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "2.5rem", flexWrap: "wrap" }}>
              <Link href="/register" style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", letterSpacing: "0.06em", textDecoration: "none", borderBottom: "1px solid rgba(200,169,126,0.4)", paddingBottom: "0.2rem" }}>
                Begin writing →
              </Link>
              <Link href="/posts" style={{ color: "rgba(255,254,249,0.45)", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", textDecoration: "none" }}>
                Browse {totalPosts > 0 ? `${totalPosts} posts` : "posts"} ↓
              </Link>
              <Link href="/login" style={{ color: "rgba(255,254,249,0.25)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>
                Sign in
              </Link>
            </div>

            {(totalUsers > 0 || totalPosts > 0) && (
              <div style={{ display: "flex", gap: "3.5rem", marginTop: "5rem", paddingTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
                {([[totalUsers, "writers"], [totalPosts, "posts published"]] as [number, string][]).map(([n, label]) => (
                  <div key={label}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.9rem", color: "#c8a97e", lineHeight: 1, fontWeight: 400 }}>{n}</div>
                    <div style={{ color: "rgba(255,254,249,0.28)", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", marginTop: "0.3rem", letterSpacing: "0.08em" }}>{label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: "absolute", bottom: "2.25rem", left: "50%", transform: "translateX(-50%)", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ color: "rgba(200,169,126,0.4)", fontSize: "0.58rem", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>Scroll</span>
            <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, rgba(200,169,126,0.45), transparent)" }} />
          </div>
        </section>

        {/* About section */}
        <section style={{ background: "#faf9f6", padding: "7rem 1.5rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5rem", alignItems: "start" }} className="about-grid">
            <div>
              <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 1.5rem" }}>About the platform</p>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 3.5vw, 2.75rem)", fontWeight: 400, color: "#0d1f3c", lineHeight: 1.15, margin: "0 0 1.75rem" }}>
                A home for writers who take words seriously.
              </h2>
              <Link href="/about" style={{ color: "rgba(26,24,20,0.4)", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", textDecoration: "none", borderBottom: "1px solid rgba(26,24,20,0.15)", paddingBottom: "0.15rem" }}>
                Read more about us →
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
              <div style={{ borderLeft: "2px solid #c8a97e", paddingLeft: "1.5rem" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 400, color: "#0d1f3c", margin: "0 0 0.6rem" }}>What this is.</h3>
                <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.95rem", color: "rgba(26,24,20,0.65)", lineHeight: 1.8, margin: 0 }}>
                  A multi-writer blogging platform. Every writer gets their own blog — their own space, their own readers. AI sets it up; you do the writing.
                </p>
              </div>
              <div style={{ borderLeft: "2px solid rgba(13,31,60,0.12)", paddingLeft: "1.5rem" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 400, color: "#0d1f3c", margin: "0 0 0.6rem" }}>Who it&apos;s for.</h3>
                <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.95rem", color: "rgba(26,24,20,0.65)", lineHeight: 1.8, margin: 0 }}>
                  Essayists, thinkers, storytellers, analysts. Anyone with something worth saying and the patience to say it properly. Not content creators — writers.
                </p>
              </div>
              <div style={{ borderLeft: "2px solid rgba(13,31,60,0.12)", paddingLeft: "1.5rem" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 400, color: "#0d1f3c", margin: "0 0 0.6rem" }}>What we believe.</h3>
                <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.95rem", color: "rgba(26,24,20,0.65)", lineHeight: 1.8, margin: 0 }}>
                  No likes, no follower counts, no feeds designed to maximise time-on-site. Just writing, and readers who came looking for it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ background: "#0d1f3c", padding: "4rem 1.5rem", borderTop: "1px solid rgba(200,169,126,0.07)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1.5rem" }}>
            <div>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 400, color: "#c8a97e", fontStyle: "italic", margin: "0 0 0.4rem" }}>AMO Infinitum</p>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "rgba(255,254,249,0.2)", margin: 0 }}>A home for independent writers.</p>
            </div>
            <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
              <Link href="/posts" style={{ color: "rgba(255,254,249,0.25)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none" }}>Browse posts</Link>
              <Link href="/about" style={{ color: "rgba(255,254,249,0.25)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none" }}>About</Link>
              <Link href="/login" style={{ color: "rgba(255,254,249,0.25)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none" }}>Sign in</Link>
              <Link href="/register" style={{ color: "rgba(255,254,249,0.4)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: "0.15rem" }}>
                Begin writing →
              </Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
