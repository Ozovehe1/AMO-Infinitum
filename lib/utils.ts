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

function hexToRgb(hex: string): [number, number, number] | null {
  if (!hex || !hex.startsWith("#") || (hex.length !== 7 && hex.length !== 4)) return null;
  const h = hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex;
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

function toHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
}

export function wcagRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb.map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function wcagContrastRatio(hex1: string, hex2: string): number {
  const l1 = wcagRelativeLuminance(hex1);
  const l2 = wcagRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function enforceContrast(colors: {
  colorPrimary: string;
  colorAccent: string;
  colorBg: string;
}): { colorPrimary: string; colorAccent: string; colorBg: string } {
  let { colorPrimary, colorAccent, colorBg } = colors;

  function nudge(fg: string, bg: string, minRatio: number): string {
    if (!fg?.startsWith("#") || fg.length < 7) return fg;
    const bgDark = wcagRelativeLuminance(bg) < 0.18;
    let rgb = hexToRgb(fg);
    if (!rgb) return fg;
    for (let i = 0; i < 20; i++) {
      if (wcagContrastRatio(toHex(...rgb), bg) >= minRatio) break;
      if (bgDark) {
        rgb = rgb.map(c => Math.min(255, c + (255 - c) * 0.15)) as [number, number, number];
      } else {
        rgb = rgb.map(c => c * 0.85) as [number, number, number];
      }
    }
    return toHex(...rgb);
  }

  colorPrimary = nudge(colorPrimary, colorBg, 4.5);
  colorAccent  = nudge(colorAccent,  colorBg, 3.0);
  colorAccent  = nudge(colorAccent,  colorPrimary, 3.0);

  return { colorPrimary, colorAccent, colorBg };
}

export function firstSentence(text: string): string {
  const plain = stripHtml(text);
  const match = plain.match(/^.+?[.!?](?:\s|$)/);
  if (match) return match[0].trim();
  // No sentence-ending punctuation — return first paragraph, no character limit
  return plain.split(/\n\n/)[0].trim() || plain.trim();
}
