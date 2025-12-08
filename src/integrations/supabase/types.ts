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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      credit_check_logs: {
        Row: {
          checked_aadhar: string
          checked_at: string | null
          checked_by: string
          id: string
          shop_id: string | null
        }
        Insert: {
          checked_aadhar: string
          checked_at?: string | null
          checked_by: string
          id?: string
          shop_id?: string | null
        }
        Update: {
          checked_aadhar?: string
          checked_at?: string | null
          checked_by?: string
          id?: string
          shop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_check_logs_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credits: {
        Row: {
          amount: number
          created_at: string | null
          customer_id: number
          description: string | null
          id: number
          issued_by: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_id: number
          description?: string | null
          id?: number
          issued_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_id?: number
          description?: string | null
          id?: number
          issued_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_outstanding"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "credits_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string | null
          created_by: string | null
          global_customer_id: string | null
          id: number
          id_proof: string
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          global_customer_id?: string | null
          id?: number
          id_proof: string
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          created_by?: string | null
          global_customer_id?: string | null
          id?: number
          id_proof?: string
          name?: string
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_global_customer_id_fkey"
            columns: ["global_customer_id"]
            isOneToOne: false
            referencedRelation: "global_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      global_customers: {
        Row: {
          aadhar_no: string
          created_at: string | null
          id: string
          name: string | null
          phone: string | null
        }
        Insert: {
          aadhar_no: string
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
        }
        Update: {
          aadhar_no?: string
          created_at?: string | null
          id?: string
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          credit_id: number
          id: number
          payment_date: string
          payment_method: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          credit_id: number
          id?: number
          payment_date?: string
          payment_method?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          credit_id?: number
          id?: number
          payment_date?: string
          payment_method?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          business_type: string | null
          created_at: string | null
          full_name: string | null
          id: string
          is_admin: boolean | null
          license_number: string | null
          phone: string | null
          shop_location: string | null
          shop_name: string | null
          shop_owner: string | null
          status: string | null
        }
        Insert: {
          address?: string | null
          business_type?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean | null
          license_number?: string | null
          phone?: string | null
          shop_location?: string | null
          shop_name?: string | null
          shop_owner?: string | null
          status?: string | null
        }
        Update: {
          address?: string | null
          business_type?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean | null
          license_number?: string | null
          phone?: string | null
          shop_location?: string | null
          shop_name?: string | null
          shop_owner?: string | null
          status?: string | null
        }
        Relationships: []
      }
      shop_customers: {
        Row: {
          added_at: string | null
          customer_id: number
          id: number
          shop_id: string
        }
        Insert: {
          added_at?: string | null
          customer_id: number
          id?: number
          shop_id: string
        }
        Update: {
          added_at?: string | null
          customer_id?: number
          id?: number
          shop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customer_outstanding"
            referencedColumns: ["customer_id"]
          },
          {
            foreignKeyName: "shop_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_history: {
        Row: {
          created_at: string | null
          credit_id: number | null
          id: string
          new_status: string | null
          notes: string | null
          previous_status: string | null
          shop_id: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          credit_id?: number | null
          id?: string
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
          shop_id?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          credit_id?: number | null
          id?: string
          new_status?: string | null
          notes?: string | null
          previous_status?: string | null
          shop_id?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_history_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_history_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_outstanding: {
        Row: {
          customer_id: number | null
          name: string | null
          outstanding: number | null
          phone: string | null
          total_credit: number | null
          total_payments: number | null
        }
        Insert: {
          customer_id?: number | null
          name?: string | null
          outstanding?: never
          phone?: string | null
          total_credit?: never
          total_payments?: never
        }
        Update: {
          customer_id?: number | null
          name?: string | null
          outstanding?: never
          phone?: string | null
          total_credit?: never
          total_payments?: never
        }
        Relationships: []
      }
    }
    Functions: {
      add_or_get_customer: {
        Args: {
          _address: string
          _id_proof: string
          _name: string
          _phone: string
          _shop_id: string
        }
        Returns: {
          customer_id: number
          is_new: boolean
          message: string
        }[]
      }
      check_customer_credit_status: {
        Args: { _aadhar_number: string }
        Returns: {
          customer_name: string
          has_credit: boolean
          is_defaulter: boolean
          outstanding_range: string
          risk_level: string
          total_shops: number
        }[]
      }
      get_all_customers: {
        Args: { user_id: string }
        Returns: {
          id: number
          id_proof: string
          name: string
          phone: string
        }[]
      }
      get_all_payments_with_details: {
        Args: { user_id: string }
        Returns: {
          amount: number
          created_at: string
          created_by: string
          credit_amount: number
          credit_description: string
          credit_id: number
          customer_id_proof: string
          customer_name: string
          customer_phone: string
          id: number
          payment_date: string
          payment_method: string
        }[]
      }
      get_customer_credit_history: {
        Args: { customer_id: number; user_id: string }
        Returns: {
          amount: number
          created_at: string
          description: string
          id: number
          status: string
        }[]
      }
      get_customer_credits_summary: {
        Args: { user_id: string }
        Returns: {
          credit_count: number
          customer_id: number
          customer_name: string
          customer_phone: string
          latest_credit_date: string
          status: string
          total_credit_amount: number
        }[]
      }
      get_customer_outstanding: {
        Args: never
        Returns: {
          customer_id: number
          name: string
          outstanding: number
          phone: string
          total_credit: number
          total_payments: number
        }[]
      }
      get_customer_transactions: {
        Args: { user_id: string }
        Returns: {
          address: string
          created_at: string
          id: number
          id_proof: string
          name: string
          outstanding: number
          phone: string
          status: string
          total_credit: number
          total_payments: number
        }[]
      }
      get_customers_with_credit: {
        Args: { user_id: string }
        Returns: {
          id: number
          id_proof: string
          name: string
          phone: string
        }[]
      }
      get_customers_with_pending_credits: {
        Args: { user_id: string }
        Returns: {
          id: number
          id_proof: string
          name: string
          phone: string
        }[]
      }
      get_dashboard_stats: {
        Args: { user_id: string }
        Returns: {
          defaulters: Json
          defaulters_count: number
          recent_activity: Json
          total_credits_issued: number
          total_customers: number
          total_payments_received: number
          user_profile: Json
        }[]
      }
      get_outstanding_summary: {
        Args: { user_id: string }
        Returns: {
          customer_id: number
          name: string
          outstanding: number
          phone: string
          total_credit: number
          total_payments: number
        }[]
      }
      global_search: { Args: { p_aadhar_no: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      mark_credit_as_paid: {
        Args: { p_credit_id: number; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "shop_owner" | "user"
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
      app_role: ["admin", "shop_owner", "user"],
    },
  },
} as const
