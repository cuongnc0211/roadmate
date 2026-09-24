export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      corridors: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points: {
        Row: {
          corridor_id: string
          geo: Json | null
          id: string
          name: string
          sort: number
          zone: Database["public"]["Enums"]["zone"]
        }
        Insert: {
          corridor_id: string
          geo?: Json | null
          id?: string
          name: string
          sort?: number
          zone: Database["public"]["Enums"]["zone"]
        }
        Update: {
          corridor_id?: string
          geo?: Json | null
          id?: string
          name?: string
          sort?: number
          zone?: Database["public"]["Enums"]["zone"]
        }
        Relationships: [
          {
            foreignKeyName: "points_corridor_id_fkey"
            columns: ["corridor_id"]
            isOneToOne: false
            referencedRelation: "corridors"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_private: {
        Row: {
          phone: string | null
          school_email: string | null
          user_id: string
        }
        Insert: {
          phone?: string | null
          school_email?: string | null
          user_id: string
        }
        Update: {
          phone?: string | null
          school_email?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_private_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          gender: Database["public"]["Enums"]["gender"] | null
          id: string
          name: string
          rating_avg: number
          sv_verified: boolean
          women_pref: boolean
          zalo_id: string | null
        }
        Insert: {
          created_at?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id: string
          name?: string
          rating_avg?: number
          sv_verified?: boolean
          women_pref?: boolean
          zalo_id?: string | null
        }
        Update: {
          created_at?: string
          gender?: Database["public"]["Enums"]["gender"] | null
          id?: string
          name?: string
          rating_avg?: number
          sv_verified?: boolean
          women_pref?: boolean
          zalo_id?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          reason: string
          reported_id: string | null
          reporter_id: string
          trip_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          reason: string
          reported_id?: string | null
          reporter_id: string
          trip_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          reason?: string
          reported_id?: string | null
          reporter_id?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_id_fkey"
            columns: ["reported_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          from_user: string
          id: string
          rating: number
          to_user: string
          trip_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          from_user: string
          id?: string
          rating: number
          to_user: string
          trip_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          from_user?: string
          id?: string
          rating?: number
          to_user?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_from_user_fkey"
            columns: ["from_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_to_user_fkey"
            columns: ["to_user"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      sv_verifications: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sv_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_requests: {
        Row: {
          created_at: string
          id: string
          requester_id: string
          status: Database["public"]["Enums"]["request_status"]
          trip_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_id: string
          status?: Database["public"]["Enums"]["request_status"]
          trip_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trip_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_requests_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          created_at: string
          creator_id: string
          depart_at: string
          dir: Database["public"]["Enums"]["trip_dir"]
          from_point_id: string
          id: string
          matching_score: number | null
          pickup_note: string | null
          price_per_person: number
          seats_left: number
          seats_total: number
          status: Database["public"]["Enums"]["trip_status"]
          to_point_id: string
          type: Database["public"]["Enums"]["trip_type"]
          women_only: boolean
        }
        Insert: {
          created_at?: string
          creator_id: string
          depart_at: string
          dir: Database["public"]["Enums"]["trip_dir"]
          from_point_id: string
          id?: string
          matching_score?: number | null
          pickup_note?: string | null
          price_per_person?: number
          seats_left: number
          seats_total: number
          status?: Database["public"]["Enums"]["trip_status"]
          to_point_id: string
          type: Database["public"]["Enums"]["trip_type"]
          women_only?: boolean
        }
        Update: {
          created_at?: string
          creator_id?: string
          depart_at?: string
          dir?: Database["public"]["Enums"]["trip_dir"]
          from_point_id?: string
          id?: string
          matching_score?: number | null
          pickup_note?: string | null
          price_per_person?: number
          seats_left?: number
          seats_total?: number
          status?: Database["public"]["Enums"]["trip_status"]
          to_point_id?: string
          type?: Database["public"]["Enums"]["trip_type"]
          women_only?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trips_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_from_point_id_fkey"
            columns: ["from_point_id"]
            isOneToOne: false
            referencedRelation: "points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trips_to_point_id_fkey"
            columns: ["to_point_id"]
            isOneToOne: false
            referencedRelation: "points"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_request: { Args: { p_request_id: string }; Returns: undefined }
      auth_has_trip_request: { Args: { t_id: string }; Returns: boolean }
      auth_is_trip_owner: { Args: { t_id: string }; Returns: boolean }
      cancel_trip: { Args: { p_trip_id: string }; Returns: undefined }
      decline_request: { Args: { p_request_id: string }; Returns: undefined }
      withdraw_request: { Args: { p_request_id: string }; Returns: undefined }
    }
    Enums: {
      gender: "male" | "female" | "other"
      request_status: "pending" | "accepted" | "declined" | "withdrawn"
      trip_dir: "HL_HN" | "HN_HL"
      trip_status: "open" | "full" | "done" | "cancelled"
      trip_type: "offer" | "need"
      zone: "HL" | "HN"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      gender: ["male", "female", "other"],
      request_status: ["pending", "accepted", "declined", "withdrawn"],
      trip_dir: ["HL_HN", "HN_HL"],
      trip_status: ["open", "full", "done", "cancelled"],
      trip_type: ["offer", "need"],
      zone: ["HL", "HN"],
    },
  },
} as const

