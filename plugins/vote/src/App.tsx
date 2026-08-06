import { useState, useEffect, useCallback } from "react";

interface Poll {
  question: string;
  options: string[];
  votes: Record<string, string[]>;
}

interface PluginContext {
  room: { id: string; name: string };
  members: { userId: string; nickname: string }[];
}

const API_BASE = "http://localhost:3000";

function getTokenFromURL(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") || "";
}

export default function App() {
  const token = getTokenFromURL();
  const [context, setContext] = useState<PluginContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [question, setQuestion] = useState("");
  const [optionsInput, setOptionsInput] = useState("");
  const [poll, setPoll] = useState<Poll | null>(null);
  const [votedOption, setVotedOption] = useState<string | null>(null);
  const [pluginId, setPluginId] = useState("vote");

  useEffect(() => {
    if (!token) {
      setError("No token provided");
      setLoading(false);
      return;
    }
    fetchContext();
  }, [token]);

  const fetchContext = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/plugin/${pluginId}/context`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch context");
      const data = await res.json();
      setContext(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = () => {
    if (!question.trim()) return;
    const options = optionsInput
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    if (options.length < 2) {
      alert("Please enter at least 2 options");
      return;
    }
    const votes: Record<string, string[]> = {};
    options.forEach((opt) => {
      votes[opt] = [];
    });
    setPoll({ question: question.trim(), options, votes });
    setQuestion("");
    setOptionsInput("");
  };

  const handleVote = (option: string) => {
    if (!poll || votedOption) return;
    setPoll((prev) => {
      if (!prev) return null;
      const newVotes = { ...prev.votes };
      newVotes[option] = [...newVotes[option], "me"];
      return { ...prev, votes: newVotes };
    });
    setVotedOption(option);
  };

  const handleEndVote = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/plugin/end`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pluginId, token }),
      });
      if (!res.ok) throw new Error("Failed to end plugin");
      window.close();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading Vote Plugin...</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 24 }}>
      <h1>Vote Plugin</h1>
      {context && (
        <p style={{ color: "#666", fontSize: 14 }}>
          Room: <strong>{context.room.name}</strong> · {context.members.length} members
        </p>
      )}

      {!poll ? (
        <div style={{ marginTop: 24, padding: 20, border: "1px solid #e0e0e0", borderRadius: 12 }}>
          <h2>Create a Poll</h2>
          <div style={{ marginBottom: 12 }}>
            <label>Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What to vote on?"
              style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Options (comma-separated)</label>
            <input
              type="text"
              value={optionsInput}
              onChange={(e) => setOptionsInput(e.target.value)}
              placeholder="Option A, Option B, Option C"
              style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
            />
          </div>
          <button onClick={handleCreatePoll} style={{ padding: "10px 24px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
            Create Poll
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <div style={{ padding: 20, border: "1px solid #e0e0e0", borderRadius: 12 }}>
            <h2>{poll.question}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {poll.options.map((option) => {
                const count = poll.votes[option]?.length || 0;
                const total = Object.values(poll.votes).reduce((sum, v) => sum + v.length, 0);
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={option}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>{option}</span>
                      <span>
                        {count} vote{count !== 1 ? "s" : ""} ({pct}%)
                      </span>
                    </div>
                    <div style={{ background: "#e0e0e0", borderRadius: 4, height: 8, overflow: "hidden" }}>
                      <div
                        style={{
                          background: votedOption === option ? "#1a73e8" : "#4caf50",
                          height: "100%",
                          width: `${pct}%`,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    {!votedOption && (
                      <button
                        onClick={() => handleVote(option)}
                        style={{ marginTop: 8, padding: "6px 16px", cursor: "pointer" }}
                      >
                        Vote
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button onClick={handleEndVote} style={{ padding: "10px 24px", background: "#f44336", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>
              End Vote
            </button>
          </div>
        </div>
      )}
    </div>
  );
}