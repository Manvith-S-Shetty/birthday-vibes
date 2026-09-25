export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      experiences: {
        Row: {
          id: string;
          creator_session_token: string;
          slug: string | null;
          recipient_name: string;
          birthday_date: string | null;
          theme_id: string;
          personal_message: string;
          pin_hash: string | null;
          pin_salt: string | null;
          is_pin_protected: boolean;
          status: "draft" | "ready" | "published";
          current_step: string;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          creator_session_token: string;
          slug?: string | null;
          recipient_name: string;
          birthday_date?: string | null;
          theme_id?: string;
          personal_message?: string;
          pin_hash?: string | null;
          pin_salt?: string | null;
          is_pin_protected?: boolean;
          status?: "draft" | "ready" | "published";
          current_step?: string;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
        Update: {
          id?: string;
          creator_session_token?: string;
          slug?: string | null;
          recipient_name?: string;
          birthday_date?: string | null;
          theme_id?: string;
          personal_message?: string;
          pin_hash?: string | null;
          pin_salt?: string | null;
          is_pin_protected?: boolean;
          status?: "draft" | "ready" | "published";
          current_step?: string;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
      };
      media: {
        Row: {
          id: string;
          experience_id: string;
          storage_path: string;
          type: string;
          caption: string | null;
          alt_text: string | null;
          sort_order: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          experience_id: string;
          storage_path: string;
          type?: string;
          caption?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          experience_id?: string;
          storage_path?: string;
          type?: string;
          caption?: string | null;
          alt_text?: string | null;
          sort_order?: number;
          metadata?: Json;
          created_at?: string;
        };
      };
      music: {
        Row: {
          id: string;
          experience_id: string;
          source_type: string;
          source_url: string | null;
          track_id: string | null;
          title: string | null;
          artist: string | null;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          experience_id: string;
          source_type?: string;
          source_url?: string | null;
          track_id?: string | null;
          title?: string | null;
          artist?: string | null;
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          experience_id?: string;
          source_type?: string;
          source_url?: string | null;
          track_id?: string | null;
          title?: string | null;
          artist?: string | null;
          enabled?: boolean;
          created_at?: string;
        };
      };
      experience_moments: {
        Row: {
          id: string;
          experience_id: string;
          moment_type: string;
          config_json: Json;
          sort_order: number;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          experience_id: string;
          moment_type: string;
          config_json?: Json;
          sort_order?: number;
          enabled?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          experience_id?: string;
          moment_type?: string;
          config_json?: Json;
          sort_order?: number;
          enabled?: boolean;
          created_at?: string;
        };
      };
      voice_messages: {
        Row: {
          id: string;
          experience_id: string;
          storage_path: string;
          mime_type: string;
          duration_ms: number;
          file_size_bytes: number;
          transcript: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          experience_id: string;
          storage_path: string;
          mime_type: string;
          duration_ms: number;
          file_size_bytes: number;
          transcript?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          experience_id?: string;
          storage_path?: string;
          mime_type?: string;
          duration_ms?: number;
          file_size_bytes?: number;
          transcript?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

