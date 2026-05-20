"use client";
import { useState, useRef } from "react";

const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ text }: { text: string }) {
  const [playing,   setPlaying]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [speedIdx,  setSpeedIdx]  = useState(0);
  const charRef  = useRef(0);
  const totalLen = text.length;
  const speed    = SPEEDS[speedIdx];
  const estSecs  = Math.max(30, (totalLen / 750) * 60);

  const speak = (fromChar: number, rate: number) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text.slice(fromChar));
    utter.rate  = rate;
    // Don't force a specific voice — let browser pick its best default
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

  const togglePlay = () => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    if (playing) {
      synth.pause();
      setPlaying(false);
    } else if (synth.paused) {
      synth.resume();
      setPlaying(true);
    } else {
      speak(progress >= 100 ? 0 : charRef.current, speed);
    }
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (playing) speak(charRef.current, SPEEDS[next]);
  };

  const pct     = Math.min(100, progress);
  const elapsed = (pct / 100) * (estSecs / speed);
  const remain  = estSecs / speed;

  return (
    <div style={{
      background: "#fffef9",
      border: "1px solid rgba(13,31,60,0.12)",
      borderRadius: 10,
      padding: "0.875rem 1rem",
      margin: "0 0 2rem",
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>

        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: "#0d1f3c", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
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

        {/* Progress + time */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ height: 3, background: "rgba(13,31,60,0.1)", borderRadius: 2, position: "relative", overflow: "hidden", marginBottom: "0.3rem" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: "#c8a97e", borderRadius: 2, transition: "width 0.2s linear" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.65rem", color: "#8fa3b1" }}>Listen to this essay</span>
            <span style={{ fontSize: "0.65rem", color: "#8fa3b1", whiteSpace: "nowrap" }}>{formatTime(elapsed)} / {formatTime(remain)}</span>
          </div>
        </div>

        {/* Speed — single tap-to-cycle button */}
        <button
          onClick={cycleSpeed}
          style={{
            flexShrink: 0,
            background: "#0d1f3c", color: "#c8a97e",
            border: "none", borderRadius: 5,
            padding: "4px 8px", fontSize: "0.65rem", fontWeight: 700,
            cursor: "pointer", fontFamily: "Inter, sans-serif",
            minWidth: 36, textAlign: "center",
          }}
        >
          {speed}×
        </button>

      </div>
    </div>
  );
}
