import Link from "next/link";
import { formatDate, truncate } from "@/lib/utils";

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
  const excerpt = post.excerpt || truncate(post.content, 160);
  const cats = post.categories.map(c => c.category);

  if (featured) {
    return (
      <Link href={`/blog/${post.slug}`} style={{ textDecoration: "none", display: "block" }}>
        <article style={{
          background: "rgba(13,31,60,0.04)",
          border: "1px solid rgba(13,31,60,0.1)",
          borderRadius: 8,
          overflow: "hidden",
          transition: "transform 0.25s, box-shadow 0.25s",
          cursor: "pointer",
        }}
          className="post-card-hover"
        >
          {post.coverImage && (
            <div style={{ height: 280, overflow: "hidden", background: "#1a4a5c" }}>
              <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }} />
            </div>
          )}
          <div style={{ padding: "2rem" }}>
            {cats.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
                {cats.map(c => (
                  <span key={c.id} style={{ background: c.color + "18", color: c.color, border: `1px solid ${c.color}30`, borderRadius: 20, padding: "0.15rem 0.75rem", fontSize: "0.72rem", fontFamily: "Inter, sans-serif", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 500 }}>
                    {c.name}
                  </span>
                ))}
              </div>
            )}
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 600, color: "#0d1f3c", lineHeight: 1.25, margin: "0 0 0.75rem" }}>
              {post.title}
            </h2>
            <p style={{ color: "#3a5068", fontSize: "1rem", lineHeight: 1.65, margin: "0 0 1.25rem", fontFamily: "'Source Serif 4', serif", wordBreak: "break-word", overflowWrap: "break-word" }}>
              {excerpt}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "#8fa3b1", fontSize: "0.78rem", fontFamily: "Inter, sans-serif" }}>
              <span>{date}</span>
              <span>·</span>
              <span>{post.readingTime} min read</span>
            </div>
          </div>
        </article>
        <style>{`.post-card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(13,31,60,0.12); }`}</style>
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
          {post.coverImage && (
            <div style={{ width: 100, height: 80, flexShrink: 0, borderRadius: 4, overflow: "hidden", background: "#1a4a5c" }}>
              <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          )}
        </div>
      </article>
      <style>{`.post-list-hover:hover { opacity: 0.8; }`}</style>
    </Link>
  );
}
