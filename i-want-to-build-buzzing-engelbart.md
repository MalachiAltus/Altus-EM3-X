# EM3 X — Staff Records & Rota App

## Context

EM3 runs an out-of-school kids club serving **Reception to Year 6 (ages 4–11)**, staffed by a mix of fixed part-time and zero-hour workers. UK holiday law accrues entitlement differently for each group, and getting it wrong creates both payroll errors and legal exposure. Today there is no system: hours, holiday, DBS expiry and ratios are tracked informally.

EM3 X replaces that with one mobile app. Per the product file, **the calculation engine being correct is the product** — rota, clock-in and reporting are the scaffolding that makes it usable. The BrightHR reference sets the bar for breadth and polish, not for architecture: EM3 X is a single-organisation tool, not a SaaS platform.

`/Users/michael/Documents/Altus/EM3 X` is currently empty. This is a greenfield build.

### Decisions locked
| | |
|---|---|
| Scope | Single organisation (EM3 only). No tenancy, no billing. |
| Surface | One Expo app (iOS + Android), admin features role-gated inside it |
| Clock-in | Rotating **club PIN** only — no geofence, no location permission, nothing to disclose |
| Backend | **Supabase** (EU region): Postgres + Auth + RLS + Storage + Edge Functions |
| Accounts | Admin invites staff by email; staff set their own password |
| Pay period | **Monthly** |
| Holiday model | **Accrue to a balance** — 12.07% of hours worked banks as holiday hours |
| Ratios | 4–7 → 1:8 hard block (statutory). 8–11 → 1:10 soft warning (club policy) |
| Build order | **Engine first, UI later** |
| Distribution | Public App Store listing, via EAS cloud build |
| Design direction | **Open — Michael will supply and apply the visual design himself via Claude Code.** Build UI with neutral, unopinionated styling and centralised design tokens so a theme can be dropped in later without touching screen logic. |

### Two environment facts that shape everything
1. **No full Xcode** — only Command Line Tools, on macOS 13.7.8. No local iOS build or simulator is possible. All iOS builds go through **EAS cloud build**, which is what App Store checklist item #4 asks for anyway. Local dev loop is **Expo Go on a physical iPhone** plus Expo web for quick checks.
2. **Node 16 is the default `node`**, but `node@22` is installed via Homebrew. Expo SDK 54+ requires Node 20+. This must be fixed before step one.

### Known risk, accepted
A single-org internal tool behind a login wall is a textbook **App Store Guideline 4.2 / 4.3** rejection. Michael has chosen the public listing path knowing this. Mitigations are built into Phase 10: a working demo reviewer account, a screen recording in the Review Notes, and keeping club identity in an `orgs` settings row rather than hard-coded strings so the app presents as a general kids-club workforce tool.

---

## Feature set

**A. Rota & shifts** — week-view rota builder, copy-previous-week, publish-to-staff, "My Shifts", open shifts, shift swap requests (staff names a colleague → manager approves in one tap).

**B. Attendance** — clock in/out gated by rotating club PIN; live "on site now" board; timesheets derived from immutable clock events; admin amend-with-reason; variance flags (late / early leave / no-show). Planned (`shifts`) and actual (`timesheets`) stay separate tables — never conflated.

**C. Absence & holiday** — request → approval flow with live balance shown at request time; sickness call-in; 12.07% accrual posted monthly; low-balance warnings; leaver final-pay calculation; absence calendar.

**D. Compliance** — ratio checker on every approval; DBS / first aid / paediatric first aid expiry tracking with reminders at 90/60/30/7 days; **Single Central Record** view, exportable for Ofsted; training records with document upload.

**E. Staff records** — contracts (type, hours, rate, start/leave date) with effective-dated history; entitlements; emergency contacts; documents; staff self-service edits on personal details, admin approval on sensitive fields.

**F. Admin & payroll** — CSV/PDF export of hours + accrual per pay period per staff member; append-only audit trail on every timesheet and leave edit; dashboard showing expiries, pending approvals, ratio risks.

**G. App Store compliance** — delete account, in-app privacy policy, offline fallback, no secrets in bundle, 44pt tap targets, demo reviewer account.

---

## Architecture

```
Expo app (iOS/Android, TypeScript)
  app/            Expo Router — (auth) / (staff) / (admin) route groups
  components/     shared UI primitives
  theme/          design tokens — single swap point for Michael's design pass
  hooks/          data hooks over Supabase client
  lib/engine/     PURE TypeScript: accrual, leaver pay, ratios. Zero I/O, zero imports from supabase.
  lib/supabase/   typed client (anon key only)

Supabase (EU region)
  Postgres + RLS   staff read own rows; manager/admin read org rows
  Auth             email invite → password; no social login
  Storage          qualification documents, private bucket, signed URLs
  Edge Functions   monthly accrual cron, PIN rotation, invite send, CSV/PDF export
```

**Non-negotiable:** `lib/engine/` is pure functions over plain objects. It is the tested core, and it is the reason the build order is engine-first. The service-role key exists only in Edge Function secrets — never in the app bundle (checklist item #1).

---

## Data model

| Table | Purpose |
|---|---|
| `orgs` | Club settings: name, leave-year start, pay period, clock PIN + rotation timestamp, ratio policy |
| `profiles` | 1:1 with `auth.users`. Name, role (`staff`/`manager`/`admin`), DOB, phone, emergency contact, status |
| `contracts` | Effective-dated: staff, type (`fixed_part_time`/`irregular`), weekly hours, rate, start/end date |
| `qualifications` | Type (`dbs`/`first_aid`/`paediatric_first_aid`/`safeguarding`/`other`), reference, issued, **expires_on**, document path, verified_by |
| `shifts` | Planned schedule: date, start, end, role, expected children under-8 and 8-plus, published_at |
| `shift_assignments` | shift → staff, status (`assigned`/`open`/`swap_pending`) |
| `swap_requests` | assignment, from/to staff, status, decided_by |
| `clock_events` | **Immutable** raw in/out taps with PIN verification result |
| `timesheets` | Derived actuals: clock in/out, break minutes, worked minutes, source, status, variance flags |
| `absence_requests` | Type (`holiday`/`sickness`/`unpaid`), dates, hours, status, decided_by, stored ratio-check result |
| `holiday_ledger` | **Append-only** source of truth: event (`accrual`/`taken`/`adjustment`/`payout`), hours, running balance |
| `ratio_rules` | age_min, age_max, children_per_staff, enforcement (`block`/`warn`) — rules as data, not constants |
| `audit_log` | actor, entity, action, before, after, timestamp |
| `push_tokens` | Expo push tokens per device |

`holiday_ledger` being append-only is what makes balances defensible in a dispute — you can always show how a number was reached.

---

## Build phases

### Phase 0 — Environment & scaffold
Switch to Node 22 (`brew link --overwrite node@22`, or nvm). Create the Expo + TypeScript + Expo Router project. Supabase project in the EU region. Confirm the local loop: `npx expo start` → Expo Go on a physical iPhone.

### Phase 1 — Data model & RLS
All tables above as SQL migrations. RLS policies: staff read/write own rows only; manager/admin read org-wide; `holiday_ledger`, `clock_events` and `audit_log` insert-only, no client updates. Generate TypeScript types from the schema. Seed `ratio_rules` and a dev `orgs` row.

### Phase 2 — Holiday accrual engine ← *the product*
Pure TypeScript in `lib/engine/accrual.ts`:
- **Irregular:** `hours_worked_in_period × 0.1207`, posted at monthly period close, capped at the 28-day statutory maximum per leave year.
- **Fixed part-time:** `contracted_weekly_hours × 5.6 weeks`, pro-rated to the portion of the leave year employed; accrued monthly in year one, full entitlement thereafter.
- New starters accrue from week one using the same method — never a broken average.
- Balance = accrued − taken − pending holds. Held to 2dp.
- Leave year start configurable, defaulting to 1 April.

Unit tested against named fixtures before any UI exists: mid-year starter, zero-hours worker with a nil month, part-timer changing contracted hours mid-year, someone hitting the 28-day cap.

### Phase 3 — Leaver final pay
On `leave_date`, compute accrued-but-untaken hours and write a `payout` ledger event.

**Precision point the source docs blur:** the 52-week reference period determines the **pay rate** (average weekly pay across the last 52 *paid* weeks, looking back up to 104 to skip unpaid ones) — it is *not* an alternative way to calculate the accrued *amount*. Accrual stays 12.07% throughout. The engine will implement it that way and comment why.

### Phase 4 — Ratio checker
`lib/engine/ratios.ts` — given a shift, its assignments and `ratio_rules`, return `{ ok, violations[] }`.
- A staff member only counts toward ratio if their DBS is unexpired, required qualifications are valid, and they are 18+.
- 4–7 (under-8s): 1:8, **blocks** approval.
- 8–11: 1:10, **warns** only — no statutory ratio applies above 8.
- Runs on leave approval, sickness call-in, unassignment, and rota publish. Result is stored on the request for audit.

### Phase 5 — Compliance tracking & alerts
Expiry computation across `qualifications`; status bands (valid / expiring / expired). Edge Function cron writing reminders at 90/60/30/7 days. Blocks rostering anyone with an expired DBS.

### Phase 6 — Staff app UI
Auth (invite → set password), My Shifts, **clock in/out via club PIN**, request holiday (with live balance), report sickness, swap request, My Record (hours, balance, qualifications, documents), Settings.

### Phase 7 — Admin UI
Dashboard (expiries, pending approvals, ratio risks, who's on site). Week rota builder with copy-previous-week and publish. Approvals inbox showing the ratio verdict inline. Staff directory and record editor. **Single Central Record** view.

### Phase 8 — Notifications
Expo push: shift reminders, approval/rejection, low-balance warning, expiry alerts. Email fallback via Supabase.

### Phase 9 — Reporting & audit trail
CSV/PDF export of hours and accrual per pay period per staff member, generated in an Edge Function. Audit log viewer with before/after diffs.

### Phase 10 — App Store compliance pass
Work the checklist explicitly: no keys in bundle (#1, #2), no dynamic code execution (#3), EAS cloud build (#4), airplane-mode stress test with a clean fallback (#5), strip all placeholder text (#6), modular folders (#7), in-app privacy policy link (#9), **native Delete Account button** (#11), latest SDK target (#14), third-party privacy manifests (#15), 44pt tap-target audit (#16), demo reviewer account (#17), explainer screen recording (#18).

Items #8 and #10 (AI consent, AI data disclaimer) **do not apply** — EM3 X sends nothing to an AI vendor. Items #12 and #13 (IAP, Restore Purchases) **do not apply** — no paid tier.

Design pass slots in before this phase: Michael applies his own visual design via Claude Code against `theme/` and the built screens.

---

## Verification

- **Engine:** `npm test` — unit tests are the gate on Phases 2–4. Fixtures cover mid-year starter, nil-hours month, contract change, 28-day cap, leaver with untaken balance, and a ratio breach at the 7/8 age boundary.
- **RLS:** integration test asserting a staff-role JWT cannot read another staff member's timesheet or ledger.
- **PIN clock-in:** verify a wrong or stale PIN is rejected and the attempt is logged to `clock_events`.
- **Offline:** airplane mode → launch → open My Shifts → expect a clean "Connection lost" state, not a white screen or crash.
- **Device:** Expo Go on a physical iPhone through each phase; `eas build --profile preview` for a real installable build before submission.
- **Secrets:** unpack the built bundle and grep for `SUPABASE_SERVICE_ROLE`, any private key, and any hard-coded PIN. Must be clean.

---

## Open items
1. **Design direction** — deferred by choice; Michael applies it himself via Claude Code. Screens will ship with neutral styling and centralised tokens until then.
2. **Club PIN rotation policy** — daily, weekly, or manual? Defaulting to daily rotation with a manager-visible current code.
3. **Under-18 staff** — does EM3 employ any? They cannot count toward ratios, so the engine needs to know whether to model this.
4. **Existing data** — is there a spreadsheet of current staff, contracts and DBS dates to import, or does everything start empty?

These do not block Phase 0–2; I'll build against sensible defaults and confirm as each becomes relevant.
