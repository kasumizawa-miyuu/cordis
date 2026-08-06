import { useEffect, useCallback, useRef } from "react";
import { useChatStore } from "../store/chatStore";
import { getSocket } from "../services/socket";

export function useChat(roomId: string) {
  const { messages, isLoading, hasMore, loadHistory, loadMore, addMessage } = useChatStore();
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadHistory(roomId);
    return () => {
      useChatStore.getState().clearMessages();
    };
  }, [roomId, loadHistory]);

  const sendMessage = useCallback(
    (content: string) => {
      const socket = getSocket();
      if (!socket) return;
      socket.emit("chat:send", { roomId, content, type: "TEXT" });
    },
    [roomId],
  );

  const sendTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;
    if (typingTimeout.current) return;
    socket.emit("chat:typing", { roomId });
    typingTimeout.current = setTimeout(() => {
      typingTimeout.current = null;
    }, 3000);
  }, [roomId]);

  const sendReaction = useCallback(
    (messageId: string, emoji: string) => {
      const socket = getSocket();
      if (!socket) return;
      socket.emit("chat:reaction", { messageId, emoji, roomId });
    },
    [roomId],
  );

  return { messages, isLoading, hasMore, loadMore, sendMessage, sendTyping, sendReaction };
}