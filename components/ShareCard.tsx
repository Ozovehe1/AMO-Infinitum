"use client";
import React from "react";

/**
 * A 1200×630 branded post card rendered entirely in CSS.
 * Mount it off-screen, capture with html-to-image, then blob → share/download.
 */
export default function ShareCard({
  title,
  excerpt,
  coverImage,
  cardRef,
}: {
  title: string;
  excerpt?: string;
  coverImage?: string;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={cardRef}
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0,
        width: 1200,
        height: 630,
        flexShrink: 0,
        overflow: "hidden",
        background: "#0d1f3c",
        fontFamily: "Georgia, 'Times New Roman', serif",
      }}
    >
      {/* Cover photo layer */}
      {coverImage && (
        <img
          src={coverImage}
          alt=""
          crossOrigin="anonymous"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.35,
          }}
        />
      )}

      {/* Gradient overlay — stronger at bottom so text is always readable */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(160deg, rgba(13,31,60,0.55) 0%, rgba(13,31,60,0.92) 60%, #0d1f3c 100%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 72px",
        }}
      >
        {/* Top — publication branding */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "#c8a97e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
              color: "#0d1f3c",
              fontFamily: "Georgia, serif",
            }}
          >
            A
          </div>
          <span
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 18,
              color: "#c8a97e",
              letterSpacing: "0.06em",
              fontWeight: 400,
            }}
          >
            AMO INFINITUM
          </span>
        </div>

        {/* Bottom — title + excerpt */}
        <div>
          <h1
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: title.length > 60 ? 42 : 54,
              fontWeight: 700,
              color: "#fffef9",
              lineHeight: 1.15,
              margin: "0 0 20px",
              maxWidth: 900,
            }}
          >
            {title}
          </h1>
          {excerpt && (
            <p
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 22,
                color: "rgba(255,254,249,0.72)",
                lineHeight: 1.5,
                margin: 0,
                maxWidth: 820,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {excerpt}
            </p>
          )}
          {/* Gold rule */}
          <div
            style={{
              marginTop: 28,
              width: 48,
              height: 3,
              background: "#c8a97e",
              borderRadius: 2,
            }}
          />
        </div>
      </div>
    </div>
  );
}
