"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Email không hợp lệ");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Gửi liên kết thất bại. Thử lại sau.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-[var(--r)] border border-border bg-surface p-5 text-sm text-ink-2">
        <p className="font-semibold text-ink">Kiểm tra email của bạn</p>
        <p className="mt-1">
          Đã gửi liên kết đăng nhập tới <strong>{email}</strong>. Mở email và bấm
          liên kết để vào RoadMate.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-3 font-semibold text-primary"
        >
          Dùng email khác
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
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
        className="w-full rounded-[var(--r-sm)] border border-border-2 bg-surface px-3 py-3 text-[15px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary-weak"
      />
      <Button type="submit" block disabled={loading}>
        {loading ? "Đang gửi…" : "Gửi liên kết đăng nhập"}
      </Button>
      <p className="pt-1 text-center text-xs text-ink-3">
        Chúng tôi gửi một liên kết đăng nhập tới email của bạn — không cần mật
        khẩu.
      </p>
    </form>
  );
}
