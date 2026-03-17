export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          email: string
          bar_number: string | null
          phone: string | null
          avatar_url: string | null
          push_subscription: Json | null
          timezone: string
          org_id: string | null
          is_active: boolean
          last_seen_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          bar_number?: string | null
          phone?: string | null
          avatar_url?: string | null
          push_subscription?: Json | null
          timezone?: string
          org_id?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          bar_number?: string | null
          phone?: string | null
          avatar_url?: string | null
          push_subscription?: Json | null
          timezone?: string
          org_id?: string | null
          is_active?: boolean
          last_seen_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cases: {
        Row: {
          id: string
          user_id: string
          org_id: string | null
          case_number: string
          title: string
          client_name: string
          client_contact: string | null
          opposing_party: string | null
          court_name: string | null
          judge_name: string | null
          case_type: Database['public']['Enums']['case_type']
          status: Database['public']['Enums']['case_status']
          description: string | null
          notes: string | null
          filed_date: string | null
          is_deleted: boolean
          deleted_at: string | null
          deleted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          org_id?: string | null
          case_number: string
          title: string
          client_name: string
          client_contact?: string | null
          opposing_party?: string | null
          court_name?: string | null
          judge_name?: string | null
          case_type?: Database['public']['Enums']['case_type']
          status?: Database['public']['Enums']['case_status']
          description?: string | null
          notes?: string | null
          filed_date?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          org_id?: string | null
          case_number?: string
          title?: string
          client_name?: string
          client_contact?: string | null
          opposing_party?: string | null
          court_name?: string | null
          judge_name?: string | null
          case_type?: Database['public']['Enums']['case_type']
          status?: Database['public']['Enums']['case_status']
          description?: string | null
          notes?: string | null
          filed_date?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      hearings: {
        Row: {
          id: string
          case_id: string
          user_id: string
          title: string
          hearing_date: string
          hearing_time: string | null
          court_name: string | null
          court_room: string | null
          judge_name: string | null
          notes: string | null
          reminder_24h_sent: boolean
          reminder_1h_sent: boolean
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          user_id: string
          title: string
          hearing_date: string
          hearing_time?: string | null
          court_name?: string | null
          court_room?: string | null
          judge_name?: string | null
          notes?: string | null
          reminder_24h_sent?: boolean
          reminder_1h_sent?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          user_id?: string
          title?: string
          hearing_date?: string
          hearing_time?: string | null
          court_name?: string | null
          court_room?: string | null
          judge_name?: string | null
          notes?: string | null
          reminder_24h_sent?: boolean
          reminder_1h_sent?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deadlines: {
        Row: {
          id: string
          case_id: string
          user_id: string
          title: string
          due_date: string
          due_time: string | null
          priority: Database['public']['Enums']['deadline_priority']
          is_completed: boolean
          completed_at: string | null
          notes: string | null
          reminder_sent: boolean
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          user_id: string
          title: string
          due_date: string
          due_time?: string | null
          priority?: Database['public']['Enums']['deadline_priority']
          is_completed?: boolean
          completed_at?: string | null
          notes?: string | null
          reminder_sent?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          user_id?: string
          title?: string
          due_date?: string
          due_time?: string | null
          priority?: Database['public']['Enums']['deadline_priority']
          is_completed?: boolean
          completed_at?: string | null
          notes?: string | null
          reminder_sent?: boolean
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      documents: {
        Row: {
          id: string
          case_id: string
          user_id: string
          name: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          doc_type: Database['public']['Enums']['document_type']
          notes: string | null
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          case_id: string
          user_id: string
          name: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          doc_type?: Database['public']['Enums']['document_type']
          notes?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          user_id?: string
          name?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          doc_type?: Database['public']['Enums']['document_type']
          notes?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
        }
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          full_name: string
          role: Database['public']['Enums']['contact_role']
          email: string | null
          phone: string | null
          organization: string | null
          notes: string | null
          is_deleted: boolean
          deleted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          role?: Database['public']['Enums']['contact_role']
          email?: string | null
          phone?: string | null
          organization?: string | null
          notes?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          role?: Database['public']['Enums']['contact_role']
          email?: string | null
          phone?: string | null
          organization?: string | null
          notes?: string | null
          is_deleted?: boolean
          deleted_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      case_contacts: {
        Row: {
          case_id: string
          contact_id: string
        }
        Insert: {
          case_id: string
          contact_id: string
        }
        Update: {
          case_id?: string
          contact_id?: string
        }
      }
      notification_logs: {
        Row: {
          id: string
          user_id: string
          case_id: string | null
          title: string
          body: string
          type: Database['public']['Enums']['notification_type']
          reference_id: string | null
          is_read: boolean
          read_at: string | null
          sent_at: string
        }
        Insert: {
          id?: string
          user_id: string
          case_id?: string | null
          title: string
          body: string
          type: Database['public']['Enums']['notification_type']
          reference_id?: string | null
          is_read?: boolean
          read_at?: string | null
          sent_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          case_id?: string | null
          title?: string
          body?: string
          type?: Database['public']['Enums']['notification_type']
          reference_id?: string | null
          is_read?: boolean
          read_at?: string | null
          sent_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: number
          user_id: string | null
          action: string
          table_name: string
          record_id: string | null
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          action: string
          table_name: string
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          action?: string
          table_name?: string
          record_id?: string | null
          old_values?: Json | null
          new_values?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      case_status: 'active' | 'pending' | 'closed' | 'archived'
      case_type:
        | 'civil'
        | 'criminal'
        | 'family'
        | 'corporate'
        | 'property'
        | 'constitutional'
        | 'tax'
        | 'labour'
        | 'other'
      deadline_priority: 'low' | 'medium' | 'high' | 'critical'
      contact_role:
        | 'client'
        | 'opposing_counsel'
        | 'judge'
        | 'witness'
        | 'expert'
        | 'court_staff'
        | 'other'
      document_type:
        | 'petition'
        | 'affidavit'
        | 'evidence'
        | 'order'
        | 'judgment'
        | 'correspondence'
        | 'contract'
        | 'other'
      notification_type: 'hearing_reminder' | 'deadline_reminder' | 'case_update' | 'system'
    }
    CompositeTypes: Record<string, never>
  }
}

// convenience aliases

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]

// row type aliases (import these in services)

export type Profile          = Tables<'profiles'>
export type Case             = Tables<'cases'>
export type Hearing          = Tables<'hearings'>
export type Deadline         = Tables<'deadlines'>
export type Document         = Tables<'documents'>
export type Contact          = Tables<'contacts'>
export type CaseContact      = Tables<'case_contacts'>
export type NotificationLog  = Tables<'notification_logs'>
export type AuditLog         = Tables<'audit_logs'>

// insert type aliases

export type ProfileInsert         = TablesInsert<'profiles'>
export type CaseInsert            = TablesInsert<'cases'>
export type HearingInsert         = TablesInsert<'hearings'>
export type DeadlineInsert        = TablesInsert<'deadlines'>
export type DocumentInsert        = TablesInsert<'documents'>
export type ContactInsert         = TablesInsert<'contacts'>
export type NotificationLogInsert = TablesInsert<'notification_logs'>

// update type aliases

export type ProfileUpdate         = TablesUpdate<'profiles'>
export type CaseUpdate            = TablesUpdate<'cases'>
export type HearingUpdate         = TablesUpdate<'hearings'>
export type DeadlineUpdate        = TablesUpdate<'deadlines'>
export type DocumentUpdate        = TablesUpdate<'documents'>
export type ContactUpdate         = TablesUpdate<'contacts'>
export type NotificationLogUpdate = TablesUpdate<'notification_logs'>

// enum aliases

export type CaseStatus        = Enums<'case_status'>
export type CaseType          = Enums<'case_type'>
export type DeadlinePriority  = Enums<'deadline_priority'>
export type ContactRole       = Enums<'contact_role'>
export type DocumentType      = Enums<'document_type'>
export type NotificationType  = Enums<'notification_type'>
