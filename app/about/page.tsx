import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "About — AMO Infinitum",
};

export default function About() {
  return (
    <>
      <Header />
      <main style={{ paddingTop: 64, background: "#fffef9", flex: 1 }}>
        {/* Hero strip */}
        <div style={{ background: "#0d1f3c", padding: "5rem 1.5rem" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <p style={{ color: "#c8a97e", fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 1rem" }}>
              About
            </p>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 600, color: "#fffef9", lineHeight: 1.15, margin: "0 0 1.5rem" }}>
              AMO <span style={{ fontStyle: "italic", color: "#c8a97e" }}>Infinitum</span>
            </h1>
            <p style={{ color: "#8fa3b1", fontFamily: "'Source Serif 4', serif", fontSize: "1.1rem", lineHeight: 1.75, margin: 0, maxWidth: 580 }}>
              A space that holds everything — every question, every silence, every thought that refuses to be filed neatly away.
            </p>
          </div>
        </div>

        {/* Content */}
        <article className="prose-amo" style={{ padding: "4rem 1.5rem 6rem" }}>
          <p>
            <em>Amo</em> means love. <em>Infinitum</em> means without end. This blog is exactly that — a love that keeps going, for ideas, for language, for the texture of living.
          </p>
          <p>
            I write here because some thoughts are too alive to stay inside. They grow when shared, even quietly, even with strangers on the internet at 2am.
          </p>
          <p>
            You won&apos;t find a niche here. You&apos;ll find whatever I was thinking about hard enough that it demanded to be written down.
          </p>
          <blockquote>
            &ldquo;Not all those who wander are lost.&rdquo; — and not all who write have arrived anywhere in particular.
          </blockquote>
          <p>
            Welcome. Stay as long as you like.
          </p>
        </article>
      </main>
      <Footer />
    </>
  );
}
