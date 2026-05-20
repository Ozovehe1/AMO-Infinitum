"use client";
import { useRef, useState, useEffect } from "react";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(s: number): string {
  if (!isFinite(s) || isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ slug }: { slug: string }) {
  const audioRef    = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [ready,    setReady]    = useState(false);
  const [playing,  setPlaying]  = useState(false);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed,    setSpeed]    = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onMeta  = () => { setDuration(audio.duration); setReady(true); };
    const onErr   = () => { console.error("TTS error — src:", audio.src, "code:", audio.error?.code); };
    const onTime  = () => setCurrent(audio.currentTime);
    const onEnded = () => setPlaying(false);

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("error",          onErr);
    audio.addEventListener("timeupdate",     onTime);
    audio.addEventListener("ended",          onEnded);

    if (audio.readyState >= 1) onMeta();
    else if (audio.error)      onErr();

    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error",          onErr);
      audio.removeEventListener("timeupdate",     onTime);
      audio.removeEventListener("ended",          onEnded);
    };
  }, []);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().catch(() => {}); setPlaying(true); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a   = audioRef.current;
    const bar = progressRef.current;
    if (!a || !bar || !duration) return;
    const rect  = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
  };

  const changeSpeed = (s: number) => {
    if (audioRef.current) audioRef.current.playbackRate = s;
    setSpeed(s);
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <>
      <audio
        ref={audioRef}
        src={`/api/tts?slug=${encodeURIComponent(slug)}`}
        preload="auto"
        style={{ display: "none" }}
      />

      {ready && (
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
                <span style={{ fontSize: "0.7rem", color: "#8fa3b1" }}>{formatTime(current)} / {formatTime(duration)}</span>
              </div>
              <div
                ref={progressRef}
                onClick={seek}
                style={{ height: 4, background: "rgba(13,31,60,0.1)", borderRadius: 2, cursor: "pointer", position: "relative", overflow: "hidden" }}
              >
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: "#c8a97e", borderRadius: 2, transition: "width 0.1s linear" }} />
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
      )}
    </>
  );
}
