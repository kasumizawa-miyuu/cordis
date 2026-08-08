import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { setupChatHandlers } from "./chat";
import { setupRoomHandlers } from "./room";
import { setupReadyHandlers } from "./ready";
import { setupNotificationHandlers } from "./notification";

declare module "socket.io" {
  interface Socket {
    userId?: string;
    email?: string;
  }
}

export function createSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.clientUrl,
      methods: ["GET", "POST"],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const payload = jwt.verify(token, config.jwtSecret) as {
        userId: string;
        email: string;
      };
      socket.userId = payload.userId;
      socket.email = payload.email;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    setupNotificationHandlers(io, socket);
    setupChatHandlers(io, socket);
    setupRoomHandlers(io, socket);
    setupReadyHandlers(io, socket);
  });

  return io;
}