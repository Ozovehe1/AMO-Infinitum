import { redirect } from "next/navigation";

export default async function OldBlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/abdul/blog/${slug}`);
}
