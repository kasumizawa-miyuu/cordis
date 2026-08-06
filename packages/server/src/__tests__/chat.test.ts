import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServer } from "node:http";
import express from "express";
import { Server as SocketIOServer } from "socket.io";
import { io as ClientIO, Socket as ClientSocket } from "socket.io-client";
import { createSocketServer } from "../socket";
import jwt from "jsonwebtoken";
import prisma from "../db";
import type { Express } from "express";

vi.mock("../db", () => ({
  default: {
    message: {
      create: vi.fn(),
    },
    roomMember: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("jsonwebtoken");

const mockRoom = {
  id: "room-1",
  name: "Test Room",
  ownerId: "user-1",
  maxMembers: 10,
  isPublic: true,
  isLocked: false,
  requireReady: false,
  password: null,
  tags: [],
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

const mockMember = {
  id: "member-1",
  roomId: "room-1",
  userId: "user-1",
  role: "OWNER",
  isReady: false,
  isMuted: false,
  joinedAt: new Date("2024-01-01"),
};

const mockMessage = {
  id: "msg-1",
  roomId: "room-1",
  senderId: "user-1",
  content: "Hello world",
  type: "TEXT",
  metadata: null,
  createdAt: new Date("2024-01-01T12:00:00Z"),
  sender: { id: "user-1", nickname: "TestUser" },
};

describe("Socket.IO Gateway", () => {
  let httpServer: ReturnType<typeof createServer>;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  let clientSocket2: ClientSocket;
  let app: Express;
  const port = 3099;

  beforeEach(async () => {
    vi.clearAllMocks();

    vi.mocked(jwt.verify).mockReturnValue({
      userId: "user-1",
      email: "test@example.com",
    } as never);

    vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(mockMember as never);
    vi.mocked(prisma.message.create).mockResolvedValue(mockMessage as never);

    app = express();
    httpServer = createServer(app);
    io = createSocketServer(httpServer);

    await new Promise<void>((resolve) => {
      httpServer.listen(port, resolve);
    });
  });

  afterEach(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    if (clientSocket2?.connected) {
      clientSocket2.disconnect();
    }
    await new Promise<void>((resolve) => {
      io.close();
      httpServer.close(() => resolve());
    });
  });

  async function connectClient(): Promise<ClientSocket> {
    return new Promise((resolve, reject) => {
      const socket = ClientIO(`http://localhost:${port}`, {
        auth: { token: "valid-token" },
        transports: ["websocket"],
        timeout: 2000,
      });
      socket.on("connect", () => resolve(socket));
      socket.on("connect_error", (err) => reject(err));
      setTimeout(() => reject(new Error("Connection timeout")), 3000);
    });
  }

  async function connectAndJoinRoom(): Promise<ClientSocket> {
    const socket = await connectClient();
    socket.emit("room:join", { roomId: "room-1" });
    await new Promise((resolve) => setTimeout(resolve, 100));
    return socket;
  }

  describe("chat:send", () => {
    it("broadcasts message to room", async () => {
      clientSocket = await connectClient();
      clientSocket2 = await connectAndJoinRoom();

      const messagePromise = new Promise<{ content: string }>((resolve) => {
        clientSocket2.on("chat:message", (data) => resolve(data));
      });

      clientSocket.emit("chat:send", {
        roomId: "room-1",
        content: "Hello world",
      });

      const received = await messagePromise;
      expect(received.content).toBe("Hello world");
    }, 10000);

    it("rejects muted user", async () => {
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue({
        ...mockMember,
        isMuted: true,
      } as never);

      clientSocket = await connectClient();

      const errorPromise = new Promise<{ message: string }>((resolve) => {
        clientSocket.on("chat:error", (data) => resolve(data));
      });

      clientSocket.emit("chat:send", {
        roomId: "room-1",
        content: "Hello world",
      });

      const received = await errorPromise;
      expect(received.message).toBe("You are muted in this room");
    }, 10000);
  });

  describe("chat:typing", () => {
    it("broadcasts typing indicator to room", async () => {
      clientSocket = await connectClient();
      clientSocket2 = await connectAndJoinRoom();

      const typingPromise = new Promise<{ userId: string; roomId: string }>(
        (resolve) => {
          clientSocket2.on("chat:typing", (data) => resolve(data));
        },
      );

      clientSocket.emit("chat:typing", { roomId: "room-1" });

      const received = await typingPromise;
      expect(received.userId).toBe("user-1");
      expect(received.roomId).toBe("room-1");
    }, 10000);
  });

  describe("room:join", () => {
    it("joins socket room and broadcasts member_joined", async () => {
      clientSocket = await connectClient();
      clientSocket2 = await connectClient();

      const joinedPromise = new Promise<{ userId: string }>((resolve) => {
        clientSocket2.on("room:member_joined", (data) => resolve(data));
      });

      clientSocket2.emit("room:join", { roomId: "room-1" });
      await new Promise((resolve) => setTimeout(resolve, 100));

      clientSocket.emit("room:join", { roomId: "room-1" });

      const received = await joinedPromise;
      expect(received.userId).toBe("user-1");
    }, 10000);
  });

  describe("room:leave", () => {
    it("leaves socket room and broadcasts member_left", async () => {
      clientSocket = await connectAndJoinRoom();
      clientSocket2 = await connectAndJoinRoom();

      const leftPromise = new Promise<{ userId: string }>((resolve) => {
        clientSocket2.on("room:member_left", (data) => resolve(data));
      });

      clientSocket.emit("room:leave", { roomId: "room-1" });

      const received = await leftPromise;
      expect(received.userId).toBe("user-1");
    }, 10000);
  });

  describe("ready:toggle", () => {
    it("toggles ready status and broadcasts update", async () => {
      vi.mocked(prisma.roomMember.update).mockResolvedValue({
        ...mockMember,
        isReady: true,
      } as never);

      clientSocket = await connectAndJoinRoom();
      clientSocket2 = await connectAndJoinRoom();

      const readyPromise = new Promise<{ userId: string; isReady: boolean }>(
        (resolve) => {
          clientSocket2.on("ready:update", (data) => resolve(data));
        },
      );

      clientSocket.emit("ready:toggle", { roomId: "room-1" });

      const received = await readyPromise;
      expect(received.userId).toBe("user-1");
      expect(received.isReady).toBe(true);
    }, 10000);
  });
});