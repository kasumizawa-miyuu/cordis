import { create } from "zustand";
import api from "../services/api";
import type { AuthResponse } from "@cordis/shared";

interface User {
  id: string;
  email: string;
  nickname: string;
  avatarUrl?: string | null;
  isEmailVerified: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname: string) => Promise<void>;
  verifyEmail: (email: string, code: string, type: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem("accessToken"),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post<AuthResponse>("/auth/login", {
        email,
        password,
      });
      localStorage.setItem("accessToken", data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.tokens.refreshToken);
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      const message = err.response?.data?.message || "Login failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  register: async (email: string, password: string, nickname: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/register", { email, password, nickname });
      set({ isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.message || "Registration failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  verifyEmail: async (email: string, code: string, type: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post<AuthResponse>("/auth/verify-email", {
        email,
        code,
        type,
      });
      localStorage.setItem("accessToken", data.tokens.accessToken);
      localStorage.setItem("refreshToken", data.tokens.refreshToken);
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      const message = err.response?.data?.message || "Verification failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  requestPasswordReset: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/reset-password", { email });
      set({ isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.message || "Request failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  confirmPasswordReset: async (email: string, code: string, newPassword: string) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/reset-password/confirm", {
        email,
        code,
        newPassword,
      });
      set({ isLoading: false });
    } catch (err: any) {
      const message = err.response?.data?.message || "Password reset failed";
      set({ isLoading: false, error: message });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ user: null, isAuthenticated: false, error: null });
  },

  clearError: () => set({ error: null }),

  setUser: (user: User | null) =>
    set({ user, isAuthenticated: !!user }),
}));