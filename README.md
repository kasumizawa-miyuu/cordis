# Cordis

高可扩展的实时聊天室平台 — AI4SE 期末项目

## 简介

Cordis 是一个以"房间即平台"为理念的实时聊天室。用户进入房间后，不仅能聊天，还能通过插件系统一键启动独立的第三方应用（投票、小游戏等）。插件与聊天核心完全解耦，开发者只需实现标准接口即可接入。

### 核心功能

- 邮箱注册/登录，验证码验证，密码重置
- 大厅浏览、搜索、筛选公开房间
- 创建房间：设置名称、人数上限、标签、是否需要准备、密码保护
- 实时文字聊天（WebSocket），打字状态提示，@提及
- 房间成员管理：踢出、禁言、转让房主、设置管理员
- 邀请系统：生成邀请码，设定过期时间和使用次数
- 准备系统：房主开启准备模式，全员准备后启动插件
- 房间锁定：插件运行期间禁止加入/退出
- 历史消息分页加载
- 插件系统：独立应用启动器，通过临时 token 通信

## 技术栈

| 层 | 技术 |
|------|------|
| 语言 | TypeScript 5.x |
| 后端 | Express + Socket.IO + Prisma ORM |
| 前端 | React 18 + Vite + Zustand + React Router v6 |
| 数据库 | PostgreSQL 15 |
| 邮件 | Nodemailer + SMTP |
| 测试 | Vitest |
| 部署 | Docker + Render |

## 目录结构

```
cordis/
├── packages/
│   ├── shared/          # 共享类型、接口、验证 schemas
│   ├── server/          # Express 应用 + Socket.IO 网关
│   │   └── src/
│   │       ├── routes/       # REST API 路由
│   │       ├── socket/       # Socket.IO 事件处理
│   │       ├── services/     # 业务逻辑
│   │       ├── middleware/   # 认证、校验、限流
│   │       ├── prisma/       # 数据库 schema 和迁移
│   │       └── __tests__/    # 服务端测试
│   └── client/          # React SPA
│       └── src/
│           ├── pages/        # 页面组件
│           ├── components/   # 通用组件
│           ├── hooks/        # 自定义 hooks
│           ├── services/     # API 调用 + Socket.IO
│           └── store/        # Zustand 状态管理
├── plugins/
│   └── vote/            # 演示插件：投票
├── docs/
│   └── superpowers/
│       ├── specs/        # 设计文档
│       └── plans/        # 实现计划
├── Dockerfile
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## 安装与运行

### 前置条件

- Node.js 20+
- PostgreSQL 15+
- npm 9+

### 本地开发

```bash
# 1. 克隆仓库
git clone https://github.com/kasumizawa-miyuu/cordis.git
cd cordis

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 SMTP 邮箱信息、JWT Secret 等

# 4. 构建 shared 包
npm run build -w @cordis/shared

# 5. 初始化数据库
cd packages/server
npx prisma migrate dev --name init
npm run db:seed
cd ../..

# 6. 启动开发服务器
npm run dev        # 同时启动 server (port 3000) 和 client (port 5173)
```

### Docker 部署

```bash
# 构建镜像
docker build -t cordis .

# 启动
docker run -p 3000:3000 --env-file .env cordis
```

或使用 docker-compose：

```bash
docker-compose up -d
```

### 运行测试

```bash
npm test
```

## 凭据安全配置

### 所需环境变量

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥（随机字符串） |
| `JWT_REFRESH_SECRET` | JWT 刷新密钥（随机字符串） |
| `SMTP_HOST` | SMTP 服务器地址（如 smtp.qq.com） |
| `SMTP_PORT` | SMTP 端口（587） |
| `SMTP_USER` | SMTP 登录邮箱 |
| `SMTP_PASS` | SMTP 授权码/密码 |
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `PORT` | 服务器端口（默认 3000） |
| `CLIENT_URL` | 前端地址（默认 http://localhost:5173） |
| `ENABLE_MEDIA_MESSAGES` | 是否启用图片/视频消息（默认 false） |

### 开发环境

1. 复制 `.env.example` 为 `.env`
2. 填写各字段
3. `.env` 已加入 `.gitignore`，不会提交到仓库

### 生产环境（Render）

在 Render Dashboard → Environment 中配置所有环境变量。`DATABASE_URL` 由 Render PostgreSQL 自动注入。

## 安全边界

- 密码使用 bcrypt 哈希（salt rounds ≥ 12），不存储明文
- JWT access token 15 分钟过期，refresh token 7 天过期
- 邮件验证码 10 分钟过期，单邮箱最多 5 次尝试
- 登录接口速率限制：20 次/15 分钟
- 邮件发送速率限制：3 次/分钟
- 输入校验：所有 API 请求和 WebSocket 事件使用 Zod schema 验证
- XSS 防护：React 默认转义 + DOMPurify 处理消息内容
- 凭据绝不硬编码，不提交 Git，不写入日志

## 已知限制

- 图片/视频消息代码已实现，但通过 `ENABLE_MEDIA_MESSAGES=false` 默认禁用（服务器存储容量限制）
- 仅支持桌面端浏览（响应式布局未针对移动端优化）
- 插件需要独立部署到静态托管服务
- PostgreSQL 免费层存储限制可能影响大量历史消息

## CI/CD

GitHub Actions 工作流（`.github/workflows/ci.yml`）包含：

- `unit-test`：运行 Vitest 测试套件（依赖 PostgreSQL service）
- `lint`：ESLint 检查
- `typecheck`：TypeScript 类型检查
- `build`：验证所有包构建

## 许可证

MIT