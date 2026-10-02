"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Mode = "login" | "signup";

const PASSWORD_MIN = 8;

const ERRORS: Record<string, string> = {
  invalid_credentials: "Email hoặc mật khẩu không đúng",
  email_taken: "Email này đã được đăng ký. Hãy đăng nhập.",
  invalid_email: "Email không hợp lệ",
  invalid_input: "Vui lòng kiểm tra lại email và mật khẩu",
  too_many_requests: "Thử quá nhiều lần. Vui lòng đợi ít phút.",
};

const inputCls =
  "w-full rounded-[var(--r-sm)] border border-border-2 bg-surface px-3 py-3 text-[15px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary-weak";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = React.useState<Mode>("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Email không hợp lệ");
      return;
    }
    if (isSignup && password.length < PASSWORD_MIN) {
      toast.error(`Mật khẩu cần ít nhất ${PASSWORD_MIN} ký tự`);
      return;
    }
    setLoading(true);
    const res = await fetch(isSignup ? "/api/auth/signup" : "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
    }).catch(() => null);
    if (!res?.ok) {
      setLoading(false);
      const { error } = (await res?.json().catch(() => null)) ?? {};
      toast.error(ERRORS[error] ?? "Có lỗi xảy ra. Thử lại sau.");
      return;
    }
    // Full navigation so every server component re-reads the new cookie.
    window.location.assign(next);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-[var(--r-sm)] bg-surface-2 p-1">
        {(["login", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={`rounded-[calc(var(--r-sm)-2px)] py-2 text-sm font-semibold ${
              mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-3"
            }`}
          >
            {m === "login" ? "Đăng nhập" : "Đăng ký"}
          </button>
        ))}
      </div>

      <label className="block text-sm font-semibold text-ink-2" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="ban@vidu.com"
        className={inputCls}
      />

      <label className="block text-sm font-semibold text-ink-2" htmlFor="password">
        Mật khẩu
      </label>
      <input
        id="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        required
        minLength={isSignup ? PASSWORD_MIN : undefined}
        maxLength={128}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={isSignup ? `Ít nhất ${PASSWORD_MIN} ký tự` : ""}
        className={inputCls}
      />

      <Button type="submit" block disabled={loading}>
        {loading
          ? "Đang xử lý…"
          : isSignup
            ? "Tạo tài khoản"
            : "Đăng nhập"}
      </Button>
    </form>
  );
}
