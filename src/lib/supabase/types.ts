// Auto-generated from the live Supabase schema via generate_typescript_types.
// Regenerate whenever the schema changes — do not hand-edit.

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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      absence_requests: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          end_date: string
          hours: number | null
          id: string
          ratio_check_result: Json | null
          reason: string | null
          staff_id: string
          start_date: string
          status: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["absence_type"]
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          end_date: string
          hours?: number | null
          id?: string
          ratio_check_result?: Json | null
          reason?: string | null
          staff_id: string
          start_date: string
          status?: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["absence_type"]
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          end_date?: string
          hours?: number | null
          id?: string
          ratio_check_result?: Json | null
          reason?: string | null
          staff_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["request_status"]
          type?: Database["public"]["Enums"]["absence_type"]
        }
        Relationships: [
          {
            foreignKeyName: "absence_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after: Json | null
          before: Json | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clock_events: {
        Row: {
          created_at: string
          device_info: string | null
          event_type: string
          id: string
          occurred_at: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          staff_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clock_events_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          effective_from: string
          end_date: string | null
          id: string
          rate: number | null
          staff_id: string
          start_date: string
          type: Database["public"]["Enums"]["contract_type"]
          weekly_hours: number | null
        }
        Insert: {
          created_at?: string
          effective_from?: string
          end_date?: string | null
          id?: string
          rate?: number | null
          staff_id: string
          start_date: string
          type: Database["public"]["Enums"]["contract_type"]
          weekly_hours?: number | null
        }
        Update: {
          created_at?: string
          effective_from?: string
          end_date?: string | null
          id?: string
          rate?: number | null
          staff_id?: string
          start_date?: string
          type?: Database["public"]["Enums"]["contract_type"]
          weekly_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      holiday_ledger: {
        Row: {
          created_at: string
          event: Database["public"]["Enums"]["ledger_event"]
          hours: number
          id: string
          note: string | null
          related_absence_id: string | null
          running_balance: number
          staff_id: string
        }
        Insert: {
          created_at?: string
          event: Database["public"]["Enums"]["ledger_event"]
          hours: number
          id?: string
          note?: string | null
          related_absence_id?: string | null
          running_balance: number
          staff_id: string
        }
        Update: {
          created_at?: string
          event?: Database["public"]["Enums"]["ledger_event"]
          hours?: number
          id?: string
          note?: string | null
          related_absence_id?: string | null
          running_balance?: number
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holiday_ledger_related_absence_id_fkey"
            columns: ["related_absence_id"]
            isOneToOne: false
            referencedRelation: "absence_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holiday_ledger_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          leave_year_start_day: number
          leave_year_start_month: number
          name: string
          pay_period: string
        }
        Insert: {
          created_at?: string
          id?: string
          leave_year_start_day?: number
          leave_year_start_month?: number
          name: string
          pay_period?: string
        }
        Update: {
          created_at?: string
          id?: string
          leave_year_start_day?: number
          leave_year_start_month?: number
          name?: string
          pay_period?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          dob: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          id: string
          is_permanent: boolean
          leave_date: string | null
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"]
          status: Database["public"]["Enums"]["staff_status"]
        }
        Insert: {
          created_at?: string
          dob?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          id: string
          is_permanent?: boolean
          leave_date?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          status?: Database["public"]["Enums"]["staff_status"]
        }
        Update: {
          created_at?: string
          dob?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          id?: string
          is_permanent?: boolean
          leave_date?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"]
          status?: Database["public"]["Enums"]["staff_status"]
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_info: string | null
          expo_push_token: string
          id: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          expo_push_token: string
          id?: string
          staff_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          expo_push_token?: string
          id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qualifications: {
        Row: {
          created_at: string
          document_path: string | null
          expires_on: string | null
          id: string
          issued_on: string | null
          reference: string | null
          staff_id: string
          type: Database["public"]["Enums"]["qualification_type"]
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          document_path?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          reference?: string | null
          staff_id: string
          type: Database["public"]["Enums"]["qualification_type"]
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          document_path?: string | null
          expires_on?: string | null
          id?: string
          issued_on?: string | null
          reference?: string | null
          staff_id?: string
          type?: Database["public"]["Enums"]["qualification_type"]
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qualifications_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qualifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ratio_rules: {
        Row: {
          age_max: number
          age_min: number
          children_per_staff: number
          created_at: string
          enforcement: Database["public"]["Enums"]["enforcement_level"]
          id: string
        }
        Insert: {
          age_max: number
          age_min: number
          children_per_staff: number
          created_at?: string
          enforcement: Database["public"]["Enums"]["enforcement_level"]
          id?: string
        }
        Update: {
          age_max?: number
          age_min?: number
          children_per_staff?: number
          created_at?: string
          enforcement?: Database["public"]["Enums"]["enforcement_level"]
          id?: string
        }
        Relationships: []
      }
      shift_assignments: {
        Row: {
          created_at: string
          id: string
          shift_id: string
          staff_id: string | null
          status: Database["public"]["Enums"]["assignment_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          shift_id: string
          staff_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
        }
        Update: {
          created_at?: string
          id?: string
          shift_id?: string
          staff_id?: string | null
          status?: Database["public"]["Enums"]["assignment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string
          created_by: string | null
          end_time: string
          expected_children_8plus: number
          expected_children_under8: number
          id: string
          published_at: string | null
          role: string | null
          shift_date: string
          start_time: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_time: string
          expected_children_8plus?: number
          expected_children_under8?: number
          id?: string
          published_at?: string | null
          role?: string | null
          shift_date: string
          start_time: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_time?: string
          expected_children_8plus?: number
          expected_children_under8?: number
          id?: string
          published_at?: string | null
          role?: string | null
          shift_date?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_requests: {
        Row: {
          assigned_role: Database["public"]["Enums"]["staff_role"] | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          email: string
          full_name: string
          id: string
          status: Database["public"]["Enums"]["signup_request_status"]
        }
        Insert: {
          assigned_role?: Database["public"]["Enums"]["staff_role"] | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email: string
          full_name: string
          id?: string
          status?: Database["public"]["Enums"]["signup_request_status"]
        }
        Update: {
          assigned_role?: Database["public"]["Enums"]["staff_role"] | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          full_name?: string
          id?: string
          status?: Database["public"]["Enums"]["signup_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "signup_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      swap_requests: {
        Row: {
          assignment_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          from_staff_id: string
          id: string
          status: Database["public"]["Enums"]["swap_status"]
          to_staff_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          from_staff_id: string
          id?: string
          status?: Database["public"]["Enums"]["swap_status"]
          to_staff_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          from_staff_id?: string
          id?: string
          status?: Database["public"]["Enums"]["swap_status"]
          to_staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "swap_requests_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "shift_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_requests_from_staff_id_fkey"
            columns: ["from_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "swap_requests_to_staff_id_fkey"
            columns: ["to_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          amend_reason: string | null
          amended_by: string | null
          break_minutes: number
          clock_in: string | null
          clock_out: string | null
          created_at: string
          id: string
          shift_id: string | null
          source: Database["public"]["Enums"]["timesheet_source"]
          staff_id: string
          status: Database["public"]["Enums"]["timesheet_status"]
          variance_flags: string[]
          worked_minutes: number | null
        }
        Insert: {
          amend_reason?: string | null
          amended_by?: string | null
          break_minutes?: number
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          id?: string
          shift_id?: string | null
          source?: Database["public"]["Enums"]["timesheet_source"]
          staff_id: string
          status?: Database["public"]["Enums"]["timesheet_status"]
          variance_flags?: string[]
          worked_minutes?: number | null
        }
        Update: {
          amend_reason?: string | null
          amended_by?: string | null
          break_minutes?: number
          clock_in?: string | null
          clock_out?: string | null
          created_at?: string
          id?: string
          shift_id?: string | null
          source?: Database["public"]["Enums"]["timesheet_source"]
          staff_id?: string
          status?: Database["public"]["Enums"]["timesheet_status"]
          variance_flags?: string[]
          worked_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_amended_by_fkey"
            columns: ["amended_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_staff_id_fkey"
            columns: ["staff_id"]
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
      call_send_push: {
        Args: {
          p_body: string
          p_data?: Json
          p_staff_ids: string[]
          p_title: string
        }
        Returns: undefined
      }
      clock_in: {
        Args: { p_device_info?: string }
        Returns: {
          created_at: string
          device_info: string | null
          event_type: string
          id: string
          occurred_at: string
          staff_id: string
        }
        SetofOptions: {
          from: "*"
          to: "clock_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      clock_out: {
        Args: { p_device_info?: string }
        Returns: {
          created_at: string
          device_info: string | null
          event_type: string
          id: string
          occurred_at: string
          staff_id: string
        }
        SetofOptions: {
          from: "*"
          to: "clock_events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_own_account: { Args: never; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_manager_or_admin: { Args: never; Returns: boolean }
      list_active_staff: {
        Args: never
        Returns: {
          full_name: string
          id: string
          is_permanent: boolean
          role: Database["public"]["Enums"]["staff_role"]
        }[]
      }
    }
    Enums: {
      absence_type: "holiday" | "sickness" | "unpaid"
      assignment_status: "assigned" | "open" | "swap_pending"
      contract_type: "fixed_part_time" | "irregular"
      enforcement_level: "block" | "warn"
      ledger_event: "accrual" | "taken" | "adjustment" | "payout"
      qualification_type:
        | "dbs"
        | "first_aid"
        | "paediatric_first_aid"
        | "safeguarding"
        | "other"
      request_status: "pending" | "approved" | "declined" | "cancelled"
      signup_request_status: "pending" | "approved" | "declined"
      staff_role: "staff" | "manager" | "admin"
      staff_status: "active" | "leaver"
      swap_status:
        | "pending"
        | "colleague_accepted"
        | "approved"
        | "declined"
        | "cancelled"
      timesheet_source: "clock" | "manual"
      timesheet_status: "ok" | "variance" | "amended"
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
      absence_type: ["holiday", "sickness", "unpaid"],
      assignment_status: ["assigned", "open", "swap_pending"],
      contract_type: ["fixed_part_time", "irregular"],
      enforcement_level: ["block", "warn"],
      ledger_event: ["accrual", "taken", "adjustment", "payout"],
      qualification_type: [
        "dbs",
        "first_aid",
        "paediatric_first_aid",
        "safeguarding",
        "other",
      ],
      request_status: ["pending", "approved", "declined", "cancelled"],
      signup_request_status: ["pending", "approved", "declined"],
      staff_role: ["staff", "manager", "admin"],
      staff_status: ["active", "leaver"],
      swap_status: [
        "pending",
        "colleague_accepted",
        "approved",
        "declined",
        "cancelled",
      ],
      timesheet_source: ["clock", "manual"],
      timesheet_status: ["ok", "variance", "amended"],
    },
  },
} as const
