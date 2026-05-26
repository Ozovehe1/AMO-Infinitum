"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const STEPS = [
  {
    id: "niche",
    question: "What will your blog be about?",
    hint: "Choose a topic you could write about endlessly — your readers will feel the conviction.",
    placeholder: "e.g. technology, personal finance, creative writing, health…",
    type: "text",
  },
  {
    id: "audience",
    question: "Who are you writing for?",
    hint: "Picture one specific person sitting down to read your blog. Who are they?",
    placeholder: "e.g. early-career developers, curious generalists, parents of teenagers…",
    type: "text",
  },
  {
    id: "tone",
    question: "What's the voice of your writing?",
    hint: "Your voice is what keeps readers coming back. Pick the one that feels most like you.",
    type: "choice",
    options: ["Professional & authoritative", "Friendly & approachable", "Inspirational & poetic", "Playful & creative"],
  },
  {
    id: "colorMood",
    question: "What's the visual mood of your blog?",
    hint: "Colors communicate before a word is read. Which direction feels right?",
    type: "choice",
    options: ["Warm & earthy", "Cool & minimal", "Dark & modern", "Bold & vibrant"],
  },
  {
    id: "blogName",
    question: "What will you name your blog?",
    hint: "The best names are short, memorable, and feel unmistakably like you.",
    placeholder: "Your blog name",
    type: "text",
  },
  {
    id: "bio",
    question: "Tell me about yourself",
    hint: "Your readers want to know the person behind the words. Be honest and specific — this becomes your About page.",
    placeholder: "Your background, what drives you to write, what readers will take away…",
    type: "textarea",
  },
  {
    id: "readingFeel",
    question: "How should reading your blog feel?",
    hint: "Think about the atmosphere you're creating — the pace, the texture, the mood.",
    type: "choice",
    options: [
      "Like settling into a quiet library with a great novel",
      "Like reading a sharp, well-edited magazine piece",
      "Like getting a warm, thoughtful letter from a close friend",
      "Like browsing a clean, modern publication online",
    ],
  },
  {
    id: "imageStyle",
    question: "What kind of imagery suits your blog?",
    hint: "The AI uses this to find a cover image that truly belongs to your blog.",
    type: "choice",
    options: ["Professional photography", "Minimal & abstract", "Illustrated & artistic", "None — text-only blog"],
  },
];

const MOOD_MAP: Record<string, string> = {
  "Warm & earthy": "warm+earthy", "Cool & minimal": "cool+minimal",
  "Dark & modern": "dark+modern", "Bold & vibrant": "bold+vibrant",
};

type Answers = Record<string, string>;
interface Config {
  siteName: string; tagline: string; description: string; heroQuote: string;
  colorPrimary: string; colorAccent: string; colorBg: string; footerTagline: string; aboutText: string;
  fontHeading: string; fontBody: string;
}
interface Photo { url: string; thumb: string; credit: { name: string; link: string } }

const GOLD = "#c8a97e";
const DARK = "#0d0d10";
const LIGHT_BG = "#faf9f6";
const LIGHT_TEXT = "#1a1814";
const MUTED = "#9a8e7e";
const HAIRLINE = "rgba(26,24,20,0.1)";

function Spinner({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 48, height: 48, margin: "0 auto 2rem" }}>
        <div style={{ position: "absolute", inset: 0, border: `1.5px solid rgba(200,169,126,0.15)`, borderTop: `1.5px solid rgba(200,169,126,0.5)`, borderRadius: "50%", animation: "spin 1.4s linear infinite" }} />
        <div style={{ position: "absolute", inset: 10, border: `1.5px solid transparent`, borderTop: `1.5px solid ${GOLD}`, borderRadius: "50%", animation: "spin 0.8s linear infinite reverse" }} />
      </div>
      <p style={{ color: LIGHT_TEXT, fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", fontWeight: 400, margin: "0 0 0.5rem", letterSpacing: "0.01em" }}>{label}</p>
      {sub && <p style={{ color: MUTED, fontFamily: "Inter, sans-serif", fontSize: "0.8rem", margin: 0, letterSpacing: "0.02em" }}>{sub}</p>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const centeredPage: React.CSSProperties = {
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: LIGHT_BG, padding: "3rem 1.5rem", fontFamily: "Inter, sans-serif",
};

const darkBtn: React.CSSProperties = {
  background: LIGHT_TEXT, color: LIGHT_BG, border: "none", borderRadius: 2,
  padding: "0.875rem 2.25rem", fontFamily: "Inter, sans-serif",
  fontSize: "0.78rem", fontWeight: 500, letterSpacing: "0.1em",
  textTransform: "uppercase", cursor: "pointer",
};

const outlineBtn: React.CSSProperties = {
  background: "transparent", color: MUTED, border: "none",
  fontFamily: "Inter, sans-serif", fontSize: "0.82rem",
  letterSpacing: "0.04em", cursor: "pointer", padding: "0.875rem 0",
};

function SetupInner() {
  const { username } = useParams<{ username: string }>();
  const router = useRouter();
  const sp = useSearchParams();

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

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(data => {
        setPhase(data.emailVerified ? "questions" : "verify-gate");
      })
      .catch(() => setPhase("questions"));
  }, []);

  useEffect(() => {
    if (!config?.fontHeading) return;
    const families = [config.fontHeading, config.fontBody]
      .filter(Boolean)
      .map(f => `family=${encodeURIComponent(f)}:ital,wght@0,400;0,600;1,400`)
      .join("&");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
  }, [config?.fontHeading, config?.fontBody]);

  const s = STEPS[step];

  const transition = useCallback((fn: () => void) => {
    setAnimating(true);
    setTimeout(() => { fn(); setAnimating(false); }, 160);
  }, []);

  const goBack = () => {
    if (step === 0) return;
    transition(() => {
      const prev = STEPS[step - 1];
      setCurrent(answers[prev.id] || "");
      setCustomMode(false);
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
        setCurrent(answers[STEPS[step + 1].id] || "");
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
        setPhotos((await imgRes.json()).photos || []);
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

  if (phase === "check") return (
    <div style={centeredPage}><Spinner label="Loading…" /></div>
  );

  if (phase === "verify-gate") return (
    <div style={centeredPage}>
      <div style={{ maxWidth: 440, width: "100%" }}>
        <p style={{ color: GOLD, fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 1.5rem" }}>One step first</p>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.6rem, 3vw, 2rem)", color: LIGHT_TEXT, margin: "0 0 1rem", fontWeight: 400, lineHeight: 1.2 }}>
          Verify your email address
        </h1>
        <p style={{ color: MUTED, fontSize: "0.88rem", lineHeight: 1.75, margin: "0 0 2rem", fontFamily: "Inter, sans-serif" }}>
          We sent a confirmation link to your inbox. Click it to activate your account, then return here to continue.
        </p>
        <div style={{ borderLeft: `3px solid ${GOLD}`, paddingLeft: "1rem", marginBottom: "2rem" }}>
          <p style={{ margin: 0, color: LIGHT_TEXT, fontSize: "0.82rem", fontFamily: "Inter, sans-serif", lineHeight: 1.6 }}>
            After confirming, you&apos;ll be redirected back here automatically.
          </p>
        </div>
        <p style={{ color: "rgba(26,24,20,0.3)", fontSize: "0.75rem", fontFamily: "Inter, sans-serif", margin: 0 }}>
          No email? Check your spam folder.
        </p>
      </div>
    </div>
  );

  if (phase === "generating") return (
    <div style={centeredPage}><Spinner label="Building your blog identity…" sub="This takes a moment. Good things do." /></div>
  );

  if (phase === "saving") return (
    <div style={centeredPage}><Spinner label="Launching your blog…" /></div>
  );

  if (phase === "images") return (
    <div style={{ ...centeredPage, padding: "3rem 1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 860 }}>
        <p style={{ color: GOLD, fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 1.5rem" }}>Cover image</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: LIGHT_TEXT, fontSize: "clamp(1.6rem, 3vw, 2.25rem)", fontWeight: 400, margin: "0 0 0.75rem", lineHeight: 1.2 }}>Choose an image for your blog</h2>
        <p style={{ color: MUTED, fontSize: "0.85rem", margin: "0 0 2.5rem", lineHeight: 1.65, fontFamily: "Inter, sans-serif" }}>
          Selected to match your niche, mood, and visual style. Pick one — or skip and add your own later.
        </p>

        {photos.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem", marginBottom: "2.5rem" }}>
            {photos.map(p => (
              <button key={p.url} onClick={() => setChosenPhoto(chosenPhoto === p.url ? null : p.url)}
                style={{ position: "relative", padding: 0, border: `2px solid ${chosenPhoto === p.url ? LIGHT_TEXT : "transparent"}`, borderRadius: 4, overflow: "hidden", cursor: "pointer", background: "none", display: "block", transition: "border-color 0.15s", outline: "none" }}>
                <img src={p.thumb} alt="" style={{ width: "100%", height: 148, objectFit: "cover", display: "block" }} />
                <div style={{ background: "rgba(0,0,0,0.45)", padding: "0.3rem 0.5rem" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.6rem", fontFamily: "Inter, sans-serif" }}>Photo by {p.credit.name}</span>
                </div>
                {chosenPhoto === p.url && (
                  <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 2, background: LIGHT_TEXT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: LIGHT_BG, fontSize: "0.75rem", fontWeight: 700 }}>✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ padding: "2.5rem", textAlign: "center", color: MUTED, fontSize: "0.85rem", marginBottom: "2rem", border: `1px solid ${HAIRLINE}`, borderRadius: 4, fontFamily: "Inter, sans-serif" }}>
            No images found — you can add one from Settings after launch.
          </div>
        )}

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <button onClick={() => setPhase("review")} style={{ ...darkBtn, opacity: 1 }}>
            {chosenPhoto ? "Continue" : "Skip for now"}
          </button>
          {chosenPhoto && <span style={{ color: MUTED, fontSize: "0.78rem", fontFamily: "Inter, sans-serif" }}>1 selected</span>}
        </div>
      </div>
    </div>
  );

  if (phase === "review" && config) return (
    <div style={{ ...centeredPage, alignItems: "flex-start", padding: "4rem 1.5rem" }}>
      <div style={{ width: "100%", maxWidth: 620 }}>
        <p style={{ color: GOLD, fontFamily: "Inter, sans-serif", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 1.5rem" }}>Review</p>
        <h2 style={{ fontFamily: "'Playfair Display', serif", color: LIGHT_TEXT, fontSize: "clamp(1.6rem, 3vw, 2.25rem)", fontWeight: 400, margin: "0 0 0.5rem", lineHeight: 1.2 }}>
          Your blog, ready to launch
        </h2>
        <p style={{ color: MUTED, fontSize: "0.84rem", margin: "0 0 2.5rem", lineHeight: 1.65, fontFamily: "Inter, sans-serif" }}>
          Everything below is editable from your Settings page at any time.
        </p>

        {chosenPhoto && (
          <div style={{ marginBottom: "1.5rem", borderRadius: 4, overflow: "hidden", height: 140 }}>
            <img src={chosenPhoto} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", borderTop: `1px solid ${HAIRLINE}` }}>
          {([["Name", config.siteName], ["Tagline", config.tagline], ["Hero quote", config.heroQuote], ["Footer line", config.footerTagline]] as [string, string][]).filter(([, v]) => v).map(([label, val]) => (
            <div key={label} style={{ padding: "1rem 0", borderBottom: `1px solid ${HAIRLINE}` }}>
              <div style={{ color: MUTED, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.35rem", fontFamily: "Inter, sans-serif" }}>{label}</div>
              <div style={{ color: LIGHT_TEXT, fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", lineHeight: 1.5 }}>{val}</div>
            </div>
          ))}
          <div style={{ padding: "1rem 0", borderBottom: `1px solid ${HAIRLINE}`, display: "flex", alignItems: "center", gap: "1.25rem" }}>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["colorPrimary", "colorAccent", "colorBg"] as (keyof Config)[]).map(k => (
                <div key={k} title={config[k] as string} style={{ width: 20, height: 20, borderRadius: "50%", background: config[k] as string, border: `1px solid ${HAIRLINE}` }} />
              ))}
            </div>
            <span style={{ color: MUTED, fontSize: "0.75rem", fontFamily: "Inter, sans-serif" }}>Palette</span>
          </div>
          {(config.fontHeading || config.fontBody) && (
            <div style={{ padding: "1rem 0", borderBottom: `1px solid ${HAIRLINE}` }}>
              <div style={{ color: MUTED, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: "0.6rem", fontFamily: "Inter, sans-serif" }}>Typography</div>
              <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                {config.fontHeading && (
                  <div>
                    <span style={{ color: "rgba(26,24,20,0.4)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Inter, sans-serif", display: "block", marginBottom: "0.2rem" }}>Heading</span>
                    <span style={{ color: LIGHT_TEXT, fontFamily: `'${config.fontHeading}', Georgia, serif`, fontSize: "1rem", fontWeight: 600 }}>{config.fontHeading}</span>
                  </div>
                )}
                {config.fontBody && (
                  <div>
                    <span style={{ color: "rgba(26,24,20,0.4)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "Inter, sans-serif", display: "block", marginBottom: "0.2rem" }}>Body</span>
                    <span style={{ color: MUTED, fontFamily: `'${config.fontBody}', Georgia, serif`, fontSize: "0.9rem" }}>{config.fontBody}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {error && <p style={{ color: "#c0392b", fontSize: "0.82rem", margin: "1rem 0 0", fontFamily: "Inter, sans-serif" }}>{error}</p>}

        <div style={{ display: "flex", gap: "2rem", alignItems: "center", marginTop: "2.5rem" }}>
          <button onClick={save} style={darkBtn}>Launch my blog</button>
          <button onClick={() => setPhase("images")} style={outlineBtn}>← Back</button>
        </div>
      </div>
    </div>
  );

  // Questions phase — split screen
  const stepNum = String(step + 1).padStart(2, "0");
  const totalNum = String(STEPS.length).padStart(2, "0");
  const canAdvance = !!current.trim();

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .setup-right { padding: 0 8% 0 7%; }
        @media (max-width: 768px) {
          .setup-left { display: none !important; }
          .setup-right { padding: 3.5rem 1.75rem !important; }
        }
        .setup-opt:hover { color: #1a1814 !important; }
        .setup-input:focus { border-bottom-color: #c8a97e !important; }
        .setup-input::placeholder { color: rgba(26,24,20,0.28); }
      `}</style>

      <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>

        {/* Left panel */}
        <div className="setup-left" style={{ width: "38%", background: DARK, position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "2.5rem 2.5rem 2.5rem" }}>
          <div>
            <span style={{ color: "rgba(200,169,126,0.45)", fontSize: "0.68rem", letterSpacing: "0.22em", textTransform: "uppercase", fontFamily: "Inter, sans-serif" }}>Inkwell</span>
          </div>
          <div style={{ position: "absolute", bottom: "3rem", left: "2.5rem", right: "2.5rem" }}>
            <div style={{ overflow: "hidden", lineHeight: 0.85, marginBottom: "2.5rem" }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(6rem, 14vw, 11rem)", fontWeight: 600, color: "rgba(255,255,255,0.04)", display: "block", userSelect: "none" }}>
                {stepNum}
              </span>
            </div>
            <span style={{ color: "rgba(255,255,255,0.22)", fontSize: "0.7rem", letterSpacing: "0.14em", fontFamily: "Inter, sans-serif" }}>
              {stepNum} / {totalNum}
            </span>
          </div>
        </div>

        {/* Right panel */}
        <div className="setup-right" style={{
          flex: 1, background: LIGHT_BG, display: "flex", flexDirection: "column",
          justifyContent: "center", minHeight: "100vh",
          opacity: animating ? 0 : 1,
          transform: animating ? "translateY(4px)" : "none",
          transition: "opacity 0.16s ease, transform 0.16s ease",
        }}>
          <div style={{ maxWidth: 520, width: "100%" }}>

            {/* Step label */}
            <p style={{ color: GOLD, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", margin: "0 0 2.5rem", fontFamily: "Inter, sans-serif" }}>
              Question {stepNum}
            </p>

            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(1.75rem, 3vw, 2.5rem)", fontWeight: 400, color: LIGHT_TEXT, lineHeight: 1.15, margin: "0 0 0.75rem" }}>
              {s.question}
            </h2>
            <p style={{ color: MUTED, fontSize: "0.84rem", margin: "0 0 2.75rem", lineHeight: 1.7, fontFamily: "Inter, sans-serif" }}>
              {s.hint}
            </p>

            {error && <p style={{ color: "#c0392b", fontSize: "0.8rem", marginBottom: "1rem" }}>{error}</p>}

            {/* Choice options */}
            {s.type === "choice" && !customMode && (
              <div style={{ marginBottom: "2rem" }}>
                {s.options!.map(opt => {
                  const selected = current === opt;
                  return (
                    <button key={opt} className="setup-opt" onClick={() => setCurrent(opt)} style={{
                      display: "block", width: "100%", background: "transparent", border: "none",
                      borderBottom: `1px solid ${HAIRLINE}`,
                      boxShadow: selected ? `-3px 0 0 0 ${GOLD}` : "none",
                      padding: selected ? "0.875rem 0 0.875rem 0.875rem" : "0.875rem 0",
                      color: selected ? LIGHT_TEXT : "rgba(26,24,20,0.5)",
                      fontSize: "0.95rem", cursor: "pointer", textAlign: "left",
                      transition: "color 0.12s, box-shadow 0.12s, padding 0.12s",
                      fontFamily: "Inter, sans-serif", letterSpacing: "0.01em",
                    }}>
                      {opt}
                    </button>
                  );
                })}
                <button onClick={() => { setCustomMode(true); setCurrent(""); }} style={{
                  display: "block", width: "100%", background: "transparent", border: "none",
                  padding: "0.875rem 0", color: "rgba(26,24,20,0.3)",
                  fontSize: "0.82rem", cursor: "pointer", textAlign: "left",
                  fontFamily: "Inter, sans-serif", letterSpacing: "0.02em",
                  marginTop: "0.25rem",
                }}>
                  + Write your own
                </button>
              </div>
            )}

            {/* Custom answer input for choice questions */}
            {s.type === "choice" && customMode && (
              <div style={{ marginBottom: "2rem" }}>
                <input
                  className="setup-input"
                  value={current}
                  onChange={e => setCurrent(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && canAdvance && nextStep()}
                  placeholder="Describe it in your own words…"
                  autoFocus
                  style={{
                    width: "100%", boxSizing: "border-box", background: "transparent",
                    border: "none", borderBottom: `2px solid rgba(26,24,20,0.18)`,
                    borderRadius: 0, padding: "0.75rem 0",
                    color: LIGHT_TEXT, fontSize: "1rem", outline: "none",
                    fontFamily: "Inter, sans-serif", transition: "border-color 0.15s",
                  }}
                />
                <button onClick={() => { setCustomMode(false); setCurrent(""); }} style={{ background: "transparent", border: "none", color: "rgba(26,24,20,0.35)", fontSize: "0.78rem", cursor: "pointer", marginTop: "0.75rem", padding: 0, fontFamily: "Inter, sans-serif" }}>
                  ← Back to options
                </button>
              </div>
            )}

            {/* Textarea */}
            {s.type === "textarea" && (
              <textarea
                className="setup-input"
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder={s.placeholder}
                autoFocus
                style={{
                  width: "100%", boxSizing: "border-box", background: "transparent",
                  border: "none", borderBottom: `2px solid rgba(26,24,20,0.18)`,
                  borderRadius: 0, padding: "0.75rem 0",
                  color: LIGHT_TEXT, fontSize: "0.97rem", outline: "none",
                  resize: "none", marginBottom: "2rem",
                  fontFamily: "Inter, sans-serif", lineHeight: 1.75,
                  minHeight: "130px", transition: "border-color 0.15s",
                }}
              />
            )}

            {/* Text input */}
            {s.type === "text" && (
              <input
                className="setup-input"
                value={current}
                onChange={e => setCurrent(e.target.value)}
                onKeyDown={e => e.key === "Enter" && canAdvance && nextStep()}
                placeholder={s.placeholder}
                autoFocus
                style={{
                  width: "100%", boxSizing: "border-box", background: "transparent",
                  border: "none", borderBottom: `2px solid rgba(26,24,20,0.18)`,
                  borderRadius: 0, padding: "0.75rem 0",
                  color: LIGHT_TEXT, fontSize: "1.05rem", outline: "none",
                  marginBottom: "2rem", fontFamily: "Inter, sans-serif",
                  transition: "border-color 0.15s",
                }}
              />
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
              <button onClick={nextStep} disabled={!canAdvance} style={{ ...darkBtn, opacity: canAdvance ? 1 : 0.25, cursor: canAdvance ? "pointer" : "default" }}>
                {step === STEPS.length - 1 ? "Generate my blog" : "Continue"}
              </button>
              {step > 0 && (
                <button onClick={goBack} style={outlineBtn}>← Back</button>
              )}
            </div>

          </div>
        </div>

      </div>
    </>
  );
}

export default function SetupPage() {
  return <Suspense><SetupInner /></Suspense>;
}
