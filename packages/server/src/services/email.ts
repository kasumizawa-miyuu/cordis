import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "../config";

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return _transporter;
}

export class EmailService {
  static generateCode(): string {
    return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
  }

  static async sendVerificationEmail(
    email: string,
    code: string,
    type: "REGISTRATION" | "RESET_PASSWORD",
  ): Promise<void> {
    const subject =
      type === "REGISTRATION"
        ? "Verification Code"
        : "Password Reset Code";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>${type === "REGISTRATION" ? "Verify Your Email" : "Reset Your Password"}</h2>
        <p>Your verification code is:</p>
        <div style="background: #f4f4f4; padding: 16px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; border-radius: 8px;">
          ${code}
        </div>
        <p style="color: #888; margin-top: 16px;">This code will expire in 10 minutes.</p>
      </div>
    `;

    await getTransporter().sendMail({
      from: config.smtp.user || "noreply@cordis.app",
      to: email,
      subject,
      html,
    });
  }

  static async sendResetPasswordEmail(
    email: string,
    code: string,
  ): Promise<void> {
    return EmailService.sendVerificationEmail(email, code, "RESET_PASSWORD");
  }
}