# Employee Appraisal System - Complete Logic Documentation

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Database Architecture](#2-database-architecture)
3. [Appraisal Workflow](#3-appraisal-workflow)
4. [Question Assignment Logic](#4-question-assignment-logic)
5. [Rating System](#5-rating-system)
6. [Performance Calculation Formulas](#6-performance-calculation-formulas)
7. [Committee Review Process](#7-committee-review-process)
8. [Role-Based Access Control](#8-role-based-access-control)
9. [Notification System](#9-notification-system)
10. [Training Integration](#10-training-integration)

---

## 1. System Overview

### 1.1 Purpose
The Employee Appraisal System manages quarterly/annual performance evaluations through a multi-stage approval workflow:
- **Employee Self-Assessment**: Employees rate themselves on assigned questions
- **Manager Review**: Line managers review and provide their own ratings
- **Committee Review**: HR/Committee finalizes scores and determines performance bands

### 1.2 Key Entities
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  APPRAISAL      │────▶│   APPRAISAL     │────▶│   APPRAISAL     │
│  CYCLES         │     │   QUESTIONS     │     │   RESPONSES     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐            │
        │               │    QUESTION     │            │
        │               │    SECTIONS     │            │
        │               └─────────────────┘            │
        │                                              │
        ▼                                              ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   APPRAISALS    │────▶│   EMPLOYEE      │◀────│   PROFILES      │
│   (Per Employee)│     │   APPRAISAL     │     │   (Users)       │
└─────────────────┘     │   QUESTIONS     │     └─────────────────┘
                        └─────────────────┘
```

---

## 2. Database Architecture

### 2.1 Core Tables

#### `appraisal_cycles`
Defines evaluation periods (e.g., Q1 2025, Annual 2025).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Cycle name (e.g., "Q1 2025 Performance Review") |
| quarter | INTEGER | Quarter number (1-4) |
| year | INTEGER | Year (e.g., 2025) |
| start_date | DATE | Cycle start date |
| end_date | DATE | Cycle end date |
| status | TEXT | 'draft', 'active', 'completed' |
| created_by | UUID | HR/Admin who created the cycle |

**Status Flow:**
```
draft → active → completed
```

#### `appraisal_question_sections`
Groups questions into logical categories.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Section name (e.g., "FINANCIAL SECTION") |
| description | TEXT | Section description |
| weight | NUMERIC | Section weight for scoring (default: 1.0) |
| max_score | INTEGER | Maximum score per question (default: 5) |
| sort_order | INTEGER | Display order |
| is_active | BOOLEAN | Whether section is active |

**Standard Sections:**
1. FINANCIAL SECTION - Financial performance metrics
2. OPERATIONAL EFFICIENCY SECTION - Operational metrics
3. BEHAVIOURAL PERFORMANCE SECTION - Soft skills and behavior
4. Noteworthy Achievements - Text-based, no rating
5. Training Needs - Text-based, no rating
6. Goals - Text-based, no rating

#### `appraisal_questions`
Individual evaluation questions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| question_text | TEXT | The question content |
| question_type | TEXT | 'rating', 'text', 'multiple_choice' |
| section_id | UUID | FK to question sections |
| cycle_id | UUID | FK to cycles (optional, for cycle-specific questions) |
| weight | NUMERIC | Question weight for scoring (default: 1.0) |
| is_required | BOOLEAN | Whether response is mandatory |
| is_active | BOOLEAN | Whether question is active |
| applies_to_departments | UUID[] | Array of department IDs (empty = all) |
| applies_to_roles | TEXT[] | Array of roles (empty = all) |
| multiple_choice_options | TEXT[] | Options for multiple choice questions |
| sort_order | INTEGER | Display order within section |

#### `appraisals`
Individual employee appraisal records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID | FK to profiles (employee being appraised) |
| cycle_id | UUID | FK to appraisal cycles |
| manager_id | UUID | FK to profiles (assigned manager) |
| status | ENUM | Current appraisal status |
| overall_score | NUMERIC | Final calculated score (0-100) |
| performance_band | TEXT | Performance classification |
| noteworthy | TEXT | Noteworthy achievements (free text) |
| training_needs | TEXT | Training requirements (free text) |
| goals | TEXT | Goals for next period (free text) |
| emp_comments | TEXT | Employee's additional comments |
| mgr_comments | TEXT | Manager's overall comments |
| committee_comments | TEXT | Committee's final comments |
| employee_submitted_at | TIMESTAMP | When employee submitted |
| manager_reviewed_at | TIMESTAMP | When manager completed review |
| committee_reviewed_at | TIMESTAMP | When committee finalized |
| completed_at | TIMESTAMP | When appraisal was fully completed |

**Status Enum Values:**
```sql
CREATE TYPE appraisal_status AS ENUM (
  'draft',           -- Employee working on it
  'submitted',       -- Submitted by employee, waiting for manager
  'manager_review',  -- Manager reviewing
  'committee_review', -- Committee/HR reviewing
  'completed'        -- Finalized
);
```

**Status Flow:**
```
draft → submitted → manager_review → committee_review → completed
        ↑                    ↓
        └────────────────────┘  (Returned for revision - optional)
```

#### `employee_appraisal_questions`
Junction table linking employees to their assigned questions per cycle.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| employee_id | UUID | FK to profiles |
| question_id | UUID | FK to appraisal_questions |
| cycle_id | UUID | FK to appraisal_cycles |
| assigned_by | UUID | FK to profiles (HR who assigned) |
| assigned_at | TIMESTAMP | Assignment timestamp |
| is_active | BOOLEAN | Whether assignment is active |
| deleted_at | TIMESTAMP | Soft delete timestamp |

#### `appraisal_responses`
Stores all ratings and comments for each question.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| appraisal_id | UUID | FK to appraisals |
| question_id | UUID | FK to appraisal_questions |
| employee_id | UUID | FK to profiles |
| cycle_id | UUID | FK to appraisal_cycles |
| emp_rating | INTEGER | Employee's self-rating (1-5) |
| emp_comment | TEXT | Employee's comment |
| mgr_rating | INTEGER | Manager's rating (1-5) |
| mgr_comment | TEXT | Manager's comment |
| committee_rating | INTEGER | Committee's rating (1-5) |
| committee_comment | TEXT | Committee's comment |
| status | TEXT | Response status |
| employee_submitted_at | TIMESTAMP | When employee submitted |
| manager_reviewed_at | TIMESTAMP | When manager reviewed |

---

## 3. Appraisal Workflow

### 3.1 Complete Workflow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        HR/ADMIN SETUP PHASE                          │
├──────────────────────────────────────────────────────────────────────┤
│  1. Create Appraisal Cycle (name, dates, quarter, year)              │
│  2. Create/Configure Question Sections                               │
│  3. Create Questions (assign to sections)                            │
│  4. Assign Questions to Employees (bulk or individual)               │
│  5. Activate Cycle (status: 'draft' → 'active')                      │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      EMPLOYEE PHASE (status: 'draft')                │
├──────────────────────────────────────────────────────────────────────┤
│  1. Employee accesses "My Appraisals" page                           │
│  2. System auto-creates appraisal record if none exists              │
│  3. Employee rates each assigned question (1-5 scale)                │
│  4. Employee adds comments for each question                         │
│  5. Employee fills in:                                               │
│     - Noteworthy Achievements                                        │
│     - Training Needs                                                 │
│     - Goals for next period                                          │
│     - Additional Comments                                            │
│  6. Employee clicks "Submit" → status: 'submitted'                   │
│  7. Notification sent to Line Manager                                │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   MANAGER PHASE (status: 'manager_review')           │
├──────────────────────────────────────────────────────────────────────┤
│  1. Manager receives notification of submission                      │
│  2. Manager accesses "Manager Appraisals" page                       │
│  3. For each question, manager sees:                                 │
│     - Question text                                                  │
│     - Employee's rating (read-only)                                  │
│     - Employee's comment (read-only)                                 │
│  4. Manager provides:                                                │
│     - Manager rating (1-5 scale)                                     │
│     - Manager comment                                                │
│  5. Manager adds overall comments                                    │
│  6. Manager clicks "Submit" → status: 'committee_review'             │
│  7. Notification sent to HR                                          │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                 COMMITTEE PHASE (status: 'committee_review')         │
├──────────────────────────────────────────────────────────────────────┤
│  1. HR/Committee accesses "Committee Review" or "HR Appraisals"      │
│  2. For each question, committee sees:                               │
│     - Question text                                                  │
│     - Employee's rating and comment (read-only)                      │
│     - Manager's rating and comment (read-only)                       │
│     - Current average score                                          │
│     - Variance indicator (low/medium/high)                           │
│  3. Committee provides:                                              │
│     - Committee rating (1-5 scale)                                   │
│     - Committee comment (optional per question)                      │
│  4. Committee reviews:                                               │
│     - Noteworthy Achievements                                        │
│     - Training Needs                                                 │
│     - Goals                                                          │
│  5. Committee can recommend training                                 │
│  6. Committee adds final comments                                    │
│  7. Committee clicks "Complete Review"                               │
│  8. System calculates final score and performance band               │
│  9. Status → 'completed'                                             │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Status Transitions

| From Status | To Status | Triggered By | Action |
|-------------|-----------|--------------|--------|
| (none) | draft | Employee starts appraisal | Creates appraisal record |
| draft | submitted | Employee submits | Sets `employee_submitted_at` |
| submitted | manager_review | Manager starts review | Automatic on access |
| manager_review | committee_review | Manager submits | Sets `manager_reviewed_at` |
| committee_review | completed | Committee finalizes | Sets `committee_reviewed_at`, calculates scores |

### 3.3 Code: Employee Submission
```typescript
// When employee submits appraisal
const submitAppraisal = async (appraisalId: string) => {
  await supabase
    .from('appraisals')
    .update({
      status: 'submitted',
      employee_submitted_at: new Date().toISOString()
    })
    .eq('id', appraisalId);
  
  // Notify line manager
  await supabase.rpc('notify_line_manager_submission', {
    appraisal_id_param: appraisalId,
    employee_id_param: employeeId
  });
};
```

### 3.4 Code: Manager Review Submission
```typescript
// When manager submits review
const submitManagerReview = async (appraisalId: string) => {
  await supabase
    .from('appraisals')
    .update({
      status: 'committee_review',
      manager_reviewed_at: new Date().toISOString(),
      manager_reviewed_by: managerId,
      mgr_comments: managerComments
    })
    .eq('id', appraisalId);
  
  // Notify HR
  await supabase.rpc('notify_hr_manager_review', {
    appraisal_id_param: appraisalId,
    manager_id_param: managerId
  });
};
```

---

## 4. Question Assignment Logic

### 4.1 Assignment Methods

#### Method 1: Auto-Assignment (Recommended)
Questions are automatically assigned based on employee's role and department.

```typescript
// src/utils/autoAssignQuestions.ts

async function autoAssignQuestionsToEmployee(employeeId: string, cycleId: string) {
  // 1. Check if employee already has questions
  const { data: existing } = await supabase
    .from('employee_appraisal_questions')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('cycle_id', cycleId)
    .eq('is_active', true);

  if (existing?.length > 0) return; // Already assigned

  // 2. Get all active questions
  const { data: questions } = await supabase
    .from('appraisal_questions')
    .select('id, applies_to_roles, applies_to_departments')
    .eq('is_active', true);

  // 3. Get employee details
  const { data: employee } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', employeeId)
    .single();

  // 4. Filter applicable questions
  const applicableQuestions = questions.filter(question => {
    const hasRoleRestrictions = question.applies_to_roles?.length > 0;
    const hasDeptRestrictions = question.applies_to_departments?.length > 0;

    // If no restrictions, applies to everyone
    if (!hasRoleRestrictions && !hasDeptRestrictions) return true;

    // Check role match
    const roleMatches = !hasRoleRestrictions || 
      question.applies_to_roles.includes(employee.role);
    
    // Check department match
    const deptMatches = !hasDeptRestrictions || 
      question.applies_to_departments.includes(employee.department_id);

    return roleMatches && deptMatches;
  });

  // 5. Create assignments
  const assignments = applicableQuestions.map(q => ({
    employee_id: employeeId,
    question_id: q.id,
    cycle_id: cycleId,
    is_active: true,
    assigned_at: new Date().toISOString()
  }));

  await supabase.from('employee_appraisal_questions').insert(assignments);
}
```

#### Method 2: Bulk Assignment (HR Interface)
HR assigns questions to multiple employees at once.

```typescript
// Bulk assign to all employees in a department
async function bulkAssignQuestions(
  questionIds: string[], 
  departmentId: string, 
  cycleId: string
) {
  // Get all active employees in department
  const { data: employees } = await supabase
    .from('profiles')
    .select('id')
    .eq('department_id', departmentId)
    .eq('is_active', true);

  // Create assignments for each employee-question combination
  const assignments = [];
  for (const emp of employees) {
    for (const qId of questionIds) {
      assignments.push({
        employee_id: emp.id,
        question_id: qId,
        cycle_id: cycleId,
        is_active: true
      });
    }
  }

  // Insert with conflict handling (upsert)
  await supabase.from('employee_appraisal_questions').upsert(assignments);
}
```

#### Method 3: Individual Assignment
HR assigns specific questions to specific employees.

### 4.2 Question Filtering Logic

```
┌────────────────────────────────────────────────────────────┐
│                  QUESTION ASSIGNMENT RULES                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  IF applies_to_roles IS EMPTY                              │
│    AND applies_to_departments IS EMPTY                     │
│  THEN → Question applies to ALL employees                  │
│                                                            │
│  IF applies_to_roles IS NOT EMPTY                          │
│  THEN → Employee's role must be in the list                │
│                                                            │
│  IF applies_to_departments IS NOT EMPTY                    │
│  THEN → Employee's department must be in the list          │
│                                                            │
│  IF BOTH are set                                           │
│  THEN → Employee must match BOTH criteria (AND logic)      │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 5. Rating System

### 5.1 Rating Scale

All ratings use a **5-point scale**:

| Rating | Label | Description |
|--------|-------|-------------|
| 1 | Poor | Did not meet expectations |
| 2 | Fair | Partially met expectations |
| 3 | Good | Met expectations |
| 4 | Very Good | Exceeded expectations |
| 5 | Excellent | Significantly exceeded expectations |

### 5.2 Rating Data Structure

Each question response stores three sets of ratings:

```typescript
interface AppraisalResponse {
  emp_rating: 1 | 2 | 3 | 4 | 5;      // Employee self-rating
  emp_comment: string;                  // Employee's justification
  
  mgr_rating: 1 | 2 | 3 | 4 | 5;      // Manager's rating
  mgr_comment: string;                  // Manager's feedback
  
  committee_rating: 1 | 2 | 3 | 4 | 5; // Committee's final rating
  committee_comment: string;            // Committee's notes
}
```

### 5.3 Variance Detection

The system calculates variance between employee and manager ratings to flag discrepancies:

```typescript
function getVarianceLevel(empScore: number, mgrScore: number) {
  const difference = Math.abs(empScore - mgrScore);
  
  if (difference <= 1) return { level: 'low', color: 'green' };
  if (difference <= 2) return { level: 'medium', color: 'yellow' };
  return { level: 'high', color: 'red' };
}
```

**Variance Thresholds:**
- **Low Variance (Green)**: Difference ≤ 1 point
- **Medium Variance (Yellow)**: Difference 1-2 points
- **High Variance (Red)**: Difference > 2 points

---

## 6. Performance Calculation Formulas

### 6.1 Section Caps

Different sections contribute differently to the overall score:

| Section Type | Maximum Contribution | Keywords to Match |
|--------------|---------------------|-------------------|
| Financial | 50 points | "financial", "sales" |
| Operational | 35 points | "operational", "efficiency" |
| Behavioral | 15 points | "behavioral", "behavioural", "soft skills" |
| **Total** | **100 points** | |

### 6.2 Score Calculation Algorithm

```typescript
// src/services/performanceCalculationService.ts

class PerformanceCalculationService {
  
  // Section caps configuration
  private static SECTION_CAPS = {
    'Financial': 50,
    'Sales': 50,
    'Operational': 35,
    'Efficiency': 35,
    'Behavioral': 15,
    'Behavioural': 15,
    'Soft Skills': 15,
  };

  static async calculatePerformanceScore(employeeId, cycleId) {
    
    // Step 1: Get all responses for this appraisal
    const responses = await getResponses(appraisalId);
    
    // Step 2: Group responses by section
    const sectionGroups = groupResponsesBySection(responses);
    
    // Step 3: Calculate section scores
    const sectionScores = calculateSectionScores(sectionGroups);
    
    // Step 4: Calculate base score
    const baseScore = calculateBaseScore(sectionScores);
    
    // Step 5: Calculate noteworthy bonus
    const noteworthyBonus = calculateNoteworthyBonus(sectionScores, noteworthy);
    
    // Step 6: Calculate final score
    const overallScore = Math.min(100, baseScore + noteworthyBonus);
    
    // Step 7: Determine performance band
    const performanceBand = getPerformanceBand(overallScore);
    
    return { overallScore, performanceBand, sectionScores };
  }
}
```

### 6.3 Step-by-Step Formulas

#### Step 1: Calculate Raw Section Score

For each section, calculate the percentage achievement:

```
Raw Section Percentage = (Σ(rating × question_weight)) / (Σ(5 × question_weight)) × 100

Where:
- rating = mgr_rating (preferred) OR emp_rating (fallback)
- 5 = maximum possible rating
```

**Example:**
```
Financial Section has 3 questions:
- Q1: mgr_rating = 4, weight = 1.0
- Q2: mgr_rating = 5, weight = 1.5
- Q3: mgr_rating = 3, weight = 1.0

Total Weighted Score = (4 × 1.0) + (5 × 1.5) + (3 × 1.0) = 14.5
Max Possible Score = (5 × 1.0) + (5 × 1.5) + (5 × 1.0) = 17.5
Raw Percentage = 14.5 / 17.5 = 82.86%
```

#### Step 2: Apply Section Cap

Convert the raw percentage to points based on section cap:

```
Section Contribution = Raw Percentage × Section Cap

Where Section Cap depends on section type:
- Financial/Sales: 50 points max
- Operational/Efficiency: 35 points max
- Behavioral: 15 points max
```

**Example (continuing from above):**
```
Financial Section (cap = 50):
Section Contribution = 82.86% × 50 = 41.43 points
```

#### Step 3: Calculate Base Score

Normalize across all present sections:

```
Base Score = (Σ Section Contributions) / (Σ Section Caps) × 100
```

**Example:**
```
If employee has all three sections:
- Financial: 41.43 points (of 50)
- Operational: 28.00 points (of 35)
- Behavioral: 12.00 points (of 15)

Total Contribution = 41.43 + 28.00 + 12.00 = 81.43 points
Total Caps = 50 + 35 + 15 = 100 points

Base Score = (81.43 / 100) × 100 = 81.43%
```

#### Step 4: Calculate Noteworthy Bonus

If employee is marked as noteworthy in any section:

```
For each noteworthy section:
  Normalized Contribution = Section Points / Total Caps × 100
  Section Bonus = Normalized Contribution × 0.10 (10%)

Total Bonus = Σ(Section Bonuses)
Maximum Bonus = 10% (capped)
```

**Example:**
```
If Financial section is marked noteworthy:
Normalized Contribution = (41.43 / 100) × 100 = 41.43%
Section Bonus = 41.43 × 0.10 = 4.14%

Total Bonus = 4.14% (within 10% cap)
```

#### Step 5: Calculate Final Score

```
Final Score = min(Base Score + Noteworthy Bonus, 100)
```

**Example:**
```
Final Score = min(81.43 + 4.14, 100) = 85.57%
```

### 6.4 Performance Bands

```typescript
function getPerformanceBand(score: number): string {
  if (score >= 91) return 'Exceptional';   // 91-100%
  if (score >= 81) return 'Excellent';     // 81-90%
  if (score >= 71) return 'Very Good';     // 71-80%
  if (score >= 61) return 'Good';          // 61-70%
  if (score >= 51) return 'Fair';          // 51-60%
  return 'Poor';                           // Below 51%
}
```

| Performance Band | Score Range | Description |
|-----------------|-------------|-------------|
| Exceptional | 91-100% | Outstanding performance, exceeds all expectations |
| Excellent | 81-90% | Excellent performance, consistently exceeds expectations |
| Very Good | 71-80% | Very good performance, regularly exceeds expectations |
| Good | 61-70% | Good performance, meets most expectations |
| Fair | 51-60% | Fair performance, meets some expectations |
| Poor | Below 51% | Below expectations, needs improvement |

### 6.5 Complete Calculation Example

**Scenario:**
- Employee: John Doe
- Cycle: Q1 2025
- Sections: Financial (4 questions), Operational (3 questions), Behavioral (2 questions)
- Marked noteworthy in Financial section

**Financial Section (Cap: 50):**
| Question | Weight | Manager Rating | Weighted Score | Max Score |
|----------|--------|---------------|----------------|-----------|
| Revenue Target | 2.0 | 4 | 8 | 10 |
| Budget Management | 1.0 | 5 | 5 | 5 |
| Cost Reduction | 1.5 | 4 | 6 | 7.5 |
| ROI Achievement | 1.0 | 3 | 3 | 5 |
| **Total** | **5.5** | | **22** | **27.5** |

```
Raw Percentage = 22 / 27.5 = 80%
Contribution = 80% × 50 = 40 points
```

**Operational Section (Cap: 35):**
| Question | Weight | Manager Rating | Weighted Score | Max Score |
|----------|--------|---------------|----------------|-----------|
| Process Efficiency | 1.0 | 4 | 4 | 5 |
| Quality Control | 1.0 | 4 | 4 | 5 |
| Deadline Adherence | 1.0 | 5 | 5 | 5 |
| **Total** | **3.0** | | **13** | **15** |

```
Raw Percentage = 13 / 15 = 86.67%
Contribution = 86.67% × 35 = 30.33 points
```

**Behavioral Section (Cap: 15):**
| Question | Weight | Manager Rating | Weighted Score | Max Score |
|----------|--------|---------------|----------------|-----------|
| Teamwork | 1.0 | 4 | 4 | 5 |
| Communication | 1.0 | 3 | 3 | 5 |
| **Total** | **2.0** | | **7** | **10** |

```
Raw Percentage = 7 / 10 = 70%
Contribution = 70% × 15 = 10.5 points
```

**Final Calculation:**
```
Total Contribution = 40 + 30.33 + 10.5 = 80.83 points
Total Caps = 50 + 35 + 15 = 100 points

Base Score = (80.83 / 100) × 100 = 80.83%

Noteworthy Bonus (Financial is noteworthy):
  Normalized = (40 / 100) × 100 = 40%
  Bonus = 40 × 0.10 = 4%

Final Score = min(80.83 + 4, 100) = 84.83%

Performance Band = "Excellent" (81-90%)
```

---

## 7. Committee Review Process

### 7.1 Committee Review Interface

The committee review shows a comprehensive comparison:

```
┌─────────────────────────────────────────────────────────────────────┐
│  SECTION: FINANCIAL SECTION - John Doe                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Q1: Revenue target achievement                     [MEDIUM VARIANCE]│
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐     │
│  │ Employee     │ Manager      │ Average      │ Committee    │     │
│  │ ★★★★☆ 4/5   │ ★★★☆☆ 3/5   │ ★★★½☆ 3.5/5 │ [Select ▼]   │     │
│  │ "I exceeded  │ "Good work   │              │              │     │
│  │  targets by  │  but missed  │              │              │     │
│  │  10%..."     │  Q4..."      │              │              │     │
│  └──────────────┴──────────────┴──────────────┴──────────────┘     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Variance Indicators

```typescript
// Visual indicators for score discrepancies
const variance = getVarianceLevel(emp_rating, mgr_rating);

// variance.level: 'low' | 'medium' | 'high'
// variance.color: 'green' | 'yellow' | 'red'
```

### 7.3 Committee Score Selection

The committee can:
1. **Accept average** - Use the average of employee and manager scores
2. **Side with employee** - Use the employee's score
3. **Side with manager** - Use the manager's score
4. **Override** - Provide a different score with justification

### 7.4 Committee Submission Flow

```typescript
async function submitCommitteeReview(appraisalId: string) {
  // 1. Update all response records with committee scores
  for (const response of responses) {
    await supabase
      .from('appraisal_responses')
      .update({
        committee_rating: committeeScores[response.id],
        committee_comment: committeeComments
      })
      .eq('id', response.id);
  }

  // 2. Calculate final weighted score
  let totalWeightedScore = 0;
  let totalWeight = 0;
  
  for (const response of responses) {
    const score = committeeScores[response.id];
    totalWeightedScore += score * 20; // Convert 1-5 to 0-100 scale
    totalWeight += 1;
  }
  
  const finalScore = Math.round(totalWeightedScore / totalWeight);
  
  // 3. Determine performance band
  const performanceBand = getPerformanceBand(finalScore);
  
  // 4. Update appraisal record
  await supabase
    .from('appraisals')
    .update({
      committee_comments: committeeComments,
      committee_reviewed_at: new Date().toISOString(),
      committee_reviewed_by: currentUserId,
      overall_score: finalScore,
      performance_band: performanceBand,
      status: 'completed'
    })
    .eq('id', appraisalId);
  
  // 5. Save to performance_analytics table
  await PerformanceCalculationService.savePerformanceAnalytics(
    employeeId,
    cycleId,
    { overallScore: finalScore, performanceBand, ... }
  );
}
```

---

## 8. Role-Based Access Control

### 8.1 User Roles

```sql
CREATE TYPE user_role AS ENUM ('staff', 'manager', 'hr', 'admin');
```

### 8.2 Permission Matrix

| Action | Staff | Manager | HR | Admin |
|--------|-------|---------|----|----|
| View own appraisals | ✅ | ✅ | ✅ | ✅ |
| Complete own appraisals | ✅ | ✅ | ✅ | ✅ |
| View team appraisals | ❌ | ✅ (direct reports) | ✅ | ✅ |
| Review team appraisals | ❌ | ✅ | ✅ | ✅ |
| Create appraisal cycles | ❌ | ❌ | ✅ | ✅ |
| Manage questions | ❌ | ❌ | ✅ | ✅ |
| Assign questions | ❌ | ❌ | ✅ | ✅ |
| Committee review | ❌ | ✅ | ✅ | ✅ |
| View all analytics | ❌ | ❌ | ✅ | ✅ |
| Manage employees | ❌ | ❌ | ✅ | ✅ |
| Lock/unlock submissions | ❌ | ❌ | ✅ | ✅ |

### 8.3 RLS Policies (Key Examples)

```sql
-- Employees can view their own appraisals in active cycles
CREATE POLICY "Employees can view accessible appraisals" 
ON appraisals FOR SELECT
USING (
  employee_id = auth.uid() 
  AND (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hr', 'admin'))
    OR is_cycle_accessible_to_employee(cycle_id)
  )
);

-- Line managers can view their team's appraisals
CREATE POLICY "Line managers can view team appraisals"
ON appraisals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND id IN (
      SELECT line_manager_id FROM profiles
      WHERE id = appraisals.employee_id
    )
  )
);

-- HR and Admin can view all appraisals
CREATE POLICY "HR and Admin can view all appraisals"
ON appraisals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('hr', 'admin')
  )
);
```

### 8.4 Cycle Accessibility Check

```sql
CREATE FUNCTION is_cycle_accessible_to_employee(cycle_id_param uuid)
RETURNS boolean AS $$
DECLARE
  cycle_status text;
BEGIN
  SELECT status INTO cycle_status
  FROM appraisal_cycles 
  WHERE id = cycle_id_param;
  
  -- Only active cycles are accessible
  RETURN cycle_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 9. Notification System

### 9.1 Notification Types

| Type | Trigger | Recipients |
|------|---------|------------|
| `questions_assigned` | HR assigns questions | Employee, Line Manager |
| `appraisal_submitted` | Employee submits | Line Manager |
| `manager_review_completed` | Manager submits review | HR |
| `appraisal_completed` | Committee finalizes | Employee |
| `training_assigned` | Training assigned | Employee |
| `disciplinary_panel_required` | 3 quiz failures | HR, Panel Members |

### 9.2 Notification Table Structure

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  related_employee_id UUID,
  related_appraisal_id UUID,
  related_question_ids UUID[],
  created_at TIMESTAMP DEFAULT now()
);
```

### 9.3 Notification Functions

```sql
-- Notify line manager when employee submits
CREATE FUNCTION notify_line_manager_submission(
  appraisal_id_param uuid, 
  employee_id_param uuid
) RETURNS void AS $$
DECLARE
  line_manager_id UUID;
  employee_name TEXT;
  cycle_name TEXT;
BEGIN
  -- Get details
  SELECT p.line_manager_id, p.first_name || ' ' || p.last_name, ac.name
  INTO line_manager_id, employee_name, cycle_name
  FROM profiles p
  JOIN appraisals a ON a.employee_id = p.id
  JOIN appraisal_cycles ac ON a.cycle_id = ac.id
  WHERE p.id = employee_id_param AND a.id = appraisal_id_param;
  
  -- Create notification
  IF line_manager_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id, type, title, message, 
      related_employee_id, related_appraisal_id
    ) VALUES (
      line_manager_id,
      'appraisal_submitted',
      'Employee Appraisal Submitted',
      employee_name || ' has submitted their appraisal for ' || cycle_name,
      employee_id_param,
      appraisal_id_param
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 10. Training Integration

### 10.1 Training Request from Committee

During committee review, members can recommend training:

```typescript
// When committee recommends training
if (trainingRecommendation.trim()) {
  await supabase
    .from('training_requests')
    .insert({
      employee_id: appraisalData.employee_id,
      requested_by: currentUserId,
      recommended_training_type: recommendedTrainingType,
      justification: trainingJustification,
      status: 'pending'
    });
}
```

### 10.2 Training Assignment Flow

```
Committee Recommends → Training Request Created → HR Reviews
                                                      ↓
                                              HR Approves/Assigns
                                                      ↓
                                              Employee Notified
                                                      ↓
                                              Employee Completes
                                                      ↓
                                              Quiz (if required)
                                                      ↓
                                    Pass → Complete | Fail (3x) → Panel
```

### 10.3 Quiz Failure Handling

```sql
CREATE FUNCTION check_quiz_failures_and_create_panel()
RETURNS trigger AS $$
DECLARE
  failure_count INTEGER;
BEGIN
  -- Count failures for this assignment
  SELECT COUNT(*) INTO failure_count
  FROM quiz_attempts 
  WHERE assignment_id = NEW.assignment_id AND passed = false;
  
  -- If 3 failures, create disciplinary panel
  IF failure_count >= 3 AND NOT NEW.passed THEN
    -- Update assignment status
    UPDATE training_assignments 
    SET status = 'disciplinary' 
    WHERE id = NEW.assignment_id;
    
    -- Create panel with HR and managers
    INSERT INTO disciplinary_panels (
      employee_id, 
      training_assignment_id, 
      panel_members
    ) 
    SELECT 
      employee_id,
      NEW.assignment_id,
      ARRAY(SELECT id FROM profiles WHERE role IN ('hr', 'manager') LIMIT 3)
    FROM training_assignments 
    WHERE id = NEW.assignment_id;
    
    -- Notify panel members
    INSERT INTO notifications (user_id, type, title, message, related_employee_id)
    SELECT 
      p.id,
      'disciplinary_panel_required',
      'Disciplinary Panel Required',
      'Employee has failed training 3 times. Panel review required.',
      ta.employee_id
    FROM profiles p, training_assignments ta
    WHERE p.role IN ('hr', 'manager') AND ta.id = NEW.assignment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_quiz_failures_trigger
  AFTER INSERT ON quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION check_quiz_failures_and_create_panel();
```

---

## Appendix A: Database Functions Reference

| Function | Purpose | Security |
|----------|---------|----------|
| `handle_new_user()` | Creates profile when user signs up | DEFINER |
| `is_cycle_accessible_to_employee(cycle_id)` | Checks if cycle is active | DEFINER |
| `get_team_members(manager_id)` | Returns direct reports | DEFINER |
| `get_manager_appraisals(manager_id)` | Returns pending reviews | DEFINER |
| `notify_line_manager(employee_id, question_ids, assigned_by)` | Question assignment notification | DEFINER |
| `notify_line_manager_submission(appraisal_id, employee_id)` | Submission notification | DEFINER |
| `notify_hr_manager_review(appraisal_id, manager_id)` | Manager review notification | DEFINER |
| `calculate_performance_band(score)` | Returns band name from score | DEFINER |
| `complete_appraisal_cycle(cycle_id)` | Marks cycle and appraisals complete | DEFINER |
| `delete_appraisal_cycle_cascade(cycle_id)` | Safely deletes cycle and all data | DEFINER |
| `delete_employee_appraisal_assignment(assignment_id)` | Soft deletes assignment | DEFINER |
| `delete_section_with_questions(section_id)` | Removes section and questions | DEFINER |

---

## Appendix B: Status Codes Quick Reference

### Appraisal Statuses
| Status | Description | Who Can Access |
|--------|-------------|----------------|
| `draft` | Being completed by employee | Employee |
| `submitted` | Awaiting manager review | Manager |
| `manager_review` | Manager reviewing | Manager |
| `committee_review` | Committee/HR reviewing | HR, Committee |
| `completed` | Finalized | All (read-only) |

### Cycle Statuses
| Status | Description | Actions |
|--------|-------------|---------|
| `draft` | Being configured | HR can edit |
| `active` | Open for appraisals | Employees can submit |
| `completed` | Closed | Read-only |

---

## Appendix C: API Endpoints (Supabase Auto-Generated)

All data access goes through Supabase's auto-generated REST API with RLS enforcement:

```
GET    /rest/v1/appraisals
POST   /rest/v1/appraisals
PATCH  /rest/v1/appraisals?id=eq.{id}
DELETE /rest/v1/appraisals?id=eq.{id}

GET    /rest/v1/appraisal_responses
POST   /rest/v1/appraisal_responses
PATCH  /rest/v1/appraisal_responses?id=eq.{id}

GET    /rest/v1/appraisal_cycles
POST   /rest/v1/appraisal_cycles
PATCH  /rest/v1/appraisal_cycles?id=eq.{id}

POST   /rest/v1/rpc/notify_line_manager_submission
POST   /rest/v1/rpc/calculate_performance_band
```

---

**Document Version:** 1.0  
**Last Updated:** December 2024  
**Maintained By:** Development Team
