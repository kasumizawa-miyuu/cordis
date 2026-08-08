import type { Message } from "@cordis/shared";
import { useAuthStore } from "../store/authStore";

interface Props {
  message: Message;
  senderNickname?: string;
  reactions?: { emoji: string; userId: string }[];
  onReaction?: (messageId: string, emoji: string) => void;
}

export default function MessageBubble({ message, senderNickname, reactions = [], onReaction }: Props) {
  const user = useAuthStore((s) => s.user);
  const isOwn = user?.id === message.senderId;
  const time = new Date(message.createdAt).toLocaleTimeString();

  const emojis = ["👍", "❤️", "😄", "🎉", "👀"];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isOwn ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      <div style={{ fontSize: 12, color: "#888", marginBottom: 2 }}>
        {senderNickname || "Unknown"} · {time}
      </div>
      <div
        style={{
          background: isOwn ? "#1a73e8" : "#f1f1f1",
          color: isOwn ? "#fff" : "#333",
          padding: "8px 14px",
          borderRadius: 12,
          maxWidth: "70%",
          wordBreak: "break-word",
        }}
      >
        {message.content}
      </div>
      {reactions.length > 0 && (
        <div style={{ marginTop: 4, fontSize: 14 }}>
          {reactions.map((r, i) => (
            <span key={i}>{r.emoji}</span>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 4, marginTop: 2 }}>
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onReaction?.(message.id, emoji)}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              padding: 0,
            }}
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}