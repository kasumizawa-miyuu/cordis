import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import api from "../services/api";

export function useAuth() {
  const { isAuthenticated, isLoading, setUser } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      api
        .get("/auth/me")
        .then(({ data }) => {
          setUser(data);
        })
        .catch(() => {
          useAuthStore.getState().logout();
        });
    }
  }, [isAuthenticated, setUser]);

  return { isLoading };
}