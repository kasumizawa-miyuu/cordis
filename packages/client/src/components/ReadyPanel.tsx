import { getSocket } from "../services/socket";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";

export default function ReadyPanel() {
  const { room, members } = useRoomStore();
  const user = useAuthStore((s) => s.user);
  const myMember = members.find((m) => m.userId === user?.id);
  const allReady = members.length > 0 && members.every((m) => m.isReady);

  const handleToggle = () => {
    if (!room) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit("ready:toggle", { roomId: room.id });
  };

  if (!room?.requireReady) return null;

  return (
    <div style={{ padding: 16, borderTop: "1px solid #e0e0e0", background: "#fafafa" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Ready Status</h3>
        <button
          onClick={handleToggle}
          style={{
            padding: "8px 20px",
            background: myMember?.isReady ? "#4caf50" : "#ff9800",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {myMember?.isReady ? "Ready!" : "Not Ready"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {members.map((m) => (
          <span
            key={m.userId}
            style={{
              padding: "4px 12px",
              borderRadius: 16,
              background: m.isReady ? "#e8f5e9" : "#fff3e0",
              color: m.isReady ? "#2e7d32" : "#e65100",
              fontSize: 13,
              border: `1px solid ${m.isReady ? "#a5d6a7" : "#ffcc80"}`,
            }}
          >
            {m.user?.nickname || m.userId.slice(0, 8)}: {m.isReady ? "Ready" : "Waiting"}
          </span>
        ))}
      </div>
      {allReady && (
        <p style={{ color: "#2e7d32", fontWeight: "bold", marginTop: 8 }}>
          All members are ready!
        </p>
      )}
    </div>
  );
}