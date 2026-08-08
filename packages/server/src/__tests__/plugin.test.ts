import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db";
import pluginRoutes from "../routes/plugin";
import { PluginService } from "../services/plugin";
import type { Express } from "express";

vi.mock("../db", () => ({
  default: {
    room: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    roomMember: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    pluginInstance: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("../middleware/auth", () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.userId = "user-1";
    req.email = "test@example.com";
    next();
  },
}));

vi.mock("bcrypt");
vi.mock("jsonwebtoken");

function createApp(): Express {
  const app = express();
  app.use(express.json());
  app.use("/api", pluginRoutes);
  return app;
}

const mockRoom = {
  id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
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
  roomId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  userId: "user-1",
  role: "OWNER",
  isReady: false,
  isMuted: false,
  joinedAt: new Date("2024-01-01"),
};

const mockPluginManifest = {
  id: "vote",
  name: "Vote Plugin",
  description: "A voting plugin",
  version: "1.0.0",
  url: "http://localhost:4000",
  requiresReady: false,
};

const mockPluginInstance = {
  id: "pi-1",
  roomId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  pluginId: "vote",
  state: "RUNNING",
  config: null,
  token: "plugin-token-abc",
  tokenExpiresAt: new Date(Date.now() + 3600000),
  activatedAt: new Date(),
  createdAt: new Date("2024-01-01"),
};

describe("Plugin Routes", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    PluginService.registerPlugin(mockPluginManifest);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashed" as never);
    vi.mocked(jwt.sign).mockReturnValue("plugin-token-abc" as never);
    vi.mocked(jwt.verify).mockReturnValue({
      pluginId: "vote",
      roomId: "room-1",
    } as never);
  });

  describe("GET /api/plugin/list", () => {
    it("returns list of plugins", async () => {
      const res = await request(app).get("/api/plugin/list");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe("vote");
    });
  });

  describe("POST /api/plugin/start", () => {
    it("starts a plugin and returns 200", async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(mockMember as never);
      vi.mocked(prisma.roomMember.findMany).mockResolvedValue([
        { ...mockMember, user: { nickname: "Alice" } },
      ] as never);
      vi.mocked(prisma.pluginInstance.upsert).mockResolvedValue(mockPluginInstance as never);
      vi.mocked(prisma.room.update).mockResolvedValue(mockRoom as never);

      const res = await request(app)
        .post("/api/plugin/start")
        .send({ roomId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", pluginId: "vote" });

      expect(res.status).toBe(200);
      expect(res.body.token).toBe("plugin-token-abc");
      expect(res.body.pluginUrl).toBe("http://localhost:4000");
    });

    it("returns 403 when not owner", async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        ...mockRoom,
        ownerId: "user-2",
      } as never);

      const res = await request(app)
        .post("/api/plugin/start")
        .send({ roomId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", pluginId: "vote" });

      expect(res.status).toBe(403);
    });

    it("returns 404 when plugin not found", async () => {
      const res = await request(app)
        .post("/api/plugin/start")
        .send({ roomId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", pluginId: "nonexistent" });

      expect(res.status).toBe(404);
    });

    it("returns 400 when ready required but members not ready", async () => {
      PluginService.registerPlugin({
        ...mockPluginManifest,
        id: "ready-plugin",
        requiresReady: true,
      });

      vi.mocked(prisma.room.findUnique).mockResolvedValue({
        ...mockRoom,
        requireReady: true,
      } as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(mockMember as never);
      vi.mocked(prisma.roomMember.findMany).mockResolvedValue([
        { ...mockMember, isReady: true },
        {
          id: "member-2",
          roomId: "room-1",
          userId: "user-2",
          role: "MEMBER",
          isReady: false,
          isMuted: false,
          joinedAt: new Date(),
        },
      ] as never);

      const res = await request(app)
        .post("/api/plugin/start")
        .send({ roomId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", pluginId: "ready-plugin" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/plugin/end", () => {
    it("ends a plugin and returns 200", async () => {
      vi.mocked(prisma.pluginInstance.findUnique).mockResolvedValue({
        ...mockPluginInstance,
        token: "plugin-token-abc",
      } as never);
      vi.mocked(prisma.pluginInstance.update).mockResolvedValue({
        ...mockPluginInstance,
        state: "INACTIVE",
      } as never);

      const res = await request(app)
        .post("/api/plugin/end")
        .send({ pluginId: "vote", token: "plugin-token-abc" });

      expect(res.status).toBe(200);
    });

    it("returns 403 when token is invalid", async () => {
      vi.mocked(prisma.pluginInstance.findUnique).mockResolvedValue({
        ...mockPluginInstance,
        token: "different-token",
      } as never);

      const res = await request(app)
        .post("/api/plugin/end")
        .send({ pluginId: "vote", token: "wrong-token" });

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/plugin/:pluginId/context", () => {
    it("returns context with room and members", async () => {
      vi.mocked(jwt.verify).mockReturnValue({
        userId: "user-1",
        pluginId: "vote",
        roomId: "room-1",
      } as never);
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findMany).mockResolvedValue([
        { ...mockMember, user: { nickname: "Alice" } },
      ] as never);

      const res = await request(app)
        .get("/api/plugin/vote/context")
        .set("Authorization", "Bearer plugin-token-abc");

      expect(res.status).toBe(200);
      expect(res.body.room.id).toBe("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
      expect(res.body.members).toHaveLength(1);
    });

    it("returns 401 when no token provided", async () => {
      const res = await request(app).get("/api/plugin/vote/context");

      expect(res.status).toBe(401);
    });
  });
});