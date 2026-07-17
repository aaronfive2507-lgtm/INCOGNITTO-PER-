// NOTA: este archivo normalmente se regenera con `supabase gen types typescript`.
// Se actualizó a mano porque este entorno no tiene el Supabase CLI conectado —
// regenerarlo cuando el usuario aplique la migración con el CLI real.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      asignaciones_mision: {
        Row: {
          id: string;
          celular_evaluador: string;
          nombre_evaluador: string | null;
          local_asignado: string;
          campana: string | null;
          fecha_mision: string | null;
          video_url: string;
          categoria: string | null;
          pasos_evaluacion: Json;
          alerta_identidad: string;
          preguntas_quiz: Json;
          system_prompt_chat: string;
          estado: "pendiente" | "capacitado" | "reprobado" | "completado";
          intentos_quiz: number;
          creado_por: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          celular_evaluador: string;
          nombre_evaluador?: string | null;
          local_asignado: string;
          campana?: string | null;
          fecha_mision?: string | null;
          video_url?: string;
          categoria?: string | null;
          pasos_evaluacion?: Json;
          alerta_identidad?: string;
          preguntas_quiz?: Json;
          system_prompt_chat?: string;
          estado?: "pendiente" | "capacitado" | "reprobado" | "completado";
          intentos_quiz?: number;
          creado_por?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          celular_evaluador?: string;
          nombre_evaluador?: string | null;
          local_asignado?: string;
          campana?: string | null;
          fecha_mision?: string | null;
          video_url?: string;
          categoria?: string | null;
          pasos_evaluacion?: Json;
          alerta_identidad?: string;
          preguntas_quiz?: Json;
          system_prompt_chat?: string;
          estado?: "pendiente" | "capacitado" | "reprobado" | "completado";
          intentos_quiz?: number;
          creado_por?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      quiz_resultados: {
        Row: {
          id: string;
          asignacion_id: string;
          puntaje: number;
          aprobado: boolean;
          fecha: string;
        };
        Insert: {
          id?: string;
          asignacion_id: string;
          puntaje: number;
          aprobado: boolean;
          fecha?: string;
        };
        Update: {
          id?: string;
          asignacion_id?: string;
          puntaje?: number;
          aprobado?: boolean;
          fecha?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_resultados_asignacion_id_fkey";
            columns: ["asignacion_id"];
            isOneToOne: false;
            referencedRelation: "asignaciones_mision";
            referencedColumns: ["id"];
          },
        ];
      };
      chat_preguntas: {
        Row: {
          id: string;
          asignacion_id: string | null;
          pregunta: string;
          respuesta: string | null;
          fecha: string;
        };
        Insert: {
          id?: string;
          asignacion_id?: string | null;
          pregunta: string;
          respuesta?: string | null;
          fecha?: string;
        };
        Update: {
          id?: string;
          asignacion_id?: string | null;
          pregunta?: string;
          respuesta?: string | null;
          fecha?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chat_preguntas_asignacion_id_fkey";
            columns: ["asignacion_id"];
            isOneToOne: false;
            referencedRelation: "asignaciones_mision";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      buscar_misiones_por_celular: {
        Args: { p_celular: string };
        Returns: Database["public"]["Tables"]["asignaciones_mision"]["Row"][];
      };
      registrar_resultado_quiz: {
        Args: { p_asignacion_id: string; p_puntaje: number };
        Returns: { aprobado: boolean; intentos: number }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
