import type { Server as SocketIOServer, Socket } from "socket.io";
import { MessageService } from "../services/message.js";
import { FEATURE_FLAGS } from "@cordis/shared";

export function setupChatHandlers(io: SocketIOServer, socket: Socket): void {
  socket.on("chat:send", async (data: { roomId: string; content: string; type?: string }) => {
    try {
      const { roomId, content, type } = data;

      if ((type === "IMAGE" || type === "VIDEO") && !FEATURE_FLAGS.ENABLE_MEDIA_MESSAGES) {
        socket.emit("chat:error", { message: "Media messages are disabled" });
        return;
      }

      const message = await MessageService.create(
        roomId,
        socket.userId!,
        content,
        type,
      );

      io.to(`room:${roomId}`).emit("chat:message", message);
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      socket.emit("chat:error", { message: error.message });
    }
  });

  socket.on("chat:typing", (data: { roomId: string }) => {
    socket.to(`room:${data.roomId}`).emit("chat:typing", {
      userId: socket.userId,
      roomId: data.roomId,
    });
  });

  socket.on("chat:reaction", (data: { messageId: string; emoji: string; roomId: string }) => {
    io.to(`room:${data.roomId}`).emit("chat:reaction", {
      messageId: data.messageId,
      emoji: data.emoji,
      userId: socket.userId,
    });
  });
}