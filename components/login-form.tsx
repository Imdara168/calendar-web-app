"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Calendar } from "lucide-react";

type AuthMode = "login" | "signup" | "forgot-password" | "change-password";

interface LoginFormProps {
  mode?: AuthMode;
  onLogin?: (username: string, password: string) => Promise<void>;
  onSignup?: (username: string, password: string) => Promise<void>;
  onForgotPassword?: (
    username: string,
  ) => Promise<{ username: string } | void>;
  onChangePassword?: (
    username: string,
    resetToken: string,
    newPassword: string,
  ) => Promise<void>;
  getErrorMessage: (error: unknown) => string;
  initialUsername?: string;
  initialResetToken?: string;
}

const modeCopy: Record<
  AuthMode,
  {
    title: string;
    submitLabel: string;
    helperText: string;
  }
> = {
  login: {
    title: "Sign In",
    submitLabel: "Sign In",
    helperText: "Please sign in before continuing.",
  },
  signup: {
    title: "Create Account",
    submitLabel: "Sign Up",
    helperText: "Create a new account to start using Calendar App.",
  },
  "forgot-password": {
    title: "Forgot Password",
    submitLabel: "Continue",
    helperText: "Enter your username to continue to password reset.",
  },
  "change-password": {
    title: "Change Password",
    submitLabel: "Change Password",
    helperText: "Set a new password for your account.",
  },
};

export function LoginForm({
  mode = "login",
  onLogin,
  onSignup,
  onForgotPassword,
  onChangePassword,
  getErrorMessage,
  initialUsername = "",
  initialResetToken = "",
}: LoginFormProps) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const copy = modeCopy[mode];

  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername]);

  useEffect(() => {
    setResetToken(initialResetToken);
  }, [initialResetToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    if (mode === "login" || mode === "signup") {
      if (!password.trim()) {
        setError("Please enter a password");
        return;
      }
    }

    if (mode === "signup" || mode === "change-password") {
      if (password.trim().length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    if (mode === "change-password" && !resetToken.trim()) {
      setError("Reset token is missing");
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "login" && onLogin) {
        await onLogin(username.trim(), password);
      }

      if (mode === "signup" && onSignup) {
        await onSignup(username.trim(), password);
      }

      if (mode === "forgot-password" && onForgotPassword) {
        await onForgotPassword(username.trim());
      }

      if (mode === "change-password" && onChangePassword) {
        await onChangePassword(username.trim(), resetToken.trim(), password);
        setSuccessMessage("Password changed successfully. You can sign in now.");
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-xl shadow-lg p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-3 bg-primary rounded-lg">
              <Calendar className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Calendar App</h1>
          </div>

          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-foreground">{copy.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{copy.helperText}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Enter your username"
              />
            </div>

            {(mode === "login" || mode === "signup" || mode === "change-password") && (
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  {mode === "change-password" ? "New Password" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder={
                      mode === "change-password"
                        ? "Enter your new password"
                        : "Enter your password"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {(mode === "signup" || mode === "change-password") && (
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-foreground mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              {isSubmitting ? "Please wait..." : copy.submitLabel}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            {mode !== "login" && (
              <Link href="/" className="hover:text-foreground transition-colors">
                Sign In
              </Link>
            )}
            {mode !== "signup" && (
              <Link href="/signup" className="hover:text-foreground transition-colors">
                Sign Up
              </Link>
            )}
            {mode !== "forgot-password" && (
              <Link
                href="/forget_password"
                className="hover:text-foreground transition-colors"
              >
                Forgot Password
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
