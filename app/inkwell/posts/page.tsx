"use client";
import AdminNav from "@/components/AdminNav";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Post {
  id: number;
  title: string;
  slug: string;
  published: boolean;
  featured: boolean;
  readingTime: number;
  createdAt: string;
  categories: { category: { name: string; color: string } }[];
}

export default function AllPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = (q = "") => {
    setLoading(true);
    fetch(`/api/posts?admin=true&limit=50${q ? `&search=${encodeURIComponent(q)}` : ""}`)
      .then(r => r.json())
      .then(data => { setPosts(data.posts || []); setTotal(data.total || 0); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const onSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    load(e.target.value);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f0e8" }}>
      <AdminNav />
      <main style={{ marginLeft: 220, flex: 1, padding: "2.5rem" }}>
        <div style={{ maxWidth: 900 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.75rem" }}>
            <div>
              <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>All Posts · {total}</p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#0d1f3c", margin: 0, fontWeight: 600 }}>Your Writings</h1>
            </div>
            <Link href="/inkwell/posts/new" style={{ background: "#0d1f3c", color: "#c8a97e", textDecoration: "none", padding: "0.65rem 1.25rem", borderRadius: 6, fontFamily: "Inter, sans-serif", fontSize: "0.82rem" }}>
              ✎ New Post
            </Link>
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={onSearch}
            placeholder="Search posts…"
            style={{ width: "100%", background: "#fffef9", border: "1px solid rgba(13,31,60,0.15)", borderRadius: 6, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", color: "#0d1f3c", outline: "none", marginBottom: "1.5rem", boxSizing: "border-box" }}
          />

          {/* Posts table */}
          <div style={{ background: "#fffef9", border: "1px solid rgba(13,31,60,0.08)", borderRadius: 8, overflow: "hidden" }}>
            {loading ? (
              <p style={{ padding: "2rem", textAlign: "center", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.9rem" }}>Loading…</p>
            ) : posts.length === 0 ? (
              <p style={{ padding: "3rem", textAlign: "center", color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.9rem" }}>
                {search ? "No posts match your search." : <>No posts yet. <Link href="/inkwell/posts/new" style={{ color: "#2d7d9a" }}>Write your first one.</Link></>}
              </p>
            ) : (
              posts.map((p, i) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 1.25rem", borderBottom: i < posts.length - 1 ? "1px solid rgba(13,31,60,0.05)" : "none", gap: "1rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "#0d1f3c", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</span>
                      {p.featured && <span style={{ background: "#c8a97e18", color: "#c8a97e", border: "1px solid #c8a97e30", padding: "0.1rem 0.4rem", borderRadius: 8, fontSize: "0.62rem", fontFamily: "Inter, sans-serif", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>Featured</span>}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {p.categories.map((c, j) => (
                        <span key={j} style={{ color: c.category.color, fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>{c.category.name}</span>
                      ))}
                      <span style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.7rem" }}>
                        {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {p.readingTime} min
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                    <span style={{ background: p.published ? "#4a9e7a18" : "#c8a97e18", color: p.published ? "#4a9e7a" : "#c8a97e", border: `1px solid ${p.published ? "#4a9e7a30" : "#c8a97e30"}`, padding: "0.2rem 0.6rem", borderRadius: 12, fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                      {p.published ? "Live" : "Draft"}
                    </span>
                    <Link href={`/inkwell/posts/${p.id}`} style={{ color: "#2d7d9a", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", textDecoration: "none" }}>Edit</Link>
                    {p.published && (
                      <Link href={`/blog/${p.slug}`} target="_blank" style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", textDecoration: "none" }}>↗</Link>
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
