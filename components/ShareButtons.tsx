"use client";
import { useState, useEffect } from "react";
import { makePostcardBlob } from "@/lib/postcard";

interface ShareButtonsProps {
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  siteName?: string;
  colorAccent?: string;
  colorPrimary?: string;
}

export default function ShareButtons({ title, slug, excerpt, coverImage, siteName = "Blog", colorAccent = "#c8a97e", colorPrimary = "#0d1f3c" }: ShareButtonsProps) {
  const badgeLetter = siteName.charAt(0).toUpperCase() || "B";
  const [open,        setOpen]        = useState(false);
  const [copied,      setCopied]      = useState(false);
  const [sharing,     setSharing]     = useState(false);
  const [downloading, setDownloading] = useState(false);

  const siteUrl   = typeof window !== "undefined" ? window.location.origin : "https://amo-infinitum.vercel.app";
  const url       = `${siteUrl}/blog/${slug}`;
  const shareText = excerpt || title;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); }
    catch { window.prompt("Copy this link:", url); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareWithCover = async () => {
    setSharing(true);
    try {
      const blob = await makePostcardBlob({ title, excerpt, coverImage, siteName, colorAccent, colorPrimary });
      const shareData: ShareData = { title: shareText, url };
      const file = new File([blob], `${slug}-postcard.jpg`, { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ ...shareData, files: [file] });
      } else if (navigator.share) {
        await navigator.share(shareData);
      }
    } catch { /* cancelled */ }
    finally { setSharing(false); }
  };

  const shareLinkOnly = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch { /* cancelled */ }
  };

  const download = async () => {
    setDownloading(true);
    try {
      const blob = await makePostcardBlob({ title, excerpt, coverImage, siteName, colorAccent, colorPrimary });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slug}-postcard.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch { /* silent */ }
    setDownloading(false);
  };

  return (
    <>
      {/* Trigger */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.5rem 1rem" }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
            background: "#0d1f3c", color: "#c8a97e", border: "none", borderRadius: 10,
            padding: "0.9rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem",
            fontWeight: 600, cursor: "pointer", letterSpacing: "0.02em",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share this post
        </button>
      </div>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(13,31,60,0.6)", backdropFilter: "blur(2px)",
          }} />

          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 2001, display: "flex", justifyContent: "center" }}>
            <div style={{
              background: "#fffef9", borderRadius: "20px 20px 0 0", overflow: "hidden",
              width: "100%", maxWidth: 480, maxHeight: "92vh", display: "flex", flexDirection: "column",
            }}>
              <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

                {/* Handle */}
                <div style={{ padding: "0.875rem 1.5rem 0" }}>
                  <div style={{ width: 36, height: 4, background: "rgba(13,31,60,0.15)", borderRadius: 2, margin: "0 auto" }} />
                </div>

                {/* Inline CSS preview card */}
                <a href={url} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: "0.875rem", textDecoration: "none" }}>
                  {coverImage ? (
                    /* ── With cover image — overlay layout ── */
                    <div style={{ position: "relative", background: colorPrimary, width: "100%", overflow: "hidden" }}>
                      <img src={coverImage} alt="" style={{ display: "block", width: "100%", height: "auto" }} />
                      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.50) 65%, transparent 85%)" }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "clamp(14px,4%,32px) clamp(16px,5%,44px)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 42, height: 42, borderRadius: "50%", background: colorAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: colorPrimary, flexShrink: 0 }}>{badgeLetter}</div>
                          <span style={{ fontFamily: "Georgia, serif", fontSize: "clamp(16px,4vw,24px)", fontWeight: 700, color: colorAccent, letterSpacing: "0.06em" }}>{siteName.toUpperCase()}</span>
                        </div>
                        <div>
                          <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(22px,5.5vw,34px)", fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: "0 0 12px" }}>{title}</h2>
                          {excerpt && <p style={{ fontFamily: "Georgia, serif", fontSize: "clamp(17px,4.5vw,26px)", color: "rgba(255,255,255,0.88)", lineHeight: 1.5, margin: "0 0 12px", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{excerpt}</p>}
                          <div style={{ width: 28, height: 2, background: colorAccent, borderRadius: 1 }} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ── No cover — min 1200/630 ratio, grows with excerpt, no clipping ── */
                    <div style={{ position: "relative", background: colorPrimary, width: "100%", aspectRatio: "1200/630", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "clamp(14px,4%,32px) clamp(16px,5%,44px)" }}>
                      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 80% 20%, ${colorAccent}66 0%, transparent 55%), radial-gradient(ellipse at 15% 85%, ${colorAccent}40 0%, transparent 50%)` }} />
                      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 42, height: 42, borderRadius: "50%", background: colorAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: colorPrimary, flexShrink: 0 }}>{badgeLetter}</div>
                        <span style={{ fontFamily: "Georgia, serif", fontSize: "clamp(16px,4vw,24px)", fontWeight: 700, color: colorAccent, letterSpacing: "0.06em" }}>{siteName.toUpperCase()}</span>
                      </div>
                      <div style={{ position: "relative" }}>
                        <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(22px,5.5vw,34px)", fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: "0 0 12px" }}>{title}</h2>
                        {excerpt && <p style={{ fontFamily: "Georgia, serif", fontSize: "clamp(17px,4.5vw,26px)", color: `${colorAccent}d0`, lineHeight: 1.5, margin: "0 0 12px" }}>{excerpt}</p>}
                        <div style={{ width: 28, height: 2, background: colorAccent, borderRadius: 1 }} />
                      </div>
                    </div>
                  )}
                </a>

                <div style={{ padding: "0.875rem 1.5rem 2.5rem" }}>

                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "#0d1f3c", margin: 0, fontWeight: 600 }}>Share this post</p>
                    <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#8fa3b1", fontSize: "1.3rem", cursor: "pointer", lineHeight: 1, padding: "0 0 0 1rem" }}>×</button>
                  </div>

                  {/* Share with cover */}
                  <button onClick={shareWithCover} disabled={sharing} style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
                    background: "#0d1f3c", color: "#c8a97e", border: "none", borderRadius: 10,
                    padding: "1rem", marginBottom: "0.625rem",
                    fontFamily: "Inter, sans-serif", fontSize: "0.95rem", fontWeight: 700,
                    cursor: sharing ? "default" : "pointer", letterSpacing: "0.02em", opacity: sharing ? 0.7 : 1,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
                    </svg>
                    {sharing ? "Preparing…" : "Share with card"}
                  </button>

                  {/* Share link only */}
                  <button onClick={shareLinkOnly} style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem",
                    background: "#f5f0e8", color: "#0d1f3c", border: "1px solid rgba(13,31,60,0.15)", borderRadius: 10,
                    padding: "1rem", marginBottom: "0.875rem",
                    fontFamily: "Inter, sans-serif", fontSize: "0.95rem", fontWeight: 600,
                    cursor: "pointer", letterSpacing: "0.02em",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
                      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
                    </svg>
                    Share link only
                  </button>

                  {/* Download */}
                  <button onClick={download} disabled={downloading} style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    background: "#f5f0e8", color: "#0d1f3c",
                    border: "1px solid rgba(13,31,60,0.15)", borderRadius: 8,
                    padding: "0.75rem 1rem", marginBottom: "0.875rem",
                    fontFamily: "Inter, sans-serif", fontSize: "0.85rem", fontWeight: 600,
                    cursor: downloading ? "default" : "pointer", opacity: downloading ? 0.7 : 1,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    {downloading ? "Saving…" : "Download image"}
                  </button>

                  {/* Copy link */}
                  <div style={{
                    background: "#f5f0e8", border: "1px solid rgba(13,31,60,0.1)",
                    borderRadius: 8, padding: "0.75rem 1rem",
                    display: "flex", alignItems: "center", gap: "0.75rem",
                  }}>
                    <span style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "#3a5068", wordBreak: "break-all", lineHeight: 1.5 }}>{url}</span>
                    <button onClick={copy} style={{
                      flexShrink: 0, background: copied ? "#4a9e7a" : "#0d1f3c",
                      color: copied ? "#fff" : "#c8a97e", border: "none", borderRadius: 6,
                      padding: "0.45rem 0.875rem", fontFamily: "Inter, sans-serif",
                      fontSize: "0.78rem", fontWeight: 600, cursor: "pointer",
                      transition: "background 0.2s, color 0.2s", whiteSpace: "nowrap",
                    }}>
                      {copied ? "✓ Copied!" : "Copy link"}
                    </button>
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
