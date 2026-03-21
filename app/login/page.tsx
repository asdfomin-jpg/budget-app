"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties, FormEvent } from "react";
import { createClient } from "../../lib/supabase/client";

type Mode = "login" | "signup";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIGNUP_MIN_PASSWORD_LENGTH = 8;

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  background: "#f3f6fb",
  fontFamily: "Arial, sans-serif",
};

const cardStyle: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "#ffffff",
  border: "1px solid #dbe2ea",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
};

const titleStyle: CSSProperties = {
  fontSize: 26,
  fontWeight: 800,
  marginBottom: 10,
};

const toggleRowStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  marginBottom: 16,
};

const toggleButtonStyle: CSSProperties = {
  flex: 1,
  padding: 10,
  borderRadius: 8,
  border: "none",
  fontWeight: 700,
  cursor: "pointer",
  transition: "opacity 0.15s ease",
};

const formStyle: CSSProperties = {
  display: "grid",
  gap: 12,
};

const inputStyle: CSSProperties = {
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #6b7280",
  fontSize: 14,
  outline: "none",
  background: "#f9fafb",
  color: "#111827",
  caretColor: "#111827",
  WebkitTextFillColor: "#111827",
  transition: "border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease",
};

const errorAlertStyle: CSSProperties = {
  background: "#fee2e2",
  color: "#b91c1c",
  padding: 10,
  borderRadius: 8,
  fontSize: 13,
};

const successAlertStyle: CSSProperties = {
  background: "#dcfce7",
  color: "#166534",
  padding: 10,
  borderRadius: 8,
  fontSize: 13,
};

const submitButtonStyle: CSSProperties = {
  padding: 12,
  borderRadius: 10,
  border: "none",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
  transition: "opacity 0.15s ease",
};

function validateCredentials(mode: Mode, email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return "Enter your email.";
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return "Enter a valid email address.";
  }

  if (!password.trim()) {
    return "Enter your password.";
  }

  if (mode === "signup" && password.length < SIGNUP_MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${SIGNUP_MIN_PASSWORD_LENGTH} characters.`;
  }

  return "";
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorText, setErrorText] = useState("");

  const isLogin = mode === "login";

  const handleModeChange = (nextMode: Mode) => {
    if (loading || nextMode === mode) {
      return;
    }

    setMode(nextMode);
    setMessage("");
    setErrorText("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    setMessage("");
    setErrorText("");

    const normalizedEmail = email.trim().toLowerCase();
    setEmail(normalizedEmail);
    const validationError = validateCredentials(mode, normalizedEmail, password);

    if (validationError) {
      setErrorText(validationError);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          setErrorText(error.message);
          return;
        }

        router.push("/");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setErrorText(error.message);
        return;
      }

      if (data.session) {
        router.push("/");
        router.refresh();
        return;
      }

      setMessage("Account created. Check your email to confirm it, then log in. If you don’t see it, check spam.");
      setMode("login");
      setPassword("");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <style jsx>{`
        .auth-input::placeholder {
          color: #6b7280;
          opacity: 1;
        }

        .auth-input:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
          background: #ffffff;
        }

        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:hover,
        .auth-input:-webkit-autofill:focus {
          -webkit-text-fill-color: #111827;
          caret-color: #111827;
          -webkit-box-shadow: 0 0 0 1000px #f9fafb inset;
          box-shadow: 0 0 0 1000px #f9fafb inset;
          transition: background-color 9999s ease-in-out 0s;
        }

        .auth-input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>

      <div style={cardStyle}>
        <h1 style={titleStyle}>Budget App</h1>

        <div style={toggleRowStyle}>
          <button
            type="button"
            onClick={() => handleModeChange("login")}
            disabled={loading}
            style={{
              ...toggleButtonStyle,
              background: isLogin ? "#2563eb" : "#e5e7eb",
              color: isLogin ? "#fff" : "#111827",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => handleModeChange("signup")}
            disabled={loading}
            style={{
              ...toggleButtonStyle,
              background: isLogin ? "#e5e7eb" : "#16a34a",
              color: isLogin ? "#111827" : "#fff",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={formStyle}>
          <input
            className="auth-input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trimStart())}
            disabled={loading}
            aria-label="Email"
            style={inputStyle}
          />

          <input
            className="auth-input"
            type="password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            aria-label="Password"
            style={inputStyle}
          />

          {errorText && (
            <div aria-live="polite" style={errorAlertStyle}>
              {errorText}
            </div>
          )}

          {message && (
            <div aria-live="polite" style={successAlertStyle}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            style={{
              ...submitButtonStyle,
              background: isLogin ? "#2563eb" : "#16a34a",
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading
              ? isLogin
                ? "Logging in..."
                : "Creating account..."
              : isLogin
                ? "Login"
                : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
