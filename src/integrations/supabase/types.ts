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
      ai_usage: {
        Row: {
          created_at: string
          day: string
          id: string
          provider: Database["public"]["Enums"]["ai_provider"]
          request_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          day?: string
          id?: string
          provider: Database["public"]["Enums"]["ai_provider"]
          request_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          id?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          request_count?: number
          user_id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          id: string
          name: string
          path: string
          size: number
          type: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          path: string
          size?: number
          type: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          path?: string
          size?: number
          type?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          body: string
          cover_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          project_id: string
          published_at: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          project_id: string
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[]
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          project_id?: string
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      form_responses: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
          ip: string | null
          project_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id: string
          id?: string
          ip?: string | null
          project_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          ip?: string | null
          project_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      form_submit_rate: {
        Row: {
          count: number
          ip: string
          last_at: string
          project_id: string
        }
        Insert: {
          count?: number
          ip: string
          last_at?: string
          project_id: string
        }
        Update: {
          count?: number
          ip?: string
          last_at?: string
          project_id?: string
        }
        Relationships: []
      }
      imported_templates: {
        Row: {
          category: string
          content: Json
          created_at: string
          id: string
          name: string
          source_url: string
          thumbnail_url: string | null
          user_id: string
        }
        Insert: {
          category?: string
          content: Json
          created_at?: string
          id?: string
          name: string
          source_url: string
          thumbnail_url?: string | null
          user_id: string
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          id?: string
          name?: string
          source_url?: string
          thumbnail_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      page_views: {
        Row: {
          country: string | null
          id: number
          page_path: string
          project_id: string
          referrer: string | null
          ts: string
          user_agent: string | null
          visitor_hash: string | null
        }
        Insert: {
          country?: string | null
          id?: number
          page_path: string
          project_id: string
          referrer?: string | null
          ts?: string
          user_agent?: string | null
          visitor_hash?: string | null
        }
        Update: {
          country?: string | null
          id?: number
          page_path?: string
          project_id?: string
          referrer?: string | null
          ts?: string
          user_agent?: string | null
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_comments: {
        Row: {
          block_id: string | null
          body: string
          created_at: string
          id: string
          page_id: string
          parent_id: string | null
          project_id: string
          resolved: boolean
          updated_at: string
          user_id: string
          x: number
          y: number
        }
        Insert: {
          block_id?: string | null
          body: string
          created_at?: string
          id?: string
          page_id: string
          parent_id?: string | null
          project_id: string
          resolved?: boolean
          updated_at?: string
          user_id: string
          x?: number
          y?: number
        }
        Update: {
          block_id?: string | null
          body?: string
          created_at?: string
          id?: string
          page_id?: string
          parent_id?: string | null
          project_id?: string
          resolved?: boolean
          updated_at?: string
          user_id?: string
          x?: number
          y?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "project_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      project_locales: {
        Row: {
          content: Json
          created_at: string
          id: string
          locale: string
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          locale: string
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          locale?: string
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_snapshots: {
        Row: {
          content: Json
          created_at: string
          id: string
          label: string | null
          project_id: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          id?: string
          label?: string | null
          project_id: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          label?: string | null
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_snapshots_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          body_code: string | null
          content: Json
          created_at: string
          custom_domain: string | null
          description: string | null
          head_code: string | null
          id: string
          name: string
          preview_enabled: boolean
          published: boolean
          published_at: string | null
          published_content: Json | null
          published_version: number
          seo: Json
          slug: string | null
          template_id: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_code?: string | null
          content?: Json
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          head_code?: string | null
          id?: string
          name?: string
          preview_enabled?: boolean
          published?: boolean
          published_at?: string | null
          published_content?: Json | null
          published_version?: number
          seo?: Json
          slug?: string | null
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body_code?: string | null
          content?: Json
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          head_code?: string | null
          id?: string
          name?: string
          preview_enabled?: boolean
          published?: boolean
          published_at?: string | null
          published_content?: Json | null
          published_version?: number
          seo?: Json
          slug?: string | null
          template_id?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ai_keys: {
        Row: {
          auth_tag: string
          ciphertext: string
          created_at: string
          hint: string | null
          id: string
          iv: string
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_tag: string
          ciphertext: string
          created_at?: string
          hint?: string | null
          id?: string
          iv: string
          provider: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_tag?: string
          ciphertext?: string
          created_at?: string
          hint?: string | null
          id?: string
          iv?: string
          provider?: Database["public"]["Enums"]["ai_provider"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_presets: {
        Row: {
          blocks: Json
          category: string | null
          created_at: string
          id: string
          name: string
          thumbnail: string | null
          user_id: string
        }
        Insert: {
          blocks: Json
          category?: string | null
          created_at?: string
          id?: string
          name: string
          thumbnail?: string | null
          user_id: string
        }
        Update: {
          blocks?: Json
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          thumbnail?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ai_provider: "groq" | "gemini" | "huggingface" | "cohere" | "mistral"
      app_role: "admin" | "user"
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
      ai_provider: ["groq", "gemini", "huggingface", "cohere", "mistral"],
      app_role: ["admin", "user"],
    },
  },
} as const
