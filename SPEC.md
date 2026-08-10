# Cordis — 高可扩展实时聊天室平台 · 设计规约

## 1. 问题陈述

**要解决的问题**：现有的聊天工具（如 Discord、微信群）功能封闭，无法让开发者自由地将聊天室与自定义应用（小游戏、投票、协作白板等）无缝集成。用户在不同工具间切换成本高，且缺乏一个以"房间"为核心的轻量级实时协作基础设施。

**目标用户**：需要实时协作、社交或组队互动的群体——游戏社区、学习小组、远程团队、活动组织者。

**核心价值**：Cordis 不只是聊天工具，而是一个"房间即平台"。用户进入房间后，不仅能聊天，还能通过插件系统一键启动独立的第三方应用——插件与聊天核心完全解耦，开发者只需实现标准接口即可接入。

**为什么值得做**：将"聊天室"从封闭功能升级为开放平台，让聊天室成为连接人与应用的入口，而非终点。

## 2. 用户故事

1. **注册与登录**：作为一个新用户，我希望能用邮箱注册账号并验证邮箱，以便安全地使用聊天室的所有功能。
2. **浏览与加入房间**：作为一个用户，我希望在大厅中搜索、浏览公开房间，并快速加入感兴趣的聊天室。
3. **创建与管理房间**：作为一个房主，我希望创建房间、设置名称/人数/标签/是否需要准备，并能踢出成员、转让房主、设置管理员。
4. **实时聊天**：作为一个房间成员，我希望在房间内发送和接收文字消息，看到其他人的打字状态，并收到 @提及和消息通知。
5. **邀请他人**：作为一个房间成员，我希望生成邀请码分享给朋友，让他们通过邀请码加入房间。
6. **准备与启动插件**：作为一个房主，我希望开启准备模式，等全员准备后启动一个插件，锁定房间让大家进入插件页面。
7. **查看历史消息**：作为一个新加入的成员，我希望能回看之前的历史消息，了解此前讨论的内容。
8. **密码重置**：作为忘记密码的用户，我希望能通过邮箱重置密码，重新获得账号访问权。

## 3. 功能规约

### 3.1 用户系统

| 功能 | 输入 | 行为 | 输出 | 边界条件 | 错误处理 |
|------|------|------|------|----------|----------|
| 注册 | email, password, nickname | 1. 校验邮箱格式与密码强度(≥8位) 2. 发送6位验证码到邮箱 3. 用户输入验证码 4. 创建用户，bcrypt哈希密码 | 成功 → JWT token；失败 → 错误信息 | 邮箱已注册则拒绝；验证码10分钟过期；验证码尝试最多5次 | 邮箱已存在 409；验证码错误/过期 400；超过尝试次数 429 |
| 登录 | email, password | 验证邮箱+密码，签发JWT(access 15min + refresh 7天) | JWT token pair | 未验证邮箱可登录但提示验证 | 密码错误 401；用户不存在 404 |
| 密码重置 | email | 发送6位重置码到邮箱；用户输入重置码+新密码；更新密码 | 成功提示 | 重置码10分钟过期 | 邮箱未注册 404；重置码错误 400 |
| 用户资料 | nickname, avatarUrl, bio | 更新当前用户资料 | 更新后的用户对象 | 昵称不能为空，不能与已有用户重复 | 校验失败 400 |

### 3.2 大厅

| 功能 | 输入 | 行为 | 输出 | 边界条件 | 错误处理 |
|------|------|------|------|----------|----------|
| 浏览房间 | 分页参数, 搜索词, 标签筛选 | 查询公开房间列表，按创建时间倒序 | 分页房间列表（含房间名、人数、标签、是否需准备） | 每页默认20条；空结果返回空列表 | 参数校验失败 400 |
| 加入房间 | roomId, password? | 检查房间是否满员、锁定、需要密码；通过后加入 | 成功 → 房间信息 + WebSocket连接 | 满员 403；已锁定 403；密码错误 403；已在房间内 409 | 房间不存在 404 |

### 3.3 房间管理

| 功能 | 输入 | 行为 | 输出 | 边界条件 | 错误处理 |
|------|------|------|------|----------|----------|
| 创建房间 | name, description?, maxMembers, isPublic, requireReady, password?, tags? | 创建房间，创建者自动成为OWNER | 房间对象 | 名称1-50字符；人数上限2-100 | 校验失败 400 |
| 编辑房间 | roomId, 可修改字段 | 仅OWNER可修改 | 更新后的房间对象 | 锁定期间不可编辑 | 非房主 403；房间不存在 404 |
| 删除房间 | roomId | 仅OWNER可删除 | 成功提示 | 房间及其消息、成员记录全部删除 | 非房主 403 |
| 踢出成员 | roomId, userId | OWNER/ADMIN可踢出MEMBER | 成功提示 | 不能踢出OWNER；锁定期间不可踢出 | 权限不足 403 |
| 禁言成员 | roomId, userId | OWNER/ADMIN可禁言MEMBER | 成功提示 | 被禁言者无法发送消息 | 权限不足 403 |
| 解除禁言 | roomId, userId | OWNER/ADMIN可解除 | 成功提示 | — | 权限不足 403 |
| 转让房主 | roomId, newOwnerId | OWNER转让给其他成员 | 成功提示 | 新OWNER变为ADMIN，原OWNER变为ADMIN | 非房主 403 |
| 设置管理员 | roomId, userId | OWNER可将MEMBER提升为ADMIN | 成功提示 | — | 非房主 403 |
| 退出房间 | roomId | 成员主动退出 | 成功提示 | 锁定期间不可退出；OWNER退出前须转让 | 锁定期间 403；OWNER未转让 400 |

### 3.4 邀请系统

| 功能 | 输入 | 行为 | 输出 | 边界条件 | 错误处理 |
|------|------|------|------|----------|----------|
| 生成邀请码 | roomId, expiresAt?, maxUses? | 生成唯一邀请码 | 邀请码对象（含code、过期时间、使用次数） | 默认24小时过期；无上限使用次数 | 房间不存在 404 |
| 通过邀请码加入 | inviteCode | 验证邀请码有效性，加入房间 | 房间信息 | 过期/用完的邀请码无效；锁定期间不可加入 | 邀请码无效 400；已过期 410 |
| 查看邀请记录 | roomId | 查看该房间所有邀请码及使用情况 | 邀请列表 | 仅OWNER/ADMIN可查看 | 权限不足 403 |

### 3.5 实时聊天

| 功能 | 输入 | 行为 | 输出 | 边界条件 | 错误处理 |
|------|------|------|------|----------|----------|
| 发送文字消息 | roomId, content | 通过WebSocket发送，服务器广播给房间所有成员，持久化存储 | WebSocket事件 → 所有成员收到消息 | 内容1-5000字符；被禁言者无法发送；IMAGE/VIDEO类型由Feature Flag控制 | 禁言中 403 |
| 接收消息 | WebSocket事件 | 客户端实时渲染新消息 | UI更新 | — | 连接断开时自动重连 |
| 打字状态 | WebSocket事件 | 用户输入时广播"正在输入" | 其他成员看到打字指示器 | 每3秒最多发送一次 | — |
| @提及 | WebSocket事件, mentionedUserIds | 被提及用户收到高亮通知 | 被提及用户收到通知事件 | — | — |
| 消息反应 | messageId, emoji | 对消息添加/移除表情反应 | 实时更新该消息的反应列表 | — | 消息不存在 404 |

### 3.6 准备系统

| 功能 | 输入 | 行为 | 输出 | 边界条件 | 错误处理 |
|------|------|------|------|----------|----------|
| 开启准备模式 | roomId | 房主开启，所有成员准备状态重置 | 房间 requireReady 设为 true | 仅房主；房间未锁定时 | 非房主 403 |
| 切换准备状态 | roomId, isReady | 成员点击准备/取消准备 | 实时广播准备状态变更 | 仅准备模式下可用 | 非准备模式 400 |
| 查看准备状态 | roomId | 获取所有成员准备状态列表 | 成员列表+准备状态 | — | — |

### 3.7 房间锁定

| 功能 | 输入 | 行为 | 输出 | 边界条件 | 错误处理 |
|------|------|------|------|----------|----------|
| 锁定房间 | roomId | 插件启动时自动锁定 | 房间 isLocked = true | 锁定后禁止加入/退出/踢人 | — |
| 解锁房间 | roomId | 插件结束时自动解锁 | 房间 isLocked = false | 仅插件结束回调触发 | — |

### 3.8 历史消息

| 功能 | 输入 | 行为 | 输出 | 边界条件 | 错误处理 |
|------|------|------|------|----------|----------|
| 加载历史消息 | roomId, cursor?, limit | 按时间倒序分页返回消息 | 消息列表 + 下一页cursor | 默认每页50条；新成员加入后可查看历史 | 房间不存在 404 |

### 3.9 插件系统

| 功能 | 输入 | 行为 | 输出 | 边界条件 | 错误处理 |
|------|------|------|------|----------|----------|
| 启动插件 | roomId, pluginId | 1. 验证房主权限 2. 检查全员准备（如需） 3. 锁定房间 4. 生成临时token 5. 通知所有成员跳转 | 插件启动成功 → 成员收到跳转URL | 仅房主可启动；需全员准备时检查准备状态 | 非房主 403；未全员准备 400 |
| 获取插件上下文 | pluginId, token | 插件用token获取房间和成员信息 | 房间信息+成员列表 | token一次性有效，10分钟过期 | token无效 401 |
| 结束插件 | pluginId, token | 解锁房间，通知所有成员，关闭插件页面 | 房间解锁成功 | 仅插件回调 | token无效 401 |

### 3.10 通知系统

| 通知类型 | 触发条件 | 接收者 |
|----------|----------|--------|
| 被邀请通知 | 有人生成邀请码时（可选） | 房间成员 |
| 被踢出通知 | 被管理员踢出 | 被踢出用户 |
| 被禁言通知 | 被管理员禁言 | 被禁言用户 |
| 准备状态变更 | 成员切换准备状态 | 房间所有成员 |
| 全员准备完成 | 所有成员准备完毕 | 房主 |
| 插件启动 | 房主启动插件 | 房间所有成员 |
| 插件结束 | 插件结束 | 房间所有成员 |

### 3.11 REST API 端点定义

#### 认证

| 方法 | 端点 | 请求体 | 响应体 |
|------|------|--------|--------|
| POST | `/api/auth/register` | `{ email, password, nickname }` | `{ message }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ user: { id, email, nickname, avatarUrl, isEmailVerified }, tokens: { accessToken, refreshToken } }` |
| POST | `/api/auth/refresh` | `{ refreshToken }` | `{ tokens: { accessToken, refreshToken } }` |
| POST | `/api/auth/verify-email` | `{ email, code, type }` | `{ message }` |
| POST | `/api/auth/reset-password` | `{ email }` | `{ message }` |
| POST | `/api/auth/reset-password/confirm` | `{ email, code, newPassword }` | `{ message }` |
| GET | `/api/auth/me` | — | `{ id, email, nickname, avatarUrl, bio, isEmailVerified, createdAt }` |
| PUT | `/api/auth/me` | `{ nickname?, avatarUrl?, bio? }` | `{ id, email, nickname, avatarUrl, bio, isEmailVerified }` |

#### 房间

| 方法 | 端点 | 请求体 | 响应体 |
|------|------|--------|--------|
| GET | `/api/rooms?page=&search=&tag=` | — | `{ rooms: [...], total, page, totalPages }` |
| POST | `/api/rooms` | `{ name, description?, maxMembers, isPublic, requireReady, password?, tags? }` | `{ id, name, ... }` |
| GET | `/api/rooms/:roomId` | — | `{ room: { id, name, ... }, members: [{ id, userId, nickname, avatarUrl, role, isReady, isMuted }] }` |
| PUT | `/api/rooms/:roomId` | `{ name?, description?, maxMembers?, ... }` | `{ id, name, ... }` |
| DELETE | `/api/rooms/:roomId` | — | `{ message }` |
| POST | `/api/rooms/:roomId/join` | `{ password? }` | `{ message }` |
| POST | `/api/rooms/:roomId/leave` | — | `{ message }` |
| GET | `/api/rooms/:roomId/members` | — | `[{ id, userId, nickname, avatarUrl, role, isReady, isMuted }]` |
| POST | `/api/rooms/:roomId/kick/:userId` | — | `{ message }` |
| POST | `/api/rooms/:roomId/mute/:userId` | — | `{ message }` |
| POST | `/api/rooms/:roomId/unmute/:userId` | — | `{ message }` |
| POST | `/api/rooms/:roomId/transfer/:userId` | — | `{ message }` |
| POST | `/api/rooms/:roomId/promote/:userId` | — | `{ message }` |

#### 邀请

| 方法 | 端点 | 请求体 | 响应体 |
|------|------|--------|--------|
| POST | `/api/rooms/:roomId/invitations` | `{ expiresAt?, maxUses? }` | `{ id, code, expiresAt, ... }` |
| GET | `/api/rooms/:roomId/invitations` | — | `[{ id, code, expiresAt, useCount, ... }]` |
| POST | `/api/invitations/join` | `{ code }` | `{ message }` |

#### 消息

| 方法 | 端点 | 请求体 | 响应体 |
|------|------|--------|--------|
| GET | `/api/rooms/:roomId/messages?cursor=&limit=` | — | `{ messages: [{ id, senderId, senderNickname, content, type, createdAt }], nextCursor }` |

#### 插件

| 方法 | 端点 | 请求体 | 响应体 |
|------|------|--------|--------|
| GET | `/api/plugin/list` | — | `[{ id, name, version, description, url }]` |
| POST | `/api/plugin/start` | `{ pluginId, roomId }` | `{ token, pluginUrl, context }` |
| POST | `/api/plugin/end` | `{ pluginId, roomId, token }` | `{ message }` |
| GET | `/api/plugin/:pluginId/context` | Header: `Authorization: Bearer <token>` | `{ roomId, roomName, members }` |

## 4. 非功能性需求

### 4.1 性能

- WebSocket 消息延迟 < 200ms（局域网环境）
- 历史消息分页加载，单次请求响应 < 500ms
- 前端首屏加载 < 3s（Vite 构建 + 代码分割）
- 支持单房间至少 50 人同时在线

### 4.2 安全

**凭据威胁模型**

| 威胁 | 影响 | 对策 |
|------|------|------|
| JWT Secret 泄露 | 攻击者可伪造任意用户 token | 通过 Render 环境变量注入，不写入源码/配置文件 |
| SMTP 密码泄露 | 攻击者可发送垃圾邮件 | 通过 Render 环境变量注入，使用 QQ邮箱等提供方应用专用密码 |
| 数据库密码泄露 | 攻击者可直接读写数据库 | Render PostgreSQL 自动管理，连接字符串通过环境变量注入 |
| 密码暴力破解 | 攻击者猜解用户密码 | bcrypt salt rounds ≥ 12；登录接口速率限制 |
| 验证码暴力破解 | 攻击者尝试所有验证码组合 | 单邮箱 5 次尝试限制；验证码 10 分钟过期 |
| 房间密码泄露 | 未授权用户进入私密房间 | bcrypt 哈希存储，不存储明文 |
| SQL 注入 | 数据库被非法操作 | Prisma ORM 参数化查询 |
| XSS | 恶意脚本注入 | React 默认转义；消息内容 DOMPurify 处理 |
| CSRF | 跨站请求伪造 | SameSite Cookie + JWT 验证 |
| 环境变量泄露到 Git | 凭据进入仓库历史 | `.env` 加入 `.gitignore`；提供 `.env.example` 模板 |

**凭据存储方案**

- 开发环境：`.env` 文件（不提交 Git）
- 生产环境：Render 环境变量管理（Web Dashboard 加密存储）
- 不提供运行时交互式录入（Render 部署无交互终端）

### 4.3 可用性

- 所有表单提供实时校验反馈
- WebSocket 断开时自动重连（指数退避，最多 5 次）
- 操作失败时提供明确的错误提示
- 响应式布局，支持桌面端（主要目标）

### 4.4 可观测性

- 服务端日志：HTTP 请求日志（Morgan）、WebSocket 事件日志
- 错误日志：全局异常捕获，记录堆栈
- 健康检查端点：`GET /api/health`

## 5. 系统架构

### 5.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    Client (React SPA)                │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │   Auth   │ │  Lobby   │ │     Room View      │   │
│  │  Pages   │ │  Pages   │ │ ┌───────────────┐  │   │
│  │          │ │          │ │ │  Chat Panel   │  │   │
│  │          │ │          │ │ │  Member List  │  │   │
│  │          │ │          │ │ │  Ready Panel  │  │   │
│  │          │ │          │ │ │  Plugin Panel │  │   │
│  │          │ │          │ │ └───────────────┘  │   │
│  └──────────┘ └──────────┘ └───────────────────┘   │
│         HTTP (REST)          WebSocket (Socket.IO)   │
└─────────────────────────────────────────────────────┘
                        │
┌─────────────────────────────────────────────────────┐
│                   Server (Express)                   │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │ REST API │ │   Auth   │ │  Socket.IO        │   │
│  │ (rooms,  │ │ (JWT)    │ │  Gateway          │   │
│  │  users,  │ │          │ │  - chat events    │   │
│  │  invites)│ │          │ │  - room events    │   │
│  │          │ │          │ │  - ready events   │   │
│  │          │ │          │ │  - plugin events  │   │
│  └──────────┘ └──────────┘ └───────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────┐   │
│  │  Plugin  │ │  Email   │ │   Prisma ORM      │   │
│  │  Loader  │ │  Service │ │                   │   │
│  └──────────┘ └──────────┘ └───────────────────┘   │
└─────────────────────────────────────────────────────┘
                        │
               ┌────────────────┐
               │  PostgreSQL    │
               └────────────────┘
```

### 5.2 包结构

```
cordis/
├── packages/
│   ├── shared/        # 共享类型、接口、常量、枚举
│   │   └── src/
│   │       ├── types/         # User, Room, Message, Invitation 等接口
│   │       ├── plugin.ts      # IPluginManifest, IPluginLaunchContext
│   │       ├── constants.ts   # 枚举、配置常量
│   │       └── validation.ts  # Zod schema
│   ├── server/        # Express 应用
│   │   └── src/
│   │       ├── routes/        # REST API 路由
│   │       ├── socket/        # Socket.IO 事件处理
│   │       ├── services/      # 业务逻辑
│   │       ├── middleware/    # 认证、校验、速率限制
│   │       ├── plugin/        # 插件加载器
│   │       └── prisma/        # Schema + 迁移
│   └── client/        # React SPA
│       └── src/
│           ├── pages/         # 页面组件
│           ├── components/    # 通用组件
│           ├── hooks/         # 自定义 hooks
│           ├── services/      # API 调用 + Socket.IO 连接
│           └── store/         # 状态管理（Zustand）
├── plugins/           # 插件目录（独立应用）
│   └── vote/          # 演示插件：投票
├── docker-compose.yml
├── Dockerfile
├── package.json
├── .env.example
└── .github/
    └── workflows/
        └── ci.yml
```

### 5.3 数据流

- **认证**：Client → POST /api/auth/login → Server → JWT → Client 存储
- **实时聊天**：Client → Socket.IO emit → Server → Socket.IO broadcast → 所有 Client
- **REST API**：Client → HTTP Request → Express Router → Prisma → PostgreSQL
- **插件通信**：Client → Socket.IO (/plugin/{id} namespace) → Plugin Service → Plugin 独立逻辑
- **插件启动**：房主 Client → POST /api/plugin/start → Server 锁定房间 + 生成token → 通知所有成员 → 各成员打开新标签页到插件URL

## 6. 数据模型

### 6.1 实体关系

```
User 1 ──── * RoomMember * ──── 1 Room
User 1 ──── * Message * ──── 1 Room
User 1 ──── * Invitation * ──── 1 Room
Room 1 ──── 1 PluginInstance
```

### 6.2 实体定义

**User**
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK, default: uuid() | |
| email | String | UNIQUE, NOT NULL | 登录邮箱 |
| passwordHash | String | NOT NULL | bcrypt 哈希 |
| nickname | String | NOT NULL | 显示名称 |
| avatarUrl | String? | | 头像URL |
| bio | String? | | 个人简介 |
| isEmailVerified | Boolean | default: false | 邮箱验证状态 |
| createdAt | DateTime | default: now() | |
| updatedAt | DateTime | updatedAt | |

**Room**
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| name | String | NOT NULL, 1-50字符 | 房间名称 |
| description | String? | | 房间描述 |
| ownerId | UUID | FK → User, NOT NULL | 房主 |
| maxMembers | Int | NOT NULL, 2-100 | 人数上限 |
| isPublic | Boolean | default: true | 是否公开 |
| isLocked | Boolean | default: false | 是否锁定 |
| requireReady | Boolean | default: false | 是否需要准备 |
| password | String? | | bcrypt 哈希，null=无密码 |
| tags | String[] | default: [] | 标签数组 |
| createdAt | DateTime | | |
| updatedAt | DateTime | | |

**RoomMember**
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| roomId | UUID | FK → Room, NOT NULL | |
| userId | UUID | FK → User, NOT NULL | |
| role | enum | OWNER / ADMIN / MEMBER | |
| isReady | Boolean | default: false | |
| isMuted | Boolean | default: false | |
| joinedAt | DateTime | default: now() | |
| @@unique([roomId, userId]) | | | 一人不能在房间内重复 |

**Message**
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| roomId | UUID | FK → Room, NOT NULL | |
| senderId | UUID | FK → User, NOT NULL | |
| content | Text | NOT NULL | 消息文本 |
| type | enum | TEXT / IMAGE / VIDEO / SYSTEM | IMAGE/VIDEO 由Feature Flag控制 |
| metadata | JSON? | | 附件信息（URL、尺寸等） |
| createdAt | DateTime | default: now(), INDEX | |

**Invitation**
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| roomId | UUID | FK → Room, NOT NULL | |
| inviterId | UUID | FK → User, NOT NULL | |
| code | String | UNIQUE, NOT NULL | 邀请码 |
| expiresAt | DateTime | NOT NULL | 过期时间 |
| maxUses | Int? | | null=无限制 |
| useCount | Int | default: 0 | 已使用次数 |
| createdAt | DateTime | | |

**EmailVerification**
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| email | String | NOT NULL | |
| code | String | NOT NULL | 6位数字验证码 |
| expiresAt | DateTime | NOT NULL | 有效期10分钟 |
| usedAt | DateTime? | | 使用时间 |
| type | enum | REGISTER / RESET_PASSWORD | 验证类型 |
| attempts | Int | default: 0 | 尝试次数，最多5次 |

**PluginInstance**
| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | |
| roomId | UUID | FK → Room, NOT NULL | |
| pluginId | String | NOT NULL | 插件标识符 |
| state | enum | INACTIVE / ACTIVE / RUNNING | |
| config | JSON? | | 插件自定义配置 |
| token | String? | | 临时token，插件启动时生成 |
| tokenExpiresAt | DateTime? | | token过期时间 |
| activatedAt | DateTime? | | |
| createdAt | DateTime | | |

## 7. 技术选型与理由

| 层 | 技术 | 选型理由 |
|------|------|----------|
| 语言 | TypeScript | 全栈类型安全，从DB到UI类型贯通 |
| 后端框架 | Express | 轻量、成熟、生态丰富，适合 API + WebSocket 混合场景 |
| 实时通信 | Socket.IO | 成熟的 WebSocket 库，自动重连、房间/命名空间支持、兼容性好 |
| ORM | Prisma | 类型安全、自动迁移、与 TypeScript 深度集成 |
| 数据库 | PostgreSQL | 关系型，适合结构化聊天数据；Render 原生支持 |
| 前端框架 | React | 生态最丰富，Open Design 主要支持 React |
| 构建工具 | Vite | 快速开发服务器、HMR、生产构建优化 |
| 路由 | React Router v6 | 标准 SPA 路由方案 |
| 状态管理 | Zustand | 轻量、无 boilerplate、支持 React 18 |
| 输入校验 | Zod | 类型推导、与 TypeScript 无缝集成 |
| 邮件 | Nodemailer | 纯 SMTP 发送，无额外 API 依赖 |
| 密码加密 | bcrypt | 行业标准 |
| 认证 | JWT (access + refresh) | 无状态、适合 WebSocket 握手验证 |
| 测试 | Vitest | 与 Vite 共享配置，速度快 |
| 部署 | Render (Docker) | 免费额度、支持 PostgreSQL、Docker 原生支持 |
| 设计系统 | Open Design | 作业要求，提供一致 UI 组件 |
| 包管理 | npm workspaces | monorepo 原生支持，无需额外工具 |

## 8. 分发与部署设计

### 8.1 分发形态：Docker 容器

**Dockerfile 多阶段构建**

- Stage 1（client-build）：安装依赖，`vite build` 产出静态文件
- Stage 2（server-build）：安装依赖，TypeScript 编译
- Stage 3（runtime）：Node.js Alpine 精简镜像，仅包含构建产物和生产依赖

**单条命令启动**
```bash
docker build -t cordis .
docker run -p 3000:3000 --env-file .env cordis
```

### 8.2 部署架构

```
Render
├── Web Service: cordis
│   ├── 类型: Web Service
│   ├── 运行时: Docker
│   ├── 端口: 3000
│   ├── 环境变量: JWT_SECRET, SMTP_*, DATABASE_URL
│   └── 健康检查: GET /api/health
└── PostgreSQL
    ├── 版本: 15
    └── 自动管理连接字符串
```

### 8.3 插件部署

插件作为独立前端应用，可部署到 Vercel / Netlify / GitHub Pages 等免费静态托管。在 Cordis 中注册插件时只需提供其 URL。

### 8.4 凭据配置

**开发环境**
1. 复制 `.env.example` → `.env`
2. 填写 `JWT_SECRET`、`SMTP_HOST/PORT/USER/PASS`、`DATABASE_URL`
3. `.env` 已在 `.gitignore` 中

**生产环境**
1. 在 Render Dashboard → Environment 中配置所有环境变量
2. `DATABASE_URL` 由 Render PostgreSQL 自动注入
3. 无需手动编辑任何文件

### 8.5 CI/CD

**GitHub Actions** (`.github/workflows/ci.yml`)
- 触发条件：每次 push 到任意分支
- Jobs：
  - `lint`：ESLint 检查
  - `typecheck`：TypeScript 类型检查
  - `unit-test`：Vitest 单元测试 + 集成测试
  - `build`：验证 client 和 server 构建
  - `docker-build`：构建 Docker 镜像验证

## 9. 验收标准

| 编号 | 功能 | 验收标准 |
|------|------|----------|
| AC-1 | 注册 | 输入邮箱 → 收到验证码 → 输入验证码 → 注册成功 → 可登录 |
| AC-2 | 登录 | 正确邮箱+密码 → 获得 JWT → 进入大厅 |
| AC-3 | 密码重置 | 输入邮箱 → 收到重置码 → 设置新密码 → 用新密码登录成功 |
| AC-4 | 大厅 | 看到公开房间列表，可搜索/筛选，可点击加入 |
| AC-5 | 创建房间 | 设置名字/描述/人数/标签/准备模式 → 房间出现在大厅 |
| AC-6 | 实时聊天 | 两个用户在同一房间 → 发送消息 → 对方即时看到 |
| AC-7 | 邀请 | 生成邀请码 → 另一个用户输入邀请码 → 成功加入房间 |
| AC-8 | 准备系统 | 房主开启准备 → 成员点击准备 → 全员准备后房主可启动插件 |
| AC-9 | 房间锁定 | 插件启动后 → 成员无法离开 → 新成员无法加入 → 插件结束后解锁 |
| AC-10 | 历史消息 | 新成员加入 → 向上滚动 → 加载历史消息 |
| AC-11 | 插件接口 | 实现投票演示插件 → 启动 → 成员跳转 → 投票 → 结束 → 房间解锁 |
| AC-12 | 一键测试 | `npm test` 运行全部测试，结果全部通过 |
| AC-13 | Docker | `docker build -t cordis .` → `docker run -p 3000:3000 cordis` → 浏览器访问正常 |
| AC-14 | 公网访问 | 部署到 Render → 提供可访问 URL → 核心功能正常 |
| AC-15 | CI | GitHub Actions 包含 unit-test job，最后一次执行 pass |

## 10. 风险与未决问题

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Socket.IO 在 Render 免费层的连接限制 | 大量并发 WebSocket 可能不稳定 | 如果 Render 免费层限制 WebSocket 连接数，考虑迁移到 Railway 或使用 Fly.io |
| 插件系统设计过于简化 | 实际插件开发时接口不够用 | 接口设计遵循"最小可用"，后续通过版本化扩展 |
| 邮件验证码可能被标记为垃圾邮件 | 用户收不到验证码 | 使用 QQ邮箱 SMTP，国内到达率高；提供测试环境跳过验证的选项 |
| PostgreSQL 免费层存储限制 | 历史消息过多可能超限 | 消息分页+滚动加载，未来可考虑消息归档 |
| 前端复杂度随功能增长 | agent 生成代码质量下降 | 按模块拆分 worktree，每个模块独立开发 |
| Open Design 学习曲线 | 初期开发速度慢 | 先用简单 CSS 快速原型，再逐步迁移到 Open Design 组件 |