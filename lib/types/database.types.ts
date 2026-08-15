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
      activity_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          summary: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          summary: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          assignee_id: string
          client_id: string | null
          created_at: string
          created_by: string | null
          ends_at: string
          event_group_id: string
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
          event_group_id?: string
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
          event_group_id?: string
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
      client_baselines: {
        Row: {
          ad_spend: number | null
          client_id: string
          comments: number | null
          likes: number | null
          mentions: number | null
          posts: number | null
          roas: number | null
          sales: number | null
          shares: number | null
          updated_at: string
          updated_by: string | null
          views: number | null
        }
        Insert: {
          ad_spend?: number | null
          client_id: string
          comments?: number | null
          likes?: number | null
          mentions?: number | null
          posts?: number | null
          roas?: number | null
          sales?: number | null
          shares?: number | null
          updated_at?: string
          updated_by?: string | null
          views?: number | null
        }
        Update: {
          ad_spend?: number | null
          client_id?: string
          comments?: number | null
          likes?: number | null
          mentions?: number | null
          posts?: number | null
          roas?: number | null
          sales?: number | null
          shares?: number | null
          updated_at?: string
          updated_by?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_baselines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_baselines_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      client_credentials: {
        Row: {
          auth_code: string | null
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          login: string
          password: string
          platform: string
          updated_at: string
        }
        Insert: {
          auth_code?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          login: string
          password: string
          platform: string
          updated_at?: string
        }
        Update: {
          auth_code?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          login?: string
          password?: string
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_credentials_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credentials_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      client_groups: {
        Row: {
          all_client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          all_client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          all_client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_groups_all_client_id_fkey"
            columns: ["all_client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          asked_by: string | null
          client_id: string
          created_at: string
          id: string
          question: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asked_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_questions_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_questions_asked_by_fkey"
            columns: ["asked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_questions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          mentions: number | null
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
          mentions?: number | null
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
          mentions?: number | null
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
          units: number | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          sale_date?: string
          units?: number | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          sale_date?: string
          units?: number | null
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
          group_id: string | null
          id: string
          is_group_all: boolean
          monthly_credit_limit: number | null
          monthly_fee: number | null
          name: string
        }
        Insert: {
          archived?: boolean
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_group_all?: boolean
          monthly_credit_limit?: number | null
          monthly_fee?: number | null
          name: string
        }
        Update: {
          archived?: boolean
          cover_image_path?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_id?: string | null
          id?: string
          is_group_all?: boolean
          monthly_credit_limit?: number | null
          monthly_fee?: number | null
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
          {
            foreignKeyName: "clients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      company_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          transaction_date?: string
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_transactions_created_by_fkey"
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
      credit_topups: {
        Row: {
          approved_by: string | null
          charge_amount: number
          client_id: string
          created_at: string
          credits_added: number
          id: string
          period_start: string
        }
        Insert: {
          approved_by?: string | null
          charge_amount: number
          client_id: string
          created_at?: string
          credits_added: number
          id?: string
          period_start: string
        }
        Update: {
          approved_by?: string | null
          charge_amount?: number
          client_id?: string
          created_at?: string
          credits_added?: number
          id?: string
          period_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_topups_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_topups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_broadcasts: {
        Row: {
          audience: string
          body: string
          created_at: string
          id: string
          recipient_count: number
          sent_by: string | null
          subject: string
        }
        Insert: {
          audience: string
          body: string
          created_at?: string
          id?: string
          recipient_count: number
          sent_by?: string | null
          subject: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          id?: string
          recipient_count?: number
          sent_by?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_broadcasts_sent_by_fkey"
            columns: ["sent_by"]
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
          active: boolean
          avatar_url: string | null
          client_group_id: string | null
          client_id: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_external: boolean
          phone: string | null
          role: string
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          client_group_id?: string | null
          client_id?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_external?: boolean
          phone?: string | null
          role: string
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          client_group_id?: string | null
          client_id?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_external?: boolean
          phone?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_group_id_fkey"
            columns: ["client_group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_fkey"
            columns: ["role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["value"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          profile_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          profile_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_change_requests: {
        Row: {
          created_at: string
          id: string
          requested_by: string
          requested_role: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requested_by: string
          requested_role: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requested_by?: string
          requested_role?: string
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
            foreignKeyName: "role_change_requests_requested_role_fkey"
            columns: ["requested_role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["value"]
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
      roles: {
        Row: {
          assignable: boolean
          created_at: string
          created_by: string | null
          id: string
          is_system: boolean
          label: string
          value: string
        }
        Insert: {
          assignable?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          label: string
          value: string
        }
        Update: {
          assignable?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          label?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number
          id: string
          mime_type: string | null
          post_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          mime_type?: string | null
          post_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          post_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_attachments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_credits: {
        Row: {
          post_id: string
          profile_id: string
        }
        Insert: {
          post_id: string
          profile_id: string
        }
        Update: {
          post_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_credits_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_credits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          caption: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          media_type: string
          platform: string
          post_at: string
          post_type: string
          suggested_song: string | null
          tag_handles: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          media_type: string
          platform: string
          post_at: string
          post_type?: string
          suggested_song?: string | null
          tag_handles?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          media_type?: string
          platform?: string
          post_at?: string
          post_type?: string
          suggested_song?: string | null
          tag_handles?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_assignees: {
        Row: {
          created_at: string
          profile_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          profile_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignees_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          category: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          mime_type: string | null
          storage_path: string
          task_id: string
          uploaded_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          mime_type?: string | null
          storage_path: string
          task_id: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          storage_path?: string
          task_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
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
          batch_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          credit_client_id: string | null
          deadline: string | null
          description: string | null
          id: string
          is_special: boolean
          overage_charged: boolean
          payout_amount: number | null
          payout_approved_at: string | null
          payout_approved_by: string | null
          payout_method: string | null
          payout_paid: boolean
          payout_paid_at: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          source: Database["public"]["Enums"]["task_source"]
          source_email_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_type: string | null
          title: string
          updated_at: string
          urgent_since: string | null
        }
        Insert: {
          ai_estimate_status?: string | null
          ai_estimated_minutes?: number | null
          archived?: boolean
          assignee_id?: string | null
          batch_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_client_id?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_special?: boolean
          overage_charged?: boolean
          payout_amount?: number | null
          payout_approved_at?: string | null
          payout_approved_by?: string | null
          payout_method?: string | null
          payout_paid?: boolean
          payout_paid_at?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          source?: Database["public"]["Enums"]["task_source"]
          source_email_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string | null
          title: string
          updated_at?: string
          urgent_since?: string | null
        }
        Update: {
          ai_estimate_status?: string | null
          ai_estimated_minutes?: number | null
          archived?: boolean
          assignee_id?: string | null
          batch_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_client_id?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          is_special?: boolean
          overage_charged?: boolean
          payout_amount?: number | null
          payout_approved_at?: string | null
          payout_approved_by?: string | null
          payout_method?: string | null
          payout_paid?: boolean
          payout_paid_at?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          source?: Database["public"]["Enums"]["task_source"]
          source_email_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_type?: string | null
          title?: string
          updated_at?: string
          urgent_since?: string | null
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
          {
            foreignKeyName: "tasks_credit_client_id_fkey"
            columns: ["credit_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_payout_approved_by_fkey"
            columns: ["payout_approved_by"]
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
      user_sessions: {
        Row: {
          active_seconds: number
          created_at: string
          id: string
          last_seen_at: string
          started_at: string
          user_id: string
        }
        Insert: {
          active_seconds?: number
          created_at?: string
          id?: string
          last_seen_at?: string
          started_at?: string
          user_id: string
        }
        Update: {
          active_seconds?: number
          created_at?: string
          id?: string
          last_seen_at?: string
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      whitelabel_invites: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          label: string | null
          status: string
          tenant_id: string | null
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          status?: string
          tenant_id?: string | null
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          label?: string | null
          status?: string
          tenant_id?: string | null
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whitelabel_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whitelabel_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "whitelabel_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whitelabel_tenants: {
        Row: {
          app_url: string | null
          brand_primary_color: string | null
          business_name: string
          contact_email: string
          contact_name: string | null
          created_at: string
          custom_domain: string | null
          dyor_admin_seeded: boolean
          id: string
          invite_id: string | null
          layout_variant: string
          logo_url: string | null
          notes: string | null
          path_slug: string | null
          status: string
          supabase_anon_key: string
          supabase_url: string
          tenant_admin_seeded: boolean
          updated_at: string
          vercel_deploy_url: string | null
        }
        Insert: {
          app_url?: string | null
          brand_primary_color?: string | null
          business_name: string
          contact_email: string
          contact_name?: string | null
          created_at?: string
          custom_domain?: string | null
          dyor_admin_seeded?: boolean
          id?: string
          invite_id?: string | null
          layout_variant?: string
          logo_url?: string | null
          notes?: string | null
          path_slug?: string | null
          status?: string
          supabase_anon_key: string
          supabase_url: string
          tenant_admin_seeded?: boolean
          updated_at?: string
          vercel_deploy_url?: string | null
        }
        Update: {
          app_url?: string | null
          brand_primary_color?: string | null
          business_name?: string
          contact_email?: string
          contact_name?: string | null
          created_at?: string
          custom_domain?: string | null
          dyor_admin_seeded?: boolean
          id?: string
          invite_id?: string | null
          layout_variant?: string
          logo_url?: string | null
          notes?: string | null
          path_slug?: string | null
          status?: string
          supabase_anon_key?: string
          supabase_url?: string
          tenant_admin_seeded?: boolean
          updated_at?: string
          vercel_deploy_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whitelabel_tenants_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "whitelabel_invites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accessible_client_ids: { Args: never; Returns: string[] }
      can_access_task: { Args: { p_task_id: string }; Returns: boolean }
      can_view_post: { Args: { p_post_id: string }; Returns: boolean }
      claim_special_task: {
        Args: { p_task_id: string }
        Returns: {
          ai_estimate_status: string | null
          ai_estimated_minutes: number | null
          archived: boolean
          assignee_id: string | null
          batch_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          credit_client_id: string | null
          deadline: string | null
          description: string | null
          id: string
          is_special: boolean
          overage_charged: boolean
          payout_amount: number | null
          payout_approved_at: string | null
          payout_approved_by: string | null
          payout_method: string | null
          payout_paid: boolean
          payout_paid_at: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          source: Database["public"]["Enums"]["task_source"]
          source_email_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_type: string | null
          title: string
          updated_at: string
          urgent_since: string | null
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_meetup_if_all_accepted: {
        Args: { p_proposal_id: string }
        Returns: undefined
      }
      current_client_group_id: { Args: never; Returns: string }
      current_client_id: { Args: never; Returns: string }
      current_role: { Args: never; Returns: string }
      is_task_assignee: { Args: { p_task_id: string }; Returns: boolean }
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
      task_source: "manual" | "email" | "client"
      task_status: "not_started" | "in_progress" | "blocked" | "review" | "done"
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
      task_source: ["manual", "email", "client"],
      task_status: ["not_started", "in_progress", "blocked", "review", "done"],
    },
  },
} as const
