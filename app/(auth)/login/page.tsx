import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Đăng nhập" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ground px-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex flex-col items-center text-center">
          <span aria-hidden className="mb-3 flex items-center gap-1.5">
            <span className="size-3 rounded-full bg-primary" />
            <span className="h-0.5 w-6 bg-[repeating-linear-gradient(90deg,var(--border-2)_0_4px,transparent_4px_8px)]" />
            <span className="size-3 rounded-full border-[2.5px] border-accent" />
          </span>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Road<span className="text-primary">Mate</span>
          </h1>
          <p className="mt-1 max-w-[28ch] text-sm text-ink-2">
            Ghép chuyến Hoà Lạc ↔ Hà Nội — chia sẻ chi phí, đi cùng người tin cậy.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
