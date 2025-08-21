export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      appraisal_cycles: {
        Row: {
          created_at: string
          created_by: string | null
          end_date: string
          id: string
          name: string
          quarter: number
          start_date: string
          status: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_date: string
          id?: string
          name: string
          quarter: number
          start_date: string
          status?: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_date?: string
          id?: string
          name?: string
          quarter?: number
          start_date?: string
          status?: string
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      appraisal_question_sections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_score: number
          name: string
          sort_order: number
          weight: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_score?: number
          name: string
          sort_order?: number
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_score?: number
          name?: string
          sort_order?: number
          weight?: number
        }
        Relationships: []
      }
      appraisal_questions: {
        Row: {
          applies_to_departments: string[] | null
          applies_to_roles: string[] | null
          created_at: string | null
          cycle_id: string | null
          id: string
          is_active: boolean | null
          is_required: boolean
          multiple_choice_options: string[]
          question_text: string
          question_type: string
          section_id: string | null
          sort_order: number | null
          weight: number
        }
        Insert: {
          applies_to_departments?: string[] | null
          applies_to_roles?: string[] | null
          created_at?: string | null
          cycle_id?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          multiple_choice_options?: string[]
          question_text: string
          question_type?: string
          section_id?: string | null
          sort_order?: number | null
          weight?: number
        }
        Update: {
          applies_to_departments?: string[] | null
          applies_to_roles?: string[] | null
          created_at?: string | null
          cycle_id?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean
          multiple_choice_options?: string[]
          question_text?: string
          question_type?: string
          section_id?: string | null
          sort_order?: number | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "appraisal_questions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "appraisal_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisal_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "appraisal_question_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      appraisal_responses: {
        Row: {
          appraisal_id: string | null
          committee_comment: string | null
          committee_rating: number | null
          created_at: string | null
          cycle_id: string | null
          emp_comment: string | null
          emp_rating: number | null
          employee_id: string | null
          employee_submitted_at: string | null
          hr_finalized_at: string | null
          id: string
          manager_id: string | null
          manager_reviewed_at: string | null
          mgr_comment: string | null
          mgr_rating: number | null
          question_id: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          appraisal_id?: string | null
          committee_comment?: string | null
          committee_rating?: number | null
          created_at?: string | null
          cycle_id?: string | null
          emp_comment?: string | null
          emp_rating?: number | null
          employee_id?: string | null
          employee_submitted_at?: string | null
          hr_finalized_at?: string | null
          id?: string
          manager_id?: string | null
          manager_reviewed_at?: string | null
          mgr_comment?: string | null
          mgr_rating?: number | null
          question_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          appraisal_id?: string | null
          committee_comment?: string | null
          committee_rating?: number | null
          created_at?: string | null
          cycle_id?: string | null
          emp_comment?: string | null
          emp_rating?: number | null
          employee_id?: string | null
          employee_submitted_at?: string | null
          hr_finalized_at?: string | null
          id?: string
          manager_id?: string | null
          manager_reviewed_at?: string | null
          mgr_comment?: string | null
          mgr_rating?: number | null
          question_id?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appraisal_responses_appraisal_id_fkey"
            columns: ["appraisal_id"]
            isOneToOne: false
            referencedRelation: "appraisals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisal_responses_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "appraisal_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisal_responses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisal_responses_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisal_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "appraisal_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      appraisal_sections: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_marks: number
          name: string
          sort_order: number | null
          weight: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_marks: number
          name: string
          sort_order?: number | null
          weight: number
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_marks?: number
          name?: string
          sort_order?: number | null
          weight?: number
        }
        Relationships: []
      }
      appraisals: {
        Row: {
          committee_comments: string | null
          committee_reviewed_at: string | null
          committee_reviewed_by: string | null
          completed_at: string | null
          created_at: string | null
          cycle_id: string | null
          emp_comments: string | null
          employee_id: string | null
          employee_submitted_at: string | null
          goals: string | null
          hr_finalized_at: string | null
          hr_reviewer_id: string | null
          id: string
          manager_id: string | null
          manager_reviewed_at: string | null
          manager_reviewed_by: string | null
          mgr_comments: string | null
          noteworthy: string | null
          overall_score: number | null
          performance_band: string | null
          quarter: number | null
          status: Database["public"]["Enums"]["appraisal_status"] | null
          submitted_at: string | null
          training_needs: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          committee_comments?: string | null
          committee_reviewed_at?: string | null
          committee_reviewed_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          cycle_id?: string | null
          emp_comments?: string | null
          employee_id?: string | null
          employee_submitted_at?: string | null
          goals?: string | null
          hr_finalized_at?: string | null
          hr_reviewer_id?: string | null
          id?: string
          manager_id?: string | null
          manager_reviewed_at?: string | null
          manager_reviewed_by?: string | null
          mgr_comments?: string | null
          noteworthy?: string | null
          overall_score?: number | null
          performance_band?: string | null
          quarter?: number | null
          status?: Database["public"]["Enums"]["appraisal_status"] | null
          submitted_at?: string | null
          training_needs?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          committee_comments?: string | null
          committee_reviewed_at?: string | null
          committee_reviewed_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          cycle_id?: string | null
          emp_comments?: string | null
          employee_id?: string | null
          employee_submitted_at?: string | null
          goals?: string | null
          hr_finalized_at?: string | null
          hr_reviewer_id?: string | null
          id?: string
          manager_id?: string | null
          manager_reviewed_at?: string | null
          manager_reviewed_by?: string | null
          mgr_comments?: string | null
          noteworthy?: string | null
          overall_score?: number | null
          performance_band?: string | null
          quarter?: number | null
          status?: Database["public"]["Enums"]["appraisal_status"] | null
          submitted_at?: string | null
          training_needs?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "appraisals_committee_reviewed_by_fkey"
            columns: ["committee_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisals_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "appraisal_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisals_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisals_hr_reviewer_id_fkey"
            columns: ["hr_reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisals_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appraisals_manager_reviewed_by_fkey"
            columns: ["manager_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          line_manager_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          line_manager_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          line_manager_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_line_manager_id_fkey"
            columns: ["line_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disciplinary_panels: {
        Row: {
          created_at: string
          decision: string | null
          decision_notes: string | null
          employee_id: string
          id: string
          panel_members: string[]
          review_date: string | null
          status: string
          training_assignment_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision?: string | null
          decision_notes?: string | null
          employee_id: string
          id?: string
          panel_members: string[]
          review_date?: string | null
          status?: string
          training_assignment_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision?: string | null
          decision_notes?: string | null
          employee_id?: string
          id?: string
          panel_members?: string[]
          review_date?: string | null
          status?: string
          training_assignment_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disciplinary_panels_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disciplinary_panels_training_assignment_id_fkey"
            columns: ["training_assignment_id"]
            isOneToOne: false
            referencedRelation: "training_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_appraisal_questions: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          cycle_id: string
          deleted_at: string | null
          employee_id: string
          id: string
          is_active: boolean | null
          question_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          cycle_id: string
          deleted_at?: string | null
          employee_id: string
          id?: string
          is_active?: boolean | null
          question_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          cycle_id?: string
          deleted_at?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_appraisal_questions_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_appraisal_questions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "appraisal_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_appraisal_questions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_appraisal_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "appraisal_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_questions: {
        Row: {
          created_at: string
          created_by: string | null
          employee_id: string
          id: string
          is_active: boolean
          is_required: boolean
          question_text: string
          question_type: string
          section_id: string | null
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          employee_id: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          question_text: string
          question_type?: string
          section_id?: string | null
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          employee_id?: string
          id?: string
          is_active?: boolean
          is_required?: boolean
          question_text?: string
          question_type?: string
          section_id?: string | null
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "employee_questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_questions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "appraisal_question_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      line_managers: {
        Row: {
          created_at: string
          department_id: string
          id: string
          is_active: boolean
          manager_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          is_active?: boolean
          manager_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          is_active?: boolean
          manager_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "line_managers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "line_managers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          related_appraisal_id: string | null
          related_employee_id: string | null
          related_question_ids: string[] | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          related_appraisal_id?: string | null
          related_employee_id?: string | null
          related_question_ids?: string[] | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          related_appraisal_id?: string | null
          related_employee_id?: string | null
          related_question_ids?: string[] | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_related_appraisal_id_fkey"
            columns: ["related_appraisal_id"]
            isOneToOne: false
            referencedRelation: "appraisals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_employee_id_fkey"
            columns: ["related_employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_analytics: {
        Row: {
          created_at: string
          cycle_id: string
          employee_id: string
          id: string
          overall_score: number | null
          performance_band: string | null
          predictions: Json | null
          recommendations: Json | null
          section_scores: Json | null
          trends: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          employee_id: string
          id?: string
          overall_score?: number | null
          performance_band?: string | null
          predictions?: Json | null
          recommendations?: Json | null
          section_scores?: Json | null
          trends?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          employee_id?: string
          id?: string
          overall_score?: number | null
          performance_band?: string | null
          predictions?: Json | null
          recommendations?: Json | null
          section_scores?: Json | null
          trends?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_analytics_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "appraisal_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_analytics_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          department: string | null
          department_id: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string
          line_manager_id: string | null
          position: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          department_id?: string | null
          email: string
          first_name: string
          id: string
          is_active?: boolean | null
          last_login?: string | null
          last_name: string
          line_manager_id?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string | null
          department?: string | null
          department_id?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string
          line_manager_id?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_line_manager_id_fkey"
            columns: ["line_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          assignment_id: string
          attempt_number: number
          completed_at: string | null
          id: string
          passed: boolean
          score_percentage: number | null
          started_at: string
          time_taken_minutes: number | null
        }
        Insert: {
          answers?: Json | null
          assignment_id: string
          attempt_number: number
          completed_at?: string | null
          id?: string
          passed?: boolean
          score_percentage?: number | null
          started_at?: string
          time_taken_minutes?: number | null
        }
        Update: {
          answers?: Json | null
          assignment_id?: string
          attempt_number?: number
          completed_at?: string | null
          id?: string
          passed?: boolean
          score_percentage?: number | null
          started_at?: string
          time_taken_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "training_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      training_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          due_date: string
          employee_id: string
          id: string
          request_id: string | null
          status: string
          training_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          due_date: string
          employee_id: string
          id?: string
          request_id?: string | null
          status?: string
          training_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          due_date?: string
          employee_id?: string
          id?: string
          request_id?: string | null
          status?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "training_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_assignments_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      training_progress: {
        Row: {
          assignment_id: string
          completed_at: string | null
          id: string
          last_position: string | null
          progress_percentage: number
          time_spent_minutes: number
          updated_at: string
        }
        Insert: {
          assignment_id: string
          completed_at?: string | null
          id?: string
          last_position?: string | null
          progress_percentage?: number
          time_spent_minutes?: number
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          completed_at?: string | null
          id?: string
          last_position?: string | null
          progress_percentage?: number
          time_spent_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "training_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_questions: {
        Row: {
          correct_answer: string
          id: string
          is_active: boolean
          options: Json | null
          points: number
          question_text: string
          question_type: string
          sort_order: number
          training_id: string
        }
        Insert: {
          correct_answer: string
          id?: string
          is_active?: boolean
          options?: Json | null
          points?: number
          question_text: string
          question_type?: string
          sort_order?: number
          training_id: string
        }
        Update: {
          correct_answer?: string
          id?: string
          is_active?: boolean
          options?: Json | null
          points?: number
          question_text?: string
          question_type?: string
          sort_order?: number
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_questions_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_requests: {
        Row: {
          category_id: string | null
          created_at: string
          employee_id: string
          id: string
          justification: string
          processed_at: string | null
          processed_by: string | null
          recommended_training_type: string | null
          requested_by: string
          status: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          employee_id: string
          id?: string
          justification: string
          processed_at?: string | null
          processed_by?: string | null
          recommended_training_type?: string | null
          requested_by: string
          status?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          justification?: string
          processed_at?: string | null
          processed_by?: string | null
          recommended_training_type?: string | null
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "training_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          category_id: string | null
          content_type: string
          content_url: string | null
          created_at: string
          created_by: string
          description: string | null
          duration_minutes: number | null
          file_path: string | null
          id: string
          is_active: boolean
          max_attempts: number
          pass_mark: number
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content_type: string
          content_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          duration_minutes?: number | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          max_attempts?: number
          pass_mark?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content_type?: string
          content_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          duration_minutes?: number | null
          file_path?: string | null
          id?: string
          is_active?: boolean
          max_attempts?: number
          pass_mark?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "training_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_performance_band: {
        Args: { score: number }
        Returns: string
      }
      complete_appraisal_cycle: {
        Args: { cycle_id_param: string }
        Returns: undefined
      }
      delete_appraisal_cycle_cascade: {
        Args: { cycle_id_param: string }
        Returns: undefined
      }
      delete_employee_appraisal_assignment: {
        Args: { assignment_id: string }
        Returns: undefined
      }
      delete_section_with_questions: {
        Args: { section_id_param: string }
        Returns: undefined
      }
      get_manager_appraisals: {
        Args: { manager_id_param: string }
        Returns: {
          appraisal_id: string
          cycle_id: string
          cycle_name: string
          employee_id: string
          employee_name: string
          status: Database["public"]["Enums"]["appraisal_status"]
          submitted_at: string
        }[]
      }
      get_team_members: {
        Args: { manager_id_param: string }
        Returns: {
          department_name: string
          email: string
          first_name: string
          id: string
          last_name: string
          position: string
        }[]
      }
      is_cycle_accessible_to_employee: {
        Args: { cycle_id_param: string }
        Returns: boolean
      }
      notify_hr_manager_review: {
        Args: { appraisal_id_param: string; manager_id_param: string }
        Returns: undefined
      }
      notify_line_manager: {
        Args: {
          assigned_by_param: string
          employee_id_param: string
          question_ids_param: string[]
        }
        Returns: undefined
      }
      notify_line_manager_submission: {
        Args: { appraisal_id_param: string; employee_id_param: string }
        Returns: undefined
      }
    }
    Enums: {
      appraisal_status:
        | "draft"
        | "submitted"
        | "manager_review"
        | "hr_review"
        | "completed"
        | "committee_review"
      user_role: "staff" | "manager" | "hr" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appraisal_status: [
        "draft",
        "submitted",
        "manager_review",
        "hr_review",
        "completed",
        "committee_review",
      ],
      user_role: ["staff", "manager", "hr", "admin"],
    },
  },
} as const
