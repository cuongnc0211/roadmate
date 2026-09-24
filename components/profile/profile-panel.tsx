"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, GraduationCap, LogOut, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type Gender = "male" | "female" | "other" | null;

type Initial = {
  name: string;
  gender: Gender;
  womenPref: boolean;
  svVerified: boolean;
  ratingAvg: number;
  phone: string | null;
};

const inputCls =
  "w-full rounded-[var(--r-sm)] border border-border-2 bg-surface px-3 py-2.5 text-[15px] text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary-weak";

export function ProfilePanel({
  email,
  initial,
}: {
  email: string;
  initial: Initial;
}) {
  const router = useRouter();
  const [verified, setVerified] = React.useState(initial.svVerified);

  const [name, setName] = React.useState(initial.name);
  const [gender, setGender] = React.useState<Gender>(initial.gender);
  const [phone, setPhone] = React.useState(initial.phone ?? "");
  const [womenPref, setWomenPref] = React.useState(initial.womenPref);
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim() || undefined,
        gender,
        phone: phone.trim() || null,
        womenPref,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Lưu hồ sơ thất bại");
      return;
    }
    toast.success("Đã lưu hồ sơ");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {/* Account */}
      <section className="rounded-[var(--r)] border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full bg-primary text-lg font-bold text-primary-ink">
            {name.charAt(0).toUpperCase() || "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-ink">{name}</p>
            <p className="truncate text-sm text-ink-3">{email}</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-1">
            {verified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-weak px-2.5 py-1 text-xs font-semibold text-primary">
                <BadgeCheck className="size-3.5" />
                SV
              </span>
            ) : null}
            {initial.ratingAvg > 0 ? (
              <span className="flex items-center gap-0.5 text-xs font-semibold text-ink-2">
                <Star className="size-3.5 fill-accent text-accent" />
                {initial.ratingAvg.toFixed(1)}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      {/* Edit */}
      <section className="space-y-3 rounded-[var(--r)] border border-border bg-surface p-4">
        <h2 className="font-bold text-ink">Chỉnh sửa hồ sơ</h2>
        <Field label="Tên hiển thị">
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className={inputCls} />
        </Field>
        <Field label="Giới tính">
          <select
            value={gender ?? ""}
            onChange={(e) => setGender((e.target.value || null) as Gender)}
            className={inputCls}
          >
            <option value="">Không cho biết</option>
            <option value="female">Nữ</option>
            <option value="male">Nam</option>
            <option value="other">Khác</option>
          </select>
        </Field>
        <Field label="Số điện thoại (chỉ hiện khi được duyệt vào chuyến)">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            maxLength={20}
            placeholder="Tuỳ chọn"
            className={inputCls}
          />
        </Field>
        <label className="flex items-center justify-between rounded-[var(--r-sm)] border border-border p-3">
          <span className="text-sm font-semibold text-ink-2">Ưu tiên nữ với nữ</span>
          <input
            type="checkbox"
            checked={womenPref}
            onChange={(e) => setWomenPref(e.target.checked)}
            className="size-5 accent-[var(--primary)]"
          />
        </label>
        <Button block disabled={saving} onClick={save}>
          {saving ? "Đang lưu…" : "Lưu hồ sơ"}
        </Button>
      </section>

      {/* SV verify */}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">{label}</p>
      {children}
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
            className={inputCls}
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
            className={`${inputCls} text-center text-lg tracking-[0.3em]`}
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
