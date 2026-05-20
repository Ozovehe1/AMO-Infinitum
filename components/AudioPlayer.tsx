"use client";
import { useEffect, useRef, useState } from "react";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s) || s <= 0) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const priority = ["Samantha", "Karen", "Google UK English Female", "Google US English", "Microsoft Aria", "Microsoft Jenny"];
  for (const name of priority) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }
  return voices.find(v => v.lang.startsWith("en") && !v.localService === false) ||
    voices.find(v => v.lang.startsWith("en")) ||
    null;
}

export default function AudioPlayer({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [playing,   setPlaying]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [speed,     setSpeed]     = useState(1);
  const charRef     = useRef(0);       // char position when speed changed / resumed
  const totalLen    = text.length;
  const estDuration = Math.max(10, (totalLen / 750) * 60); // ~750 chars/min at 1×

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => { if (typeof window !== "undefined") window.speechSynthesis.cancel(); };
  }, []);

  const startAt = (fromChar: number, rate: number) => {
    window.speechSynthesis.cancel();
    const chunk = text.slice(fromChar);
    const utter = new SpeechSynthesisUtterance(chunk);
    utter.rate  = rate;
    const voice = pickVoice();
    if (voice) utter.voice = voice;

    utter.onboundary = (e) => {
      const abs = fromChar + e.charIndex;
      charRef.current = abs;
      setProgress((abs / totalLen) * 100);
    };
    utter.onend = () => { setPlaying(false); setProgress(100); charRef.current = 0; };
    utter.onerror = () => setPlaying(false);

    window.speechSynthesis.speak(utter);
    setPlaying(true);
  };

  const togglePlay = () => {
    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setPlaying(true);
      } else {
        startAt(progress === 100 ? 0 : charRef.current, speed);
      }
    }
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (playing) startAt(charRef.current, s);
  };

  const pct     = Math.min(100, progress);
  const elapsed = (pct / 100) * estDuration;

  if (!supported) return null;

  return (
    <div style={{
      background: "#fffef9",
      border: "1px solid rgba(13,31,60,0.12)",
      borderRadius: 10,
      padding: "1rem 1.25rem",
      maxWidth: 720,
      margin: "0 auto 2rem",
      fontFamily: "Inter, sans-serif",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>

        <button
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "#0d1f3c", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          {playing ? (
            <svg width="14" height="16" viewBox="0 0 14 16" fill="#c8a97e">
              <rect x="0" y="0" width="5" height="16" rx="1" />
              <rect x="9" y="0" width="5" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="16" viewBox="0 0 14 16" fill="#c8a97e" style={{ marginLeft: 2 }}>
              <path d="M0 0 L14 8 L0 16 Z" />
            </svg>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.7rem", color: "#8fa3b1", letterSpacing: "0.02em" }}>Listen to this essay</span>
            <span style={{ fontSize: "0.7rem", color: "#8fa3b1" }}>
              {formatTime(elapsed)} / {formatTime(estDuration / speed)}
            </span>
          </div>
          <div style={{ height: 4, background: "rgba(13,31,60,0.1)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: "#c8a97e", borderRadius: 2, transition: "width 0.2s linear" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
          {SPEEDS.map(s => (
            <button key={s} onClick={() => changeSpeed(s)} style={{
              background: speed === s ? "#0d1f3c" : "transparent",
              color: speed === s ? "#c8a97e" : "#8fa3b1",
              border: speed === s ? "none" : "1px solid rgba(13,31,60,0.12)",
              borderRadius: 4, padding: "3px 7px", fontSize: "0.65rem",
              cursor: "pointer", fontFamily: "Inter, sans-serif", transition: "all 0.15s",
            }}>{s}×</button>
          ))}
        </div>
      </div>
    </div>
  );
}
