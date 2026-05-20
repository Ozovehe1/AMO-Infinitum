import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { prisma } from "@/lib/db";

export const revalidate = 60;

export const metadata = {
  title: "About — AMO Infinitum",
};

const DEFAULTS = {
  about_hero_subtitle: "A space that holds everything — every question, every silence, every thought that refuses to be filed neatly away.",
  about_body: `<p><em>Amo</em> means love. <em>Infinitum</em> means without end. This blog is exactly that — a love that keeps going, for ideas, for language, for the texture of living.</p><p>I write here because some thoughts are too alive to stay inside. They grow when shared, even quietly, even with strangers on the internet at 2am.</p><p>You won't find a niche here. You'll find whatever I was thinking about hard enough that it demanded to be written down.</p><blockquote>"Not all those who wander are lost." — and not all who write have arrived anywhere in particular.</blockquote><p>Welcome. Stay as long as you like.</p>`,
};

async function getSettings() {
  try {
    const rows = await prisma.siteSettings.findMany({
      where: { key: { in: ["about_hero_subtitle", "about_body"] } },
    });
    const map: Record<string, string> = { ...DEFAULTS };
    for (const row of rows) map[row.key] = row.value;
    return map;
  } catch {
    return DEFAULTS;
  }
}

export default async function About() {
  const settings = await getSettings();

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
              {settings.about_hero_subtitle}
            </p>
          </div>
        </div>

        {/* Body content */}
        <article
          className="prose-amo"
          style={{ padding: "4rem 1.5rem 6rem" }}
          dangerouslySetInnerHTML={{ __html: settings.about_body }}
        />
      </main>
      <Footer />
    </>
  );
}
