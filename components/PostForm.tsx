"use client";
import { useState, useEffect, useRef, useCallback, type KeyboardEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Editor as TiptapEditorType } from "@tiptap/core";
import { makePostcardBlob } from "@/lib/postcard";
import { firstSentence } from "@/lib/utils";
import UpgradePrompt from "./UpgradePrompt";
function timeSince(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return m === 1 ? "1 min ago" : `${m} mins ago`;
}

const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 240 }} />,
});

interface Category { id: number; name: string; slug: string; color: string; }
interface AiMsg { role: "user" | "assistant"; content: string; }
interface ChatSession { id: string; createdAt: number; preview: string; messages: AiMsg[]; }
interface PostData {
  id?: number; slug?: string; title?: string; content?: string;
  excerpt?: string; coverImage?: string | null;
  published?: boolean; featured?: boolean;
  showUpdatedNotice?: boolean;
  categories?: { category: Category }[];
}

// ── Toolbar helpers (defined outside component to avoid re-creation on render) ──
function TB(label: string, action: () => void, active?: boolean, extraStyle?: React.CSSProperties) {
  return (
    <button
      key={label}
      onPointerDown={e => { e.preventDefault(); action(); }}
      style={{
        height: 38, padding: "0 9px",
        background: active ? "color-mix(in srgb, var(--admin-primary) 8%, transparent)" : "transparent",
        color: "#1a1a1a", border: "none", borderRadius: 4,
        cursor: "pointer", fontSize: "0.82rem",
        fontFamily: "system-ui, -apple-system, sans-serif",
        flexShrink: 0, display: "flex", alignItems: "center",
        touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
        ...extraStyle,
      }}
    >{label}</button>
  );
}

function TSep() {
  return <div style={{ width: 1, background: "rgba(0,0,0,0.12)", height: 18, margin: "0 3px", alignSelf: "center", flexShrink: 0 }} />;
}

export default function PostForm({ post }: { post?: PostData }) {
  const router = useRouter();
  const { username } = useParams<{ username: string }>();
  const coverImgRef    = useRef<HTMLInputElement>(null);
  const bodyImgRef     = useRef<HTMLInputElement>(null);
  const mobileTitleRef    = useRef<HTMLTextAreaElement>(null);
  const mobileExcerptRef  = useRef<HTMLTextAreaElement>(null);

  // Core post state
  const [postId,      setPostId]      = useState<number | undefined>(post?.id);
  const [postSlug,    setPostSlug]    = useState<string | undefined>(post?.slug);
  const [title,       setTitle]       = useState(post?.title || "");
  const [content,     setContent]     = useState(post?.content || "");
  const [excerpt,     setExcerpt]     = useState(post?.excerpt || "");
  const [coverImage,  setCoverImage]  = useState(post?.coverImage || "");
  const [published,          setPublished]          = useState(post?.published || false);
  const [featured,           setFeatured]           = useState(post?.featured || false);
  const [showUpdatedNotice,  setShowUpdatedNotice]  = useState(post?.showUpdatedNotice || false);
  const [notifySubscribers, setNotifySubscribers] = useState(true);
  const [selectedCats, setSelectedCats] = useState<number[]>(
    post?.categories?.map(c => c.category.id) || []
  );
  const [categories, setCategories] = useState<Category[]>([]);

  // Save/upload state
  const [saving,     setSaving]     = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState("");
  const [saved,      setSaved]      = useState(false);
  const [lastSaved,  setLastSaved]  = useState<Date | null>(null);

  // UI state
  const [sheetOpen,      setSheetOpen]      = useState(false);
  const [styleOpen,      setStyleOpen]      = useState(false);
  const [alignOpen,      setAlignOpen]      = useState(false);
  const [catPickerOpen,  setCatPickerOpen]  = useState(false);
  const [mobileUrlMode,  setMobileUrlMode]  = useState<"link" | "image" | "youtube" | null>(null);
  const [mobileUrlValue, setMobileUrlValue] = useState("");
  const [deleting,       setDeleting]       = useState(false);
  const [publishedSlug,  setPublishedSlug]  = useState<string | null>(null);

  // Plan / billing
  const [userPlan,     setUserPlan]     = useState<"free" | "premium" | null>(null);
  useEffect(() => {
    fetch("/api/billing/status").then(r => r.json()).then(d => setUserPlan(d.plan)).catch(() => setUserPlan("free"));
  }, []);

  // AI chat state
  const [aiOpen,       setAiOpen]       = useState(false);
  const [aiView,       setAiView]       = useState<"chat" | "history">("chat");
  const [aiMessages,   setAiMessages]   = useState<AiMsg[]>([]);
  const [aiSessions,   setAiSessions]   = useState<ChatSession[]>([]);
  const [aiInput,      setAiInput]      = useState("");
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiSharePost,  setAiSharePost]  = useState(false); // explicit toggle: share post with AI
  const [drawerHeight, setDrawerHeight] = useState(60); // vh, user-resizable
  const drawerHeightRef = useRef(60);
  useEffect(() => { drawerHeightRef.current = drawerHeight; }, [drawerHeight]);

  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const aiEndRef    = useRef<HTMLDivElement>(null);
  const aiHandleRef = useRef<HTMLDivElement>(null);
  const aiDragRef   = useRef({ isDragging: false, startY: 0, startH: 60 });

  // Mobile TipTap editor instance (exposed via onEditorReady)
  const [mobileEditor, setMobileEditor] = useState<TiptapEditorType | null>(null);
  // Force re-render when editor selection changes (for toolbar active states)
  const [, setEditorVersion] = useState(0);

  const [themeBranding, setThemeBranding] = useState({ siteName: "Blog", colorAccent: "#c8a97e", colorPrimary: "#0d1f3c", fontHeading: "Georgia" });

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/settings?username=${username}`)
      .then(r => r.json())
      .then(s => {
        setThemeBranding({
          siteName: s.site_name || "Blog",
          colorAccent: s.color_accent || "#c8a97e",
          colorPrimary: s.color_primary || "#0d1f3c",
          fontHeading: s.font_heading || "Georgia",
        });
      })
      .catch(() => {});
  }, [username]);

  // Auto-size title + subtitle textareas on mount so existing drafts aren't clipped
  useEffect(() => {
    const title = mobileTitleRef.current;
    if (title && title.value) { title.style.height = "auto"; title.style.height = title.scrollHeight + "px"; }
    const excerpt = mobileExcerptRef.current;
    if (excerpt && excerpt.value) { excerpt.style.height = "auto"; excerpt.style.height = excerpt.scrollHeight + "px"; }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to editor transactions so toolbar active-states stay in sync
  useEffect(() => {
    if (!mobileEditor) return;
    const handler = () => setEditorVersion(v => v + 1);
    mobileEditor.on("transaction", handler);
    return () => { mobileEditor.off("transaction", handler); };
  }, [mobileEditor]);

  // Load AI chat + session history on mount
  useEffect(() => {
    const pid = postId ?? "new";
    // localStorage is the fast-access layer for the active chat — keyed by user+post to prevent cross-user leakage
    let restoredFromLocal = false;
    try {
      const chat = localStorage.getItem(`ai-chat-${username}-${pid}`);
      if (chat) { setAiMessages(JSON.parse(chat)); restoredFromLocal = true; }
    } catch { /* ignore */ }
    // Archived sessions + DB backup of active chat
    fetch(`/api/ai/history?postId=${pid}`)
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.sessions)) setAiSessions(d.sessions);
        // If localStorage was empty (cleared / different device), restore from DB backup
        if (!restoredFromLocal && Array.isArray(d.current) && d.current.length > 0) {
          setAiMessages(d.current);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist current chat — localStorage for speed, DB for durability
  useEffect(() => {
    const key = `ai-chat-${username}-${postId ?? "new"}`;
    if (aiMessages.length > 0) {
      localStorage.setItem(key, JSON.stringify(aiMessages));
      // Fire-and-forget DB backup so chat survives browser clears and device switches
      fetch("/api/ai/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: postId ?? "new", current: aiMessages }),
      }).catch(() => {});
    } else {
      localStorage.removeItem(key);
    }
  }, [aiMessages, postId, username]);

  // ── Session management ────────────────────────────────────
  // Saves sessions to DB — permanent storage, only the author can delete
  const persistSessions = (sessions: ChatSession[], pid: number | undefined) => {
    fetch("/api/ai/history", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ postId: pid ?? "new", sessions }),
    }).catch(() => {});
  };

  const archiveCurrent = (msgs: AiMsg[], sessions: ChatSession[], pid: number | undefined): ChatSession[] => {
    if (msgs.length === 0) return sessions;
    const preview = msgs.find(m => m.role === "user")?.content.slice(0, 90) ?? "Conversation";
    const session: ChatSession = { id: Date.now().toString(), createdAt: Date.now(), preview, messages: msgs };
    const updated = [session, ...sessions].slice(0, 30);
    // Save archived sessions and clear the active-chat DB backup in one request
    fetch("/api/ai/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId: pid ?? "new", sessions: updated, current: [] }),
    }).catch(() => {});
    return updated;
  };

  const startNewChat = () => {
    const updated = archiveCurrent(aiMessages, aiSessions, postId);
    setAiSessions(updated);
    setAiMessages([]);
    setAiView("chat");
  };

  const resumeSession = (session: ChatSession) => {
    const updated = archiveCurrent(aiMessages, aiSessions.filter(s => s.id !== session.id), postId);
    setAiSessions(updated);
    setAiMessages(session.messages);
    setAiView("chat");
  };

  const deleteSession = (id: string) => {
    const updated = aiSessions.filter(s => s.id !== id);
    setAiSessions(updated);
    persistSessions(updated, postId); // empty array → API deletes the key
  };

  // Auto-scroll AI chat to latest message
  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Drag-to-resize the mobile AI drawer
  useEffect(() => {
    const el = aiHandleRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      aiDragRef.current = { isDragging: true, startY: e.touches[0].clientY, startH: drawerHeightRef.current };
    };
    const onMove = (e: TouchEvent) => {
      if (!aiDragRef.current.isDragging) return;
      e.preventDefault();
      const dy = aiDragRef.current.startY - e.touches[0].clientY;
      const viewportH = window.visualViewport?.height || window.innerHeight;
      const newH = Math.min(85, Math.max(25, aiDragRef.current.startH + (dy / viewportH) * 100));
      setDrawerHeight(newH);
    };
    const onEnd = () => { aiDragRef.current.isDragging = false; };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove",  onMove,  { passive: false });
    el.addEventListener("touchend",   onEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove",  onMove);
      el.removeEventListener("touchend",   onEnd);
    };
  }, [aiOpen]);

  // ── AI chat ──────────────────────────────────────────────
  const sendAiMessage = useCallback(async () => {
    const msg = aiInput.trim();
    if (!msg || aiLoading) return;

    const userMsg   = { role: "user"      as const, content: msg };
    const botMsg    = { role: "assistant" as const, content: "" };
    const history   = [...aiMessages, userMsg];

    setAiMessages([...history, botMsg]);
    setAiInput("");
    setAiLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Only send post content when the author explicitly enables the toggle
        body: JSON.stringify({ messages: history, ...(aiSharePost ? { title, content } : {}) }),
      });

      if (!res.ok || !res.body) {
        setAiMessages(prev => { const a = [...prev]; a[a.length - 1] = { ...a[a.length - 1], content: "Sorry, something went wrong." }; return a; });
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setAiMessages(prev => { const a = [...prev]; a[a.length - 1] = { ...a[a.length - 1], content: a[a.length - 1].content + chunk }; return a; });
      }
    } catch {
      setAiMessages(prev => { const a = [...prev]; a[a.length - 1] = { ...a[a.length - 1], content: "Network error. Try again." }; return a; });
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, aiLoading, aiMessages, title, content]);

  // ── Save logic ──────────────────────────────────────────
  const performSave = useCallback(async (options: { publish?: boolean; silent?: boolean } = {}) => {
    if (!title.trim()) return false;
    const willPublish = options.publish ?? published;
    if (willPublish && (!content.trim() || content === "<p></p>")) return false;
    if (options.silent) setAutoSaving(true);
    else { setError(""); setSaving(true); }

    const body = { title, content, excerpt, coverImage, published: options.publish ?? published, featured, showUpdatedNotice, categoryIds: selectedCats, notifySubscribers };
    const url    = postId ? `/api/posts/${postId}` : "/api/posts";
    const method = postId ? "PUT" : "POST";

    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        const data = await res.json();
        if (data.slug) setPostSlug(data.slug);
        const willShowOverlay = options.publish === true && !!data.slug;
        if (!postId) {
          setPostId(data.id);
          if (willShowOverlay) {
            // Update URL without navigating — router.push would unmount the
            // component before the overlay can render
            window.history.replaceState({}, "", `/${username}/inkwell/posts/${data.id}`);
          } else {
            if (options.silent) router.replace(`/${username}/inkwell/posts/${data.id}`);
            else router.push(`/${username}/inkwell/posts/${data.id}`);
          }
        }
        if (options.publish !== undefined) setPublished(options.publish);
        setLastSaved(new Date());
        if (!options.silent) {
          setSaved(true); setSheetOpen(false);
          setTimeout(() => setSaved(false), 3000);
          if (willShowOverlay) setPublishedSlug(data.slug);
        }
        return true;
      } else {
        if (!options.silent) { const d = await res.json(); setError(d.error || "Something went wrong."); }
        return false;
      }
    } catch {
      if (!options.silent) setError("Network error. Try again.");
      return false;
    } finally {
      if (options.silent) setAutoSaving(false);
      else setSaving(false);
    }
  }, [title, content, excerpt, coverImage, published, featured, showUpdatedNotice, selectedCats, postId, router, notifySubscribers]);

  // Always keep a ref to the latest performSave so the unmount cleanup can use it
  const performSaveRef = useRef(performSave);
  useEffect(() => { performSaveRef.current = performSave; }, [performSave]);

  // Save immediately when navigating away (covers pressing Back before the debounce fires)
  useEffect(() => {
    return () => { performSaveRef.current({ silent: true }); };
  }, []);

  // Auto-save: 1.5 s after last change (title alone is enough for a draft)
  useEffect(() => {
    if (!title.trim()) return;
    const t = setTimeout(() => performSave({ silent: true }), 1500);
    return () => clearTimeout(t);
  }, [performSave]);

  const save = async (publish?: boolean) => {
    if (!title.trim()) { setError("Add a title first."); return; }
    if (publish && (!content.trim() || content === "<p></p>")) { setError("Write something first before publishing."); return; }
    await performSave({ publish });
  };

  // ── Image upload ─────────────────────────────────────────
  // Compress image client-side so phone photos (often 5-15 MB) fit within
  // Vercel's 4.5 MB serverless body limit before hitting the upload route.
  const compressImage = (file: File): Promise<File> =>
    new Promise((resolve) => {
      const MAX = 3.5 * 1024 * 1024; // 3.5 MB target
      if (file.size <= MAX) { resolve(file); return; }
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const ratio = Math.sqrt(MAX / file.size);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.floor(img.width  * ratio);
        canvas.height = Math.floor(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(new File([blob!], file.name, { type: "image/jpeg" })),
          "image/jpeg", 0.85
        );
      };
      img.src = url;
    });

  const uploadCover = async (file: File) => {
    setUploading(true); setError("");
    let res: Response | undefined;
    try {
      const compressed = await compressImage(file);
      const fd = new FormData(); fd.append("file", compressed);
      res = await fetch("/api/upload", { method: "POST", body: fd });
    } catch {
      setUploading(false);
      setError("Network error — could not reach the server.");
      return;
    }
    try {
      const data = await res.json();
      if (res.ok) setCoverImage(data.url);
      else setError(data.error || `Upload failed (${res.status}).`);
    } catch {
      setError(`Server error (HTTP ${res.status}) — please try again.`);
    }
    setUploading(false);
  };

  const uploadBodyImage = useCallback(async (file: File) => {
    if (!mobileEditor) return;
    const fd = new FormData(); fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) { const { url } = await res.json(); mobileEditor.chain().focus().setImage({ src: url }).run(); return; }
    } catch { /* fall through */ }
    const reader = new FileReader();
    reader.onload = e => { if (e.target?.result) mobileEditor.chain().focus().setImage({ src: e.target.result as string }).run(); };
    reader.readAsDataURL(file);
  }, [mobileEditor]);

  const submitMobileUrl = useCallback(() => {
    if (!mobileEditor || !mobileUrlMode) return;
    const val = mobileUrlValue.trim();
    if (mobileUrlMode === "link") {
      if (!val) mobileEditor.chain().focus().extendMarkRange("link").unsetLink().run();
      else mobileEditor.chain().focus().extendMarkRange("link").setLink({ href: val }).run();
    } else if (mobileUrlMode === "youtube") {
      const m = val.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (m) mobileEditor.chain().focus().insertContent({ type: "youtubeEmbed", attrs: { videoId: m[1] } }).run();
    } else {
      if (val) mobileEditor.chain().focus().setImage({ src: val }).run();
    }
    setMobileUrlMode(null); setMobileUrlValue("");
    mobileEditor.commands.focus();
  }, [mobileEditor, mobileUrlMode, mobileUrlValue]);

  const toggleCat = (id: number) =>
    setSelectedCats(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const isEdit = !!postId;

  // ── Sidebar styles (desktop) ──────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--admin-bg-card)",
    border: "1px solid color-mix(in srgb, var(--admin-primary) 15%, transparent)", borderRadius: 8,
    padding: "0.875rem 1rem", fontFamily: "Inter, sans-serif",
    fontSize: "0.95rem", color: "var(--admin-primary)", outline: "none", boxSizing: "border-box",
  };
  const labelStyle: React.CSSProperties = {
    display: "block", fontFamily: "Inter, sans-serif", fontSize: "0.7rem",
    letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-sidebar-muted)", marginBottom: "0.4rem",
  };

  // ── Status pill content ───────────────────────────────────
  const statusText = error
    ? "Error"
    : saved ? "Saved"
    : autoSaving ? "Saving…"
    : lastSaved ? `Saved ${timeSince(lastSaved)}`
    : published ? "Published" : "Draft";
  const statusDot = saved || lastSaved ? "var(--admin-accent)" : "var(--admin-sidebar-muted)";

  return (
    <>
      {/* ── Publish success overlay ── */}
      {publishedSlug && (
        <PublishSuccessOverlay
          slug={publishedSlug}
          title={title}
          excerpt={excerpt}
          coverImage={coverImage}
          content={content}
          onDismiss={() => setPublishedSlug(null)}
          username={username}
          siteName={themeBranding.siteName}
          colorAccent={themeBranding.colorAccent}
          colorPrimary={themeBranding.colorPrimary}
          fontHeading={themeBranding.fontHeading}
        />
      )}

      {/* ════════════════════════════════════
          MOBILE — Substack-style full canvas
      ════════════════════════════════════ */}
      <div className="mobile-write-wrap" style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>

        {/* Backdrop for dropdowns */}
        {(styleOpen || alignOpen || catPickerOpen) && (
          <div onClick={() => { setStyleOpen(false); setAlignOpen(false); setCatPickerOpen(false); }}
            style={{ position: "fixed", inset: 0, zIndex: 310 }} />
        )}

        {/* ── Top bar ─────────────────────────────── */}
        <div style={{
          height: 52, display: "flex", alignItems: "center",
          padding: "0 12px", gap: 8,
          borderBottom: "1px solid rgba(0,0,0,0.07)",
          background: "#fff", flexShrink: 0,
        }}>
          <button
            onClick={() => router.back()}
            style={{ background: "none", border: "none", color: "#555", padding: "8px 4px", cursor: "pointer", fontSize: "1.3rem", lineHeight: 1, display: "flex", alignItems: "center" }}
          >‹</button>

          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              border: `1px solid ${error ? "rgba(192,64,64,0.3)" : "rgba(0,0,0,0.15)"}`,
              borderRadius: 20, padding: "4px 12px",
              fontFamily: "system-ui, sans-serif", fontSize: "0.78rem",
              color: error ? "#c04040" : "#333",
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: error ? "#e07070" : statusDot,
                transition: "background 0.3s",
              }} />
              {statusText}
            </span>
          </div>

          <button
            onClick={() => setAiOpen(o => !o)}
            title="AI assistant"
            style={{
              background: aiOpen ? "var(--admin-accent)" : "color-mix(in srgb, var(--admin-primary) 8%, transparent)",
              color: aiOpen ? "var(--admin-primary)" : "#555",
              border: "none", borderRadius: 8,
              padding: "8px 12px",
              fontFamily: "system-ui, sans-serif",
              fontSize: "0.88rem", fontWeight: 600,
              cursor: "pointer", lineHeight: 1,
            }}
          >🧠</button>

          <button
            onClick={() => setSheetOpen(true)}
            style={{
              background: "var(--admin-primary)", color: "var(--admin-accent)",
              border: "none", borderRadius: 8,
              padding: "8px 18px",
              fontFamily: "system-ui, sans-serif",
              fontSize: "0.875rem", fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.02em",
            }}
          >Next</button>
        </div>

        {/* ── Toolbar ─────────────────────────────── */}
        {mobileUrlMode ? (
          /* URL input replaces toolbar row */
          <div style={{
            height: 48, display: "flex", alignItems: "center", gap: 8,
            padding: "0 12px", borderBottom: "1px solid rgba(0,0,0,0.07)",
            background: "#fff", flexShrink: 0,
          }}>
            <input
              autoFocus
              value={mobileUrlValue}
              onChange={e => setMobileUrlValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { e.preventDefault(); submitMobileUrl(); }
                if (e.key === "Escape") { setMobileUrlMode(null); setMobileUrlValue(""); }
              }}
              placeholder={mobileUrlMode === "link" ? "Paste a link URL…" : mobileUrlMode === "youtube" ? "Paste YouTube URL…" : "Paste image URL…"}
              style={{
                flex: 1, background: "#f5f5f5", border: "none",
                borderRadius: 6, padding: "8px 12px",
                fontFamily: "system-ui, sans-serif", fontSize: "0.875rem",
                outline: "none", color: "#1a1a1a",
              }}
            />
            <button
              onPointerDown={e => { e.preventDefault(); submitMobileUrl(); }}
              style={{
                background: "var(--admin-primary)", color: "var(--admin-accent)",
                border: "none", borderRadius: 6,
                padding: "7px 14px",
                fontFamily: "system-ui, sans-serif", fontSize: "0.82rem",
                fontWeight: 700, cursor: "pointer", flexShrink: 0,
              }}
            >{mobileUrlMode === "link" ? "Add Link" : mobileUrlMode === "youtube" ? "Embed" : "Insert"}</button>
            <button
              onPointerDown={e => { e.preventDefault(); setMobileUrlMode(null); setMobileUrlValue(""); }}
              style={{ background: "none", border: "none", color: "#888", fontSize: "1.1rem", cursor: "pointer", padding: "4px", flexShrink: 0 }}
            >✕</button>
          </div>
        ) : (
          /* Outer wrapper: position relative, NO overflow — lets dropdowns escape the scroll container */
          <div style={{ position: "relative", flexShrink: 0, background: "#fff", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            {/* Scrollable inner row — only buttons here, not dropdown panels */}
            <div style={{
              height: 44, display: "flex", alignItems: "center",
              padding: "0 4px",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}>
              {/* Undo / Redo */}
              {TB("↩", () => mobileEditor?.chain().focus().undo().run())}
              {TB("↪", () => mobileEditor?.chain().focus().redo().run())}
              <TSep />

              {/* Style trigger — panel is a sibling of this scroll div, not a child */}
              <button
                onClick={() => { setStyleOpen(s => !s); setAlignOpen(false); setCatPickerOpen(false); }}
                style={{
                  height: 38, padding: "0 9px",
                  background: styleOpen ? "color-mix(in srgb, var(--admin-primary) 8%, transparent)" : "transparent", color: "#1a1a1a",
                  border: "none", borderRadius: 4, cursor: "pointer",
                  fontSize: "0.82rem", fontFamily: "system-ui, sans-serif",
                  display: "flex", alignItems: "center", gap: 4,
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                  flexShrink: 0,
                }}
              >Style <span style={{ fontSize: "0.6rem" }}>▾</span></button>
              <TSep />

              {/* Inline formatting (B/I/U/S/Mark handled by Editor's selection bar above keyboard) */}
              {TB("</>",  () => mobileEditor?.chain().focus().toggleCode().run(),       mobileEditor?.isActive("code"),      { fontFamily: "monospace", fontSize: "0.75rem" })}
              <TSep />

              {/* Align trigger — panel is a sibling of this scroll div, not a child */}
              <button
                onClick={() => { setAlignOpen(s => !s); setStyleOpen(false); setCatPickerOpen(false); }}
                style={{
                  height: 38, padding: "0 9px",
                  background: alignOpen ? "color-mix(in srgb, var(--admin-primary) 8%, transparent)" : "transparent",
                  color: "#1a1a1a", border: "none", borderRadius: 4, cursor: "pointer",
                  fontSize: "0.82rem", fontFamily: "system-ui, sans-serif",
                  display: "flex", alignItems: "center", gap: 4,
                  touchAction: "manipulation", WebkitTapHighlightColor: "transparent", flexShrink: 0,
                }}
              >Align <span style={{ fontSize: "0.6rem" }}>▾</span></button>
              <TSep />

              {/* Link */}
              {TB("🔗", () => {
                const href = mobileEditor?.getAttributes("link").href || "";
                setMobileUrlValue(href);
                setMobileUrlMode("link");
              }, mobileEditor?.isActive("link"))}

              {/* Image from gallery */}
              <button
                onPointerDown={e => { e.preventDefault(); bodyImgRef.current?.click(); }}
                style={{ height: 38, padding: "0 9px", background: "transparent", color: "#1a1a1a", border: "none", borderRadius: 4, cursor: "pointer", fontSize: "0.9rem", flexShrink: 0, display: "flex", alignItems: "center", touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
              >📷</button>

              {/* Image by URL */}
              {TB("Img", () => { setMobileUrlValue(""); setMobileUrlMode("image"); }, mobileUrlMode === "image")}
              {/* YouTube embed */}
              {TB("▶ YT", () => { setMobileUrlValue(""); setMobileUrlMode("youtube"); }, mobileUrlMode === "youtube")}
              <TSep />

              {/* Lists + blocks */}
              {TB("•",  () => mobileEditor?.chain().focus().toggleBulletList().run(),  mobileEditor?.isActive("bulletList"))}
              {TB("1.", () => mobileEditor?.chain().focus().toggleOrderedList().run(), mobileEditor?.isActive("orderedList"))}
              {TB("❝",  () => mobileEditor?.chain().focus().toggleBlockquote().run(), mobileEditor?.isActive("blockquote"))}
              {TB("—",  () => mobileEditor?.chain().focus().setHorizontalRule().run())}
            </div>

            {/* Style dropdown — rendered outside scroll container so overflow doesn't clip it */}
            {styleOpen && (
              <div style={{
                position: "absolute", top: 44, left: 0,
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 8,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                minWidth: 170, zIndex: 330, overflow: "hidden",
              }}>
                {[
                  { label: "Normal text", fs: "0.95rem", fw: 400, action: () => mobileEditor?.chain().focus().setParagraph().run() },
                  { label: "Heading 1",   fs: "1.3rem",  fw: 700, action: () => mobileEditor?.chain().focus().toggleHeading({ level: 1 }).run() },
                  { label: "Heading 2",   fs: "1.1rem",  fw: 700, action: () => mobileEditor?.chain().focus().toggleHeading({ level: 2 }).run() },
                  { label: "Heading 3",   fs: "0.95rem", fw: 600, action: () => mobileEditor?.chain().focus().toggleHeading({ level: 3 }).run() },
                ].map(item => (
                  <button
                    key={item.label}
                    onPointerDown={e => { e.preventDefault(); item.action(); setStyleOpen(false); }}
                    style={{
                      display: "block", width: "100%", padding: "10px 16px",
                      background: "none", border: "none", textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: item.fs, fontWeight: item.fw, color: "#1a1a1a",
                      borderBottom: "1px solid rgba(0,0,0,0.05)",
                    }}
                  >{item.label}</button>
                ))}
              </div>
            )}

            {/* Align dropdown — rendered outside scroll container so overflow doesn't clip it */}
            {alignOpen && (
              <div style={{
                position: "absolute", top: 44, left: 0,
                background: "#fff", border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                minWidth: 130, zIndex: 330, overflow: "hidden",
              }}>
                {[
                  { label: "⬅ Left",   action: () => mobileEditor?.chain().focus().setTextAlign("left").run()   },
                  { label: "↔ Center", action: () => mobileEditor?.chain().focus().setTextAlign("center").run() },
                  { label: "➡ Right",  action: () => mobileEditor?.chain().focus().setTextAlign("right").run()  },
                ].map(item => (
                  <button
                    key={item.label}
                    onPointerDown={e => { e.preventDefault(); item.action(); setAlignOpen(false); }}
                    style={{
                      display: "block", width: "100%", padding: "10px 16px",
                      background: "none", border: "none", textAlign: "left",
                      cursor: "pointer", fontFamily: "system-ui, sans-serif",
                      fontSize: "0.88rem", color: "#1a1a1a",
                      borderBottom: "1px solid rgba(0,0,0,0.05)",
                    }}
                  >{item.label}</button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Scrollable writing canvas ──────────────── */}
        <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>

          {/* Title */}
          <textarea
            ref={mobileTitleRef}
            value={title}
            onChange={e => {
              setTitle(e.target.value);
              if (error) setError("");
              const t = e.target; t.style.height = "auto"; t.style.height = t.scrollHeight + "px";
            }}
            placeholder="Title"
            rows={1}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "transparent", border: "none", outline: "none", resize: "none",
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "2.25rem", fontWeight: 700, color: "#1a1a1a",
              lineHeight: 1.2, padding: "20px 16px 6px",
              overflowY: "hidden",
            }}
          />

          {/* Subtitle / Excerpt */}
          <textarea
            ref={mobileExcerptRef}
            value={excerpt}
            onChange={e => {
              setExcerpt(e.target.value);
              const t = e.target; t.style.height = "auto"; t.style.height = t.scrollHeight + "px";
            }}
            placeholder="Add a subtitle…"
            rows={1}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "transparent", border: "none", outline: "none", resize: "none",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "1.05rem", color: "#888", lineHeight: 1.5,
              padding: "0 16px 12px", overflowY: "hidden",
            }}
          />

          {/* Category chips */}
          {(categories.length > 0 || selectedCats.length > 0) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 12px", alignItems: "center" }}>
              {selectedCats.map(id => {
                const cat = categories.find(c => c.id === id);
                if (!cat) return null;
                return (
                  <span key={id} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "rgba(0,0,0,0.05)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 20, padding: "3px 8px 3px 10px",
                    fontFamily: "system-ui, sans-serif", fontSize: "0.78rem", color: "#444",
                  }}>
                    {cat.name}
                    <button
                      onPointerDown={e => { e.preventDefault(); toggleCat(id); }}
                      style={{ background: "rgba(0,0,0,0.12)", border: "none", borderRadius: "50%", width: 16, height: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#555", fontSize: "0.65rem", padding: 0 }}
                    >✕</button>
                  </span>
                );
              })}
              {/* + to open category picker */}
              <div style={{ position: "relative", zIndex: 320 }}>
                <button
                  onPointerDown={e => { e.preventDefault(); setCatPickerOpen(o => !o); setStyleOpen(false); }}
                  style={{
                    width: 26, height: 26, borderRadius: "50%",
                    background: "rgba(0,0,0,0.05)",
                    border: "1px solid rgba(0,0,0,0.1)",
                    color: "#555", cursor: "pointer",
                    fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center",
                    touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                  }}
                >+</button>
                {catPickerOpen && (
                  <div style={{
                    position: "absolute", top: "100%", left: 0,
                    background: "#fff", border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    minWidth: 160, zIndex: 320, overflow: "hidden",
                  }}>
                    {categories.filter(c => !selectedCats.includes(c.id)).length === 0 ? (
                      <p style={{ padding: "10px 14px", color: "#999", fontFamily: "system-ui, sans-serif", fontSize: "0.8rem", margin: 0 }}>
                        All categories added
                      </p>
                    ) : categories.filter(c => !selectedCats.includes(c.id)).map(cat => (
                      <button
                        key={cat.id}
                        onPointerDown={e => { e.preventDefault(); toggleCat(cat.id); setCatPickerOpen(false); }}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          width: "100%", padding: "10px 14px",
                          background: "none", border: "none",
                          textAlign: "left", cursor: "pointer",
                          fontFamily: "system-ui, sans-serif", fontSize: "0.875rem",
                          color: "#1a1a1a", borderBottom: "1px solid rgba(0,0,0,0.05)",
                        }}
                      >
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Divider before body */}
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 0 4px" }} />

          {/* Body editor — compact, borderless */}
          <Editor
            content={content}
            onChange={setContent}
            placeholder="Start writing…"
            compact
            onEditorReady={setMobileEditor}
          />
        </div>

        {/* ── Bottom bar ──────────────────────────────── */}
        <div style={{
          height: 44, display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "0 12px",
          borderTop: "1px solid rgba(0,0,0,0.07)",
          background: "#fff", flexShrink: 0,
        }}>
          {/* Word count — live feedback for the writer */}
          <span style={{
            fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "#aaa",
            letterSpacing: "0.02em",
          }}>
            {mobileEditor?.storage.characterCount.words() ?? 0} words
          </span>

        </div>

        {/* Body image hidden input */}
        <input ref={bodyImgRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadBodyImage(f); e.target.value = ""; }}
        />

        {/* ── Mobile AI drawer ─────────────────────── */}
        {aiOpen && !isDesktop && (
          <>
            <div
              onClick={() => setAiOpen(false)}
              style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, var(--admin-primary) 45%, transparent)", zIndex: 410, backdropFilter: "blur(2px)" }}
            />
            <div style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 411,
              background: "var(--admin-primary)", borderRadius: "18px 18px 0 0",
              boxShadow: "0 -8px 40px color-mix(in srgb, var(--admin-primary) 40%, transparent)",
              height: `${drawerHeight}dvh`, display: "flex", flexDirection: "column",
              overflow: "hidden",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}>
              {/* Drag handle — touch here to resize */}
              <div
                ref={aiHandleRef}
                style={{ display: "flex", justifyContent: "center", padding: "0.875rem 0 0.5rem", cursor: "ns-resize", touchAction: "none", flexShrink: 0 }}
              >
                <div style={{ width: 40, height: 5, background: "color-mix(in srgb, var(--admin-accent) 50%, transparent)", borderRadius: 3 }} />
              </div>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.25rem 1.25rem 0.625rem", borderBottom: "1px solid color-mix(in srgb, var(--admin-accent) 12%, transparent)", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1rem" }}>🧠</span>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "var(--admin-bg-card)", margin: 0 }}>
                    {aiView === "history" ? "History" : "AI Assistant"}
                  </h3>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {aiView === "chat" ? (
                    <>
                      <button
                        onClick={() => setAiSharePost(s => !s)}
                        title={aiSharePost ? "AI can see this post — tap to hide" : "Tap to let AI read this post"}
                        style={{
                          background: aiSharePost ? "color-mix(in srgb, var(--admin-accent) 18%, transparent)" : "transparent",
                          border: `1px solid ${aiSharePost ? "color-mix(in srgb, var(--admin-accent) 50%, transparent)" : "color-mix(in srgb, var(--admin-accent) 18%, transparent)"}`,
                          color: aiSharePost ? "var(--admin-accent)" : "var(--admin-sidebar-muted)",
                          borderRadius: 5, padding: "2px 7px",
                          fontFamily: "Inter, sans-serif", fontSize: "0.65rem",
                          cursor: "pointer", letterSpacing: "0.02em", whiteSpace: "nowrap",
                        }}
                      >
                        📄 {aiSharePost ? "Post shared" : "Share post"}
                      </button>
                      {aiSessions.length > 0 && (
                        <button onClick={() => setAiView("history")} style={{ background: "none", border: "none", color: "var(--admin-sidebar-muted)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.04em" }}>
                          History ({aiSessions.length})
                        </button>
                      )}
                      {aiMessages.length > 0 && (
                        <button onClick={startNewChat} style={{ background: "color-mix(in srgb, var(--admin-accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)", borderRadius: 6, color: "var(--admin-accent)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "Inter, sans-serif", padding: "3px 10px" }}>
                          New chat
                        </button>
                      )}
                    </>
                  ) : (
                    <button onClick={() => setAiView("chat")} style={{ background: "none", border: "none", color: "var(--admin-accent)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                      ← Back
                    </button>
                  )}
                  <button onClick={() => setAiOpen(false)} style={{ background: "none", border: "none", color: "var(--admin-sidebar-muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
                </div>
              </div>
              {/* Body */}
              <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem", position: "relative" }}>
                {userPlan === "free" ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: "1rem" }}>
                    <div style={{ textAlign: "center" }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--admin-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "0.75rem" }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "var(--admin-bg-card)", margin: "0 0 0.5rem" }}>AI Writing Assistant</p>
                      <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.78rem", fontStyle: "italic", color: "var(--admin-sidebar-muted)", margin: "0 0 0.35rem" }}>Premium feature</p>
                      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "var(--admin-sidebar-muted)", margin: "0 0 1rem", opacity: 0.75 }}>First month free · then $9/mo</p>
                      <button onClick={async () => {
                        const res = await fetch("/api/billing/checkout", { method: "POST" });
                        const d = await res.json();
                        if (d.url) window.location.href = d.url;
                      }} style={{ background: "var(--admin-accent)", color: "var(--admin-primary)", border: "none", borderRadius: 3, padding: "0.6rem 1.25rem", fontFamily: "Inter, sans-serif", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                        Start free trial
                      </button>
                    </div>
                  </div>
                ) : aiView === "history" ? (
                  <AiHistoryView sessions={aiSessions} onResume={resumeSession} onDelete={deleteSession} />
                ) : (
                  <>
                    {aiMessages.length === 0 && (
                      <div style={{ textAlign: "center", padding: "2rem 0" }}>
                        <p style={{ color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", lineHeight: 1.6, margin: 0 }}>
                          Your thinking partner — brainstorm,<br />research, challenge ideas.
                        </p>
                      </div>
                    )}
                    {aiMessages.map((m, i) => (
                      <AiMessage key={i} role={m.role} content={m.content} />
                    ))}
                    {aiLoading && aiMessages[aiMessages.length - 1]?.content === "" && (
                      <AiTypingDot />
                    )}
                    <div ref={aiEndRef} />
                  </>
                )}
              </div>
              {/* Input — only in chat view */}
              {aiView === "chat" && <AiInput value={aiInput} onChange={setAiInput} onSend={sendAiMessage} loading={aiLoading} />}
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════════
          DESKTOP — two-column layout
      ════════════════════════════════════ */}
      <div className={`desktop-write-wrap${aiOpen ? " ai-open" : ""}`} style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 270px", gap: "2rem", alignItems: "start" }}>

          {/* Editor column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <input value={title} onChange={e => { setTitle(e.target.value); if (error) setError(""); }} placeholder="Post Title"
              style={{ ...inputStyle, fontFamily: "'Playfair Display', serif", fontSize: "1.6rem", fontWeight: 700, padding: "1rem 1.25rem", border: "none", borderBottom: "2px solid color-mix(in srgb, var(--admin-primary) 10%, transparent)", borderRadius: 0, background: "transparent" }}
            />
            <div>
              <label style={labelStyle}>Excerpt <span style={{ color: "var(--admin-accent)" }}>(optional)</span></label>
              <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="A short teaser shown in the post list…" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            <Editor content={content} onChange={setContent} />
            {error && <div style={{ background: "#e0707018", border: "1px solid #e0707030", color: "#c04040", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>{error}</div>}
            {saved && <div style={{ background: "#4a9e7a18", border: "1px solid #4a9e7a30", color: "#2d7a5a", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>✓ Saved</div>}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", position: "sticky", top: "1.5rem" }}>
            <SettingsPanel {...{ published, featured, setFeatured, showUpdatedNotice, setShowUpdatedNotice, save, saving, isEdit, coverImage, setCoverImage, uploading, uploadCover, coverImgRef, categories, selectedCats, toggleCat, inputStyle, labelStyle, postSlug, notifySubscribers, setNotifySubscribers, username }} />
            {/* AI toggle */}
            <button
              onClick={() => setAiOpen(o => !o)}
              style={{
                width: "100%", background: aiOpen ? "var(--admin-primary)" : "color-mix(in srgb, var(--admin-primary) 4%, transparent)",
                color: aiOpen ? "var(--admin-accent)" : "var(--admin-primary)",
                border: `1px solid ${aiOpen ? "var(--admin-primary)" : "color-mix(in srgb, var(--admin-primary) 15%, transparent)"}`,
                borderRadius: 8, padding: "0.75rem",
                fontFamily: "Inter, sans-serif", fontSize: "0.875rem", fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                transition: "background 0.2s, color 0.2s",
              }}
            >
              <span style={{ fontSize: "1rem" }}>🧠</span>
              {aiOpen ? "Close AI" : "AI Assistant"}
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════
          DESKTOP AI PANEL — fixed right sidebar
      ════════════════════════════════════ */}
      {aiOpen && isDesktop && (
        <div className="desktop-ai-panel" style={{
          position: "fixed", top: 0, right: 0, bottom: 0, width: "min(380px, 35vw)", zIndex: 350,
          background: "var(--admin-primary)", display: "flex", flexDirection: "column",
          boxShadow: "-6px 0 32px color-mix(in srgb, var(--admin-primary) 25%, transparent)",
        }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.25rem 1rem", borderBottom: "1px solid color-mix(in srgb, var(--admin-accent) 12%, transparent)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.1rem" }}>🧠</span>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1rem", color: "var(--admin-bg-card)", margin: 0 }}>
                {aiView === "history" ? "History" : "AI Assistant"}
              </h3>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              {aiView === "chat" ? (
                <>
                  <button
                    onClick={() => setAiSharePost(s => !s)}
                    title={aiSharePost ? "AI can see this post — click to hide" : "Click to let AI read this post"}
                    style={{
                      background: aiSharePost ? "color-mix(in srgb, var(--admin-accent) 18%, transparent)" : "transparent",
                      border: `1px solid ${aiSharePost ? "color-mix(in srgb, var(--admin-accent) 50%, transparent)" : "color-mix(in srgb, var(--admin-accent) 18%, transparent)"}`,
                      color: aiSharePost ? "var(--admin-accent)" : "var(--admin-sidebar-muted)",
                      borderRadius: 5, padding: "2px 8px",
                      fontFamily: "Inter, sans-serif", fontSize: "0.68rem",
                      cursor: "pointer", letterSpacing: "0.02em", whiteSpace: "nowrap",
                    }}
                  >
                    📄 {aiSharePost ? "Post shared" : "Share post"}
                  </button>
                  {aiSessions.length > 0 && (
                    <button onClick={() => setAiView("history")} style={{ background: "none", border: "none", color: "var(--admin-sidebar-muted)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "Inter, sans-serif", letterSpacing: "0.04em" }}>
                      History ({aiSessions.length})
                    </button>
                  )}
                  {aiMessages.length > 0 && (
                    <button onClick={startNewChat} style={{ background: "color-mix(in srgb, var(--admin-accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)", borderRadius: 6, color: "var(--admin-accent)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "Inter, sans-serif", padding: "3px 10px" }}>
                      New chat
                    </button>
                  )}
                </>
              ) : (
                <button onClick={() => setAiView("chat")} style={{ background: "none", border: "none", color: "var(--admin-accent)", fontSize: "0.72rem", cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
                  ← Back
                </button>
              )}
              <button onClick={() => setAiOpen(false)} style={{ background: "none", border: "none", color: "var(--admin-sidebar-muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
          </div>
          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {userPlan === "free" ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", padding: "1rem" }}>
                <div style={{ textAlign: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--admin-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "0.75rem" }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  <p style={{ fontFamily: "'Playfair Display', serif", fontSize: "0.95rem", color: "var(--admin-bg-card)", margin: "0 0 0.5rem" }}>AI Writing Assistant</p>
                  <p style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.78rem", fontStyle: "italic", color: "var(--admin-sidebar-muted)", margin: "0 0 1rem" }}>Premium feature</p>
                  <button onClick={async () => {
                    const res = await fetch("/api/billing/checkout", { method: "POST" });
                    const d = await res.json();
                    if (d.url) window.location.href = d.url;
                  }} style={{ background: "var(--admin-accent)", color: "var(--admin-primary)", border: "none", borderRadius: 3, padding: "0.6rem 1.25rem", fontFamily: "Inter, sans-serif", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>
                    Get Premium
                  </button>
                </div>
              </div>
            ) : aiView === "history" ? (
              <AiHistoryView sessions={aiSessions} onResume={resumeSession} onDelete={deleteSession} />
            ) : (
              <>
                {aiMessages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                    <p style={{ color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", lineHeight: 1.7, margin: 0 }}>
                      Your thinking partner — brainstorm,<br />research, challenge ideas.
                    </p>
                  </div>
                )}
                {aiMessages.map((m, i) => (
                  <AiMessage key={i} role={m.role} content={m.content} />
                ))}
                {aiLoading && aiMessages[aiMessages.length - 1]?.content === "" && (
                  <AiTypingDot />
                )}
                <div ref={aiEndRef} />
              </>
            )}
          </div>
          {/* Input — only in chat view and for premium users */}
          {aiView === "chat" && userPlan !== "free" && <AiInput value={aiInput} onChange={setAiInput} onSend={sendAiMessage} loading={aiLoading} />}
        </div>
      )}

      {/* ════════════════════════════════════
          BOTTOM SHEET — publish settings (mobile)
      ════════════════════════════════════ */}
      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, var(--admin-primary) 50%, transparent)", zIndex: 400, backdropFilter: "blur(2px)" }} />
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 401,
            background: "var(--admin-bg-card)", borderRadius: "18px 18px 0 0",
            boxShadow: "0 -8px 40px color-mix(in srgb, var(--admin-primary) 18%, transparent)",
            maxHeight: "88vh", overflowY: "auto",
            paddingBottom: "env(safe-area-inset-bottom)",
          }}>
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "0.875rem 0 0" }}>
              <div style={{ width: 36, height: 4, background: "color-mix(in srgb, var(--admin-primary) 15%, transparent)", borderRadius: 2 }} />
            </div>

            {/* Sheet header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.875rem 1.25rem 0.625rem", borderBottom: "1px solid color-mix(in srgb, var(--admin-primary) 7%, transparent)" }}>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", color: "var(--admin-primary)", margin: 0 }}>
                {published ? "Update post" : "Ready to publish?"}
              </h3>
              <button onClick={() => setSheetOpen(false)} style={{ background: "none", border: "none", color: "var(--admin-sidebar-muted)", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Status badge */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "var(--admin-sidebar-muted)" }}>Status</span>
                <span style={{ background: published ? "#4a9e7a18" : "color-mix(in srgb, var(--admin-accent) 10%, transparent)", color: published ? "#4a9e7a" : "var(--admin-accent)", border: `1px solid ${published ? "#4a9e7a30" : "color-mix(in srgb, var(--admin-accent) 25%, transparent)"}`, padding: "0.2rem 0.875rem", borderRadius: 20, fontFamily: "Inter, sans-serif", fontSize: "0.72rem", textTransform: "uppercase" }}>
                  {published ? "Published" : "Draft"}
                </span>
              </div>

              {/* Share link (when published) */}
              {published && postSlug && <ShareRow slug={postSlug} username={username} />}
              {published && postSlug && <AudioGenPanel />}

              {/* Featured */}
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer" }}>
                <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--admin-accent)" }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "var(--admin-sidebar-muted)" }}>Pin as Featured post</span>
              </label>

              {/* Updated notice — only relevant when editing a published post */}
              {isEdit && published && (
                <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={showUpdatedNotice} onChange={e => setShowUpdatedNotice(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--admin-accent)", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "var(--admin-sidebar-muted)", display: "block" }}>Show &quot;Updated&quot; notice to readers</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "var(--admin-sidebar-muted)" }}>Displays the edit date on the post so readers know it was revised</span>
                  </div>
                </label>
              )}

              {/* Cover image */}
              <div>
                <label style={labelStyle}>Cover Image</label>
                <button
                  onPointerDown={e => { e.preventDefault(); coverImgRef.current?.click(); }}
                  disabled={uploading}
                  style={{ width: "100%", background: uploading ? "color-mix(in srgb, var(--admin-accent) 10%, transparent)" : "color-mix(in srgb, var(--admin-accent) 6%, transparent)", color: "var(--admin-accent)", border: "1.5px dashed color-mix(in srgb, var(--admin-accent) 35%, transparent)", borderRadius: 10, padding: "0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", cursor: uploading ? "default" : "pointer", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  {uploading ? <><SpinnerIcon />Uploading…</> : <>📷 Upload from gallery</>}
                </button>
                <input value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="Or paste image URL…" style={{ ...inputStyle, fontSize: "0.85rem" }} />
                {coverImage && (
                  <div style={{ marginTop: "0.625rem", borderRadius: 8, overflow: "hidden", border: "1px solid color-mix(in srgb, var(--admin-primary) 10%, transparent)", position: "relative" }}>
                    <img src={coverImage} alt="Cover" style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    <button onClick={() => setCoverImage("")} style={{ position: "absolute", top: 8, right: 8, background: "color-mix(in srgb, var(--admin-primary) 70%, transparent)", color: "#fff", border: "none", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                  </div>
                )}
              </div>

              {error && (
                <div style={{ background: "#e0707018", border: "1px solid #e0707030", color: "#c04040", borderRadius: 8, padding: "0.75rem 1rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem" }}>{error}</div>
              )}

              {/* Notify subscribers toggle — only relevant on first publish */}
              {!published && (
                <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={notifySubscribers} onChange={e => setNotifySubscribers(e.target.checked)} style={{ width: 18, height: 18, accentColor: "var(--admin-accent)", marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.88rem", color: "var(--admin-sidebar-muted)", display: "block" }}>Notify subscribers</span>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "var(--admin-sidebar-muted)" }}>Send email to subscribers on publish</span>
                  </div>
                </label>
              )}

              {/* TTS awareness for free users — shown at publish step */}
              {userPlan === "free" && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", padding: "0.75rem", borderRadius: 8, background: "color-mix(in srgb, var(--admin-accent) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)" }}>
                  <span style={{ fontSize: "1rem", flexShrink: 0 }}>🎧</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "var(--admin-primary)", display: "block", marginBottom: "0.2rem" }}>
                      🎧 Audio narration — Premium feature
                    </span>
                    <span style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.75rem", fontStyle: "italic", color: "var(--admin-muted)" }}>
                      Every Premium post gets an auto-generated audio version for your readers.{" "}
                      <button onClick={async () => {
                        const res = await fetch("/api/billing/checkout", { method: "POST" });
                        const d = await res.json();
                        if (d.url) window.location.href = d.url;
                      }} style={{ background: "none", border: "none", color: "var(--admin-accent)", cursor: "pointer", fontFamily: "'Source Serif 4', Georgia, serif", fontSize: "0.75rem", fontStyle: "italic", padding: 0 }}>
                        First month free →
                      </button>
                    </span>
                  </div>
                </div>
              )}

              {/* Publish actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", paddingTop: "0.25rem" }}>
                <button onClick={() => save(true)} disabled={saving} style={{ background: "var(--admin-primary)", color: "var(--admin-accent)", border: "none", borderRadius: 12, padding: "1rem", fontFamily: "Inter, sans-serif", fontSize: "1rem", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Publishing…" : published ? "Update Post" : "Publish Now"}
                </button>
                <button onClick={() => save(false)} disabled={saving} style={{ background: "transparent", color: "var(--admin-primary)", border: "1px solid color-mix(in srgb, var(--admin-primary) 20%, transparent)", borderRadius: 12, padding: "0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", cursor: "pointer" }}>
                  Save as Draft
                </button>
                {isEdit && published && (
                  <button onClick={() => save(false)} disabled={saving} style={{ background: "transparent", color: "#c04040", border: "1px solid rgba(192,64,64,0.25)", borderRadius: 12, padding: "0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.85rem", cursor: "pointer" }}>
                    Unpublish
                  </button>
                )}
                {isEdit && (
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this post? This cannot be undone.")) return;
                      setDeleting(true);
                      await fetch(`/api/posts/${postId}`, { method: "DELETE" });
                      router.push(`/${username}/inkwell/posts`);
                    }}
                    disabled={deleting}
                    style={{ background: "transparent", color: "#c04040", border: "none", borderRadius: 12, padding: "0.625rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer", opacity: deleting ? 0.6 : 1 }}
                  >
                    {deleting ? "Deleting…" : "🗑 Delete Post"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cover image file input */}
      <input ref={coverImgRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }}
      />

      <style>{`
        .mobile-write-wrap  { display: none; }
        .desktop-write-wrap { display: block; transition: margin-right 0.25s ease; }
        .desktop-write-wrap.ai-open { margin-right: min(380px, 35vw); }
        .desktop-ai-panel   { display: flex; }
        @media (max-width: 899px) {
          .mobile-write-wrap  { display: flex !important; }
          .desktop-write-wrap { display: none !important; }
        }
        .ai-prose p  { margin: 0 0 0.5em; }
        .ai-prose p:last-child { margin-bottom: 0; }
        .ai-prose h1 { font-size: 1rem;  font-weight: 700; margin: 0.75em 0 0.25em; color: #c8a97e; font-family: 'Playfair Display', serif; }
        .ai-prose h2 { font-size: 0.92rem; font-weight: 700; margin: 0.75em 0 0.25em; color: #c8a97e; font-family: 'Playfair Display', serif; }
        .ai-prose h3 { font-size: 0.85rem; font-weight: 700; margin: 0.6em 0 0.2em; color: #c8a97e; }
        .ai-prose strong { font-weight: 700; }
        .ai-prose em     { font-style: italic; }
        .ai-prose code   { background: rgba(255,255,255,0.1); padding: 0.1em 0.35em; border-radius: 3px; font-family: monospace; font-size: 0.78rem; }
        .ai-prose ul     { margin: 0.4em 0 0.4em 1.1em; padding: 0; list-style: disc; }
        .ai-prose li     { margin-bottom: 0.2em; }
      `}</style>
    </>
  );
}

/* ── Desktop sidebar panel ───────────────────────────── */
interface SettingsProps {
  published: boolean; featured: boolean;
  setFeatured: (v: boolean) => void;
  showUpdatedNotice: boolean; setShowUpdatedNotice: (v: boolean) => void;
  save: (p?: boolean) => void; saving: boolean; isEdit: boolean;
  coverImage: string; setCoverImage: (v: string) => void;
  uploading: boolean; uploadCover: (f: File) => void;
  coverImgRef: React.RefObject<HTMLInputElement | null>;
  categories: { id: number; name: string; color: string }[];
  selectedCats: number[]; toggleCat: (id: number) => void;
  inputStyle: React.CSSProperties; labelStyle: React.CSSProperties;
  postSlug?: string;
  notifySubscribers: boolean; setNotifySubscribers: (v: boolean) => void;
  username: string;
}

function SettingsPanel({ published, featured, setFeatured, showUpdatedNotice, setShowUpdatedNotice, save, saving, isEdit, coverImage, setCoverImage, uploading, uploadCover, coverImgRef, categories, selectedCats, toggleCat, inputStyle, labelStyle, postSlug, notifySubscribers, setNotifySubscribers, username }: SettingsProps) {
  return (
    <div style={{ background: "var(--admin-bg-card)", border: "1px solid color-mix(in srgb, var(--admin-primary) 10%, transparent)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid color-mix(in srgb, var(--admin-primary) 7%, transparent)", background: "var(--admin-bg)" }}>
        <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "var(--admin-primary)", margin: 0, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>Publish</h3>
      </div>
      <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "var(--admin-sidebar-muted)" }}>Status</span>
          <span style={{ background: published ? "#4a9e7a18" : "color-mix(in srgb, var(--admin-accent) 10%, transparent)", color: published ? "#4a9e7a" : "var(--admin-accent)", border: `1px solid ${published ? "#4a9e7a30" : "color-mix(in srgb, var(--admin-accent) 25%, transparent)"}`, padding: "0.15rem 0.7rem", borderRadius: 12, fontFamily: "Inter, sans-serif", fontSize: "0.72rem", textTransform: "uppercase" }}>
            {published ? "Published" : "Draft"}
          </span>
        </div>

        {published && postSlug && <ShareRow slug={postSlug} username={username} />}
        {published && postSlug && <AudioGenPanel />}

        <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
          <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} style={{ width: 15, height: 15, accentColor: "var(--admin-accent)" }} />
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "var(--admin-sidebar-muted)" }}>Mark as Featured</span>
        </label>

        {isEdit && published && (
          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", cursor: "pointer" }}>
            <input type="checkbox" checked={showUpdatedNotice} onChange={e => setShowUpdatedNotice(e.target.checked)} style={{ width: 15, height: 15, accentColor: "var(--admin-accent)", marginTop: 2, flexShrink: 0 }} />
            <div>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "var(--admin-sidebar-muted)", display: "block" }}>Show &quot;Updated&quot; notice</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "var(--admin-sidebar-muted)" }}>Show readers the edit date</span>
            </div>
          </label>
        )}

        {/* Notify subscribers toggle — only relevant on first publish */}
        {!published && (
          <label style={{ display: "flex", alignItems: "flex-start", gap: "0.625rem", cursor: "pointer" }}>
            <input type="checkbox" checked={notifySubscribers} onChange={e => setNotifySubscribers(e.target.checked)} style={{ width: 15, height: 15, accentColor: "var(--admin-accent)", marginTop: 2, flexShrink: 0 }} />
            <div>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "var(--admin-sidebar-muted)", display: "block" }}>Notify subscribers</span>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", color: "var(--admin-sidebar-muted)" }}>Send email on publish</span>
            </div>
          </label>
        )}

        <button onClick={() => save(true)} disabled={saving} style={{ width: "100%", background: "var(--admin-primary)", color: "var(--admin-accent)", border: "none", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
          {saving ? "Saving…" : published ? "Update" : "Publish"}
        </button>
        <button onClick={() => save(false)} disabled={saving} style={{ width: "100%", background: "transparent", color: "var(--admin-primary)", border: "1px solid color-mix(in srgb, var(--admin-primary) 20%, transparent)", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.875rem", cursor: "pointer" }}>
          Save as Draft
        </button>
        {isEdit && published && (
          <button onClick={() => save(false)} disabled={saving} style={{ width: "100%", background: "transparent", color: "#c04040", border: "1px solid rgba(192,64,64,0.25)", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer" }}>
            Unpublish
          </button>
        )}

        {/* Cover image */}
        <div style={{ borderTop: "1px solid color-mix(in srgb, var(--admin-primary) 7%, transparent)", paddingTop: "1rem" }}>
          <label style={labelStyle}>Cover Image</label>
          <button onClick={() => coverImgRef.current?.click()} disabled={uploading} style={{ width: "100%", background: "color-mix(in srgb, var(--admin-accent) 6%, transparent)", color: "var(--admin-accent)", border: "1.5px dashed color-mix(in srgb, var(--admin-accent) 35%, transparent)", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer", marginBottom: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem" }}>
            {uploading ? <><SpinnerIcon />Uploading…</> : <>📷 Upload</>}
          </button>
          <input value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="Or paste URL…" style={{ ...inputStyle, fontSize: "0.8rem" }} />
          {coverImage && (
            <div style={{ marginTop: "0.5rem", borderRadius: 6, overflow: "hidden", border: "1px solid color-mix(in srgb, var(--admin-primary) 10%, transparent)", position: "relative" }}>
              <img src={coverImage} alt="Cover" style={{ width: "100%", height: 110, objectFit: "cover", display: "block" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              <button onClick={() => setCoverImage("")} style={{ position: "absolute", top: 6, right: 6, background: "color-mix(in srgb, var(--admin-primary) 70%, transparent)", color: "#fff", border: "none", borderRadius: 4, width: 24, height: 24, cursor: "pointer", fontSize: "0.9rem", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
          )}
        </div>

        {/* Categories */}
        <div style={{ borderTop: "1px solid color-mix(in srgb, var(--admin-primary) 7%, transparent)", paddingTop: "1rem" }}>
          <label style={labelStyle}>Categories</label>
          {categories.length === 0 ? (
            <p style={{ color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.8rem", margin: 0 }}>
              No categories. <Link href={`/${username}/inkwell/categories`} style={{ color: "var(--admin-accent)" }}>Create some.</Link>
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {categories.map(cat => (
                <label key={cat.id} style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
                  <input type="checkbox" checked={selectedCats.includes(cat.id)} onChange={() => toggleCat(cat.id)} style={{ accentColor: cat.color }} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "var(--admin-sidebar-muted)" }}>{cat.name}</span>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, marginLeft: "auto" }} />
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShareRow({ slug, username }: { slug: string; username: string }) {
  const [copied, setCopied] = useState(false);
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://amo-infinitum.vercel.app";
  const link = `${siteUrl}/${username}/blog/${slug}`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { window.prompt("Copy this link:", link); }
  };
  return (
    <div style={{ background: "color-mix(in srgb, var(--admin-accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)", borderRadius: 10, padding: "0.875rem 1rem", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--admin-sidebar-muted)", margin: 0 }}>Share this post</p>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "var(--admin-accent)", margin: 0, wordBreak: "break-all" }}>{link}</p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onPointerDown={e => { e.preventDefault(); copy(); }} style={{ flex: 1, background: copied ? "#4a9e7a" : "var(--admin-accent)", color: "#fff", border: "none", borderRadius: 8, padding: "0.6rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}>
          {copied ? "✓ Copied!" : "Copy Link"}
        </button>
        <a href={link} target="_blank" rel="noreferrer" style={{ flex: 1, background: "transparent", color: "var(--admin-accent)", border: "1px solid color-mix(in srgb, var(--admin-accent) 30%, transparent)", borderRadius: 8, padding: "0.6rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", textDecoration: "none", textAlign: "center" }}>
          View Live ↗
        </a>
      </div>
    </div>
  );
}

function PublishSuccessOverlay({ slug, title, excerpt, coverImage, content, onDismiss, username, siteName, colorAccent, colorPrimary, fontHeading }: {
  slug: string; title: string; excerpt: string; coverImage: string; content: string; onDismiss: () => void; username: string;
  siteName?: string; colorAccent?: string; colorPrimary?: string; fontHeading?: string;
}) {
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "https://amo-infinitum.vercel.app";
  const postUrl = `${origin}/${username}/blog/${slug}`;
  const preview = excerpt || firstSentence(content);

  const shareText = preview || title;

  const downloadCard = async () => {
    setDownloading(true);
    try {
      const blob = await makePostcardBlob({ title, excerpt: preview, coverImage: coverImage || undefined, siteName, colorAccent, colorPrimary, fontHeading });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${slug}-postcard.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch { /* silent */ }
    setDownloading(false);
  };

  const shareLinkOnly = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: shareText, url: postUrl });
      } else {
        await navigator.clipboard.writeText(postUrl);
      }
    } catch { /* cancelled */ }
  };

  const shareWithPreview = async () => {
    setSharing(true);
    try {
      const blob = await makePostcardBlob({ title, excerpt: preview, coverImage: coverImage || undefined, siteName, colorAccent, colorPrimary, fontHeading });
      const shareData: ShareData = { title: shareText, url: postUrl };
      const file = new File([blob], `${slug}-postcard.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ ...shareData, files: [file] });
      } else if (navigator.share) {
        await navigator.share(shareData);
      }
    } catch { /* user cancelled or not supported */ }
    finally { setSharing(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "color-mix(in srgb, var(--admin-primary) 65%, transparent)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onDismiss}>
      {/* Sheet */}
      <div onClick={e => e.stopPropagation()} style={{ background: "var(--admin-bg-card)", borderRadius: "20px 20px 0 0", overflow: "hidden", width: "100%", maxWidth: 480, maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" }}>

          {/* Drag handle */}
          <div style={{ padding: "0.875rem 1.5rem 0" }}>
            <div style={{ width: 36, height: 4, background: "color-mix(in srgb, var(--admin-primary) 15%, transparent)", borderRadius: 2, margin: "0 auto" }} />
          </div>

          {/* Inline CSS preview card */}
          <a href={postUrl} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: "0.875rem", textDecoration: "none" }}>
            {coverImage ? (
              /* ── With cover image — overlay layout ── */
              <div style={{ width: "100%", background: colorPrimary, position: "relative", overflow: "hidden" }}>
                <img src={coverImage} alt="" style={{ display: "block", width: "100%", height: "auto" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 35%, transparent 60%)" }} />
                <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "clamp(18px,5%,40px) clamp(20px,6%,56px)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: colorAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: colorPrimary, fontFamily: "Georgia, serif", flexShrink: 0 }}>{(siteName || "B").charAt(0).toUpperCase()}</div>
                    <span style={{ fontFamily: "Georgia, serif", fontSize: "clamp(11px,2.5vw,14px)", color: colorAccent, letterSpacing: "0.06em" }}>{(siteName || "Blog").toUpperCase()}</span>
                  </div>
                  <div>
                    <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(22px,5.5vw,34px)", fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: "0 0 10px" }}>{title}</h2>
                    {preview && <p style={{ fontFamily: "Georgia, serif", fontSize: "clamp(16px,4vw,22px)", color: "rgba(255,255,255,0.82)", lineHeight: 1.5, margin: "0 0 12px" }}>{preview}</p>}
                    <div style={{ width: 32, height: 2, background: colorAccent, borderRadius: 1 }} />
                  </div>
                </div>
              </div>
            ) : (
              /* ── No cover — min 1200/630 ratio, grows with excerpt, no clipping ── */
              <div style={{ width: "100%", background: colorPrimary, position: "relative", aspectRatio: "1200/630", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "clamp(18px,5%,40px) clamp(20px,6%,56px)" }}>
                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 80% 20%, ${colorAccent}66 0%, transparent 55%), radial-gradient(ellipse at 15% 85%, ${colorAccent}40 0%, transparent 50%)` }} />
                <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: colorAccent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: colorPrimary, fontFamily: "Georgia, serif", flexShrink: 0 }}>{(siteName || "B").charAt(0).toUpperCase()}</div>
                  <span style={{ fontFamily: "Georgia, serif", fontSize: "clamp(11px,2.5vw,14px)", color: colorAccent, letterSpacing: "0.06em" }}>{(siteName || "Blog").toUpperCase()}</span>
                </div>
                <div style={{ position: "relative" }}>
                  <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(22px,5.5vw,34px)", fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: "0 0 10px" }}>{title}</h2>
                  {preview && <p style={{ fontFamily: "Georgia, serif", fontSize: "clamp(15px,3.5vw,20px)", color: `${colorAccent}d0`, lineHeight: 1.55, margin: "0 0 12px" }}>{preview}</p>}
                  <div style={{ width: 32, height: 2, background: colorAccent, borderRadius: 1 }} />
                </div>
              </div>
            )}
          </a>

          {/* Content below image */}
          <div style={{ padding: "0.875rem 1.5rem 2.5rem" }}>

            {/* Post is live */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontSize: "1.5rem", lineHeight: 1 }}>🎉</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.15rem", color: "var(--admin-primary)", margin: "0.25rem 0 0.1rem", fontWeight: 600 }}>Your post is live!</h2>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "var(--admin-sidebar-muted)", margin: 0 }}>Tap the preview to view it ↗</p>
              </div>
            </div>

            {/* Download + share image row */}
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
              <button onClick={downloadCard} disabled={downloading}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", background: "var(--admin-bg)", color: "var(--admin-primary)", border: "1px solid color-mix(in srgb, var(--admin-primary) 15%, transparent)", borderRadius: 8, padding: "0.7rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", opacity: downloading ? 0.7 : 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {downloading ? "Saving…" : "Download"}
              </button>
              <button onClick={shareWithPreview} disabled={sharing}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", background: "var(--admin-primary)", color: "var(--admin-accent)", border: "none", borderRadius: 8, padding: "0.7rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", opacity: sharing ? 0.7 : 1 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                {sharing ? "Sharing…" : "Share with cover"}
              </button>
            </div>

            {/* Copy link */}
            <button onClick={shareLinkOnly}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", background: "var(--admin-bg)", color: "var(--admin-primary)", border: "1px solid color-mix(in srgb, var(--admin-primary) 15%, transparent)", borderRadius: 8, padding: "0.7rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", marginBottom: "1rem" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
              Share link only
            </button>

            <CopyLinkRow url={postUrl} />

            <a href={`/${username}/inkwell`} style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "var(--admin-bg)", color: "var(--admin-primary)", border: "1px solid color-mix(in srgb, var(--admin-primary) 15%, transparent)", borderRadius: 8, padding: "0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none", marginBottom: "0.5rem" }}>
              Dashboard
            </a>
            <button onClick={onDismiss}
              style={{ background: "transparent", color: "var(--admin-sidebar-muted)", border: "none", padding: "0.5rem", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", cursor: "pointer", width: "100%" }}>
              Continue editing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CopyLinkRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); }
    catch { window.prompt("Copy this link:", url); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };
  return (
    <div style={{ background: "var(--admin-bg)", border: "1px solid color-mix(in srgb, var(--admin-primary) 10%, transparent)", borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span style={{ flex: 1, fontFamily: "Inter, sans-serif", fontSize: "0.78rem", color: "var(--admin-sidebar-muted)", wordBreak: "break-all", lineHeight: 1.5 }}>{url}</span>
      <button onClick={copy} style={{ flexShrink: 0, background: copied ? "#4a9e7a" : "var(--admin-primary)", color: copied ? "#fff" : "var(--admin-accent)", border: "none", borderRadius: 6, padding: "0.45rem 0.875rem", fontFamily: "Inter, sans-serif", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", transition: "background 0.2s, color 0.2s", whiteSpace: "nowrap" }}>
        {copied ? "✓ Copied!" : "Copy Link"}
      </button>
    </div>
  );
}

/* ── AI chat helpers ─────────────────────────────── */

function AiHistoryView({ sessions, onResume, onDelete }: {
  sessions: ChatSession[];
  onResume: (s: ChatSession) => void;
  onDelete: (id: string) => void;
}) {
  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
        <p style={{ color: "var(--admin-sidebar-muted)", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", lineHeight: 1.6, margin: 0 }}>
          No archived conversations yet.<br />Click &quot;New chat&quot; to archive the current one.
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {sessions.map(s => (
        <div key={s.id} style={{ background: "color-mix(in srgb, var(--admin-bg-card) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--admin-accent) 12%, transparent)", borderRadius: 10, padding: "0.875rem 1rem" }}>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.7rem", color: "var(--admin-sidebar-muted)", margin: "0 0 0.35rem", letterSpacing: "0.04em" }}>
            {new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            {" · "}{s.messages.length} messages
          </p>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "var(--admin-bg-card)", margin: "0 0 0.75rem", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {s.preview}
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => onResume(s)}
              style={{ flex: 1, background: "var(--admin-accent)", color: "var(--admin-primary)", border: "none", borderRadius: 6, padding: "0.45rem", fontFamily: "Inter, sans-serif", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
            >
              Resume
            </button>
            <button
              onClick={() => onDelete(s.id)}
              style={{ background: "rgba(192,64,64,0.15)", color: "#e07070", border: "1px solid rgba(192,64,64,0.2)", borderRadius: 6, padding: "0.45rem 0.75rem", fontFamily: "Inter, sans-serif", fontSize: "0.75rem", cursor: "pointer" }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function mdToHtml(md: string): string {
  if (!md) return "";
  let s = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // Headings
  s = s
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm,  "<h2>$1</h2>")
    .replace(/^# (.+)$/gm,   "<h1>$1</h1>");
  // Bold + italic
  s = s
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g,     "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,         "<em>$1</em>");
  // Inline code
  s = s.replace(/`(.+?)`/g, "<code>$1</code>");
  // Bullet lists — collect consecutive li lines into a ul
  s = s.replace(/^[-*] (.+)$/gm, "<li>$1</li>");
  s = s.replace(/(<li>[\s\S]*?<\/li>\n?)+/g, m => `<ul>${m}</ul>`);
  // Numbered lists
  s = s.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  // Paragraphs & line breaks
  s = s.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>");
  return `<p>${s}</p>`;
}

function AiMessage({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";
  const [copied, setCopied] = useState(false);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      const el = document.createElement("textarea");
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bubble: React.CSSProperties = {
    maxWidth: "84%",
    background: isUser ? "var(--admin-accent)" : "color-mix(in srgb, var(--admin-bg-card) 7%, transparent)",
    color: isUser ? "var(--admin-primary)" : "var(--admin-bg-card)",
    borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
    padding: "0.625rem 0.875rem",
    fontFamily: "Inter, sans-serif", fontSize: "0.82rem", lineHeight: 1.6,
    wordBreak: "break-word",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
      {isUser ? (
        <div style={{ ...bubble, whiteSpace: "pre-wrap" }}>
          {content || <span style={{ opacity: 0.45 }}>…</span>}
        </div>
      ) : (
        <div style={bubble} className="ai-prose" dangerouslySetInnerHTML={{ __html: mdToHtml(content) }} />
      )}
      {content && (
        <button
          onClick={copyText}
          style={{
            marginTop: "0.2rem",
            background: "none", border: "none",
            color: copied ? "#4a9e7a" : "color-mix(in srgb, var(--admin-accent) 45%, transparent)",
            fontSize: "0.65rem", fontFamily: "Inter, sans-serif",
            cursor: "pointer", padding: "0.1rem 0.3rem",
            display: "flex", alignItems: "center", gap: "0.25rem",
            transition: "color 0.2s",
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}

function AiTypingDot() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div style={{ background: "color-mix(in srgb, var(--admin-bg-card) 7%, transparent)", borderRadius: "14px 14px 14px 4px", padding: "0.625rem 0.875rem", display: "flex", gap: 4, alignItems: "center" }}>
        {[0, 150, 300].map(delay => (
          <span key={delay} style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--admin-accent)", display: "inline-block", animation: "aiBounce 1.1s ease-in-out infinite", animationDelay: `${delay}ms` }} />
        ))}
        <style>{`@keyframes aiBounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-5px)} }`}</style>
      </div>
    </div>
  );
}

function AiInput({ value, onChange, onSend, loading }: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  loading: boolean;
}) {
  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  };
  return (
    <div style={{ padding: "0.875rem 1rem", borderTop: "1px solid color-mix(in srgb, var(--admin-accent) 12%, transparent)", flexShrink: 0, display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder="Ask anything…"
        rows={1}
        disabled={loading}
        style={{
          flex: 1, background: "color-mix(in srgb, var(--admin-bg-card) 7%, transparent)", border: "1px solid color-mix(in srgb, var(--admin-accent) 20%, transparent)",
          borderRadius: 10, padding: "0.6rem 0.75rem",
          fontFamily: "Inter, sans-serif", fontSize: "0.85rem", color: "var(--admin-bg-card)",
          outline: "none", resize: "none", lineHeight: 1.5,
          minHeight: 38, maxHeight: 120, overflowY: "auto",
        }}
      />
      <button
        onClick={onSend}
        disabled={loading || !value.trim()}
        style={{
          background: loading || !value.trim() ? "color-mix(in srgb, var(--admin-accent) 25%, transparent)" : "var(--admin-accent)",
          color: "var(--admin-primary)", border: "none", borderRadius: 8,
          width: 38, height: 38, flexShrink: 0,
          cursor: loading || !value.trim() ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.9rem", transition: "background 0.15s",
        }}
      >
        {loading ? <SpinnerIcon /> : "↑"}
      </button>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 0.8s linear infinite", flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="8" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

// ── Audio generation panel (shown in SettingsPanel for published posts) ──
function AudioGenPanel() {
  return (
    <div style={{ borderTop: "1px solid color-mix(in srgb, var(--admin-primary) 7%, transparent)", paddingTop: "0.875rem" }}>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--admin-primary)", margin: "0 0 0.3rem" }}>
        Audio
      </p>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: "0.75rem", color: "var(--admin-sidebar-muted)", margin: 0 }}>
        🎙 Audio generates on every publish or update
      </p>
    </div>
  );
}
