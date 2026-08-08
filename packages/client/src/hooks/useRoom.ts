import { useEffect } from "react";
import { useRoomStore } from "../store/roomStore";

export function useRoom(roomId: string) {
  const { room, members, isLoading, error, fetchRoom, clearError } = useRoomStore();

  useEffect(() => {
    fetchRoom(roomId);
    return () => {
      clearError();
    };
  }, [roomId, fetchRoom, clearError]);

  return { room, members, isLoading, error };
}