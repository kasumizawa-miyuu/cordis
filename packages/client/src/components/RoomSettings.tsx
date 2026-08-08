import { useState, type FormEvent } from "react";
import api from "../services/api";
import { useRoomStore } from "../store/roomStore";

interface Props {
  roomId: string;
  onClose: () => void;
}

export default function RoomSettings({ roomId, onClose }: Props) {
  const { room } = useRoomStore();
  const [name, setName] = useState(room?.name || "");
  const [description, setDescription] = useState(room?.description || "");
  const [maxMembers, setMaxMembers] = useState(room?.maxMembers || 50);
  const [isPublic, setIsPublic] = useState(room?.isPublic ?? true);
  const [requireReady, setRequireReady] = useState(room?.requireReady ?? false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.put(`/rooms/${roomId}`, {
        name,
        description: description || null,
        maxMembers,
        isPublic,
        requireReady,
        password: password || null,
      });
      useRoomStore.getState().setRoom(data);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", padding: 24, borderRadius: 12, width: 420, maxHeight: "90vh", overflow: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Room Settings</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={50}
              style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box", minHeight: 60 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Max Members: {maxMembers}</label>
            <input
              type="range"
              min={2}
              max={100}
              value={maxMembers}
              onChange={(e) => setMaxMembers(Number(e.target.value))}
              style={{ width: "100%", marginTop: 4 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Public
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={requireReady} onChange={(e) => setRequireReady(e.target.checked)} />
              Require Ready
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Password (leave empty to remove)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
            />
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button type="submit" disabled={loading} style={{ flex: 1, padding: 10 }}>
              {loading ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={onClose} style={{ padding: 10 }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}