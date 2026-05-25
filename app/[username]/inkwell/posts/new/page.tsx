"use client";
import AdminNav from "@/components/AdminNav";
import PostForm from "@/components/PostForm";

export default function NewPost() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f5f0e8" }}>
      <AdminNav />
      <main className="admin-main" style={{ flex: 1 }}>
        <div style={{ maxWidth: 1100 }}>
          <div style={{ marginBottom: "1.75rem" }}>
            <p style={{ color: "#8fa3b1", fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 0.5rem" }}>New Post</p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", color: "#0d1f3c", margin: 0, fontWeight: 600 }}>Write something.</h1>
          </div>
          <PostForm />
        </div>
      </main>
    </div>
  );
}
