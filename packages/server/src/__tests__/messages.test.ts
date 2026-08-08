import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import prisma from "../db.js";
import messageRoutes from "../routes/messages.js";
import type { Express } from "express";

vi.mock("../db.js", () => ({
  default: {
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    roomMember: {
      findFirst: vi.fn(),
    },
    room: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../middleware/auth.js", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = "user-1";
    req.email = "test@example.com";
    next();
  },
}));

function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", messageRoutes);
  return app;
}

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

const mockMessage2 = {
  id: "msg-2",
  roomId: "room-1",
  senderId: "user-1",
  content: "Second message",
  type: "TEXT",
  metadata: null,
  createdAt: new Date("2024-01-01T12:01:00Z"),
  sender: { id: "user-1", nickname: "TestUser" },
};

const mockMessage3 = {
  id: "msg-3",
  roomId: "room-1",
  senderId: "user-1",
  content: "Third message",
  type: "TEXT",
  metadata: null,
  createdAt: new Date("2024-01-01T12:02:00Z"),
  sender: { id: "user-1", nickname: "TestUser" },
};

describe("Message Routes", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("GET /api/rooms/:roomId/messages", () => {
    it("returns empty list when no messages", async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(mockMember as never);
      vi.mocked(prisma.message.findMany).mockResolvedValue([]);

      const res = await request(app).get("/api/rooms/room-1/messages");

      expect(res.status).toBe(200);
      expect(res.body.messages).toEqual([]);
      expect(res.body.nextCursor).toBeNull();
    });

    it("returns paginated messages with cursor", async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(mockMember as never);
      vi.mocked(prisma.message.findMany).mockResolvedValue([
        mockMessage3,
        mockMessage2,
      ] as never);

      const res = await request(app).get("/api/rooms/room-1/messages?limit=1");

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
      expect(res.body.nextCursor).toBe("msg-3");
    });

    it("returns null nextCursor when no more messages", async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(mockMember as never);
      vi.mocked(prisma.message.findMany).mockResolvedValue([mockMessage] as never);

      const res = await request(app)
        .get("/api/rooms/room-1/messages?limit=1");

      expect(res.status).toBe(200);
      expect(res.body.nextCursor).toBeNull();
    });

    it("returns 403 when not a member", async () => {
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(null);

      const res = await request(app).get("/api/rooms/room-1/messages");

      expect(res.status).toBe(403);
    });

    it("respects cursor parameter", async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(mockMember as never);
      vi.mocked(prisma.message.findUnique).mockResolvedValue(mockMessage2 as never);
      vi.mocked(prisma.message.findMany).mockResolvedValue([mockMessage] as never);

      const res = await request(app)
        .get("/api/rooms/room-1/messages?cursor=msg-2");

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
      expect(res.body.messages[0].id).toBe("msg-1");
    });
  });
});