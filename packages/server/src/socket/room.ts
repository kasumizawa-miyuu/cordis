import type { Server as SocketIOServer, Socket } from "socket.io";

export function setupRoomHandlers(io: SocketIOServer, socket: Socket): void {
  socket.on("room:join", (data: { roomId: string }) => {
    socket.join(`room:${data.roomId}`);
    io.to(`room:${data.roomId}`).emit("room:member_joined", {
      userId: socket.userId,
      roomId: data.roomId,
    });
  });

  socket.on("room:leave", (data: { roomId: string }) => {
    socket.leave(`room:${data.roomId}`);
    io.to(`room:${data.roomId}`).emit("room:member_left", {
      userId: socket.userId,
      roomId: data.roomId,
    });
  });
}