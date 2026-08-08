import { v4 as uuidv4 } from "uuid";
import prisma from "../db";
import { DEFAULTS } from "@cordis/shared";

export class InvitationService {
  static async create(
    roomId: string,
    inviterId: string,
    options?: { expiresAt?: string; maxUses?: number },
  ) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      const err = new Error("Room not found") as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    }

    const member = await prisma.roomMember.findFirst({
      where: { roomId, userId: inviterId },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      const err = new Error("Admin privileges required") as Error & { statusCode: number };
      err.statusCode = 403;
      throw err;
    }

    const code = uuidv4().slice(0, 8);
    const expiresAt = options?.expiresAt
      ? new Date(options.expiresAt)
      : new Date(Date.now() + DEFAULTS.INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

    return prisma.invitation.create({
      data: {
        roomId,
        inviterId,
        code,
        expiresAt,
        maxUses: options?.maxUses ?? null,
      },
    });
  }

  static async joinByCode(code: string, userId: string) {
    const invitation = await prisma.invitation.findUnique({ where: { code } });
    if (!invitation) {
      const err = new Error("Invitation not found") as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    }

    if (invitation.expiresAt < new Date()) {
      const err = new Error("Invitation has expired") as Error & { statusCode: number };
      err.statusCode = 400;
      throw err;
    }

    if (invitation.maxUses !== null && invitation.useCount >= invitation.maxUses) {
      const err = new Error("Invitation has reached max uses") as Error & { statusCode: number };
      err.statusCode = 400;
      throw err;
    }

    const room = await prisma.room.findUnique({ where: { id: invitation.roomId } });
    if (!room) {
      const err = new Error("Room not found") as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    }

    if (room.isLocked) {
      const err = new Error("Room is locked") as Error & { statusCode: number };
      err.statusCode = 403;
      throw err;
    }

    const existingMember = await prisma.roomMember.findFirst({
      where: { roomId: invitation.roomId, userId },
    });
    if (existingMember) {
      const err = new Error("Already a member of this room") as Error & { statusCode: number };
      err.statusCode = 409;
      throw err;
    }

    const memberCount = await prisma.roomMember.count({
      where: { roomId: invitation.roomId },
    });
    if (memberCount >= room.maxMembers) {
      const err = new Error("Room is full") as Error & { statusCode: number };
      err.statusCode = 400;
      throw err;
    }

    const member = await prisma.roomMember.create({
      data: {
        roomId: invitation.roomId,
        userId,
        role: "MEMBER",
      },
    });

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { useCount: invitation.useCount + 1 },
    });

    return member;
  }

  static async listByRoom(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      const err = new Error("Room not found") as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    }

    const member = await prisma.roomMember.findFirst({
      where: { roomId, userId },
    });
    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
      const err = new Error("Admin privileges required") as Error & { statusCode: number };
      err.statusCode = 403;
      throw err;
    }

    return prisma.invitation.findMany({
      where: { roomId },
      orderBy: { createdAt: "desc" },
    });
  }
}