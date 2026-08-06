import { useState, useEffect } from "react";
import api from "../services/api";
import { getSocket } from "../services/socket";
import type { IPluginManifest } from "@cordis/shared";

interface Props {
  roomId: string;
  onClose: () => void;
}

export default function PluginPanel({ roomId, onClose }: Props) {
  const [plugins, setPlugins] = useState<IPluginManifest[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningPlugin, setRunningPlugin] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPlugins();
    const socket = getSocket();
    if (socket) {
      socket.on("plugin:start", () => setRunningPlugin("running"));
      socket.on("plugin:end", () => setRunningPlugin(null));
    }
    return () => {
      if (socket) {
        socket.off("plugin:start");
        socket.off("plugin:end");
      }
    };
  }, []);

  const fetchPlugins = async () => {
    try {
      const { data } = await api.get("/plugin/list");
      setPlugins(data);
    } catch {}
  };

  const handleStart = async (plugin: IPluginManifest) => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/plugin/start", {
        roomId,
        pluginId: plugin.id,
      });
      setRunningPlugin(plugin.id);
      window.open(`${plugin.url}?token=${data.token}`, "_blank");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to start plugin");
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async (plugin: IPluginManifest) => {
    setLoading(true);
    setError("");
    try {
      await api.post("/plugin/end", {
        pluginId: plugin.id,
        token: "temp",
      });
      setRunningPlugin(null);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to end plugin");
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
        <h2>Plugins</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}
        {plugins.length === 0 ? (
          <p>No plugins available.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {plugins.map((plugin) => {
              const isRunning = runningPlugin === plugin.id;
              return (
                <div
                  key={plugin.id}
                  style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 8,
                    padding: 16,
                  }}
                >
                  <h3 style={{ margin: "0 0 4px" }}>{plugin.name}</h3>
                  <p style={{ color: "#666", fontSize: 13, margin: "0 0 8px" }}>
                    {plugin.description}
                  </p>
                  <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px" }}>
                    v{plugin.version}
                    {plugin.requiresReady ? " · Requires ready" : ""}
                  </p>
                  {isRunning ? (
                    <div>
                      <span style={{ color: "#4caf50", fontSize: 13, marginRight: 8 }}>
                        Plugin running
                      </span>
                      <button onClick={() => handleEnd(plugin)} disabled={loading} style={{ padding: "6px 12px" }}>
                        End
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStart(plugin)}
                      disabled={loading}
                      style={{ padding: "8px 16px", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      {loading ? "Starting..." : "Start"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onClose} style={{ width: "100%", padding: 10, marginTop: 16 }}>
          Close
        </button>
      </div>
    </div>
  );
}