import slugifyLib from "slugify";

export function slugify(text: string) {
  return slugifyLib(text, { lower: true, strict: true });
}

export function estimateReadingTime(content: string): number {
  const wordsPerMinute = 238;
  const text = content.replace(/<[^>]*>/g, " ");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}

export function truncate(text: string, length: number): string {
  const plain = stripHtml(text);
  if (plain.length <= length) return plain;
  return plain.slice(0, length).trimEnd() + "…";
}

export function subtleColor(hex: string): string {
  if (!hex || hex.length < 7) return "rgba(255,255,255,0.6)";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return r * 0.299 + g * 0.587 + b * 0.114 < 128
    ? "rgba(255,254,249,0.6)"
    : "rgba(0,0,0,0.55)";
}

export function firstSentence(text: string): string {
  const plain = stripHtml(text);
  const match = plain.match(/^.+?[.!?](?:\s|$)/);
  if (match) return match[0].trim();
  // No sentence-ending punctuation — return first paragraph, no character limit
  return plain.split(/\n\n/)[0].trim() || plain.trim();
}
