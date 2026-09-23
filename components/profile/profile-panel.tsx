"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, GraduationCap, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Props = {
  name: string;
  email: string;
  svVerified: boolean;
};

export function ProfilePanel({ name, email, svVerified }: Props) {
  const router = useRouter();
  const [verified, setVerified] = React.useState(svVerified);

  return (
    <div className="space-y-4">
      <section className="rounded-[var(--r)] border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full bg-primary text-lg font-bold text-primary-ink">
            {name.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{name}</p>
            <p className="truncate text-sm text-ink-3">{email}</p>
          </div>
          {verified ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-primary-weak px-2.5 py-1 text-xs font-semibold text-primary">
              <BadgeCheck className="size-3.5" />
              SV
            </span>
          ) : null}
        </div>
      </section>

      {verified ? (
        <section className="flex items-center gap-2 rounded-[var(--r)] border border-border bg-surface p-4 text-sm text-ink-2">
          <BadgeCheck className="size-5 text-primary" />
          Bạn đã xác minh là sinh viên. Badge này giúp người khác tin tưởng hơn.
        </section>
      ) : (
        <SvVerify onVerified={() => setVerified(true)} />
      )}

      <Button
        variant="outline"
        block
        onClick={async () => {
          const supabase = createClient();
          await supabase.auth.signOut();
          router.replace("/login");
          router.refresh();
        }}
      >
        <LogOut className="size-4" />
        Đăng xuất
      </Button>
    </div>
  );
}

function SvVerify({ onVerified }: { onVerified: () => void }) {
  const [step, setStep] = React.useState<"email" | "code">("email");
  const [schoolEmail, setSchoolEmail] = React.useState("");
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/verify-email/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: schoolEmail.trim() }),
    });
    setLoading(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "" }));
      toast.error(
        error === "domain_not_allowed"
          ? "Email không thuộc trường được hỗ trợ"
          : "Không gửi được mã. Thử lại.",
      );
      return;
    }
    toast.success("Đã gửi mã tới email trường");
    setStep("code");
  }

  async function confirmCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/verify-email/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    setLoading(false);
    if (!res.ok) {
      toast.error("Mã không đúng hoặc đã hết hạn");
      return;
    }
    toast.success("Đã xác minh sinh viên!");
    onVerified();
  }

  return (
    <section className="rounded-[var(--r)] border border-border bg-surface p-4">
      <div className="mb-2 flex items-center gap-2">
        <GraduationCap className="size-5 text-accent" />
        <h2 className="font-bold text-ink">Xác minh sinh viên</h2>
      </div>
      <p className="mb-3 text-sm text-ink-2">
        Không bắt buộc — nhưng badge SV giúp bạn được duyệt vào chuyến dễ hơn.
      </p>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-2">
          <input
            type="email"
            inputMode="email"
            required
            value={schoolEmail}
            onChange={(e) => setSchoolEmail(e.target.value)}
            placeholder="mssv@st.truong.edu.vn"
            className="w-full rounded-[var(--r-sm)] border border-border-2 bg-surface px-3 py-2.5 text-[15px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary-weak"
          />
          <Button type="submit" block disabled={loading}>
            {loading ? "Đang gửi…" : "Gửi mã xác minh"}
          </Button>
        </form>
      ) : (
        <form onSubmit={confirmCode} className="space-y-2">
          <input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Nhập mã 6 số"
            className="w-full rounded-[var(--r-sm)] border border-border-2 bg-surface px-3 py-2.5 text-center text-lg tracking-[0.3em] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary-weak"
          />
          <Button type="submit" block disabled={loading}>
            {loading ? "Đang kiểm tra…" : "Xác nhận"}
          </Button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="w-full text-center text-xs font-semibold text-ink-3"
          >
            Đổi email trường
          </button>
        </form>
      )}
    </section>
  );
}
