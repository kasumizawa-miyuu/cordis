interface Props {
  roomId: string;
  onClose: () => void;
}

export default function PluginPanel({ onClose }: Props) {
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
        style={{ background: "#fff", padding: 24, borderRadius: 12, width: 420 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Plugins</h2>
        <p>Plugin panel coming soon.</p>
        <button onClick={onClose} style={{ width: "100%", padding: 10, marginTop: 16 }}>
          Close
        </button>
      </div>
    </div>
  );
}