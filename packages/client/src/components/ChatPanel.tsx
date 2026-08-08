import { useState, useRef, useEffect, type FormEvent } from "react";
import MessageBubble from "./MessageBubble";
import { useChat } from "../hooks/useChat";
import { useRoomStore } from "../store/roomStore";

interface Props {
  roomId: string;
}

export default function ChatPanel({ roomId }: Props) {
  const { messages, isLoading, hasMore, loadMore, sendMessage, sendTyping, sendReaction } =
    useChat(roomId);
  const [input, setInput] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef(0);
  const members = useRoomStore((s) => s.members);

  useEffect(() => {
    if (messages.length > prevLength.current) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }
    prevLength.current = messages.length;
  }, [messages.length]);

  const handleScroll = () => {
    if (listRef.current && listRef.current.scrollTop === 0 && hasMore) {
      loadMore(roomId);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput("");
  };

  const getSenderName = (senderId: string) => {
    const member = members.find((m) => m.userId === senderId);
    return member?.user?.nickname || senderId.slice(0, 8);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        ref={listRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 16,
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        {isLoading && messages.length === 0 && <p style={{ textAlign: "center" }}>Loading messages...</p>}
        {hasMore && messages.length > 0 && (
          <button
            onClick={() => loadMore(roomId)}
            disabled={isLoading}
            style={{ width: "100%", marginBottom: 8, padding: 4, background: "none", border: "1px solid #ccc", cursor: "pointer" }}
          >
            {isLoading ? "Loading..." : "Load more"}
          </button>
        )}
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            senderNickname={getSenderName(msg.senderId)}
            onReaction={sendReaction}
          />
        ))}
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", padding: 12, gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            sendTyping();
          }}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button type="submit" style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#1a73e8", color: "#fff", cursor: "pointer" }}>
          Send
        </button>
      </form>
    </div>
  );
}