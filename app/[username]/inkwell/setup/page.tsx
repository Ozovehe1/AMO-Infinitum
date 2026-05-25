"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
    hint: "Your voice is your brand. Pick the tone that feels most like you — or describe your own.",
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
    hint: "The best names are short, memorable, and feel like you.",
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
    hint: "Visuals set the mood. The AI will use this to find a cover image that truly fits.",
    type: "choice",
    options: ["Professional photography", "Minimal & abstract", "Illustrated & artistic", "None — text-only blog"],
  },
];

const MOOD_MAP: Record<string, string> = {
  "Warm & earthy": "warm+earthy", "Cool & minimal": "cool+minimal",
  "Dark & modern": "dark+modern", "Bold & vibrant": "bold+vibrant",
};

const STEP_ICONS = ["✦", "◎", "◐", "◆", "✎", "—", "∿", "⬡"];

type Answers = Record<string, string>;
interface Config {
  siteName: string; tagline: string; description: string; heroQuote: string;
  colorPrimary: string; colorAccent: string; colorBg: string; footerTagline: string; aboutText: string;
}
interface Photo { url: string; thumb: string; credit: { name: string; link: string } }

function Spinner({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 56, height: 56, margin: "0 auto 1.75rem" }}>
        <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(200,169,126,0.12)", borderTop: "2px solid rgba(200,169,126,0.4)", borderRadius: "50%", animation: "spin 1.4s linear infinite" }} />
        <div style={{ position: "absolute", inset: 8, border: "2px solid rgba(200,169,126,0.08)", borderTop: "2px solid #c8a97e", borderRadius: "50%", animation: "spin 0.7s linear infinite reverse" }} />
      </div>
      <p style={{ color: "#c8a97e", fontFamily: "'Playfair Display', serif", fontSize: "1.3rem", margin: "0 0 0.5rem" }}>{label}</p>
      {sub && <p style={{ color: "#3a5068", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", margin: 0 }}>{sub}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SetupInner() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const sp = useSearchParams();
  const justVerified = sp.get("verified") === "1";

  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [current, setCurrent] = useState("");
  const [customMode, setCustomMode] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [phase, setPhase] = useState<"check" | "verify-gate" | "questions" | "generating" | "images" | "review" | "saving">("check");
  const [config, setConfig] = useState<Config | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [chosenPhoto, setChosenPhoto] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Check email verification status
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => {
        if (data.emailVerified) {
          setEmailVerified(true);
          setPhase("questions");
        } else {
          setEmailVerified(false);
          setPhase("verify-gate");
        }
      })
      .catch(() => setPhase("questions")); // fail open if API unavailable
  }, []);

  const s = STEPS[step];

  const transition = useCallback((fn: () => void) => {
    setAnimating(true);
    setTimeout(() => { fn(); setAnimating(false); }, 180);
  }, []);

  const goBack = () => {
    if (step === 0) return;
    transition(() => {
      const prev = STEPS[step - 1];
      const saved = answers[prev.id] || "";
      setCustomMode(false);
      setCurrent(saved);
      setStep(step - 1);
    });
  };

  const nextStep = async () => {
    if (!current.trim()) return;
    const rawValue = s.type === "choice" && !customMode ? (MOOD_MAP[current] || current) : current;
    const newAnswers = { ...answers, [s.id]: rawValue };
    setAnswers(newAnswers);

    if (step < STEPS.length - 1) {
      transition(() => {
        const nextId = STEPS[step + 1].id;
        setCurrent(answers[nextId] || "");
        setCustomMode(false);
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
          body: JSON.stringify({ action: "images", query: data.config.imageQuery }),
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
    padding: "2rem 1.5rem",
    fontFamily: "Inter, sans-serif",
  };

  // Loading check
  if (phase === "check") return (
    <div style={wrap}><Spinner label="Loading…" /></div>
  );

  // Email not verified gate
  if (phase === "verify-gate") return (
    <div style={wrap}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ fontSize: "3rem", marginBottom: "1.5rem" }}>✉</div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", color: "#fffef9", margin: "0 0 1rem" }}>
          Verify your email first
        </h1>
        <p style={{ color: "#8fa3b1", fontSize: "0.9rem", lineHeight: 1.7, margin: "0 0 2rem" }}>
          We sent a verification link to your email address. Click it to confirm your account, then come back here to set up your blog.
        </p>
        <div style={{ background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 10, padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <p style={{ margin: 0, color: "#c8a97e", fontSize: "0.82rem" }}>
            After clicking the link in your email, you&apos;ll be automatically redirected here to continue.
          </p>
        </div>
        <p style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.75rem" }}>
          Didn&apos;t receive it? Check your spam folder.
        </p>
      </div>
    </div>
  );

  if (phase === "generating") return (
    <div style={wrap}><Spinner label="Crafting your blog identity…" sub="This takes a moment. Good things do." /></div>
  );

  if (phase === "saving") return (
    <div style={wrap}><Spinner label="Launching your blog…" /></div>
  );

  if (phase === "images") return (
    <div style={wrap}>
      <div style={{ width: "100%", maxWidth: 900, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.12)", borderRadius: 16, padding: "2.5rem 2rem" }}>
        <div style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "#c8a97e", fontSize: "1.1rem" }}>⬡</span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#fffef9", fontSize: "1.5rem", margin: 0 }}>Choose a cover image</h2>
        </div>
        <p style={{ color: "#3a5068", fontSize: "0.84rem", margin: "0 0 2rem", lineHeight: 1.6 }}>
          These photos were selected to match your blog&apos;s niche, mood, and visual style. Pick the one that feels like your blog&apos;s soul — or skip and add one later.
        </p>

        {photos.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "0.875rem", marginBottom: "2rem" }}>
            {photos.map(p => (
              <button key={p.url} onClick={() => setChosenPhoto(chosenPhoto === p.url ? null : p.url)}
                style={{ position: "relative", padding: 0, border: `2px solid ${chosenPhoto === p.url ? "#c8a97e" : "transparent"}`, borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "none", display: "block", transition: "border-color 0.15s" }}>
                <img src={p.thumb} alt="" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
                <div style={{ background: "rgba(0,0,0,0.5)", padding: "0.3rem 0.6rem", textAlign: "left" }}>
                  <span style={{ color: "#5a7080", fontSize: "0.62rem" }}>by {p.credit.name}</span>
                </div>
                {chosenPhoto === p.url && (
                  <div style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%", background: "#c8a97e", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#0d1f3c", fontSize: "0.8rem", fontWeight: 700 }}>✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ padding: "2.5rem", textAlign: "center", color: "#3a5068", fontSize: "0.85rem", marginBottom: "1.5rem", border: "1px dashed rgba(200,169,126,0.15)", borderRadius: 8 }}>
            No images found — you can add one from Settings after launch.
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button onClick={() => setPhase("review")} style={{ background: "#c8a97e", color: "#0d1f3c", border: "none", borderRadius: 8, padding: "0.8rem 1.75rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}>
            {chosenPhoto ? "Continue →" : "Skip for now →"}
          </button>
          {chosenPhoto && <span style={{ color: "#3a5068", fontSize: "0.78rem" }}>1 image selected</span>}
        </div>
      </div>
    </div>
  );

  if (phase === "review" && config) return (
    <div style={wrap}>
      <div style={{ width: "100%", maxWidth: 700, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.12)", borderRadius: 16, padding: "2.5rem 2rem" }}>
        <p style={{ color: "#c8a97e", fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 0.4rem" }}>Almost there</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#fffef9", fontSize: "1.6rem", margin: "0 0 0.5rem" }}>Here&apos;s your blog</h2>
        <p style={{ color: "#3a5068", fontSize: "0.84rem", margin: "0 0 2rem", lineHeight: 1.6 }}>Everything is editable from your Settings page after launch.</p>

        {chosenPhoto && (
          <div style={{ marginBottom: "1.25rem", borderRadius: 8, overflow: "hidden", height: 130 }}>
            <img src={chosenPhoto} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "2rem" }}>
          {([["Name", config.siteName], ["Tagline", config.tagline], ["Hero quote", config.heroQuote], ["Footer line", config.footerTagline]] as [string, string][]).filter(([, v]) => v).map(([label, val]) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "0.8rem 1rem", border: "1px solid rgba(200,169,126,0.07)" }}>
              <div style={{ color: "#3a5068", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>{label}</div>
              <div style={{ color: "#fffef9", fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", lineHeight: 1.4 }}>{val}</div>
            </div>
          ))}
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "0.8rem 1rem", border: "1px solid rgba(200,169,126,0.07)", display: "flex", alignItems: "center", gap: "1rem" }}>
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
          <button onClick={save} style={{ background: "#c8a97e", color: "#0d1f3c", border: "none", borderRadius: 8, padding: "0.8rem 1.75rem", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}>
            Launch my blog →
          </button>
          <button onClick={() => setPhase("images")} style={{ background: "transparent", color: "#3a5068", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 8, padding: "0.8rem 1rem", fontSize: "0.85rem", cursor: "pointer" }}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  );

  // Questions phase
  const isChoice = s.type === "choice" && !customMode;
  return (
    <div style={wrap}>
      <div style={{
        width: "100%",
        maxWidth: 860,
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(200,169,126,0.12)",
        borderRadius: 16,
        padding: "2.5rem 2rem 2rem",
        opacity: animating ? 0 : 1,
        transform: animating ? "translateY(10px)" : "none",
        transition: "opacity 0.18s ease, transform 0.18s ease",
      }}>
        {/* Segmented progress bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: "2.5rem" }}>
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
          <span style={{ color: "#c8a97e", fontSize: "1rem" }}>{STEP_ICONS[step]}</span>
          <span style={{ color: "#3a5068", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase" }}>
            Step {step + 1} of {STEPS.length}
          </span>
        </div>

        <h2 style={{ fontFamily: "'Playfair Display', serif", color: "#fffef9", fontSize: "clamp(1.4rem, 2.5vw, 1.75rem)", margin: "0 0 0.6rem", lineHeight: 1.25 }}>
          {s.question}
        </h2>
        <p style={{ color: "#3a5068", fontSize: "0.85rem", margin: "0 0 1.75rem", lineHeight: 1.6 }}>
          {s.hint}
        </p>

        {error && <p style={{ color: "#e07070", fontSize: "0.82rem", marginBottom: "1rem" }}>{error}</p>}

        {/* Choice options */}
        {s.type === "choice" && !customMode && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
            {s.options!.map(opt => {
              const selected = current === opt;
              return (
                <button key={opt} onClick={() => setCurrent(opt)} style={{
                  background: selected ? "rgba(200,169,126,0.1)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${selected ? "#c8a97e" : "rgba(200,169,126,0.1)"}`,
                  borderRadius: 10, padding: "1rem 1.25rem",
                  color: selected ? "#fffef9" : "#3a5068",
                  fontSize: "0.92rem", cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s ease",
                  display: "flex", alignItems: "center", gap: "1rem",
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
                  {opt}
                </button>
              );
            })}
            {/* Type your own option */}
            <button onClick={() => { setCustomMode(true); setCurrent(""); }} style={{
              background: "transparent", border: "1px dashed rgba(200,169,126,0.2)",
              borderRadius: 10, padding: "0.875rem 1.25rem",
              color: "#3a5068", fontSize: "0.85rem", cursor: "pointer", textAlign: "left",
              display: "flex", alignItems: "center", gap: "0.75rem",
              transition: "all 0.15s ease",
            }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px dashed rgba(200,169,126,0.3)", flexShrink: 0 }} />
              Type my own answer…
            </button>
          </div>
        )}

        {/* Custom answer input for choice questions */}
        {s.type === "choice" && customMode && (
          <div style={{ marginBottom: "1.5rem" }}>
            <input
              value={current}
              onChange={e => setCurrent(e.target.value)}
              onKeyDown={e => e.key === "Enter" && current.trim() && nextStep()}
              placeholder={`Describe your own ${s.id === "tone" ? "writing tone" : "color feel"}…`}
              autoFocus
              style={{
                width: "100%", boxSizing: "border-box",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(200,169,126,0.25)",
                borderRadius: 10, padding: "1rem 1.1rem",
                color: "#fffef9", fontSize: "1rem", outline: "none",
                fontFamily: "Inter, sans-serif", lineHeight: 1.5,
              }}
            />
            <button onClick={() => { setCustomMode(false); setCurrent(""); }} style={{ background: "transparent", border: "none", color: "#3a5068", fontSize: "0.78rem", cursor: "pointer", marginTop: "0.5rem", padding: 0 }}>
              ← Back to options
            </button>
          </div>
        )}

        {/* Textarea */}
        {s.type === "textarea" && (
          <textarea
            value={current}
            onChange={e => setCurrent(e.target.value)}
            placeholder={s.placeholder}
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(200,169,126,0.2)",
              borderRadius: 10, padding: "1rem 1.1rem",
              color: "#fffef9", fontSize: "1rem", outline: "none",
              resize: "vertical", marginBottom: "1.5rem",
              fontFamily: "Inter, sans-serif", lineHeight: 1.7,
              minHeight: "140px",
            }}
          />
        )}

        {/* Text input */}
        {s.type === "text" && (
          <input
            value={current}
            onChange={e => setCurrent(e.target.value)}
            onKeyDown={e => e.key === "Enter" && current.trim() && nextStep()}
            placeholder={s.placeholder}
            autoFocus
            style={{
              width: "100%", boxSizing: "border-box",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(200,169,126,0.2)",
              borderRadius: 10, padding: "1rem 1.1rem",
              color: "#fffef9", fontSize: "1.05rem", outline: "none",
              marginBottom: "1.5rem", fontFamily: "Inter, sans-serif",
              lineHeight: 1.5,
            }}
          />
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
          {step > 0 && (
            <button onClick={goBack} style={{ background: "transparent", color: "#3a5068", border: "1px solid rgba(200,169,126,0.12)", borderRadius: 8, padding: "0.75rem 1rem", fontSize: "0.85rem", cursor: "pointer" }}>
              ←
            </button>
          )}
          <button onClick={nextStep} disabled={!current.trim()} style={{
            background: "#c8a97e", color: "#0d1f3c", border: "none",
            borderRadius: 8, padding: "0.8rem 1.75rem",
            fontSize: "0.92rem", fontWeight: 700,
            cursor: current.trim() ? "pointer" : "default",
            opacity: current.trim() ? 1 : 0.4,
            transition: "opacity 0.2s ease",
          }}>
            {step === STEPS.length - 1 ? "Generate my blog →" : "Next →"}
          </button>
          {(s.type === "text" || (s.type === "choice" && customMode)) && (
            <span style={{ color: "#3a5068", fontSize: "0.72rem" }}>Press Enter ↵</span>
          )}
        </div>

        {/* Step dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: "0.4rem", marginTop: "2.5rem" }}>
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

export default function SetupPage() {
  return <Suspense><SetupInner /></Suspense>;
}
