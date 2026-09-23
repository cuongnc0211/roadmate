---
phase: 1
title: "Setup & Foundations"
status: done
priority: P1
dependencies: []
---

# Phase 01: Setup & Foundations

## Overview
Dựng khung Next.js + Supabase + Tailwind/shadcn + PWA, theme tokens sáng/tối, shell mobile-first, và cấu hình môi trường/deploy skeleton.

## Requirements
- Functional: app chạy local (`pnpm dev`), có shell mobile-first (top bar + bottom tab), theme sáng/tối, kết nối được Supabase.
- Non-functional: TypeScript strict, lint/format, `pnpm` lockfile, không secret trong repo.

## Architecture
- Next.js App Router. Route Handlers (`app/api/**`) sẽ là API layer (client-agnostic) cho các phase sau.
- Supabase client: `@supabase/supabase-js` + `@supabase/ssr` (server/client helpers). ANON key ở client, SERVICE key chỉ ở server routes.
- Design tokens tái dùng từ prototype (palette pine/teal + marigold, Be Vietnam Pro), map sang Tailwind theme + CSS variables (light/dark).

## Related Code Files
- Create: `package.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`
- Create: `app/layout.tsx`, `app/globals.css`, `app/(app)/layout.tsx` (shell: TopBar + TabBar), `components/ui/*` (shadcn init)
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- Create: `public/manifest.webmanifest`, `public/icons/*`, PWA service worker (dùng `@ducanh2912/next-pwa` hoặc tương đương)
- Create: `.env.example`, `.env.local` (không commit), `.gitignore`
- Create: `README.md` (chạy local, biến môi trường)

## Implementation Steps
1. `pnpm create next-app` (App Router, TS, Tailwind, ESLint). Khởi tạo git, branch `feat/setup`.
2. Cài shadcn/ui, thêm vài component nền (button, input, select, sheet, toast/sonner, tabs, switch).
3. Đưa design tokens từ prototype vào `globals.css` (CSS vars light/dark) + map Tailwind; nạp font Be Vietnam Pro.
4. Dựng shell mobile-first `(app)/layout.tsx`: khung điện thoại trên desktop, TopBar (logo + theme toggle), BottomTab (Bảng tin/Đăng chuyến/Chuyến của tôi/Thông báo/Hồ sơ) — route placeholder.
5. Tạo Supabase project, lấy URL + anon/service key → `.env`. Viết `lib/supabase/{client,server}.ts`.
6. Cấu hình PWA (manifest + icons + service worker), `display: standalone`, theme-color.
7. `.env.example`, README, `pnpm lint`/`typecheck` xanh. Deploy skeleton lên Vercel (env vars set).

## Success Criteria
- [x] `pnpm dev` chạy, shell mobile-first hiển thị 5 tab, toggle sáng/tối hoạt động. (verified: browser screenshots light+dark, nav giữa tab OK)
- [x] Supabase client kết nối OK (health-check). (`GET /api/health` → `{ok:true}`, Supabase local qua Docker)
- [x] PWA cài được (manifest hợp lệ). (`/manifest.webmanifest` hợp lệ, có id + icons 192/512/maskable; `sw.js` sinh khi `pnpm build`)
- [x] `pnpm lint` + typecheck xanh; production build xanh. (Deploy Vercel: DEFERRED — cần creds, làm ở Phase 07.)

## Completion Notes (Session 2026-09-23)
- Stack: Next.js 15 (App Router) · React 19 · TS strict · Tailwind v4 (CSS-first, tokens port 1:1 từ prototype) · shadcn-style (button/switch/sonner) · next-themes (`data-theme`) · @supabase/ssr · @ducanh2912/next-pwa.
- Supabase: **local qua Docker** (`pnpm db:start`); `.env.local` dùng key từ `db:status` (git-ignored).
- Code review (subagent) PASS — không Critical/High. Đã fix: `swe-worker-*.js` vào .gitignore/eslint; `import "server-only"` cho `lib/supabase/server.ts`; bỏ `maximum-scale` (a11y); health error generic; wire `app/apple-icon.png`; manifest `id`.
- YAGNI: shadcn `select/sheet/tabs` HOÃN tới phase dùng thật (Phase 04) thay vì thêm sớm.
- **Chưa init git** — chờ quyết định của user về cách xử lý branch (xem checkpoint).

## Risk Assessment
- next-pwa tương thích App Router: chọn lib còn maintained (`@ducanh2912/next-pwa`); nếu vướng, dùng service worker thủ công tối giản.
- Rò secret: đảm bảo SERVICE key chỉ dùng trong server code, thêm vào `.gitignore` + `.env.example` rỗng.
