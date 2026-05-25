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
  username: string;
  siteName?: string;
  featured?: boolean;
}

export default function PostCard({ post, username, siteName = "Blog", featured = false }: PostCardProps) {
  const date = formatDate(post.publishedAt || post.createdAt);
  const excerpt = post.excerpt || firstSentence(post.content);
  const cats = post.categories.map(c => c.category);
  const href = `/${username}/blog/${post.slug}`;

  if (featured) {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "block" }}>
        <article style={{
          background: "#fffef9",
          border: "1px solid rgba(13,31,60,0.1)",
          borderRadius: 8,
          overflow: "hidden",
          transition: "transform 0.25s, box-shadow 0.25s",
          cursor: "pointer",
          borderTop: "3px solid #c8a97e",
        }} className="post-card-hover">
          {post.coverImage ? (
            <div style={{ aspectRatio: "16/9", overflow: "hidden", background: "#1a4a5c" }}>
              <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }} className="post-card-img" />
            </div>
          ) : (
            <div style={{ aspectRatio: "16/9", overflow: "hidden", background: "#0d1f3c", position: "relative", display: "flex", alignItems: "flex-end", padding: "1.25rem 1.5rem" }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 80% 20%, rgba(45,125,154,0.4) 0%, transparent 55%), radial-gradient(ellipse at 15% 85%, rgba(200,169,126,0.25) 0%, transparent 50%)" }} />
              <span style={{ position: "relative", fontFamily: "Inter, sans-serif", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.22em", color: "rgba(200,169,126,0.75)", textTransform: "uppercase" }}>{siteName}</span>
            </div>
          )}
          <div style={{ padding: "1.5rem" }}>
            {cats.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.6rem" }}>
                {cats.map(c => (
                  <span key={c.id} style={{ background: c.color + "18", color: c.color, border: `1px solid ${c.color}30`, borderRadius: 20, padding: "0.15rem 0.75rem", fontSize: "0.68rem", fontFamily: "Inter, sans-serif", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 500 }}>
                    {c.name}
                  </span>
                ))}
              </div>
            )}
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.35rem", fontWeight: 600, color: "#0d1f3c", lineHeight: 1.25, margin: "0 0 0.6rem", wordBreak: "break-word" }}>
              {post.title}
            </h2>
            <p style={{ color: "#3a5068", fontSize: "0.92rem", lineHeight: 1.65, margin: "0 0 1rem", fontFamily: "'Source Serif 4', serif", wordBreak: "break-word", overflowWrap: "break-word" }}>
              {excerpt}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <article style={{ padding: "1.5rem 0", borderBottom: "1px solid rgba(13,31,60,0.1)", cursor: "pointer", transition: "opacity 0.2s" }} className="post-list-hover">
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
              <span style={{ position: "absolute", bottom: 6, left: 7, fontFamily: "Inter, sans-serif", fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.18em", color: "rgba(200,169,126,0.75)", textTransform: "uppercase" }}>{siteName.slice(0, 6)}</span>
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
