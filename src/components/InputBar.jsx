import { useState, useRef } from "react";

const TOOLS = [
  { id: "web_search", label: "Web search", desc: "Search the internet" },
  { id: "calculator", label: "Calculator", desc: "Math & expressions" },
  { id: "code_runner", label: "Code runner", desc: "Run Python code" },
  { id: "file_reader", label: "File reader", desc: "Analyze PDF, CSV, TXT" },
  { id: "wikipedia", label: "Wikipedia", desc: "Look up knowledge" },
  { id: "send_email", label: "Email", desc: "Send an email" },
  { id: "sql_query", label: "SQL query", desc: "Query a database" },
  { id: "generate_image", label: "Image gen", desc: "Generate an image" },
];

export default function InputBar({ onSend, loading, onStop }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [recording, setRecording] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [enabledTools, setEnabledTools] = useState(TOOLS.map((t) => t.id));

  const fileRef = useRef(null);
  const textRef = useRef(null);
  const recognitionRef = useRef(null);
  const textValueRef = useRef(""); // ← fix: tracks text without stale closure

  const toggleTool = (id) => {
    setEnabledTools((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const startVoice = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Use Chrome or Edge for voice input.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => setRecording(true);

    recognition.onresult = (e) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          finalTranscript += e.results[i][0].transcript;
        } else {
          interimTranscript += e.results[i][0].transcript;
        }
      }

      // ✅ use ref instead of stale `text` state
      if (textRef.current) {
        textRef.current.value = textValueRef.current + finalTranscript + interimTranscript;
        textRef.current.style.height = "auto";
        textRef.current.style.height = Math.min(textRef.current.scrollHeight, 200) + "px";
      }

      if (finalTranscript) {
        const updated = textValueRef.current + finalTranscript;
        textValueRef.current = updated;
        setText(updated);
      }
    };

    recognition.onerror = (e) => {
      console.error("Speech error:", e.error);
      setRecording(false);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognition.start();
  };

  const handleSend = () => {
    if ((!text.trim() && !file) || loading) return;
    onSend(text.trim(), file, enabledTools);
    setText("");
    textValueRef.current = ""; // ← keep ref in sync on clear
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    if (textRef.current) textRef.current.style.height = "auto";
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    textValueRef.current = e.target.value; // ← keep ref in sync on manual type
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  return (
    <div style={{
      padding: "12px 20px 20px", background: "#212121",
      flexShrink: 0, position: "relative",
      width: "100%", maxWidth: 760, margin: "0 auto",
    }}>

      {/* Tool picker */}
      {showTools && (
        <>
          <div onClick={() => setShowTools(false)} style={{ position: "fixed", inset: 0, zIndex: 10 }} />
          <div style={{
            position: "absolute", bottom: "calc(100% + 6px)", left: 20,
            background: "#171717", border: "1px solid #2a2a2a",
            borderRadius: 12, padding: 6, zIndex: 20, width: 280,
          }}>
            <p style={{ fontSize: 11, color: "#555", padding: "6px 10px 8px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Tools
            </p>
            {TOOLS.map((tool) => (
              <div
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 8, cursor: "pointer", transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "#222"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: "#ccc", margin: 0 }}>{tool.label}</p>
                  <p style={{ fontSize: 11, color: "#555", margin: 0 }}>{tool.desc}</p>
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: `1px solid ${enabledTools.includes(tool.id) ? "#e05c2a" : "#333"}`,
                  background: enabledTools.includes(tool.id) ? "#e05c2a" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  {enabledTools.includes(tool.id) && (
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
            <div style={{ borderTop: "1px solid #222", margin: "4px 0 0", padding: "6px 6px 2px", display: "flex", gap: 6 }}>
              <button onClick={() => setEnabledTools(TOOLS.map(t => t.id))} style={{ flex: 1, padding: "5px 0", background: "none", border: "1px solid #2a2a2a", borderRadius: 6, color: "#666", fontSize: 11, cursor: "pointer" }}>
                Enable all
              </button>
              <button onClick={() => setEnabledTools([])} style={{ flex: 1, padding: "5px 0", background: "none", border: "1px solid #2a2a2a", borderRadius: 6, color: "#666", fontSize: 11, cursor: "pointer" }}>
                Disable all
              </button>
            </div>
          </div>
        </>
      )}

      {/* File preview */}
      {file && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 12px", background: "#2a2a2a", borderRadius: 8, fontSize: 12, color: "#aaa" }}>
          {file.type.startsWith("image/") ? (
            <img src={URL.createObjectURL(file)} alt="preview" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover" }} />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 2h6l3 3v8H3V2z" stroke="#888" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M9 2v3h3" stroke="#888" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          )}
          <span style={{ flex: 1 }}>{file.name}</span>
          <button onClick={() => setFile(null)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* Input box */}
      <div style={{
        background: "#2f2f2f", borderRadius: 16,
        padding: "10px 12px", display: "flex", alignItems: "flex-end", gap: 8,
        border: "1px solid #333",
      }}>
        {/* Tools button */}
        <button
          onClick={() => setShowTools(p => !p)}
          title="Choose tools"
          style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: showTools ? "#3a3a3a" : "none",
            border: "1px solid #444",
            color: enabledTools.length > 0 ? "#e05c2a" : "#555",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", transition: "all 0.15s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
  <path d="M3 4H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  <circle cx="6" cy="4" r="1.5" fill="currentColor"/>
  <path d="M3 8H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  <circle cx="10" cy="8" r="1.5" fill="currentColor"/>
  <path d="M3 12H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  <circle cx="5" cy="12" r="1.5" fill="currentColor"/>
</svg>
        </button>

        {/* Attach */}
        <button
          onClick={() => fileRef.current?.click()}
          title="Attach file or image"
          style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: "none", border: "1px solid #444", color: "#555",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#ececec"}
          onMouseLeave={e => e.currentTarget.style.color = "#555"}
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M13 7.5l-5.5 5.5a3.5 3.5 0 01-5-5l6-6a2 2 0 013 3L6 11a1 1 0 01-1-1l5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.csv,.txt,.jpg,.jpeg,.png,.gif,.webp"
          style={{ display: "none" }}
          onChange={e => setFile(e.target.files[0] || null)}
        />

        {/* Textarea */}
        <textarea
          ref={textRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKey}
          placeholder="Message ADH..."
          disabled={loading}
          rows={1}
          style={{
            flex: 1, background: "none", border: "none", outline: "none",
            resize: "none", color: "#ececec", fontSize: 15, lineHeight: 1.6,
            padding: "2px 0", fontFamily: "inherit",
            minHeight: 28, maxHeight: 200, overflowY: "auto",
          }}
        />

        {/* Voice */}
        <button
          onClick={startVoice}
          title="Voice input"
          style={{
            width: 32, height: 32, borderRadius: 8,
            border: `1px solid ${recording ? "#e05c2a" : "#444"}`,
            background: recording ? "#e05c2a" : "none",
            color: recording ? "#fff" : "#555",
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0, transition: "all 0.15s",
          }}
          onMouseEnter={e => { if (!recording) { e.currentTarget.style.color = "#ececec"; e.currentTarget.style.borderColor = "#888"; } }}
          onMouseLeave={e => { if (!recording) { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#444"; } }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="4.5" y="1" width="5" height="7" rx="2.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M2 7a5 5 0 0 0 10 0M7 12v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>

        {/* Stop / Send */}
        {loading ? (
          <button
            onClick={onStop}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "none", flexShrink: 0,
              background: "#3a3a3a", color: "#fff", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
            title="Stop generating"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="#fff">
              <rect x="2" y="2" width="8" height="8" rx="1" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() && !file}
            style={{
              width: 32, height: 32, borderRadius: 8, border: "none", flexShrink: 0,
              background: !text.trim() && !file ? "#3a3a3a" : "#e05c2a",
              color: "#fff",
              cursor: !text.trim() && !file ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 12V3M3 6l4-4 4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      <p style={{ fontSize: 11, color: "#3a3a3a", textAlign: "center", marginTop: 8 }}>
        ADH can make mistakes. Verify important info.
      </p>

      <style>{`
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        textarea::placeholder { color: #555; }
      `}</style>
    </div>
  );
}