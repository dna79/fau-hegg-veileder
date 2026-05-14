export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string;
          title: string;
          version: string;
          status: "draft" | "published" | "archived";
          source_filename: string | null;
          created_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          version: string;
          status: "draft" | "published" | "archived";
          source_filename?: string | null;
          created_at?: string;
          published_at?: string | null;
        };
        Update: {
          title?: string;
          version?: string;
          status?: "draft" | "published" | "archived";
          source_filename?: string | null;
          created_at?: string;
          published_at?: string | null;
        };
        Relationships: [];
      };
      guide_translations: {
        Row: {
          id: string;
          document_id: string;
          language_code: string;
          content: Json;
          status: "draft" | "published";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          language_code: string;
          content: Json;
          status: "draft" | "published";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          document_id?: string;
          language_code?: string;
          content?: Json;
          status?: "draft" | "published";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guide_translations_document_id_fkey";
            columns: ["document_id"];
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guide_translations_language_code_fkey";
            columns: ["language_code"];
            referencedRelation: "languages";
            referencedColumns: ["language_code"];
          },
        ];
      };
      languages: {
        Row: {
          language_code: string;
          name: string;
          native_name: string;
          enabled: boolean;
          sort_order: number;
        };
        Insert: {
          language_code: string;
          name: string;
          native_name: string;
          enabled?: boolean;
          sort_order: number;
        };
        Update: {
          language_code?: string;
          name?: string;
          native_name?: string;
          enabled?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
