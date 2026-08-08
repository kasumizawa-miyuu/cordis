import prisma from "../db.js";
import { DEFAULTS, FEATURE_FLAGS } from "@cordis/shared";

export class MessageService {
  static async create(
    roomId: string,
    senderId: string,
    content: string,
    type: string = "TEXT",
    metadata?: Record<string, unknown> | null,
  ) {
    const member = await prisma.roomMember.findFirst({
      where: { roomId, userId: senderId },
    });
    if (!member) {
      const err = new Error("Not a member of this room") as Error & { statusCode: number };
      err.statusCode = 403;
      throw err;
    }

    if (member.isMuted) {
      const err = new Error("You are muted in this room") as Error & { statusCode: number };
      err.statusCode = 403;
      throw err;
    }

    if ((type === "IMAGE" || type === "VIDEO") && !FEATURE_FLAGS.ENABLE_MEDIA_MESSAGES) {
      type = "TEXT";
    }

    const message = await prisma.message.create({
      data: {
        roomId,
        senderId,
        content,
        type,
        metadata: (metadata ?? undefined) as any,
      },
      include: {
        sender: {
          select: { id: true, nickname: true },
        },
      },
    });

    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderNickname: (message as any).sender.nickname,
      content: message.content,
      type: message.type,
      metadata: message.metadata,
      createdAt: message.createdAt,
    };
  }

  static async listByRoom(roomId: string, userId: string, query: { cursor?: string; limit?: string | number }) {
    const member = await prisma.roomMember.findFirst({
      where: { roomId, userId },
    });
    if (!member) {
      const err = new Error("Not a member of this room") as Error & { statusCode: number };
      err.statusCode = 403;
      throw err;
    }

    const { cursor } = query;
    const limit = typeof query.limit === "string" ? parseInt(query.limit, 10) : (query.limit || DEFAULTS.MESSAGE_PAGE_SIZE);

    const where: Record<string, unknown> = { roomId };

    if (cursor) {
      const cursorMessage = await prisma.message.findUnique({
        where: { id: cursor },
      });
      if (cursorMessage) {
        where.createdAt = { lt: cursorMessage.createdAt };
      }
    }

    const take = limit + 1;

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        sender: {
          select: { id: true, nickname: true },
        },
      },
    });

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    const formatted = resultMessages.reverse().map((msg: typeof resultMessages[number]) => ({
      id: msg.id,
      roomId: msg.roomId,
      senderId: msg.senderId,
      senderNickname: (msg as any).sender.nickname,
      content: msg.content,
      type: msg.type,
      metadata: msg.metadata,
      createdAt: msg.createdAt,
    }));

    const nextCursor = hasMore ? resultMessages[0].id : null;

    return {
      messages: formatted,
      nextCursor,
    };
  }
}