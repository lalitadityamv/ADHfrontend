import { useState, useEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import InputBar from "./InputBar";
import { jsPDF } from "jspdf";

const API = import.meta.env.VITE_API_URL;

export default function ChatWindow({ chat, onUpdate, onMenuOpen }) {
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("accounts/fireworks/models/minimax-m3");
  const bottomRef = useRef(null);
  const abortRef = useRef(null);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const stopGeneration = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}, [chat.messages]);
  const sendMessage = async (text, file, enabledTools) => {
    let uploadedFile = null;

    if (file) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch(`${API}/upload`, { method: "POST", body: form });
        const data = await res.json();
        if (data.error) { alert(data.error); return; }
        uploadedFile = data;

        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        const fileExt = data.filename.split('.').pop().toLowerCase();
        if (imageExts.includes(fileExt)) {
          uploadedFile.isImage = true;
          uploadedFile.imageUrl = `${API}/image/${data.filename}`;
        } else {
          try {
            const readRes = await fetch(`${API}/readfile`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename: data.filename }),
            });
            const readData = await readRes.json();
            if (readData.content) uploadedFile.content = readData.content;
          } catch {}
        }
      } catch (e) { alert("File upload failed: " + e.message); return; }
    }

    const userMsg = {
      role: "user",
      content: text + (uploadedFile ? `\n\n📎 ${uploadedFile.original}` : ""),
      tools: [],
      uploadedImage: uploadedFile?.isImage ? uploadedFile.imageUrl : null,
    };

    const assistantMsg = { role: "assistant", content: "", tools: [], thinking: [], imageUrl: null };

    onUpdate((c) => ({
      ...c,
      title: c.messages.length === 0 ? (text || uploadedFile?.original || "New chat").slice(0, 40) : c.title,
      messages: [...c.messages, userMsg, assistantMsg],
    }));

    setLoading(true);

    let searchContext = "";
    const searchTriggers = ["latest", "current", "today", "news", "price", "weather", "search", "find", "look up", "who is", "what is"];
    const needsSearch = text && searchTriggers.some(t => text.toLowerCase().includes(t));

    if (needsSearch && enabledTools?.includes("web_search")) {
      onUpdate((c) => {
        const msgs = [...c.messages];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], thinking: ["web_search"] };
        return { ...c, messages: msgs };
      });
      try {
        const searchRes = await fetch(`${API}/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text }),
        });
        const searchData = await searchRes.json();
        if (searchData.results) {
          searchContext = "\n\nWeb search results:\n" + searchData.results
            .map(r => `[${r.title}](${r.url})\n${r.content}`).join("\n\n");
        }
      } catch {}
    }

    let imageUrl = "";
    const imageTriggers = ["generate image", "create image", "draw", "make an image", "generate a picture", "create a picture", "generate an image of", "create an image of", "image of"];
    const needsImage = text && imageTriggers.some(t => text.toLowerCase().includes(t));

    if (needsImage && enabledTools?.includes("generate_image")) {
      onUpdate((c) => {
        const msgs = [...c.messages];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], thinking: [...(msgs[msgs.length - 1].thinking || []), "generate_image"] };
        return { ...c, messages: msgs };
      });
      try {
        const imgRes = await fetch(`${API}/imagine`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        });
        const imgData = await imgRes.json();
        if (imgData.url) {
          imageUrl = imgData.url;
          onUpdate((c) => {
            const msgs = [...c.messages];
            msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], imageUrl };
            return { ...c, messages: msgs };
          });
        }
      } catch {}
    }

    let codeOutput = "";
    const codeMatch = text?.match(/```python([\s\S]*?)```/);
    if (codeMatch && enabledTools?.includes("code_runner")) {
      onUpdate((c) => {
        const msgs = [...c.messages];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], thinking: [...(msgs[msgs.length - 1].thinking || []), "code_runner"] };
        return { ...c, messages: msgs };
      });
      try {
        const codeRes = await fetch(`${API}/code`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: codeMatch[1].trim() }),
        });
        const codeData = await codeRes.json();
        if (codeData.output) {
          codeOutput = `\n\nCode execution output:\n\`\`\`\n${codeData.output}\n\`\`\`\nPlease acknowledge this output.`;
        }
      } catch {}
    }

    try {
      abortRef.current = new AbortController();
      const res = await fetch(`${API}/chat`, {
        method: "POST",
        signal: abortRef.current.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: (text || (uploadedFile?.isImage ? "Please analyze and describe this image in detail." : "Please analyze this uploaded file and summarize it.")) +
            (imageUrl ? `\n\nI just generated an image for the user. Tell them the image has been generated and is shown above, and describe what it likely looks like based on the prompt: "${text}"` : "") +
            (uploadedFile?.content ? `\n\nFile "${uploadedFile.original}" contents:\n${uploadedFile.content}` : "") +
            searchContext + codeOutput,
          history: chat.messages.map(m => ({ role: m.role, content: m.content })),
          enabledTools,
          model,
          imageFile: uploadedFile?.isImage ? uploadedFile.imageUrl : null,
          maxTokens,
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "token") {
              onUpdate((c) => {
                const msgs = [...c.messages];
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: msgs[msgs.length - 1].content + event.token };
                return { ...c, messages: msgs };
              });
            }
            if (event.type === "done" && event.output) {
              onUpdate((c) => {
                const msgs = [...c.messages];
                if (!msgs[msgs.length - 1].content) {
                  msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: event.output };
                }
                return { ...c, messages: msgs };
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      onUpdate((c) => {
        const msgs = [...c.messages];
        msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: "Connection error — is the backend running?" };
        return { ...c, messages: msgs };
      });
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = chat.messages.length === 0;

  const exportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;
    doc.setFontSize(18);
    doc.setTextColor(224, 92, 42);
    doc.text("ADH — Chat Export", 20, y);
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(`${chat.title} · ${new Date().toLocaleDateString()}`, 20, y);
    y += 12;
    doc.setDrawColor(50, 50, 50);
    doc.line(20, y, pageWidth - 20, y);
    y += 10;
    chat.messages.forEach((msg) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(10);
      doc.setTextColor(msg.role === "user" ? 200 : 150, msg.role === "user" ? 100 : 150, msg.role === "user" ? 42 : 150);
      doc.text(msg.role === "user" ? "You" : "ADH", 20, y);
      y += 6;
      doc.setTextColor(220, 220, 220);
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(msg.content || "", pageWidth - 40);
      lines.forEach(line => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.text(line, 20, y);
        y += 6;
      });
      y += 6;
    });
    doc.save(`ADH-${chat.title.slice(0, 30)}.pdf`);
  };

  return (
    <main style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      height: "100svh", // instead of "100dvh"
      overflow: "hidden",
      background: "#212121",
      minWidth: 0,
    }}>

      {/* Topbar */}
      <div style={{
        padding: "10px 12px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
        borderBottom: "1px solid #2a2a2a",
        minHeight: 48,
        overflow: "hidden",
      }}>
        {/* Hamburger */}
        <button onClick={onMenuOpen} style={{
          background: "none", border: "none", color: "#666",
          cursor: "pointer", padding: 4, flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4h14M2 9h14M2 14h14" stroke="#888" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Title */}
        <span style={{
          fontSize: 13, color: "#666", flex: 1,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          minWidth: 0,
        }}>{chat.title}</span>

        
        {/* Token slider — always visible */}
<div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
  <span style={{ fontSize: 11, color: "#555", whiteSpace: "nowrap" }}>
    {maxTokens >= 1000 ? `${(maxTokens / 1000).toFixed(0)}k` : maxTokens}
  </span>
  <input
    type="range" min={256} max={50000} step={256} value={maxTokens}
    onChange={e => setMaxTokens(Number(e.target.value))}
    style={{ width: isMobile ? 48 : 80, accentColor: "#e05c2a", cursor: "pointer" }}
  />
</div>

        {/* Export PDF */}
        <button onClick={exportPDF} title="Export PDF" style={{
          background: "none", border: "1px solid #333", borderRadius: 8,
          color: "#666", cursor: "pointer", padding: "4px 8px",
          fontSize: 12, display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
          transition: "all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.color = "#ececec"; e.currentTarget.style.borderColor = "#555"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#666"; e.currentTarget.style.borderColor = "#333"; }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M2 10h9M6.5 1v7M4 6l2.5 2.5L9 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {!isMobile && "Export PDF"}
        </button>

        {/* Model selector */}
        <select value={model} onChange={e => setModel(e.target.value)} style={{
          fontSize: isMobile ? 11 : 12,
          background: "#2a2a2a", color: "#aaa",
          padding: "4px 6px", borderRadius: 20, border: "1px solid #333",
          cursor: "pointer", outline: "none",
          maxWidth: isMobile ? 90 : 140, flexShrink: 1,
        }}>
          <option value="accounts/fireworks/models/minimax-m3">{isMobile ? "MiniMax" : "MiniMax M3"}</option>
          <option value="accounts/fireworks/models/deepseek-v4-pro">{isMobile ? "DeepSeek" : "DeepSeek V4"}</option>
          <option value="accounts/fireworks/models/glm-5p1">GLM 5</option>
          <option value="accounts/fireworks/models/kimi-k2p6">Kimi K2</option>
        </select>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 0" }}>
        {isEmpty ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", gap: 16,
            width: "100%", textAlign: "center", padding: "0 20px",
          }}>
            <img src="/ADH_favicon.png" alt="ADH" style={{ width: 64, height: 64, borderRadius: 16 }} />
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: "#ececec", margin: 0 }}>How can I help you today?</h1>
            <p style={{ fontSize: 14, color: "#666", margin: 0 }}>Powered by AMD Instinct GPUs</p>
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 10, maxWidth: 560, marginTop: 8, width: "100%",
            }}>
              {[
                { title: "Search the web", sub: "What's the latest news about AI?", icon: "🌐" },
                { title: "Run Python code", sub: "Write and run a fibonacci sequence", icon: "💻" },
                { title: "Analyze a file", sub: "Upload a PDF or CSV to analyze", icon: "📄" },
                { title: "Generate an image", sub: "Create an image of a futuristic city", icon: "🎨" },
              ].map((p) => (
                <button
                  key={p.title}
                  onClick={() => sendMessage(p.sub, null, ["web_search", "code_runner", "file_reader", "generate_image"])}
                  style={{
                    background: "#2a2a2a", border: "1px solid #333", borderRadius: 12,
                    padding: "14px 16px", cursor: "pointer", textAlign: "left", transition: "background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#333"}
                  onMouseLeave={e => e.currentTarget.style.background = "#2a2a2a"}
                >
                  <p style={{ fontSize: 13, fontWeight: 500, color: "#ececec", margin: "0 0 4px" }}>{p.icon} {p.title}</p>
                  <p style={{ fontSize: 12, color: "#666", margin: 0 }}>{p.sub}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: 680, margin: "0 auto", padding: isMobile ? "0 12px" : "0 40px", width: "100%" }}>
            {chat.messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} isLast={i === chat.messages.length - 1} loading={loading} isMobile={isMobile} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input bar */}
      <div style={{ flexShrink: 0 }}>
        <InputBar onSend={sendMessage} loading={loading} onStop={stopGeneration} />
      </div>
    </main>
  );
}