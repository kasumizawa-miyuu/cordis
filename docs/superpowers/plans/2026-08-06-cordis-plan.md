# Cordis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a highly extensible real-time chat room platform with plugin system, deployable to Render via Docker.

**Architecture:** Monorepo with three packages (shared types, Express server, React SPA) plus independent plugin apps. REST API for CRUD operations, Socket.IO for real-time communication. Plugins are standalone web apps launched via new tabs, communicating with Cordis through a minimal token-based API.

**Tech Stack:** TypeScript, Express, Socket.IO, Prisma, PostgreSQL, React 18, Vite, Zustand, React Router v6, Nodemailer, bcrypt, JWT, Zod, Vitest, Docker, Render

## Global Constraints

- **Language:** TypeScript 5.x strict mode
- **Runtime:** Node.js 20 LTS
- **Database:** PostgreSQL 15, accessed via Prisma ORM
- **Package manager:** npm workspaces (monorepo)
- **Password hashing:** bcrypt with salt rounds >= 12
- **TDD:** Every task writes a failing test first, then implementation
- **No hardcoded secrets:** All credentials via environment variables, .env file in .gitignore
- **Design system:** Open Design (React) for UI components (introduced in frontend tasks)
- **Feature flag:** IMAGE/VIDEO message types code exists but disabled via env var `ENABLE_MEDIA_MESSAGES=false`
- **Test command:** `npm test` runs all tests from repo root
- **CI:** GitHub Actions workflow with unit-test job, must pass on last push

---
## File Structure

```
cordis/
├── package.json
├── tsconfig.base.json
├── .env.example
├── .gitignore
├── .github/workflows/ci.yml
├── Dockerfile
├── docker-compose.yml
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── types/
│   │       │   ├── user.ts
│   │       │   ├── room.ts
│   │       │   ├── message.ts
│   │       │   ├── invitation.ts
│   │       │   ├── plugin.ts
│   │       │   └── auth.ts
│   │       ├── constants.ts
│   │       └── validation.ts
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── index.ts
│   │       ├── app.ts
│   │       ├── config.ts
│   │       ├── prisma/
│   │       │   ├── schema.prisma
│   │       │   └── seed.ts
│   │       ├── middleware/
│   │       │   ├── auth.ts
│   │       │   ├── validate.ts
│   │       │   └── rateLimiter.ts
│   │       ├── routes/
│   │       │   ├── auth.ts
│   │       │   ├── rooms.ts
│   │       │   ├── invitations.ts
│   │       │   ├── messages.ts
│   │       │   └── plugin.ts
│   │       ├── socket/
│   │       │   ├── index.ts
│   │       │   ├── chat.ts
│   │       │   ├── room.ts
│   │       │   ├── ready.ts
│   │       │   └── notification.ts
│   │       ├── services/
│   │       │   ├── auth.ts
│   │       │   ├── email.ts
│   │       │   ├── room.ts
│   │       │   ├── message.ts
│   │       │   ├── invitation.ts
│   │       │   └── plugin.ts
│   │       └── __tests__/
│   │           ├── auth.test.ts
│   │           ├── rooms.test.ts
│   │           ├── invitations.test.ts
│   │           ├── messages.test.ts
│   │           ├── plugin.test.ts
│   │           └── chat.test.ts
│   └── client/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── services/
│           │   ├── api.ts
│           │   └── socket.ts
│           ├── store/
│           │   ├── authStore.ts
│           │   ├── roomStore.ts
│           │   └── chatStore.ts
│           ├── hooks/
│           │   ├── useAuth.ts
│           │   ├── useRoom.ts
│           │   ├── useChat.ts
│           │   └── useSocket.ts
│           ├── pages/
│           │   ├── LoginPage.tsx
│           │   ├── RegisterPage.tsx
│           │   ├── ResetPasswordPage.tsx
│           │   ├── LobbyPage.tsx
│           │   ├── CreateRoomPage.tsx
│           │   ├── RoomPage.tsx
│           │   └── InviteJoinPage.tsx
│           ├── components/
│           │   ├── Layout.tsx
│           │   ├── ChatPanel.tsx
│           │   ├── MessageBubble.tsx
│           │   ├── MemberList.tsx
│           │   ├── ReadyPanel.tsx
│           │   ├── PluginPanel.tsx
│           │   ├── RoomSettings.tsx
│           │   ├── InviteModal.tsx
│           │   └── ProtectedRoute.tsx
│           └── __tests__/
│               └── components/
│                   └── ChatPanel.test.tsx
├── plugins/
│   └── vote/
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           └── App.tsx
└── vitest.workspace.ts
```

---


## Task 1: Project Scaffolding & Monorepo Setup

**Goal:** Create root package.json with npm workspaces, tsconfig.base.json, .env.example, and all three package package.json files (shared, server, client). Install dependencies.

**Files:**
- Create: package.json (root)
- Create: tsconfig.base.json
- Create: .env.example
- Create: packages/shared/package.json
- Create: packages/shared/tsconfig.json
- Create: packages/server/package.json
- Create: packages/server/tsconfig.json
- Create: packages/server/vitest.config.ts
- Create: packages/client/package.json
- Create: packages/client/tsconfig.json
- Create: packages/client/vite.config.ts
- Create: packages/client/index.html
- Create: vitest.workspace.ts

**Interfaces:**
- Root package.json: workspaces, scripts (test, dev, dev:client, build, lint, typecheck)
- tsconfig.base.json: strict mode, ES2022 target, bundler moduleResolution
- Each package.json: name scoped under @cordis/, type: module, dependencies
- vite.config.ts: proxy /api and /socket.io to localhost:3000
- index.html: basic HTML with div#root

**Steps:**
- [ ] 1. Create root package.json with workspaces: ["packages/*"], scripts: test, dev, dev:client, build, lint, typecheck
- [ ] 2. Create tsconfig.base.json with strict mode, ES2022 target, bundler moduleResolution
- [ ] 3. Create packages/shared/package.json (name: @cordis/shared, depends on zod)
- [ ] 4. Create packages/shared/tsconfig.json (extends ../../tsconfig.base.json)
- [ ] 5. Create packages/server/package.json (name: @cordis/server, type: module, depends on express, socket.io, prisma, bcrypt, jsonwebtoken, nodemailer, zod, cors, dotenv, express-rate-limit, morgan, uuid, and dev deps)
- [ ] 6. Create packages/server/tsconfig.json
- [ ] 7. Create packages/server/vitest.config.ts (basic vitest config)
- [ ] 8. Create packages/client/package.json (name: @cordis/client, depends on react, react-dom, react-router-dom, socket.io-client, zustand, axios, dompurify, and dev deps with vite, vitest, testing-library)
- [ ] 9. Create packages/client/tsconfig.json (with jsx: react-jsx)
- [ ] 10. Create packages/client/vite.config.ts (proxy /api and /socket.io to localhost:3000)
- [ ] 11. Create packages/client/index.html (basic HTML with div#root)
- [ ] 12. Create vitest.workspace.ts (includes packages/server and packages/client)
- [ ] 13. Create .env.example (JWT_SECRET, JWT_REFRESH_SECRET, SMTP_HOST/PORT/USER/PASS, DATABASE_URL, ENABLE_MEDIA_MESSAGES=false, CLIENT_URL, PORT)
- [ ] 14. Run npm install
- [ ] 15. Verify npm test runs (no tests yet, should not error)
- [ ] 16. Commit: "chore: scaffold monorepo with shared, server, client packages"


## Task 2: Shared Types & Validation

**Goal:** Create all shared TypeScript types, constants, and Zod validation schemas in packages/shared/src/.

**Files:**
- Create: packages/shared/src/index.ts (barrel export)
- Create: packages/shared/src/types/user.ts
- Create: packages/shared/src/types/room.ts
- Create: packages/shared/src/types/message.ts
- Create: packages/shared/src/types/invitation.ts
- Create: packages/shared/src/types/plugin.ts
- Create: packages/shared/src/types/auth.ts
- Create: packages/shared/src/constants.ts
- Create: packages/shared/src/validation.ts

**Interfaces:**
- User: id, email, nickname, avatarUrl?, bio?, isEmailVerified, createdAt, updatedAt
- RegisterRequest: email, password, nickname
- LoginRequest: email, password
- Room: id, name, description?, ownerId, maxMembers, isPublic, isLocked, requireReady, password?, tags, createdAt, updatedAt
- RoomMember: id, roomId, userId, role: RoomRole, isReady, isMuted, joinedAt
- RoomRole: 'OWNER' | 'ADMIN' | 'MEMBER'
- Message: id, roomId, senderId, content, type: MessageType, metadata?, createdAt
- MessageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'SYSTEM'
- Invitation: id, roomId, inviterId, code, expiresAt, maxUses?, useCount, createdAt
- PluginState: 'INACTIVE' | 'RUNNING' | 'ERROR'
- PluginInstance: id, roomId, pluginId, state: PluginState, config?, token?, tokenExpiresAt?, activatedAt?, createdAt
- JwtPayload: userId, email
- TokenPair: accessToken, refreshToken
- Validation schemas: registerSchema, loginSchema, verifyEmailSchema, resetPasswordSchema, resetPasswordConfirmSchema, updateProfileSchema, createRoomSchema, updateRoomSchema, joinRoomSchema, roomListQuerySchema, createInvitationSchema, joinByInviteSchema, sendMessageSchema, messageListQuerySchema, startPluginSchema, endPluginSchema

**Steps:**
- [ ] 1. Create types/user.ts: User, RegisterRequest, LoginRequest, VerifyEmailRequest, ResetPasswordRequest, ResetPasswordConfirmRequest, UpdateProfileRequest interfaces
- [ ] 2. Create types/room.ts: RoomRole type, Room, RoomMember, CreateRoomRequest, UpdateRoomRequest, JoinRoomRequest, RoomListQuery interfaces
- [ ] 3. Create types/message.ts: MessageType, Message, SendMessageRequest, MessageReaction, MessageListQuery interfaces
- [ ] 4. Create types/invitation.ts: Invitation, CreateInvitationRequest, JoinByInviteRequest interfaces
- [ ] 5. Create types/plugin.ts: PluginState, IPluginManifest, PluginLaunchContext, PluginInstance, StartPluginRequest, EndPluginRequest, PluginContextResponse interfaces
- [ ] 6. Create types/auth.ts: JwtPayload, TokenPair, AuthResponse, ApiError interfaces
- [ ] 7. Create constants.ts: MESSAGE_TYPES, ROOM_ROLES, PLUGIN_STATES, EMAIL_VERIFICATION_TYPES const arrays, DEFAULTS object (ROOM_MAX_MEMBERS:50, ROOM_LIST_PAGE_SIZE:20, MESSAGE_PAGE_SIZE:50, VERIFICATION_CODE_LENGTH:6, VERIFICATION_CODE_EXPIRY_MINUTES:10, VERIFICATION_MAX_ATTEMPTS:5, INVITATION_EXPIRY_HOURS:24, ACCESS_TOKEN_EXPIRY_MINUTES:15, REFRESH_TOKEN_EXPIRY_DAYS:7, BCRYPT_SALT_ROUNDS:12, MAX_MESSAGE_LENGTH:5000, MAX_ROOM_NAME_LENGTH:50, MIN_ROOM_MEMBERS:2, MAX_ROOM_MEMBERS:100), FEATURE_FLAGS (ENABLE_MEDIA_MESSAGES from env)
- [ ] 8. Create validation.ts: Zod schemas for registerSchema, loginSchema, verifyEmailSchema, resetPasswordSchema, resetPasswordConfirmSchema, updateProfileSchema, createRoomSchema, updateRoomSchema, joinRoomSchema, roomListQuerySchema, createInvitationSchema, joinByInviteSchema, sendMessageSchema, messageListQuerySchema, startPluginSchema, endPluginSchema
- [ ] 9. Create barrel export index.ts
- [ ] 10. Build shared package: npm run build --workspace=packages/shared
- [ ] 11. Commit: "feat: add shared types, constants, and validation schemas"


## Task 3: Database Schema & Prisma Setup

**Goal:** Create Prisma schema with all 7 models (User, Room, RoomMember, Message, Invitation, EmailVerification, PluginInstance), config module, and seed script.

**Files:**
- Create: packages/server/src/prisma/schema.prisma
- Create: packages/server/src/config.ts
- Create: packages/server/src/prisma/seed.ts

**Interfaces:**
- Config: port, jwtSecret, jwtRefreshSecret, smtp (host/port/user/pass), databaseUrl, clientUrl, enableMediaMessages, nodeEnv
- Prisma models: User, Room, RoomMember, Message, Invitation, EmailVerification, PluginInstance
- Seed: two test users, one public room, one RoomMember

**Steps:**
- [ ] 1. Create config.ts: load dotenv, export config object with port, jwtSecret, jwtRefreshSecret, smtp (host/port/user/pass), databaseUrl, clientUrl, enableMediaMessages, nodeEnv
- [ ] 2. Create schema.prisma: datasource postgresql, generator prisma-client-js, models: User (id uuid, email unique, passwordHash, nickname, avatarUrl?, bio?, isEmailVerified, createdAt, updatedAt), Room (id uuid, name, description?, ownerId FK, maxMembers, isPublic, isLocked, requireReady, password?, tags String[], createdAt, updatedAt), RoomMember (id uuid, roomId FK, userId FK, role default MEMBER, isReady, isMuted, joinedAt, @@unique[roomId,userId]), Message (id uuid, roomId FK, senderId FK, content, type default TEXT, metadata Json?, createdAt, @@index[roomId,createdAt]), Invitation (id uuid, roomId FK, inviterId FK, code unique, expiresAt, maxUses?, useCount, createdAt), EmailVerification (id uuid, email, code, expiresAt, usedAt?, type, attempts), PluginInstance (id uuid, roomId unique FK, pluginId, state default INACTIVE, config Json?, token?, tokenExpiresAt?, activatedAt?, createdAt)
- [ ] 3. Create seed.ts: create two test users (alice@example.com, bob@example.com, password: password123), one public room, one RoomMember
- [ ] 4. Run prisma migrate dev --name init
- [ ] 5. Run seed
- [ ] 6. Run prisma generate
- [ ] 7. Commit: "feat: add Prisma schema, config, and seed data"


## Task 4: Email Service

**Goal:** Create email service with Nodemailer for sending verification codes.

**Files:**
- Create: packages/server/src/services/email.ts
- Create: packages/server/src/__tests__/email.test.ts

**Interfaces:**
- EmailService.generateCode(): string (6-digit)
- EmailService.sendVerificationEmail(email, code, type): Promise<void>
- EmailService.sendResetPasswordEmail(email, code): Promise<void>

**Steps:**
- [ ] 1. Write failing test: EmailService.generateCode() returns 6-digit string, different codes each call
- [ ] 2. Run test to verify FAIL
- [ ] 3. Create email.ts: EmailService class with static generateCode() (Math.random based), sendVerificationEmail(email, code, type) using nodemailer transporter with HTML template, sendResetPasswordEmail(email, code) delegates to sendVerificationEmail with RESET_PASSWORD type
- [ ] 4. Run test to verify PASS
- [ ] 5. Commit: "feat: add email service with verification code generation"


## Task 5: Auth Service, Middleware & Routes

**Goal:** Create auth service (register, login, verify, reset), JWT auth middleware, validation middleware, rate limiter, and auth routes.

**Files:**
- Create: packages/server/src/services/auth.ts
- Create: packages/server/src/middleware/auth.ts
- Create: packages/server/src/middleware/validate.ts
- Create: packages/server/src/middleware/rateLimiter.ts
- Create: packages/server/src/routes/auth.ts
- Create: packages/server/src/__tests__/auth.test.ts

**Interfaces:**
- AuthService.register(email, password, nickname): Promise<{user, tokens}>
- AuthService.login(email, password): Promise<{user, tokens}>
- AuthService.verifyEmail(email, code): Promise<void>
- AuthService.requestPasswordReset(email): Promise<void>
- AuthService.confirmPasswordReset(email, code, newPassword): Promise<void>
- AuthService.generateTokens(payload): TokenPair
- AuthService.verifyAccessToken(token): JwtPayload
- requireAuth middleware: extracts Bearer token, sets req.userId, req.email
- validate middleware factory: ZodSchema + source ('body'|'query')
- rateLimiter: authLimiter, emailLimiter

**Steps:**
- [ ] 1. Create validate.ts: middleware factory that takes ZodSchema and source ('body'|'query'), parses and returns 400 on ZodError
- [ ] 2. Create rateLimiter.ts: authLimiter (15min, 20 max), emailLimiter (1min, 3 max)
- [ ] 3. Create auth.ts (service): AuthService with static methods: generateTokens(payload) returns TokenPair (jwt.sign with config secrets), verifyAccessToken(token) returns JwtPayload, register(email,password,nickname) checks duplicate, hashes bcrypt, creates user, creates EmailVerification, sends email, returns user+tokens, login(email,password) finds user, compares bcrypt, returns user+tokens, verifyEmail(email,code) finds verification, checks attempts<5, checks expiry, marks used, updates user.isEmailVerified, requestPasswordReset(email) finds user, generates code, creates EmailVerification type RESET_PASSWORD, sends email, confirmPasswordReset(email,code,newPassword) finds verification, checks expiry, marks used, hashes new password, updates user
- [ ] 4. Create auth.ts (middleware): requireAuth extracts Bearer token from Authorization header, verifies with AuthService.verifyAccessToken, sets req.userId and req.email
- [ ] 5. Create auth.ts (routes): Router with POST /register (authLimiter, validate registerSchema), POST /login (authLimiter, validate loginSchema), POST /verify-email (validate verifyEmailSchema), POST /reset-password (emailLimiter, validate resetPasswordSchema), POST /reset-password/confirm (validate resetPasswordConfirmSchema), GET /me (requireAuth), PUT /me (requireAuth, validate updateProfileSchema)
- [ ] 6. Write auth test: test register (201), duplicate register (409), login (200), wrong password (401) using supertest with express app
- [ ] 7. Run tests to verify PASS
- [ ] 8. Commit: "feat: add auth service, routes, middleware, and tests"


## Task 6: Express App Bootstrap & Server Entry

**Goal:** Create the Express app factory and server entry point.

**Files:**
- Create: packages/server/src/app.ts
- Create: packages/server/src/index.ts

**Interfaces:**
- createApp(): Express.Application (factory function)
- GET /api/health endpoint
- Mounts auth routes at /api/auth
- Global error handler (500)

**Steps:**
- [ ] 1. Create app.ts: createApp() factory function that creates express app, adds cors, json, morgan, GET /api/health, mounts auth routes at /api/auth, 404 handler, global error handler (500)
- [ ] 2. Create index.ts: imports createApp and config, creates app, listens on config.port
- [ ] 3. Verify server starts with tsx
- [ ] 4. Commit: "feat: add Express app bootstrap and server entry"

## Task 7: Room Management Routes & Service

**Goal:** Create room CRUD service and routes with full member management.

**Files:**
- Create: packages/server/src/services/room.ts
- Create: packages/server/src/routes/rooms.ts
- Create: packages/server/src/__tests__/rooms.test.ts

**Interfaces:**
- RoomService.create(ownerId, data): Promise<Room>
- RoomService.list(query): Promise<{rooms, total, page, pageSize}>
- RoomService.getById(roomId): Promise<Room & {members}>
- RoomService.update(roomId, userId, data): Promise<Room>
- RoomService.delete(roomId, userId): Promise<void>
- RoomService.join(roomId, userId, password?): Promise<RoomMember>
- RoomService.leave(roomId, userId): Promise<void>
- RoomService.kick(roomId, targetUserId, actorUserId): Promise<void>
- RoomService.mute(roomId, targetUserId, actorUserId): Promise<void>
- RoomService.unmute(roomId, targetUserId, actorUserId): Promise<void>
- RoomService.transferOwnership(roomId, targetUserId, actorUserId): Promise<void>
- RoomService.setAdmin(roomId, targetUserId, actorUserId): Promise<void>
- RoomService.getMembers(roomId): Promise<RoomMember[]>

**Steps:**
- [ ] 1. Write failing test: POST /api/rooms creates room, GET /api/rooms lists rooms
- [ ] 2. Run test to verify FAIL
- [ ] 3. Create room.ts (service): RoomService with static methods: create(ownerId, data) creates room+RoomMember, list(query) paginated with search/tag filter, getById(roomId) includes members, update(roomId, userId, data) checks owner and not locked, delete(roomId, userId) checks owner, join(roomId, userId, password?) checks full/locked/password/duplicate, leave(roomId, userId) checks not locked and not owner, kick(roomId, targetUserId, actorUserId) checks admin role and not locked and not owner, mute/unmute checks admin, transferOwnership uses transaction, setAdmin checks owner, getMembers
- [ ] 4. Create rooms.ts (routes): Router with requireAuth, POST / (validate createRoomSchema), GET / (validate roomListQuerySchema query), GET /:roomId, PUT /:roomId (validate updateRoomSchema), DELETE /:roomId, POST /:roomId/join (validate joinRoomSchema), POST /:roomId/leave, POST /:roomId/kick/:userId, POST /:roomId/mute/:userId, POST /:roomId/unmute/:userId, POST /:roomId/transfer/:userId, POST /:roomId/admin/:userId, GET /:roomId/members
- [ ] 5. Register room routes in app.ts
- [ ] 6. Run tests to verify PASS
- [ ] 7. Commit: "feat: add room management routes and service with tests"


## Task 8: Invitation System

**Goal:** Create invitation service and routes.

**Files:**
- Create: packages/server/src/services/invitation.ts
- Create: packages/server/src/routes/invitations.ts
- Create: packages/server/src/__tests__/invitations.test.ts

**Interfaces:**
- InvitationService.create(roomId, inviterId, options?): Promise<Invitation>
- InvitationService.joinByCode(code, userId): Promise<RoomMember>
- InvitationService.listByRoom(roomId, userId): Promise<Invitation[]>

**Steps:**
- [ ] 1. Write failing test: create invitation, join by invite code
- [ ] 2. Run test to verify FAIL
- [ ] 3. Create invitation.ts (service): InvitationService with create(roomId, inviterId, options) generates 8-char UUID code with expiry, joinByCode(code, userId) validates, checks expiry/maxUses/room full/locked/duplicate, creates RoomMember, increments useCount, listByRoom(roomId, userId) checks admin role
- [ ] 4. Create invitations.ts (routes): Router with requireAuth, POST /rooms/:roomId/invitations, GET /rooms/:roomId/invitations, POST /invitations/join
- [ ] 5. Register in app.ts
- [ ] 6. Run tests to verify PASS
- [ ] 7. Commit: "feat: add invitation system with create, join, and list"

## Task 9: Message History & Message Service

**Goal:** Create message persistence and history pagination.

**Files:**
- Create: packages/server/src/services/message.ts
- Create: packages/server/src/routes/messages.ts
- Create: packages/server/src/__tests__/messages.test.ts

**Interfaces:**
- MessageService.create(roomId, senderId, content, type?, metadata?): Promise<Message>
- MessageService.listByRoom(roomId, query): Promise<{messages, nextCursor?}>

**Steps:**
- [ ] 1. Write failing test: GET /api/rooms/:id/messages returns empty list
- [ ] 2. Run test to verify FAIL
- [ ] 3. Create message.ts (service): MessageService with create(roomId, senderId, content, type, metadata) checks member and mute status, persists message, returns formatted message with sender nickname; listByRoom(roomId, query) cursor-based pagination, returns messages reversed + nextCursor
- [ ] 4. Create messages.ts (routes): Router with requireAuth, GET /rooms/:roomId/messages (validate messageListQuerySchema query)
- [ ] 5. Register in app.ts
- [ ] 6. Run tests to verify PASS
- [ ] 7. Commit: "feat: add message service with history pagination"


## Task 10: Plugin System (Server-side)

**Goal:** Create plugin lifecycle management (register, start, end, context).

**Files:**
- Create: packages/server/src/services/plugin.ts
- Create: packages/server/src/routes/plugin.ts
- Create: packages/server/src/__tests__/plugin.test.ts

**Interfaces:**
- PluginService.registerPlugin(manifest): void
- PluginService.getPlugin(pluginId): IPluginManifest | undefined
- PluginService.listPlugins(): IPluginManifest[]
- PluginService.start(roomId, pluginId, userId): Promise<{token, pluginUrl, context}>
- PluginService.end(roomId, pluginId, token): Promise<void>
- PluginService.getContext(pluginId, token): Promise<PluginContextResponse>

**Steps:**
- [ ] 1. Write failing test: POST /api/plugin/start starts a plugin
- [ ] 2. Run test to verify FAIL
- [ ] 3. Create plugin.ts (service): PluginService with in-memory Map<string, IPluginManifest> for registered plugins, registerPlugin(manifest), getPlugin(pluginId), listPlugins(), start(roomId, pluginId, userId) checks owner, checks ready if required, locks room, generates token, upserts PluginInstance as RUNNING, returns token+pluginUrl+context, end(roomId, pluginId, token) validates token, unlocks room, sets state INACTIVE, getContext(pluginId, token) validates token expiry, returns room+members info
- [ ] 4. Create plugin.ts (routes): GET /plugin/list, POST /plugin/start (requireAuth, validate startPluginSchema), POST /plugin/end (validate endPluginSchema), GET /plugin/:pluginId/context (token from Authorization header)
- [ ] 5. Register in app.ts
- [ ] 6. Register a test plugin in beforeAll of test, then run tests to verify PASS
- [ ] 7. Commit: "feat: add plugin system with start, end, and context API"

## Task 11: Socket.IO Gateway — Core Setup & Chat

**Goal:** Create Socket.IO server with auth, chat, room, ready, and notification handlers.

**Files:**
- Create: packages/server/src/socket/index.ts
- Create: packages/server/src/socket/chat.ts
- Create: packages/server/src/socket/room.ts
- Create: packages/server/src/socket/ready.ts
- Create: packages/server/src/socket/notification.ts
- Modify: packages/server/src/index.ts (attach Socket.IO to HTTP server)
- Create: packages/server/src/__tests__/chat.test.ts

**Interfaces:**
- createSocketServer(httpServer): Socket.IO Server
- chat:send event: content, roomId, type? → broadcasts message to room:roomId
- chat:typing event: roomId → broadcasts typing indicator
- chat:reaction event: messageId, emoji, roomId → broadcasts reaction
- room:join event: roomId → socket.join room:roomId, broadcasts member_joined
- room:leave event: roomId → socket.leave, broadcasts member_left
- ready:toggle event: roomId → updates isReady, broadcasts ready:update
- notification: user:userId room for personal notifications

**Steps:**
- [ ] 1. Create socket/index.ts: createSocketServer(httpServer) creates Socket.IO Server with cors, auth middleware that verifies JWT from handshake.auth.token, on connection sets up all handlers
- [ ] 2. Create socket/chat.ts: setupChatHandlers with chat:send (checks FEATURE_FLAGS for image/video, creates message via MessageService, broadcasts to room:roomId), chat:typing (broadcasts to room), chat:reaction (broadcasts to room)
- [ ] 3. Create socket/room.ts: setupRoomHandlers with room:join (socket.join room:roomId, broadcasts member_joined), room:leave (socket.leave, broadcasts member_left)
- [ ] 4. Create socket/ready.ts: setupReadyHandlers with ready:toggle (updates RoomMember.isReady, broadcasts ready:update, checks all_ready, broadcasts ready:all_ready if requireReady)
- [ ] 5. Create socket/notification.ts: setupNotificationHandlers (joins user:userId room for personal notifications)
- [ ] 6. Update index.ts: create httpServer from createServer(app), createSocketServer(httpServer), listen on httpServer
- [ ] 7. Write basic chat test
- [ ] 8. Run tests
- [ ] 9. Commit: "feat: add Socket.IO gateway with chat, room, ready, notification handlers"


## Task 12: Frontend — Auth Pages (Login, Register, Reset Password)

**Goal:** Create the React frontend with auth pages, routing, and state management.

**Files:**
- Create: packages/client/src/main.tsx
- Create: packages/client/src/App.tsx
- Create: packages/client/src/services/api.ts
- Create: packages/client/src/store/authStore.ts
- Create: packages/client/src/hooks/useAuth.ts
- Create: packages/client/src/pages/LoginPage.tsx
- Create: packages/client/src/pages/RegisterPage.tsx
- Create: packages/client/src/pages/ResetPasswordPage.tsx
- Create: packages/client/src/components/ProtectedRoute.tsx
- Create: packages/client/src/components/Layout.tsx

**Interfaces:**
- api.ts: Axios instance with baseURL /api, Bearer token interceptor, 401 refresh flow
- authStore.ts: Zustand store (user, isAuthenticated, isLoading, error, login, register, verifyEmail, requestPasswordReset, confirmPasswordReset, logout, clearError)
- LoginPage: email + password form, calls login, navigates to /lobby
- RegisterPage: two-step (register then verify email code)
- ResetPasswordPage: three-step (request code, confirm, done)
- ProtectedRoute: checks isAuthenticated, redirects to /login
- Layout: nav bar with logo, user info, logout, Outlet

**Steps:**
- [ ] 1. Create api.ts: axios instance with baseURL /api, request interceptor adds Bearer token from localStorage, response interceptor handles 401 with refresh token flow
- [ ] 2. Create authStore.ts: Zustand store with user, isAuthenticated, isLoading, error, login, register, verifyEmail, requestPasswordReset, confirmPasswordReset, logout, clearError actions
- [ ] 3. Create useAuth.ts: hook that fetches /auth/me on mount if authenticated
- [ ] 4. Create LoginPage.tsx: form with email + password, calls login, navigates to /lobby
- [ ] 5. Create RegisterPage.tsx: two-step form (register then verify email code)
- [ ] 6. Create ResetPasswordPage.tsx: three-step form (request code, confirm with new password, done)
- [ ] 7. Create ProtectedRoute.tsx: checks isAuthenticated, redirects to /login
- [ ] 8. Create Layout.tsx: nav bar with logo, user info, logout button, Outlet
- [ ] 9. Create App.tsx: BrowserRouter with Routes for /login, /register, /reset-password, /lobby (protected), /room/:roomId (protected), / (redirect to /lobby)
- [ ] 10. Create main.tsx: ReactDOM.createRoot render App
- [ ] 11. Verify client builds
- [ ] 12. Commit: "feat: add frontend auth pages, routing, and state management"

## Task 13: Frontend — Lobby Page

**Goal:** Create the lobby page with room list and create room form.

**Files:**
- Create: packages/client/src/pages/LobbyPage.tsx
- Create: packages/client/src/pages/CreateRoomPage.tsx
- Modify: packages/client/src/App.tsx (add routes)

**Interfaces:**
- LobbyPage: fetches /api/rooms with pagination, search, tag filter, room cards, pagination controls
- CreateRoomPage: form with name, description, maxMembers, isPublic, requireReady, password, tags

**Steps:**
- [ ] 1. Create LobbyPage.tsx: fetches /api/rooms with pagination, search input, tag filter, displays room cards (name, description, memberCount/maxMembers, tags, lock/password indicators), pagination controls, "Create Room" button
- [ ] 2. Create CreateRoomPage.tsx: form with name, description, maxMembers (range slider), isPublic checkbox, requireReady checkbox, password (optional), tags (comma-separated), creates room via API, navigates to room page
- [ ] 3. Update App.tsx: import real LobbyPage and CreateRoomPage, add /create-room route
- [ ] 4. Verify client builds
- [ ] 5. Commit: "feat: add lobby page with room list, search, and create room form"


## Task 14: Frontend — Room Page with Chat & Members

**Goal:** Create the full room page with chat panel, member list, ready panel, and room settings.

**Files:**
- Create: packages/client/src/pages/RoomPage.tsx
- Create: packages/client/src/pages/InviteJoinPage.tsx
- Create: packages/client/src/components/ChatPanel.tsx
- Create: packages/client/src/components/MessageBubble.tsx
- Create: packages/client/src/components/MemberList.tsx
- Create: packages/client/src/components/ReadyPanel.tsx
- Create: packages/client/src/components/RoomSettings.tsx
- Create: packages/client/src/components/InviteModal.tsx
- Create: packages/client/src/services/socket.ts
- Create: packages/client/src/store/roomStore.ts
- Create: packages/client/src/store/chatStore.ts
- Create: packages/client/src/hooks/useSocket.ts
- Create: packages/client/src/hooks/useRoom.ts
- Create: packages/client/src/hooks/useChat.ts

**Interfaces:**
- socket.ts: Socket.IO client singleton, connect/disconnect/getSocket
- roomStore.ts: Zustand store for room, members, ready states
- chatStore.ts: Zustand store for messages, addMessage, loadHistory
- ChatPanel: message list, input, send, typing indicator, load more on scroll
- MessageBubble: content, sender, timestamp, reactions
- MemberList: members with role badges, kick/mute/admin buttons
- ReadyPanel: toggle, status list, all ready indicator
- RoomSettings: modal for editing room config
- InviteModal: generate code, copy, past invitations
- RoomPage: full layout with all panels
- InviteJoinPage: /invite/:code route handler

**Steps:**
- [ ] 1. Create socket.ts: Socket.IO client singleton, connects with auth token, exports connect/disconnect/getSocket
- [ ] 2. Create roomStore.ts: Zustand store for room data, members, ready states
- [ ] 3. Create chatStore.ts: Zustand store for messages array, addMessage, loadHistory
- [ ] 4. Create useSocket.ts: hook that connects socket on room enter, disconnects on leave, sets up event listeners
- [ ] 5. Create useRoom.ts: hook that fetches room details, members, handles room events
- [ ] 6. Create useChat.ts: hook that handles message sending, history loading, typing indicators
- [ ] 7. Create ChatPanel.tsx: message list with auto-scroll, input field with send button, typing indicator, load more history on scroll to top
- [ ] 8. Create MessageBubble.tsx: renders message content, sender nickname, timestamp, emoji reaction buttons
- [ ] 9. Create MemberList.tsx: list of members with role badges, online indicator, kick/mute/admin buttons for OWNER/ADMIN
- [ ] 10. Create ReadyPanel.tsx: ready toggle button, member ready status list, "all ready" indicator
- [ ] 11. Create RoomSettings.tsx: modal for editing room settings (name, description, maxMembers, etc.)
- [ ] 12. Create InviteModal.tsx: generate invite code, display code, copy to clipboard, list past invitations
- [ ] 13. Create RoomPage.tsx: layout with ChatPanel center, MemberList right, ReadyPanel bottom, top bar with room name, invite button, settings button, plugin button, leave button
- [ ] 14. Create InviteJoinPage.tsx: page for /invite/:code route, validates invite code, joins room
- [ ] 15. Update App.tsx: add /invite/:code route, update RoomPage import
- [ ] 16. Verify client builds
- [ ] 17. Commit: "feat: add room page with chat, members, ready, and settings"

## Task 15: Frontend — Plugin Panel

**Goal:** Create the plugin panel component for launching plugins.

**Files:**
- Create: packages/client/src/components/PluginPanel.tsx

**Interfaces:**
- PluginPanel: fetches plugins, displays cards, Start/End buttons, opens plugin URL in new tab

**Steps:**
- [ ] 1. Create PluginPanel.tsx: fetches available plugins from /api/plugin/list, displays plugin cards with name and description, "Start" button for OWNER (checks ready status if required), calls POST /api/plugin/start, on success opens plugin URL in new tab with token parameter, shows "Plugin running" state with "End" button, listens for plugin:start and plugin:end socket events
- [ ] 2. Integrate PluginPanel into RoomPage.tsx (shown when OWNER clicks plugin button)
- [ ] 3. Verify client builds
- [ ] 4. Commit: "feat: add plugin panel for launching and managing plugins"


## Task 16: Demo Plugin — Vote

**Goal:** Create a standalone voting plugin application.

**Files:**
- Create: plugins/vote/package.json
- Create: plugins/vote/vite.config.ts
- Create: plugins/vote/index.html
- Create: plugins/vote/src/main.tsx
- Create: plugins/vote/src/App.tsx

**Interfaces:**
- App: reads token from URL, fetches context, voting UI with create poll, vote, results, end vote

**Steps:**
- [ ] 1. Create plugins/vote/package.json: name cordis-plugin-vote, depends on react, react-dom, vite
- [ ] 2. Create plugins/vote/vite.config.ts: basic React vite config
- [ ] 3. Create plugins/vote/index.html: basic HTML
- [ ] 4. Create plugins/vote/src/main.tsx: ReactDOM render
- [ ] 5. Create plugins/vote/src/App.tsx: reads token from URL params, fetches context from /api/plugin/vote/context, displays room name and members, voting UI: create poll (question + options), vote on option, real-time results via polling or simple state, "End Vote" button that calls POST /api/plugin/end with token, then closes tab
- [ ] 6. Verify plugin builds
- [ ] 7. Commit: "feat: add demo vote plugin"

## Task 17: CI/CD — GitHub Actions

**Goal:** Create GitHub Actions workflow with unit-test job.

**Files:**
- Create: .github/workflows/ci.yml

**Interfaces:**
- CI workflow: unit-test, lint, typecheck, build jobs

**Steps:**
- [ ] 1. Create .github/workflows/ci.yml: name CI, on push to all branches, jobs: unit-test (runs-on ubuntu-latest, services postgres, steps: checkout, setup-node 20, npm ci, generate prisma client, run migrations, npm test), lint (eslint), typecheck (tsc -b), build (npm run build)
- [ ] 2. Push to GitHub, verify CI runs
- [ ] 3. Commit: "ci: add GitHub Actions workflow with unit-test job"

## Task 18: Docker Setup

**Goal:** Create Dockerfile for multi-stage build and docker-compose for local dev.

**Files:**
- Create: Dockerfile
- Create: docker-compose.yml

**Interfaces:**
- Dockerfile: multi-stage (client-build, server-build, runtime)
- docker-compose: db (postgres:15), app (build ., ports 3000:3000, env_file .env)

**Steps:**
- [ ] 1. Create Dockerfile: Stage 1 (client-build): node:20-alpine, copy packages, npm ci, npm run build --workspace=packages/client, Stage 2 (server-build): same, build server TS, Stage 3 (runtime): node:20-alpine, copy dist and node_modules, expose 3000, CMD node packages/server/dist/index.js
- [ ] 2. Create docker-compose.yml: services: db (postgres:15), app (build ., ports 3000:3000, env_file .env, depends_on db)
- [ ] 3. Verify docker build works
- [ ] 4. Commit: "feat: add Dockerfile and docker-compose for container deployment"

## Task 19: Integration & Final Verification

**Goal:** Run full test suite, verify all features work end-to-end.

**Files:** None (verification only)

**Interfaces:** N/A

**Steps:**
- [ ] 1. Run npm test from root: all tests pass
- [ ] 2. Run npm run lint: no errors
- [ ] 3. Run npm run typecheck: no errors
- [ ] 4. Run npm run build: all packages build successfully
- [ ] 5. Verify CI passes on GitHub
- [ ] 6. Commit: "chore: final integration verification"

