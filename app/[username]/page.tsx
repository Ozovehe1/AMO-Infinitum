import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getThemeByUsername } from "@/lib/theme";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PostCard from "@/components/PostCard";
import Link from "next/link";
import { formatDate, truncate, subtleColor } from "@/lib/utils";
import { Suspense } from "react";
import SubBanner from "@/components/SubBanner";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const theme = await getThemeByUsername(username);
  if (!theme) return {};
  return {
    title: theme.siteName,
    description: theme.description || theme.tagline,
  };
}

export default async function UserBlogHome({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { username } = await params;
  const sp = await searchParams;
  const category = sp.category;
  const page = parseInt(sp.page || "1");
  const limit = 9;

  const [theme, user] = await Promise.all([
    getThemeByUsername(username),
    prisma.user.findUnique({ where: { username } }),
  ]);

  if (!theme || !user) notFound();

  const userId = user.id;

  const [featured, posts, total, categories] = await Promise.all([
    prisma.post.findFirst({
      where: { userId, published: true, featured: true },
      include: { categories: { include: { category: true } } },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.post.findMany({
      where: {
        userId,
        published: true,
        ...(category ? { categories: { some: { category: { slug: category } } } } : {}),
      },
      include: { categories: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({
      where: {
        userId,
        published: true,
        ...(category ? { categories: { some: { category: { slug: category } } } } : {}),
      },
    }),
    prisma.category.findMany({
      where: { userId },
      include: { _count: { select: { posts: { where: { post: { published: true } } } } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const featuredExcerpt = featured ? featured.excerpt || truncate(featured.content, 200) : "";
  const accent = theme.colorAccent || "#c8a97e";
  const primary = theme.colorPrimary || "#0d1f3c";
  const bg = theme.colorBg || "#f5f0e8";
  const base = `/${username}`;
  const subtleOnDark = subtleColor(primary);
  const subtleOnLight = `${primary}99`;

  return (
    <>
      <Header username={username} theme={theme} />

      {/* Hero */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "flex-end", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: theme.coverImage ? `url('${theme.coverImage}')` : "none",
          backgroundSize: "cover", backgroundPosition: "center 30%",
          background: theme.coverImage ? undefined : primary,
        }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(10,20,35,0.25) 0%, rgba(10,20,35,0.5) 55%, rgba(10,20,35,0.95) 100%)" }} />
        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 1200, margin: "0 auto", padding: "0 1.5rem 8rem" }}>
          {theme.tagline && (
            <p style={{ color: accent, fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 1.25rem", maxWidth: 480, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {theme.tagline}
            </p>
          )}
          <h1 style={{ fontFamily: "var(--blog-font-heading, 'Playfair Display', Georgia, serif)", fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 600, color: "#fffef9", lineHeight: 1.05, margin: "0 0 1.5rem", maxWidth: 820 }}>
            {theme.siteName}
          </h1>
          {theme.heroQuote && (
            <p style={{ fontFamily: "var(--blog-font-body, 'Source Serif 4', Georgia, serif)", fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "color-mix(in srgb, var(--blog-bg, #f5f0e8) 75%, transparent)", maxWidth: 600, lineHeight: 1.75, margin: "0 0 2.5rem", fontStyle: "italic", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {theme.heroQuote}
            </p>
          )}
          <a href="#posts" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", border: `1px solid ${accent}8c`, color: accent, padding: "0.75rem 1.75rem", borderRadius: 2, fontFamily: "Inter, sans-serif", fontSize: "0.78rem", letterSpacing: "0.1em", textTransform: "uppercase", textDecoration: "none" }}>
            Read the Blog
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 7h10M8 3l4 4-4 4" />
            </svg>
          </a>
        </div>
        <div style={{ position: "absolute", bottom: "2.5rem", left: "50%", transform: "translateX(-50%)", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: `${accent}80`, fontSize: "0.6rem", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>Scroll</span>
          <div style={{ width: 1, height: 48, background: `linear-gradient(to bottom, ${accent}99, transparent)` }} />
        </div>
      </section>

      {/* Featured post */}
      {featured && !category && (
        <section style={{ background: primary, padding: "5rem 1.5rem" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto" }}>
            <p style={{ color: accent, fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 2.5rem" }}>✦ Featured</p>
            <Link href={`${base}/blog/${featured.slug}`} style={{ textDecoration: "none" }}>
              <div style={{ display: "grid", gridTemplateColumns: featured.coverImage ? "1fr 1fr" : "1fr", gap: "4rem", alignItems: "center" }} className="featured-grid">
                {featured.coverImage && (
                  <div style={{ borderRadius: 6, overflow: "hidden", aspectRatio: "4/3", background: "color-mix(in srgb, var(--blog-primary, #0d1f3c) 70%, var(--blog-accent, #c8a97e) 30%)" }}>
                    <img src={featured.coverImage} alt={featured.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }} className="featured-img" />
                  </div>
                )}
                <div>
                  <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                    {featured.categories.map(c => (
                      <span key={c.categoryId} style={{ color: c.category.color, fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {c.category.name}
                      </span>
                    ))}
                  </div>
                  <h2 style={{ fontFamily: "var(--blog-font-heading, 'Playfair Display', Georgia, serif)", fontSize: "clamp(1.75rem, 3vw, 2.75rem)", fontWeight: 600, color: "#fffef9", lineHeight: 1.2, margin: "0 0 1.1rem", wordBreak: "break-word" }}>
                    {featured.title}
                  </h2>
                  <p style={{ color: subtleOnDark, fontFamily: "var(--blog-font-body, 'Source Serif 4', Georgia, serif)", fontSize: "1.05rem", lineHeight: 1.7, margin: "0 0 1.75rem", wordBreak: "break-word", overflowWrap: "break-word" }}>
                    {featuredExcerpt}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: subtleOnDark, fontSize: "0.78rem", fontFamily: "Inter, sans-serif" }}>
                    <span>{formatDate(featured.publishedAt || featured.createdAt)}</span>
                    <span>·</span>
                    <span>{featured.readingTime} min read</span>
                    <span style={{ color: accent, marginLeft: "0.25rem" }}>Read →</span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
          <style>{`.featured-img:hover { transform: scale(1.04); } @media (max-width: 768px) { .featured-grid { grid-template-columns: 1fr !important; gap: 2rem !important; } }`}</style>
        </section>
      )}

      {/* Posts grid */}
      <main id="posts" style={{ flex: 1, background: bg, padding: "5rem 1.5rem" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "3rem", paddingBottom: "2rem", borderBottom: "1px solid color-mix(in srgb, var(--blog-primary, #0d1f3c) 10%, transparent)" }}>
            <Link href={base} style={{ padding: "0.45rem 1.1rem", borderRadius: 20, fontFamily: "Inter, sans-serif", fontSize: "0.75rem", letterSpacing: "0.04em", textDecoration: "none", border: "1px solid " + (!category ? accent : `${primary}33`), background: !category ? accent : "transparent", color: !category ? bg : subtleOnLight, transition: "all 0.2s" }}>All</Link>
            {categories.map(cat => (
              <Link key={cat.id} href={`${base}?category=${cat.slug}`} style={{ padding: "0.45rem 1.1rem", borderRadius: 20, fontFamily: "Inter, sans-serif", fontSize: "0.75rem", letterSpacing: "0.04em", textDecoration: "none", border: "1px solid " + (category === cat.slug ? cat.color : "color-mix(in srgb, var(--blog-primary, #0d1f3c) 20%, transparent)"), background: category === cat.slug ? cat.color : "transparent", color: category === cat.slug ? "#fff" : subtleOnLight, transition: "all 0.2s" }}>
                {cat.name}
                <span style={{ marginLeft: "0.4rem", opacity: 0.65, fontSize: "0.68rem" }}>({cat._count.posts})</span>
              </Link>
            ))}
          </div>

          <p style={{ color: subtleOnLight, fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 2rem" }}>
            {category ? `Category — ${category}` : "All Writings"} &nbsp;·&nbsp; {total} {total === 1 ? "post" : "posts"}
          </p>

          {posts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "6rem 0" }}>
              <p style={{ fontFamily: "var(--blog-font-heading, 'Playfair Display', Georgia, serif)", fontSize: "1.6rem", color: primary, margin: "0 0 0.5rem" }}>Nothing here yet.</p>
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: subtleOnLight }}>Check back soon.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }} className="posts-grid">
              {posts.map(post => (
                <PostCard key={post.id} post={post} username={username} siteName={theme.siteName} featured theme={{ colorPrimary: primary, colorAccent: accent, colorBg: bg }} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "4rem" }}>
              {page > 1 && (
                <Link href={`${base}?${category ? `category=${category}&` : ""}page=${page - 1}`} style={{ padding: "0.5rem 1.25rem", border: `1px solid ${primary}33`, borderRadius: 4, textDecoration: "none", color: primary, fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>← Prev</Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <Link key={p} href={`${base}?${category ? `category=${category}&` : ""}page=${p}`} style={{ padding: "0.5rem 0.875rem", border: `1px solid ${p === page ? accent : `${primary}33`}`, background: p === page ? accent : "transparent", borderRadius: 4, textDecoration: "none", color: p === page ? bg : primary, fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>{p}</Link>
              ))}
              {page < totalPages && (
                <Link href={`${base}?${category ? `category=${category}&` : ""}page=${page + 1}`} style={{ padding: "0.5rem 1.25rem", border: `1px solid ${primary}33`, borderRadius: 4, textDecoration: "none", color: primary, fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>Next →</Link>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer username={username} theme={theme} />
      <Suspense><SubBanner /></Suspense>

      <style>{`@media (max-width: 640px) { .posts-grid { grid-template-columns: 1fr !important; } }`}</style>
    </>
  );
}
