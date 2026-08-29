# EM3 X — Project Reference

This file is a standing summary of the project for the start of future sessions, so the codebase doesn't need to be fully re-read each time. It reflects the state of the app as of the last update below — treat it as a map, not a source of truth for exact current code (grep/read the actual files before changing something it describes).

## What this is

**EM3 X** is a staff-management app for an out-of-school kids club (ages 4–11, mixed fixed part-time and zero-hours staff). It replaces informal tracking of hours, statutory holiday accrual, DBS/qualification expiry, and staffing ratios with one mobile+web app.

The product's core claim is that **the holiday-accrual and ratio-compliance calculations are correct**, per UK law — the rota, clock-in, and reporting screens are the scaffolding around that engine, not the point of the product.

Two user-facing surfaces in one codebase, gated by role:
- **Staff**: view rota/shifts, clock in/out, request holiday, view their own qualification record, request account access.
- **Admin/Manager**: build the rota, approve/decline absence/swap/sign-up requests, view the Single Central Record (staff compliance list), reports/payroll export, audit log.

## Tech stack

- **Expo SDK 57** (React Native 0.86, React 19) with **Expo Router** (file-based routing, typed routes enabled)
- **react-native-web** — the same codebase ships as a native app *and* a web SPA (`web.output: "single"` in `app.json`)
- **Supabase** (Postgres + Auth + Edge Functions) — project id `liduailyojvtfgvvikro`. All data access is client-side via `@supabase/supabase-js`; there is no separate backend server or Expo Router API routes.
- **TypeScript**, strict mode
- Deployed to **Vercel** (web build only) at `https://em3-x.vercel.app`, auto-deploying on push to `main` via the GitHub integration
- GitHub repo: `github.com/MalachiAltus/Altus-EM3-X`, public

## Folder structure

```
src/
  app/                      Expo Router routes (file-based)
    (tabs)/                 Staff-facing tab bar: Home, Shifts, Clock, Holiday, Record
    admin/                  Admin-only screens (dashboard, rota builder, approvals, staff/SCR, reports)
    login.tsx               Email/password sign-in
    signup.tsx              Self-service "request access" form (name + email, no password — see Auth flow below)
    accept-invite.tsx       Where an approved sign-up's invite email lands; sets password, then into the app
    settings.tsx            Change password, privacy policy/terms text, delete account
    +not-found.tsx          Custom 404 (EM3 logo + link home)
    _layout.tsx             Root stack; wraps everything in SessionProvider, mounts push registrar + offline banner
  components/               Shared UI: ShiftsCalendar, QualificationEditor, DateDropdown, OfflineBanner
  hooks/                    One hook per data concern (useApprovals, useRotaWeek, useHolidayBalance, etc.) —
                             each owns its own Supabase queries; screens stay presentation-only
  lib/
    engine/                 Pure, tested business logic — NO Supabase imports here. accrual.ts (holiday accrual +
                             the formatHoursAsDaysHours display helper), ratios.ts (staffing ratio checks),
                             compliance.ts (qualification expiry bands), leaverPay.ts, dates.ts (UTC-only date math).
                             Each has a matching *.test.ts.
    supabase/               client.ts (the configured client + offline-tracking fetch wrapper), types.ts
                             (auto-generated from the live schema — regenerate via the Supabase MCP tool after
                             any migration, never hand-edit)
    auth/SessionProvider.tsx  React context wrapping supabase.auth session state
    calendarGrid.ts, shiftTemplates.ts, network/status.ts
  theme/tokens.ts            Single source of colors/spacing/radii/type — screens must import from here, never
                             hard-code visual values
assets/images/               App icons, splash, and em3-logo.png (the real EM3 Kids Club logo, used on
                             login/signup/accept-invite/not-found/home)
scripts/reset-project.js     Expo template boilerplate, unrelated to the app
vercel.json                  Vercel build command/output dir + SPA rewrite (client-side routing needs the
                             catch-all rewrite to /index.html or deep links 404 on refresh)
eas.json                     Native build profiles (development/preview/production) — not yet used for a real build
EM3X_Design_Prompt.md, i-want-to-build-buzzing-engelbart.md, em3-kids-club-mobile-app/
                             Original design brief + a Claude-Design canvas export. Reference/history only —
                             not read by the app, safe to ignore day-to-day.
```

Path alias: `@/*` → `src/*`, `@/assets/*` → `assets/*` (see `tsconfig.json`).

## Build phase: what's done

Functionally complete and live (native app not yet built via EAS — only the Vercel web deployment is live):

- Holiday accrual engine (irregular/zero-hours + fixed part-time contracts), leaver pay, statutory ratio checks — all pure + unit tested
- Clock in/out (no PIN — removed entirely), with a "forgot to clock in" self-service catch-up that logs a `source: manual` timesheet
- Staff & admin shift calendars (week/month), admin rota builder with a fixed shift-template catalog
- "Permanent staff" flag: assigning a permanent staff member's first week auto-repeats that weekly pattern for the rest of the calendar month
- Absence (holiday/sickness) requests with ratio-aware approval, shift swap requests, qualification (DBS/First Aid/etc.) tracking with staff+admin editing, date-of-birth + 7-day birthday reminder in Reports
- Self-service sign-up → admin approval (with role picker) → Supabase invite email → password-set screen, all gated behind RLS + one Edge Function (`approve-signup`) for the privileged parts
- Push notifications (Expo push via a `send-push` Edge Function + Postgres triggers) for new absence/swap/sign-up requests and decisions — degrades gracefully with no error when no EAS `projectId` is configured (which is the current state)
- Offline detection banner, account deletion, privacy policy/terms text
- Custom 404 page
- Vercel deployment: build script, SPA rewrite, env vars, Node version pin, auto-deploy on push all working and verified live

Not started / explicitly out of scope so far: native EAS build/App Store submission follow-through, a role-editing UI for existing staff (only sign-up-time role assignment exists), cookie consent (not needed — no tracking cookies).

## Conventions and rules to always follow

- **Never duplicate the accrual/ratio/compliance math.** It already exists in `src/lib/engine/` and is unit tested — import from there.
- **All dates are UTC calendar dates**, no time-of-day, via the helpers in `engine/dates.ts` (`parseISODate`, `toISODate`, `leaveYearBounds`, etc.). Don't reach for `new Date()` local-time math for business logic.
- **Never join through `profiles` for another user's name.** Its `SELECT` RLS policy only allows `id = auth.uid() OR is_manager_or_admin()`, so a nested join silently returns `null` for non-admins. Use the `list_active_staff()` RPC instead (already SECURITY DEFINER, returns id/full_name/role/is_permanent for all active staff).
- **`Pressable` wrapped in `<Link asChild>` must use a static style object, not the `({ pressed }) => [...]` function form.** On web, that function form silently drops all custom styles (confirmed bug, fixed everywhere it existed). If a Link-wrapped button needs a pressed-state effect, it needs a different mechanism than plain style-array — don't reintroduce the function form here.
- **Theme values only from `src/theme/tokens.ts`** — no hard-coded colors/spacing/fonts in screens.
- **Migrations and Edge Functions are managed directly against the live Supabase project via its MCP tools** (`apply_migration`, `deploy_edge_function`) — there is no local `supabase/migrations` folder in this repo. After any schema change, regenerate `src/lib/supabase/types.ts` via `generate_typescript_types` and paste it in whole (keep the "auto-generated, do not hand-edit" header comment).
- **New tables need an explicit `GRANT` in addition to RLS policies.** Enabling RLS + writing policies is not sufficient on its own — Postgres also requires the base table grant (`GRANT INSERT ON ... TO anon/authenticated`) or every operation fails with "permission denied for table", a different error from an RLS policy violation. Check `information_schema.role_table_grants` against a comparable existing table if unsure.
- **Edge Functions called directly from client code (not just from Postgres triggers) need CORS headers**, including handling the `OPTIONS` preflight — `send-push` (trigger-only) never needed this; anything invoked via `supabase.functions.invoke()` from the app does.
- **Design privileged Edge Functions to be idempotent.** A retried/duplicate call (double-click, network retry) should finish the job cleanly, not crash on a duplicate-key error — check for existing state before inserting.
- **Use `nvm use 22.23.2` before any `npx expo ...` CLI command** — the default Node on this machine (v16) is too old for the Expo CLI, even though the Metro dev server itself runs fine regardless.
- Two dev launch configs exist: `em3x-web` (live reload, correct for testing) and `em3x-dev` (`CI=1`, no reload) — the harness sometimes auto-starts `em3x-dev`; if the browser preview looks stale after an edit, check which one is running and switch to `em3x-web`.
- **Commit signing works normally now** (a previously-expired local GPG key was renewed and re-keyed to the correct GitHub identity mid-project) — no need to special-case `--no-gpg-sign`.
