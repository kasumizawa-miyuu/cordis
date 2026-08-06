import { useEffect, useRef } from "react";
import { connectSocket, disconnectSocket, getSocket } from "../services/socket";
import { useChatStore } from "../store/chatStore";
import { useRoomStore } from "../store/roomStore";
import type { Message } from "@cordis/shared";

export function useSocket(roomId: string) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const socket = connectSocket();

    socket.emit("room:join", { roomId });

    socket.on("chat:message", (message: Message) => {
      useChatStore.getState().addMessage(message);
    });

    socket.on("chat:typing", (data: { userId: string }) => {
      // handled in ChatPanel
    });

    socket.on("chat:reaction", (data: { messageId: string; emoji: string; userId: string }) => {
      // handled in MessageBubble
    });

    socket.on("room:member_joined", (data: { userId: string }) => {
      useRoomStore.getState().fetchRoom(roomId);
    });

    socket.on("room:member_left", (data: { userId: string }) => {
      useRoomStore.getState().removeMember(data.userId);
    });

    socket.on("ready:update", (data: { userId: string; isReady: boolean }) => {
      useRoomStore.getState().updateMemberReady(data.userId, data.isReady);
    });

    socket.on("plugin:start", () => {
      useRoomStore.getState().updateRoom({ isLocked: true });
    });

    socket.on("plugin:end", () => {
      useRoomStore.getState().updateRoom({ isLocked: false });
    });

    return () => {
      socket.emit("room:leave", { roomId });
      socket.off("chat:message");
      socket.off("chat:typing");
      socket.off("chat:reaction");
      socket.off("room:member_joined");
      socket.off("room:member_left");
      socket.off("ready:update");
      socket.off("plugin:start");
      socket.off("plugin:end");
      disconnectSocket();
    };
  }, [roomId]);
}