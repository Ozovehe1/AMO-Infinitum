"use client";
import { useState, useEffect } from "react";

interface ShareButtonsProps {
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
}

export default function ShareButtons({ title, slug, excerpt, coverImage }: ShareButtonsProps) {
  const [open,    setOpen]    = useState(false);
  const [copied,  setCopied]  = useState(false);
  const [sharing, setSharing] = useState(false);

  const siteUrl = typeof window !== "undefined"
    ? window.location.origin
    : "https://amo-infinitum.vercel.app";
  const url       = `${siteUrl}/blog/${slug}`;
  const shareText = excerpt || title;

  const absCover = coverImage
    ? (coverImage.startsWith("/") ? siteUrl + coverImage : coverImage)
    : "";
  const ogUrl = `${siteUrl}/api/og?title=${encodeURIComponent(title)}&excerpt=${encodeURIComponent(excerpt || "")}&cover=${encodeURIComponent(absCover)}`;

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); }
    catch { window.prompt("Copy this link:", url); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const fetchOgBlob = async (): Promise<File | null> => {
    try {
      const res = await fetch(ogUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new File([blob], `${slug}-preview.png`, { type: "image/png" });
    } catch { return null; }
  };

  const nativeShare = async () => {
    setSharing(true);
    try {
      const file = await fetchOgBlob();
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: shareText, url });
      } else if (navigator.share) {
        await navigator.share({ title: shareText, url });
      }
    } catch { /* cancelled */ }
    setSharing(false);
  };

  const twitterHref  = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText + "\n" + url)}`;
  const emailHref    = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent((excerpt ? excerpt + "\n\n" : "") + url)}`;

  return (
    <>
      {/* ── Trigger button ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem 1rem" }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
            background: "#0d1f3c", color: "#c8a97e",
            border: "none", borderRadius: 10,
            padding: "0.9rem 1rem",
            fontFamily: "Inter, sans-serif", fontSize: "0.9rem", fontWeight: 600,
            cursor: "pointer", letterSpacing: "0.02em",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share this post
        </button>
      </div>

      {/* ── Bottom sheet overlay ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 2000,
              background: "rgba(13,31,60,0.6)",
              backdropFilter: "blur(2px)",
            }}
          />

          {/* Sheet */}
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 2001,
            display: "flex", justifyContent: "center",
          }}>
            <div style={{
              background: "#fffef9",
              borderRadius: "20px 20px 0 0",
              overflow: "hidden",
              width: "100%", maxWidth: 480,
              maxHeight: "92vh",
              display: "flex", flexDirection: "column",
            }}>
              {/* Scrollable content */}
              <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

                {/* Drag handle */}
                <div style={{ padding: "0.875rem 1.5rem 0" }}>
                  <div style={{ width: 36, height: 4, background: "rgba(13,31,60,0.15)", borderRadius: 2, margin: "0 auto" }} />
                </div>

                {/* OG preview — edge-to-edge */}
                <a href={url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: "0.875rem" }}>
                  <div style={{ aspectRatio: "1200/630", background: "#0d1f3c", width: "100%" }}>
                    <img src={ogUrl} alt={title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                </a>

                {/* Controls */}
                <div style={{ padding: "0.875rem 1.5rem 2.5rem" }}>

                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                    <div>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#0d1f3c", margin: 0, fontWeight: 600 }}>Share this post</p>
                      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "#8fa3b1", margin: "0.15rem 0 0" }}>Preview image + link sent together</p>
                    </div>
                    <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#8fa3b1", fontSize: "1.3rem", cursor: "pointer", lineHeight: 1, padding: "0 0 0 1rem" }}>×</button>
                  </div>

                  {/* PRIMARY: Share image + link together */}
                  {typeof navigator !== "undefined" && !!navigator.share && (
                    <button
                      onClick={nativeShare}
                      disabled={sharing}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
                        background: "#0d1f3c", color: "#c8a97e",
                        border: "none", borderRadius: 10,
                        padding: "1rem", marginBottom: "0.625rem",
                        fontFamily: "Inter, sans-serif", fontSize: "0.95rem", fontWeight: 700,
                        cursor: sharing ? "default" : "pointer",
                        letterSpacing: "0.02em",
                        opacity: sharing ? 0.7 : 1,
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                      </svg>
                      {sharing ? "Preparing…" : "Share — image + link"}
                    </button>
                  )}

                  {/* Download branded preview */}
                  <button
                    onClick={() => window.open(ogUrl + "&download=1", "_blank")}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                      background: "#f5f0e8", color: "#0d1f3c",
                      border: "1px solid rgba(13,31,60,0.15)", borderRadius: 8,
                      padding: "0.75rem 1rem", marginBottom: "0.875rem",
                      fontFamily: "Inter, sans-serif", fontSize: "0.85rem", fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download branded preview
                  </button>

                  {/* Copy link */}
                  <div style={{
                    background: "#f5f0e8", border: "1px solid rgba(13,31,60,0.1)",
                    borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "0.875rem",
                    display: "flex", alignItems: "center", gap: "0.75rem",
                  }}>
                    <span style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#3a5068", wordBreak: "break-all", lineHeight: 1.5 }}>{url}</span>
                    <button
                      onClick={copy}
                      style={{
                        flexShrink: 0,
                        background: copied ? "#4a9e7a" : "#0d1f3c",
                        color: copied ? "#fff" : "#c8a97e",
                        border: "none", borderRadius: 6,
                        padding: "0.45rem 0.875rem",
                        fontFamily: "Inter, sans-serif", fontSize: "0.78rem", fontWeight: 600,
                        cursor: "pointer", transition: "background 0.2s, color 0.2s",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {copied ? "✓ Copied!" : "Copy Link"}
                    </button>
                  </div>

                  {/* Platform buttons */}
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8fa3b1", margin: "0 0 0.6rem" }}>Also share on</p>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <a href={twitterHref} target="_blank" rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "#000", color: "#fff", borderRadius: 6, padding: "0.5rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", fontWeight: 500, textDecoration: "none" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.727-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      X / Twitter
                    </a>
                    <a href={whatsappHref} target="_blank" rel="noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "#25D366", color: "#fff", borderRadius: 6, padding: "0.5rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", fontWeight: 500, textDecoration: "none" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      WhatsApp
                    </a>
                    <a href={emailHref}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "transparent", color: "#0d1f3c", border: "1px solid rgba(13,31,60,0.2)", borderRadius: 6, padding: "0.5rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", fontWeight: 500, textDecoration: "none" }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>
                      Email
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
