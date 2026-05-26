"use client";
import AdminNav from "@/components/AdminNav";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Stats { totalPosts: number; publishedPosts: number; draftPosts: number; totalCategories: number }
interface Post { id: number; title: string; slug: string; published: boolean; readingTime: number; createdAt: string }

export default function AdminDashboard() {
  const { username } = useParams<{ username: string }>();
  const base = `/${username}/inkwell`;
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Post[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/posts?admin=true&limit=200").then(r => r.json()),
      fetch("/api/categories").then(r => r.json()),
    ]).then(([postsData, cats]) => {
      const all: Post[] = postsData.posts || [];
      setRecent(all.slice(0, 5));
      setStats({
        totalPosts: postsData.total || 0,
        publishedPosts: all.filter(p => p.published).length,
        draftPosts: all.filter(p => !p.published).length,
        totalCategories: cats.length,
      });
    });
  }, []);

  const statCards = [
    { label: "Total Posts",  value: stats?.totalPosts ?? "—",       opacity: "cc" },
    { label: "Published",    value: stats?.publishedPosts ?? "—",   opacity: "99" },
    { label: "Drafts",       value: stats?.draftPosts ?? "—",       opacity: "66" },
    { label: "Categories",   value: stats?.totalCategories ?? "—",  opacity: "44" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--admin-bg, #f5f0e8)" }}>
      <AdminNav />
      <main className="admin-main" style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
        <div style={{ maxWidth: 900, width: "100%" }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", color: "var(--admin-primary, #0d1f3c)", margin: "0 0 0.5rem" }}>Good to see you.</h1>
          <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", margin: "0 0 2.5rem" }}>What will you write today?</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
            {statCards.map(s => (
              <div key={s.label} style={{ background: "#fffef9", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 8, padding: "1.5rem", borderTop: `3px solid var(--admin-accent, #c8a97e)${s.opacity}` }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "var(--admin-primary, #0d1f3c)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.75rem", marginTop: "0.5rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "1rem", marginBottom: "3rem", flexWrap: "wrap" }}>
            <Link href={`${base}/posts/new`} style={{ background: "var(--admin-primary, #0d1f3c)", color: "var(--admin-accent, #c8a97e)", textDecoration: "none", padding: "0.75rem 1.5rem", borderRadius: 6, fontFamily: "Inter, sans-serif", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              ✎ Write New Post
            </Link>
            <Link href={`${base}/categories`} style={{ background: "transparent", color: "var(--admin-primary, #0d1f3c)", textDecoration: "none", padding: "0.75rem 1.5rem", borderRadius: 6, fontFamily: "Inter, sans-serif", fontSize: "0.85rem", border: "1px solid rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              ◈ Manage Categories
            </Link>
          </div>

          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: "var(--admin-primary, #0d1f3c)", margin: "0 0 1rem", fontWeight: 600 }}>Recent Posts</h2>
            <div style={{ background: "#fffef9", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 8, overflow: "hidden" }}>
              {recent.length === 0 ? (
                <p style={{ padding: "2rem", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", textAlign: "center" }}>
                  No posts yet.{" "}
                  <Link href={`${base}/posts/new`} style={{ color: "var(--admin-accent, #c8a97e)" }}>Write your first one.</Link>
                </p>
              ) : (
                recent.map((p, i) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", padding: "1rem 1.25rem", borderBottom: i < recent.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "var(--admin-primary, #0d1f3c)", marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#8fa3b1" }}>
                        {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {p.readingTime} min
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                      <span style={{ background: `var(--admin-accent-faint, #c8a97e18)`, color: p.published ? "#4a9e7a" : "var(--admin-accent, #c8a97e)", border: `1px solid ${p.published ? "#4a9e7a30" : "rgba(0,0,0,0.1)"}`, padding: "0.2rem 0.5rem", borderRadius: 12, fontFamily: "Inter, sans-serif", fontSize: "0.65rem", letterSpacing: "0.04em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {p.published ? "Live" : "Draft"}
                      </span>
                      <Link href={`${base}/posts/${p.id}`} style={{ color: "var(--admin-accent, #c8a97e)", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", textDecoration: "none", whiteSpace: "nowrap" }}>Edit</Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
