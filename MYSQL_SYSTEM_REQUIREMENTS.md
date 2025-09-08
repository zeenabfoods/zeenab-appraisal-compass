# Employee Appraisal Management System - MySQL Technical Requirements Document

## 1. System Overview

### 1.1 Purpose
The Employee Appraisal Management System is a comprehensive web-based application designed to manage employee performance appraisals, training assignments, and performance analytics for corporate organizations. The system supports multi-stage approval workflows, role-based access control, and detailed performance tracking.

### 1.2 Technology Stack
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MySQL 8.0+
- **Authentication**: JWT with custom implementation
- **State Management**: TanStack React Query
- **UI Components**: Radix UI, Shadcn/ui
- **Routing**: React Router DOM
- **Form Management**: React Hook Form + Zod validation
- **File Storage**: Local file system or AWS S3
- **Email Service**: NodeMailer with SMTP

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
- **Password Requirements**: Minimum 8 characters, uppercase, lowercase, number, special character
- **Profile Management**: Extended user profiles with department and line manager relationships
- **Session Management**: JWT tokens with refresh token rotation
- **Password Reset**: Email-based password recovery flow

### 3.2 Core Pages and Components

#### 3.2.1 Authentication Pages
- **Sign In Page** (`/auth`): Email/password login with domain validation
- **Sign Up Page**: Registration with corporate email validation
- **Password Reset**: Email-based password recovery flow

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
- **WebSocket**: Real-time updates for notifications using Socket.IO

## 4. Backend Requirements (Node.js/Express/MySQL)

### 4.1 MySQL Database Schema

#### 4.1.1 User Management Tables
```sql
-- User profiles with extended information
CREATE TABLE profiles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    department_id CHAR(36),
    line_manager_id CHAR(36),
    role ENUM('staff', 'manager', 'hr', 'admin') NOT NULL DEFAULT 'staff',
    position VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (line_manager_id) REFERENCES profiles(id) ON DELETE SET NULL,
    
    INDEX idx_profiles_email (email),
    INDEX idx_profiles_department (department_id),
    INDEX idx_profiles_manager (line_manager_id),
    INDEX idx_profiles_role (role),
    INDEX idx_profiles_active (is_active)
);

-- Department structure
CREATE TABLE departments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    line_manager_id CHAR(36),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (line_manager_id) REFERENCES profiles(id) ON DELETE SET NULL,
    
    INDEX idx_departments_active (is_active),
    INDEX idx_departments_manager (line_manager_id)
);

-- Session management for JWT refresh tokens
CREATE TABLE user_sessions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NOT NULL,
    refresh_token VARCHAR(255) NOT NULL,
    device_info JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    
    UNIQUE KEY idx_refresh_token (refresh_token),
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_expires (expires_at)
);
```

#### 4.1.2 Appraisal System Tables
```sql
-- Appraisal cycles (quarters/periods)
CREATE TABLE appraisal_cycles (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(200) NOT NULL,
    quarter INT NOT NULL,
    year INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('draft', 'active', 'completed') DEFAULT 'draft',
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
    
    INDEX idx_cycles_status (status),
    INDEX idx_cycles_year_quarter (year, quarter),
    INDEX idx_cycles_dates (start_date, end_date)
);

-- Question sections for organization
CREATE TABLE appraisal_question_sections (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    weight DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    max_score INT NOT NULL DEFAULT 5,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_sections_active (is_active),
    INDEX idx_sections_sort (sort_order)
);

-- Appraisal questions
CREATE TABLE appraisal_questions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    question_text TEXT NOT NULL,
    question_type ENUM('rating', 'text', 'multiple_choice', 'boolean') DEFAULT 'rating',
    section_id CHAR(36),
    cycle_id CHAR(36),
    weight DECIMAL(5,2) DEFAULT 1.00,
    sort_order INT DEFAULT 0,
    is_required BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    multiple_choice_options JSON,
    applies_to_departments JSON, -- Array of department IDs
    applies_to_roles JSON, -- Array of role names
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (section_id) REFERENCES appraisal_question_sections(id) ON DELETE SET NULL,
    FOREIGN KEY (cycle_id) REFERENCES appraisal_cycles(id) ON DELETE CASCADE,
    
    INDEX idx_questions_section (section_id),
    INDEX idx_questions_cycle (cycle_id),
    INDEX idx_questions_active (is_active),
    INDEX idx_questions_sort (sort_order)
);

-- Individual appraisals
CREATE TABLE appraisals (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    employee_id CHAR(36) NOT NULL,
    cycle_id CHAR(36),
    manager_id CHAR(36),
    hr_reviewer_id CHAR(36),
    status ENUM('draft', 'submitted', 'manager_review', 'committee_review', 'completed') DEFAULT 'draft',
    overall_score DECIMAL(5,2),
    performance_band VARCHAR(50),
    noteworthy TEXT,
    training_needs TEXT,
    goals TEXT,
    emp_comments TEXT,
    mgr_comments TEXT,
    committee_comments TEXT,
    employee_submitted_at TIMESTAMP NULL,
    manager_reviewed_at TIMESTAMP NULL,
    manager_reviewed_by CHAR(36),
    committee_reviewed_at TIMESTAMP NULL,
    committee_reviewed_by CHAR(36),
    hr_finalized_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES appraisal_cycles(id) ON DELETE SET NULL,
    FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (hr_reviewer_id) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (manager_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (committee_reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL,
    
    UNIQUE KEY idx_employee_cycle (employee_id, cycle_id),
    INDEX idx_appraisals_status (status),
    INDEX idx_appraisals_manager (manager_id),
    INDEX idx_appraisals_cycle (cycle_id),
    INDEX idx_appraisals_employee (employee_id)
);

-- Question assignments to employees
CREATE TABLE employee_appraisal_questions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    employee_id CHAR(36) NOT NULL,
    question_id CHAR(36) NOT NULL,
    cycle_id CHAR(36) NOT NULL,
    assigned_by CHAR(36),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES appraisal_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES appraisal_cycles(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE SET NULL,
    
    UNIQUE KEY idx_employee_question_cycle (employee_id, question_id, cycle_id),
    INDEX idx_employee_questions_employee (employee_id),
    INDEX idx_employee_questions_cycle (cycle_id),
    INDEX idx_employee_questions_active (is_active)
);

-- Individual question responses
CREATE TABLE appraisal_responses (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    appraisal_id CHAR(36),
    question_id CHAR(36),
    employee_id CHAR(36),
    manager_id CHAR(36),
    cycle_id CHAR(36),
    emp_rating INT,
    mgr_rating INT,
    committee_rating INT,
    emp_comment TEXT,
    mgr_comment TEXT,
    committee_comment TEXT,
    status ENUM('pending', 'employee_completed', 'manager_reviewed', 'committee_reviewed') DEFAULT 'pending',
    employee_submitted_at TIMESTAMP NULL,
    manager_reviewed_at TIMESTAMP NULL,
    hr_finalized_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (appraisal_id) REFERENCES appraisals(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES appraisal_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (cycle_id) REFERENCES appraisal_cycles(id) ON DELETE CASCADE,
    
    UNIQUE KEY idx_response_appraisal_question (appraisal_id, question_id),
    INDEX idx_responses_appraisal (appraisal_id),
    INDEX idx_responses_employee (employee_id),
    INDEX idx_responses_status (status)
);
```

#### 4.1.3 Performance Analytics Tables
```sql
-- Performance analytics and calculations
CREATE TABLE performance_analytics (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    employee_id CHAR(36) NOT NULL,
    cycle_id CHAR(36) NOT NULL,
    overall_score DECIMAL(5,2),
    performance_band VARCHAR(50),
    section_scores JSON, -- {"section_id": {"score": 85.5, "weight": 0.4, "weighted_score": 34.2}}
    trends JSON, -- Historical trend data
    predictions JSON, -- Performance predictions
    recommendations JSON, -- Improvement recommendations
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES appraisal_cycles(id) ON DELETE CASCADE,
    
    UNIQUE KEY idx_analytics_employee_cycle (employee_id, cycle_id),
    INDEX idx_analytics_employee (employee_id),
    INDEX idx_analytics_cycle (cycle_id),
    INDEX idx_analytics_band (performance_band)
);
```

#### 4.1.4 Training Management Tables
```sql
-- Training categories
CREATE TABLE training_categories (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_categories_active (is_active)
);

-- Training content
CREATE TABLE trainings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    content_type ENUM('video', 'document', 'url', 'quiz') NOT NULL,
    content_url VARCHAR(500),
    file_path VARCHAR(500),
    duration_minutes INT,
    pass_mark INT DEFAULT 70,
    max_attempts INT DEFAULT 3,
    category_id CHAR(36),
    created_by CHAR(36) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES training_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT,
    
    INDEX idx_trainings_category (category_id),
    INDEX idx_trainings_active (is_active),
    INDEX idx_trainings_creator (created_by)
);

-- Training assignments
CREATE TABLE training_assignments (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    employee_id CHAR(36) NOT NULL,
    training_id CHAR(36) NOT NULL,
    assigned_by CHAR(36) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP NOT NULL,
    status ENUM('assigned', 'in_progress', 'completed', 'overdue', 'failed') DEFAULT 'assigned',
    request_id CHAR(36),
    
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (request_id) REFERENCES training_requests(id) ON DELETE SET NULL,
    
    UNIQUE KEY idx_employee_training (employee_id, training_id),
    INDEX idx_assignments_employee (employee_id),
    INDEX idx_assignments_training (training_id),
    INDEX idx_assignments_status (status),
    INDEX idx_assignments_due (due_date)
);

-- Training progress tracking
CREATE TABLE training_progress (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    assignment_id CHAR(36) NOT NULL,
    progress_percentage INT DEFAULT 0,
    time_spent_minutes INT DEFAULT 0,
    last_position VARCHAR(100),
    completed_at TIMESTAMP NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assignment_id) REFERENCES training_assignments(id) ON DELETE CASCADE,
    
    UNIQUE KEY idx_progress_assignment (assignment_id),
    INDEX idx_progress_completion (completed_at)
);

-- Quiz questions for training
CREATE TABLE training_quiz_questions (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    training_id CHAR(36) NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false', 'text') DEFAULT 'multiple_choice',
    options JSON,
    correct_answer TEXT NOT NULL,
    points INT DEFAULT 1,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    
    INDEX idx_quiz_training (training_id),
    INDEX idx_quiz_active (is_active),
    INDEX idx_quiz_sort (sort_order)
);

-- Quiz attempt tracking
CREATE TABLE quiz_attempts (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    assignment_id CHAR(36) NOT NULL,
    attempt_number INT NOT NULL,
    score_percentage INT,
    passed BOOLEAN DEFAULT FALSE,
    answers JSON,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    time_taken_minutes INT,
    
    FOREIGN KEY (assignment_id) REFERENCES training_assignments(id) ON DELETE CASCADE,
    
    UNIQUE KEY idx_attempt_assignment_number (assignment_id, attempt_number),
    INDEX idx_attempts_assignment (assignment_id),
    INDEX idx_attempts_passed (passed)
);

-- Training requests from committees
CREATE TABLE training_requests (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    employee_id CHAR(36) NOT NULL,
    requested_by CHAR(36) NOT NULL,
    category_id CHAR(36),
    justification TEXT NOT NULL,
    recommended_training_type VARCHAR(100),
    status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
    processed_by CHAR(36),
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE RESTRICT,
    FOREIGN KEY (category_id) REFERENCES training_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES profiles(id) ON DELETE SET NULL,
    
    INDEX idx_requests_employee (employee_id),
    INDEX idx_requests_requestor (requested_by),
    INDEX idx_requests_status (status)
);

-- Disciplinary panels for training failures
CREATE TABLE disciplinary_panels (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    employee_id CHAR(36) NOT NULL,
    training_assignment_id CHAR(36) NOT NULL,
    panel_members JSON NOT NULL, -- Array of user IDs
    status ENUM('pending', 'scheduled', 'completed', 'dismissed') DEFAULT 'pending',
    review_date TIMESTAMP NULL,
    decision ENUM('warning', 'additional_training', 'disciplinary_action', 'termination'),
    decision_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (training_assignment_id) REFERENCES training_assignments(id) ON DELETE CASCADE,
    
    INDEX idx_panels_employee (employee_id),
    INDEX idx_panels_assignment (training_assignment_id),
    INDEX idx_panels_status (status)
);
```

#### 4.1.5 Notification System
```sql
-- System notifications
CREATE TABLE notifications (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    type ENUM('question_assignment', 'appraisal_submission', 'manager_review', 'training_assignment', 'disciplinary_action', 'system_alert') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    related_employee_id CHAR(36),
    related_appraisal_id CHAR(36),
    related_question_ids JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (related_employee_id) REFERENCES profiles(id) ON DELETE SET NULL,
    FOREIGN KEY (related_appraisal_id) REFERENCES appraisals(id) ON DELETE SET NULL,
    
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (is_read),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_created (created_at)
);

-- Audit trail for system actions
CREATE TABLE audit_logs (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36),
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id CHAR(36),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
    
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_action (action_type),
    INDEX idx_audit_table (table_name),
    INDEX idx_audit_record (record_id),
    INDEX idx_audit_created (created_at)
);
```

### 4.2 Backend API Architecture

#### 4.2.1 Express.js Server Structure
```typescript
// server.ts - Main server file
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Import routes
import authRoutes from './routes/auth';
import appraisalRoutes from './routes/appraisals';
import employeeRoutes from './routes/employees';
import trainingRoutes from './routes/training';
import notificationRoutes from './routes/notifications';

// Import middleware
import { authenticateToken } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { auditLogger } from './middleware/auditLogger';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/appraisals', authenticateToken, auditLogger, appraisalRoutes);
app.use('/api/employees', authenticateToken, auditLogger, employeeRoutes);
app.use('/api/training', authenticateToken, auditLogger, trainingRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);

// Error handling
app.use(errorHandler);

// Socket.IO for real-time notifications
io.use(authenticateSocketToken);
io.on('connection', (socket) => {
  socket.join(`user_${socket.userId}`);
});

export { app, server, io };
```

#### 4.2.2 Authentication Middleware
```typescript
// middleware/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { UserRepository } from '../repositories/UserRepository';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const user = await UserRepository.findById(decoded.userId);
    
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      department_id: user.department_id,
      line_manager_id: user.line_manager_id
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const generateTokens = (user: any) => {
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};
```

### 4.3 Repository Pattern for Database Access

#### 4.3.1 Base Repository
```typescript
// repositories/BaseRepository.ts
import mysql from 'mysql2/promise';
import { DatabaseConfig } from '../config/database';

export class BaseRepository {
  protected static pool = mysql.createPool(DatabaseConfig);

  protected static async executeQuery<T>(query: string, params: any[] = []): Promise<T[]> {
    const connection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(query, params);
      return rows as T[];
    } finally {
      connection.release();
    }
  }

  protected static async executeTransaction<T>(
    queries: Array<{ query: string; params: any[] }>
  ): Promise<T[]> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      
      const results: T[] = [];
      for (const { query, params } of queries) {
        const [rows] = await connection.execute(query, params);
        results.push(rows as T);
      }
      
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
```

#### 4.3.2 Appraisal Repository
```typescript
// repositories/AppraisalRepository.ts
import { BaseRepository } from './BaseRepository';

export class AppraisalRepository extends BaseRepository {
  static async getAppraisalsByEmployee(employeeId: string, cycleId?: string) {
    const query = `
      SELECT 
        a.*,
        c.name as cycle_name,
        c.quarter,
        c.year,
        p.first_name,
        p.last_name
      FROM appraisals a
      JOIN appraisal_cycles c ON a.cycle_id = c.id
      JOIN profiles p ON a.employee_id = p.id
      WHERE a.employee_id = ?
      ${cycleId ? 'AND a.cycle_id = ?' : ''}
      ORDER BY a.created_at DESC
    `;
    
    const params = cycleId ? [employeeId, cycleId] : [employeeId];
    return this.executeQuery(query, params);
  }

  static async getAppraisalResponses(appraisalId: string) {
    const query = `
      SELECT 
        ar.*,
        aq.question_text,
        aq.question_type,
        aq.weight,
        aqs.name as section_name,
        aqs.weight as section_weight,
        aqs.max_score as section_max_score
      FROM appraisal_responses ar
      JOIN appraisal_questions aq ON ar.question_id = aq.id
      LEFT JOIN appraisal_question_sections aqs ON aq.section_id = aqs.id
      WHERE ar.appraisal_id = ?
      ORDER BY aqs.sort_order, aq.sort_order
    `;
    
    return this.executeQuery(query, [appraisalId]);
  }

  static async calculatePerformanceScore(appraisalId: string) {
    const responses = await this.getAppraisalResponses(appraisalId);
    
    // Group responses by section
    const sectionScores: { [key: string]: any } = {};
    let overallScore = 0;
    let totalWeight = 0;
    let noteworthyCount = 0;
    let totalSections = 0;

    responses.forEach((response: any) => {
      const sectionId = response.section_id || 'default';
      const sectionName = response.section_name || 'General';
      
      if (!sectionScores[sectionId]) {
        sectionScores[sectionId] = {
          name: sectionName,
          weight: response.section_weight || 1,
          maxScore: response.section_max_score || 5,
          totalPoints: 0,
          maxPossiblePoints: 0,
          questions: []
        };
        totalSections++;
      }

      // Use committee rating if available, otherwise manager rating, otherwise employee rating
      const finalRating = response.committee_rating || response.mgr_rating || response.emp_rating || 0;
      const questionWeight = response.weight || 1;
      
      sectionScores[sectionId].totalPoints += finalRating * questionWeight;
      sectionScores[sectionId].maxPossiblePoints += sectionScores[sectionId].maxScore * questionWeight;
      sectionScores[sectionId].questions.push({
        questionId: response.question_id,
        rating: finalRating,
        weight: questionWeight
      });

      // Check for noteworthy performance (assuming 5 is exceptional)
      if (finalRating === 5) {
        noteworthyCount++;
      }
    });

    // Calculate section scores and overall weighted score
    Object.values(sectionScores).forEach((section: any) => {
      // Calculate section percentage
      const sectionPercentage = (section.totalPoints / section.maxPossiblePoints) * 100;
      
      // Apply section-specific caps
      let cappedPercentage = sectionPercentage;
      if (section.name.toLowerCase().includes('competencies')) {
        cappedPercentage = Math.min(sectionPercentage, 80);
      } else if (section.name.toLowerCase().includes('leadership')) {
        cappedPercentage = Math.min(sectionPercentage, 90);
      }
      
      section.score = cappedPercentage;
      section.weightedScore = cappedPercentage * section.weight;
      
      overallScore += section.weightedScore;
      totalWeight += section.weight;
    });

    // Calculate final score
    const baseScore = totalWeight > 0 ? overallScore / totalWeight : 0;
    
    // Add noteworthy bonus (up to 5% bonus)
    const noteworthyBonus = totalSections > 0 ? (noteworthyCount / responses.length) * 5 : 0;
    
    const finalScore = Math.min(baseScore + noteworthyBonus, 100);

    // Determine performance band
    let performanceBand = '';
    if (finalScore >= 91) performanceBand = 'Exceptional';
    else if (finalScore >= 81) performanceBand = 'Excellent';
    else if (finalScore >= 71) performanceBand = 'Very Good';
    else if (finalScore >= 61) performanceBand = 'Good';
    else if (finalScore >= 51) performanceBand = 'Fair';
    else performanceBand = 'Poor';

    return {
      overallScore: finalScore,
      performanceBand,
      sectionScores,
      noteworthyBonus
    };
  }

  static async updateAppraisalScore(appraisalId: string, scoreData: any) {
    const query = `
      UPDATE appraisals 
      SET overall_score = ?, performance_band = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    return this.executeQuery(query, [
      scoreData.overallScore,
      scoreData.performanceBand,
      appraisalId
    ]);
  }
}
```

### 4.4 API Endpoints Documentation

#### 4.4.1 Authentication Endpoints
```typescript
// routes/auth.ts
import express from 'express';
import bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/UserRepository';
import { generateTokens } from '../middleware/auth';
import { validateEmail, sendVerificationEmail } from '../utils/emailUtils';

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, departmentId } = req.body;
    
    // Validate email domain
    const allowedDomains = [
      '@cnthlimited.com',
      '@nigerianexportershub.com',
      '@zeenabgroup.com',
      '@zeenabfoods.com',
      '@habrisfoods.com',
      '@azenaboroilpalms.com'
    ];
    
    const emailDomain = email.substring(email.lastIndexOf('@'));
    if (!allowedDomains.includes(emailDomain)) {
      return res.status(400).json({ 
        error: 'Email domain not allowed. Please use a corporate email.' 
      });
    }

    // Check if user already exists
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = await UserRepository.create({
      email,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      department_id: departmentId,
      email_verification_token: generateVerificationToken()
    });

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({ 
      message: 'User created successfully. Please check your email for verification.' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await UserRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.email_verified) {
      return res.status(401).json({ error: 'Please verify your email before logging in' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token in database
    await UserRepository.saveRefreshToken(user.id, refreshToken, req.ip, req.get('User-Agent'));

    // Update last login
    await UserRepository.updateLastLogin(user.id);

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        departmentId: user.department_id,
        lineManagerId: user.line_manager_id
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const session = await UserRepository.findSessionByRefreshToken(refreshToken);
    if (!session || session.expires_at < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await UserRepository.findById(session.user_id);
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Update refresh token in database
    await UserRepository.updateRefreshToken(session.id, newRefreshToken);

    res.json({
      accessToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

#### 4.4.2 Appraisal Endpoints
```typescript
// routes/appraisals.ts
import express from 'express';
import { AppraisalRepository } from '../repositories/AppraisalRepository';
import { requireRole } from '../middleware/auth';
import { NotificationService } from '../services/NotificationService';

const router = express.Router();

// GET /api/appraisals/my-appraisals
router.get('/my-appraisals', async (req, res) => {
  try {
    const { cycleId } = req.query;
    const appraisals = await AppraisalRepository.getAppraisalsByEmployee(
      req.user.id, 
      cycleId as string
    );
    res.json(appraisals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appraisals' });
  }
});

// GET /api/appraisals/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user has permission to view this appraisal
    const appraisal = await AppraisalRepository.findById(id);
    if (!appraisal) {
      return res.status(404).json({ error: 'Appraisal not found' });
    }

    const hasPermission = 
      appraisal.employee_id === req.user.id || // Own appraisal
      appraisal.manager_id === req.user.id || // Manager review
      ['hr', 'admin'].includes(req.user.role); // HR/Admin access

    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const responses = await AppraisalRepository.getAppraisalResponses(id);
    res.json({ appraisal, responses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch appraisal' });
  }
});

// PUT /api/appraisals/:id/submit
router.put('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    
    const appraisal = await AppraisalRepository.findById(id);
    if (!appraisal || appraisal.employee_id !== req.user.id) {
      return res.status(404).json({ error: 'Appraisal not found' });
    }

    if (appraisal.status !== 'draft') {
      return res.status(400).json({ error: 'Can only submit draft appraisals' });
    }

    // Calculate performance score
    const scoreData = await AppraisalRepository.calculatePerformanceScore(id);
    
    // Update appraisal status and score
    await AppraisalRepository.updateAppraisalStatus(id, 'submitted', {
      employee_submitted_at: new Date(),
      overall_score: scoreData.overallScore,
      performance_band: scoreData.performanceBand
    });

    // Store detailed analytics
    await AppraisalRepository.updatePerformanceAnalytics(id, scoreData);

    // Notify line manager
    if (appraisal.manager_id) {
      await NotificationService.notifyAppraisalSubmission(
        appraisal.manager_id,
        req.user.id,
        id
      );
    }

    res.json({ 
      message: 'Appraisal submitted successfully',
      score: scoreData.overallScore,
      performanceBand: scoreData.performanceBand
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit appraisal' });
  }
});

// PUT /api/appraisals/:id/manager-review
router.put('/:id/manager-review', requireRole(['manager', 'hr', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { managerComments, ratings } = req.body;
    
    const appraisal = await AppraisalRepository.findById(id);
    if (!appraisal) {
      return res.status(404).json({ error: 'Appraisal not found' });
    }

    // Check if user is the assigned manager or has HR/Admin role
    const hasPermission = 
      appraisal.manager_id === req.user.id ||
      ['hr', 'admin'].includes(req.user.role);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (appraisal.status !== 'submitted') {
      return res.status(400).json({ error: 'Can only review submitted appraisals' });
    }

    // Update manager ratings
    await AppraisalRepository.updateManagerRatings(id, ratings, req.user.id);

    // Recalculate performance score with manager ratings
    const scoreData = await AppraisalRepository.calculatePerformanceScore(id);

    // Update appraisal status
    await AppraisalRepository.updateAppraisalStatus(id, 'manager_review', {
      manager_reviewed_at: new Date(),
      manager_reviewed_by: req.user.id,
      mgr_comments: managerComments,
      overall_score: scoreData.overallScore,
      performance_band: scoreData.performanceBand
    });

    // Notify HR for committee review if required
    await NotificationService.notifyManagerReviewComplete(id, req.user.id);

    res.json({ message: 'Manager review completed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete manager review' });
  }
});

export default router;
```

## 5. Core Business Logic (Detailed)

### 5.1 Performance Calculation Algorithm (Comprehensive)

#### 5.1.1 Detailed Scoring Algorithm
```typescript
// services/PerformanceCalculationService.ts
export class PerformanceCalculationService {
  
  /**
   * Calculate comprehensive performance score for an appraisal
   * 
   * Algorithm Steps:
   * 1. Group responses by section
   * 2. Calculate section scores with weights
   * 3. Apply section-specific caps
   * 4. Calculate weighted overall score
   * 5. Apply noteworthy bonus
   * 6. Determine performance band
   * 7. Generate recommendations
   */
  static async calculatePerformanceScore(appraisalId: string): Promise<PerformanceScoreResult> {
    const responses = await AppraisalRepository.getAppraisalResponses(appraisalId);
    
    if (!responses.length) {
      throw new Error('No responses found for appraisal');
    }

    // Step 1: Group responses by section
    const sectionMap = new Map<string, SectionData>();
    let totalResponses = 0;
    let noteworthyCount = 0;

    responses.forEach((response: AppraisalResponse) => {
      const sectionId = response.section_id || 'default';
      const sectionName = response.section_name || 'General';
      
      if (!sectionMap.has(sectionId)) {
        sectionMap.set(sectionId, {
          id: sectionId,
          name: sectionName,
          weight: response.section_weight || 1.0,
          maxScore: response.section_max_score || 5,
          responses: [],
          totalPoints: 0,
          maxPossiblePoints: 0,
          rawScore: 0,
          cappedScore: 0,
          weightedScore: 0
        });
      }

      const section = sectionMap.get(sectionId)!;
      
      // Determine final rating priority: committee > manager > employee
      const finalRating = response.committee_rating ?? 
                         response.mgr_rating ?? 
                         response.emp_rating ?? 0;
      
      const questionWeight = response.weight || 1.0;
      
      // Add response to section
      section.responses.push({
        questionId: response.question_id,
        questionText: response.question_text,
        employeeRating: response.emp_rating,
        managerRating: response.mgr_rating,
        committeeRating: response.committee_rating,
        finalRating,
        weight: questionWeight,
        empComment: response.emp_comment,
        mgrComment: response.mgr_comment,
        committeeComment: response.committee_comment
      });

      // Calculate section totals
      section.totalPoints += finalRating * questionWeight;
      section.maxPossiblePoints += section.maxScore * questionWeight;
      
      totalResponses++;
      
      // Count noteworthy performances (maximum rating)
      if (finalRating === section.maxScore) {
        noteworthyCount++;
      }
    });

    // Step 2: Calculate section scores
    const sectionResults: SectionResult[] = [];
    let overallWeightedScore = 0;
    let totalSectionWeight = 0;

    sectionMap.forEach((section) => {
      // Calculate raw percentage score
      const rawPercentage = section.maxPossiblePoints > 0 
        ? (section.totalPoints / section.maxPossiblePoints) * 100 
        : 0;

      // Step 3: Apply section-specific caps
      let cappedPercentage = rawPercentage;
      
      // Apply business rule caps based on section type
      if (this.isCoreCompetencySection(section.name)) {
        cappedPercentage = Math.min(rawPercentage, 80); // Cap at 80%
      } else if (this.isLeadershipSection(section.name)) {
        cappedPercentage = Math.min(rawPercentage, 90); // Cap at 90%
      }
      // Key Performance Areas have no cap (full weight)

      const weightedScore = cappedPercentage * section.weight;
      
      overallWeightedScore += weightedScore;
      totalSectionWeight += section.weight;

      sectionResults.push({
        sectionId: section.id,
        sectionName: section.name,
        weight: section.weight,
        rawScore: rawPercentage,
        cappedScore: cappedPercentage,
        weightedScore: weightedScore,
        maxPossibleScore: 100,
        responses: section.responses,
        recommendations: this.generateSectionRecommendations(section, cappedPercentage)
      });
    });

    // Step 4: Calculate base overall score
    const baseOverallScore = totalSectionWeight > 0 
      ? overallWeightedScore / totalSectionWeight 
      : 0;

    // Step 5: Apply noteworthy bonus (up to 5% for exceptional performance)
    const noteworthyPercentage = totalResponses > 0 
      ? noteworthyCount / totalResponses 
      : 0;
    const noteworthyBonus = noteworthyPercentage * 5; // Max 5% bonus

    // Final score (capped at 100%)
    const finalScore = Math.min(baseOverallScore + noteworthyBonus, 100);

    // Step 6: Determine performance band
    const performanceBand = this.calculatePerformanceBand(finalScore);

    // Step 7: Generate comprehensive recommendations
    const recommendations = this.generateOverallRecommendations(
      sectionResults, 
      finalScore, 
      performanceBand
    );

    // Step 8: Calculate trends (if historical data available)
    const trends = await this.calculatePerformanceTrends(
      responses[0].employee_id,
      responses[0].cycle_id
    );

    return {
      overallScore: Math.round(finalScore * 100) / 100, // Round to 2 decimals
      performanceBand,
      sectionResults,
      noteworthyBonus: Math.round(noteworthyBonus * 100) / 100,
      recommendations,
      trends,
      calculationMetadata: {
        totalResponses,
        noteworthyCount,
        baseScore: baseOverallScore,
        calculatedAt: new Date()
      }
    };
  }

  /**
   * Determine if section is a Core Competency (capped at 80%)
   */
  private static isCoreCompetencySection(sectionName: string): boolean {
    const competencyKeywords = [
      'competenc', 'skill', 'technical', 'professional', 
      'knowledge', 'expertise', 'capability'
    ];
    
    return competencyKeywords.some(keyword => 
      sectionName.toLowerCase().includes(keyword)
    );
  }

  /**
   * Determine if section is Leadership-related (capped at 90%)
   */
  private static isLeadershipSection(sectionName: string): boolean {
    const leadershipKeywords = [
      'leadership', 'management', 'supervisor', 'team lead',
      'mentoring', 'coaching', 'delegation'
    ];
    
    return leadershipKeywords.some(keyword => 
      sectionName.toLowerCase().includes(keyword)
    );
  }

  /**
   * Calculate performance band based on score thresholds
   */
  private static calculatePerformanceBand(score: number): string {
    if (score >= 91) return 'Exceptional';
    if (score >= 81) return 'Excellent';
    if (score >= 71) return 'Very Good';
    if (score >= 61) return 'Good';
    if (score >= 51) return 'Fair';
    return 'Poor';
  }

  /**
   * Generate section-specific recommendations
   */
  private static generateSectionRecommendations(
    section: SectionData, 
    score: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (score < 60) {
      recommendations.push(`Significant improvement needed in ${section.name}`);
      recommendations.push(`Consider targeted training for ${section.name} competencies`);
    } else if (score < 80) {
      recommendations.push(`Moderate improvement opportunity in ${section.name}`);
      recommendations.push(`Focus on developing stronger ${section.name} skills`);
    } else if (score >= 90) {
      recommendations.push(`Exceptional performance in ${section.name}`);
      recommendations.push(`Consider mentoring others in ${section.name}`);
    }

    // Analyze individual question performance
    const lowPerformingQuestions = section.responses.filter(r => r.finalRating < 3);
    if (lowPerformingQuestions.length > 0) {
      recommendations.push(
        `Address specific areas: ${lowPerformingQuestions.map(q => 
          q.questionText.substring(0, 50) + '...'
        ).join(', ')}`
      );
    }

    return recommendations;
  }

  /**
   * Generate overall performance recommendations
   */
  private static generateOverallRecommendations(
    sectionResults: SectionResult[],
    overallScore: number,
    performanceBand: string
  ): OverallRecommendations {
    const strengths: string[] = [];
    const developmentAreas: string[] = [];
    const actionItems: string[] = [];
    const trainingNeeds: string[] = [];

    // Identify strengths (sections scoring >= 85%)
    sectionResults
      .filter(section => section.cappedScore >= 85)
      .forEach(section => {
        strengths.push(`Strong performance in ${section.sectionName}`);
      });

    // Identify development areas (sections scoring < 70%)
    sectionResults
      .filter(section => section.cappedScore < 70)
      .forEach(section => {
        developmentAreas.push(`Improvement needed in ${section.sectionName}`);
        trainingNeeds.push(`${section.sectionName} training program`);
      });

    // Generate action items based on performance band
    switch (performanceBand) {
      case 'Exceptional':
        actionItems.push('Consider for leadership development programs');
        actionItems.push('Explore stretch assignments and increased responsibilities');
        actionItems.push('Potential candidate for mentoring junior staff');
        break;
      
      case 'Excellent':
        actionItems.push('Continue current high performance trajectory');
        actionItems.push('Identify opportunities for skill diversification');
        break;
      
      case 'Very Good':
        actionItems.push('Focus on consistency across all performance areas');
        actionItems.push('Develop expertise in identified strength areas');
        break;
      
      case 'Good':
        actionItems.push('Create development plan for improvement areas');
        actionItems.push('Set specific, measurable goals for next review period');
        break;
      
      case 'Fair':
        actionItems.push('Implement comprehensive performance improvement plan');
        actionItems.push('Increase frequency of check-ins with line manager');
        actionItems.push('Consider formal training programs');
        break;
      
      case 'Poor':
        actionItems.push('Urgent performance improvement plan required');
        actionItems.push('Weekly one-on-one meetings with supervisor');
        actionItems.push('Consider disciplinary action if no improvement');
        trainingNeeds.push('Basic skills refresher training');
        break;
    }

    return {
      strengths,
      developmentAreas,
      actionItems,
      trainingNeeds,
      overallAssessment: this.generateOverallAssessment(overallScore, performanceBand)
    };
  }

  /**
   * Calculate performance trends compared to previous cycles
   */
  private static async calculatePerformanceTrends(
    employeeId: string,
    currentCycleId: string
  ): Promise<PerformanceTrends> {
    const historicalData = await AppraisalRepository.getHistoricalPerformance(
      employeeId,
      currentCycleId,
      3 // Last 3 cycles
    );

    if (historicalData.length < 2) {
      return {
        trend: 'insufficient_data',
        trendPercentage: 0,
        historicalScores: [],
        prediction: 'Unable to predict without historical data'
      };
    }

    const scores = historicalData.map(h => h.overall_score);
    const latestScore = scores[0];
    const previousScore = scores[1];
    
    const trendPercentage = ((latestScore - previousScore) / previousScore) * 100;
    
    let trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
    if (Math.abs(trendPercentage) < 2) {
      trend = 'stable';
    } else if (trendPercentage > 0) {
      trend = 'improving';
    } else {
      trend = 'declining';
    }

    // Simple linear prediction for next cycle
    const averageChange = scores.length > 2 
      ? (scores[0] - scores[scores.length - 1]) / (scores.length - 1)
      : trendPercentage;
    
    const predictedScore = Math.max(0, Math.min(100, latestScore + averageChange));
    const prediction = `Projected next cycle score: ${predictedScore.toFixed(1)}%`;

    return {
      trend,
      trendPercentage: Math.round(trendPercentage * 100) / 100,
      historicalScores: scores,
      prediction
    };
  }

  /**
   * Generate overall assessment summary
   */
  private static generateOverallAssessment(
    score: number, 
    performanceBand: string
  ): string {
    const assessments = {
      'Exceptional': `Outstanding performance with an overall score of ${score.toFixed(1)}%. This employee consistently exceeds expectations and demonstrates exceptional capabilities across all areas.`,
      
      'Excellent': `Strong performance with an overall score of ${score.toFixed(1)}%. This employee regularly meets and often exceeds expectations with high-quality work.`,
      
      'Very Good': `Good performance with an overall score of ${score.toFixed(1)}%. This employee consistently meets expectations with occasional instances of exceeding them.`,
      
      'Good': `Satisfactory performance with an overall score of ${score.toFixed(1)}%. This employee generally meets expectations but has opportunities for improvement.`,
      
      'Fair': `Below-average performance with an overall score of ${score.toFixed(1)}%. This employee requires support and development to meet expectations consistently.`,
      
      'Poor': `Unsatisfactory performance with an overall score of ${score.toFixed(1)}%. Immediate intervention and improvement plan required.`
    };

    return assessments[performanceBand as keyof typeof assessments] || 
           `Performance score: ${score.toFixed(1)}% (${performanceBand})`;
  }
}

// TypeScript interfaces for type safety
interface SectionData {
  id: string;
  name: string;
  weight: number;
  maxScore: number;
  responses: QuestionResponse[];
  totalPoints: number;
  maxPossiblePoints: number;
  rawScore: number;
  cappedScore: number;
  weightedScore: number;
}

interface QuestionResponse {
  questionId: string;
  questionText: string;
  employeeRating: number | null;
  managerRating: number | null;
  committeeRating: number | null;
  finalRating: number;
  weight: number;
  empComment?: string;
  mgrComment?: string;
  committeeComment?: string;
}

interface SectionResult {
  sectionId: string;
  sectionName: string;
  weight: number;
  rawScore: number;
  cappedScore: number;
  weightedScore: number;
  maxPossibleScore: number;
  responses: QuestionResponse[];
  recommendations: string[];
}

interface OverallRecommendations {
  strengths: string[];
  developmentAreas: string[];
  actionItems: string[];
  trainingNeeds: string[];
  overallAssessment: string;
}

interface PerformanceTrends {
  trend: 'improving' | 'declining' | 'stable' | 'insufficient_data';
  trendPercentage: number;
  historicalScores: number[];
  prediction: string;
}

interface PerformanceScoreResult {
  overallScore: number;
  performanceBand: string;
  sectionResults: SectionResult[];
  noteworthyBonus: number;
  recommendations: OverallRecommendations;
  trends: PerformanceTrends;
  calculationMetadata: {
    totalResponses: number;
    noteworthyCount: number;
    baseScore: number;
    calculatedAt: Date;
  };
}
```

### 5.2 Training Management Business Logic

#### 5.2.1 Training Assignment and Failure Handling
```typescript
// services/TrainingService.ts
export class TrainingService {
  
  /**
   * Assign training to employee with automatic failure tracking
   */
  static async assignTraining(assignmentData: TrainingAssignmentData): Promise<string> {
    const {
      employeeId,
      trainingId,
      assignedBy,
      dueDate,
      requestId
    } = assignmentData;

    // Check if employee already has this training assigned
    const existingAssignment = await TrainingRepository.findExistingAssignment(
      employeeId,
      trainingId
    );

    if (existingAssignment && existingAssignment.status !== 'failed') {
      throw new Error('Employee already has this training assigned');
    }

    // Create new assignment
    const assignmentId = await TrainingRepository.createAssignment({
      employeeId,
      trainingId,
      assignedBy,
      dueDate,
      status: 'assigned',
      requestId
    });

    // Initialize progress tracking
    await TrainingRepository.createProgressRecord(assignmentId);

    // Send notification to employee
    await NotificationService.notifyTrainingAssignment(employeeId, trainingId, assignedBy);

    return assignmentId;
  }

  /**
   * Handle quiz attempt and check for failures
   */
  static async processQuizAttempt(attemptData: QuizAttemptData): Promise<QuizResult> {
    const {
      assignmentId,
      answers,
      timeSpent
    } = attemptData;

    const assignment = await TrainingRepository.getAssignmentById(assignmentId);
    if (!assignment) {
      throw new Error('Training assignment not found');
    }

    const training = await TrainingRepository.getTrainingById(assignment.training_id);
    if (!training) {
      throw new Error('Training not found');
    }

    // Get quiz questions
    const questions = await TrainingRepository.getQuizQuestions(assignment.training_id);
    
    // Calculate score
    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach(question => {
      totalPoints += question.points;
      const userAnswer = answers[question.id];
      
      if (userAnswer && userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim()) {
        correctAnswers++;
        earnedPoints += question.points;
      }
    });

    const scorePercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = scorePercentage >= training.pass_mark;

    // Get current attempt number
    const attemptNumber = await TrainingRepository.getNextAttemptNumber(assignmentId);

    // Create quiz attempt record
    await TrainingRepository.createQuizAttempt({
      assignmentId,
      attemptNumber,
      scorePercentage: Math.round(scorePercentage),
      passed,
      answers,
      timeSpent,
      completedAt: new Date()
    });

    if (passed) {
      // Mark training as completed
      await TrainingRepository.updateAssignmentStatus(assignmentId, 'completed');
      await TrainingRepository.updateProgress(assignmentId, {
        progressPercentage: 100,
        completedAt: new Date()
      });

      return {
        passed: true,
        score: scorePercentage,
        attemptNumber,
        message: `Congratulations! You passed with ${scorePercentage.toFixed(1)}%`
      };
    } else {
      // Check if this was the final attempt
      if (attemptNumber >= training.max_attempts) {
        // Mark as failed and create disciplinary panel
        await TrainingRepository.updateAssignmentStatus(assignmentId, 'failed');
        await this.createDisciplinaryPanel(assignment.employee_id, assignmentId);

        return {
          passed: false,
          score: scorePercentage,
          attemptNumber,
          message: `Training failed after ${training.max_attempts} attempts. A disciplinary panel will be scheduled.`,
          finalAttempt: true
        };
      } else {
        const remainingAttempts = training.max_attempts - attemptNumber;
        return {
          passed: false,
          score: scorePercentage,
          attemptNumber,
          message: `Score: ${scorePercentage.toFixed(1)}%. You need ${training.pass_mark}% to pass. ${remainingAttempts} attempts remaining.`,
          remainingAttempts
        };
      }
    }
  }

  /**
   * Create disciplinary panel for training failure
   */
  private static async createDisciplinaryPanel(
    employeeId: string,
    trainingAssignmentId: string
  ): Promise<void> {
    // Get employee's line manager and HR contacts for panel
    const employee = await UserRepository.findById(employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }

    const panelMembers: string[] = [];
    
    // Add line manager
    if (employee.line_manager_id) {
      panelMembers.push(employee.line_manager_id);
    }

    // Add HR representatives
    const hrUsers = await UserRepository.findByRole('hr');
    if (hrUsers.length > 0) {
      panelMembers.push(hrUsers[0].id); // Add primary HR contact
    }

    // Add department head if different from line manager
    if (employee.department_id) {
      const department = await DepartmentRepository.findById(employee.department_id);
      if (department && department.line_manager_id && 
          !panelMembers.includes(department.line_manager_id)) {
        panelMembers.push(department.line_manager_id);
      }
    }

    if (panelMembers.length === 0) {
      throw new Error('No panel members available for disciplinary review');
    }

    // Create disciplinary panel
    const panelId = await TrainingRepository.createDisciplinaryPanel({
      employeeId,
      trainingAssignmentId,
      panelMembers,
      status: 'pending',
      createdAt: new Date()
    });

    // Notify all panel members
    for (const memberId of panelMembers) {
      await NotificationService.notifyDisciplinaryPanelCreated(
        memberId,
        employeeId,
        panelId
      );
    }
  }
}

interface TrainingAssignmentData {
  employeeId: string;
  trainingId: string;
  assignedBy: string;
  dueDate: Date;
  requestId?: string;
}

interface QuizAttemptData {
  assignmentId: string;
  answers: { [questionId: string]: string };
  timeSpent: number;
}

interface QuizResult {
  passed: boolean;
  score: number;
  attemptNumber: number;
  message: string;
  finalAttempt?: boolean;
  remainingAttempts?: number;
}
```

### 5.3 Notification System Logic

#### 5.3.1 Real-time Notification Service
```typescript
// services/NotificationService.ts
import { io } from '../server';

export class NotificationService {
  
  /**
   * Notify line manager of question assignment
   */
  static async notifyQuestionAssignment(
    employeeId: string,
    questionIds: string[],
    assignedBy: string
  ): Promise<void> {
    const employee = await UserRepository.findById(employeeId);
    if (!employee || !employee.line_manager_id) {
      return;
    }

    const assigner = await UserRepository.findById(assignedBy);
    const questions = await AppraisalRepository.getQuestionsByIds(questionIds);

    const notification = {
      userId: employee.line_manager_id,
      type: 'question_assignment',
      title: 'New Questions Assigned to Team Member',
      message: `${assigner?.first_name} ${assigner?.last_name} assigned ${questions.length} questions to ${employee.first_name} ${employee.last_name}`,
      relatedEmployeeId: employeeId,
      relatedQuestionIds: questionIds
    };

    // Save to database
    await NotificationRepository.create(notification);

    // Send real-time notification
    io.to(`user_${employee.line_manager_id}`).emit('notification', notification);

    // Send email notification (optional)
    await this.sendEmailNotification(employee.line_manager_id, notification);
  }

  /**
   * Notify manager of appraisal submission
   */
  static async notifyAppraisalSubmission(
    managerId: string,
    employeeId: string,
    appraisalId: string
  ): Promise<void> {
    const employee = await UserRepository.findById(employeeId);
    if (!employee) return;

    const notification = {
      userId: managerId,
      type: 'appraisal_submission',
      title: 'Appraisal Submitted for Review',
      message: `${employee.first_name} ${employee.last_name} has submitted their appraisal for your review`,
      relatedEmployeeId: employeeId,
      relatedAppraisalId: appraisalId
    };

    await NotificationRepository.create(notification);
    io.to(`user_${managerId}`).emit('notification', notification);
  }

  /**
   * Notify HR of manager review completion
   */
  static async notifyManagerReviewComplete(
    appraisalId: string,
    managerId: string
  ): Promise<void> {
    const appraisal = await AppraisalRepository.findById(appraisalId);
    const manager = await UserRepository.findById(managerId);
    const employee = await UserRepository.findById(appraisal.employee_id);
    
    if (!appraisal || !manager || !employee) return;

    // Get all HR users
    const hrUsers = await UserRepository.findByRole('hr');

    for (const hrUser of hrUsers) {
      const notification = {
        userId: hrUser.id,
        type: 'manager_review',
        title: 'Manager Review Completed',
        message: `${manager.first_name} ${manager.last_name} completed review for ${employee.first_name} ${employee.last_name}`,
        relatedEmployeeId: employee.id,
        relatedAppraisalId: appraisalId
      };

      await NotificationRepository.create(notification);
      io.to(`user_${hrUser.id}`).emit('notification', notification);
    }
  }

  /**
   * Send email notification (if email service is configured)
   */
  private static async sendEmailNotification(
    userId: string,
    notification: any
  ): Promise<void> {
    const user = await UserRepository.findById(userId);
    if (!user) return;

    // Email implementation using NodeMailer
    const emailService = new EmailService();
    await emailService.sendNotificationEmail(
      user.email,
      notification.title,
      notification.message
    );
  }
}
```

## 6. Security Implementation

### 6.1 Application-Level Security (Replacing RLS)

```typescript
// middleware/securityMiddleware.ts
export class SecurityMiddleware {
  
  /**
   * Check if user can access appraisal
   */
  static canAccessAppraisal = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const appraisal = await AppraisalRepository.findById(id);
      
      if (!appraisal) {
        return res.status(404).json({ error: 'Appraisal not found' });
      }

      const hasAccess = 
        appraisal.employee_id === req.user.id || // Own appraisal
        appraisal.manager_id === req.user.id || // Manager review
        await this.isUserManager(req.user.id, appraisal.employee_id) || // Line manager
        ['hr', 'admin'].includes(req.user.role); // HR/Admin access

      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Access check failed' });
    }
  };

  /**
   * Check if user is manager of employee
   */
  private static async isUserManager(userId: string, employeeId: string): Promise<boolean> {
    const employee = await UserRepository.findById(employeeId);
    return employee?.line_manager_id === userId;
  }

  /**
   * Validate cycle accessibility for employees
   */
  static canAccessCycle = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { cycleId } = req.params;
      const cycle = await AppraisalRepository.getCycleById(cycleId);
      
      if (!cycle) {
        return res.status(404).json({ error: 'Cycle not found' });
      }

      // HR/Admin can access any cycle
      if (['hr', 'admin'].includes(req.user.role)) {
        return next();
      }

      // Employees can only access active cycles
      if (cycle.status !== 'active') {
        return res.status(403).json({ error: 'Cycle is not currently active' });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Cycle access check failed' });
    }
  };
}
```

### 6.2 Input Validation and Sanitization

```typescript
// middleware/validation.ts
import { body, param, validationResult } from 'express-validator';

export const validateAppraisalSubmission = [
  body('responses').isArray().withMessage('Responses must be an array'),
  body('responses.*.questionId').isUUID().withMessage('Invalid question ID'),
  body('responses.*.rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('responses.*.comment').optional().isLength({ max: 1000 }).withMessage('Comment too long'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateUserRegistration = [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').isLength({ min: 1, max: 50 }).withMessage('First name required'),
  body('lastName').isLength({ min: 1, max: 50 }).withMessage('Last name required'),
  
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];
```

## 7. Deployment and Configuration

### 7.1 Environment Configuration

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=employee_appraisal
DB_USER=app_user
DB_PASSWORD=secure_password

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@company.com

# Application Configuration
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://your-frontend-domain.com

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/application.log
```

### 7.2 Database Setup Scripts

```sql
-- Initial database setup
CREATE DATABASE employee_appraisal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE employee_appraisal;

-- Create database user
CREATE USER 'app_user'@'%' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON employee_appraisal.* TO 'app_user'@'%';
FLUSH PRIVILEGES;

-- Create tables (all the tables defined in section 4.1)
-- ... [All table creation scripts from above]

-- Insert initial data
INSERT INTO departments (id, name, description, is_active) VALUES
(UUID(), 'Human Resources', 'HR Department', TRUE),
(UUID(), 'Information Technology', 'IT Department', TRUE),
(UUID(), 'Finance', 'Finance Department', TRUE),
(UUID(), 'Operations', 'Operations Department', TRUE);

INSERT INTO training_categories (id, name, description, is_active) VALUES
(UUID(), 'Technical Skills', 'Technical and professional development', TRUE),
(UUID(), 'Leadership', 'Leadership and management training', TRUE),
(UUID(), 'Compliance', 'Regulatory and compliance training', TRUE),
(UUID(), 'Soft Skills', 'Communication and interpersonal skills', TRUE);

-- Create default appraisal sections
INSERT INTO appraisal_question_sections (id, name, description, weight, max_score, sort_order, is_active) VALUES
(UUID(), 'Key Performance Areas', 'Core job responsibilities and deliverables', 0.40, 5, 1, TRUE),
(UUID(), 'Core Competencies', 'Professional skills and knowledge', 0.30, 5, 2, TRUE),
(UUID(), 'Leadership Skills', 'Leadership and management capabilities', 0.20, 5, 3, TRUE),
(UUID(), 'Innovation & Development', 'Innovation and continuous improvement', 0.10, 5, 4, TRUE);
```

This comprehensive MySQL-based system requirements document provides detailed specifications for recreating the Employee Appraisal Management System with:

1. **Complete MySQL database schema** with proper indexing and relationships
2. **Detailed Node.js/Express backend** with JWT authentication
3. **Comprehensive business logic** including exact performance calculations
4. **Application-level security** replacing Supabase RLS
5. **Real-time notifications** using Socket.IO
6. **Complete API documentation** with all endpoints
7. **Training management** with failure tracking and disciplinary panels
8. **Performance analytics** with trend analysis and recommendations

The system maintains all original functionality while being completely implementable using MySQL and Node.js technologies.