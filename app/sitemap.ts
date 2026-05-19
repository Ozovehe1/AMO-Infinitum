import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://amo-infinitum.vercel.app";

  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const categories = await prisma.category.findMany({
    select: { slug: true },
  });

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    ...categories.map(c => ({
      url: `${siteUrl}/?category=${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...posts.map(p => ({
      url: `${siteUrl}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
