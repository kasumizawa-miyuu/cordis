import { Outlet, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          borderBottom: "1px solid #e0e0e0",
          background: "#fafafa",
        }}
      >
        <Link to="/lobby" style={{ fontWeight: "bold", fontSize: 20, textDecoration: "none", color: "#333" }}>
          Cordis
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {user && (
            <span>
              {user.nickname} ({user.email})
            </span>
          )}
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 16px",
              border: "1px solid #ccc",
              borderRadius: 4,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </nav>
      <main style={{ padding: 24 }}>
        <Outlet />
      </main>
    </div>
  );
}