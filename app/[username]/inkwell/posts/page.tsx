"use client";
import AdminNav from "@/components/AdminNav";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Post {
  id: number; title: string; slug: string; published: boolean;
  featured: boolean; readingTime: number; createdAt: string;
  categories: { category: { name: string; color: string } }[];
}

export default function AllPosts() {
  const { username } = useParams<{ username: string }>();
  const base = `/${username}/inkwell`;
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const sharePost = async (p: Post) => {
    const url = `${window.location.origin}/${username}/blog/${p.slug}`;
    try {
      if (navigator.share) { await navigator.share({ title: p.title, url }); }
      else { await navigator.clipboard.writeText(url); setCopiedId(p.id); setTimeout(() => setCopiedId(null), 2000); }
    } catch { /* cancelled */ }
  };

  const load = (q = "") => {
    setLoading(true);
    fetch(`/api/posts?admin=true&limit=50${q ? `&search=${encodeURIComponent(q)}` : ""}`)
      .then(r => r.json())
      .then(data => { setPosts(data.posts || []); setTotal(data.total || 0); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--admin-bg, #f5f0e8)" }}>
      <style>{`
        .posts-new-btn { display: inline-flex; }
        .post-share-btn { display: inline-flex; }
        @media (max-width: 768px) {
          .posts-new-btn { display: none !important; }
          .post-share-btn { display: none !important; }
        }
      `}</style>
      <AdminNav />
      <main className="admin-main" style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
        <div style={{ maxWidth: 900, width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
            <div>
              <p style={{ color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>All Posts · {total}</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "var(--admin-primary, #0d1f3c)", margin: 0, fontWeight: 600 }}>Your Writings</h1>
            </div>
            <Link href={`${base}/posts/new`} className="posts-new-btn" style={{ background: "var(--admin-primary, #0d1f3c)", color: "var(--admin-accent, #c8a97e)", textDecoration: "none", padding: "0.65rem 1.25rem", borderRadius: 2, fontFamily: "Inter, sans-serif", fontSize: "0.78rem", letterSpacing: "0.06em" }}>
              New Post
            </Link>
          </div>

          <input
            value={search}
            onChange={e => { setSearch(e.target.value); load(e.target.value); }}
            placeholder="Search posts…"
            style={{ width: "100%", background: "var(--admin-bg-card)", border: "1px solid color-mix(in srgb, var(--admin-primary) 15%, transparent)", borderRadius: 6, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "var(--admin-primary)", outline: "none", marginBottom: "1.5rem", boxSizing: "border-box" }}
          />

          <div style={{ background: "var(--admin-bg-card)", border: "1px solid var(--admin-primary-border)", borderRadius: 8, overflow: "hidden" }}>
            {loading ? (
              <p style={{ padding: "2rem", textAlign: "center", color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif" }}>Loading…</p>
            ) : posts.length === 0 ? (
              <p style={{ padding: "3rem", textAlign: "center", color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif" }}>
                {search ? "No posts match your search." : <><Link href={`${base}/posts/new`} style={{ color: "var(--admin-accent, #c8a97e)" }}>Write your first post.</Link></>}
              </p>
            ) : (
              posts.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: i < posts.length - 1 ? `1px solid color-mix(in srgb, var(--admin-primary) 5%, transparent)` : "none", gap: "0.75rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "var(--admin-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
                      {p.featured && <span style={{ background: "var(--admin-accent-faint, #c8a97e18)", color: "var(--admin-accent, #c8a97e)", border: "1px solid rgba(0,0,0,0.08)", padding: "0.1rem 0.4rem", borderRadius: 2, fontSize: "0.62rem", fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.05em", flexShrink: 0 }}>Featured</span>}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {p.categories.map((c, j) => (
                        <span key={j} style={{ color: c.category.color, fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>{c.category.name}</span>
                      ))}
                      <span style={{ color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.7rem" }}>
                        {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {p.readingTime} min
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                    <span style={{ color: p.published ? "#4a9e7a" : "var(--admin-sidebar-muted)", borderLeft: `2px solid ${p.published ? "#4a9e7a" : "rgba(0,0,0,0.15)"}`, paddingLeft: "0.45rem", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {p.published ? "Live" : "Draft"}
                    </span>
                    <Link href={`${base}/posts/${p.id}`} style={{ color: "var(--admin-accent, #c8a97e)", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", textDecoration: "none" }}>Edit</Link>
                    {p.published && (
                      <>
                        <Link href={`/${username}/blog/${p.slug}`} target="_blank" style={{ color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", textDecoration: "none" }}>↗</Link>
                        <button onClick={() => sharePost(p)} className="post-share-btn" style={{ background: "none", border: "none", color: copiedId === p.id ? "#4a9e7a" : "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", cursor: "pointer", padding: 0 }}>
                          {copiedId === p.id ? "Copied" : "Copy"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
