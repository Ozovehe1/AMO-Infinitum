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
  theme?: { colorPrimary: string; colorAccent: string; colorBg: string };
}

function isDark(hex: string): boolean {
  if (!hex || hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 128;
}

export default function PostCard({ post, username, siteName = "Blog", featured = false, theme }: PostCardProps) {
  const date = formatDate(post.publishedAt || post.createdAt);
  const excerpt = post.excerpt || firstSentence(post.content);
  const cats = post.categories.map(c => c.category);
  const href = `/${username}/blog/${post.slug}`;

  const accent = theme?.colorAccent || "#c8a97e";
  const primary = theme?.colorPrimary || "#0d1f3c";
  const bg = theme?.colorBg || "#f5f0e8";
  const darkTheme = isDark(bg);

  const cardBg = darkTheme ? "rgba(255,255,255,0.04)" : "#fffef9";
  const cardBorder = darkTheme ? "rgba(255,255,255,0.08)" : `color-mix(in srgb, ${primary} 10%, transparent)`;
  const titleColor = darkTheme ? "#fffef9" : primary;
  const textColor = darkTheme ? "rgba(255,254,249,0.62)" : `${primary}aa`;
  const metaColor = darkTheme ? "rgba(255,254,249,0.38)" : `${primary}60`;

  if (featured) {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "block" }}>
        <article style={{
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 8,
          overflow: "hidden",
          transition: "transform 0.25s, box-shadow 0.25s",
          cursor: "pointer",
          borderTop: `3px solid ${accent}`,
        }} className="post-card-hover">
          {post.coverImage ? (
            <div style={{ aspectRatio: "16/9", overflow: "hidden", background: primary }}>
              <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.4s" }} className="post-card-img" />
            </div>
          ) : (
            <div style={{ aspectRatio: "16/9", overflow: "hidden", background: primary, position: "relative", display: "flex", alignItems: "flex-end", padding: "1.25rem 1.5rem" }}>
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 80% 20%, ${accent}44 0%, transparent 55%), radial-gradient(ellipse at 15% 85%, ${accent}22 0%, transparent 50%)` }} />
              <span style={{ position: "relative", fontFamily: "Inter, sans-serif", fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.22em", color: `${accent}bb`, textTransform: "uppercase" }}>{siteName}</span>
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
            <h2 style={{ fontFamily: "var(--blog-font-heading, 'Playfair Display', Georgia, serif)", fontSize: "1.35rem", fontWeight: 600, color: titleColor, lineHeight: 1.25, margin: "0 0 0.6rem", wordBreak: "break-word" }}>
              {post.title}
            </h2>
            <p style={{ color: textColor, fontSize: "0.92rem", lineHeight: 1.65, margin: "0 0 1rem", fontFamily: "var(--blog-font-body, 'Source Serif 4', Georgia, serif)", wordBreak: "break-word", overflowWrap: "break-word" }}>
              {excerpt}
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: metaColor, fontSize: "0.75rem", fontFamily: "Inter, sans-serif" }}>
                <span>{date}</span>
                <span>·</span>
                <span>{post.readingTime} min read</span>
              </div>
              <span style={{ color: accent, fontFamily: "Inter, sans-serif", fontSize: "0.78rem", fontWeight: 500 }}>Read →</span>
            </div>
          </div>
        </article>
        <style>{`
          .post-card-hover:hover { transform: translateY(-3px); box-shadow: 0 12px 40px rgba(0,0,0,0.15); }
          .post-card-hover:hover .post-card-img { transform: scale(1.04); }
        `}</style>
      </Link>
    );
  }

  return (
    <Link href={href} style={{ textDecoration: "none", display: "block" }}>
      <article style={{ padding: "1.5rem 0", borderBottom: `1px solid ${cardBorder}`, cursor: "pointer", transition: "opacity 0.2s" }} className="post-list-hover">
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
            <h3 style={{ fontFamily: "var(--blog-font-heading, 'Playfair Display', Georgia, serif)", fontSize: "1.2rem", fontWeight: 600, color: titleColor, lineHeight: 1.3, margin: "0 0 0.4rem", wordBreak: "break-word" }}>
              {post.title}
            </h3>
            <p style={{ color: textColor, fontSize: "0.9rem", lineHeight: 1.6, margin: "0 0 0.75rem", fontFamily: "var(--blog-font-body, 'Source Serif 4', Georgia, serif)", wordBreak: "break-word", overflowWrap: "break-word" }}>
              {excerpt}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", color: metaColor, fontSize: "0.75rem", fontFamily: "Inter, sans-serif" }}>
              <span>{date}</span>
              <span>·</span>
              <span>{post.readingTime} min read</span>
            </div>
          </div>
          {post.coverImage ? (
            <div className="post-list-thumb" style={{ width: 100, height: 80, flexShrink: 0, borderRadius: 4, overflow: "hidden", background: primary }}>
              <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          ) : (
            <div className="post-list-thumb" style={{ width: 100, height: 80, flexShrink: 0, borderRadius: 4, overflow: "hidden", background: primary, position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 80% 20%, ${accent}40 0%, transparent 60%), radial-gradient(ellipse at 15% 85%, ${accent}22 0%, transparent 55%)` }} />
              <span style={{ position: "absolute", bottom: 6, left: 7, fontFamily: "Inter, sans-serif", fontSize: "0.48rem", fontWeight: 700, letterSpacing: "0.18em", color: `${accent}bb`, textTransform: "uppercase" }}>{siteName.slice(0, 6)}</span>
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
