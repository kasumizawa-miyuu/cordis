import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function CreateRoomPage() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxMembers, setMaxMembers] = useState(50);
  const [isPublic, setIsPublic] = useState(true);
  const [requireReady, setRequireReady] = useState(false);
  const [password, setPassword] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const { data } = await api.post("/rooms", {
        name,
        description: description || undefined,
        maxMembers,
        isPublic,
        requireReady,
        password: password || undefined,
        tags,
      });
      navigate(`/room/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create room");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: "0 20px" }}>
      <h1>Create Room</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="name">Room Name *</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
            style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box", minHeight: 80 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="maxMembers">Max Members: {maxMembers}</label>
          <input
            id="maxMembers"
            type="range"
            min={2}
            max={100}
            value={maxMembers}
            onChange={(e) => setMaxMembers(Number(e.target.value))}
            style={{ width: "100%", marginTop: 4 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Public Room
          </label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={requireReady}
              onChange={(e) => setRequireReady(e.target.checked)}
            />
            Require Ready
          </label>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password">Password (optional)</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            id="tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="e.g. gaming, tech, chat"
            style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
          />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ width: "100%", padding: 10 }}>
          {loading ? "Creating..." : "Create Room"}
        </button>
      </form>
    </div>
  );
}