import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "All Posts — AMO Infinitum",
  description: "Browse every post published on AMO Infinitum by our independent writers.",
};

async function getAllPosts() {
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

export default async function PostsPage() {
  const posts = await getAllPosts();

  return (
    <>
      <style>{`
        .disc-card { transition: box-shadow 0.2s; }
        .disc-card:hover { box-shadow: 0 2px 16px rgba(13,31,60,0.09); }
        .disc-card:hover .disc-img { transform: scale(1.02); }
        .disc-card:hover .disc-title { opacity: 0.65; }
        @media (max-width: 640px) { .disc-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f7f6f3" }}>

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
              <Link href="/about" style={{ color: "rgba(255,254,249,0.4)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>About</Link>
              <Link href="/login" style={{ color: "rgba(255,254,249,0.4)", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>Sign in</Link>
              <Link href="/register" style={{ color: "#c8a97e", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", letterSpacing: "0.04em", borderBottom: "1px solid rgba(200,169,126,0.4)", paddingBottom: "0.1rem" }}>
                Begin writing →
              </Link>
            </div>
          </div>
        </nav>

        {/* Header */}
        <div style={{ background: "#0d1f3c", padding: "4rem 1.5rem 3.5rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 1rem" }}>
              AMO Infinitum
            </p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 400, color: "#fffef9", lineHeight: 1.1, margin: "0 0 0.75rem" }}>
              All writings.
            </h1>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "rgba(255,254,249,0.3)", margin: 0, letterSpacing: "0.04em" }}>
              {posts.length} {posts.length === 1 ? "post" : "posts"} published
            </p>
          </div>
        </div>

        {/* Posts grid */}
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "4rem 1.5rem" }}>
          {posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "6rem 0" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.4rem", color: "#0d1f3c", margin: "0 0 0.75rem", fontWeight: 400 }}>Nothing here yet.</p>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "#9a8e7e", margin: "0 0 2rem" }}>Be the first to write.</p>
              <Link href="/register" style={{ color: "#0d1f3c", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", textDecoration: "underline", textUnderlineOffset: 3 }}>
                Start your blog →
              </Link>
            </div>
          ) : (
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
          )}
        </div>

        {/* Footer */}
        <footer style={{ background: "#0d1f3c", padding: "3rem 1.5rem", borderTop: "1px solid rgba(200,169,126,0.07)", marginTop: "2rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <Link href="/" style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#c8a97e", fontStyle: "italic", textDecoration: "none" }}>
              AMO Infinitum
            </Link>
            <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
              <Link href="/about" style={{ color: "rgba(255,254,249,0.25)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none" }}>About</Link>
              <Link href="/register" style={{ color: "rgba(255,254,249,0.35)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", textDecoration: "none", borderBottom: "1px solid rgba(255,255,255,0.12)", paddingBottom: "0.12rem" }}>
                Begin writing →
              </Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
