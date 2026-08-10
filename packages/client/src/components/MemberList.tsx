import api from "../services/api";
import { useRoomStore } from "../store/roomStore";
import { useAuthStore } from "../store/authStore";

export default function MemberList() {
  const { members, room } = useRoomStore();
  const user = useAuthStore((s) => s.user);
  const isOwner = room?.ownerId === user?.id;
  const isAdmin = members.find((m) => m.userId === user?.id)?.role === "ADMIN";

  const handleKick = async (userId: string) => {
    if (!room) return;
    try {
      await api.post(`/rooms/${room.id}/kick/${userId}`);
      useRoomStore.getState().removeMember(userId);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to kick member");
    }
  };

  const handleMute = async (userId: string, mute: boolean) => {
    if (!room) return;
    try {
      if (mute) {
        await api.post(`/rooms/${room.id}/mute/${userId}`);
      } else {
        await api.post(`/rooms/${room.id}/unmute/${userId}`);
      }
      useRoomStore.getState().updateMemberMute(userId, mute);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  const handlePromote = async (userId: string) => {
    if (!room) return;
    try {
      await api.post(`/rooms/${room.id}/promote/${userId}`);
      useRoomStore.getState().updateMemberRole(userId, "ADMIN");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to promote");
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      OWNER: "#ff9800",
      ADMIN: "#4caf50",
      MEMBER: "#9e9e9e",
    };
    return (
      <span
        style={{
          background: colors[role] || "#666",
          color: "#fff",
          padding: "2px 6px",
          borderRadius: 4,
          fontSize: 11,
          marginLeft: 8,
        }}
      >
        {role}
      </span>
    );
  };

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Members ({members.length})</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {members.map((member) => {
          const canManage = (isOwner || isAdmin) && member.userId !== user?.id && member.role !== "OWNER";
          return (
            <div
              key={member.userId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <div style={{ display: "flex", alignItems: "center" }}>
                <span>{(member as any).nickname || member.user?.nickname || member.userId.slice(0, 8)}</span>
                {roleBadge(member.role)}
                {member.isMuted && (
                  <span style={{ color: "red", fontSize: 11, marginLeft: 8 }}>Muted</span>
                )}
              </div>
              {canManage && (
                <div style={{ display: "flex", gap: 4 }}>
                  {isOwner && member.role === "MEMBER" && (
                    <button
                      onClick={() => handlePromote(member.userId)}
                      style={{ fontSize: 11, padding: "2px 6px", cursor: "pointer" }}
                    >
                      Admin
                    </button>
                  )}
                  <button
                    onClick={() => handleMute(member.userId, !member.isMuted)}
                    style={{ fontSize: 11, padding: "2px 6px", cursor: "pointer" }}
                  >
                    {member.isMuted ? "Unmute" : "Mute"}
                  </button>
                  <button
                    onClick={() => handleKick(member.userId)}
                    style={{ fontSize: 11, padding: "2px 6px", cursor: "pointer", color: "red" }}
                  >
                    Kick
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}