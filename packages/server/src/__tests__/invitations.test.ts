import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import prisma from "../db.js";
import invitationRoutes from "../routes/invitations.js";
import type { Express } from "express";

vi.mock("../db.js", () => ({
  default: {
    room: {
      findUnique: vi.fn(),
    },
    roomMember: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    invitation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
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
  app.use("/api", invitationRoutes);
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

const mockInvitation = {
  id: "inv-1",
  roomId: "room-1",
  inviterId: "user-1",
  code: "abc12345",
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  maxUses: null,
  useCount: 0,
  createdAt: new Date("2024-01-01"),
};

describe("Invitation Routes", () => {
  let app: Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe("POST /api/rooms/:roomId/invitations", () => {
    it("creates an invitation and returns 201", async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(mockMember as never);
      vi.mocked(prisma.invitation.create).mockResolvedValue(mockInvitation as never);

      const res = await request(app)
        .post("/api/rooms/room-1/invitations")
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.code).toBe("abc12345");
      expect(res.body.roomId).toBe("room-1");
    });

    it("returns 403 when not admin", async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue({
        ...mockMember,
        role: "MEMBER",
      } as never);

      const res = await request(app)
        .post("/api/rooms/room-1/invitations")
        .send({});

      expect(res.status).toBe(403);
    });

    it("returns 404 when room not found", async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/rooms/room-1/invitations")
        .send({});

      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/invitations/join", () => {
    it("joins room via invite code and returns 201", async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue(mockInvitation as never);
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.roomMember.count).mockResolvedValue(1);
      vi.mocked(prisma.roomMember.create).mockResolvedValue({
        ...mockMember,
        userId: "user-2",
        role: "MEMBER",
      } as never);

      const res = await request(app)
        .post("/api/invitations/join")
        .send({ code: "abc12345" });

      expect(res.status).toBe(201);
      expect(res.body.roomId).toBe("room-1");
    });

    it("returns 400 when invitation expired", async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 1000),
      } as never);

      const res = await request(app)
        .post("/api/invitations/join")
        .send({ code: "expired" });

      expect(res.status).toBe(400);
    });

    it("returns 400 when max uses reached", async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue({
        ...mockInvitation,
        maxUses: 5,
        useCount: 5,
      } as never);

      const res = await request(app)
        .post("/api/invitations/join")
        .send({ code: "maxed" });

      expect(res.status).toBe(400);
    });

    it("returns 404 when invitation not found", async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/invitations/join")
        .send({ code: "nonexistent" });

      expect(res.status).toBe(404);
    });

    it("returns 409 when already a member", async () => {
      vi.mocked(prisma.invitation.findUnique).mockResolvedValue(mockInvitation as never);
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(mockMember as never);

      const res = await request(app)
        .post("/api/invitations/join")
        .send({ code: "abc12345" });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /api/rooms/:roomId/invitations", () => {
    it("returns list of invitations", async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue(mockMember as never);
      vi.mocked(prisma.invitation.findMany).mockResolvedValue([mockInvitation] as never);

      const res = await request(app).get("/api/rooms/room-1/invitations");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].code).toBe("abc12345");
    });

    it("returns 403 when not admin", async () => {
      vi.mocked(prisma.room.findUnique).mockResolvedValue(mockRoom as never);
      vi.mocked(prisma.roomMember.findFirst).mockResolvedValue({
        ...mockMember,
        role: "MEMBER",
      } as never);

      const res = await request(app).get("/api/rooms/room-1/invitations");

      expect(res.status).toBe(403);
    });
  });
});