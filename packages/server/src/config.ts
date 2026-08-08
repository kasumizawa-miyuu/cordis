import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  jwtSecret: process.env.JWT_SECRET || "dev-jwt-secret",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "dev-jwt-refresh-secret",
  smtp: {
    host: process.env.SMTP_HOST || "smtp.qq.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/cordis",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  enableMediaMessages: process.env.ENABLE_MEDIA_MESSAGES === "true",
  nodeEnv: process.env.NODE_ENV || "development",
} as const;