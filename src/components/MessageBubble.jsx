import { useState } from "react";
import ReactMarkdown from "react-markdown";

const TOOL_LABELS = {
  web_search: "Searching the web",
  calculator: "Calculating",
  code_runner: "Running code",
  file_reader: "Reading file",
  wikipedia: "Searching Wikipedia",
  send_email: "Sending email",
  sql_query: "Querying database",
  generate_image: "Generating image",
};

function CopyCodeButton({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        position: "absolute", top: 8, right: 8,
        background: "#2a2a2a", border: "1px solid #3a3a3a",
        borderRadius: 6, color: copied ? "#2ecc71" : "#888",
        cursor: "pointer", fontSize: 11, padding: "3px 8px",
        transition: "all 0.15s",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function MessageBubble({ message, isLast, loading, isMobile }) {
  const isUser = message.role === "user";
  const [thinkingOpen, setThinkingOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  // indent for assistant content — less on mobile so image has full width
  const indent = isMobile ? 36 : 38;

  const copyText = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadImage = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `adh-image-${Date.now()}.png`;
    a.click();
  };

  return (
    <div style={{ marginBottom: 32, display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start", width: "100%" }}>

      {/* User message */}
      {isUser && (
        <div style={{
          maxWidth: isMobile ? "88%" : "70%", padding: "12px 16px",
          borderRadius: "18px 18px 4px 18px",
          background: "#2f2f2f", color: "#ececec",
          fontSize: 15, lineHeight: 1.7,
          wordBreak: "break-word",
        }}>
          {message.uploadedImage && (
            <img src={message.uploadedImage} alt="Uploaded" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8, display: "block" }}/>
          )}
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
      )}

      {/* Assistant message */}
      {!isUser && (
        <div style={{ width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <img src="/ADH_favicon.png" alt="ADH" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: "#ececec" }}>ADH</span>
          </div>

          {/* Thinking block */}
          {message.thinking?.length > 0 && (
            <div style={{ marginBottom: 14, marginLeft: indent, border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden", background: "#1a1a1a" }}>
              <button onClick={() => setThinkingOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "none", border: "none", cursor: "pointer", color: "#666", fontSize: 13, textAlign: "left" }}>
                {isLast && loading ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: "spin 1s linear infinite", flexShrink: 0 }}>
                    <circle cx="7" cy="7" r="5.5" fill="none" stroke="#e05c2a" strokeWidth="1.5" strokeDasharray="20 10"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
                    <circle cx="7" cy="7" r="5.5" fill="none" stroke="#444" strokeWidth="1.5"/>
                    <path d="M7 4.5v2.5l1.5 1" stroke="#444" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
                  </svg>
                )}
                <span style={{ color: isLast && loading ? "#e05c2a" : "#555", fontSize: 13, flex: 1 }}>
                  {isLast && loading
                    ? (TOOL_LABELS[message.thinking[message.thinking.length - 1]] || "Thinking") + "..."
                    : `Used ${message.thinking.length} tool${message.thinking.length > 1 ? "s" : ""}`}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: thinkingOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <path d="M2 4l4 4 4-4" stroke="#555" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {thinkingOpen && (
                <div style={{ borderTop: "1px solid #222" }}>
                  {message.thinking.map((tool, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 14px", fontSize: 13, color: "#555", borderBottom: i < message.thinking.length - 1 ? "1px solid #1e1e1e" : "none" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: i === message.thinking.length - 1 && isLast && loading ? "#e05c2a" : "#333" }}/>
                      {TOOL_LABELS[tool] || tool}
                      {i === message.thinking.length - 1 && isLast && loading && <span style={{ color: "#e05c2a", fontSize: 12 }}>...</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Generated image — full width on mobile */}
          {message.imageUrl && (
            <div style={{
              marginLeft: isMobile ? 0 : indent,
              marginBottom: 12,
              position: "relative",
              display: "block",
              width: isMobile ? "100%" : `calc(100% - ${indent}px)`,
            }}>
              <img
                src={message.imageUrl}
                alt="Generated"
                style={{ width: "100%", borderRadius: 10, display: "block" }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <button
                onClick={() => downloadImage(message.imageUrl)}
                style={{
                  position: "absolute", bottom: 8, right: 8,
                  background: "rgba(0,0,0,0.7)", border: "1px solid #444",
                  borderRadius: 8, color: "#ececec", cursor: "pointer",
                  fontSize: 12, padding: "5px 10px",
                  display: "flex", alignItems: "center", gap: 5,
                  backdropFilter: "blur(4px)",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(0,0,0,0.9)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(0,0,0,0.7)"}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 9h8M6 1v6M4 5l2 2 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Download
              </button>
            </div>
          )}

          {/* Response text */}
          <div style={{ marginLeft: indent, fontSize: 15, lineHeight: 1.8, color: "#ececec", wordBreak: "break-word" }}>
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const codeString = String(children).replace(/\n$/, "");
                  return inline ? (
                    <code style={{ background: "#2a2a2a", padding: "2px 6px", borderRadius: 4, fontSize: 13, color: "#e05c2a" }} {...props}>{children}</code>
                  ) : (
                    <div style={{ position: "relative", margin: "12px 0" }}>
                      <pre style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "12px 16px", overflowX: "auto", margin: 0 }}>
                        <code style={{ fontSize: 13, color: "#ececec", fontFamily: "monospace" }} {...props}>{children}</code>
                      </pre>
                      <CopyCodeButton code={codeString} />
                    </div>
                  );
                },
                a({ children, href }) {
                  return <a href={href} target="_blank" rel="noreferrer" style={{ color: "#e05c2a", textDecoration: "none" }}>{children}</a>;
                },
                p({ children }) {
                  return <p style={{ margin: "0 0 12px", lineHeight: 1.8 }}>{children}</p>;
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
            {isLast && loading && (
              <span style={{ display: "inline-block", width: 8, height: 16, background: "#ececec", opacity: 0.8, animation: "blink 1s infinite", verticalAlign: "text-bottom", marginLeft: 2 }}/>
            )}
          </div>

          {/* Copy response button */}
          {(!isLast || !loading) && message.content && (
            <button
              onClick={copyText}
              style={{ marginLeft: indent, marginTop: 8, background: "none", border: "none", color: copied ? "#2ecc71" : "#444", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4, padding: "4px 0", transition: "color 0.15s" }}
              onMouseEnter={e => { if (!copied) e.currentTarget.style.color = "#aaa"; }}
              onMouseLeave={e => { if (!copied) e.currentTarget.style.color = "#444"; }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M2 9H1.5A1.5 1.5 0 0 1 0 7.5v-6A1.5 1.5 0 0 1 1.5 0h6A1.5 1.5 0 0 1 9 1.5V2" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              {copied ? "Copied!" : "Copy response"}
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}