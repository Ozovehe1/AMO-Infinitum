"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function Content() {
  const sp = useSearchParams();
  const error = sp.get("error");

  return (
    <div style={{ minHeight: "100vh", background: "#080f1a", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "Inter, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        {error ? (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "1.5rem" }}>✕</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "#fffef9", margin: "0 0 0.75rem" }}>Invalid link</h1>
            <p style={{ color: "#8fa3b1", fontSize: "0.88rem", margin: "0 0 2rem", lineHeight: 1.6 }}>This verification link is invalid or has already been used.</p>
            <Link href="/register" style={{ color: "#c8a97e", fontSize: "0.85rem", textDecoration: "none" }}>← Back to registration</Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: "2.5rem", marginBottom: "1.5rem" }}>✉</div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.5rem", color: "#fffef9", margin: "0 0 0.75rem" }}>Check your email</h1>
            <p style={{ color: "#8fa3b1", fontSize: "0.88rem", margin: "0 0 2rem", lineHeight: 1.6 }}>
              We sent a verification link to your email address. Click it to confirm your account and start setting up your blog.
            </p>
            <p style={{ color: "rgba(143,163,177,0.45)", fontSize: "0.78rem" }}>Didn&apos;t receive it? Check your spam folder.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><Content /></Suspense>;
}
