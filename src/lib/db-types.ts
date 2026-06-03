// Tipos de las tablas de Supabase. Se mantienen a mano (el esquema es chico).
// Coinciden con supabase/schema.sql.

export type MatchStage =
  | "group"
  | "r32"
  | "r16"
  | "qf"
  | "sf"
  | "third"
  | "final";

export interface Profile {
  id: string;
  display_name: string;
  is_admin: boolean;
  paid: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  stage: MatchStage;
  group_name: string | null;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  status: "scheduled" | "finished";
  created_at: string;
}

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  updated_at: string;
}

export interface SpecialPrediction {
  user_id: string;
  champion: string | null;
  best_player: string | null;
  top_scorer: string | null;
  updated_at: string;
}

export interface Settings {
  id: number;
  champion: string | null;
  best_player: string | null;
  top_scorer: string | null;
  entry_amount: number;
  currency: string;
  predictions_locked: boolean;
  specials_deadline: string | null;
}

export interface Asado {
  id: string;
  title: string;
  date: string;
  host_id: string | null;
  approved: boolean;
  created_by: string | null;
  created_at: string;
}

export interface AsadoAttendee {
  asado_id: string;
  user_id: string;
}

// Tipado mínimo para createClient<Database>. No necesitamos el shape completo
// de supabase-js, alcanza con dejar las tablas accesibles.
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      matches: { Row: Match; Insert: Partial<Match>; Update: Partial<Match> };
      predictions: { Row: Prediction; Insert: Partial<Prediction>; Update: Partial<Prediction> };
      special_predictions: {
        Row: SpecialPrediction;
        Insert: Partial<SpecialPrediction>;
        Update: Partial<SpecialPrediction>;
      };
      settings: { Row: Settings; Insert: Partial<Settings>; Update: Partial<Settings> };
      asados: { Row: Asado; Insert: Partial<Asado>; Update: Partial<Asado> };
      asado_attendees: {
        Row: AsadoAttendee;
        Insert: Partial<AsadoAttendee>;
        Update: Partial<AsadoAttendee>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
