"use client";
import { useEffect, useRef, useState } from "react";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function formatTime(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ slug }: { slug: string }) {
  const audioRef    = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [ready,    setReady]    = useState(false);
  const [playing,  setPlaying]  = useState(false);
  const [current,  setCurrent]  = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed,    setSpeed]    = useState(1);

  const audioSrc = `/api/tts?slug=${encodeURIComponent(slug)}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta  = () => { setDuration(audio.duration); setReady(true); };
    const onTime  = () => setCurrent(audio.currentTime);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("timeupdate",     onTime);
    audio.addEventListener("ended",          onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("timeupdate",     onTime);
      audio.removeEventListener("ended",          onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar   = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect  = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * duration;
  };

  const changeSpeed = (s: number) => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = s;
    setSpeed(s);
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <>
      {/* Always mount the audio element so the browser can start loading */}
      <audio ref={audioRef} src={audioSrc} preload="metadata" style={{ display: "none" }} />

      {/* Player UI — only visible once metadata has loaded */}
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

            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              aria-label={playing ? "Pause" : "Play"}
              style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "#0d1f3c", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
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

            {/* Progress + time */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.7rem", color: "#8fa3b1", letterSpacing: "0.02em" }}>
                  Listen to this essay
                </span>
                <span style={{ fontSize: "0.7rem", color: "#8fa3b1", letterSpacing: "0.03em" }}>
                  {formatTime(current)} / {formatTime(duration)}
                </span>
              </div>
              <div
                ref={progressRef}
                onClick={seek}
                style={{
                  height: 4, background: "rgba(13,31,60,0.1)",
                  borderRadius: 2, cursor: "pointer",
                  position: "relative", overflow: "hidden",
                }}
              >
                <div style={{
                  position: "absolute", left: 0, top: 0,
                  height: "100%", width: `${pct}%`,
                  background: "#c8a97e", borderRadius: 2,
                  transition: "width 0.1s linear",
                }} />
              </div>
            </div>

            {/* Speed selector */}
            <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
              {SPEEDS.map(s => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  style={{
                    background: speed === s ? "#0d1f3c" : "transparent",
                    color:      speed === s ? "#c8a97e" : "#8fa3b1",
                    border:     speed === s ? "none" : "1px solid rgba(13,31,60,0.12)",
                    borderRadius: 4, padding: "3px 7px",
                    fontSize: "0.65rem", cursor: "pointer",
                    fontFamily: "Inter, sans-serif", letterSpacing: "0.02em",
                    transition: "all 0.15s",
                  }}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
