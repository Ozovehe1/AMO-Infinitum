"use client";
import { useEffect, useRef, useState } from "react";

interface Slide {
  coverImage: string;
  siteName: string;
  tagline: string;
  username: string;
}

export default function HeroSlideshow({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = () => {
    if (slides.length < 2) return;
    setCurrent(c => {
      setPrev(c);
      setAnimating(true);
      return (c + 1) % slides.length;
    });
  };

  useEffect(() => {
    if (animating) {
      const t = setTimeout(() => { setAnimating(false); setPrev(null); }, 900);
      return () => clearTimeout(t);
    }
  }, [animating]);

  useEffect(() => {
    if (slides.length < 2) return;
    timerRef.current = setInterval(advance, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .hs-slide { transition: none !important; }
        }
      `}</style>

      <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>

        {/* Previous slide — exits left */}
        {prev !== null && animating && (
          <a
            href={`/${slides[prev].username}`}
            style={{
              position: "absolute", inset: 0, display: "block", textDecoration: "none",
              transform: "translateX(-100%)",
              transition: "transform 0.85s cubic-bezier(0.77,0,0.18,1)",
            }}
            className="hs-slide"
          >
            <SlideContent slide={slides[prev]} />
          </a>
        )}

        {/* Current slide — enters from right */}
        <a
          href={`/${slides[current].username}`}
          style={{
            position: "absolute", inset: 0, display: "block", textDecoration: "none",
            transform: animating ? "translateX(0)" : "translateX(0)",
            transition: animating ? "transform 0.85s cubic-bezier(0.77,0,0.18,1)" : "none",
            ...(animating ? { transform: "translateX(0)" } : {}),
          }}
          className="hs-slide"
        >
          {animating && (
            <div
              style={{
                position: "absolute", inset: 0,
                transform: "translateX(100%)",
                animation: "hs-enter 0.85s cubic-bezier(0.77,0,0.18,1) forwards",
              }}
            >
              <SlideContent slide={slides[current]} />
            </div>
          )}
          {!animating && <SlideContent slide={slides[current]} />}
        </a>

        {/* Dark gradient — protects hero text at bottom */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
          background: "linear-gradient(to bottom, rgba(13,31,60,0.55) 0%, rgba(13,31,60,0.35) 30%, rgba(13,31,60,0.45) 55%, rgba(13,31,60,0.96) 75%, rgba(13,31,60,0.99) 100%)",
        }} />

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div style={{
            position: "absolute", bottom: "1.75rem", left: "50%", transform: "translateX(-50%)",
            zIndex: 3, display: "flex", gap: "6px", alignItems: "center",
          }}>
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={e => { e.preventDefault(); setPrev(current); setCurrent(i); setAnimating(true); }}
                style={{
                  width: i === current ? 18 : 5, height: 5, borderRadius: 3,
                  background: i === current ? "#c8a97e" : "rgba(255,255,255,0.22)",
                  border: "none", padding: 0, cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
        )}

        <style>{`
          @keyframes hs-enter {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
        `}</style>
      </div>
    </>
  );
}

function SlideContent({ slide }: { slide: Slide }) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* Cover photo */}
      <img
        src={slide.coverImage}
        alt={slide.siteName}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
      {/* Blog identity overlay — upper area */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start",
        paddingTop: "22vh", textAlign: "center",
        zIndex: 1,
      }}>
        <p style={{
          fontFamily: "Inter, sans-serif", fontSize: "0.72rem",
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "#fffef9", margin: 0,
          textShadow: "0 1px 8px rgba(0,0,0,0.6)",
        }}>
          {slide.siteName}
        </p>
        <div style={{ width: 28, height: 1, background: "#c8a97e", margin: "0.75rem auto" }} />
        {slide.tagline && (
          <p style={{
            fontFamily: "'Source Serif 4', Georgia, serif",
            fontSize: "0.88rem", fontStyle: "italic",
            color: "rgba(255,254,249,0.88)", margin: 0, maxWidth: 320, lineHeight: 1.6,
            textShadow: "0 1px 8px rgba(0,0,0,0.6)",
          }}>
            {slide.tagline}
          </p>
        )}
      </div>
    </div>
  );
}
