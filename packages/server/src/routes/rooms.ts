import { Router } from "express";
import bcrypt from "bcrypt";
import prisma from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  createRoomSchema,
  updateRoomSchema,
  joinRoomSchema,
  roomListQuerySchema,
  DEFAULTS,
} from "@cordis/shared";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const query = roomListQuerySchema.parse(req.query);
    const { page, limit, search, tags } = query;

    const where: Record<string, unknown> = { isPublic: true };

    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    const total = await prisma.room.count({ where });
    const rooms = await prisma.room.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, nickname: true } },
      },
    });

    const formatted = rooms.map((r: typeof rooms[number]) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      ownerId: r.ownerId,
      ownerNickname: r.owner.nickname,
      maxMembers: r.maxMembers,
      memberCount: r._count.members,
      isPublic: r.isPublic,
      isLocked: r.isLocked,
      requireReady: r.requireReady,
      hasPassword: !!r.password,
      tags: r.tags,
      createdAt: r.createdAt,
    }));

    res.status(200).json({
      rooms: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/", requireAuth, validate(createRoomSchema), async (req, res) => {
  try {
    const { name, description, maxMembers, isPublic, requireReady, password, tags } = req.body;

    const roomData: Record<string, unknown> = {
      name,
      ownerId: req.userId!,
      maxMembers,
      isPublic: isPublic ?? true,
      requireReady: requireReady ?? false,
    };

    if (description) roomData.description = description;
    if (tags) roomData.tags = tags;
    if (password) {
      roomData.password = await bcrypt.hash(password, DEFAULTS.BCRYPT_SALT_ROUNDS);
    }

    const room = await prisma.room.create({ data: roomData as any });

    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: req.userId!,
        role: "OWNER",
      },
    });

    res.status(201).json({
      ...room,
      memberCount: 1,
      ownerNickname: (await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { nickname: true },
      }))?.nickname,
    });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.get("/:roomId", async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
      include: {
        _count: { select: { members: true } },
        owner: { select: { id: true, nickname: true } },
      },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    res.status(200).json({
      id: room.id,
      name: room.name,
      description: room.description,
      ownerId: room.ownerId,
      ownerNickname: room.owner.nickname,
      maxMembers: room.maxMembers,
      memberCount: room._count.members,
      isPublic: room.isPublic,
      isLocked: room.isLocked,
      requireReady: room.requireReady,
      hasPassword: !!room.password,
      tags: room.tags,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.put("/:roomId", requireAuth, validate(updateRoomSchema), async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.ownerId !== req.userId) {
      res.status(403).json({ message: "Only the room owner can edit room settings" });
      return;
    }

    const updateData: Record<string, unknown> = { ...req.body };
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password as string, DEFAULTS.BCRYPT_SALT_ROUNDS);
    } else if (updateData.password === null) {
      updateData.password = null;
    }

    const updated = await prisma.room.update({
      where: { id: req.params.roomId },
      data: updateData as any,
    });

    res.status(200).json(updated);
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.delete("/:roomId", requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.ownerId !== req.userId) {
      res.status(403).json({ message: "Only the room owner can delete the room" });
      return;
    }

    await prisma.room.delete({ where: { id: req.params.roomId } });

    res.status(200).json({ message: "Room deleted successfully" });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/:roomId/join", requireAuth, validate(joinRoomSchema), async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.isLocked) {
      res.status(403).json({ message: "Room is locked" });
      return;
    }

    if (room.password) {
      const { password: requestPassword } = req.body;
      if (!requestPassword) {
        res.status(403).json({ message: "Room password is required" });
        return;
      }
      const valid = await bcrypt.compare(requestPassword, room.password);
      if (!valid) {
        res.status(403).json({ message: "Invalid room password" });
        return;
      }
    }

    const existingMember = await prisma.roomMember.findFirst({
      where: { roomId: room.id, userId: req.userId! },
    });
    if (existingMember) {
      res.status(409).json({ message: "Already a member of this room" });
      return;
    }

    const memberCount = await prisma.roomMember.count({
      where: { roomId: room.id },
    });
    if (memberCount >= room.maxMembers) {
      res.status(400).json({ message: "Room is full" });
      return;
    }

    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: req.userId!,
        role: "MEMBER",
      },
    });

    res.status(200).json({ message: "Joined room successfully" });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/:roomId/leave", requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.isLocked) {
      res.status(403).json({ message: "Cannot leave a locked room" });
      return;
    }

    const member = await prisma.roomMember.findFirst({
      where: { roomId: room.id, userId: req.userId! },
    });

    if (!member) {
      res.status(404).json({ message: "Not a member of this room" });
      return;
    }

    if (member.role === "OWNER") {
      res.status(400).json({ message: "Owner must transfer ownership before leaving" });
      return;
    }

    await prisma.roomMember.delete({ where: { id: member.id } });

    res.status(200).json({ message: "Left room successfully" });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.get("/:roomId/members", requireAuth, async (req, res) => {
  try {
    const members = await prisma.roomMember.findMany({
      where: { roomId: req.params.roomId },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
      orderBy: { joinedAt: "asc" },
    });

    res.status(200).json(
      members.map((m: typeof members[number]) => ({
        id: m.id,
        userId: m.userId,
        nickname: m.user.nickname,
        avatarUrl: m.user.avatarUrl,
        role: m.role,
        isReady: m.isReady,
        isMuted: m.isMuted,
        joinedAt: m.joinedAt,
      })),
    );
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/:roomId/kick/:userId", requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    const requester = await prisma.roomMember.findFirst({
      where: { roomId: room.id, userId: req.userId! },
    });

    if (!requester || (requester.role !== "OWNER" && requester.role !== "ADMIN")) {
      res.status(403).json({ message: "Admin privileges required" });
      return;
    }

    const target = await prisma.roomMember.findFirst({
      where: { roomId: room.id, userId: req.params.userId },
    });

    if (!target) {
      res.status(404).json({ message: "Member not found" });
      return;
    }

    if (target.role === "OWNER") {
      res.status(403).json({ message: "Cannot kick the room owner" });
      return;
    }

    if (room.isLocked) {
      res.status(403).json({ message: "Cannot kick members in a locked room" });
      return;
    }

    await prisma.roomMember.delete({ where: { id: target.id } });

    res.status(200).json({ message: "Member kicked" });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/:roomId/mute/:userId", requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    const requester = await prisma.roomMember.findFirst({
      where: { roomId: room.id, userId: req.userId! },
    });

    if (!requester || (requester.role !== "OWNER" && requester.role !== "ADMIN")) {
      res.status(403).json({ message: "Admin privileges required" });
      return;
    }

    const target = await prisma.roomMember.findFirst({
      where: { roomId: room.id, userId: req.params.userId },
    });

    if (!target) {
      res.status(404).json({ message: "Member not found" });
      return;
    }

    if (target.role === "OWNER") {
      res.status(403).json({ message: "Cannot mute the room owner" });
      return;
    }

    await prisma.roomMember.update({
      where: { id: target.id },
      data: { isMuted: true },
    });

    res.status(200).json({ message: "Member muted" });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/:roomId/unmute/:userId", requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    const requester = await prisma.roomMember.findFirst({
      where: { roomId: room.id, userId: req.userId! },
    });

    if (!requester || (requester.role !== "OWNER" && requester.role !== "ADMIN")) {
      res.status(403).json({ message: "Admin privileges required" });
      return;
    }

    const target = await prisma.roomMember.findFirst({
      where: { roomId: room.id, userId: req.params.userId },
    });

    if (!target) {
      res.status(404).json({ message: "Member not found" });
      return;
    }

    await prisma.roomMember.update({
      where: { id: target.id },
      data: { isMuted: false },
    });

    res.status(200).json({ message: "Member unmuted" });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/:roomId/transfer/:userId", requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.ownerId !== req.userId) {
      res.status(403).json({ message: "Only the room owner can transfer ownership" });
      return;
    }

    const newOwner = await prisma.roomMember.findFirst({
      where: { roomId: room.id, userId: req.params.userId },
    });

    if (!newOwner) {
      res.status(404).json({ message: "Target member not found in this room" });
      return;
    }

    await prisma.$transaction([
      prisma.room.update({
        where: { id: room.id },
        data: { ownerId: req.params.userId },
      }),
      prisma.roomMember.update({
        where: { id: newOwner.id },
        data: { role: "OWNER" },
      }),
      prisma.roomMember.update({
        where: { id: (await prisma.roomMember.findFirst({
          where: { roomId: room.id, userId: req.userId! },
        }))!.id },
        data: { role: "ADMIN" },
      }),
    ]);

    res.status(200).json({ message: "Ownership transferred" });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/:roomId/promote/:userId", requireAuth, async (req, res) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
    });

    if (!room) {
      res.status(404).json({ message: "Room not found" });
      return;
    }

    if (room.ownerId !== req.userId) {
      res.status(403).json({ message: "Only the room owner can promote members" });
      return;
    }

    const target = await prisma.roomMember.findFirst({
      where: { roomId: room.id, userId: req.params.userId },
    });

    if (!target) {
      res.status(404).json({ message: "Member not found" });
      return;
    }

    if (target.role === "OWNER") {
      res.status(400).json({ message: "Cannot promote the room owner" });
      return;
    }

    await prisma.roomMember.update({
      where: { id: target.id },
      data: { role: "ADMIN" },
    });

    res.status(200).json({ message: "Member promoted to admin" });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

export default router;