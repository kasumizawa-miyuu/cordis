import type { Server as SocketIOServer, Socket } from "socket.io";

export function setupNotificationHandlers(_io: SocketIOServer, socket: Socket): void {
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
  }
}