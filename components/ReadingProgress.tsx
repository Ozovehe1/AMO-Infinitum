"use client";
import { useEffect, useState } from "react";

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
    };
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 200, background: "color-mix(in srgb, var(--blog-primary, #0d1f3c) 10%, transparent)" }}>
      <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(to right, var(--blog-primary, #0d1f3c), var(--blog-accent, #c8a97e))", transition: "width 0.1s linear" }} />
    </div>
  );
}
