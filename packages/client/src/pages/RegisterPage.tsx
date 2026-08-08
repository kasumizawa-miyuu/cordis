import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

type Step = "register" | "verify";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("register");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [code, setCode] = useState("");
  const { register, verifyEmail, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password, nickname);
      setStep("verify");
    } catch {}
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await verifyEmail(email, code, "REGISTER");
      navigate("/lobby");
    } catch {}
  };

  return (
    <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 20px" }}>
      <h1>Register</h1>
      {step === "register" ? (
        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="nickname">Nickname</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) clearError();
              }}
              required
              style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
            />
          </div>
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
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="password">Password (min 8 characters)</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) clearError();
              }}
              required
              minLength={8}
              style={{ width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" }}
            />
          </div>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" disabled={isLoading} style={{ width: "100%", padding: 10 }}>
            {isLoading ? "Registering..." : "Register"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify}>
          <p>Verification code sent to <strong>{email}</strong></p>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="code">Verification Code</label>
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
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button type="submit" disabled={isLoading} style={{ width: "100%", padding: 10 }}>
            {isLoading ? "Verifying..." : "Verify Email"}
          </button>
          <button
            type="button"
            onClick={() => setStep("register")}
            style={{ width: "100%", padding: 10, marginTop: 8, background: "none", border: "1px solid #ccc" }}
          >
            Back
          </button>
        </form>
      )}
      <p style={{ marginTop: 16 }}>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}