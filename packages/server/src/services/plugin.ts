import jwt from "jsonwebtoken";
import prisma from "../db";
import { config } from "../config";
import type { IPluginManifest, PluginContextResponse } from "@cordis/shared";

const pluginRegistry = new Map<string, IPluginManifest>();

export class PluginService {
  static registerPlugin(manifest: IPluginManifest): void {
    pluginRegistry.set(manifest.id, manifest);
  }

  static getPlugin(pluginId: string): IPluginManifest | undefined {
    return pluginRegistry.get(pluginId);
  }

  static listPlugins(): IPluginManifest[] {
    return Array.from(pluginRegistry.values());
  }

  static async start(
    roomId: string,
    pluginId: string,
    userId: string,
  ): Promise<{ token: string; pluginUrl: string; context: PluginContextResponse }> {
    const plugin = pluginRegistry.get(pluginId);
    if (!plugin) {
      const err = new Error("Plugin not found") as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    }

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      const err = new Error("Room not found") as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    }

    if (room.ownerId !== userId) {
      const err = new Error("Only the room owner can start plugins") as Error & {
        statusCode: number;
      };
      err.statusCode = 403;
      throw err;
    }

    if (plugin.requiresReady && room.requireReady) {
      const members = await prisma.roomMember.findMany({
        where: { roomId },
      });
      const allReady = members.every((m) => m.isReady);
      if (!allReady) {
        const err = new Error("All members must be ready before starting this plugin") as Error & {
          statusCode: number;
        };
        err.statusCode = 400;
        throw err;
      }
    }

    const token = jwt.sign(
      { pluginId, roomId, userId },
      config.jwtSecret,
      { expiresIn: "24h" },
    );

    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.pluginInstance.upsert({
      where: { roomId },
      update: {
        pluginId,
        state: "RUNNING",
        token,
        tokenExpiresAt,
        activatedAt: new Date(),
      },
      create: {
        roomId,
        pluginId,
        state: "RUNNING",
        token,
        tokenExpiresAt,
        activatedAt: new Date(),
      },
    });

    await prisma.room.update({
      where: { id: roomId },
      data: { isLocked: true },
    });

    const members = await prisma.roomMember.findMany({
      where: { roomId },
      include: { user: { select: { nickname: true } } },
    });

    const context: PluginContextResponse = {
      room: { id: room.id, name: room.name },
      members: members.map((m) => ({
        userId: m.userId,
        nickname: m.user.nickname,
      })),
    };

    return { token, pluginUrl: plugin.url, context };
  }

  static async end(pluginId: string, token: string): Promise<void> {
    let payload: { roomId: string };
    try {
      payload = jwt.verify(token, config.jwtSecret) as { roomId: string };
    } catch {
      const err = new Error("Invalid token") as Error & { statusCode: number };
      err.statusCode = 403;
      throw err;
    }

    const instance = await prisma.pluginInstance.findUnique({
      where: { roomId: payload.roomId },
    });

    if (!instance || instance.token !== token) {
      const err = new Error("Invalid token") as Error & { statusCode: number };
      err.statusCode = 403;
      throw err;
    }

    await prisma.pluginInstance.update({
      where: { roomId: payload.roomId },
      data: { state: "INACTIVE", token: null, tokenExpiresAt: null },
    });

    await prisma.room.update({
      where: { id: payload.roomId },
      data: { isLocked: false },
    });
  }

  static async getContext(
    pluginId: string,
    token: string,
  ): Promise<PluginContextResponse> {
    if (!token) {
      const err = new Error("Token required") as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }

    let payload: { pluginId: string; roomId: string };
    try {
      payload = jwt.verify(token, config.jwtSecret) as { pluginId: string; roomId: string };
    } catch {
      const err = new Error("Invalid or expired token") as Error & { statusCode: number };
      err.statusCode = 401;
      throw err;
    }

    const room = await prisma.room.findUnique({
      where: { id: payload.roomId },
    });
    if (!room) {
      const err = new Error("Room not found") as Error & { statusCode: number };
      err.statusCode = 404;
      throw err;
    }

    const members = await prisma.roomMember.findMany({
      where: { roomId: payload.roomId },
      include: { user: { select: { nickname: true } } },
    });

    return {
      room: { id: room.id, name: room.name },
      members: members.map((m) => ({
        userId: m.userId,
        nickname: m.user.nickname,
      })),
    };
  }
}