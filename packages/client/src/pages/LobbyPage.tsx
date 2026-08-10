import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import type { Room } from "@cordis/shared";

interface RoomListResponse {
  rooms: Room[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function LobbyPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (tagFilter) params.set("tags", tagFilter);

      const { data } = await api.get<RoomListResponse>(`/rooms?${params.toString()}`);
      setRooms(data.rooms);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error("Failed to fetch rooms", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, tagFilter]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchRooms();
  };

  const handleJoin = async (roomId: string, hasPassword: boolean) => {
    if (hasPassword) {
      const password = prompt("Enter room password:");
      if (!password) return;
      try {
        await api.post(`/rooms/${roomId}/join`, { password });
        navigate(`/room/${roomId}`);
      } catch (err: any) {
        alert(err.response?.data?.message || "Failed to join room");
      }
    } else {
      try {
        await api.post(`/rooms/${roomId}/join`);
        navigate(`/room/${roomId}`);
      } catch (err: any) {
        alert(err.response?.data?.message || "Failed to join room");
      }
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1>Lobby</h1>
        <Link to="/create-room">
          <button style={{ padding: "10px 20px", fontSize: 16, cursor: "pointer" }}>Create Room</button>
        </Link>
      </div>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search rooms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <input
          type="text"
          placeholder="Filter by tag..."
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          style={{ flex: 1, padding: 8 }}
        />
        <button type="submit" style={{ padding: "8px 16px" }}>Search</button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : rooms.length === 0 ? (
        <p>No rooms found. Create one!</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {rooms.map((room) => (
            <div
              key={room.id}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                padding: 16,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>
                  {room.name}
                  {room.password ? " 🔒" : ""}
                  {room.isLocked ? " 🔐" : ""}
                </h3>
                {room.description && (
                  <p style={{ color: "#666", margin: "4px 0" }}>{room.description}</p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {room.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        background: "#e8f0fe",
                        color: "#1a73e8",
                        padding: "2px 8px",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p style={{ fontSize: 14, color: "#888", margin: "4px 0 0" }}>
                  {room.requireReady ? "Ready required" : "No ready required"}
                </p>
              </div>
              <button
                onClick={() => handleJoin(room.id, !!room.password)}
                disabled={room.isLocked}
                style={{ padding: "8px 20px", cursor: room.isLocked ? "not-allowed" : "pointer" }}
              >
                {room.isLocked ? "Locked" : "Join"}
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </button>
          <span style={{ padding: "8px 16px" }}>
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}