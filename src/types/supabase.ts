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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          advancement_rule: Json | null
          created_at: string | null
          current_phase: number
          gender: string
          group_size: number | null
          id: string
          status: string
          tie_breaker_config: Json | null
          tournament_format: string | null
          tournament_id: string
          updated_at: string | null
          best_of: number | null
        }
        Insert: {
          advancement_rule?: Json | null
          created_at?: string | null
          current_phase?: number
          gender: string
          group_size?: number | null
          id?: string
          status?: string
          tie_breaker_config?: Json | null
          tournament_format?: string | null
          tournament_id: string
          updated_at?: string | null
          best_of?: number | null
        }
        Update: {
          advancement_rule?: Json | null
          created_at?: string | null
          current_phase?: number
          gender?: string
          group_size?: number | null
          id?: string
          status?: string
          tie_breaker_config?: Json | null
          tournament_format?: string | null
          tournament_id?: string
          updated_at?: string | null
          best_of?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_flip_logs: {
        Row: {
          category_id: string
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          phase: number
          team_a_id: string
          team_b_id: string
          winner_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          phase: number
          team_a_id: string
          team_b_id: string
          winner_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          phase?: number
          team_a_id?: string
          team_b_id?: string
          winner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coin_flip_logs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_flip_logs_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_flip_logs_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coin_flip_logs_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      match_stats: {
        Row: {
          created_at: string | null
          id: string
          last_set_points: number
          match_id: string
          penalties: number
          points_conceded: number
          result: string
          sets_won: number
          team_id: string
          total_points_scored: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_set_points?: number
          match_id: string
          penalties?: number
          points_conceded?: number
          result: string
          sets_won?: number
          team_id: string
          total_points_scored?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          last_set_points?: number
          match_id?: string
          penalties?: number
          points_conceded?: number
          result?: string
          sets_won?: number
          team_id?: string
          total_points_scored?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          category_id: string
          created_at: string | null
          finalized_at: string | null
          finalized_by: string | null
          id: string
          is_best_of_5: boolean
          loser_id: string | null
          match_number: number
          phase: number
          score_a: number | null
          score_b: number | null
          status: string
          team_a_id: string | null
          team_b_id: string | null
          updated_at: string | null
          winner_id: string | null
          group_name: string | null
          best_of: number | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_best_of_5?: boolean
          loser_id?: string | null
          match_number: number
          phase: number
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string | null
          winner_id?: string | null
          group_name?: string | null
          best_of?: number | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          finalized_at?: string | null
          finalized_by?: string | null
          id?: string
          is_best_of_5?: boolean
          loser_id?: string | null
          match_number?: number
          phase?: number
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string | null
          winner_id?: string | null
          group_name?: string | null
          best_of?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rankings: {
        Row: {
          category_id: string
          created_at: string | null
          id: string
          last_set_points: number
          penalties: number
          phase: number
          points_conceded: number
          rank: number
          ranking_type: string
          sets_won: number
          team_id: string
          total_points: number
        }
        Insert: {
          category_id: string
          created_at?: string | null
          id?: string
          last_set_points?: number
          penalties?: number
          phase: number
          points_conceded?: number
          rank: number
          ranking_type: string
          sets_won?: number
          team_id: string
          total_points?: number
        }
        Update: {
          category_id?: string
          created_at?: string | null
          id?: string
          last_set_points?: number
          penalties?: number
          phase?: number
          points_conceded?: number
          rank?: number
          ranking_type?: string
          sets_won?: number
          team_id?: string
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "rankings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rankings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      sets: {
        Row: {
          created_at: string | null
          id: string
          is_finished: boolean
          match_id: string
          points_a: number
          points_b: number
          set_number: number
          updated_at: string | null
          winner_team_side: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_finished?: boolean
          match_id: string
          points_a?: number
          points_b?: number
          set_number: number
          updated_at?: string | null
          winner_team_side?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_finished?: boolean
          match_id?: string
          points_a?: number
          points_b?: number
          set_number?: number
          updated_at?: string | null
          winner_team_side?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sets_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          category_id: string
          created_at: string | null
          group_name: string | null
          id: string
          logo_url: string | null
          name: string
          seed_number: number | null
          skip_first_phase: boolean | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          group_name?: string | null
          id?: string
          logo_url?: string | null
          name: string
          seed_number?: number | null
          skip_first_phase?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          group_name?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          seed_number?: number | null
          skip_first_phase?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
