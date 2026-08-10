import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../hooks/useSocket";
import { useRoom } from "../hooks/useRoom";
import { useAuthStore } from "../store/authStore";
import { useRoomStore } from "../store/roomStore";
import ChatPanel from "../components/ChatPanel";
import MemberList from "../components/MemberList";
import ReadyPanel from "../components/ReadyPanel";
import RoomSettings from "../components/RoomSettings";
import InviteModal from "../components/InviteModal";
import PluginPanel from "../components/PluginPanel";
import api from "../services/api";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, members, isLoading, error } = useRoom(roomId!);
  const user = useAuthStore((s) => s.user);
  const [showSettings, setShowSettings] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showPlugin, setShowPlugin] = useState(false);

  useSocket(roomId!);

  if (isLoading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading room...</div>;
  }

  if (error || !room) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "red" }}>{error || "Room not found"}</p>
        <button onClick={() => navigate("/lobby")}>Back to Lobby</button>
      </div>
    );
  }

  const isOwner = room.ownerId === user?.id;

  const handleLeave = async () => {
    try {
      await api.post(`/rooms/${roomId}/leave`);
    } catch {
      // proceed even if API fails
    }
    navigate("/lobby");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid #e0e0e0",
          background: "#fafafa",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>{room.name}</h2>
          {room.description && <p style={{ margin: "4px 0 0", color: "#666", fontSize: 14 }}>{room.description}</p>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {isOwner && (
            <button onClick={() => setShowPlugin(true)} style={{ padding: "8px 16px" }}>
              Plugins
            </button>
          )}
          <button onClick={() => setShowInvite(true)} style={{ padding: "8px 16px" }}>
            Invite
          </button>
          {isOwner && (
            <button onClick={() => setShowSettings(true)} style={{ padding: "8px 16px" }}>
              Settings
            </button>
          )}
          <button
            onClick={handleLeave}
            style={{ padding: "8px 16px", color: "red" }}
          >
            Leave
          </button>
        </div>
      </div>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <ChatPanel roomId={roomId!} />
          <ReadyPanel />
        </div>
        <div style={{ width: 260, borderLeft: "1px solid #e0e0e0", overflowY: "auto" }}>
          <MemberList />
        </div>
      </div>
      {showSettings && (
        <RoomSettings roomId={roomId!} onClose={() => setShowSettings(false)} />
      )}
      {showInvite && (
        <InviteModal roomId={roomId!} onClose={() => setShowInvite(false)} />
      )}
      {showPlugin && (
        <PluginPanel roomId={roomId!} onClose={() => setShowPlugin(false)} />
      )}
    </div>
  );
}