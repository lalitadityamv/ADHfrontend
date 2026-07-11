import { useState, useEffect } from "react";

export default function Sidebar({ chats, activeChatId, onSelect, onNew, onDelete, onRename, isOpen, onClose }) {
  const [hoveredId, setHoveredId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const groupChats = () => {
    const today = [], yesterday = [], older = [];
    const now = Date.now();
    chats.forEach((c) => {
      const age = now - c.id.slice(0, 8);
      if (age < 86400000) today.push(c);
      else if (age < 172800000) yesterday.push(c);
      else older.push(c);
    });
    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupChats();

  const ChatItem = ({ chat }) => {
    const [editing, setEditing] = useState(false);
    const [title, setTitle] = useState(chat.title);

    const handleRename = () => {
      if (title.trim()) onRename(chat.id, title.trim());
      setEditing(false);
    };

    const showActions = isMobile || hoveredId === chat.id;

    return (
      <div
        onMouseEnter={() => setHoveredId(chat.id)}
        onMouseLeave={() => setHoveredId(null)}
        onClick={() => !editing && onSelect(chat.id)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "6px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 1,
          background: activeChatId === chat.id ? "#2f2f2f" : hoveredId === chat.id ? "#2a2a2a" : "transparent",
          transition: "background 0.1s",
        }}
      >
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={e => e.key === "Enter" && handleRename()}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, background: "#3a3a3a", border: "none", outline: "none",
              color: "#ececec", fontSize: 13, borderRadius: 4, padding: "2px 6px",
            }}
          />
        ) : (
          <span style={{ fontSize: 13, color: activeChatId === chat.id ? "#ececec" : "#8a8a8a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
            {chat.title}
          </span>
        )}
        {showActions && !editing && (
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              onClick={e => { e.stopPropagation(); setEditing(true); }}
              style={{ background: "none", border: "none", color: "#666", cursor: "pointer", padding: "0 4px", display: "flex", alignItems: "center" }}
              title="Rename"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8.5 1.5a1.5 1.5 0 0 1 2 2L4 10H2v-2L8.5 1.5z" stroke="#666" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(chat.id); }}
              style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 13, padding: "0 4px" }}
              title="Delete"
            >✕</button>
          </div>
        )}
      </div>
    );
  };

  const Section = ({ label, items }) => items.length === 0 ? null : (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 11, color: "#555", padding: "6px 10px 4px", fontWeight: 500 }}>{label}</p>
      {items.map((c) => <ChatItem key={c.id} chat={c} />)}
    </div>
  );

  return (
    <>
      {isOpen && isMobile && (
        <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }} />
      )}
      <aside style={{
        width: 260, minWidth: 260, height: "100vh",
        background: "#171717", display: "flex", flexDirection: "column",
        position: isMobile ? "fixed" : "relative",
        top: 0, left: 0, bottom: 0, zIndex: 50,
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
        flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: "12px 10px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/ADH_favicon.png" alt="ADH" style={{ width: 70, height: 70, borderRadius: 8 }} />
          </div>
          {isMobile && (
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 18 }}>✕</button>
          )}
        </div>

        {/* New chat button */}
        <div style={{ padding: "4px 8px 12px" }}>
          <button onClick={onNew} style={{
            width: "100%", padding: "8px 12px", background: "none",
            border: "1px solid #333", borderRadius: 8,
            color: "#ececec", cursor: "pointer", fontSize: 13,
            display: "flex", alignItems: "center", gap: 8,
            transition: "background 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#2a2a2a"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="#ececec" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New chat
          </button>
        </div>

        {/* Chat list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 6px" }}>
          <Section label="Today" items={today} />
          <Section label="Yesterday" items={yesterday} />
          <Section label="Older" items={older} />
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 14px", borderTop: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2ecc71" }}/>
          <span style={{ fontSize: 12, color: "#555" }}>fireworks-ai</span>
        </div>
      </aside>
    </>
  );
}