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
  return html.replace(/<[^>]*>/g, "");
}

export function truncate(text: string, length: number): string {
  const plain = stripHtml(text);
  if (plain.length <= length) return plain;
  return plain.slice(0, length).trimEnd() + "…";
}
