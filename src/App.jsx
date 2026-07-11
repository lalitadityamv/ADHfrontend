import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function newChat() {
  return { id: generateId(), title: "New chat", messages: [] };
}

export default function App() {
  const [chats, setChats] = useState(() => {
    const saved = localStorage.getItem("adh_chats");
    return saved ? JSON.parse(saved) : [newChat()];
  });
  const [activeChatId, setActiveChatId] = useState(chats[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const wasDesktop = useRef(window.innerWidth > 768);

  useEffect(() => {
    localStorage.setItem("adh_chats", JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    const handleResize = () => {
      const isDesktop = window.innerWidth > 768;
      // Only react when we actually cross the mobile/desktop breakpoint.
      // Prevents mobile keyboard open/close (which fires resize on height
      // change only) from force-closing the sidebar mid-edit.
      if (isDesktop !== wasDesktop.current) {
        wasDesktop.current = isDesktop;
        setSidebarOpen(isDesktop);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const activeChat = chats.find((c) => c.id === activeChatId) || chats[0];

  const createNewChat = () => {
    const chat = newChat();
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    if (window.innerWidth <= 768) setSidebarOpen(false);
  };

  const updateChat = (id, updater) => {
    setChats((prev) => prev.map((c) => (c.id === id ? updater(c) : c)));
  };

  const renameChat = (id, title) => {
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  };

  const deleteChat = (id) => {
    setChats((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const chat = newChat();
        setActiveChatId(chat.id);
        return [chat];
      }
      if (id === activeChatId) setActiveChatId(remaining[0].id);
      return remaining;
    });
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#212121", width: "100vw" }}>
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelect={(id) => {
          setActiveChatId(id);
          if (window.innerWidth <= 768) setSidebarOpen(false);
        }}
        onNew={createNewChat}
        onDelete={deleteChat}
        onRename={renameChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <ChatWindow
        key={activeChatId}
        chat={activeChat}
        onUpdate={(updater) => updateChat(activeChatId, updater)}
        onMenuOpen={() => setSidebarOpen(true)}
      />
    </div>
  );
}