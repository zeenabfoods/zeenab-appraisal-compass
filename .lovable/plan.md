# Device Lock for Clock-In — Execution Plan

## Goal
Prevent employees from sharing login credentials so a friend can clock in for them. Each account will be bound to one trusted device. Any clock-in attempt from a different device is blocked with a **"Multiple Device Detected — Violation"** warning and logged for HR review.

Note on "phone IP": mobile IPs change constantly (Wi-Fi ↔ mobile data, carrier NAT). Binding to IP alone would lock out legitimate users several times a day. We will bind to a **device fingerprint** (already generated in `src/utils/deviceFingerprinting.ts`) and also record the IP for the audit trail. This is the industry-standard approach.

---

## How it will work (user-facing)

1. **First clock-in ever** → device is auto-registered as the employee's trusted device. A toast confirms: *"This device has been registered as your official clock-in device."*
2. **Subsequent clock-ins from the same device** → normal flow.
3. **Clock-in attempt from a different device** → clock-in is **blocked**, a red alert dialog appears:
   > ⚠️ **Multiple Device Detected — Policy Violation**
   > This account is registered to a different device. Clock-in is not permitted from this device. HR has been notified.
4. The violation is written to `attendance_audit_logs` and a notification is sent to HR.
5. **HR override**: HR can reset an employee's trusted device from the HR dashboard (e.g. legitimate phone replacement). The next clock-in re-registers the new device.

---

## Technical execution

### 1. Database (migration)
New table `employee_trusted_devices`:
- `user_id` (FK profiles, unique)
- `device_fingerprint_hash` (text, SHA-256 from existing utility)
- `device_label` (user-agent summary for HR display)
- `registered_ip` (text)
- `registered_at`, `last_seen_at`, `last_seen_ip`
- `is_active` (bool), `reset_count` (int)
- RLS + GRANTs per project rules; HR can SELECT/UPDATE all, employee can SELECT own only.

New table `device_violation_logs`:
- `user_id`, `attempted_fingerprint_hash`, `attempted_ip`, `user_agent`, `attempted_at`, `action_blocked` (`clock_in` / `clock_out`).

### 2. Edge function `verify-clock-device` (verify_jwt = true)
- Input: `{ fingerprint_hash, action }`
- Reads `employee_trusted_devices` for the caller.
  - No record → register this device, return `{ allowed: true, registered: true }`.
  - Match → update `last_seen_*`, return `{ allowed: true }`.
  - Mismatch → insert into `device_violation_logs`, notify HR, return `{ allowed: false, reason: "device_mismatch" }`.
- Captures IP from request headers server-side (client can't spoof it).

### 3. Frontend clock-in flow
- In `ClockInOutCard` (and long-press fingerprint path): before writing to `attendance_logs`, call `verify-clock-device`.
- If blocked → show red AlertDialog with the violation message, play alert sound, do NOT proceed.
- If allowed → proceed with existing geofence + clock-in logic.
- Reuse existing `generateDeviceFingerprint()` — no new fingerprinting code needed.

### 4. HR dashboard additions (attendance module)
- New "Device Management" tab under HR view showing:
  - Employee | Registered Device | Registered On | Last Seen | IP | **Reset Device** button
  - **Violations log** table (who tried, when, from what device/IP)
- Reset button clears the trusted device so the next clock-in re-registers.

### 5. Notifications
- HR gets in-app notification on each violation (reuse existing notifications system).

---

## What we intentionally will NOT do
- **Not** bind to IP alone — mobile IPs change and would cause false lockouts.
- **Not** block login itself — the account can still sign in anywhere (e.g. desktop to view payslips); only **clock-in/out** is device-locked.
- **Not** touch the geofence, break, or overtime logic.

---

## Rollout safety
- First run silently registers whatever device each active employee uses next — no mass lockout on day one.
- HR can reset any employee's device instantly if a phone is lost/replaced.

---

Reply **"proceed"** to build this, or tell me what to change (e.g. also lock to IP subnet, allow 2 devices per employee, require HR pre-approval instead of auto-register on first use).