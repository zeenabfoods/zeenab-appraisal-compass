# Smart Attendance System - Technical Logic Documentation

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Database Architecture](#2-database-architecture)
3. [Core Workflows](#3-core-workflows)
4. [Clock-In Logic](#4-clock-in-logic)
5. [Clock-Out Logic](#5-clock-out-logic)
6. [Lateness Detection Algorithm](#6-lateness-detection-algorithm)
7. [Break Management System](#7-break-management-system)
8. [Overtime Calculation Engine](#8-overtime-calculation-engine)
9. [Night Shift Detection & Handling](#9-night-shift-detection--handling)
10. [Geofencing System](#10-geofencing-system)
11. [Financial Charges System](#11-financial-charges-system)
12. [Escalation Rules Engine](#12-escalation-rules-engine)
13. [Auto Clock-Out System](#13-auto-clock-out-system)
14. [Field Work Tracking](#14-field-work-tracking)
15. [Security Features](#15-security-features)
16. [Offline Sync System](#16-offline-sync-system)
17. [Notification System](#17-notification-system)
18. [Role-Based Access Control](#18-role-based-access-control)

---

## 1. System Overview

### Purpose
The Smart Attendance System is an enterprise-grade workforce management platform providing:
- GPS-enabled clock-in/out with geofencing
- Real-time location tracking for field work
- Automated financial charge calculation
- Anti-fraud security measures
- Break management with scheduling
- Overtime tracking and calculation
- Night shift support
- Offline-first PWA architecture

### Technology Stack
| Component | Technology |
|-----------|------------|
| Frontend | React 18 + TypeScript + Vite |
| UI Framework | Tailwind CSS + shadcn/ui |
| State Management | TanStack React Query |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Authentication | Supabase Auth |
| Maps | Google Maps API |
| PWA | Vite PWA Plugin + Workbox |

### Core Entities Relationship
```
┌─────────────────┐      ┌──────────────────┐      ┌────────────────────┐
│    PROFILES     │──────│  ATTENDANCE_LOGS │──────│ ATTENDANCE_CHARGES │
│   (Employees)   │      │  (Clock Records) │      │    (Penalties)     │
└─────────────────┘      └──────────────────┘      └────────────────────┘
        │                         │                          
        │                         │                          
        ▼                         ▼                          
┌─────────────────┐      ┌──────────────────┐      ┌────────────────────┐
│  DEPARTMENTS    │      │ATTENDANCE_BREAKS │      │  OVERTIME_RATES    │
└─────────────────┘      └──────────────────┘      └────────────────────┘
        │                         │                          
        │                         ▼                          
        │                ┌──────────────────┐                
        │                │  BREAK_SCHEDULES │                
        │                └──────────────────┘                
        ▼                                                    
┌─────────────────┐      ┌──────────────────┐      ┌────────────────────┐
│ATTENDANCE_RULES │      │ATTENDANCE_BRANCHES│     │   FIELD_TRIPS      │
│  (Config)       │      │   (Locations)    │      │  (Field Work)      │
└─────────────────┘      └──────────────────┘      └────────────────────┘
```

---

## 2. Database Architecture

### 2.1 Core Tables

#### `attendance_logs` - Primary Attendance Record
```sql
attendance_logs {
  id: uuid (PK)
  employee_id: uuid (FK -> profiles.id)
  
  -- Clock-in Data
  clock_in_time: timestamp with time zone (default: now())
  clock_in_latitude: numeric
  clock_in_longitude: numeric
  within_geofence_at_clock_in: boolean
  geofence_distance_at_clock_in: integer (meters)
  device_timestamp: timestamp with time zone
  
  -- Clock-out Data
  clock_out_time: timestamp with time zone (nullable)
  clock_out_latitude: numeric
  clock_out_longitude: numeric
  within_geofence_at_clock_out: boolean
  
  -- Session Type
  location_type: text ['office' | 'field' | 'night_shift']
  branch_id: uuid (FK -> attendance_branches.id)
  
  -- Field Work Data
  field_work_location: text
  field_work_reason: text
  
  -- Lateness Tracking
  is_late: boolean (default: false)
  late_by_minutes: integer (default: 0)
  
  -- Hours Calculation
  total_hours: numeric
  overtime_hours: numeric (default: 0)
  overtime_amount: numeric (default: 0)
  overtime_approved: boolean (default: false)
  overtime_approved_at: timestamp with time zone
  overtime_start_time: timestamp with time zone
  overtime_prompted_at: timestamp with time zone
  
  -- Night Shift
  is_night_shift: boolean (default: false)
  night_shift_hours: numeric (default: 0)
  
  -- Auto Clock-out
  auto_clocked_out: boolean (default: false)
  early_closure: boolean (default: false)
  
  -- Sync Status
  sync_status: text (default: 'synced')
  
  -- Timestamps
  created_at: timestamp with time zone
  updated_at: timestamp with time zone
}
```

#### `attendance_rules` - System Configuration
```sql
attendance_rules {
  id: uuid (PK)
  rule_name: text
  is_active: boolean (default: true)
  
  -- Work Hours
  work_start_time: time (default: '08:00')
  work_end_time: time (default: '17:00')
  
  -- Lateness Configuration
  grace_period_minutes: integer (default: 5)
  late_threshold_minutes: integer (default: 15)
  
  -- Break Configuration
  mandatory_break_duration_minutes: integer (default: 30)
  max_break_duration_minutes: integer (default: 60)
  
  -- Night Shift Configuration
  night_shift_start_time: time (default: '22:00')
  night_shift_end_time: time (default: '06:00')
  night_shift_rate: numeric (default: 1.2)
  
  -- Overtime Configuration
  overtime_rate: numeric (default: 1.5)
  
  -- Financial Charges
  late_charge_amount: numeric (default: 500.00)
  absence_charge_amount: numeric (default: 1000.00)
  early_closure_charge_amount: numeric (default: 750.00)
  
  -- Session Rules
  allow_multiple_sessions_per_day: boolean (default: true)
  
  -- Metadata
  created_by: uuid
  created_at: timestamp with time zone
  updated_at: timestamp with time zone
}
```

#### `attendance_branches` - Geofence Locations
```sql
attendance_branches {
  id: uuid (PK)
  name: text
  address: text
  latitude: numeric
  longitude: numeric
  geofence_radius: integer (default: 100 meters)
  geofence_color: text (default: '#FF6B35')
  is_active: boolean (default: true)
  created_at: timestamp with time zone
  updated_at: timestamp with time zone
}
```

#### `attendance_charges` - Financial Penalties
```sql
attendance_charges {
  id: uuid (PK)
  employee_id: uuid (FK -> profiles.id)
  attendance_log_id: uuid (FK -> attendance_logs.id, nullable)
  
  -- Charge Details
  charge_type: text ['late_arrival' | 'absence' | 'early_closure']
  charge_amount: numeric
  charge_date: date (default: CURRENT_DATE)
  
  -- Escalation
  is_escalated: boolean (default: false)
  escalation_multiplier: numeric (default: 1.0)
  
  -- Status Management
  status: text (default: 'pending') ['pending' | 'waived' | 'resolved']
  
  -- Waiver Information
  waived_by: uuid (FK -> profiles.id)
  waived_at: timestamp with time zone
  waiver_reason: text
  
  -- Dispute Information
  dispute_reason: text
  disputed_at: timestamp with time zone
  dispute_resolution: text
  
  -- Timestamps
  created_at: timestamp with time zone
  updated_at: timestamp with time zone
}
```

#### `overtime_rates` - Position-Based Overtime Rates
```sql
overtime_rates {
  id: uuid (PK)
  position_name: text
  day_type: text ['weekday' | 'saturday' | 'sunday']
  rate_amount: numeric (hourly rate in Naira)
  created_at: timestamp with time zone
  updated_at: timestamp with time zone
}
```

#### `attendance_breaks` - Break Records
```sql
attendance_breaks {
  id: uuid (PK)
  employee_id: uuid (FK -> profiles.id)
  attendance_log_id: uuid (FK -> attendance_logs.id)
  
  -- Break Timing
  break_type: text ['short_break' | 'lunch']
  break_start: timestamp with time zone
  break_end: timestamp with time zone (nullable)
  break_duration_minutes: integer
  
  -- Location
  break_start_latitude: numeric
  break_start_longitude: numeric
  
  -- Schedule Compliance
  schedule_id: uuid (FK -> attendance_break_schedules.id)
  was_on_time: boolean
  minutes_late: integer
  
  -- Timestamps
  created_at: timestamp with time zone
  updated_at: timestamp with time zone
}
```

#### `attendance_break_schedules` - Scheduled Break Windows
```sql
attendance_break_schedules {
  id: uuid (PK)
  break_name: text
  break_type: text ['short_break' | 'lunch']
  scheduled_start_time: time
  scheduled_end_time: time
  duration_minutes: integer
  is_mandatory: boolean (default: false)
  notification_minutes_before: integer (default: 5)
  applies_to_departments: uuid[] (nullable)
  is_active: boolean (default: true)
  created_by: uuid
  created_at: timestamp with time zone
  updated_at: timestamp with time zone
}
```

---

## 3. Core Workflows

### 3.1 Daily Attendance Flow
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DAILY ATTENDANCE WORKFLOW                         │
└─────────────────────────────────────────────────────────────────────────┘

EMPLOYEE ARRIVES                              DURING WORK DAY
      │                                              │
      ▼                                              ▼
┌─────────────┐                              ┌─────────────────┐
│  Security   │                              │  Break Window   │
│   Checks    │                              │   (1-2 PM)      │
└──────┬──────┘                              └────────┬────────┘
       │                                              │
       ▼                                              ▼
┌─────────────┐                              ┌─────────────────┐
│  Geofence   │◄─── Within 100m ───►│  YES  │  Start Break    │
│Verification │                              │   (1/day max)   │
└──────┬──────┘                              └────────┬────────┘
       │                                              │
       ▼                                              ▼
┌─────────────┐                              ┌─────────────────┐
│  Lateness   │                              │  End Break      │
│  Detection  │                              │  (auto calc)    │
└──────┬──────┘                              └─────────────────┘
       │                                              
       ▼                                              
┌─────────────┐                              
│  Create     │                              END OF DAY
│Attendance   │                                   │
│    Log      │                                   ▼
└──────┬──────┘                              ┌─────────────────┐
       │                                     │  5:00 PM Check  │
       ▼                                     │  (work_end)     │
┌─────────────┐                              └────────┬────────┘
│  Apply      │                                       │
│ Late Charge │                         ┌────────────┴────────────┐
│ (if late)   │                         │                         │
└─────────────┘                         ▼                         ▼
                                 ┌──────────────┐        ┌──────────────┐
                                 │ Clock Out    │        │Start Overtime│
                                 │  (9h done)   │        │(if approved) │
                                 └──────┬───────┘        └──────┬───────┘
                                        │                       │
                                        ▼                       ▼
                                 ┌──────────────┐        ┌──────────────┐
                                 │  Calculate   │        │  Continue    │
                                 │ Total Hours  │        │  Tracking    │
                                 └──────────────┘        └──────────────┘
                                                                │
                               ┌────────────────────────────────┘
                               ▼
                        ┌──────────────┐
                        │  Clock Out   │
                        │  (Overtime)  │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │  Calculate   │
                        │OT Hours + Pay│
                        └──────────────┘
```

### 3.2 Location Type Transitions
```
OFFICE MODE                    FIELD MODE
     │                              │
     │   ┌──────────────────────┐   │
     │   │ TRANSITION ALLOWED   │   │
     ├──►│ Office → Field       │◄──┤
     │   │ (once per day)       │   │
     │   └──────────────────────┘   │
     │                              │
     │   ┌──────────────────────┐   │
     │   │ TRANSITION BLOCKED   │   │
     ◄───┤ Field → Office       │───►
         │ (not allowed same day)│   
         └──────────────────────┘   

RULE: Only ONE transition per day (Office → Field)
      Cannot return to Office mode after switching to Field
```

---

## 4. Clock-In Logic

### 4.1 Clock-In Algorithm
**File:** `src/hooks/attendance/useAttendanceLogs.ts`

```typescript
async function clockIn(params: ClockInParams) {
  // STEP 1: Validate user is logged in
  if (!profile?.id) {
    throw new Error('Please log in to clock in');
  }

  // STEP 2: Prevent duplicate rapid clicks
  if (isClockingIn) {
    return; // Already processing
  }

  // STEP 3: Check for existing active session today
  const existingActiveLog = await supabase
    .from('attendance_logs')
    .select('id')
    .eq('employee_id', profile.id)
    .gte('clock_in_time', `${today}T00:00:00`)
    .lte('clock_in_time', `${today}T23:59:59`)
    .is('clock_out_time', null)
    .maybeSingle();

  if (existingActiveLog) {
    throw new Error('Already clocked in - please clock out first');
  }

  // STEP 4: Enforce one-transition-only rule for office mode
  if (params.locationType === 'office') {
    const todaySessions = await fetchTodaySessions();
    
    // Block if already has an office session
    if (hasOfficeSession(todaySessions)) {
      throw new Error('Only one office session per day allowed');
    }
    
    // Block if already transitioned to field
    if (hasFieldSession(todaySessions)) {
      throw new Error('Cannot return to office after field transition');
    }
  }

  // STEP 5: Calculate lateness
  const { isLate, lateByMinutes } = calculateLateness(rules);

  // STEP 6: Create attendance log record
  const logData = {
    employee_id: profile.id,
    location_type: actualLocationType,
    clock_in_latitude: params.latitude,
    clock_in_longitude: params.longitude,
    branch_id: params.branchId,
    within_geofence_at_clock_in: params.withinGeofence,
    geofence_distance_at_clock_in: params.geofenceDistance,
    device_timestamp: new Date().toISOString(),
    is_late: isLate,
    late_by_minutes: lateByMinutes,
    is_night_shift: isNightShiftMode,
  };

  // STEP 7: Insert and notify
  await supabase.from('attendance_logs').insert(logData);
  
  // STEP 8: Play appropriate notification
  if (isLate) {
    playAttendanceNotification('clock_in_late');
  } else {
    playAttendanceNotification('clock_in_success');
  }
}
```

### 4.2 Clock-In Validation Flow
```
┌────────────────────────────────────────────────────────────────────┐
│                    CLOCK-IN VALIDATION FLOW                         │
└────────────────────────────────────────────────────────────────────┘

INPUT: locationType, latitude, longitude, branchId
                    │
                    ▼
         ┌─────────────────────┐
         │ User Authenticated? │──── NO ────► BLOCK
         └──────────┬──────────┘
                    │ YES
                    ▼
         ┌─────────────────────┐
         │ Already Clocked In? │──── YES ───► BLOCK
         └──────────┬──────────┘
                    │ NO
                    ▼
         ┌─────────────────────┐
         │ Location = OFFICE?  │──── NO ────► Go to FIELD validation
         └──────────┬──────────┘
                    │ YES
                    ▼
         ┌─────────────────────┐
         │ Within Geofence?    │──── NO ────► BLOCK: "Outside geofence"
         └──────────┬──────────┘
                    │ YES
                    ▼
         ┌─────────────────────┐
         │ Had Office Today?   │──── YES ───► BLOCK: "1 office/day"
         └──────────┬──────────┘
                    │ NO
                    ▼
         ┌─────────────────────┐
         │ Had Field Today?    │──── YES ───► BLOCK: "Can't return"
         └──────────┬──────────┘
                    │ NO
                    ▼
         ┌─────────────────────┐
         │ Security Checks     │──── FAIL ──► BLOCK: "Security alert"
         └──────────┬──────────┘
                    │ PASS
                    ▼
         ┌─────────────────────┐
         │ Calculate Lateness  │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │ CREATE LOG + CHARGE │
         │ (if late)           │
         └─────────────────────┘
```

---

## 5. Clock-Out Logic

### 5.1 Clock-Out Algorithm
**File:** `src/hooks/attendance/useAttendanceLogs.ts`

```typescript
async function clockOut(
  latitude?: number,
  longitude?: number,
  withinGeofence?: boolean,
  isEarlyClosure: boolean = false
) {
  // STEP 1: Validate active session exists
  if (!todayLog) {
    throw new Error('No active clock-in found');
  }

  // STEP 2: Calculate total hours worked
  const clockOutTime = new Date();
  const clockInTime = new Date(todayLog.clock_in_time);
  const diffMs = clockOutTime.getTime() - clockInTime.getTime();
  const totalHours = diffMs / (1000 * 60 * 60);

  // STEP 3: Check overtime approval status
  const logData = await fetchLogDetails(todayLog.id);

  // STEP 4: Calculate overtime hours (if approved)
  let overtimeHours = 0;
  let overtimeAmount = 0;

  if (logData.overtime_approved && logData.overtime_start_time) {
    // Calculate from overtime start time
    const overtimeStartTime = new Date(logData.overtime_start_time);
    const overtimeMs = clockOutTime.getTime() - overtimeStartTime.getTime();
    overtimeHours = Math.max(0, overtimeMs / (1000 * 60 * 60));
  } else if (logData.is_night_shift && rules.work_start_time) {
    // Night shift overtime: hours after day shift starts
    const [workStartH, workStartM] = rules.work_start_time.split(':').map(Number);
    const dayShiftStart = new Date(clockOutTime);
    dayShiftStart.setHours(workStartH, workStartM, 0, 0);
    
    if (clockOutTime > dayShiftStart) {
      overtimeHours = (clockOutTime.getTime() - dayShiftStart.getTime()) / (1000 * 60 * 60);
    }
  }

  // STEP 5: Calculate overtime pay using position-based rates
  if (overtimeHours > 0 && employeeProfile.position) {
    const dayType = getDayType(clockOutTime); // 'weekday' | 'saturday' | 'sunday'
    
    const overtimeRate = await supabase
      .from('overtime_rates')
      .select('rate_amount')
      .eq('position_name', employeeProfile.position)
      .eq('day_type', dayType)
      .single();

    overtimeAmount = overtimeHours * overtimeRate.rate_amount;
  }

  // STEP 6: Detect night shift
  const { isNightShift, nightShiftHours } = detectNightShift(clockInTime, totalHours, rules);

  // STEP 7: Update attendance log
  await supabase.from('attendance_logs').update({
    clock_out_time: clockOutTime.toISOString(),
    clock_out_latitude: latitude,
    clock_out_longitude: longitude,
    within_geofence_at_clock_out: withinGeofence,
    total_hours: Number(totalHours.toFixed(2)),
    overtime_hours: Number(overtimeHours.toFixed(2)),
    overtime_amount: Number(overtimeAmount.toFixed(2)),
    is_night_shift: isNightShift,
    night_shift_hours: Number(nightShiftHours.toFixed(2)),
    early_closure: isEarlyClosure,
  }).eq('id', todayLog.id);

  // STEP 8: Create early closure charge if applicable
  if (isEarlyClosure && rules.early_closure_charge_amount) {
    await supabase.from('attendance_charges').insert({
      employee_id: profile.id,
      attendance_log_id: todayLog.id,
      charge_type: 'early_closure',
      charge_amount: rules.early_closure_charge_amount,
      charge_date: new Date().toISOString().split('T')[0],
      status: 'pending'
    });
  }

  // STEP 9: Notify
  playAttendanceNotification('clock_out_success');
}
```

### 5.2 Early Closure Detection
```typescript
function checkEarlyClosureCondition(): {
  isEarly: boolean;
  hoursWorked: number;
  requiredHours: number;
  chargeAmount: number;
} {
  // Parse work times from rules
  const workStartTime = activeRule.work_start_time || '08:00';
  const workEndTime = activeRule.work_end_time || '17:00';
  
  const [startH, startM] = workStartTime.split(':').map(Number);
  const [endH, endM] = workEndTime.split(':').map(Number);
  
  // Calculate required hours (e.g., 8:00 to 17:00 = 9 hours)
  const requiredHours = (endH * 60 + endM - startH * 60 - startM) / 60;
  
  // Calculate hours actually worked
  const clockInTime = new Date(todayLog.clock_in_time);
  const now = new Date();
  const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
  
  // Check if current time is before work end time
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const endMinutes = endH * 60 + endM;
  
  const isBeforeEndTime = currentMinutes < endMinutes;
  const hasNotCompletedHours = hoursWorked < requiredHours;
  
  return {
    isEarly: isBeforeEndTime && hasNotCompletedHours,
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    requiredHours,
    chargeAmount: activeRule.early_closure_charge_amount || 750
  };
}
```

---

## 6. Lateness Detection Algorithm

### 6.1 Core Lateness Calculation
**File:** `src/hooks/attendance/useAttendanceLogs.ts`

```typescript
function calculateLateness(rules: AttendanceRule): {
  isLate: boolean;
  lateByMinutes: number;
} {
  if (!rules?.work_start_time) {
    return { isLate: false, lateByMinutes: 0 };
  }

  const now = new Date();
  
  // Parse work start time (e.g., "08:00")
  const [workStartHour, workStartMin] = rules.work_start_time.split(':').map(Number);
  
  // Create work start time for today in local time
  const workStartTime = new Date(now);
  workStartTime.setHours(workStartHour, workStartMin, 0, 0);
  
  // Apply grace period (default: 5 minutes)
  const gracePeriod = rules.grace_period_minutes || 5;
  const lateDeadline = new Date(workStartTime.getTime() + gracePeriod * 60 * 1000);
  
  // Determine if late
  if (now > lateDeadline) {
    const lateByMinutes = Math.round((now.getTime() - workStartTime.getTime()) / (60 * 1000));
    return { isLate: true, lateByMinutes };
  }
  
  return { isLate: false, lateByMinutes: 0 };
}
```

### 6.2 Lateness Timeline Visualization
```
                WORK START (08:00)
                       │
                       ▼
═══════════════════════╪═══════════════════════════════════════
        ON TIME        │    GRACE PERIOD     │     LATE
      (before 08:00)   │   (08:00 - 08:05)   │  (after 08:05)
═══════════════════════╪═════════════════════╪═════════════════
                       │                     │
                       │     No charge       │  Charge applies
                       │                     │
                       ▼                     ▼
                    08:00                  08:05
                    
FORMULA:
  late_deadline = work_start_time + grace_period_minutes
  
  if (current_time > late_deadline) {
    is_late = true
    late_by_minutes = (current_time - work_start_time) / 60000
  }
```

### 6.3 Lateness Charge Creation
**Triggered:** Automatically during clock-in when `is_late = true`

```typescript
// In calculate-daily-charges edge function
if (isLate && lateByMinutes > gracePeriod) {
  await supabase.from('attendance_charges').insert({
    employee_id: employeeId,
    attendance_log_id: logId,
    charge_type: 'late_arrival',
    charge_amount: rules.late_charge_amount * escalationMultiplier,
    charge_date: today,
    status: 'pending',
    is_escalated: escalationMultiplier > 1,
    escalation_multiplier: escalationMultiplier
  });
}
```

---

## 7. Break Management System

### 7.1 Break Rules
| Rule | Description |
|------|-------------|
| One break per day | Each employee gets exactly 1 break per day |
| Scheduled windows | Breaks can only be taken during configured windows |
| Location tracked | GPS coordinates captured at break start |
| Duration calculated | Automatically calculated when break ends |

### 7.2 Start Break Algorithm
**File:** `src/hooks/attendance/useBreaks.ts`

```typescript
async function startBreak(breakType: string = 'short_break') {
  // STEP 1: Validate prerequisites
  if (!profile?.id || !attendanceLogId) {
    throw new Error('Please clock in first');
  }

  if (activeBreak) {
    throw new Error('Please end your current break first');
  }

  // STEP 2: Enforce one-break-per-day rule
  const existingBreaks = await supabase
    .from('attendance_breaks')
    .select('id')
    .eq('employee_id', profile.id)
    .gte('break_start', `${today}T00:00:00`)
    .lte('break_start', `${today}T23:59:59`);

  if (existingBreaks.length > 0) {
    throw new Error('Only one break per day allowed');
  }

  // STEP 3: Validate break is within scheduled window
  const schedules = await supabase
    .from('attendance_break_schedules')
    .select('*')
    .eq('is_active', true)
    .eq('break_type', breakType);

  if (schedules.length > 0) {
    const currentMinutes = currentHours * 60 + currentMinutes;
    
    const isWithinSchedule = schedules.some(schedule => {
      const startMinutes = parseTime(schedule.scheduled_start_time);
      const endMinutes = parseTime(schedule.scheduled_end_time);
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    });

    if (!isWithinSchedule) {
      throw new Error(`Break only available ${schedules[0].scheduled_start_time} - ${schedules[0].scheduled_end_time}`);
    }
  }

  // STEP 4: Capture location
  const { latitude, longitude } = await getCurrentPosition();

  // STEP 5: Create break record
  await supabase.from('attendance_breaks').insert({
    employee_id: profile.id,
    attendance_log_id: attendanceLogId,
    break_type: breakType,
    break_start_latitude: latitude,
    break_start_longitude: longitude,
  });

  // STEP 6: Notify
  playAttendanceNotification('break_started');
}
```

### 7.3 End Break Algorithm
```typescript
async function endBreak() {
  // Calculate duration
  const breakEndTime = new Date();
  const breakStartTime = new Date(activeBreak.break_start);
  const durationMs = breakEndTime.getTime() - breakStartTime.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));

  // Update record
  await supabase.from('attendance_breaks').update({
    break_end: breakEndTime.toISOString(),
    break_duration_minutes: durationMinutes,
  }).eq('id', activeBreak.id);

  // Notify
  playAttendanceNotification('break_ended');
}
```

### 7.4 Break Schedule Configuration
```sql
-- Example break schedule
INSERT INTO attendance_break_schedules (
  break_name,
  break_type,
  scheduled_start_time,
  scheduled_end_time,
  duration_minutes,
  is_mandatory,
  notification_minutes_before
) VALUES (
  'Lunch Break',
  'lunch',
  '13:00',
  '14:00',
  60,
  true,
  5
);
```

---

## 8. Overtime Calculation Engine

### 8.1 Overtime Eligibility Rules
| Rule | Condition |
|------|-----------|
| Shift completion | Must complete 9-hour shift first |
| Approval required | `overtime_approved = true` before hours count |
| Start time tracked | `overtime_start_time` records when OT begins |
| Position-based rates | Different rates per job title and day type |

### 8.2 Overtime Calculation Formula
**File:** `src/hooks/attendance/useAttendanceLogs.ts`

```typescript
// FORMULA: Overtime Hours Calculation

// For approved overtime (day shift):
overtime_hours = (clock_out_time - overtime_start_time) / 3600000  // ms to hours

// For night shift employees crossing into day shift:
if (is_night_shift && clock_out_time > day_shift_start) {
  overtime_hours = (clock_out_time - day_shift_start) / 3600000
}

// FORMULA: Overtime Pay Calculation
overtime_amount = overtime_hours × position_hourly_rate

// Where position_hourly_rate comes from overtime_rates table
// based on: position_name + day_type (weekday/saturday/sunday)
```

### 8.3 Position-Based Overtime Rates
**File:** `src/hooks/attendance/useOvertimeRates.ts`

```typescript
interface OvertimeRate {
  id: string;
  position_name: string;           // e.g., "Manager", "Optometrist"
  day_type: 'weekday' | 'saturday' | 'sunday';
  rate_amount: number;             // Hourly rate in Naira
}

// Example rates table:
// | Position     | Weekday | Saturday | Sunday |
// |--------------|---------|----------|--------|
// | Manager      | ₦1,500  | ₦2,000   | ₦2,500 |
// | Optometrist  | ₦1,200  | ₦1,600   | ₦2,000 |
// | Sales Rep    | ₦800    | ₦1,000   | ₦1,200 |

function getRateForPosition(position: string, date: Date): number {
  const dayOfWeek = date.getDay();
  let dayType: 'weekday' | 'saturday' | 'sunday';
  
  if (dayOfWeek === 0) {
    dayType = 'sunday';
  } else if (dayOfWeek === 6) {
    dayType = 'saturday';
  } else {
    dayType = 'weekday';
  }

  const rate = rates.find(
    r => r.position_name.toLowerCase() === position.toLowerCase() 
      && r.day_type === dayType
  );

  return rate?.rate_amount || 0;
}
```

### 8.4 Starting Overtime Flow
```typescript
async function handleStartOvertime() {
  // STEP 1: Validate shift completion
  const shiftCheck = hasCompletedShiftHours();
  if (!shiftCheck.completed) {
    throw new Error(`Must complete ${shiftCheck.requiredHours}-hour shift first`);
  }
  
  // STEP 2: Record overtime start
  await supabase.from('attendance_logs').update({
    overtime_prompted_at: new Date().toISOString(),
    overtime_approved: true,
    overtime_approved_at: new Date().toISOString(),
    overtime_start_time: new Date().toISOString(),
  }).eq('id', todayLog.id);

  toast.success('Overtime tracking started');
}

// Shift completion check
function hasCompletedShiftHours(): { completed: boolean; hoursWorked: number; requiredHours: number } {
  const clockInTime = new Date(todayLog.clock_in_time);
  const now = new Date();
  const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
  
  // Both day shift and night shift require 9 hours
  const requiredHours = 9;
  
  return {
    completed: hoursWorked >= requiredHours,
    hoursWorked: Math.round(hoursWorked * 100) / 100,
    requiredHours
  };
}
```

---

## 9. Night Shift Detection & Handling

### 9.1 Night Shift Window Configuration
```sql
-- Default night shift configuration in attendance_rules
night_shift_start_time: '22:00'  -- 10:00 PM
night_shift_end_time: '06:00'    -- 6:00 AM (next day)
night_shift_rate: 1.2            -- 20% premium multiplier
```

### 9.2 Night Shift Detection Algorithm
**File:** `src/hooks/attendance/useAttendanceLogs.ts`

```typescript
function detectNightShift(
  clockInTime: Date,
  totalHours: number,
  rules: AttendanceRule
): { isNightShift: boolean; nightShiftHours: number } {
  
  // Parse night shift window
  const nightStart = rules.night_shift_start_time || '22:00';
  const nightEnd = rules.night_shift_end_time || '06:00';
  
  const [nightStartH, nightStartM] = nightStart.split(':').map(Number);
  const [nightEndH, nightEndM] = nightEnd.split(':').map(Number);

  const clockInHour = clockInTime.getHours();
  const clockInMinute = clockInTime.getMinutes();
  const clockInMinutes = clockInHour * 60 + clockInMinute;
  
  const nightStartMinutes = nightStartH * 60 + nightStartM;
  const nightEndMinutes = nightEndH * 60 + nightEndM;

  let isNightShift = false;

  // Handle night shift window that spans midnight
  if (nightStartMinutes > nightEndMinutes) {
    // e.g., 22:00 to 06:00 (spans midnight)
    isNightShift = clockInMinutes >= nightStartMinutes || clockInMinutes <= nightEndMinutes;
  } else {
    // e.g., 00:00 to 08:00 (same day)
    isNightShift = clockInMinutes >= nightStartMinutes && clockInMinutes <= nightEndMinutes;
  }

  // Calculate night shift hours (simplified)
  const nightShiftHours = isNightShift ? Math.min(totalHours, 8) : 0;

  return { isNightShift, nightShiftHours };
}
```

### 9.3 Night Shift Timeline
```
           22:00                    06:00                    08:00
              │                        │                        │
══════════════╪════════════════════════╪════════════════════════╪═══════
  DAY SHIFT   │      NIGHT SHIFT       │     GRACE PERIOD       │  DAY
 (ends 22:00) │    (22:00 - 06:00)     │    (06:00 - 08:00)     │ SHIFT
══════════════╪════════════════════════╪════════════════════════╪═══════

Night Shift Employee Timeline:
┌─────────────────────────────────────────────────────────────────────┐
│ 22:00  Clock In (Night Shift)                                       │
│        ↓                                                            │
│        [Regular night shift hours: 22:00 - 06:00 = 8 hours]        │
│        ↓                                                            │
│ 06:00  End of night shift window                                    │
│        ↓                                                            │
│        [OVERTIME starts if still working: 06:00+]                   │
│        ↓                                                            │
│ 08:00  Day shift starts - overtime definitely applies               │
│        ↓                                                            │
│ Clock Out → Calculate: night_shift_hours + overtime_hours           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10. Geofencing System

### 10.1 Geofence Configuration
```sql
-- Each branch has a circular geofence
attendance_branches {
  latitude: 6.5244       -- Branch coordinates
  longitude: 3.3792
  geofence_radius: 100   -- 100 meters default
}
```

### 10.2 Distance Calculation (Haversine Formula)
**File:** `src/components/attendance/ClockInOutCard.tsx`

```typescript
/**
 * Haversine formula to calculate distance between two GPS coordinates
 * @returns Distance in meters
 */
function calculateDistance(
  lat1: number, lon1: number,  // User's position
  lat2: number, lon2: number   // Branch position
): number {
  const R = 6371e3; // Earth's radius in meters
  
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Geofence check
function isWithinGeofence(
  userLat: number, userLon: number,
  branchLat: number, branchLon: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(userLat, userLon, branchLat, branchLon);
  return distance <= radiusMeters;
}
```

### 10.3 Multi-Branch Geofence Check
```typescript
// Check all active branches
const branchDistances = activeBranches.map(branch => {
  if (!latitude || !longitude) {
    return { branch, distance: null, withinGeofence: false };
  }
  
  const distance = calculateDistance(latitude, longitude, branch.latitude, branch.longitude);
  const withinGeofence = distance <= branch.geofence_radius;
  
  return { branch, distance, withinGeofence };
});

// Find which branch user is within (if any)
const currentBranch = branchDistances.find(bd => bd.withinGeofence)?.branch;
const isWithinAnyGeofence = !!currentBranch;
```

### 10.4 Geofence Enforcement Rules
| Action | Office Mode | Field Mode |
|--------|-------------|------------|
| Clock In | Must be within geofence | No geofence required |
| Clock Out | Must be within geofence | No geofence required |
| Break Start | Location recorded | Location recorded |

### 10.5 Geofence Alert System
**File:** `src/components/attendance/GeofenceMonitor.tsx`

```typescript
// Logged when user enters/exits geofence
interface GeofenceAlert {
  employee_id: string;
  branch_id: string;
  alert_type: 'entry' | 'exit';
  latitude: number;
  longitude: number;
  distance_from_branch: number;
  alert_time: timestamp;
  acknowledged: boolean;
}

// Background monitoring
async function checkGeofence(currentLat: number, currentLon: number) {
  for (const branch of branches) {
    const distance = calculateDistance(currentLat, currentLon, branch.latitude, branch.longitude);
    const isInside = distance <= branch.geofence_radius;
    
    const previousStatus = monitoringStatus[branch.id];
    
    if (isInside && !previousStatus.isInside) {
      // User ENTERED geofence
      await logGeofenceAlert(branch.id, 'entry', distance);
      showNotification(`Welcome to ${branch.name}`);
    } else if (!isInside && previousStatus.isInside) {
      // User EXITED geofence
      await logGeofenceAlert(branch.id, 'exit', distance);
      showNotification(`You have left ${branch.name}`);
    }
  }
}
```

---

## 11. Financial Charges System

### 11.1 Charge Types
| Charge Type | Default Amount | Trigger |
|-------------|----------------|---------|
| `late_arrival` | ₦500 | Clock-in after grace period |
| `absence` | ₦1,000 | No clock-in for workday |
| `early_closure` | ₦750 | Clock-out before work_end_time |

### 11.2 Charge Status Flow
```
                     ┌─────────┐
                     │ PENDING │◄─────── Initial state
                     └────┬────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  WAIVED  │    │ DISPUTED │    │ RESOLVED │
    └──────────┘    └────┬─────┘    └──────────┘
                         │
                         ▼
                   ┌──────────┐
                   │ RESOLVED │
                   └──────────┘

Status definitions:
- PENDING: Active charge, not yet processed
- WAIVED: Charge removed by HR (with reason)
- DISPUTED: Employee has contested the charge
- RESOLVED: Dispute has been reviewed and closed
```

### 11.3 Charge Creation Logic
**File:** `supabase/functions/calculate-daily-charges/index.ts`

```typescript
// Daily charge calculation (runs via cron job)
async function calculateDailyCharges(targetDate: string) {
  const employees = await fetchActiveEmployees();
  const rules = await fetchActiveRules();
  
  for (const employee of employees) {
    // Check for attendance on target date
    const attendanceLog = await fetchAttendanceForDate(employee.id, targetDate);
    
    if (!attendanceLog) {
      // ABSENCE - No clock-in record
      const multiplier = await calculateEscalationMultiplier(employee.id, 'absence');
      
      await createCharge({
        employee_id: employee.id,
        charge_type: 'absence',
        charge_amount: rules.absence_charge_amount * multiplier,
        charge_date: targetDate,
        is_escalated: multiplier > 1,
        escalation_multiplier: multiplier
      });
      
    } else if (attendanceLog.is_late && attendanceLog.late_by_minutes > rules.grace_period_minutes) {
      // LATE ARRIVAL
      const multiplier = await calculateEscalationMultiplier(employee.id, 'late_arrival');
      
      await createCharge({
        employee_id: employee.id,
        attendance_log_id: attendanceLog.id,
        charge_type: 'late_arrival',
        charge_amount: rules.late_charge_amount * multiplier,
        charge_date: targetDate,
        is_escalated: multiplier > 1,
        escalation_multiplier: multiplier
      });
    }
  }
}
```

### 11.4 Charge Management Interface
**File:** `src/components/attendance/ChargesManagement.tsx`

```typescript
// HR actions available:
interface ChargeActions {
  // Waive a charge (remove it with reason)
  waive: (chargeId: string, reason: string) => Promise<void>;
  
  // Resolve a dispute
  resolve: (chargeId: string, resolution: string) => Promise<void>;
  
  // Delete a charge (admin only)
  delete: (chargeId: string) => Promise<void>;
  
  // Export monthly report
  exportMonthly: (month: string, year: number) => Promise<Blob>;
}

// Statistics calculation
const stats = {
  total: charges.length,
  pending: charges.filter(c => c.status === 'pending').length,
  waived: charges.filter(c => c.status === 'waived').length,
  disputed: charges.filter(c => c.dispute_reason && !c.dispute_resolution).length,
  totalAmount: charges
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + Number(c.charge_amount), 0),
};
```

---

## 12. Escalation Rules Engine

### 12.1 Escalation Concept
Repeated violations within a lookback period result in escalated (higher) charges.

```
FIRST OFFENSE    →    Base charge (₦500)
      │
      ▼
SECOND OFFENSE   →    1.5× multiplier (₦750)
(within 30 days)
      │
      ▼
THIRD OFFENSE    →    2.0× multiplier (₦1,000)
(within 30 days)
      │
      ▼
FOURTH+ OFFENSE  →    3.0× multiplier (₦1,500)
(within 30 days)
```

### 12.2 Escalation Rule Configuration
**File:** `src/hooks/attendance/useEscalationRules.ts`

```typescript
interface EscalationRule {
  id: string;
  name: string;
  violation_type: 'late_arrival' | 'absence' | 'early_closure';
  lookback_days: number;  // e.g., 30 days
  escalation_tiers: {
    count: number;        // Number of violations
    multiplier: number;   // Charge multiplier
  }[];
  is_active: boolean;
}

// Example rule:
const lateArrivalEscalation: EscalationRule = {
  id: 'rule-1',
  name: 'Late Arrival Escalation',
  violation_type: 'late_arrival',
  lookback_days: 30,
  escalation_tiers: [
    { count: 1, multiplier: 1.0 },   // 1st offense: 1×
    { count: 2, multiplier: 1.5 },   // 2nd offense: 1.5×
    { count: 3, multiplier: 2.0 },   // 3rd offense: 2×
    { count: 4, multiplier: 3.0 },   // 4th+ offense: 3×
  ],
  is_active: true
};
```

### 12.3 Escalation Multiplier Calculation
```typescript
async function calculateEscalationMultiplier(
  employeeId: string,
  violationType: string
): Promise<number> {
  // Find applicable rule
  const rule = rules.find(
    r => r.violation_type === violationType && r.is_active
  );
  
  if (!rule) return 1.0;

  // Count recent violations within lookback period
  const lookbackStart = new Date();
  lookbackStart.setDate(lookbackStart.getDate() - rule.lookback_days);
  
  const recentCharges = await supabase
    .from('attendance_charges')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('charge_type', violationType)
    .gte('charge_date', lookbackStart.toISOString().split('T')[0]);

  const violationCount = recentCharges.length + 1; // +1 for current

  // Find applicable tier
  const applicableTier = rule.escalation_tiers
    .filter(tier => tier.count <= violationCount)
    .sort((a, b) => b.count - a.count)[0];

  return applicableTier?.multiplier || 1.0;
}
```

---

## 13. Auto Clock-Out System

### 13.1 Auto Clock-Out Logic
**File:** `supabase/functions/auto-clockout-handler/index.ts`

```typescript
// Runs at closing time (e.g., 5:01 PM)
async function autoClockoutHandler() {
  // Fetch active attendance rules
  const rules = await supabase
    .from('attendance_rules')
    .select('work_end_time, early_closure_charge_amount')
    .eq('is_active', true)
    .single();

  const closingTime = parseTime(rules.work_end_time); // e.g., 17:00
  const autoClockoutTime = closingTime + 1 minute;     // e.g., 17:01
  
  const now = new Date();

  // AT CLOSING TIME: Send reminder
  if (isClosingTime(now, closingTime)) {
    const activeSessions = await findActiveOfficeSessions();
    
    for (const session of activeSessions) {
      await sendNotification(session.employee_id, {
        type: 'clock_out_reminder',
        message: 'Office is closing. Please clock out now.'
      });
    }
  }

  // ONE MINUTE AFTER CLOSING: Auto clock-out
  if (isAutoClockoutTime(now, autoClockoutTime)) {
    const activeSessions = await supabase
      .from('attendance_logs')
      .select('*')
      .is('clock_out_time', null)
      .eq('location_type', 'office')
      .eq('overtime_approved', false)
      .eq('early_closure', false);

    for (const session of activeSessions) {
      // Calculate hours worked
      const clockInTime = new Date(session.clock_in_time);
      const totalHours = (closingTime - clockInTime) / (1000 * 60 * 60);

      // Auto clock-out at closing time (not current time)
      await supabase.from('attendance_logs').update({
        clock_out_time: closingTime.toISOString(),
        total_hours: Number(totalHours.toFixed(2)),
        early_closure: true,
        auto_clocked_out: true,
      }).eq('id', session.id);

      // Create early closure charge
      await supabase.from('attendance_charges').insert({
        employee_id: session.employee_id,
        attendance_log_id: session.id,
        charge_type: 'early_closure',
        charge_amount: rules.early_closure_charge_amount,
        charge_date: new Date().toISOString().split('T')[0],
        status: 'pending'
      });

      // Notify employee
      await sendNotification(session.employee_id, {
        type: 'auto_clock_out',
        message: 'You have been auto-clocked out. Early closure charge applied.'
      });
    }
  }
}
```

### 13.2 Auto Clock-Out Timeline
```
                   5:00 PM                          5:01 PM
                      │                                │
══════════════════════╪════════════════════════════════╪════════════════
                      │                                │
                      ▼                                ▼
              ┌──────────────┐                ┌──────────────────┐
              │ REMINDER     │                │ AUTO CLOCK-OUT   │
              │ NOTIFICATIONS│                │ + CHARGE         │
              └──────────────┘                └──────────────────┘
                      │                                │
                      │                                │
              Employees who:                   Employees who:
              - Still clocked in               - Still clocked in
              - Office location                - No overtime approved
              - Not on overtime                - Not already early_closure

EXCEPTIONS (no auto clock-out):
  ✓ Overtime approved employees
  ✓ Field work employees
  ✓ Night shift employees
  ✓ Already clocked out
```

---

## 14. Field Work Tracking

### 14.1 Field Trip Data Model
```sql
field_trips {
  id: uuid (PK)
  employee_id: uuid (FK -> profiles.id)
  
  -- Trip Details
  purpose: text
  destination_address: text
  vehicle_used: text
  vehicle_registration: text
  funds_allocated: numeric
  notes: text
  
  -- Timing
  start_time: timestamp with time zone
  expected_end_time: timestamp with time zone
  actual_end_time: timestamp with time zone (nullable)
  
  -- Location Tracking
  start_location_lat: numeric
  start_location_lng: numeric
  end_location_lat: numeric
  end_location_lng: numeric
  total_distance_km: numeric
  
  -- Status
  status: text ['active' | 'completed' | 'cancelled']
  
  -- Timestamps
  created_at: timestamp with time zone
  updated_at: timestamp with time zone
}
```

### 14.2 Location Points Tracking
```sql
location_points {
  id: uuid (PK)
  trip_id: uuid (FK -> field_trips.id)
  
  -- Position
  latitude: numeric
  longitude: numeric
  accuracy_meters: numeric
  speed_kmh: numeric
  
  -- Device Info
  battery_level: numeric
  network_type: text
  
  -- Timing
  timestamp: timestamp with time zone
  created_at: timestamp with time zone
}
```

### 14.3 Office to Field Transition
**File:** `src/components/attendance/ClockInOutCard.tsx`

```typescript
async function handleFieldTransition() {
  // STEP 1: Validate field work reason and location
  if (!fieldReason.trim() || !fieldLocation.trim()) {
    throw new Error('Please provide location and reason');
  }

  // STEP 2: Close office session (NOT early closure)
  const clockOutTime = new Date();
  const clockInTime = new Date(todayLog.clock_in_time);
  const totalHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

  await supabase.from('attendance_logs').update({
    clock_out_time: clockOutTime.toISOString(),
    clock_out_latitude: latitude,
    clock_out_longitude: longitude,
    within_geofence_at_clock_out: isWithinGeofence,
    total_hours: Number(totalHours.toFixed(2)),
    early_closure: false,  // Explicitly NOT early closure
  }).eq('id', todayLog.id);

  // STEP 3: Start field work session
  await clockIn({
    locationType: 'field',
    latitude,
    longitude,
    fieldWorkReason: fieldReason,
    fieldWorkLocation: fieldLocation,
  });

  toast.success('Transitioned to field work successfully');
}
```

---

## 15. Security Features

### 15.1 Device Fingerprinting
**File:** `src/utils/deviceFingerprinting.ts`

```typescript
interface DeviceFingerprint {
  id: string;                 // Hashed unique identifier
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screenResolution: string;
  colorDepth: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  touchSupport: boolean;
}

// Generate fingerprint from browser characteristics
async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
  const fingerprint = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${screen.width}x${screen.height}`,
    colorDepth: screen.colorDepth,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory || 0,
    touchSupport: 'ontouchstart' in window,
  };
  
  fingerprint.id = await hashFingerprint(fingerprint);
  return fingerprint;
}

// Compare current device with stored fingerprint
async function compareDeviceFingerprint(): Promise<{
  isMatch: boolean;
  similarityScore: number;
  changes: string[];
}> {
  const current = await generateDeviceFingerprint();
  const stored = getStoredDeviceFingerprint();
  
  if (!stored) {
    return { isMatch: false, similarityScore: 0, changes: [] };
  }
  
  const changes: string[] = [];
  let matches = 0;
  const totalChecks = 8;
  
  if (current.userAgent === stored.userAgent) matches++;
  else changes.push('Browser changed');
  
  if (current.platform === stored.platform) matches++;
  else changes.push('Platform changed');
  
  // ... additional checks
  
  const similarityScore = (matches / totalChecks) * 100;
  
  return {
    isMatch: similarityScore >= 80,
    similarityScore,
    changes
  };
}
```

### 15.2 Location Spoofing Detection
**File:** `src/utils/locationSpoofingDetection.ts`

```typescript
interface LocationCheck {
  isSuspicious: boolean;
  suspicionReasons: string[];
  confidenceScore: number;  // 0-100
  warnings: string[];
}

async function detectLocationSpoofing(
  latitude: number,
  longitude: number,
  accuracy: number,
  altitude?: number,
  speed?: number
): Promise<LocationCheck> {
  const suspicionReasons: string[] = [];
  const warnings: string[] = [];
  let confidenceScore = 100;

  // CHECK 1: Unrealistic accuracy
  // Real GPS typically has 5-50m accuracy
  if (accuracy < 1) {
    suspicionReasons.push('Impossibly precise location');
    confidenceScore -= 40;
  }

  // CHECK 2: Rapid location jump
  const history = getLocationHistory();
  if (history.length > 0) {
    const lastLocation = history[history.length - 1];
    const timeDiff = Date.now() - lastLocation.timestamp;
    const distance = calculateDistance(
      lastLocation.latitude, lastLocation.longitude,
      latitude, longitude
    );
    
    // Calculate implied speed (km/h)
    const impliedSpeed = (distance / 1000) / (timeDiff / 3600000);
    
    // Max realistic speed: 200 km/h
    if (impliedSpeed > 200) {
      suspicionReasons.push('Impossible travel speed detected');
      confidenceScore -= 50;
    }
  }

  // CHECK 3: Mock Location API detection
  const mockDetection = await detectMockLocationAPI();
  if (mockDetection.isDetected) {
    suspicionReasons.push('Mock location app detected');
    confidenceScore -= 60;
  }

  // CHECK 4: Pattern analysis
  const patternAnalysis = analyzeLocationPattern(history, latitude, longitude);
  if (patternAnalysis.isAnomalous) {
    warnings.push(patternAnalysis.reason);
    confidenceScore -= patternAnalysis.severity * 10;
  }

  // Store this location for future checks
  storeLocationHistory({
    latitude, longitude, timestamp: Date.now(), accuracy, altitude, speed
  });

  return {
    isSuspicious: confidenceScore < 50,
    suspicionReasons,
    confidenceScore: Math.max(0, confidenceScore),
    warnings
  };
}
```

### 15.3 Security Check Flow
```typescript
async function performSecurityChecks(): Promise<{
  passed: boolean;
  warnings: string[];
}> {
  const warnings: string[] = [];
  
  // Device fingerprint check
  const fingerprint = await generateDeviceFingerprint();
  const deviceComparison = await compareDeviceFingerprint();
  
  if (!deviceComparison.isMatch && deviceComparison.similarityScore < 50) {
    warnings.push('Different device detected');
  }
  
  if (deviceComparison.similarityScore === 0) {
    // First time - store fingerprint
    storeDeviceFingerprint(fingerprint);
  }

  // Location spoofing check
  if (latitude && longitude) {
    const locationCheck = await detectLocationSpoofing(latitude, longitude, 10);

    if (locationCheck.isSuspicious) {
      warnings.push('Suspicious location detected');
      
      // Block if confidence too low
      if (locationCheck.confidenceScore < 40) {
        return { passed: false, warnings };
      }
    }
  }

  return { passed: true, warnings };
}
```

---

## 16. Offline Sync System

### 16.1 Sync Queue Data Model
```sql
attendance_sync_queue {
  id: uuid (PK)
  employee_id: uuid (FK -> profiles.id)
  
  -- Operation Details
  operation_type: text ['clock_in' | 'clock_out' | 'break_start' | 'break_end']
  payload: jsonb
  device_timestamp: timestamp with time zone
  
  -- Sync Status
  sync_status: text ['pending' | 'synced' | 'failed']
  sync_attempts: integer (default: 0)
  last_sync_attempt: timestamp with time zone
  sync_error: text
  synced_at: timestamp with time zone
  
  -- Metadata
  created_offline: boolean (default: false)
  created_at: timestamp with time zone
}
```

### 16.2 Offline Operation Flow
**File:** `src/hooks/attendance/useSyncQueue.ts`

```typescript
// When offline: queue the operation
async function queueOfflineOperation(
  operationType: string,
  payload: any
) {
  const queueEntry = {
    employee_id: profile.id,
    operation_type: operationType,
    payload: JSON.stringify(payload),
    device_timestamp: new Date().toISOString(),
    sync_status: 'pending',
    created_offline: true
  };
  
  // Store in IndexedDB for persistence
  await localDB.syncQueue.add(queueEntry);
  
  // Also store in Supabase (will sync when online)
  if (navigator.onLine) {
    await supabase.from('attendance_sync_queue').insert(queueEntry);
  }
}

// When back online: process queue
async function processSyncQueue() {
  const pendingItems = await localDB.syncQueue
    .where('sync_status')
    .equals('pending')
    .toArray();
  
  for (const item of pendingItems) {
    try {
      // Execute the queued operation
      await executeQueuedOperation(item);
      
      // Mark as synced
      await localDB.syncQueue.update(item.id, {
        sync_status: 'synced',
        synced_at: new Date().toISOString()
      });
    } catch (error) {
      // Increment retry count
      await localDB.syncQueue.update(item.id, {
        sync_attempts: item.sync_attempts + 1,
        last_sync_attempt: new Date().toISOString(),
        sync_error: error.message
      });
    }
  }
}

// Listen for online event
window.addEventListener('online', () => {
  processSyncQueue();
});
```

---

## 17. Notification System

### 17.1 Notification Types
| Event Type | Voice Guide | Description |
|------------|-------------|-------------|
| `clock_in_success` | Yes | Successful on-time clock-in |
| `clock_in_late` | Yes | Late clock-in |
| `clock_out_success` | Yes | Successful clock-out |
| `break_started` | Yes | Break started |
| `break_ended` | Yes | Break ended |
| `break_not_allowed` | Yes | Break outside scheduled window |
| `geofence_entry` | Yes | Entered office geofence |
| `geofence_exit` | Yes | Left office geofence |

### 17.2 Voice Guide System
**File:** `src/utils/attendanceNotifications.ts`

```typescript
async function playAttendanceNotification(eventType: string) {
  // Fetch voice guide from database
  const { data: voiceGuide } = await supabase
    .from('voice_guides')
    .select('*')
    .eq('event_type', eventType)
    .eq('is_active', true)
    .single();

  if (voiceGuide?.audio_file_url) {
    // Get signed URL for audio file
    const { data } = await supabase.storage
      .from('alert-sounds')
      .createSignedUrl(voiceGuide.audio_file_url, 60);
    
    if (data?.signedUrl) {
      const audio = new Audio(data.signedUrl);
      audio.volume = voiceGuide.volume || 0.8;
      await audio.play();
    }
  }
}
```

### 17.3 Haptic Feedback
```typescript
// Clock-in haptic
if ('vibrate' in navigator) {
  navigator.vibrate(50);  // Single short vibration
}

// Clock-out haptic
if ('vibrate' in navigator) {
  navigator.vibrate([50, 50, 50]);  // Triple vibration pattern
}
```

---

## 18. Role-Based Access Control

### 18.1 User Roles
```sql
-- user_role enum
CREATE TYPE user_role AS ENUM ('staff', 'manager', 'hr', 'admin');
```

### 18.2 Permission Matrix
| Feature | Staff | Manager | HR | Admin |
|---------|-------|---------|-----|-------|
| Clock In/Out | ✅ Own | ✅ Own | ✅ Own | ✅ Own |
| View Own Logs | ✅ | ✅ | ✅ | ✅ |
| View Team Logs | ❌ | ✅ | ✅ | ✅ |
| View All Logs | ❌ | ❌ | ✅ | ✅ |
| Manage Charges | ❌ | ❌ | ✅ | ✅ |
| Waive Charges | ❌ | ❌ | ✅ | ✅ |
| Configure Rules | ❌ | ❌ | ✅ | ✅ |
| Manage Branches | ❌ | ❌ | ✅ | ✅ |
| View Analytics | ❌ | ✅ Team | ✅ All | ✅ All |
| Delete Data | ❌ | ❌ | ❌ | ✅ |

### 18.3 RLS Policies for attendance_logs
```sql
-- Employees can view and manage own logs
CREATE POLICY "Employees can view own attendance logs"
ON attendance_logs FOR SELECT
USING (employee_id = auth.uid());

CREATE POLICY "Employees can insert own attendance logs"
ON attendance_logs FOR INSERT
WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Employees can update own attendance logs"
ON attendance_logs FOR UPDATE
USING (employee_id = auth.uid());

-- Managers can view team logs
CREATE POLICY "Managers can view team attendance logs"
ON attendance_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = attendance_logs.employee_id
    AND profiles.line_manager_id = auth.uid()
  )
);

-- HR and Admin can manage all logs
CREATE POLICY "HR and Admin can manage all attendance logs"
ON attendance_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('hr', 'admin')
  )
);
```

---

## Appendix A: Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Clock In/Out Logic | `src/hooks/attendance/useAttendanceLogs.ts` |
| Clock In/Out UI | `src/components/attendance/ClockInOutCard.tsx` |
| Break Management | `src/hooks/attendance/useBreaks.ts` |
| Attendance Rules | `src/hooks/attendance/useAttendanceRules.ts` |
| Overtime Rates | `src/hooks/attendance/useOvertimeRates.ts` |
| Charges Management | `src/hooks/attendance/useAttendanceCharges.ts` |
| Escalation Rules | `src/hooks/attendance/useEscalationRules.ts` |
| Branch/Geofence | `src/hooks/attendance/useBranches.ts` |
| Geofence Monitor | `src/components/attendance/GeofenceMonitor.tsx` |
| Device Fingerprinting | `src/utils/deviceFingerprinting.ts` |
| Location Spoofing | `src/utils/locationSpoofingDetection.ts` |
| Notifications | `src/utils/attendanceNotifications.ts` |
| Auto Clock-out | `supabase/functions/auto-clockout-handler/index.ts` |
| Daily Charges | `supabase/functions/calculate-daily-charges/index.ts` |

## Appendix B: Formula Quick Reference

```
LATENESS:
  late_deadline = work_start_time + grace_period_minutes
  is_late = current_time > late_deadline
  late_by_minutes = (current_time - work_start_time) / 60000

TOTAL HOURS:
  total_hours = (clock_out_time - clock_in_time) / 3600000

OVERTIME HOURS (Approved):
  overtime_hours = (clock_out_time - overtime_start_time) / 3600000

OVERTIME HOURS (Night Shift):
  IF clock_out_time > day_shift_start:
    overtime_hours = (clock_out_time - day_shift_start) / 3600000

OVERTIME PAY:
  overtime_amount = overtime_hours × position_hourly_rate

DISTANCE (Haversine):
  a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
  c = 2 × atan2(√a, √(1−a))
  distance = R × c  (where R = 6371km)

GEOFENCE CHECK:
  within_geofence = distance ≤ geofence_radius

ESCALATION MULTIPLIER:
  violations = COUNT(charges WHERE date > (today - lookback_days))
  multiplier = MAX(tier.multiplier WHERE tier.count ≤ violations)

EARLY CLOSURE CHECK:
  required_hours = (work_end_time - work_start_time) / 60
  is_early = current_time < work_end_time AND hours_worked < required_hours

BREAK DURATION:
  duration_minutes = (break_end - break_start) / 60000
```

---

*Document Version: 1.0*
*Last Updated: December 2024*
*System Version: Smart Attendance System v2.0*
