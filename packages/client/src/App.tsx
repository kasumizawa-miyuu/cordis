import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import LobbyPage from "./pages/LobbyPage";
import CreateRoomPage from "./pages/CreateRoomPage";
import RoomPage from "./pages/RoomPage";
import InviteJoinPage from "./pages/InviteJoinPage";
import { useAuth } from "./hooks/useAuth";

function AppRoutes() {
  useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/lobby" element={<LobbyPage />} />
        <Route path="/create-room" element={<CreateRoomPage />} />
        <Route path="/room/:roomId" element={<RoomPage />} />
        <Route path="/invite/:code" element={<InviteJoinPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/lobby" replace />} />
      <Route path="*" element={<Navigate to="/lobby" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}