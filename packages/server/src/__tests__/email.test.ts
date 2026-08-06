import { describe, it, expect, vi, beforeEach } from "vitest";
import nodemailer from "nodemailer";
import { EmailService } from "../services/email";

vi.mock("nodemailer");

const mockSendMail = vi.fn();
const mockTransporter = { sendMail: mockSendMail };

describe("EmailService", () => {
  describe("generateCode", () => {
    it("returns a 6-digit string matching /^\\d{6}$/", () => {
      const code = EmailService.generateCode();

      expect(code).toMatch(/^\d{6}$/);
    });

    it("produces different values on successive calls", () => {
      const code1 = EmailService.generateCode();
      const code2 = EmailService.generateCode();

      expect(code1).not.toBe(code2);
    });
  });

  describe("sendVerificationEmail", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(nodemailer.createTransport).mockReturnValue(
        mockTransporter as never,
      );
      mockSendMail.mockResolvedValue(undefined);
    });

    it("sends an HTML email with the verification code", async () => {
      const email = "test@example.com";
      const code = "123456";

      await EmailService.sendVerificationEmail(email, code, "REGISTRATION");

      expect(nodemailer.createTransport).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: expect.stringContaining("@"),
          to: email,
          subject: expect.stringContaining("Verification"),
          html: expect.stringContaining(code),
        }),
      );
    });
  });

  describe("sendResetPasswordEmail", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      vi.mocked(nodemailer.createTransport).mockReturnValue(
        mockTransporter as never,
      );
      mockSendMail.mockResolvedValue(undefined);
    });

    it("sends a password reset email with the verification code", async () => {
      const email = "test@example.com";
      const code = "654321";

      await EmailService.sendResetPasswordEmail(email, code);

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: expect.stringContaining("Reset"),
          html: expect.stringContaining(code),
        }),
      );
    });
  });
});