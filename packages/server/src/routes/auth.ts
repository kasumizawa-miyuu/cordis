import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../db.js";
import { config } from "../config.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { EmailService } from "../services/email.js";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resetPasswordSchema,
  resetPasswordConfirmSchema,
  updateProfileSchema,
  DEFAULTS,
} from "@cordis/shared";

const router = Router();

function generateTokens(userId: string, email: string) {
  const accessToken = jwt.sign({ userId, email }, config.jwtSecret, {
    expiresIn: `${DEFAULTS.ACCESS_TOKEN_EXPIRY_MINUTES}m`,
  });
  const refreshToken = jwt.sign(
    { userId, email, type: "refresh" },
    config.jwtRefreshSecret,
    { expiresIn: `${DEFAULTS.REFRESH_TOKEN_EXPIRY_DAYS}d` },
  );
  return { accessToken, refreshToken };
}

router.post("/register", validate(registerSchema), async (req, res) => {
  try {
    const { email, password, nickname } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ message: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, DEFAULTS.BCRYPT_SALT_ROUNDS);
    const code = EmailService.generateCode();

    await prisma.user.create({
      data: { email, passwordHash, nickname },
    });

    await prisma.emailVerification.create({
      data: {
        email,
        code,
        type: "REGISTER",
        expiresAt: new Date(Date.now() + DEFAULTS.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    try {
      await EmailService.sendVerificationEmail(email, code, "REGISTRATION");
    } catch {
      // Email sending failed but user is created
    }

    res.status(201).json({ message: "Registration successful. Please verify your email with the code sent to your inbox." });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ message: "Invalid password" });
      return;
    }

    const tokens = generateTokens(user.id, user.email);

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        isEmailVerified: user.isEmailVerified,
      },
      tokens,
    });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ message: "Refresh token is required" });
      return;
    }

    const payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
      userId: string;
      email: string;
      type: string;
    };

    if (payload.type !== "refresh") {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const tokens = generateTokens(payload.userId, payload.email);
    res.status(200).json({ tokens });
  } catch {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

router.post("/verify-email", validate(verifyEmailSchema), async (req, res) => {
  try {
    const { email, code, type } = req.body;

    const verification = await prisma.emailVerification.findFirst({
      where: { email, type, usedAt: null },
      orderBy: { expiresAt: "desc" },
    });

    if (!verification) {
      res.status(400).json({ message: "No pending verification found" });
      return;
    }

    if (verification.attempts >= DEFAULTS.VERIFICATION_MAX_ATTEMPTS) {
      res.status(429).json({ message: "Too many attempts. Please request a new code." });
      return;
    }

    if (verification.expiresAt < new Date()) {
      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: verification.attempts + 1 },
      });
      res.status(400).json({ message: "Verification code has expired" });
      return;
    }

    if (verification.code !== code) {
      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { attempts: verification.attempts + 1 },
      });
      res.status(400).json({ message: "Invalid verification code" });
      return;
    }

    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    if (type === "REGISTER") {
      await prisma.user.update({
        where: { email },
        data: { isEmailVerified: true },
      });

      const user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        const tokens = generateTokens(user.id, user.email);
        res.status(200).json({
          message: "Email verified successfully",
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
            avatarUrl: user.avatarUrl,
            isEmailVerified: true,
          },
          tokens,
        });
        return;
      }
    }

    res.status(200).json({ message: "Email verified successfully" });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post("/reset-password", validate(resetPasswordSchema), async (req, res) => {
  try {
    const { email } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "Email not registered" });
      return;
    }

    const code = EmailService.generateCode();

    await prisma.emailVerification.create({
      data: {
        email,
        code,
        type: "RESET_PASSWORD",
        expiresAt: new Date(Date.now() + DEFAULTS.VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    try {
      await EmailService.sendResetPasswordEmail(email, code);
    } catch {
      // Email sending failed but code is stored
    }

    res.status(200).json({ message: "Password reset code sent to your email" });
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.post(
  "/reset-password/confirm",
  validate(resetPasswordConfirmSchema),
  async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;

      const verification = await prisma.emailVerification.findFirst({
        where: { email, code, type: "RESET_PASSWORD", usedAt: null },
        orderBy: { expiresAt: "desc" },
      });

      if (!verification) {
        res.status(400).json({ message: "Invalid or expired reset code" });
        return;
      }

      if (verification.expiresAt < new Date()) {
        res.status(400).json({ message: "Reset code has expired" });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, DEFAULTS.BCRYPT_SALT_ROUNDS);

      await prisma.emailVerification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      await prisma.user.update({
        where: { email },
        data: { passwordHash },
      });

      res.status(200).json({ message: "Password reset successfully" });
    } catch (err) {
      const error = err as Error & { statusCode?: number };
      res.status(error.statusCode || 500).json({ message: error.message });
    }
  },
);

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.put("/me", requireAuth, validate(updateProfileSchema), async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: req.body,
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        bio: true,
        isEmailVerified: true,
      },
    });

    res.status(200).json(user);
  } catch (err) {
    const error = err as Error & { statusCode?: number };
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

export default router;