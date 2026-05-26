"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function Content() {
  const sp = useSearchParams();
  const error = sp.get("error");

  return (
    <div style={{ minHeight: "100vh", display: "flex" }}>
      {/* Left decorative panel */}
      <div style={{
        width: "42%", minHeight: "100vh", background: "#0d0d10",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "3rem 3.5rem", position: "relative", overflow: "hidden", flexShrink: 0,
      }} className="ve-left">
        <div style={{
          position: "absolute", bottom: "-2rem", left: "-1rem",
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(7rem, 14vw, 13rem)",
          color: "rgba(255,255,255,0.03)", lineHeight: 1,
          userSelect: "none", pointerEvents: "none", fontWeight: 700,
        }}>
          AMO
        </div>
        <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", margin: "0 0 2rem" }}>
          AMO Infinitum
        </p>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
          fontWeight: 400, color: "#fffef9", lineHeight: 1.2,
          margin: "0 0 1.25rem", maxWidth: 320,
        }}>
          One step away.
        </h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.86rem", color: "rgba(255,254,249,0.35)", lineHeight: 1.8, maxWidth: 280, margin: 0 }}>
          Confirm your email and your writing panel will be ready.
        </p>
      </div>

      {/* Right content panel */}
      <div style={{
        flex: 1, minHeight: "100vh", background: "#faf9f6",
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "4rem 8% 4rem 7%",
      }} className="ve-right">
        <div style={{ maxWidth: 400 }}>
          {error ? (
            <>
              <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 2rem" }}>
                Verification
              </p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 400, color: "#1a1814", lineHeight: 1.2, margin: "0 0 1rem" }}>
                Invalid link.
              </h1>
              <p style={{ color: "#9a8e7e", fontFamily: "Inter, sans-serif", fontSize: "0.88rem", margin: "0 0 2.5rem", lineHeight: 1.7 }}>
                This verification link is invalid or has already been used.
              </p>
              <Link href="/register" style={{ color: "#1a1814", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", textDecoration: "underline", textUnderlineOffset: 3 }}>
                ← Back to registration
              </Link>
            </>
          ) : (
            <>
              <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 2rem" }}>
                Check your email
              </p>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 400, color: "#1a1814", lineHeight: 1.2, margin: "0 0 1rem" }}>
                Verify to continue.
              </h1>
              <p style={{ color: "#9a8e7e", fontFamily: "Inter, sans-serif", fontSize: "0.88rem", margin: "0 0 1rem", lineHeight: 1.7 }}>
                We sent a link to your email address. Click it to confirm your account and open your writing panel.
              </p>
              <p style={{ color: "rgba(154,142,126,0.5)", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", margin: 0 }}>
                Didn&apos;t receive it? Check your spam folder.
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .ve-left { display: none !important; }
          .ve-right { padding: 3.5rem 1.75rem !important; }
        }
      `}</style>
    </div>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><Content /></Suspense>;
}
