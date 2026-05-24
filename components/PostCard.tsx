import Link from "next/link";
import { formatDate, firstSentence } from "@/lib/utils";

interface Category {
  category: { id: number; name: string; slug: string; color: string };
}

interface Post {
  id: number;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  coverImage?: string | null;
  readingTime: number;
  publishedAt?: Date | string | null;
  createdAt: Date | string;
  categories: Category[];
}

interface PostCardProps {
  post: Post;
  featured?: boolean;
}

export default function PostCard({ post, featured = false }: PostCardProps) {
  const date = formatDate(post.publishedAt || post.createdAt);
  const excerpt = post.excerpt || firstSentence(post.content);
  const cats = post.categories.map(c => c.category);

  if (featured) {
    return (
      <Link href={`/blog/${post.slug}`} style={{ textDecoration: "none", display: "block" }}>
        <article style={{
          background: "#fffef9",
          border: "1px solid rgba(13,31,60,0.1)",
          borderRadius: 8,
          overflow: "hidden",
          transition: "transform 0.25s, box-shadow 0.25s",
          cursor: "pointer",
          borderTop: "3px solid #c8a97e",
          display: "flex",
          flexDirection: "column",
        }}
          className="post-card-hover"
        >
          {post.coverImage ? (
            /* ── Real cover image ── */
            <div style={{ aspectRatio: "16/9", overflow: "hidden", background: "#1a4a5c", flexShrink: 0 }}>
              <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }} className="post-card-img" />
            </div>
          ) : (
            /* ── Branded generated cover — same 16/9 ratio as real cover image ── */
            <div style={{ aspectRatio: "16/9", background: "#0d1f3c", position: "relative", overflow: "hidden", flexShrink: 0 }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 80% 20%, rgba(45,125,154,0.4) 0%, transparent 55%), radial-gradient(ellipse at 15% 85%, rgba(200,169,126,0.25) 0%, transparent 50%)" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "1rem 1.25rem" }}>
                {/* Brand row */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#c8a97e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#0d1f3c", fontFamily: "Georgia, serif", flexShrink: 0 }}>A</div>
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(200,169,126,0.8)", textTransform: "uppercase" }}>AMO INFINITUM</span>
                </div>
                {/* Title + excerpt + rule */}
                <div>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", fontWeight: 600, color: "#fffef9", lineHeight: 1.25, margin: "0 0 0.35rem", wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {post.title}
                  </h2>
                  {excerpt && (
                    <p style={{ color: "rgba(200,169,126,0.75)", fontSize: "0.75rem", lineHeight: 1.5, margin: "0 0 0.5rem", fontFamily: "'Source Serif 4', serif", wordBreak: "break-word", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {excerpt}
                    </p>
                  )}
                  <div style={{ width: 22, height: 2, background: "#c8a97e", borderRadius: 1 }} />
                </div>
              </div>
            </div>
          )}

          {/* ── Card footer ── */}
          <div style={{ padding: post.coverImage ? "1.5rem" : "0.875rem 1.5rem", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "0.5rem" }}>
            {cats.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {cats.map(c => (
                  <span key={c.id} style={{ background: c.color + "18", color: c.color, border: `1px solid ${c.color}30`, borderRadius: 20, padding: "0.15rem 0.75rem", fontSize: "0.68rem", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
                    {c.name}
                  </span>
                ))}
              </div>
            )}
            {/* Title + excerpt only for posts that have a real cover image */}
            {post.coverImage && (
              <>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600, color: "#0d1f3c", lineHeight: 1.25, margin: "0.1rem 0 0", wordBreak: "break-word" }}>
                  {post.title}
                </h2>
                <p style={{ color: "#3a5068", fontSize: "0.92rem", lineHeight: 1.65, margin: 0, fontFamily: "'Source Serif 4', serif", wordBreak: "break-word", overflowWrap: "break-word", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {excerpt}
                </p>
              </>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#8fa3b1", fontSize: "0.75rem", fontFamily: "Inter, sans-serif" }}>
                <span>{date}</span>
                <span>·</span>
                <span>{post.readingTime} min read</span>
              </div>
              <span style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", fontWeight: 500 }}>Read →</span>
            </div>
          </div>
        </article>
        <style>{`
          .post-card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(13,31,60,0.12); }
          .post-card-hover:hover .post-card-img { transform: scale(1.04); }
        `}</style>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: "none", display: "block" }}>
      <article style={{
        padding: "1.5rem 0",
        borderBottom: "1px solid rgba(13,31,60,0.1)",
        cursor: "pointer",
        transition: "opacity 0.2s",
      }}
        className="post-list-hover"
      >
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {cats.length > 0 && (
              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                {cats.map(c => (
                  <span key={c.id} style={{ color: c.color, fontSize: "0.7rem", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
                    {c.name}
                  </span>
                ))}
              </div>
            )}
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 600, color: "#0d1f3c", lineHeight: 1.3, margin: "0 0 0.4rem", wordBreak: "break-word" }}>
              {post.title}
            </h3>
            <p style={{ color: "#3a5068", fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 0.75rem", fontFamily: "'Source Serif 4', serif", wordBreak: "break-word", overflowWrap: "break-word" }}>
              {excerpt}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: "#8fa3b1", fontSize: "0.75rem", fontFamily: "Inter, sans-serif" }}>
              <span>{date}</span>
              <span>·</span>
              <span>{post.readingTime} min read</span>
            </div>
          </div>
          {post.coverImage ? (
            <div className="post-list-thumb" style={{ width: 100, height: 80, flexShrink: 0, borderRadius: 4, overflow: "hidden", background: "#1a4a5c" }}>
              <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div className="post-list-thumb" style={{ width: 100, height: 80, flexShrink: 0, borderRadius: 4, overflow: "hidden", background: "#0d1f3c", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 80% 20%, rgba(45,125,154,0.4) 0%, transparent 60%), radial-gradient(ellipse at 15% 85%, rgba(200,169,126,0.25) 0%, transparent 55%)" }} />
              <span style={{ position: "absolute", bottom: 6, left: 7, fontFamily: "Inter, sans-serif", fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(200,169,126,0.75)", textTransform: "uppercase" }}>AMO</span>
            </div>
          )}
        </div>
      </article>
      <style>{`
        .post-list-hover:hover { opacity: 0.8; }
        @media (max-width: 380px) { .post-list-thumb { display: none !important; } }
      `}</style>
    </Link>
  );
}
