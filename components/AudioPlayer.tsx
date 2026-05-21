"use client";
import { useState, useRef, useEffect } from "react";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

function fmt(s: number) {
  if (!isFinite(s) || s <= 0) return "0:00";
  return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
}

type State = "idle" | "loading" | "ready" | "error";

export default function AudioPlayer({ slug }: { slug: string }) {
  const audioRef    = useRef<HTMLAudioElement>(null);
  const pendingPlay = useRef(false);

  const [state,    setState]    = useState<State>("idle");
  const [playing,  setPlaying]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [blobUrl,  setBlobUrl]  = useState<string | null>(null);

  const speed = SPEEDS[speedIdx];

  // Revoke blob URL on unmount
  useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

  // Wire audio element events once blob URL is available
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !blobUrl) return;

    const onMeta  = () => setDuration(a.duration);
    const onTime  = () => {
      if (!isFinite(a.duration) || a.duration <= 0) return;
      setProgress((a.currentTime / a.duration) * 100);
    };
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPlaying(false); setProgress(100); };
    const onErr   = () => { setState("error"); setPlaying(false); };

    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("timeupdate",     onTime);
    a.addEventListener("play",           onPlay);
    a.addEventListener("pause",          onPause);
    a.addEventListener("ended",          onEnded);
    a.addEventListener("error",          onErr);
    if (a.readyState >= 1) onMeta();

    // Auto-play if user had clicked play before the load finished
    if (pendingPlay.current) {
      pendingPlay.current = false;
      a.play().catch(() => setState("error"));
    }

    return () => {
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("timeupdate",     onTime);
      a.removeEventListener("play",           onPlay);
      a.removeEventListener("pause",          onPause);
      a.removeEventListener("ended",          onEnded);
      a.removeEventListener("error",          onErr);
    };
  }, [blobUrl]);

  // Keep playback rate in sync with speed state
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const loadAudio = async () => {
    setState("loading");
    try {
      const res = await fetch(`/api/tts?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      setBlobUrl(URL.createObjectURL(blob));
      setState("ready");
    } catch (e) {
      console.error("TTS failed:", e);
      pendingPlay.current = false;
      setState("error");
    }
  };

  const togglePlay = () => {
    if (state === "loading") return;

    if (state === "idle" || state === "error") {
      pendingPlay.current = true;
      loadAudio();
      return;
    }

    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
    } else {
      a.play().catch(() => setState("error"));
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state !== "ready" || !duration) return;
    const a   = audioRef.current;
    if (!a) return;
    const pct = (e.clientX - e.currentTarget.getBoundingClientRect().left) / e.currentTarget.getBoundingClientRect().width;
    a.currentTime = Math.max(0, Math.min(1, pct)) * duration;
    setProgress(pct * 100);
  };

  const cycleSpeed = () => setSpeedIdx(i => (i + 1) % SPEEDS.length);

  const retry = () => {
    audioRef.current?.pause();
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }
    setProgress(0);
    setDuration(0);
    setPlaying(false);
    setState("idle");
  };

  const pct     = Math.min(100, progress);
  const total   = duration ? duration / speed : 0;
  const elapsed = (pct / 100) * total;

  return (
    <>
      <audio
        ref={audioRef}
        src={blobUrl ?? undefined}
        preload="none"
        style={{ display: "none" }}
      />

      <style>{`
        @keyframes amo-sweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(500%)} }
        @keyframes amo-spin  { to{transform:rotate(360deg)} }
      `}</style>

      <div style={{
        background: "#fffef9", border: "1px solid rgba(13,31,60,0.12)",
        borderRadius: 10, padding: "0.875rem 1rem", margin: "0 0 2rem",
        fontFamily: "Inter, sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>

          {/* Play / Pause / Loading */}
          <button
            onClick={togglePlay}
            disabled={state === "loading"}
            aria-label={state === "loading" ? "Loading" : playing ? "Pause" : "Play"}
            style={{
              width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
              background: "#0d1f3c", border: "none",
              cursor: state === "loading" ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: state === "loading" ? 0.75 : 1,
            }}
          >
            {state === "loading" ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke="#c8a97e" strokeWidth="2.5" strokeLinecap="round"
                style={{ animation: "amo-spin 0.9s linear infinite" }}>
                <circle cx="12" cy="12" r="9" opacity="0.25"/>
                <path d="M21 12a9 9 0 00-9-9"/>
              </svg>
            ) : playing ? (
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
            {/* Seekable progress bar */}
            <div
              role="slider"
              aria-label="Seek"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              onClick={seek}
              style={{
                height: 12, display: "flex", alignItems: "center",
                cursor: state === "ready" ? "pointer" : "default",
                marginBottom: "0.15rem",
              }}
            >
              <div style={{
                height: 3, width: "100%", background: "rgba(13,31,60,0.1)",
                borderRadius: 2, position: "relative", overflow: "hidden",
              }}>
                {state === "loading" ? (
                  <div style={{
                    position: "absolute", top: 0, left: 0,
                    height: "100%", width: "20%",
                    background: "#c8a97e", borderRadius: 2,
                    animation: "amo-sweep 1.2s ease-in-out infinite",
                  }} />
                ) : (
                  <div style={{
                    position: "absolute", left: 0, top: 0,
                    height: "100%", width: `${pct}%`,
                    background: "#c8a97e", borderRadius: 2,
                    transition: "width 0.2s linear",
                  }} />
                )}
              </div>
            </div>

            {/* Status line */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.65rem", color: "#8fa3b1" }}>
                {state === "error" ? (
                  <>
                    Audio unavailable
                    <button
                      onClick={retry}
                      style={{
                        marginLeft: 6, fontSize: "0.6rem", color: "#2d7d9a",
                        background: "none", border: "none", cursor: "pointer",
                        padding: 0, textDecoration: "underline",
                      }}
                    >
                      retry
                    </button>
                  </>
                ) : state === "loading" ? "Generating audio…" : "Listen to this essay"}
              </span>
              <span style={{ fontSize: "0.65rem", color: "#8fa3b1", whiteSpace: "nowrap" }}>
                {total > 0 ? `${fmt(elapsed)} / ${fmt(total)}` : ""}
              </span>
            </div>
          </div>

          {/* Speed */}
          <button
            onClick={cycleSpeed}
            disabled={state === "loading"}
            style={{
              flexShrink: 0, background: "#0d1f3c", color: "#c8a97e",
              border: "none", borderRadius: 5, padding: "4px 8px",
              fontSize: "0.65rem", fontWeight: 700, cursor: "pointer",
              fontFamily: "Inter, sans-serif", minWidth: 36, textAlign: "center",
              opacity: state === "loading" ? 0.5 : 1,
            }}
          >
            {speed}×
          </button>

        </div>
      </div>
    </>
  );
}
