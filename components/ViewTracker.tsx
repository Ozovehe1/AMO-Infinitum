"use client";
import { useEffect } from "react";

export default function ViewTracker({ postId }: { postId: number }) {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const key = `viewed_${postId}_${today}`;
    if (localStorage.getItem(key)) return;

    const timer = setTimeout(() => {
      localStorage.setItem(key, "1");
      fetch(`/api/posts/${postId}/view`, { method: "POST" });
    }, 5000);

    return () => clearTimeout(timer);
  }, [postId]);

  return null;
}
