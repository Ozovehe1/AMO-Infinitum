"use client";
import { useState, useRef, useEffect } from "react";

const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

function fmt(s: number) {
  if (!isFinite(s) || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ slug, text }: { slug: string; text: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const charRef  = useRef(0);

  const [mode,     setMode]     = useState<"deepgram" | "speech">("deepgram");
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);

  const speed    = SPEEDS[speedIdx];
  const totalLen = text.length;
  const estSecs  = Math.max(30, (totalLen / 750) * 60);

  // Refs that let the mount-time error handler read current values without
  // going stale (the effect runs once so its closure would otherwise be frozen).
  const speedRef          = useRef(speed);
  speedRef.current        = speed;
  const wasAttemptingPlay = useRef(false);
  const speechSpeakRef    = useRef<(fromChar: number, rate: number) => void>(() => {});

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onMeta  = () => setDuration(a.duration);
    const onTime  = () => {
      if (!Number.isFinite(a.duration) || a.duration <= 0) return;
      setProgress((a.currentTime / a.duration) * 100);
    };
    const onEnded = () => { setPlaying(false); setProgress(100); };
    const onErr   = () => {
      const autoStart = wasAttemptingPlay.current;
      wasAttemptingPlay.current = false;
      setPlaying(false);
      setProgress(0);
      setMode("speech");
      if (autoStart && "speechSynthesis" in window) {
        speechSpeakRef.current(0, speedRef.current);
      }
    };
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate",     onTime);
    a.addEventListener("ended",          onEnded);
    a.addEventListener("error",          onErr);
    if (a.readyState >= 1) onMeta();
    if (a.error)           onErr();
    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate",     onTime);
      a.removeEventListener("ended",          onEnded);
      a.removeEventListener("error",          onErr);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  const speechSpeak = (fromChar: number, rate: number) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(fromChar));
    utter.rate  = rate;
    utter.onboundary = (e) => {
      const abs = fromChar + (e.charIndex || 0);
      charRef.current = abs;
      setProgress((abs / totalLen) * 100);
    };
    utter.onend   = () => { setPlaying(false); setProgress(100); charRef.current = 0; };
    utter.onerror = (e) => { console.error("Speech error:", e.error); setPlaying(false); };
    synth.speak(utter);
    setPlaying(true);
  };

  // Keep ref current so the error handler (stale closure) always calls the latest version
  speechSpeakRef.current = speechSpeak;

  const togglePlay = () => {
    if (mode === "deepgram") {
      const a = audioRef.current;
      if (!a) return;
      if (playing) {
        wasAttemptingPlay.current = false;
        a.pause();
        setPlaying(false);
      } else {
        wasAttemptingPlay.current = true;
        a.play()
          .then(() => setPlaying(true))
          .catch((err) => {
            wasAttemptingPlay.current = false;
            console.warn("Audio play failed:", err);
            setPlaying(false);
          });
      }
    } else {
      if (!("speechSynthesis" in window)) return;
      const synth = window.speechSynthesis;
      if (playing) { synth.pause(); setPlaying(false); }
      else if (synth.paused) { synth.resume(); setPlaying(true); }
      else { speechSpeak(progress >= 100 ? 0 : charRef.current, speed); }
    }
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (playing && mode === "speech") speechSpeak(charRef.current, SPEEDS[next]);
  };

  const pct = Math.min(100, progress);

  const elapsed = mode === "deepgram"
    ? (audioRef.current?.currentTime ?? 0)
    : (pct / 100) * (estSecs / speed);

  const total = mode === "deepgram"
    ? (duration ? duration / speed : 0)
    : estSecs / speed;

  return (
    <>
      <audio
        ref={audioRef}
        src={`/api/tts?slug=${encodeURIComponent(slug)}`}
        preload="none"
        style={{ display: "none" }}
      />

      <div style={{
        background: "#fffef9", border: "1px solid rgba(13,31,60,0.12)",
        borderRadius: 10, padding: "0.875rem 1rem",
        margin: "0 0 2rem", fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>

          <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: "#0d1f3c", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {playing ? (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="#c8a97e">
                <rect x="0" y="0" width="4" height="14" rx="1"/>
                <rect x="8" y="0" width="4" height="14" rx="1"/>
              </svg>
            ) : (
              <svg width="12" height="14" viewBox="0 0 12 14" fill="#c8a97e" style={{ marginLeft: 2 }}>
                <path d="M0 0 L12 7 L0 14 Z"/>
              </svg>
            )}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ height: 3, background: "rgba(13,31,60,0.1)", borderRadius: 2, position: "relative", overflow: "hidden", marginBottom: "0.3rem" }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: "#c8a97e", borderRadius: 2, transition: "width 0.2s linear" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "0.65rem", color: "#8fa3b1" }}>Listen to this essay</span>
              <span style={{ fontSize: "0.65rem", color: "#8fa3b1", whiteSpace: "nowrap" }}>
                {total > 0 ? `${fmt(elapsed)} / ${fmt(total)}` : ""}
              </span>
            </div>
          </div>

          <button onClick={cycleSpeed} style={{
            flexShrink: 0, background: "#0d1f3c", color: "#c8a97e",
            border: "none", borderRadius: 5, padding: "4px 8px",
            fontSize: "0.65rem", fontWeight: 700, cursor: "pointer",
            fontFamily: "Inter, sans-serif", minWidth: 36, textAlign: "center",
          }}>
            {speed}×
          </button>

        </div>
      </div>
    </>
  );
}
