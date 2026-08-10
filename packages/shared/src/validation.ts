import { z } from "zod";
import { DEFAULTS, EMAIL_VERIFICATION_TYPES, MESSAGE_TYPES } from "./constants.js";

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  nickname: z.string().min(1, "Nickname is required").max(50),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  email: z.string().email("Invalid email format"),
  code: z
    .string()
    .length(DEFAULTS.VERIFICATION_CODE_LENGTH, `Code must be ${DEFAULTS.VERIFICATION_CODE_LENGTH} digits`),
  type: z.enum(EMAIL_VERIFICATION_TYPES),
});

export const resetPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const resetPasswordConfirmSchema = z.object({
  email: z.string().email("Invalid email format"),
  code: z
    .string()
    .length(DEFAULTS.VERIFICATION_CODE_LENGTH, `Code must be ${DEFAULTS.VERIFICATION_CODE_LENGTH} digits`),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().max(500).nullable().optional(),
});

export const createRoomSchema = z.object({
  name: z
    .string()
    .min(1, "Room name is required")
    .max(DEFAULTS.MAX_ROOM_NAME_LENGTH, `Room name must be at most ${DEFAULTS.MAX_ROOM_NAME_LENGTH} characters`),
  description: z.string().optional(),
  maxMembers: z
    .number()
    .int()
    .min(DEFAULTS.MIN_ROOM_MEMBERS)
    .max(DEFAULTS.MAX_ROOM_MEMBERS),
  isPublic: z.boolean(),
  requireReady: z.boolean(),
  password: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const updateRoomSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(DEFAULTS.MAX_ROOM_NAME_LENGTH)
    .optional(),
  description: z.string().nullable().optional(),
  maxMembers: z
    .number()
    .int()
    .min(DEFAULTS.MIN_ROOM_MEMBERS)
    .max(DEFAULTS.MAX_ROOM_MEMBERS)
    .optional(),
  isPublic: z.boolean().optional(),
  requireReady: z.boolean().optional(),
  password: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const joinRoomSchema = z.object({
  password: z.string().optional(),
});

export const roomListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(DEFAULTS.ROOM_LIST_PAGE_SIZE),
  search: z.string().optional(),
  tag: z.string().optional(),
});

export const createInvitationSchema = z.object({
  expiresAt: z.string().datetime().optional(),
  maxUses: z.number().int().min(1).optional(),
});

export const joinByInviteSchema = z.object({
  code: z.string().min(1, "Invite code is required"),
});

export const sendMessageSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(DEFAULTS.MAX_MESSAGE_LENGTH, `Message must be at most ${DEFAULTS.MAX_MESSAGE_LENGTH} characters`),
  type: z.enum(MESSAGE_TYPES).default("TEXT"),
  metadata: z.record(z.unknown()).nullable().optional(),
});

export const messageListQuerySchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(DEFAULTS.MESSAGE_PAGE_SIZE),
});

export const startPluginSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  pluginId: z.string().min(1, "Plugin ID is required"),
});

export const endPluginSchema = z.object({
  pluginId: z.string().min(1, "Plugin ID is required"),
  roomId: z.string().uuid("Invalid room ID"),
  token: z.string().min(1, "Token is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordConfirmInput = z.infer<typeof resetPasswordConfirmSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type RoomListQueryInput = z.infer<typeof roomListQuerySchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type JoinByInviteInput = z.infer<typeof joinByInviteSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MessageListQueryInput = z.infer<typeof messageListQuerySchema>;
export type StartPluginInput = z.infer<typeof startPluginSchema>;
export type EndPluginInput = z.infer<typeof endPluginSchema>;