"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

const STEPS = [
  {
    id: "niche",
    question: "What will your blog be about?",
    hint: "Choose a topic you could write about endlessly — your readers will feel your passion.",
    placeholder: "e.g. tech, fitness, creative writing, finance, travel…",
    type: "text",
  },
  {
    id: "audience",
    question: "Who are you writing for?",
    hint: "Picture one specific person sitting down to read your blog. Who are they?",
    placeholder: "e.g. other developers, beginners, general readers, young professionals…",
    type: "text",
  },
  {
    id: "tone",
    question: "What's the vibe of your writing?",
    hint: "Your voice is your brand. Pick the tone that feels most like you.",
    type: "choice",
    options: ["Professional & authoritative", "Friendly & approachable", "Inspirational & poetic", "Playful & creative"],
  },
  {
    id: "colorMood",
    question: "Pick a color feel for your blog",
    hint: "Colors tell a story before a word is read. Which story is yours?",
    type: "choice",
    options: ["Warm & earthy", "Cool & minimal", "Dark & modern", "Bold & vibrant"],
  },
  {
    id: "blogName",
    question: "What will you name your blog?",
    hint: "The best names are short, memorable, and feel like you. You can always change this later.",
    placeholder: "Your blog name",
    type: "text",
  },
  {
    id: "tagline",
    question: "Write a one-sentence tagline",
    hint: "Think of it as the subtitle of your life's work — distilled to a single line.",
    placeholder: "e.g. Thoughts on building things that matter.",
    type: "text",
  },
  {
    id: "bio",
    question: "Tell me a bit about yourself",
    hint: "Your readers want to know the person behind the words. Be honest and specific.",
    placeholder: "Your background, what you do, what drives you to write…",
    type: "textarea",
  },
  {
    id: "imageStyle",
    question: "What kind of imagery suits your blog?",
    hint: "Visuals set the mood. Choose what feels right, even if you plan to add your own later.",
    type: "choice",
    options: ["Professional photography", "Minimal & abstract", "Illustrated & artistic", "None — text-only blog"],
  },
];

type Answers = Record<string, string>;
interface Config {
  siteName: string; tagline: string; description: string; heroQuote: string;
  colorPrimary: string; colorAccent: string; colorBg: string; footerTagline: string; aboutText: string;
}
interface Photo { url: string; thumb: string; credit: { name: string; link: string } }

const MOOD_MAP: Record<string, string> = {
  "Warm & earthy": "warm+earthy", "Cool & minimal": "cool+minimal",
  "Dark & modern": "dark+modern", "Bold & vibrant": "bold+vibrant",
};

const OPTION_ICONS: Record<string, string> = {
  "Professional & authoritative": "◼",
  "Friendly & approachable": "◉",
  "Inspirational & poetic": "✦",
  "Playful & creative": "◈",
  "Warm & earthy": "◕",
  "Cool & minimal": "◌",
  "Dark & modern": "◆",
  "Bold & vibrant": "◉",
  "Professional photography": "⬡",
  "Minimal & abstract": "◻",
  "Illustrated & artistic": "✎",
  "None — text-only blog": "—",
};

const STEP_ICONS = ["✦", "◎", "◐", "◆", "✎", "—", "∿", "⬡"];

function Spinner({ label }: { label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 56, height: 56, margin: "0 auto 1.75rem" }}>
        <div style={{
          position: "absolute", inset: 0,
          border: "2px solid rgba(200,169,126,0.12)",
          borderTop: "2px solid rgba(200,169,126,0.4)",
          borderRadius: "50%",
          animation: "spin 1.4s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: 8,
          border: "2px solid rgba(200,169,126,0.08)",
          borderTop: "2px solid #c8a97e",
          borderRadius: "50%",
          animation: "spin 0.7s linear infinite reverse",
        }} />
      </div>
      <p style={{ color: "#c8a97e", fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", margin: "0 0 0.5rem" }}>{label}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function SetupPage() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [current, setCurrent] = useState("");
  const [animating, setAnimating] = useState(false);
  const [phase, setPhase] = useState<"questions" | "generating" | "images" | "review" | "saving">("questions");
  const [config, setConfig] = useState<Config | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [chosenPhoto, setChosenPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");

  const s = STEPS[step];

  const transition = useCallback((fn: () => void) => {
    setAnimating(true);
    setTimeout(() => {
      fn();
      setAnimating(false);
    }, 180);
  }, []);

  const goBack = () => {
    if (step === 0) return;
    transition(() => {
      const prev = STEPS[step - 1];
      setCurrent(answers[prev.id] || "");
      setStep(step - 1);
    });
  };

  const nextStep = async () => {
    if (!current.trim()) return;
    const newAnswers = { ...answers, [s.id]: s.type === "choice" ? MOOD_MAP[current] || current : current };
    setAnswers(newAnswers);

    if (step < STEPS.length - 1) {
      transition(() => {
        setCurrent(answers[STEPS[step + 1].id] || "");
        setStep(step + 1);
      });
    } else {
      setCurrent("");
      setPhase("generating");
      try {
        const res = await fetch("/api/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate", answers: newAnswers }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setConfig(data.config);

        const imgRes = await fetch("/api/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "images", query: data.config.imageQuery || newAnswers.niche }),
        });
        const imgData = await imgRes.json();
        setPhotos(imgData.photos || []);
        setPhase("images");
      } catch (e) {
        setError(String(e));
        setPhase("questions");
      }
    }
  };

  const save = async () => {
    setPhase("saving");
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "save", config, coverImage: chosenPhoto }),
    });
    if (res.ok) {
      router.push(`/${username}/inkwell`);
    } else {
      setError("Failed to save. Please try again.");
      setPhase("review");
    }
  };

  const wrap: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#080f1a",
    padding: "2rem",
    fontFamily: "Inter, sans-serif",
  };

  const card: React.CSSProperties = {
    width: "100%",
    maxWidth: 560,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(200,169,126,0.12)",
    borderRadius: 16,
    padding: "2.5rem 2.5rem 2rem",
    opacity: animating ? 0 : 1,
    transform: animating ? "translateY(10px)" : "none",
    transition: "opacity 0.18s ease, transform 0.18s ease",
  };

  if (phase === "generating") return (
    <div style={wrap}>
      <div style={{ textAlign: "center" }}>
        <Spinner label="Crafting your blog identity…" />
        <p style={{ color: "#3a5068", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", marginTop: "0.5rem" }}>
          This takes a moment. Good things do.
        </p>
      </div>
    </div>
  );

  if (phase === "images") return (
    <div style={wrap}>
      <div style={{ width: "100%", maxWidth: 780, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.12)", borderRadius: 16, padding: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
          <span style={{ color: "#c8a97e", fontSize: "1.1rem" }}>⬡</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#fffef9", fontSize: "1.4rem", margin: 0 }}>Choose a cover image</h2>
        </div>
        <p style={{ color: "#3a5068", fontFamily: "Inter, sans-serif", fontSize: "0.83rem", margin: "0 0 1.75rem" }}>
          This will appear on your blog&apos;s hero. You can change it anytime from settings.
        </p>

        {photos.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "0.75rem", marginBottom: "1.75rem" }}>
            {photos.map(p => (
              <button key={p.url} onClick={() => setChosenPhoto(chosenPhoto === p.url ? null : p.url)}
                style={{ position: "relative", padding: 0, border: `2px solid ${chosenPhoto === p.url ? "#c8a97e" : "transparent"}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "none", display: "block", transition: "border-color 0.15s" }}>
                <img src={p.thumb} alt="" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} />
                <div style={{ background: "rgba(0,0,0,0.45)", padding: "0.25rem 0.5rem", textAlign: "left" }}>
                  <span style={{ color: "#5a7080", fontSize: "0.62rem" }}>by {p.credit.name}</span>
                </div>
                {chosenPhoto === p.url && (
                  <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: "#c8a97e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#0d1f3c", fontSize: "0.75rem", fontWeight: 700 }}>✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center", color: "#3a5068", fontSize: "0.85rem", marginBottom: "1.5rem", border: "1px dashed rgba(200,169,126,0.15)", borderRadius: 8 }}>
            No images found — you can add one from Settings after launch.
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button onClick={() => setPhase("review")}
            style={{ background: "#c8a97e", color: "#0d1f3c", border: "none", borderRadius: 8, padding: "0.75rem 1.75rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", letterSpacing: "-0.01em" }}>
            {chosenPhoto ? "Continue →" : "Skip for now →"}
          </button>
          <span style={{ color: "#3a5068", fontSize: "0.78rem" }}>
            {chosenPhoto ? "1 image selected" : "No image selected"}
          </span>
        </div>
      </div>
    </div>
  );

  if (phase === "review" && config) return (
    <div style={wrap}>
      <div style={{ width: "100%", maxWidth: 600, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.12)", borderRadius: 16, padding: "2.5rem" }}>
        <p style={{ color: "#c8a97e", fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 0.4rem" }}>Almost there</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#fffef9", fontSize: "1.5rem", margin: "0 0 0.5rem" }}>Here&apos;s your blog</h2>
        <p style={{ color: "#3a5068", fontSize: "0.83rem", margin: "0 0 2rem" }}>Everything is editable from your Settings page after launch.</p>

        {chosenPhoto && (
          <div style={{ marginBottom: "1.25rem", borderRadius: 8, overflow: "hidden", height: 120 }}>
            <img src={chosenPhoto} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.75rem" }}>
          {([
            ["Name", config.siteName],
            ["Tagline", config.tagline],
            ["Hero quote", config.heroQuote],
            ["Footer line", config.footerTagline],
          ] as [string, string][]).filter(([, v]) => v).map(([label, val]) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "0.7rem 1rem", border: "1px solid rgba(200,169,126,0.07)" }}>
              <div style={{ color: "#3a5068", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>{label}</div>
              <div style={{ color: "#fffef9", fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", lineHeight: 1.4 }}>{val}</div>
            </div>
          ))}

          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "0.7rem 1rem", border: "1px solid rgba(200,169,126,0.07)", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["colorPrimary", "colorAccent", "colorBg"] as (keyof Config)[]).map(k => (
                <div key={k} title={config[k] as string} style={{ width: 22, height: 22, borderRadius: "50%", background: config[k] as string, border: "2px solid rgba(255,255,255,0.12)", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }} />
              ))}
            </div>
            <span style={{ color: "#3a5068", fontSize: "0.75rem" }}>Color palette</span>
          </div>
        </div>

        {error && <p style={{ color: "#e07070", fontSize: "0.82rem", marginBottom: "1rem" }}>{error}</p>}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={save}
            style={{ background: "#c8a97e", color: "#0d1f3c", border: "none", borderRadius: 8, padding: "0.75rem 1.75rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", letterSpacing: "-0.01em" }}>
            Launch my blog →
          </button>
          <button onClick={() => setPhase("images")}
            style={{ background: "transparent", color: "#3a5068", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.85rem", cursor: "pointer" }}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === "saving") return (
    <div style={wrap}>
      <Spinner label="Launching your blog…" />
    </div>
  );

  // Questions phase
  const progress = step / STEPS.length;
  return (
    <div style={wrap}>
      <div style={card}>
        {/* Segmented progress bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: "2rem" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i < step ? "#c8a97e" : i === step ? "rgba(200,169,126,0.5)" : "rgba(200,169,126,0.1)",
              transition: "background 0.3s ease",
            }} />
          ))}
        </div>

        {/* Step label */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1rem" }}>
          <span style={{ color: "#c8a97e", fontSize: "1rem", lineHeight: 1 }}>{STEP_ICONS[step]}</span>
          <span style={{ color: "#3a5068", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        {/* Question */}
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#fffef9", fontSize: "1.45rem", margin: "0 0 0.6rem", lineHeight: 1.25 }}>
          {s.question}
        </h2>
        <p style={{ color: "#3a5068", fontSize: "0.82rem", margin: "0 0 1.5rem", lineHeight: 1.55 }}>
          {s.hint}
        </p>

        {error && <p style={{ color: "#e07070", fontSize: "0.82rem", marginBottom: "1rem" }}>{error}</p>}

        {/* Input */}
        {s.type === "choice" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "1.5rem" }}>
            {s.options!.map(opt => {
              const selected = current === opt;
              return (
                <button key={opt} onClick={() => setCurrent(opt)} style={{
                  background: selected ? "rgba(200,169,126,0.1)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${selected ? "#c8a97e" : "rgba(200,169,126,0.1)"}`,
                  borderRadius: 10, padding: "0.85rem 1.1rem",
                  color: selected ? "#fffef9" : "#3a5068",
                  fontSize: "0.9rem", cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s ease",
                  display: "flex", alignItems: "center", gap: "0.9rem",
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${selected ? "#c8a97e" : "rgba(200,169,126,0.25)"}`,
                    background: selected ? "#c8a97e" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}>
                    {selected && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0d1f3c", display: "block" }} />}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: selected ? "#c8a97e" : "#3a5068", fontSize: "0.8rem" }}>{OPTION_ICONS[opt] || "·"}</span>
                    {opt}
                  </span>
                </button>
              );
            })}
          </div>
        ) : s.type === "textarea" ? (
          <textarea
            value={current}
            onChange={e => setCurrent(e.target.value)}
            placeholder={s.placeholder}
            rows={4}
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(200,169,126,0.18)",
              borderRadius: 10, padding: "0.875rem 1rem",
              color: "#fffef9", fontSize: "0.95rem", outline: "none",
              resize: "vertical", marginBottom: "1.5rem",
              fontFamily: "Inter, sans-serif", lineHeight: 1.6,
            }}
          />
        ) : (
          <input
            value={current}
            onChange={e => setCurrent(e.target.value)}
            onKeyDown={e => e.key === "Enter" && current.trim() && nextStep()}
            placeholder={s.placeholder}
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(200,169,126,0.18)",
              borderRadius: 10, padding: "0.875rem 1rem",
              color: "#fffef9", fontSize: "0.95rem", outline: "none",
              marginBottom: "1.5rem", fontFamily: "Inter, sans-serif",
            }}
          />
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {step > 0 && (
            <button onClick={goBack} style={{
              background: "transparent", color: "#3a5068",
              border: "1px solid rgba(200,169,126,0.12)",
              borderRadius: 8, padding: "0.7rem 1rem",
              fontSize: "0.85rem", cursor: "pointer",
            }}>
              ←
            </button>
          )}
          <button onClick={nextStep} disabled={!current.trim()} style={{
            background: "#c8a97e", color: "#0d1f3c", border: "none",
            borderRadius: 8, padding: "0.75rem 1.75rem",
            fontSize: "0.9rem", fontWeight: 700, letterSpacing: "-0.01em",
            cursor: current.trim() ? "pointer" : "default",
            opacity: current.trim() ? 1 : 0.4,
            transition: "opacity 0.2s ease",
          }}>
            {step === STEPS.length - 1 ? "Generate my blog →" : "Next →"}
          </button>
          {s.type === "text" && (
            <span style={{ color: "#3a5068", fontSize: "0.72rem" }}>Press Enter ↵</span>
          )}
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "2rem" }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              height: 4, borderRadius: 2,
              width: i === step ? 20 : 6,
              background: i === step ? "#c8a97e" : i < step ? "rgba(200,169,126,0.4)" : "rgba(200,169,126,0.12)",
              transition: "all 0.25s ease",
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
