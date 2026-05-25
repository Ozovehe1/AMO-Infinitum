import { prisma } from "@/lib/db";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function getDiscoveryPosts() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    include: { user: { include: { settings: true } } },
    orderBy: { publishedAt: "desc" },
    take: 12,
  });

  return posts.map(p => {
    const siteName = p.user.settings.find(s => s.key === "site_name")?.value || p.user.username;
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      coverImage: p.coverImage,
      readingTime: p.readingTime,
      publishedAt: p.publishedAt,
      createdAt: p.createdAt,
      username: p.user.username,
      siteName,
    };
  });
}

export default async function PlatformLanding() {
  const [posts, totalUsers, totalPosts] = await Promise.all([
    getDiscoveryPosts(),
    prisma.user.count(),
    prisma.post.count({ where: { published: true } }),
  ]);

  return (
    <div style={{ minHeight: "100vh", background: "#0d1f3c", color: "#fffef9" }}>
      {/* Nav */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(13,31,60,0.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(200,169,126,0.12)", height: 60, display: "flex", alignItems: "center" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 600, color: "#c8a97e" }}>
            AMO <span style={{ color: "#fffef9", fontStyle: "italic" }}>Infinitum</span>
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Link href="/login" style={{ color: "#8fa3b1", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>Sign In</Link>
            <Link href="/register" style={{ background: "#c8a97e", color: "#0d1f3c", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", fontWeight: 600, padding: "0.45rem 1rem", borderRadius: 4 }}>Start Writing</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 160, paddingBottom: 100, paddingLeft: "1.5rem", paddingRight: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: "1.5rem" }}>A Platform for Writers</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2.5rem, 7vw, 5rem)", fontWeight: 600, color: "#fffef9", lineHeight: 1.1, margin: "0 0 1.5rem", maxWidth: 780 }}>
          Your blog.<br />
          <span style={{ color: "#c8a97e", fontStyle: "italic" }}>Your voice.</span>
        </h1>
        <p style={{ fontFamily: "'Source Serif 4', serif", fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "rgba(255,254,249,0.65)", maxWidth: 560, lineHeight: 1.75, margin: "0 0 2.5rem" }}>
          AMO Infinitum is a platform for writers who care about words. Start your blog in minutes — AI sets up your theme, you do the writing.
        </p>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#c8a97e", color: "#0d1f3c", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", fontWeight: 700, padding: "0.875rem 2rem", borderRadius: 4 }}>
            Create Your Blog →
          </Link>
          <Link href="/login" style={{ color: "#8fa3b1", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>
            Already writing? Sign in
          </Link>
        </div>

        <div style={{ display: "flex", gap: "3rem", marginTop: "4rem", flexWrap: "wrap" }}>
          {[[totalUsers, "Blogs"], [totalPosts, "Posts published"]].map(([n, label]) => (
            <div key={String(label)}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "#c8a97e", lineHeight: 1 }}>{n}</div>
              <div style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", marginTop: "0.25rem" }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Discovery feed */}
      {posts.length > 0 && (
        <section style={{ background: "#f5f0e8", padding: "5rem 1.5rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 0.4rem" }}>Community</p>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", color: "#0d1f3c", margin: "0 0 2.5rem", fontWeight: 600 }}>Latest from our writers</h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5rem" }} className="disc-grid">
              {posts.map(post => (
                <Link key={post.id} href={`/${post.username}/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                  <article style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.08)", borderRadius: 8, overflow: "hidden", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", height: "100%" }} className="disc-card">
                    {post.coverImage ? (
                      <div style={{ height: 160, overflow: "hidden" }}>
                        <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }} className="disc-img" />
                      </div>
                    ) : (
                      <div style={{ height: 80, background: "#0d1f3c", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.85rem", color: "rgba(200,169,126,0.6)", fontStyle: "italic" }}>{post.siteName}</span>
                      </div>
                    )}
                    <div style={{ padding: "1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
                        <span style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>{post.siteName}</span>
                        <span style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.7rem" }}>@{post.username}</span>
                      </div>
                      <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "#0d1f3c", lineHeight: 1.3, margin: "0 0 0.5rem", wordBreak: "break-word" }}>
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p style={{ color: "#3a5068", fontFamily: "'Source Serif 4', serif", fontSize: "0.85rem", lineHeight: 1.6, margin: "0 0 0.75rem", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {post.excerpt}
                        </p>
                      )}
                      <div style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", display: "flex", gap: "0.5rem" }}>
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
            .disc-card:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(13,31,60,0.12); }
            .disc-card:hover .disc-img { transform: scale(1.04); }
            @media (max-width: 640px) { .disc-grid { grid-template-columns: 1fr !important; } }
          `}</style>
        </section>
      )}

      {/* Footer CTA */}
      <section style={{ background: "#0d1f3c", padding: "5rem 1.5rem", textAlign: "center", borderTop: "1px solid rgba(200,169,126,0.12)" }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.75rem, 4vw, 2.75rem)", color: "#fffef9", margin: "0 0 1rem", fontWeight: 600 }}>Ready to start writing?</h2>
        <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", margin: "0 0 2rem" }}>Set up your blog in minutes. AI handles the design, you handle the words.</p>
        <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "#c8a97e", color: "#0d1f3c", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", fontWeight: 700, padding: "0.875rem 2.5rem", borderRadius: 4 }}>
          Create Your Blog →
        </Link>
      </section>
    </div>
  );
}
