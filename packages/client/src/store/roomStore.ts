import { create } from "zustand";
import api from "../services/api";
import type { Room, RoomMember } from "@cordis/shared";

interface MemberWithNickname extends RoomMember {
  user?: { nickname: string };
}

interface RoomState {
  room: Room | null;
  members: MemberWithNickname[];
  isLoading: boolean;
  error: string | null;
  fetchRoom: (roomId: string) => Promise<void>;
  setRoom: (room: Room | null) => void;
  setMembers: (members: MemberWithNickname[]) => void;
  updateMemberReady: (userId: string, isReady: boolean) => void;
  addMember: (member: MemberWithNickname) => void;
  removeMember: (userId: string) => void;
  updateMemberRole: (userId: string, role: string) => void;
  updateMemberMute: (userId: string, isMuted: boolean) => void;
  updateRoom: (data: Partial<Room>) => void;
  clearError: () => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  members: [],
  isLoading: false,
  error: null,

  fetchRoom: async (roomId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get(`/rooms/${roomId}`);
      set({ room: data.room, members: data.members, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.message || "Failed to load room" });
    }
  },

  setRoom: (room) => set({ room }),
  setMembers: (members) => set({ members }),

  updateMemberReady: (userId, isReady) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.userId === userId ? { ...m, isReady } : m,
      ),
    })),

  addMember: (member) =>
    set((state) => {
      if (state.members.find((m) => m.userId === member.userId)) return state;
      return { members: [...state.members, member] };
    }),

  removeMember: (userId) =>
    set((state) => ({
      members: state.members.filter((m) => m.userId !== userId),
    })),

  updateMemberRole: (userId, role) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.userId === userId ? { ...m, role: role as any } : m,
      ),
    })),

  updateMemberMute: (userId, isMuted) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.userId === userId ? { ...m, isMuted } : m,
      ),
    })),

  updateRoom: (data) =>
    set((state) => ({
      room: state.room ? { ...state.room, ...data } : null,
    })),

  clearError: () => set({ error: null }),
}));