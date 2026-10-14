import React, { useState } from "react";
import axios from "axios";
import { X, Send } from "lucide-react";
import axiosInstance from "../lib/axios";

const AiSidebar = ({ onClose }) => {
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    setChat((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axiosInstance.post(
        "/ai/chat",
        { message: input },
        { withCredentials: true }
      );

      const botMsg = { role: "assistant", content: res.data.reply };
      setChat((prev) => [...prev, botMsg]);
    } catch (err) {
      setChat((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ AI failed to respond." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-white border-l shadow-lg z-50 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-bold text-lg">🤖 AI Assistant</h2>
        <button onClick={onClose}>
          <X />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {chat.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded ${
              msg.role === "user"
                ? "bg-blue-100 self-end text-right"
                : "bg-gray-100 self-start text-left"
            }`}
          >
            <p className="text-sm whitespace-pre-line">{msg.content}</p>
          </div>
        ))}
        {loading && <p className="text-gray-400 text-sm">Typing...</p>}
      </div>

      <div className="p-3 border-t flex items-center gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="Ask something..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default AiSidebar;
