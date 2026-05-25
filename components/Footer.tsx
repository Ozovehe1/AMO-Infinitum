import Link from "next/link";
import SubscribeForm from "./SubscribeForm";
import type { Theme } from "@/lib/theme";

interface Props { username: string; theme: Theme }

export default function Footer({ username, theme }: Props) {
  const year = new Date().getFullYear();
  const base = `/${username}`;
  const accent = theme.colorAccent || "#c8a97e";
  const primary = theme.colorPrimary || "#0d1f3c";
  const subtle = "rgba(255,254,249,0.55)";

  return (
    <footer style={{ background: primary, borderTop: `1px solid ${accent}1f`, padding: "3rem 1.5rem 2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto 2.5rem", padding: "2rem", background: `${accent}0f`, border: `1px solid ${accent}26`, borderRadius: 6 }}>
        <SubscribeForm dark username={username} siteName={theme.siteName} />
      </div>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "2rem", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 600, color: accent, marginBottom: "0.5rem" }}>
            {theme.siteName || "Blog"}
          </div>
          <p style={{ color: subtle, fontSize: "0.85rem", maxWidth: 260, lineHeight: 1.6, fontFamily: "Inter, sans-serif", margin: "0 0 1rem" }}>
            {theme.footerTagline || theme.tagline || ""}
          </p>
          {theme.twitterHandle && (
            <a href={`https://x.com/${theme.twitterHandle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: subtle, textDecoration: "none", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", transition: "color 0.2s" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.741l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {theme.twitterHandle.startsWith("@") ? theme.twitterHandle : `@${theme.twitterHandle}`}
            </a>
          )}
        </div>
        <div style={{ display: "flex", gap: "3rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: accent, fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", marginBottom: "0.75rem" }}>Navigate</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {[[`Home`, base], [`About`, `${base}/about`]].map(([label, href]) => (
                <Link key={href} href={href} style={{ color: subtle, textDecoration: "none", fontSize: "0.85rem", fontFamily: "Inter, sans-serif", transition: "color 0.2s" }}>{label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: "2rem auto 0", borderTop: `1px solid ${accent}14`, paddingTop: "1.5rem", textAlign: "center" }}>
        <p style={{ color: subtle, fontSize: "0.75rem", fontFamily: "Inter, sans-serif", margin: 0 }}>
          {theme.footerCopy || `© ${year} ${theme.siteName || "Blog"}. All rights reserved.`}
        </p>
      </div>
    </footer>
  );
}
