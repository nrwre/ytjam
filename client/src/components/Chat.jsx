import React, { useEffect, useRef, useState } from "react";
import { useRoom } from "../context/RoomContext.jsx";

const QUICK_EMOJI = ["🔥", "😂", "❤️", "🎶", "👏", "💀", "😭", "🙌"];

function Chat() {
  const { chatMessages, sendChatMessage, clientId } = useRoom();
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chatMessages]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    sendChatMessage(text);
    setText("");
  }

  function addEmoji(emoji) {
    setText((prev) => prev + emoji);
  }

  return (
    <div className="flex h-80 flex-col rounded-xl bg-neutral-900 p-4">
      <h2 className="mb-2 text-sm font-semibold text-neutral-300">Chat</h2>

      <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto pr-1">
        {chatMessages.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-500">No messages yet. Say hi!</p>
        )}
        {chatMessages.map((msg) => (
          <div key={msg.id} className={`text-sm ${msg.clientId === clientId ? "text-right" : ""}`}>
            <span className="text-xs font-medium text-neutral-500">{msg.name}</span>
            <p
              className={`inline-block max-w-[85%] break-words rounded-lg px-2.5 py-1 ${
                msg.clientId === clientId ? "ml-auto bg-red-600/80 text-white" : "bg-neutral-800 text-neutral-100"
              }`}
            >
              {msg.text}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-1">
        {QUICK_EMOJI.map((emoji) => (
          <button
            key={emoji}
            onClick={() => addEmoji(emoji)}
            className="rounded-md px-1.5 py-0.5 text-base hover:bg-neutral-800"
          >
            {emoji}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-2 flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          maxLength={500}
          className="flex-1 rounded-lg bg-neutral-800 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-red-600"
        />
        <button
          type="submit"
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold hover:bg-red-500"
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;
