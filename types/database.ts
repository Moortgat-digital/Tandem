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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          id: string
          note: string | null
          payload_after: Json | null
          payload_before: Json | null
          tandem_pair_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          id?: string
          note?: string | null
          payload_after?: Json | null
          payload_before?: Json | null
          tandem_pair_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          id?: string
          note?: string | null
          payload_after?: Json | null
          payload_before?: Json | null
          tandem_pair_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_tandem_pair_id_fkey"
            columns: ["tandem_pair_id"]
            isOneToOne: false
            referencedRelation: "tandem_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_groups: {
        Row: {
          created_at: string | null
          id: string
          name: string
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_groups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_logs: {
        Row: {
          brevo_msg_id: string | null
          id: string
          recipient_id: string
          sent_at: string | null
          sent_by: string | null
          subject: string
          tenant_id: string | null
          type: string
        }
        Insert: {
          brevo_msg_id?: string | null
          id?: string
          recipient_id: string
          sent_at?: string | null
          sent_by?: string | null
          subject: string
          tenant_id?: string | null
          type: string
        }
        Update: {
          brevo_msg_id?: string | null
          id?: string
          recipient_id?: string
          sent_at?: string | null
          sent_by?: string | null
          subject?: string
          tenant_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string
          id: string
          invitation_sent: boolean | null
          is_active: boolean | null
          last_name: string
          role: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name: string
          id: string
          invitation_sent?: boolean | null
          is_active?: boolean | null
          last_name: string
          role: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          invitation_sent?: boolean | null
          is_active?: boolean | null
          last_name?: string
          role?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      session_animateurs: {
        Row: {
          animateur_id: string
          created_at: string | null
          id: string
          session_id: string
        }
        Insert: {
          animateur_id: string
          created_at?: string | null
          id?: string
          session_id: string
        }
        Update: {
          animateur_id?: string
          created_at?: string | null
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_animateurs_animateur_id_fkey"
            columns: ["animateur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_animateurs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_members: {
        Row: {
          created_at: string | null
          group_id: string | null
          id: string
          role_in_session: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          role_in_session: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string | null
          id?: string
          role_in_session?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "formation_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_members_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          allow_multiple_rdv_inter: boolean | null
          created_at: string | null
          id: string
          name: string
          nb_priorites_max: number | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          allow_multiple_rdv_inter?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          nb_priorites_max?: number | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          allow_multiple_rdv_inter?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          nb_priorites_max?: number | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tandem_documents: {
        Row: {
          date_dernier_rdv: string | null
          date_premier_rdv: string | null
          date_premiere_journee: string | null
          dates_rdv_inter: string[] | null
          id: string
          tandem_pair_id: string
          updated_at: string | null
        }
        Insert: {
          date_dernier_rdv?: string | null
          date_premier_rdv?: string | null
          date_premiere_journee?: string | null
          dates_rdv_inter?: string[] | null
          id?: string
          tandem_pair_id: string
          updated_at?: string | null
        }
        Update: {
          date_dernier_rdv?: string | null
          date_premier_rdv?: string | null
          date_premiere_journee?: string | null
          dates_rdv_inter?: string[] | null
          id?: string
          tandem_pair_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tandem_documents_tandem_pair_id_fkey"
            columns: ["tandem_pair_id"]
            isOneToOne: true
            referencedRelation: "tandem_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      tandem_entries: {
        Row: {
          content: string | null
          document_id: string
          id: string
          is_locked: boolean | null
          priority_pos: number
          stage: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          content?: string | null
          document_id: string
          id?: string
          is_locked?: boolean | null
          priority_pos: number
          stage: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          content?: string | null
          document_id?: string
          id?: string
          is_locked?: boolean | null
          priority_pos?: number
          stage?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tandem_entries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "tandem_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tandem_entries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tandem_pairs: {
        Row: {
          created_at: string | null
          id: string
          manager_id: string
          participant_id: string
          session_id: string
          tandem_status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          manager_id: string
          participant_id: string
          session_id: string
          tandem_status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          manager_id?: string
          participant_id?: string
          session_id?: string
          tandem_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "tandem_pairs_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tandem_pairs_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tandem_pairs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tandem_priorities: {
        Row: {
          document_id: string
          id: string
          position: number
          title: string
        }
        Insert: {
          document_id: string
          id?: string
          position: number
          title: string
        }
        Update: {
          document_id?: string
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tandem_priorities_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "tandem_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      tandem_validations: {
        Row: {
          id: string
          stage: string
          tandem_pair_id: string
          validated_at: string | null
          validated_by: string
        }
        Insert: {
          id?: string
          stage: string
          tandem_pair_id: string
          validated_at?: string | null
          validated_by: string
        }
        Update: {
          id?: string
          stage?: string
          tandem_pair_id?: string
          validated_at?: string | null
          validated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "tandem_validations_tandem_pair_id_fkey"
            columns: ["tandem_pair_id"]
            isOneToOne: false
            referencedRelation: "tandem_pairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tandem_validations_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          contact_email: string | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          primary_color: string | null
          slug: string
        }
        Insert: {
          contact_email?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          slug: string
        }
        Update: {
          contact_email?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_profile_role: { Args: Record<PropertyKey, never>; Returns: string }
      current_profile_tenant_id: { Args: Record<PropertyKey, never>; Returns: string }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_animateur: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_animateur_of_document: {
        Args: { p_document_id: string }
        Returns: boolean
      }
      is_animateur_of_pair: { Args: { p_pair_id: string }; Returns: boolean }
      is_animateur_of_session: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      is_in_document: { Args: { p_document_id: string }; Returns: boolean }
      is_in_pair: { Args: { p_pair_id: string }; Returns: boolean }
      is_member_of_session: { Args: { p_session_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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

export const Constants = {
  public: {
    Enums: {},
  },
} as const
