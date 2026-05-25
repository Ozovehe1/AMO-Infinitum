"use client";
import { useState, useMemo } from "react";
import { useManager, UserStat } from "../layout";

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

function DeleteModal({ user, onClose, onDone }: { user: UserStat; onClose: () => void; onDone: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirm !== `@${user.username}`) { setError("Username doesn't match"); return; }
    setLoading(true);
    const res = await fetch(`/api/manager/user/${user.id}`, { method: "DELETE" });
    if (!res.ok) { setError((await res.json()).error || "Failed to delete"); setLoading(false); return; }
    onDone();
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(224,112,112,0.1)", border: "1px solid rgba(224,112,112,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.25rem" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e07070" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.25rem", color: "#fffef9", margin: "0 0 0.5rem", fontWeight: 600 }}>Delete @{user.username}</h2>
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

function EmailModal({ user, onClose }: { user: UserStat; onClose: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const send = async () => {
    if (!subject.trim() || !message.trim()) { setError("Subject and message are required"); return; }
    setLoading(true); setError("");
    const res = await fetch(`/api/manager/email/${user.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject.trim(), message: message.trim() }),
    });
    if (!res.ok) { setError((await res.json()).error || "Failed to send"); setLoading(false); return; }
    setSent(true);
  };

  return (
    <Modal onClose={onClose}>
      {sent ? (
        <div style={{ textAlign: "center", padding: "1rem 0" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✓</div>
          <p style={{ color: "#4a9e7a", fontFamily: "'Playfair Display', serif", fontSize: "1.1rem", margin: "0 0 0.5rem" }}>Email sent</p>
          <p style={{ color: "rgba(143,163,177,0.5)", fontSize: "0.82rem", margin: "0 0 1.5rem" }}>Delivered to {user.email}</p>
          <button onClick={onClose} style={{ background: "#c8a97e", color: "#050b14", border: "none", borderRadius: 8, padding: "0.7rem 1.5rem", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>Done</button>
        </div>
      ) : (
        <>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "#fffef9", margin: "0 0 0.4rem", fontWeight: 600 }}>Message @{user.username}</h2>
          <p style={{ color: "rgba(143,163,177,0.4)", fontSize: "0.78rem", margin: "0 0 1.5rem" }}>To: {user.email}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", color: "rgba(143,163,177,0.45)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Message subject…" autoFocus
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 8, padding: "0.8rem 1rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "0.88rem", outline: "none" }} />
            </div>
            <div>
              <label style={{ display: "block", color: "rgba(143,163,177,0.45)", fontSize: "0.62rem", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Message</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Write your message…" rows={6}
                style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 8, padding: "0.8rem 1rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "0.88rem", outline: "none", resize: "vertical", lineHeight: 1.65 }} />
            </div>
            {error && <p style={{ color: "#e07070", fontSize: "0.78rem", margin: 0 }}>{error}</p>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={send} disabled={loading}
                style={{ flex: 1, background: "#c8a97e", color: "#050b14", border: "none", borderRadius: 8, padding: "0.8rem", fontSize: "0.85rem", fontWeight: 700, cursor: loading ? "default" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Sending…" : "Send Email →"}
              </button>
              <button onClick={onClose} style={{ padding: "0.8rem 1.25rem", background: "transparent", color: "rgba(143,163,177,0.5)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, fontSize: "0.85rem", cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

export default function BlogsPage() {
  const { stats, refresh } = useManager();
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserStat | null>(null);
  const [emailTarget, setEmailTarget] = useState<UserStat | null>(null);
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  const users = useMemo(() => {
    if (!stats) return [];
    const q = search.toLowerCase().trim();
    if (!q) return stats.users;
    return stats.users.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [stats, search]);

  return (
    <div className="mgr-fade">
      {/* Header */}
      <div style={{ padding: "2.5rem 2.5rem 2rem", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p style={{ margin: "0 0 0.3rem", color: "rgba(200,169,126,0.45)", fontSize: "0.62rem", letterSpacing: "0.16em", textTransform: "uppercase" }}>Manage</p>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.75rem", color: "#fffef9", margin: 0, fontWeight: 600, letterSpacing: "-0.01em" }}>All Blogs</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ color: "rgba(143,163,177,0.35)", fontSize: "0.72rem" }}>{stats?.totalUsers ?? 0} total</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "0.55rem 1rem", color: "#fffef9", fontFamily: "Inter, sans-serif", fontSize: "0.82rem", outline: "none", width: 240 }} />
        </div>
      </div>

      <div style={{ padding: "1.5rem 2.5rem" }}>
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
                        <span style={{ display: "inline-block", background: u.role === "owner" ? "rgba(200,169,126,0.1)" : "rgba(255,255,255,0.04)", color: u.role === "owner" ? "#c8a97e" : "rgba(143,163,177,0.55)", borderRadius: 4, padding: "0.18rem 0.6rem", fontSize: "0.6rem", letterSpacing: "0.06em", fontWeight: 600, textTransform: "uppercase" }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "1rem 1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: u.onboarded ? "#4a9e7a" : "#c8943a" }} />
                          <span style={{ color: u.onboarded ? "#4a9e7a" : "#c8943a", fontSize: "0.75rem" }}>{u.onboarded ? "Active" : "Pending"}</span>
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
                            style={{ color: "#c8a97e", fontSize: "0.72rem", background: "rgba(200,169,126,0.07)", border: "1px solid rgba(200,169,126,0.15)", borderRadius: 6, padding: "0.3rem 0.6rem", cursor: "pointer", transition: "all 0.12s" }} className="mgr-btn">
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
        />
      )}
      {emailTarget && (
        <EmailModal user={emailTarget} onClose={() => setEmailTarget(null)} />
      )}
    </div>
  );
}
