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
      calendar_events: {
        Row: {
          assignee_id: string
          client_id: string | null
          created_at: string
          created_by: string | null
          ends_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          source: Database["public"]["Enums"]["task_source"]
          starts_at: string
          task_id: string | null
          title: string
        }
        Insert: {
          assignee_id: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          source?: Database["public"]["Enums"]["task_source"]
          starts_at: string
          task_id?: string | null
          title: string
        }
        Update: {
          assignee_id?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          ends_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          source?: Database["public"]["Enums"]["task_source"]
          starts_at?: string
          task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          role: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          role?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_files: {
        Row: {
          client_id: string
          created_at: string
          file_name: string
          file_type: string
          id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          file_name: string
          file_type: string
          id?: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          file_name?: string
          file_type?: string
          id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_reports: {
        Row: {
          ad_spend: number | null
          app_downloads: number | null
          campaign_name: string | null
          campaign_sales: number | null
          client_id: string
          content_count: number | null
          content_type: string | null
          created_at: string
          facebook_comments: number | null
          facebook_likes: number | null
          facebook_views: number | null
          id: string
          instagram_comments: number | null
          instagram_likes: number | null
          instagram_views: number | null
          report_date: string
          roas: number | null
          sales_percent: number | null
          snapchat_comments: number | null
          snapchat_likes: number | null
          snapchat_views: number | null
          submitted_by: string | null
          tiktok_comments: number | null
          tiktok_likes: number | null
          tiktok_views: number | null
        }
        Insert: {
          ad_spend?: number | null
          app_downloads?: number | null
          campaign_name?: string | null
          campaign_sales?: number | null
          client_id: string
          content_count?: number | null
          content_type?: string | null
          created_at?: string
          facebook_comments?: number | null
          facebook_likes?: number | null
          facebook_views?: number | null
          id?: string
          instagram_comments?: number | null
          instagram_likes?: number | null
          instagram_views?: number | null
          report_date?: string
          roas?: number | null
          sales_percent?: number | null
          snapchat_comments?: number | null
          snapchat_likes?: number | null
          snapchat_views?: number | null
          submitted_by?: string | null
          tiktok_comments?: number | null
          tiktok_likes?: number | null
          tiktok_views?: number | null
        }
        Update: {
          ad_spend?: number | null
          app_downloads?: number | null
          campaign_name?: string | null
          campaign_sales?: number | null
          client_id?: string
          content_count?: number | null
          content_type?: string | null
          created_at?: string
          facebook_comments?: number | null
          facebook_likes?: number | null
          facebook_views?: number | null
          id?: string
          instagram_comments?: number | null
          instagram_likes?: number | null
          instagram_views?: number | null
          report_date?: string
          roas?: number | null
          sales_percent?: number | null
          snapchat_comments?: number | null
          snapchat_likes?: number | null
          snapchat_views?: number | null
          submitted_by?: string | null
          tiktok_comments?: number | null
          tiktok_likes?: number | null
          tiktok_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_sales: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          sale_date: string
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          sale_date?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          sale_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_social_accounts: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          handle: string
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          url: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          handle: string
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          url?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          handle?: string
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_social_accounts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_social_accounts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          archived: boolean
          cover_image_path: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          monthly_task_limit: number | null
          name: string
        }
        Insert: {
          archived?: boolean
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          monthly_task_limit?: number | null
          name: string
        }
        Update: {
          archived?: boolean
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          monthly_task_limit?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_assets: {
        Row: {
          asset_type: Database["public"]["Enums"]["content_asset_type"]
          client_id: string
          comments: number
          created_at: string
          created_by: string | null
          id: string
          likes: number
          published_at: string | null
          shares: number
          social_account_id: string
          title: string
          updated_at: string
          url: string | null
          views: number
        }
        Insert: {
          asset_type?: Database["public"]["Enums"]["content_asset_type"]
          client_id: string
          comments?: number
          created_at?: string
          created_by?: string | null
          id?: string
          likes?: number
          published_at?: string | null
          shares?: number
          social_account_id: string
          title: string
          updated_at?: string
          url?: string | null
          views?: number
        }
        Update: {
          asset_type?: Database["public"]["Enums"]["content_asset_type"]
          client_id?: string
          comments?: number
          created_at?: string
          created_by?: string | null
          id?: string
          likes?: number
          published_at?: string | null
          shares?: number
          social_account_id?: string
          title?: string
          updated_at?: string
          url?: string | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "content_assets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_assets_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "client_social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      content_proofs: {
        Row: {
          client_id: string
          created_at: string
          id: string
          link: string
          reported_by: string | null
          type: Database["public"]["Enums"]["content_proof_type"]
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          link: string
          reported_by?: string | null
          type: Database["public"]["Enums"]["content_proof_type"]
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          link?: string
          reported_by?: string | null
          type?: Database["public"]["Enums"]["content_proof_type"]
        }
        Relationships: [
          {
            foreignKeyName: "content_proofs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_proofs_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetup_proposals: {
        Row: {
          created_at: string
          ends_at: string
          goal: string | null
          id: string
          proposed_by: string | null
          purpose: string
          starts_at: string
          status: Database["public"]["Enums"]["meetup_status"]
        }
        Insert: {
          created_at?: string
          ends_at: string
          goal?: string | null
          id?: string
          proposed_by?: string | null
          purpose: string
          starts_at: string
          status?: Database["public"]["Enums"]["meetup_status"]
        }
        Update: {
          created_at?: string
          ends_at?: string
          goal?: string | null
          id?: string
          proposed_by?: string | null
          purpose?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["meetup_status"]
        }
        Relationships: [
          {
            foreignKeyName: "meetup_proposals_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meetup_responses: {
        Row: {
          id: string
          profile_id: string
          proposal_id: string
          responded_at: string | null
          response: Database["public"]["Enums"]["rsvp_status"]
        }
        Insert: {
          id?: string
          profile_id: string
          proposal_id: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["rsvp_status"]
        }
        Update: {
          id?: string
          profile_id?: string
          proposal_id?: string
          responded_at?: string | null
          response?: Database["public"]["Enums"]["rsvp_status"]
        }
        Relationships: [
          {
            foreignKeyName: "meetup_responses_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetup_responses_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "meetup_proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_salaries: {
        Row: {
          monthly_salary: number
          profile_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          monthly_salary?: number
          profile_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          monthly_salary?: number
          profile_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_salaries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_salaries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      role_change_requests: {
        Row: {
          created_at: string
          id: string
          requested_by: string
          requested_role: Database["public"]["Enums"]["user_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_by: string
          requested_role: Database["public"]["Enums"]["user_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_by?: string
          requested_role?: Database["public"]["Enums"]["user_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_change_requests_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_steps: {
        Row: {
          created_at: string
          description: string
          equipment: string | null
          estimated_minutes: number | null
          id: string
          other_cost: string | null
          position: number
          software: string | null
          task_id: string
          transportation: string | null
        }
        Insert: {
          created_at?: string
          description: string
          equipment?: string | null
          estimated_minutes?: number | null
          id?: string
          other_cost?: string | null
          position?: number
          software?: string | null
          task_id: string
          transportation?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          equipment?: string | null
          estimated_minutes?: number | null
          id?: string
          other_cost?: string | null
          position?: number
          software?: string | null
          task_id?: string
          transportation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_steps_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_template_steps: {
        Row: {
          description: string
          equipment: string | null
          estimated_minutes: number | null
          id: string
          other_cost: string | null
          position: number
          software: string | null
          template_id: string
          transportation: string | null
        }
        Insert: {
          description: string
          equipment?: string | null
          estimated_minutes?: number | null
          id?: string
          other_cost?: string | null
          position?: number
          software?: string | null
          template_id: string
          transportation?: string | null
        }
        Update: {
          description?: string
          equipment?: string | null
          estimated_minutes?: number | null
          id?: string
          other_cost?: string | null
          position?: number
          software?: string | null
          template_id?: string
          transportation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_template_steps_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          task_type: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          task_type?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          task_type?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          ai_estimate_status: string | null
          ai_estimated_minutes: number | null
          archived: boolean
          assignee_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          priority: Database["public"]["Enums"]["task_priority"]
          source: Database["public"]["Enums"]["task_source"]
          source_email_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_estimate_status?: string | null
          ai_estimated_minutes?: number | null
          archived?: boolean
          assignee_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          source?: Database["public"]["Enums"]["task_source"]
          source_email_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_estimate_status?: string | null
          ai_estimated_minutes?: number | null
          archived?: boolean
          assignee_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          source?: Database["public"]["Enums"]["task_source"]
          source_email_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trixie_companies: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      trixie_roles: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          position: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trixie_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "trixie_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trixie_tasks: {
        Row: {
          company_id: string
          cost_estimate: number | null
          cost_unit: string
          created_at: string
          description: string | null
          experience_required: string | null
          id: string
          position: number
          role_id: string
          time_estimate: string | null
          title: string
          updated_at: string
          uses_ai: boolean
        }
        Insert: {
          company_id: string
          cost_estimate?: number | null
          cost_unit?: string
          created_at?: string
          description?: string | null
          experience_required?: string | null
          id?: string
          position?: number
          role_id: string
          time_estimate?: string | null
          title: string
          updated_at?: string
          uses_ai?: boolean
        }
        Update: {
          company_id?: string
          cost_estimate?: number | null
          cost_unit?: string
          created_at?: string
          description?: string | null
          experience_required?: string | null
          id?: string
          position?: number
          role_id?: string
          time_estimate?: string | null
          title?: string
          updated_at?: string
          uses_ai?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trixie_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "trixie_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trixie_tasks_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "trixie_roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_meetup_if_all_accepted: {
        Args: { p_proposal_id: string }
        Returns: undefined
      }
      current_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      content_asset_type:
        | "post"
        | "reel"
        | "video"
        | "story"
        | "carousel"
        | "other"
      content_proof_type: "video" | "image" | "graphic" | "collab"
      event_type: "meeting" | "shoot" | "deadline" | "deliverable" | "other"
      meetup_status: "proposed" | "confirmed" | "cancelled"
      rsvp_status: "pending" | "accepted" | "declined"
      social_platform:
        | "instagram"
        | "tiktok"
        | "youtube"
        | "facebook"
        | "twitter_x"
        | "linkedin"
        | "other"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_source: "manual" | "email"
      task_status: "not_started" | "in_progress" | "blocked" | "review" | "done"
      user_role:
        | "editor_designer"
        | "videographer_photographer"
        | "social_media_manager"
        | "team_leader"
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
      content_asset_type: [
        "post",
        "reel",
        "video",
        "story",
        "carousel",
        "other",
      ],
      content_proof_type: ["video", "image", "graphic", "collab"],
      event_type: ["meeting", "shoot", "deadline", "deliverable", "other"],
      meetup_status: ["proposed", "confirmed", "cancelled"],
      rsvp_status: ["pending", "accepted", "declined"],
      social_platform: [
        "instagram",
        "tiktok",
        "youtube",
        "facebook",
        "twitter_x",
        "linkedin",
        "other",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_source: ["manual", "email"],
      task_status: ["not_started", "in_progress", "blocked", "review", "done"],
      user_role: [
        "editor_designer",
        "videographer_photographer",
        "social_media_manager",
        "team_leader",
      ],
    },
  },
} as const
