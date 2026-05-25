import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { getThemeByUsername } from "@/lib/theme";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Link from "next/link";
import { formatDate, truncate } from "@/lib/utils";
import ReadingProgress from "@/components/ReadingProgress";
import ShareButtons from "@/components/ShareButtons";
import AudioPlayer from "@/components/AudioPlayer";
import ViewTracker from "@/components/ViewTracker";
import PostCard from "@/components/PostCard";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params;
  const [user, theme] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    getThemeByUsername(username),
  ]);
  if (!user || !theme) return {};
  const post = await prisma.post.findFirst({ where: { userId: user.id, slug, published: true } });
  if (!post) return {};
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";
  const url = `${siteUrl}/${username}/blog/${slug}`;
  const desc = post.excerpt || post.title;
  const ogImageUrl =
    `${siteUrl}/api/og` +
    `?title=${encodeURIComponent(post.title)}` +
    `&excerpt=${encodeURIComponent(post.excerpt || truncate(post.content, 130))}` +
    `&cover=${encodeURIComponent(post.coverImage || "")}`;
  return {
    title: `${post.title} — ${theme.siteName}`,
    description: desc,
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: desc,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: post.title }],
      publishedTime: (post.publishedAt || post.createdAt).toISOString(),
      siteName: theme.siteName,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: desc,
      images: [ogImageUrl],
      ...(theme.twitterHandle ? { site: theme.twitterHandle, creator: theme.twitterHandle } : {}),
    },
  };
}

export default async function BlogPost({ params }: { params: Promise<{ username: string; slug: string }> }) {
  const { username, slug } = await params;

  const [user, theme] = await Promise.all([
    prisma.user.findUnique({ where: { username } }),
    getThemeByUsername(username),
  ]);
  if (!user || !theme) notFound();

  const post = await prisma.post.findFirst({
    where: { userId: user.id, slug, published: true },
    include: { categories: { include: { category: true } } },
  });
  if (!post) notFound();

  const [related, audioRow] = await Promise.all([
    prisma.post.findMany({
      where: {
        userId: user.id,
        published: true,
        id: { not: post.id },
        categories: post.categories.length > 0
          ? { some: { categoryId: { in: post.categories.map(c => c.categoryId) } } }
          : undefined,
      },
      include: { categories: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.siteSettings.findFirst({ where: { userId: user.id, key: `audio_${slug}` } }),
  ]);

  const audioUrl = audioRow?.value
    ? `/api/tts?username=${username}&slug=${slug}&v=${audioRow.value.match(/-(\d+)\.mp3$/)?.[1] ?? "0"}`
    : null;

  const date = formatDate(post.publishedAt || post.createdAt);
  const base = `/${username}`;

  return (
    <>
      <Header username={username} theme={theme} />
      <ReadingProgress />

      {/* Hero */}
      <div style={{ background: theme.colorPrimary || "#0d1f3c", paddingTop: 64 }}>
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

      {/* Body */}
      <main style={{ background: "#fffef9", flex: 1 }}>
        <article style={{ maxWidth: 720, margin: "0 auto", padding: "4rem 1.5rem 5rem" }}>
          <AudioPlayer audioUrl={audioUrl} />
          <ViewTracker postId={post.id} />
          <div className="prose-amo" dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>

        <ShareButtons title={post.title} slug={`${username}/blog/${post.slug}`} excerpt={post.excerpt || undefined} coverImage={post.coverImage || undefined} />

        {post.categories.length > 0 && (
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 1.5rem 2rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {post.categories.map(c => (
              <Link key={c.categoryId} href={`${base}?category=${c.category.slug}`} style={{ padding: "0.3rem 0.9rem", borderRadius: 20, border: `1px solid ${c.category.color}40`, background: c.category.color + "12", color: c.category.color, fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.05em", textTransform: "uppercase", textDecoration: "none", fontWeight: 500 }}>
                {c.category.name}
              </Link>
            ))}
          </div>
        )}

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 1.5rem" }}>
          <hr style={{ border: "none", borderTop: "1px solid rgba(13,31,60,0.1)", margin: "2rem 0" }} />
        </div>

        <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 1.5rem 3rem" }}>
          <Link href={base} style={{ color: "#2d7d9a", textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
            ← Back to all writings
          </Link>
        </div>

        {related.length > 0 && (
          <section style={{ background: theme.colorBg || "#f5f0e8", padding: "4rem 1.5rem 5rem", borderTop: "1px solid rgba(13,31,60,0.08)" }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
              <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 2rem" }}>You might also like</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
                {related.map(r => (
                  <PostCard key={r.id} post={r} username={username} siteName={theme.siteName} featured />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer username={username} theme={theme} />
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
            <span style={{ color: "#c8a97e", fontStyle: "italic" }}>Updated {formatDate(post.updatedAt)}</span>
          </>
        )}
      </div>
    </div>
  );
}
