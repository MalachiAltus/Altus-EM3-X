// Shared with src/app/settings.tsx (in-app, collapsible) and src/app/privacy.tsx
// (the public route required for App Store / Play Store submission) — kept in
// one place so the two copies can't drift apart.

export const PRIVACY_POLICY = `EM3 X stores the information needed to run staff scheduling, attendance, and holiday tracking for EM3's kids club team: your name, contact details, date of birth, emergency contact, contracted hours and pay rate, DBS and first aid/safeguarding qualification records, shift and clock-in history, and leave requests.

Who can see it: only you, and EM3 managers/admins acting in their staff-management role. It is never sold, and never shared with any third party outside the systems below.

Where it's stored: Supabase, hosted in the EU, acting as EM3's data processor. Push notifications (shift and approval alerts) are delivered via Expo's push notification service, which receives only a device token and the notification text — no other profile data.

Why: to run the rota, calculate statutory holiday accrual correctly, and meet UK childcare regulatory requirements around DBS and qualification tracking (Ofsted Single Central Record).

Retention: timesheet and payroll records are kept for as long as UK employment law requires, even after account deletion. All other personal data is deleted when you delete your account from Settings.

Your rights: you can review your own record at any time from My Record, correct contact and emergency details yourself, and request correction of any other field or a copy of your data from an EM3 admin. Deleting your account removes your personal data immediately, subject to the payroll retention above.

Questions or requests about your data should be directed to your EM3 manager.`;

export const TERMS = `EM3 X is provided for use by EM3 staff for work-related scheduling, attendance, and leave management. Accounts are provisioned by an EM3 manager or created via a sign-up request approved by an admin; you are responsible for keeping your login credentials and club clock-in PIN confidential and for the accuracy of the hours, shifts, and leave requests you submit through the app.

Clocking in or out on behalf of another staff member, or submitting false attendance or leave information, is a disciplinary matter handled under EM3's normal staff policies, not just an app rule.

EM3 may suspend or remove access to the app for a staff member whose employment has ended or who has breached these terms. Continued use of the app after changes to these terms constitutes acceptance of them.`;
