"use client";
import AdminNav from "@/components/AdminNav";
import PostForm from "@/components/PostForm";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Post {
  id: number; title: string; content: string; excerpt: string;
  coverImage?: string | null; published: boolean; featured: boolean; slug: string;
  categories: { category: { id: number; name: string; slug: string; color: string } }[];
}

export default function EditPost() {
  const params = useParams<{ username: string; id: string }>();
  const { username } = params;
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${params.id}`)
      .then(r => r.json())
      .then(data => { setPost(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [params.id]);

  const deletePost = async () => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    setDeleting(true);
    await fetch(`/api/posts/${params.id}`, { method: "DELETE" });
    router.push(`/${username}/inkwell/posts`);
  };

  const sharePost = async () => {
    if (!post) return;
    const url = `${window.location.origin}/${username}/blog/${post.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: post.title, url }); }
      else { await navigator.clipboard.writeText(url); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); }
    } catch { /* cancelled */ }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f0e8" }}>
      <AdminNav />
      <main className="admin-main" style={{ flex: 1 }}>
        <div style={{ maxWidth: 1100 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.75rem" }}>
            <div>
              <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>Editing Post</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#0d1f3c", margin: 0, fontWeight: 600 }}>
                {loading ? "Loading…" : (post?.title || "Post not found")}
              </h1>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              {post?.published && (
                <>
                  <Link href={`/${username}/blog/${post.slug}`} target="_blank" style={{ color: "#9a8e7e", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", textDecoration: "none" }}>
                    ↗ View Live
                  </Link>
                  <button onClick={sharePost} style={{ background: "transparent", color: shareCopied ? "#4a9e7a" : "#9a8e7e", border: "none", padding: "0.4rem 0", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>
                    {shareCopied ? "Copied" : "Share"}
                  </button>
                </>
              )}
              <button onClick={deletePost} disabled={deleting} style={{ background: "transparent", color: "#c04040", border: "1px solid rgba(192,64,64,0.3)", borderRadius: 4, padding: "0.4rem 0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", cursor: "pointer" }}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "5rem", color: "#8fa3b1", fontFamily: "Inter, sans-serif" }}>Loading post…</div>
          ) : !post ? (
            <div style={{ textAlign: "center", padding: "5rem" }}>
              <p style={{ fontFamily: "'Playfair Display', serif", color: "#0d1f3c" }}>Post not found.</p>
              <Link href={`/${username}/inkwell/posts`} style={{ color: "#2d7d9a", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>← Back to posts</Link>
            </div>
          ) : (
            <PostForm post={{ ...post, coverImage: post.coverImage ?? undefined }} />
          )}
        </div>
      </main>
    </div>
  );
}
