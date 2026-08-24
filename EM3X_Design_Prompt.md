# Design Prompt — EM3 X (Staff Records & Rota App)

**Reference apps for this design:** Deputy (rota + clock in/out), BrightHR / Blip (single central record + simple timesheet clock), RotaCloud (the clock-in screen specifically), Planday (manager approvals inbox). Search these names on Dribbble/Pinterest or their own marketing sites for visual inspiration before generating — same technique used for the RecipeSnap build.

**Why this is split into two prompts.** EM3 X is one app with admin features role-gated inside it, which is thirteen screens end to end. The RecipeSnap prompt worked *because* it stayed at eight features — a single pass covering all thirteen will produce something generic. Generate **Prompt A (Staff)** first, settle the visual language on it, then generate **Prompt B (Admin)** telling Claude Design to inherit that language. The admin screens are the ones a manager uses at a desk, so they carry more density and can afford to look different.

---

## Prompt A — Staff (ready to paste into Claude Design)

Design a polished mobile app called **"EM3 X"** inspired by apps like Deputy and BrightHR. The app lets out-of-school kids club staff check their rota, clock in and out with a club code, request time off, and keep their own employment records up to date.

The app is a demo MVP, so keep it simple, clear, and reassuring. Use a clean, professional style with rounded cards, a soft neutral background, and a warm-but-calm accent colour — avoid anything that reads as cold or corporate, this is a childcare workplace tool used by part-time staff on their own phones. Reserve saturated colour for compliance status only (green valid, amber expiring, red expired) so status reads instantly and never competes with the rest of the UI. The app should feel like a trustworthy HR tool, not a generic productivity app.

**Primary app features:**

1. View upcoming rota / shift schedule
2. Clock in and out using the club's daily code
3. Request time off (holiday, sick, unpaid)
4. View holiday balance, accrued as you work
5. View and update personal record (contract, qualifications, training, DBS status)
6. Automated reminders for expiring qualifications and training
7. Request a shift swap with a named colleague
8. Notifications for shift changes and leave decisions

**Required pages/screens:**

**1. Log In Screen**
Purpose: Get an invited staff member in, in one screen. Accounts are created by a manager — there is no public sign-up.
Content:
- App logo/name: EM3 X
- Headline: "Your shifts, records, and time off — all in one place"
- Subtext: "Check your rota, clock in, request leave, and keep your details up to date."
- Email field, password field
- Primary button: "Log In"
- Secondary text link: "Forgot password?"
- Footer text: "New here? Your manager will send you an invite."
- Error state: "That email and password don't match. Try again or reset your password."

**2. Home / Dashboard Screen**
Purpose: Answer "what do I need to know right now" — not a menu of features.
Content:
- Greeting: "Hi Sarah, here's your week"
- Today's shift card: date, time, role, site — with a large "Clock In" button when a shift is active
- If already clocked in, the same card shows: "On shift since 09:02 — 2h 14m" and the button becomes "Clock Out"
- Section: "This Week" — compact Mon–Sun shift list
- Holiday balance card, two variants depending on contract type:
  - Zero-hours staff: "18.5 hours banked" with subtext "You earn 12.07% of every hour you work"
  - Fixed part-time staff: "12.5 days remaining" with subtext "of 28 days this leave year"
- Alert banner, only shown when relevant: "Your DBS check expires in 14 days — tap to update"
- Empty state when there are no shifts this week: "No shifts scheduled this week. Your manager will publish the rota soon."
- Bottom tab bar: Home / Rota / Time Off / My Record

**3. Rota Screen**
Purpose: The full schedule, current and upcoming.
Content:
- Week / Month toggle
- Shift cards: date, start–end time, role, site
- Each shift card has a secondary action: "Request Swap"
- Unpublished weeks show as: "Not published yet"
- Empty state: "No shifts scheduled for this period."
- Offline state: "Showing your last saved rota from 09:14 today."

**4. Clock In / Out Screen**
Purpose: Confirm attendance quickly and unambiguously, and prove the person is at the club.
Content:
- Large current-time display
- Field: "Enter today's club code" — 4 digits, big numeric keypad, 44pt minimum targets
- Helper text: "Today's code is displayed at the sign-in desk. It changes every day."
- Primary button: "Clock In" — becomes "Clock Out" once a shift is active, showing elapsed time: "On shift: 2h 14m"
- Success state: "Clocked in at 9:02 AM ✓" with subtext "Verified with today's club code"
- Wrong-code error state: "That code isn't right for today. Check the sign-in desk and try again."
- No-shift-scheduled state: "You're not rostered today. Clock in anyway?" with buttons "Clock In Anyway" / "Cancel"
- Offline state: "Connection lost. Please check your internet and try again."

**5. Request Time Off Screen**
Purpose: Submit a leave request without guessing whether the balance covers it.
Content:
- Header: "Request Time Off"
- Type selector: Holiday / Sick / Unpaid
- Date range picker
- Optional note field, placeholder: "Anything your manager should know?"
- Live balance check, shown as the dates are picked, in two variants:
  - Zero-hours: "You have 18.5 hours banked — this request uses 12."
  - Fixed part-time: "You have 12.5 days remaining — this request uses 2."
- Insufficient-balance state: "This request is 4 hours more than you've banked. You can still submit it — your manager will decide."
- Primary button: "Submit Request"
- Status list below, each row showing the date range and a status badge: Pending / Approved / Declined
- Declined rows show the manager's reason inline
- Empty state: "No requests yet."

**6. My Record Screen**
Purpose: The single central record — one place for everything about this staff member.
Content:
- Personal details: name, contact, emergency contact, contract type — with an "Edit" affordance
- Note under sensitive fields: "Changes to your bank details or contract go to your manager for approval."
- Qualifications & training list. Each row: name, expiry date, and a status colour
  - Valid (green): "Valid until 12 Mar 2027"
  - Expiring (amber): "Expires in 27 days — 12 Mar 2026"
  - Expired (red): "Expired 4 Feb 2026 — you can't be rostered until this is renewed"
- Rows should include: DBS Check, Paediatric First Aid, First Aid, Safeguarding
- Document upload area: "Upload certificate" — accepts photo or PDF
- Section: "Needs attention" — auto-generated list of anything expiring within 30 days
- Empty state for that section: "Nothing expiring soon. You're all up to date."

**7. Notifications Screen**
Purpose: Keep staff informed without them checking manually.
Content:
- Shift change: "Your shift on Tue 14 Oct has changed to 3:15–6:00 PM"
- Leave decision: "Your holiday request for 22–23 Oct was approved"
- Expiry reminder: "Your paediatric first aid certificate expires in 14 days"
- Swap decision: "Ben accepted your swap for Fri 17 Oct — your manager has approved it"
- Low balance: "You've used most of your holiday. 3.5 hours left this leave year."
- Empty state: "You're all caught up."

**8. Settings Screen**
Purpose: Account controls, and the things the App Store requires to be reachable in-app.
Content:
- Rows: Notification preferences / Change password / Privacy Policy / Terms
- Destructive row at the bottom: "Delete Account"
- Delete confirmation copy: "This permanently deletes your account and personal details. Your timesheet and payroll records are kept as long as the law requires. This can't be undone." Buttons: "Delete My Account" / "Cancel"
- Footer: app version number

---

## Prompt B — Admin (generate second, after Prompt A)

Continue the same app, **EM3 X**, using the exact visual language, spacing, and component style established in the staff screens. These are the manager-only screens, reached by a role-gated "Manage" tab that staff never see. Managers use these at a desk rather than on the move, so they can carry more information per screen — but keep the same cards, the same accent, and the same green/amber/red compliance colours.

**Primary admin features:**

1. Dashboard of what needs attention today
2. Build and publish the weekly rota
3. Approve or decline leave, sickness and swap requests
4. See who is on site right now
5. View the Single Central Record across all staff
6. Export hours and holiday for payroll

**Required pages/screens:**

**9. Admin Dashboard**
Purpose: The three things a manager must not miss, above the fold.
Content:
- Header: "Today at EM3"
- Card: "On site now — 6 staff" with names and clock-in times
- Card: "Pending approvals — 4" with a "Review" button
- Card: "Compliance — 2 need attention" listing e.g. "Ben Adeyemi — DBS expired 4 Feb" in red and "Priya Shah — Paediatric first aid expires in 21 days" in amber
- Card: "Today's club code — 4821" with a "Regenerate" action
- Empty state for approvals: "Nothing waiting on you."

**10. Rota Builder**
Purpose: Lay out the week and publish it to staff.
Content:
- Week grid, Mon–Sun, staff down the side
- Actions: "Copy last week" / "Add shift" / "Publish week"
- Each shift cell: time, role, and the expected number of children in two bands — under-8s and 8–11s
- Unassigned shifts show as "Open shift" and are visually distinct
- Pre-publish check banner: "2 shifts are below the required staffing ratio" with a "Show me" link
- Publish confirmation: "Publish this week to 14 staff? They'll be notified."
- Empty state: "No shifts yet this week. Copy last week to get started."

**11. Approvals Inbox** ← *the most important screen in the app*
Purpose: Approve or decline a request while seeing what it does to staffing.
Content:
- List of pending requests: staff name, type, dates, hours, submitted date
- Tapping a request opens a detail sheet with the staff member's balance and the **ratio verdict**, in one of three states:
  - **Clear (green):** "Staffing stays legal. 4 staff for 26 under-8s." Buttons: "Approve" / "Decline"
  - **Blocking (red):** "Approving this breaks the legal ratio on Tue 14 Oct. 3 staff for 26 under-8s — you need 4." The Approve button is **disabled**, with a link: "Assign cover first". Only "Decline" and "Find Cover" are actionable.
  - **Advisory (amber):** "This leaves 2 staff for 24 juniors. Club policy is 1 to 10 — this is above your policy but not illegal." Approve stays enabled, with the warning shown above it.
- Decline flow requires a reason, placeholder: "Why are you declining? Sarah will see this."
- Note under the verdict: "Staff with an expired DBS aren't counted toward ratio."
- Empty state: "No requests waiting."

**12. Staff Directory & Single Central Record**
Purpose: The Ofsted-facing view — every staff member's compliance status in one table.
Content:
- Search and filter: All / Expiring / Expired
- Table rows: name, role, contract type, DBS status, paediatric first aid, first aid, safeguarding — each cell a green/amber/red status chip with its expiry date
- Row tap opens the full staff record: contract history, documents, hours, holiday ledger
- Header action: "Export Single Central Record" → PDF
- Filter empty state: "No staff with expiring checks. Everything is in date."

**13. Reports & Payroll Export**
Purpose: Get the month's numbers out of the app and to whoever runs payroll.
Content:
- Period selector, defaulting to last calendar month
- Summary row: total hours worked, total holiday accrued, total holiday taken
- Per-staff table: name, contract type, hours worked, holiday accrued this period, balance carried
- Buttons: "Export CSV" / "Export PDF"
- Note: "Holiday accrues at 12.07% of hours worked, posted at the end of each month."
- Loading state: "Building your export…"

---

## Notes on Why These Screens Are Written This Way

- **The dashboard leads with "what do I need to know right now," not a menu of features** — matching how Deputy and BrightHR both structure their home screens around the current or next shift rather than a flat feature list. The alert banner is conditional on purpose: a banner that's always there stops being read.

- **The holiday balance is written twice, deliberately.** EM3 has both zero-hours and fixed part-time staff, and they experience the same number completely differently — one accrues *hours* as they work, the other draws down a fixed pot of *days*. Writing "12.5 days remaining" for a zero-hours worker would be wrong, not just imprecise. Specifying both variants in the prompt is what stops the design assuming one and forcing a rewrite later.

- **The club code replaces the geofence.** Most rota apps prove attendance with GPS. EM3 X uses a daily code shown at the sign-in desk instead — which means no location permission prompt, nothing to disclose in the privacy policy, and it works indoors where GPS is unreliable. The screen copy has to carry that ("It changes every day"), because the code is the whole anti-fraud mechanism.

- **The clock-in button changes state rather than being two separate buttons** — Clock In becomes Clock Out with elapsed time. This is the RotaCloud pattern and it removes the "did I already clock in today?" ambiguity that generates most timesheet disputes.

- **Colour-coded expiry status is doing real work, not decoration.** It's the visual form of the DBS and qualification compliance requirement, and the My Record / Single Central Record screens are what make this a *childcare* app rather than a generic rota app. Note the expired copy is written as a consequence — "you can't be rostered until this is renewed" — not just a label. That sentence is the feature.

- **The approvals screen has three ratio states, not two, and they behave differently.** Under-8s carry a statutory 1:8 ratio, so breaching it disables the Approve button outright. Ages 8–11 have no statutory ratio, so that's club policy — it warns but still lets the manager decide. Designing this as a single generic "warning" would either block managers illegitimately or let them break the law. The distinction between a red disabled state and an amber advisory one is the single highest-value thing in this whole document to get right in the first pass.

- **The balance is shown live during the request itself**, not just on the dashboard — it cuts requests staff don't have the hours for, and ties directly to the 12.07%-per-month accrual engine.

- **Empty, loading, offline and error states are specified for every screen.** This is what separates a design that looks finished from a static mockup — and the offline copy in particular is a literal App Store review requirement, not a nice-to-have.

- **Settings carries Delete Account and Privacy Policy** because Apple requires both to be reachable inside the app, not just on a website. Easier to design in now than bolt on the week before submission.

---

## Suggested Next Step

Do what the RecipeSnap video did: save screenshots of **Deputy's rota screen**, **BrightHR's staff record screen**, and **RotaCloud's clock-in screen** into this folder, attach them alongside Prompt A in Claude Design, and let it draw from the written spec and the visual references together.

Generate Prompt A first and settle the visual language before touching Prompt B — the admin screens should inherit from the staff screens, not compete with them.

Once you're happy with the output, the colours, spacing and type scale from it get written into `theme/` as tokens. Every screen in the build reads from that one file, so the design can keep moving without touching any screen logic.
