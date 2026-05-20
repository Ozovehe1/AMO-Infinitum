import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { formatDate, truncate } from "@/lib/utils";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButtons from "@/components/ShareButtons";
import AudioPlayer from "@/components/AudioPlayer";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await prisma.post.findUnique({ where: { slug, published: true } });
  if (!post) return {};
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";
  const url = `${siteUrl}/blog/${slug}`;
  const desc = post.excerpt || post.title;

  // Generated branded OG image — title + cover photo + AMO Infinitum branding
  const ogImageUrl =
    `${siteUrl}/api/og` +
    `?title=${encodeURIComponent(post.title)}` +
    `&excerpt=${encodeURIComponent(post.excerpt || truncate(post.content, 130))}` +
    `&cover=${encodeURIComponent(post.coverImage || "")}`;

  const ogImage = { url: ogImageUrl, width: 1200, height: 630, alt: post.title };

  return {
    title: `${post.title} — AMO Infinitum`,
    description: desc,
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: desc,
      images: [ogImage],
      publishedTime: (post.publishedAt || post.createdAt).toISOString(),
      siteName: "AMO Infinitum",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: desc,
      images: [ogImageUrl],
      site: "@Cryptnate",
      creator: "@Cryptnate",
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug, published: true },
    include: { categories: { include: { category: true } } },
    // showUpdatedNotice and updatedAt are top-level fields, included automatically
  });

  if (!post) notFound();

  const related = await prisma.post.findMany({
    where: {
      published: true,
      id: { not: post.id },
      categories: post.categories.length > 0
        ? { some: { categoryId: { in: post.categories.map(c => c.categoryId) } } }
        : undefined,
    },
    include: { categories: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const date = formatDate(post.publishedAt || post.createdAt);

  return (
    <>
      <Header />
      <ReadingProgress />

      {/* Hero */}
      <div style={{ background: "#0d1f3c", paddingTop: 64 }}>
        {post.coverImage ? (
          <div style={{ position: "relative", height: "clamp(280px, 45vh, 520px)", overflow: "hidden" }}>
            <img src={post.coverImage} alt={post.title} style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.6 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(13,31,60,0.4), rgba(13,31,60,0.9))" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "3rem 1.5rem" }}>
              <PostMeta post={post} date={date} onDark />
            </div>
          </div>
        ) : (
          <div style={{ padding: "5rem 1.5rem 4rem" }}>
            <PostMeta post={post} date={date} onDark />
          </div>
        )}
      </div>

      {/* Article body */}
      <main style={{ background: "#fffef9", flex: 1 }}>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem 0" }}>
          <AudioPlayer slug={post.slug} />
        </div>
        <article style={{ maxWidth: 720, margin: "0 auto", padding: "1.5rem 1.5rem 5rem" }}>
          <div
            className="prose-amo"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>

        {/* Share buttons */}
        <ShareButtons title={post.title} slug={post.slug} />

        {/* Category tags */}
        {post.categories.length > 0 && (
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 1.5rem 2rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {post.categories.map(c => (
              <Link key={c.categoryId} href={`/?category=${c.category.slug}`} style={{
                padding: "0.3rem 0.9rem",
                borderRadius: 20,
                border: `1px solid ${c.category.color}40`,
                background: c.category.color + "12",
                color: c.category.color,
                fontFamily: "Inter, sans-serif",
                fontSize: "0.72rem",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                textDecoration: "none",
                fontWeight: 500,
              }}>
                {c.category.name}
              </Link>
            ))}
          </div>
        )}

        {/* Divider */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 1.5rem" }}>
          <hr style={{ border: "none", borderTop: "1px solid rgba(13,31,60,0.1)", margin: "2rem 0" }} />
        </div>

        {/* Back */}
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
          <Link href="/" style={{ color: "#2d7d9a", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            ← Back to all writings
          </Link>
        </div>

        {/* Related posts */}
        {related.length > 0 && (
          <section style={{ background: "#f5f0e8", padding: "4rem 1.5rem 5rem", borderTop: "1px solid rgba(13,31,60,0.08)" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
              <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 2rem" }}>You might also like</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
                {related.map(r => (
                  <Link key={r.id} href={`/blog/${r.slug}`} style={{ textDecoration: "none" }}>
                    <div style={{ background: "#fffef9", borderRadius: 6, overflow: "hidden", border: "1px solid rgba(13,31,60,0.08)", transition: "transform 0.2s, box-shadow 0.2s" }} className="related-card">
                      {r.coverImage && (
                        <div style={{ height: 160, overflow: "hidden" }}>
                          <img src={r.coverImage} alt={r.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      )}
                      <div style={{ padding: "1.25rem" }}>
                        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.05rem", color: "#0d1f3c", margin: "0 0 0.5rem", lineHeight: 1.3 }}>
                          {r.title}
                        </h3>
                        <span style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.75rem" }}>
                          {formatDate(r.publishedAt || r.createdAt)} · {r.readingTime} min
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
            <style>{`.related-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(13,31,60,0.1); }`}</style>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}

function PostMeta({ post, date, onDark }: {
  post: {
    title: string;
    readingTime: number;
    updatedAt: Date | string;
    showUpdatedNotice: boolean;
    categories: { categoryId: number; category: { name: string; slug: string; color: string } }[];
  };
  date: string;
  onDark?: boolean;
}) {
  const textColor = onDark ? "#fffef9" : "#0d1f3c";
  const subColor = onDark ? "#8fa3b1" : "#3a5068";

  return (
    <div style={{ maxWidth: 760 }}>
      {post.categories.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
          {post.categories.map(c => (
            <span key={c.categoryId} style={{ color: c.category.color, fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {c.category.name}
            </span>
          ))}
        </div>
      )}
      <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 600, color: textColor, lineHeight: 1.2, margin: "0 0 1.25rem" }}>
        {post.title}
      </h1>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", color: subColor, fontSize: "0.8rem", fontFamily: "Inter, sans-serif" }}>
        <span>{date}</span>
        <span>·</span>
        <span>{post.readingTime} min read</span>
        {post.showUpdatedNotice && (
          <>
            <span>·</span>
            <span style={{ color: "#c8a97e", fontStyle: "italic" }}>
              Updated {formatDate(post.updatedAt)}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
