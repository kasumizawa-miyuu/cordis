import { create } from "zustand";
import api from "../services/api";
import type { Message } from "@cordis/shared";

interface ChatState {
  messages: Message[];
  hasMore: boolean;
  isLoading: boolean;
  cursor: string | null;
  addMessage: (message: Message) => void;
  loadHistory: (roomId: string) => Promise<void>;
  loadMore: (roomId: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  hasMore: true,
  isLoading: false,
  cursor: null,

  addMessage: (message) =>
    set((state) => {
      if (state.messages.find((m) => m.id === message.id)) return state;
      return { messages: [...state.messages, message] };
    }),

  loadHistory: async (roomId: string) => {
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/rooms/${roomId}/messages`, {
        params: { limit: 50 },
      });
      set({
        messages: data.messages.reverse(),
        hasMore: data.messages.length === 50,
        cursor: data.cursor || null,
        isLoading: false,
      });
    } catch {
      set({ isLoading: false });
    }
  },

  loadMore: async (roomId: string) => {
    const { cursor, isLoading, hasMore } = get();
    if (isLoading || !hasMore) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get(`/rooms/${roomId}/messages`, {
        params: { cursor, limit: 50 },
      });
      set((state) => ({
        messages: [...data.messages.reverse(), ...state.messages],
        hasMore: data.messages.length === 50,
        cursor: data.cursor || null,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  clearMessages: () => set({ messages: [], hasMore: true, cursor: null }),
}));