"use client";
import { useState, useRef, useEffect } from "react";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function fmt(s: number) {
  if (!isFinite(s) || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ audioUrl }: { audioUrl: string | null }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing,  setPlaying]  = useState(false);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1);

  const speed = SPEEDS[speedIdx];

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onMeta  = () => { if (isFinite(a.duration)) setDuration(a.duration); };
    const onTime  = () => setCurrent(a.currentTime);
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setCurrent(0); };

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("timeupdate",     onTime);
    a.addEventListener("play",           onPlay);
    a.addEventListener("pause",          onPause);
    a.addEventListener("ended",          onEnded);

    // Handle case where metadata already loaded before effect ran
    if (a.readyState >= 1 && isFinite(a.duration)) setDuration(a.duration);

    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("timeupdate",     onTime);
      a.removeEventListener("play",           onPlay);
      a.removeEventListener("pause",          onPause);
      a.removeEventListener("ended",          onEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  if (!audioUrl) return null;

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play().catch(console.error);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
  };

  const cycleSpeed = () => setSpeedIdx(i => (i + 1) % SPEEDS.length);

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <>
      <audio ref={audioRef} src={audioUrl} preload="metadata" style={{ display: "none" }} />

      <div style={{
        background: "#fffef9", border: "1px solid rgba(13,31,60,0.12)",
        borderRadius: 10, padding: "0.875rem 1rem", margin: "0 0 2rem",
        fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>

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

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              role="slider"
              aria-label="Seek"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              onClick={seek}
              style={{
                height: 12, display: "flex", alignItems: "center",
                cursor: "pointer", marginBottom: "0.15rem",
              }}
            >
              <div style={{
                height: 3, width: "100%", background: "rgba(13,31,60,0.1)",
                borderRadius: 2, position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", left: 0, top: 0,
                  height: "100%", width: `${pct}%`,
                  background: "#c8a97e", borderRadius: 2,
                  transition: "width 0.2s linear",
                }} />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.65rem", color: "rgba(255,254,249,0.55)" }}>Listen to this essay</span>
              <span style={{ fontSize: "0.65rem", color: "rgba(255,254,249,0.55)", whiteSpace: "nowrap" }}>
                {duration > 0 ? `${fmt(current)} / ${fmt(duration)}` : ""}
              </span>
            </div>
          </div>

          <button
            onClick={cycleSpeed}
            style={{
              flexShrink: 0, background: "#0d1f3c", color: "#c8a97e",
              border: "none", borderRadius: 5, padding: "4px 8px",
              fontSize: "0.65rem", fontWeight: 700, cursor: "pointer",
              fontFamily: "Inter, sans-serif", minWidth: 36, textAlign: "center",
            }}
          >
            {speed}×
          </button>

        </div>
      </div>
    </>
  );
}
