# Gate Pass Feature — Implementation Plan

**Module placement:** Attendance module (new sidebar item "Gate Pass"), alongside Breaks & Field Work.

---

## 1. Roles & Flow

```
Employee raises request
        ↓
Line Manager approves/rejects   (skippable via HR setting)
        ↓
HR approves/rejects → pass code generated (WORD-WORD-##)
        ↓
Security sees "Approved / Awaiting Exit"
        ↓
Security enters code at gate → validates → logs EXIT
        ↓
Employee returns → Security marks "Returned" → logs RE-ENTRY
        ↓
System links exit/re-entry to attendance_logs (no lateness charge)
```

Overdue returns trigger both **alerts** and **charges** (per your call).

---

## 2. New Sidebar Items

- **Employees / Managers / HR:** "Gate Pass" → request form + history
- **HR:** "Gate Pass Admin" → all requests, approve/reject, create security accounts
- **Security role:** dedicated `/security` dashboard (mobile-first, only 3 tabs: Pending HR, Approved/Awaiting Exit, Out, Returned)

---

## 3. Database Changes

New tables (all under `public`, with GRANTs + RLS):

**a) `gate_pass_requests`**
- employee_id, branch_id, reason, destination, expected_out_at, expected_return_at
- status: `pending_manager` | `pending_hr` | `approved` | `rejected` | `exited` | `returned` | `overdue` | `cancelled`
- manager_id, manager_decision_at, manager_notes
- hr_id, hr_decision_at, hr_notes
- pass_code (unique, nullable until HR approves), pass_code_used_at
- actual_exit_at, actual_return_at
- exit_recorded_by (security user), return_recorded_by

**b) `gate_pass_security_assignments`** — links security user → branch (multi-guard-per-branch supported)
- user_id, branch_id, is_active

**c) `gate_pass_settings`** — single-row HR config
- require_manager_approval (bool, default true)
- overdue_grace_minutes (default 30)
- charge_on_overdue (bool, default true)

**d) New role value:** extend `attendance_role` enum with `'security'`, or add app_role. Store via `attendance_user_roles`.

**e) `has_attendance_role(_, 'security')`** already covers permission checks.

---

## 4. Pass Code Generation

Server-side (trigger or edge function on HR approve):
- Format: `WORD-WORD-##` (e.g., `SWIFT-EAGLE-47`)
- Word list: ~200 friendly, memorable, non-offensive words → ~50M combos
- Unique per active request; regenerated if collision

---

## 5. Edge Functions

- **`gate-pass-approve`** — validates approver role, transitions state, generates pass code, notifies next actor
- **`gate-pass-verify-code`** — security enters code, checks employee+branch match, marks exit, writes to `attendance_logs`
- **`gate-pass-mark-return`** — security marks return, links re-entry, computes overdue if past `expected_return_at + grace`
- **`gate-pass-overdue-scan`** — cron every 15 min, flips overdue, triggers charge + push alert

---

## 6. UI Screens

**Employee (`/attendance/gate-pass`)**
- "Request Gate Pass" form (reason, destination, expected out/return)
- My requests list with live status + pass code display when approved

**Manager (`/attendance/gate-pass/team`)**
- Pending team requests, approve/reject

**HR (`/attendance/gate-pass/admin`)**
- Tabs: Pending / Approved / Out / Returned / Rejected
- Approve/reject actions
- "Security Accounts" sub-tab: create security users (email + temp password), assign to branch(es), revoke

**Security (`/security` — dedicated mobile-first layout)**
- Header: today's date, branch
- Tabs: **Awaiting Exit** (enter code), **Out** (mark return), **Returned today**, **Pending HR** (read-only)
- Code entry: large input, live validate, big employee card on match
- Push notifications on every new approved pass, overdue return

---

## 7. Notifications

- Employee: on manager decision, HR decision, overdue reminder
- Manager: on new request from direct report
- HR: on manager approval, overdue events
- Security (branch-scoped): on HR approval (code silent — only visible in dashboard, not push), on overdue

---

## 8. Technical Notes

- Security dashboard uses same Supabase auth, gated by `has_attendance_role(uid, 'security')`
- Security cannot see the pass code list until they type it (prevents shoulder-surf leakage from screenshots) — code shown only after successful validation of that specific code
- Attendance linkage: exit writes an `attendance_logs` row of type `gate_pass_exit`, return writes `gate_pass_return`, both flagged so daily charge scheduler ignores them
- Overdue = missed return → creates `attendance_charges` row (existing table) + push alert
- RLS: employees see own requests; managers see reports; HR sees all; security sees only branch-scoped approved+ requests

---

## 9. Rollout Order

1. Migration (tables, enum, RLS, GRANTs)
2. Pass code word list + edge functions
3. HR admin screen (incl. security account creation)
4. Employee request screen + manager approval screen
5. Security dashboard + code verification
6. Overdue cron + charge/alert integration
7. Notifications wiring
8. Sidebar/route additions

Reply **"proceed"** to build, or tell me anything to adjust first.
