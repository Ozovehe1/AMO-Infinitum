"use client";
import { useState, useMemo } from "react";
import { useManager, UserStat, MGR } from "../layout";

function fmt(date: string) {
  return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0d1a2d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "2rem", width: "100%", maxWidth: 480 }}>
        {children}
      </div>
    </div>
  );
}

function DeleteModal({ user, onClose, onDone, onUnauth }: { user: UserStat; onClose: () => void; onDone: () => void; onUnauth: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirm !== `@${user.username}`) { setError("Username doesn't match"); return; }
    setLoading(true);
    const res = await fetch(`/api/manager/user/${user.id}`, { method: "DELETE" });
    if (res.status === 401) { onUnauth(); return; }
    if (!res.ok) { setError((await res.json()).error || "Failed to delete"); setLoading(false); return; }
    onDone();
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(224,112,112,0.1)", border: "1px solid rgba(224,112,112,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e07070" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </div>
        <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1rem", color: MGR.text, margin: "0 0 0.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>Delete @{user.username}</h2>
        <p style={{ color: "rgba(143,163,177,0.6)", fontSize: "0.84rem", lineHeight: 1.6, margin: "0 0 0.5rem" }}>
          This will permanently delete their blog, all posts, categories, subscribers, and settings. This cannot be undone.
        </p>
        <p style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.78rem", margin: 0 }}>
          {user.posts} posts · {user.subscribers} subscribers
        </p>
      </div>
      <div style={{ marginBottom: "1.25rem" }}>
        <label style={{ display: "block", color: "rgba(143,163,177,0.5)", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>
          Type <strong style={{ color: "#fffef9" }}>@{user.username}</strong> to confirm
        </label>
        <input
          value={confirm} onChange={e => setConfirm(e.target.value)}
          placeholder={`@${user.username}`} autoFocus
          style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(224,112,112,0.25)", borderRadius: 8, padding: "0.8rem 1rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "0.9rem", outline: "none" }}
        />
      </div>
      {error && <p style={{ color: "#e07070", fontSize: "0.78rem", marginBottom: "1rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button onClick={handleDelete} disabled={loading || confirm !== `@${user.username}`}
          style={{ flex: 1, background: confirm === `@${user.username}` ? "#c0504a" : "rgba(192,80,74,0.25)", color: confirm === `@${user.username}` ? "#fff" : "rgba(255,255,255,0.3)", border: "none", borderRadius: 8, padding: "0.8rem", fontSize: "0.85rem", fontWeight: 600, cursor: confirm === `@${user.username}` && !loading ? "pointer" : "default", transition: "all 0.15s" }}>
          {loading ? "Deleting…" : "Delete Blog"}
        </button>
        <button onClick={onClose} style={{ padding: "0.8rem 1.25rem", background: "transparent", color: "rgba(143,163,177,0.5)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: "0.85rem", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function EmailModal({ user, onClose, onUnauth }: { user: UserStat; onClose: () => void; onUnauth: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const canSend = subject.trim().length > 0 && message.trim().length > 0;

  const send = async () => {
    if (!canSend) return;
    setLoading(true); setError("");
    const res = await fetch(`/api/manager/email/${user.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
    });
    if (res.status === 401) { onUnauth(); return; }
    if (!res.ok) { setError((await res.json()).error || "Failed to send"); setLoading(false); return; }
    setSent(true);
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0d1a2d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, width: "100%", maxWidth: 580, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        {sent ? (
          <div style={{ textAlign: "center", padding: "3rem 2rem" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(74,158,122,0.12)", border: "1px solid rgba(74,158,122,0.25)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4a9e7a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p style={{ color: "#4a9e7a", fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", margin: "0 0 0.5rem" }}>Email sent</p>
            <p style={{ color: "rgba(143,163,177,0.5)", fontSize: "0.82rem", margin: "0 0 2rem" }}>Delivered to <strong style={{ color: "#fffef9" }}>{user.email}</strong></p>
            <button onClick={onClose} style={{ background: MGR.accent2, color: "#fff", border: "none", borderRadius: 8, padding: "0.75rem 2rem", fontSize: "0.88rem", fontWeight: 700, cursor: "pointer" }}>Done</button>
          </div>
        ) : (
          <>
            {/* Email compose header */}
            <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#fffef9", fontSize: "0.88rem", fontWeight: 600 }}>New Message</span>
              <button onClick={onClose} style={{ background: "transparent", border: "none", color: "rgba(143,163,177,0.45)", fontSize: "1.1rem", cursor: "pointer", lineHeight: 1, padding: "0.2rem" }}>✕</button>
            </div>

            {/* From / To rows */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", padding: "0.7rem 1.5rem", gap: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.72rem", width: 28, flexShrink: 0 }}>From</span>
                <span style={{ color: "rgba(143,163,177,0.55)", fontSize: "0.82rem" }}>AMO Infinitum &lt;amoinfinitum@gmail.com&gt;</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", padding: "0.7rem 1.5rem", gap: "0.75rem" }}>
                <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.72rem", width: 28, flexShrink: 0 }}>To</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: `hsl(${(user.id * 47) % 360}, 35%, 28%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ color: "#fffef9", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase" }}>{user.username.slice(0, 1)}</span>
                  </div>
                  <span style={{ color: "#fffef9", fontSize: "0.82rem" }}>@{user.username}</span>
                  <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.72rem" }}>&lt;{user.email}&gt;</span>
                </div>
              </div>
            </div>

            {/* Subject */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "0 1.5rem" }}>
              <input
                value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" autoFocus
                style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none", padding: "0.875rem 0", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "0.92rem", fontWeight: 500, outline: "none" }}
              />
            </div>

            {/* Body */}
            <div style={{ flex: 1, padding: "0 1.5rem", minHeight: 0 }}>
              <textarea
                value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message…"
                style={{ width: "100%", boxSizing: "border-box", background: "transparent", border: "none", padding: "1rem 0", color: "rgba(255,254,249,0.85)", fontFamily: "Inter, sans-serif", fontSize: "0.88rem", outline: "none", resize: "none", lineHeight: 1.75, height: 200 }}
              />
            </div>

            {/* Actions */}
            <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                {error && <p style={{ color: "#e07070", fontSize: "0.75rem", margin: 0 }}>✕ {error}</p>}
              </div>
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                <button onClick={onClose} style={{ padding: "0.6rem 1rem", background: "transparent", color: "rgba(143,163,177,0.45)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, fontSize: "0.8rem", cursor: "pointer" }}>
                  Discard
                </button>
                <button onClick={send} disabled={loading || !canSend}
                  style={{ padding: "0.6rem 1.25rem", background: canSend ? MGR.accent2 : MGR.dim, color: canSend ? "#fff" : MGR.textDim, border: "none", borderRadius: 7, fontSize: "0.82rem", fontWeight: 700, cursor: canSend && !loading ? "pointer" : "default", display: "flex", alignItems: "center", gap: "0.4rem", transition: "all 0.15s" }}>
                  {loading ? "Sending…" : (
                    <>
                      Send
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BlogsPage() {
  const { stats, refresh, logout } = useManager();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserStat | null>(null);
  const [emailTarget, setEmailTarget] = useState<UserStat | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<{ deleted: number; accounts: { username: string; email: string }[] } | null>(null);
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  const unverifiedCount = stats ? stats.users.filter(u => !u.emailVerified).length : 0;

  const cleanGhosts = async () => {
    if (cleaning) return;
    setCleaning(true);
    const res = await fetch("/api/manager/cleanup", { method: "DELETE" });
    if (res.status === 401) { logout(); return; }
    const data = await res.json();
    setCleanResult(data);
    await refresh();
    setCleaning(false);
  };

  const users = useMemo(() => {
    if (!stats) return [];
    const q = search.toLowerCase().trim();
    if (!q) return stats.users;
    return stats.users.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [stats, search]);

  return (
    <div className="mgr-fade">
      {/* Header */}
      <div className="mgr-header-pad" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: MGR.textDim, fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>Manage</p>
          <h1 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.5rem", color: MGR.text, margin: 0, fontWeight: 700, letterSpacing: "-0.03em" }}>All Blogs</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.72rem" }}>{stats?.totalUsers ?? 0} active · {unverifiedCount} unverified</span>
          {unverifiedCount > 0 && (
            <button onClick={cleanGhosts} disabled={cleaning}
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", borderRadius: 7, padding: "0.4rem 0.85rem", fontSize: "0.72rem", fontWeight: 600, cursor: cleaning ? "default" : "pointer", letterSpacing: "0.02em" }}>
              {cleaning ? "Cleaning…" : `Remove ${unverifiedCount} ghost${unverifiedCount > 1 ? "s" : ""}`}
            </button>
          )}
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "0.55rem 1rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", outline: "none", width: 220 }} />
        </div>
      </div>

      <div className="mgr-page-pad">
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 14, overflow: "hidden" }}>
          {users.length === 0 ? (
            <div style={{ padding: "4rem", textAlign: "center", color: "rgba(143,163,177,0.3)", fontSize: "0.85rem" }}>
              {search ? "No blogs match your search." : "No blogs yet."}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    {["Writer", "Email", "Role", "Status", "Posts", "Readers", "Joined", "Actions"].map(h => (
                      <th key={h} style={{ padding: "0.9rem 1.25rem", textAlign: "left", color: "rgba(143,163,177,0.35)", fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="mgr-row-hover" style={{ borderBottom: "1px solid rgba(255,255,255,0.025)", transition: "background 0.1s" }}>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: `hsl(${(u.id * 47) % 360}, 35%, 28%)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <span style={{ color: "#fffef9", fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" }}>{u.username.slice(0, 1)}</span>
                          </div>
                          <span style={{ color: "#fffef9", fontWeight: 500 }}>@{u.username}</span>
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1.25rem", color: "rgba(143,163,177,0.45)", fontSize: "0.78rem" }}>{u.email}</td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <span style={{ display: "inline-block", background: u.role === "owner" ? MGR.dim : "rgba(255,255,255,0.04)", color: u.role === "owner" ? MGR.accent : "rgba(143,163,177,0.55)", borderRadius: 4, padding: "0.18rem 0.6rem", fontSize: "0.6rem", letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase" }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {!u.emailVerified
                            ? <><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f87171" }} /><span style={{ color: "#f87171", fontSize: "0.75rem" }}>Unverified</span></>
                            : u.onboarded
                            ? <><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4a9e7a" }} /><span style={{ color: "#4a9e7a", fontSize: "0.75rem" }}>Active</span></>
                            : <><div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} /><span style={{ color: "#f59e0b", fontSize: "0.75rem" }}>Pending setup</span></>
                          }
                        </div>
                      </td>
                      <td style={{ padding: "1rem 1.25rem", color: u.posts > 0 ? "#fffef9" : "rgba(143,163,177,0.3)", fontWeight: u.posts > 0 ? 600 : 400 }}>{u.posts}</td>
                      <td style={{ padding: "1rem 1.25rem", color: "rgba(143,163,177,0.55)" }}>{u.subscribers}</td>
                      <td style={{ padding: "1rem 1.25rem", color: "rgba(143,163,177,0.35)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>{fmt(u.createdAt)}</td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <a href={`${siteUrl}/${u.username}`} target="_blank" rel="noopener noreferrer"
                            style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.72rem", textDecoration: "none", padding: "0.3rem 0.6rem", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, transition: "all 0.12s" }} className="mgr-btn">
                            View ↗
                          </a>
                          <button onClick={() => setEmailTarget(u)}
                            style={{ color: MGR.accent, fontSize: "0.72rem", background: MGR.dim, border: `1px solid ${MGR.dimBorder}`, borderRadius: 6, padding: "0.3rem 0.6rem", cursor: "pointer", transition: "all 0.12s" }} className="mgr-btn">
                            Email
                          </button>
                          {u.role !== "owner" && (
                            <button onClick={() => setDeleteTarget(u)}
                              style={{ color: "#e07070", fontSize: "0.72rem", background: "rgba(224,112,112,0.07)", border: "1px solid rgba(224,112,112,0.15)", borderRadius: 6, padding: "0.3rem 0.6rem", cursor: "pointer", transition: "all 0.12s" }} className="mgr-btn">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {deleteTarget && (
        <DeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDone={async () => { await refresh(); setDeleteTarget(null); }}
          onUnauth={() => { setDeleteTarget(null); logout(); }}
        />
      )}
      {emailTarget && (
        <EmailModal user={emailTarget} onClose={() => setEmailTarget(null)} onUnauth={() => { setEmailTarget(null); logout(); }} />
      )}
      {cleanResult && (
        <div onClick={() => setCleanResult(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0d1a2d", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "2rem", maxWidth: 440, width: "100%" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(74,158,122,0.1)", border: "1px solid rgba(74,158,122,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a9e7a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 style={{ fontFamily: "Inter, sans-serif", fontSize: "1.1rem", color: "#fffef9", margin: "0 0 0.5rem", fontWeight: 700 }}>
              {cleanResult.deleted === 0 ? "No ghost accounts found" : `${cleanResult.deleted} ghost account${cleanResult.deleted > 1 ? "s" : ""} deleted`}
            </h2>
            {cleanResult.accounts.length > 0 && (
              <div style={{ margin: "1rem 0", maxHeight: 180, overflowY: "auto" }}>
                {cleanResult.accounts.map(a => (
                  <div key={a.email} style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                    <span style={{ color: "rgba(143,163,177,0.6)" }}>@{a.username}</span>
                    <span style={{ color: "rgba(143,163,177,0.35)" }}>{a.email}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setCleanResult(null)} style={{ marginTop: "1rem", background: MGR.accent2, color: "#fff", border: "none", borderRadius: 8, padding: "0.7rem 1.5rem", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", width: "100%" }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
