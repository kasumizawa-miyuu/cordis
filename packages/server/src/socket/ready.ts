import type { Server as SocketIOServer, Socket } from "socket.io";
import prisma from "../db";

export function setupReadyHandlers(io: SocketIOServer, socket: Socket): void {
  socket.on("ready:toggle", async (data: { roomId: string }) => {
    try {
      const member = await prisma.roomMember.findFirst({
        where: { roomId: data.roomId, userId: socket.userId! },
      });

      if (!member) {
        socket.emit("ready:error", { message: "Not a member of this room" });
        return;
      }

      const updated = await prisma.roomMember.update({
        where: { id: member.id },
        data: { isReady: !member.isReady },
      });

      io.to(`room:${data.roomId}`).emit("ready:update", {
        userId: socket.userId,
        isReady: updated.isReady,
      });
    } catch (err) {
      const error = err as Error;
      socket.emit("ready:error", { message: error.message });
    }
  });
}