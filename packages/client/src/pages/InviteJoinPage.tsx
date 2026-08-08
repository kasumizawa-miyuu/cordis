import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function InviteJoinPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const join = async () => {
      try {
        const { data } = await api.post("/invitations/join", { code });
        navigate(`/room/${data.roomId}`, { replace: true });
      } catch (err: any) {
        setStatus("error");
        setErrorMsg(err.response?.data?.message || "Invalid or expired invite code");
      }
    };
    if (code) {
      join();
    }
  }, [code, navigate]);

  if (status === "loading") {
    return <div style={{ padding: 40, textAlign: "center" }}>Joining room via invite...</div>;
  }

  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <p style={{ color: "red" }}>{errorMsg}</p>
      <button onClick={() => navigate("/lobby")}>Back to Lobby</button>
    </div>
  );
}