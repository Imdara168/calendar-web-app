"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
    submitLabel: "Access System",
    helperText: "Enter your credentials to manage registrations",
  },
  signup: {
    title: "Create Account",
    submitLabel: "Initialize Account",
    helperText: "Set up your administrative access",
  },
  "forgot-password": {
    title: "Account Recovery",
    submitLabel: "Verify Identity",
    helperText: "Enter your username to begin recovery",
  },
  "change-password": {
    title: "Update Password",
    submitLabel: "Save New Password",
    helperText: "Establish a secure authentication phrase",
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
    <div className="relative flex min-h-full items-center justify-center bg-[#F5F7FB] p-4">
      <div className="pointer-events-none absolute top-[-10%] left-[-5%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none absolute right-[-5%] bottom-[-10%] h-[40%] w-[40%] rounded-full bg-accent/5 blur-[120px]" />

      <div className="relative z-10 w-full max-w-[380px] sm:max-w-[400px]">
        <div className="rounded-[28px] border border-white/40 bg-white/88 p-5 shadow-premium sm:rounded-[30px] sm:p-6 md:p-7">
          <div className="mb-6 flex flex-col items-center justify-center gap-3 text-center sm:mb-7 sm:gap-4">
            <div className="flex h-20 items-center justify-center">
              <img src="/logo.png" alt="BRD Logo" className="h-full w-auto object-contain" />
            </div>
            <div className="flex flex-col items-center">
              <h1 className="text-[1.45rem] font-black tracking-tight text-foreground sm:text-[1.65rem]">
                នាយកដ្ឋានចុះបញ្ជី
              </h1>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground sm:text-[10px] sm:tracking-[0.24em]">
                BUSINESS REGISTRATION
              </p>
            </div>
          </div>

          <div className="mb-6 text-center sm:mb-7">
            <h2 className="text-lg font-bold text-foreground sm:text-xl">{copy.title}</h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground sm:text-sm">
              {copy.helperText}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="ml-1 block text-xs font-black uppercase tracking-widest text-muted-foreground"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-border/50 bg-secondary/30 px-4 py-3 font-semibold text-foreground transition-all placeholder:text-muted-foreground/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="Enter username"
              />
            </div>

            {(mode === "login" || mode === "signup" || mode === "change-password") && (
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="ml-1 block text-xs font-black uppercase tracking-widest text-muted-foreground"
                >
                  {mode === "change-password" ? "Secure Secret" : "Password"}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-border/50 bg-secondary/30 px-4 py-3 font-semibold text-foreground transition-all placeholder:text-muted-foreground/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder={
                      mode === "change-password"
                        ? "Enter new password"
                        : "Enter password"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {(mode === "signup" || mode === "change-password") && (
              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="ml-1 block text-xs font-black uppercase tracking-widest text-muted-foreground"
                >
                  Confirm Entry
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirm-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-border/50 bg-secondary/30 px-4 py-3 font-semibold text-foreground transition-all placeholder:text-muted-foreground/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Repeat entry"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 p-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs font-bold text-destructive">
                {error}
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs font-bold text-emerald-600">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-gradient-premium py-3.5 text-sm font-black uppercase tracking-[0.16em] text-white shadow-premium transition-all hover:scale-[1.02] active:scale-[0.98] disabled:scale-100 disabled:opacity-50"
            >
              {isSubmitting ? "Processing..." : copy.submitLabel}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground sm:mt-7 sm:gap-5 sm:text-[10px] sm:tracking-[0.18em]">
            {mode !== "login" && (
              <Link href="/" className="transition-colors hover:text-primary">
                Sign In
              </Link>
            )}
            {mode !== "signup" && (
              <Link href="/signup" className="transition-colors hover:text-primary">
                Sign Up
              </Link>
            )}
            {mode !== "forgot-password" && (
              <Link
                href="/forget_password"
                className="transition-colors hover:text-primary"
              >
                Recover
              </Link>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 sm:mt-5 sm:text-[9px] sm:tracking-[0.28em]">
          នាយកដ្ឋានចុះបញ្ជី © 2026
        </p>
      </div>
    </div>
  );
}
