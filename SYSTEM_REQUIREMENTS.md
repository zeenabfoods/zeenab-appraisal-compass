# Employee Appraisal Management System - Technical Requirements Document

## 1. System Overview

### 1.1 Purpose
The Employee Appraisal Management System is a comprehensive web-based application designed to manage employee performance appraisals, training assignments, and performance analytics for corporate organizations. The system supports multi-stage approval workflows, role-based access control, and detailed performance tracking.

### 1.2 Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **State Management**: TanStack React Query
- **UI Components**: Radix UI, Shadcn/ui
- **Routing**: React Router DOM
- **Form Management**: React Hook Form + Zod validation

### 1.3 Supported Organizations
The system is configured for specific email domains:
- @cnthlimited.com
- @nigerianexportershub.com
- @zeenabgroup.com
- @zeenabfoods.com
- @habrisfoods.com
- @azenaboroilpalms.com

## 2. User Roles and Permissions

### 2.1 Role Hierarchy
1. **Staff**: Basic employees who complete appraisals
2. **Manager**: Line managers who review team appraisals
3. **HR**: Human resources personnel with administrative access
4. **Admin**: System administrators with full access

### 2.2 Role-Based Access Matrix

| Feature | Staff | Manager | HR | Admin |
|---------|-------|---------|----|----|
| Complete Appraisals | ✓ | ✓ | ✓ | ✓ |
| View Own Performance | ✓ | ✓ | ✓ | ✓ |
| Review Team Appraisals | ✗ | ✓ | ✓ | ✓ |
| Manage Appraisal Cycles | ✗ | ✗ | ✓ | ✓ |
| Assign Questions | ✗ | ✗ | ✓ | ✓ |
| View All Analytics | ✗ | Team Only | ✓ | ✓ |
| Manage Departments | ✗ | ✗ | ✓ | ✓ |
| Assign Training | ✗ | ✗ | ✓ | ✓ |
| Committee Review | ✗ | ✓ | ✓ | ✓ |

## 3. Frontend Requirements

### 3.1 Authentication System
- **Email Domain Validation**: Restrict signups to approved corporate domains
- **Password Requirements**: Standard Supabase authentication
- **Profile Management**: Extended user profiles with department and line manager relationships
- **Session Management**: Persistent sessions with automatic refresh

### 3.2 Core Pages and Components

#### 3.2.1 Authentication Pages
- **Sign In Page** (`/auth`): Email/password login with domain validation
- **Sign Up Page**: Registration with corporate email validation
- **Password Reset**: Standard password recovery flow

#### 3.2.2 Dashboard and Navigation
- **Main Dashboard** (`/`): Role-specific overview with quick actions
- **Responsive Sidebar**: Navigation menu with role-based item visibility
- **Notification Center**: Real-time notifications with read/unread status
- **Profile Management** (`/profile`): User profile editing and password changes

#### 3.2.3 Appraisal Management Pages
- **My Appraisals** (`/my-appraisals`): Personal appraisal history and active forms
- **Manager Appraisals** (`/manager-appraisals`): Team member appraisal reviews (Manager+ roles)
- **HR Appraisals** (`/hr-appraisals`): System-wide appraisal management (HR+ roles)
- **Appraisal Form** (`/appraisal/:id`): Dynamic form for completing appraisals
- **Appraisal Cycles** (`/appraisal-cycles`): Cycle management (HR+ roles)

#### 3.2.4 Employee Management
- **Employee Management** (`/employee-management`): Staff directory and management (HR+ roles)
- **Department Management** (`/department-management`): Department structure (HR+ roles)
- **Employee Questions** (`/employee-questions`): Individual question assignments (HR+ roles)

#### 3.2.5 Analytics and Reporting
- **Company Reports** (`/company-reports`): Performance analytics dashboard (HR+ roles)
- **Committee Review** (`/committee`): Committee-based appraisal reviews (Manager+ roles)

#### 3.2.6 Question Management
- **Question Templates** (`/question-templates`): Appraisal question library (HR+ roles)

#### 3.2.7 Notifications
- **Notifications** (`/notifications`): Notification center with filtering and management

### 3.3 UI Component Requirements

#### 3.3.1 Design System
- **Color Scheme**: Professional corporate theme with HSL color tokens
- **Typography**: Clean, readable fonts with consistent hierarchy
- **Responsive Design**: Mobile-first approach with breakpoints
- **Dark Mode**: Optional dark theme support

#### 3.3.2 Key UI Components
- **AppraisalForm**: Dynamic form renderer with rating scales and text inputs
- **Employee Cards**: Staff information display with actions
- **Performance Charts**: Data visualization using Recharts
- **Question Assignment Interface**: Bulk and individual question assignment tools
- **Cycle Management**: Comprehensive cycle creation and status management
- **Committee Review Interface**: Multi-reviewer scoring system

### 3.4 State Management
- **TanStack Query**: Server state management with caching
- **React Context**: Authentication and user profile state
- **Form State**: React Hook Form for complex form management
- **Real-time Updates**: Supabase real-time subscriptions for notifications

## 4. Backend Requirements (Supabase)

### 4.1 Database Schema

#### 4.1.1 User Management Tables
```sql
-- User profiles with extended information
profiles (
  id: uuid (references auth.users),
  email: text,
  first_name: text,
  last_name: text,
  department_id: uuid,
  line_manager_id: uuid,
  role: user_role enum,
  position: text,
  is_active: boolean,
  created_at: timestamp,
  last_login: timestamp
)

-- Department structure
departments (
  id: uuid,
  name: text,
  description: text,
  line_manager_id: uuid,
  is_active: boolean,
  created_at: timestamp,
  updated_at: timestamp
)
```

#### 4.1.2 Appraisal System Tables
```sql
-- Appraisal cycles (quarters/periods)
appraisal_cycles (
  id: uuid,
  name: text,
  quarter: integer,
  year: integer,
  start_date: date,
  end_date: date,
  status: text,
  created_by: uuid,
  created_at: timestamp,
  updated_at: timestamp
)

-- Question sections for organization
appraisal_question_sections (
  id: uuid,
  name: text,
  description: text,
  weight: numeric,
  max_score: integer,
  sort_order: integer,
  is_active: boolean,
  created_at: timestamp
)

-- Appraisal questions
appraisal_questions (
  id: uuid,
  question_text: text,
  question_type: text,
  section_id: uuid,
  cycle_id: uuid,
  weight: numeric,
  sort_order: integer,
  is_required: boolean,
  is_active: boolean,
  multiple_choice_options: text[],
  applies_to_departments: uuid[],
  applies_to_roles: text[],
  created_at: timestamp
)

-- Individual appraisals
appraisals (
  id: uuid,
  employee_id: uuid,
  cycle_id: uuid,
  manager_id: uuid,
  hr_reviewer_id: uuid,
  status: appraisal_status enum,
  overall_score: numeric,
  performance_band: text,
  noteworthy: text,
  training_needs: text,
  goals: text,
  emp_comments: text,
  mgr_comments: text,
  committee_comments: text,
  employee_submitted_at: timestamp,
  manager_reviewed_at: timestamp,
  committee_reviewed_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
)

-- Question assignments to employees
employee_appraisal_questions (
  id: uuid,
  employee_id: uuid,
  question_id: uuid,
  cycle_id: uuid,
  assigned_by: uuid,
  assigned_at: timestamp,
  is_active: boolean,
  deleted_at: timestamp
)

-- Individual question responses
appraisal_responses (
  id: uuid,
  appraisal_id: uuid,
  question_id: uuid,
  employee_id: uuid,
  cycle_id: uuid,
  emp_rating: integer,
  mgr_rating: integer,
  committee_rating: integer,
  emp_comment: text,
  mgr_comment: text,
  committee_comment: text,
  status: text,
  employee_submitted_at: timestamp,
  manager_reviewed_at: timestamp,
  created_at: timestamp,
  updated_at: timestamp
)
```

#### 4.1.3 Performance Analytics Tables
```sql
-- Performance analytics and calculations
performance_analytics (
  id: uuid,
  employee_id: uuid,
  cycle_id: uuid,
  overall_score: numeric,
  performance_band: text,
  section_scores: jsonb,
  trends: jsonb,
  predictions: jsonb,
  recommendations: jsonb,
  created_at: timestamp,
  updated_at: timestamp
)
```

#### 4.1.4 Training Management Tables
```sql
-- Training categories
training_categories (
  id: uuid,
  name: text,
  description: text,
  is_active: boolean,
  created_at: timestamp
)

-- Training content
trainings (
  id: uuid,
  title: text,
  description: text,
  content_type: text,
  content_url: text,
  file_path: text,
  duration_minutes: integer,
  pass_mark: integer,
  max_attempts: integer,
  category_id: uuid,
  created_by: uuid,
  is_active: boolean,
  created_at: timestamp,
  updated_at: timestamp
)

-- Training assignments
training_assignments (
  id: uuid,
  employee_id: uuid,
  training_id: uuid,
  assigned_by: uuid,
  assigned_at: timestamp,
  due_date: timestamp,
  status: text,
  request_id: uuid
)

-- Training progress tracking
training_progress (
  id: uuid,
  assignment_id: uuid,
  progress_percentage: integer,
  time_spent_minutes: integer,
  last_position: text,
  completed_at: timestamp,
  updated_at: timestamp
)

-- Quiz questions for training
training_quiz_questions (
  id: uuid,
  training_id: uuid,
  question_text: text,
  question_type: text,
  options: jsonb,
  correct_answer: text,
  points: integer,
  sort_order: integer,
  is_active: boolean
)

-- Quiz attempt tracking
quiz_attempts (
  id: uuid,
  assignment_id: uuid,
  attempt_number: integer,
  score_percentage: integer,
  passed: boolean,
  answers: jsonb,
  started_at: timestamp,
  completed_at: timestamp,
  time_taken_minutes: integer
)

-- Training requests from committees
training_requests (
  id: uuid,
  employee_id: uuid,
  requested_by: uuid,
  category_id: uuid,
  justification: text,
  recommended_training_type: text,
  status: text,
  processed_by: uuid,
  processed_at: timestamp,
  created_at: timestamp
)

-- Disciplinary panels for training failures
disciplinary_panels (
  id: uuid,
  employee_id: uuid,
  training_assignment_id: uuid,
  panel_members: uuid[],
  status: text,
  review_date: timestamp,
  decision: text,
  decision_notes: text,
  created_at: timestamp,
  updated_at: timestamp
)
```

#### 4.1.5 Notification System
```sql
-- System notifications
notifications (
  id: uuid,
  user_id: uuid,
  type: text,
  title: text,
  message: text,
  is_read: boolean,
  related_employee_id: uuid,
  related_appraisal_id: uuid,
  related_question_ids: uuid[],
  created_at: timestamp
)
```

### 4.2 Row Level Security (RLS) Policies

#### 4.2.1 Profile Access
- **View**: All authenticated users can view all profiles (for manager selection)
- **Update**: Users can update their own profiles; HR/Admin can update any profile
- **Insert**: Automated via auth trigger

#### 4.2.2 Appraisal Access
- **Employees**: Can view/edit their own draft appraisals in active cycles
- **Managers**: Can view/edit their direct reports' appraisals
- **HR/Admin**: Full access to all appraisals
- **Cycle Restriction**: Only active cycles are accessible to employees

#### 4.2.3 Question Management
- **View**: All authenticated users can view questions
- **Manage**: Only HR/Admin can create/modify questions
- **Assignments**: Employees can only see their assigned questions

#### 4.2.4 Training Access
- **Employees**: Can view assigned trainings and manage their progress
- **Managers**: Can view team training progress
- **HR/Admin**: Full training management capabilities

#### 4.2.5 Analytics Access
- **Employees**: Can view their own performance analytics
- **Managers**: Can view team performance analytics
- **HR/Admin**: Can view all performance analytics

### 4.3 Database Functions

#### 4.3.1 User Management Functions
```sql
-- Handle new user registration
handle_new_user() TRIGGER FUNCTION
-- Creates profile record when user signs up

-- Get team members for managers
get_team_members(manager_id_param uuid) RETURNS TABLE
-- Returns all direct reports for a manager

-- Get manager appraisals
get_manager_appraisals(manager_id_param uuid) RETURNS TABLE
-- Returns appraisals requiring manager review
```

#### 4.3.2 Appraisal Management Functions
```sql
-- Check cycle accessibility
is_cycle_accessible_to_employee(cycle_id_param uuid) RETURNS boolean
-- Determines if an employee can access a specific cycle

-- Complete appraisal cycle
complete_appraisal_cycle(cycle_id_param uuid) RETURNS void
-- Marks cycle and all related appraisals as completed

-- Delete cycle with cascade
delete_appraisal_cycle_cascade(cycle_id_param uuid) RETURNS void
-- Safely removes cycle and all related data

-- Delete section with questions
delete_section_with_questions(section_id_param uuid) RETURNS void
-- Removes section and associated questions

-- Delete employee assignment
delete_employee_appraisal_assignment(assignment_id uuid) RETURNS void
-- Soft deletes question assignment
```

#### 4.3.3 Notification Functions
```sql
-- Notify line manager of question assignment
notify_line_manager(employee_id_param uuid, question_ids_param uuid[], assigned_by_param uuid) RETURNS void

-- Notify line manager of appraisal submission
notify_line_manager_submission(appraisal_id_param uuid, employee_id_param uuid) RETURNS void

-- Notify HR of manager review completion
notify_hr_manager_review(appraisal_id_param uuid, manager_id_param uuid) RETURNS void
```

#### 4.3.4 Training Functions
```sql
-- Training assignment notification
notify_training_assignment() TRIGGER FUNCTION
-- Notifies employee when training is assigned

-- Check quiz failures and create panel
check_quiz_failures_and_create_panel() TRIGGER FUNCTION
-- Creates disciplinary panel after 3 failed attempts
```

#### 4.3.5 Performance Calculation Functions
```sql
-- Calculate performance band
calculate_performance_band(score numeric) RETURNS text
-- Determines performance band based on score thresholds
```

### 4.4 Database Triggers
```sql
-- User creation trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated timestamp triggers
CREATE TRIGGER update_updated_at
  BEFORE UPDATE ON [various_tables]
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Training notification trigger
CREATE TRIGGER notify_training_assignment_trigger
  AFTER INSERT ON training_assignments
  FOR EACH ROW EXECUTE FUNCTION notify_training_assignment();

-- Quiz failure trigger
CREATE TRIGGER check_quiz_failures_trigger
  AFTER INSERT ON quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION check_quiz_failures_and_create_panel();
```

## 5. Core Business Logic

### 5.1 Appraisal Workflow

#### 5.1.1 Cycle Management
1. **Creation**: HR creates appraisal cycles with defined periods
2. **Question Setup**: HR assigns questions to sections and employees
3. **Activation**: Cycles are activated to allow employee participation
4. **Completion**: Cycles are closed, preventing further modifications

#### 5.1.2 Employee Appraisal Process
1. **Draft Stage**: Employee completes assigned questions with ratings and comments
2. **Submission**: Employee submits for manager review
3. **Manager Review**: Line manager adds ratings and comments
4. **Committee Review**: Committee members provide final ratings
5. **Completion**: Final scores calculated and performance band assigned

#### 5.1.3 Question Assignment Logic
- **Bulk Assignment**: Assign questions to multiple employees simultaneously
- **Individual Assignment**: Assign specific questions to individual employees
- **Auto Assignment**: System can auto-assign based on department/role criteria
- **Department/Role Filtering**: Questions can be restricted by department or role

### 5.2 Performance Calculation System

#### 5.2.1 Scoring Algorithm
```javascript
// Weighted section scoring
sectionScore = (totalPoints / maxPossiblePoints) * 100
weightedScore = sectionScore * sectionWeight

// Overall performance calculation
overallScore = sum(allWeightedSectionScores) / sum(allSectionWeights)

// Noteworthy bonus calculation
noteworthyBonus = (countOfNoteworthySections / totalSections) * 5

// Final score
finalScore = min(overallScore + noteworthyBonus, 100)
```

#### 5.2.2 Performance Bands
- **Exceptional**: 91-100%
- **Excellent**: 81-90%
- **Very Good**: 71-80%
- **Good**: 61-70%
- **Fair**: 51-60%
- **Poor**: Below 51%

#### 5.2.3 Section-Specific Caps
- **Key Performance Areas**: No cap (full weight)
- **Core Competencies**: Capped at 80%
- **Leadership Skills**: Capped at 90%

### 5.3 Training Management Logic

#### 5.3.1 Training Assignment Process
1. **Manual Assignment**: HR assigns specific training to employees
2. **Request-Based**: Committee members request training for employees
3. **Automatic Assignment**: Based on performance gaps or compliance requirements

#### 5.3.2 Training Completion Tracking
- **Progress Monitoring**: Real-time progress percentage tracking
- **Quiz Requirements**: Employees must pass quizzes to complete training
- **Retry Logic**: Maximum 3 attempts per training
- **Disciplinary Process**: Automatic panel creation after 3 failures

#### 5.3.3 Quiz System
- **Multiple Choice Questions**: JSON-stored options and correct answers
- **Scoring**: Percentage-based with configurable pass marks
- **Time Tracking**: Monitor time spent on quiz attempts

### 5.4 Notification System

#### 5.4.1 Notification Types
- **Question Assignment**: Notify employees and managers of new assignments
- **Appraisal Submission**: Alert managers when employees submit appraisals
- **Manager Review**: Notify HR when manager reviews are complete
- **Training Assignment**: Alert employees of new training requirements
- **Disciplinary Action**: Notify panel members of required reviews

#### 5.4.2 Notification Delivery
- **Real-time**: Immediate delivery via Supabase real-time
- **Persistent**: Stored in database with read/unread status
- **Role-Based**: Targeted delivery based on user roles and relationships

## 6. Security Requirements

### 6.1 Authentication Security
- **Email Domain Restriction**: Enforce corporate email domains only
- **Password Policy**: Follow Supabase standard requirements
- **Session Management**: Secure session handling with automatic refresh
- **Multi-Factor Authentication**: Optional (can be enabled via Supabase)

### 6.2 Authorization Framework
- **Role-Based Access Control**: Strict role hierarchy enforcement
- **Row-Level Security**: Database-level access control
- **API Security**: All database access through RLS-protected queries
- **Function Security**: SECURITY DEFINER functions for privileged operations

### 6.3 Data Protection
- **Personal Data**: Secure handling of employee personal information
- **Appraisal Confidentiality**: Restricted access to performance data
- **Audit Trail**: Comprehensive logging of data modifications
- **Soft Deletes**: Maintain data integrity with soft deletion patterns

### 6.4 Input Validation
- **Form Validation**: Client-side and server-side validation using Zod schemas
- **SQL Injection Protection**: Parameterized queries through Supabase client
- **XSS Protection**: React's built-in XSS protection
- **CSRF Protection**: Supabase JWT-based request authentication

## 7. Performance Requirements

### 7.1 Frontend Performance
- **Bundle Size**: Optimized with code splitting and lazy loading
- **Render Performance**: Efficient React rendering with proper memoization
- **Caching**: TanStack Query for intelligent data caching
- **Progressive Web App**: Service worker for offline capabilities

### 7.2 Database Performance
- **Indexing**: Proper database indexes on frequently queried columns
- **Query Optimization**: Efficient joins and filtered queries
- **Connection Pooling**: Supabase managed connection pooling
- **Real-time Optimization**: Selective real-time subscriptions

### 7.3 Scalability Considerations
- **User Capacity**: Designed for enterprise-scale user bases
- **Data Growth**: Efficient handling of growing appraisal and training data
- **Concurrent Users**: Support for simultaneous appraisal submissions
- **Geographic Distribution**: Supabase global infrastructure support

## 8. Integration Requirements

### 8.1 External Integrations
- **Email Service**: Supabase Auth email delivery
- **File Storage**: Potential integration for training materials (Supabase Storage)
- **Analytics**: Built-in performance analytics system
- **Reporting**: Export capabilities for performance reports

### 8.2 API Requirements
- **RESTful API**: Supabase auto-generated REST API
- **Real-time API**: WebSocket connections for live updates
- **GraphQL**: Optional Supabase GraphQL endpoint
- **Webhook Support**: For external system integrations

## 9. Deployment Requirements

### 9.1 Frontend Deployment
- **Static Site Hosting**: Deployable to any static hosting service
- **Build Process**: Vite build system with optimization
- **Environment Configuration**: Environment-specific configuration management
- **CDN Integration**: Asset delivery optimization

### 9.2 Backend Deployment
- **Supabase Hosting**: Fully managed PostgreSQL and API hosting
- **Edge Functions**: Serverless function deployment (if needed)
- **Database Migrations**: Version-controlled schema changes
- **Backup Strategy**: Automated database backups

### 9.3 Monitoring and Logging
- **Application Monitoring**: Error tracking and performance monitoring
- **Database Monitoring**: Query performance and resource usage
- **User Analytics**: Usage patterns and system adoption metrics
- **Security Monitoring**: Access patterns and security events

## 10. Testing Requirements

### 10.1 Frontend Testing
- **Unit Tests**: Component and utility function testing
- **Integration Tests**: User flow and API integration testing
- **E2E Testing**: Complete user journey testing
- **Accessibility Testing**: WCAG compliance verification

### 10.2 Backend Testing
- **Database Testing**: RLS policy and function testing
- **API Testing**: Endpoint functionality and security testing
- **Performance Testing**: Load and stress testing
- **Security Testing**: Vulnerability assessment and penetration testing

## 11. Documentation Requirements

### 11.1 Technical Documentation
- **API Documentation**: Comprehensive API reference
- **Database Schema**: Complete schema documentation with relationships
- **Deployment Guide**: Step-by-step deployment instructions
- **Configuration Guide**: Environment and system configuration

### 11.2 User Documentation
- **User Manual**: Role-specific user guides
- **Admin Guide**: System administration procedures
- **Training Materials**: User onboarding and training resources
- **FAQ**: Common questions and troubleshooting

## 12. Maintenance and Support

### 12.1 System Maintenance
- **Database Maintenance**: Regular optimization and cleanup procedures
- **Security Updates**: Regular security patch application
- **Performance Monitoring**: Ongoing performance optimization
- **Capacity Planning**: Monitoring and scaling procedures

### 12.2 User Support
- **Help System**: In-application help and guidance
- **Support Channels**: User support and issue resolution processes
- **Training Program**: User training and onboarding procedures
- **Change Management**: Process for system updates and changes

---

## Appendix A: Database Enums and Types

```sql
-- User roles enum
CREATE TYPE user_role AS ENUM ('staff', 'manager', 'hr', 'admin');

-- Appraisal status enum  
CREATE TYPE appraisal_status AS ENUM ('draft', 'submitted', 'manager_review', 'committee_review', 'completed');
```

## Appendix B: Environment Variables

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Configuration
VITE_APP_NAME=Employee Appraisal System
VITE_APP_VERSION=1.0.0
```

## Appendix C: Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "@supabase/supabase-js": "^2.50.0",
    "@tanstack/react-query": "^5.56.2",
    "react-hook-form": "^7.53.0",
    "@hookform/resolvers": "^3.9.0",
    "zod": "^3.23.8",
    "tailwindcss": "latest",
    "@radix-ui/react-*": "latest",
    "lucide-react": "^0.462.0",
    "recharts": "^2.12.7",
    "date-fns": "^3.6.0"
  }
}
```

This document provides comprehensive technical specifications for recreating the Employee Appraisal Management System exactly as implemented, including all business logic, security requirements, and technical architecture details.