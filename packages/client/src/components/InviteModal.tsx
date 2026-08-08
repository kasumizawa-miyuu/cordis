import { useState, useEffect } from "react";
import api from "../services/api";
import type { Invitation } from "@cordis/shared";

interface Props {
  roomId: string;
  onClose: () => void;
}

export default function InviteModal({ roomId, onClose }: Props) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const { data } = await api.get(`/rooms/${roomId}/invitations`);
      setInvitations(data);
    } catch {}
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/rooms/${roomId}/invitations`, {});
      setGeneratedCode(data.code);
      fetchInvitations();
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to generate invite");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      alert("Invite code copied!");
    });
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
        <h2>Invite People</h2>
        <button onClick={handleGenerate} disabled={loading} style={{ padding: "10px 20px", marginBottom: 16 }}>
          {loading ? "Generating..." : "Generate Invite Code"}
        </button>
        {generatedCode && (
          <div style={{ background: "#f0f0f0", padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <p style={{ fontSize: 20, fontWeight: "bold", letterSpacing: 2, textAlign: "center" }}>
              {generatedCode}
            </p>
            <button onClick={handleCopy} style={{ width: "100%", padding: 8 }}>
              Copy Code
            </button>
          </div>
        )}
        <h3>Past Invitations</h3>
        {invitations.length === 0 ? (
          <p>No invitations yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {invitations.map((inv) => (
              <div
                key={inv.id}
                style={{
                  padding: 8,
                  border: "1px solid #e0e0e0",
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <span style={{ fontWeight: "bold" }}>{inv.code}</span>
                <span style={{ marginLeft: 8, color: "#888" }}>
                  Used: {inv.useCount}/{inv.maxUses || "∞"}
                </span>
                <span style={{ marginLeft: 8, color: "#888" }}>
                  Expires: {new Date(inv.expiresAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} style={{ marginTop: 16, width: "100%", padding: 10 }}>
          Close
        </button>
      </div>
    </div>
  );
}