import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: "#0d1f3c", borderTop: "1px solid rgba(200,169,126,0.12)", padding: "3rem 1.5rem 2rem" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", gap: "2rem", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 600, color: "#c8a97e", marginBottom: "0.5rem" }}>
            AMO <span style={{ fontStyle: "italic", color: "#fffef9" }}>Infinitum</span>
          </div>
          <p style={{ color: "#8fa3b1", fontSize: "0.85rem", maxWidth: 260, lineHeight: 1.6, fontFamily: "Inter, sans-serif", margin: 0 }}>
            A space for thoughts without end — on life, meaning, and the art of paying attention.
          </p>
        </div>
        <div style={{ display: "flex", gap: "3rem", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#c8a97e", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "Inter, sans-serif", marginBottom: "0.75rem" }}>Navigate</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {[["Home", "/"], ["About", "/about"]].map(([label, href]) => (
                <Link key={href} href={href} style={{ color: "#8fa3b1", textDecoration: "none", fontSize: "0.85rem", fontFamily: "Inter, sans-serif", transition: "color 0.2s" }}>{label}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: "2rem auto 0", borderTop: "1px solid rgba(200,169,126,0.08)", paddingTop: "1.5rem", textAlign: "center" }}>
        <p style={{ color: "#8fa3b1", fontSize: "0.75rem", fontFamily: "Inter, sans-serif", margin: 0 }}>
          © {year} AMO Infinitum. All words, all mine.
        </p>
      </div>
    </footer>
  );
}
