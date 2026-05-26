import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getDiscoveryPosts() {
  const posts = await prisma.post.findMany({
    where: { published: true, user: { emailVerified: true, onboarded: true } },
    include: { user: { include: { settings: true } } },
    orderBy: { publishedAt: "desc" },
    take: 12,
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
  const [posts, totalUsers, totalPosts] = await Promise.all([
    getDiscoveryPosts(),
    prisma.user.count({ where: { emailVerified: true, onboarded: true } }),
    prisma.post.count({ where: { published: true, user: { emailVerified: true, onboarded: true } } }),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "#0c0c0f", color: "#fffef9" }}>

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(12,12,15,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(200,169,126,0.09)", height: 58,
        display: "flex", alignItems: "center",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", fontWeight: 400, color: "#fffef9" }}>
            AMO <em style={{ color: "#c8a97e" }}>Infinitum</em>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <Link href="/login" style={{ color: "rgba(255,254,249,0.4)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>Sign in</Link>
            <Link href="/register" style={{ color: "#c8a97e", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", letterSpacing: "0.04em", borderBottom: "1px solid rgba(200,169,126,0.4)", paddingBottom: "0.1rem" }}>
              Begin writing →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: "92vh", display: "flex", flexDirection: "column", justifyContent: "flex-end", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "relative", zIndex: 2, maxWidth: 1200, margin: "0 auto", width: "100%", padding: "0 1.5rem 6rem" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "2.5rem" }}>
            <Link href="/register" style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", letterSpacing: "0.06em", textDecoration: "none", borderBottom: "1px solid rgba(200,169,126,0.4)", paddingBottom: "0.2rem" }}>
              Begin writing →
            </Link>
            <Link href="/login" style={{ color: "rgba(255,254,249,0.3)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>
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

      {/* Discovery feed */}
        <section style={{ background: "#f7f6f3", padding: "5rem 1.5rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>

            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderBottom: "1px solid rgba(13,31,60,0.1)", paddingBottom: "1rem", marginBottom: "3rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: 0 }}>
                From our writers
              </p>
              {totalPosts > 12 && (
                <span style={{ color: "rgba(13,31,60,0.3)", fontFamily: "Inter, sans-serif", fontSize: "0.7rem" }}>
                  Latest {Math.min(totalPosts, 12)} of {totalPosts} posts
                </span>
              )}
            </div>

            {/* Uniform card grid — all posts same treatment */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }} className="disc-grid">
              {posts.map(post => (
                <Link key={post.id} href={`/${post.username}/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                  <article style={{ background: "#ffffff", border: "1px solid rgba(13,31,60,0.07)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }} className="disc-card">
                    {post.coverImage ? (
                      <div style={{ height: 180, overflow: "hidden", flexShrink: 0 }}>
                        <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.45s ease", display: "block" }} className="disc-img" />
                      </div>
                    ) : (
                      <div style={{ height: 80, background: "#0d1f3c", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.8rem", color: `${post.accentColor}80`, fontStyle: "italic" }}>{post.siteName}</span>
                      </div>
                    )}
                    <div style={{ padding: "1.25rem 1.25rem 1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <p style={{ color: post.accentColor, fontFamily: "Inter, sans-serif", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0 }}>
                        {post.siteName}
                      </p>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.08rem", fontWeight: 400, color: "#0d1f3c", lineHeight: 1.35, margin: 0, flex: 1 }} className="disc-title">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.83rem", color: "rgba(13,31,60,0.55)", lineHeight: 1.65, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {post.excerpt}
                        </p>
                      )}
                      <div style={{ color: "rgba(13,31,60,0.35)", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", display: "flex", gap: "0.5rem", marginTop: "auto", paddingTop: "0.5rem" }}>
                        <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                        <span>·</span>
                        <span>{post.readingTime} min read</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>

          <style>{`
            .disc-card { transition: box-shadow 0.2s; }
            .disc-card:hover { box-shadow: 0 2px 16px rgba(13,31,60,0.08); }
            .disc-card:hover .disc-img { transform: scale(1.02); }
            .disc-card:hover .disc-title { opacity: 0.65; }
            @media (max-width: 640px) { .disc-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </section>

      {/* Footer */}
      <footer style={{ background: "#0c0c0f", padding: "4rem 1.5rem", borderTop: "1px solid rgba(200,169,126,0.07)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "1.5rem" }}>
          <div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 400, color: "#c8a97e", fontStyle: "italic", margin: "0 0 0.4rem" }}>AMO Infinitum</p>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "rgba(255,254,249,0.2)", margin: 0 }}>A home for independent writers.</p>
          </div>
          <Link href="/register" style={{ color: "rgba(255,254,249,0.35)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: "0.15rem", letterSpacing: "0.04em" }}>
            Begin writing →
          </Link>
        </div>
      </footer>

    </div>
  );
}
