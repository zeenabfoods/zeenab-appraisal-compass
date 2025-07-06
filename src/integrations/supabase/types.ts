export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      employee_appraisal_questions: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          cycle_id: string
          employee_id: string
          id: string
          is_active: boolean | null
          question_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          cycle_id: string
          employee_id: string
          id?: string
          is_active?: boolean | null
          question_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          cycle_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_performance_band: {
        Args: { score: number }
        Returns: string
      }
      delete_section_with_questions: {
        Args: { section_id_param: string }
        Returns: undefined
      }
      get_manager_appraisals: {
        Args: { manager_id_param: string }
        Returns: {
          appraisal_id: string
          employee_id: string
          employee_name: string
          cycle_name: string
          status: Database["public"]["Enums"]["appraisal_status"]
          submitted_at: string
          cycle_id: string
        }[]
      }
      get_team_members: {
        Args: { manager_id_param: string }
        Returns: {
          id: string
          first_name: string
          last_name: string
          email: string
          position: string
          department_name: string
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
          employee_id_param: string
          question_ids_param: string[]
          assigned_by_param: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
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
