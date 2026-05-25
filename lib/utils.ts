import slugifyLib from "slugify";

export function subtleColor(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.45 ? "rgba(255,254,249,0.6)" : "rgba(13,31,60,0.5)";
}

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

export function firstSentence(text: string): string {
  const plain = stripHtml(text);
  const match = plain.match(/^.+?[.!?](?:\s|$)/);
  if (match) return match[0].trim();
  // No sentence-ending punctuation — return first paragraph, no character limit
  return plain.split(/\n\n/)[0].trim() || plain.trim();
}
