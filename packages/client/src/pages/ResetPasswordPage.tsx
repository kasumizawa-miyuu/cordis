import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

type Step = "request" | "confirm" | "done";

export default function ResetPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const { requestPasswordReset, confirmPasswordReset, isLoading, error, clearError } =
    useAuthStore();

  const handleRequest = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await requestPasswordReset(email);
      setStep("confirm");
    } catch {}
  };

  const handleConfirm = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await confirmPasswordReset(email, code, newPassword);
      setStep("done");
    } catch {}
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 20px" }}>
      <h1>Reset Password</h1>
      {step === "request" && (
        <form onSubmit={handleRequest}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) clearError();
              }}
              required
              style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
            />
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" disabled={isLoading} style={{ width: "100%", padding: 10 }}>
            {isLoading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>
      )}
      {step === "confirm" && (
        <form onSubmit={handleConfirm}>
          <p>Reset code sent to <strong>{email}</strong></p>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="code">Reset Code</label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (error) clearError();
              }}
              required
              maxLength={6}
              style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="newPassword">New Password (min 8 characters)</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (error) clearError();
              }}
              required
              minLength={8}
              style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
            />
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" disabled={isLoading} style={{ width: "100%", padding: 10 }}>
            {isLoading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
      {step === "done" && (
        <div>
          <p style={{ color: "green" }}>Password reset successfully!</p>
          <Link to="/login">Back to login</Link>
        </div>
      )}
      <p style={{ marginTop: 16 }}>
        <Link to="/login">Back to login</Link>
      </p>
    </div>
  );
}