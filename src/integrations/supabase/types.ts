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
      companies: {
        Row: {
          cnpj: string | null
          created_at: string
          email_domain: string
          id: string
          name: string
        }
        Insert: {
          cnpj?: string | null
          created_at?: string
          email_domain: string
          id?: string
          name: string
        }
        Update: {
          cnpj?: string | null
          created_at?: string
          email_domain?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      fiscal_notes: {
        Row: {
          chave: string | null
          company_id: string
          created_at: string
          created_by: string | null
          destinatario_cep: string | null
          destinatario_cnpj: string | null
          destinatario_endereco: string | null
          destinatario_municipio: string | null
          destinatario_nome: string | null
          destinatario_uf: string | null
          emitente_cnpj: string | null
          emitente_nome: string | null
          id: string
          itens: Json | null
          numero: string | null
          peso_kg: number | null
          raw_extracted: Json | null
          serie: string | null
          source_format: string
          valor_total: number | null
          volume_m3: number | null
        }
        Insert: {
          chave?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          destinatario_cep?: string | null
          destinatario_cnpj?: string | null
          destinatario_endereco?: string | null
          destinatario_municipio?: string | null
          destinatario_nome?: string | null
          destinatario_uf?: string | null
          emitente_cnpj?: string | null
          emitente_nome?: string | null
          id?: string
          itens?: Json | null
          numero?: string | null
          peso_kg?: number | null
          raw_extracted?: Json | null
          serie?: string | null
          source_format: string
          valor_total?: number | null
          volume_m3?: number | null
        }
        Update: {
          chave?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          destinatario_cep?: string | null
          destinatario_cnpj?: string | null
          destinatario_endereco?: string | null
          destinatario_municipio?: string | null
          destinatario_nome?: string | null
          destinatario_uf?: string | null
          emitente_cnpj?: string | null
          emitente_nome?: string | null
          id?: string
          itens?: Json | null
          numero?: string | null
          peso_kg?: number | null
          raw_extracted?: Json | null
          serie?: string | null
          source_format?: string
          valor_total?: number | null
          volume_m3?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fiscal_notes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      motoristas: {
        Row: {
          ativo: boolean
          capacidade_peso: number | null
          capacidade_volume: number | null
          checkin_time: string | null
          checkout_time: string | null
          company_id: string
          cor: string | null
          created_at: string
          id: string
          nome: string
          placa: string | null
          telefone: string | null
          veiculo: string | null
        }
        Insert: {
          ativo?: boolean
          capacidade_peso?: number | null
          capacidade_volume?: number | null
          checkin_time?: string | null
          checkout_time?: string | null
          company_id: string
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          placa?: string | null
          telefone?: string | null
          veiculo?: string | null
        }
        Update: {
          ativo?: boolean
          capacidade_peso?: number | null
          capacidade_volume?: number | null
          checkin_time?: string | null
          checkout_time?: string | null
          company_id?: string
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          placa?: string | null
          telefone?: string | null
          veiculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "motoristas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      paradas: {
        Row: {
          checkin_time: string | null
          checkout_time: string | null
          company_id: string
          created_at: string
          endereco: string | null
          eta_minutos: number | null
          fiscal_note_id: string | null
          horario: string | null
          horario_max: string | null
          horario_min: string | null
          id: string
          lat: number | null
          lng: number | null
          motorista_id: string | null
          municipio: string | null
          nome: string
          observacoes: string | null
          ordem: number | null
          peso: number | null
          produtos: Json | null
          status: string
          telefone: string | null
          tipo: string | null
          uf: string | null
          volume: number | null
        }
        Insert: {
          checkin_time?: string | null
          checkout_time?: string | null
          company_id: string
          created_at?: string
          endereco?: string | null
          eta_minutos?: number | null
          fiscal_note_id?: string | null
          horario?: string | null
          horario_max?: string | null
          horario_min?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          motorista_id?: string | null
          municipio?: string | null
          nome: string
          observacoes?: string | null
          ordem?: number | null
          peso?: number | null
          produtos?: Json | null
          status?: string
          telefone?: string | null
          tipo?: string | null
          uf?: string | null
          volume?: number | null
        }
        Update: {
          checkin_time?: string | null
          checkout_time?: string | null
          company_id?: string
          created_at?: string
          endereco?: string | null
          eta_minutos?: number | null
          fiscal_note_id?: string | null
          horario?: string | null
          horario_max?: string | null
          horario_min?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          motorista_id?: string | null
          municipio?: string | null
          nome?: string
          observacoes?: string | null
          ordem?: number | null
          peso?: number | null
          produtos?: Json | null
          status?: string
          telefone?: string | null
          tipo?: string | null
          uf?: string | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "paradas_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paradas_fiscal_note_id_fkey"
            columns: ["fiscal_note_id"]
            isOneToOne: false
            referencedRelation: "fiscal_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paradas_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "motoristas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
    },
  },
} as const
