import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Asado,
  AsadoAttendee,
  Match,
  Prediction,
  Profile,
  Settings,
  SpecialPrediction,
} from "@/lib/db-types";
import { computeLeaderboard, computePot } from "@/lib/scoring";

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("display_name");
      if (error) throw error;
      return (data as Profile[]) ?? [];
    },
  });
}

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async (): Promise<Match[]> => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .order("kickoff_at");
      if (error) throw error;
      return (data as Match[]) ?? [];
    },
  });
}

/** Pronósticos visibles: propios siempre, ajenos sólo después del kickoff (RLS). */
export function usePredictions() {
  return useQuery({
    queryKey: ["predictions"],
    queryFn: async (): Promise<Prediction[]> => {
      const { data, error } = await supabase.from("predictions").select("*");
      if (error) throw error;
      return (data as Prediction[]) ?? [];
    },
  });
}

export function useSpecials() {
  return useQuery({
    queryKey: ["specials"],
    queryFn: async (): Promise<SpecialPrediction[]> => {
      const { data, error } = await supabase
        .from("special_predictions")
        .select("*");
      if (error) throw error;
      return (data as SpecialPrediction[]) ?? [];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async (): Promise<Settings | null> => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data as Settings) ?? null;
    },
  });
}

export function useAsados() {
  return useQuery({
    queryKey: ["asados"],
    queryFn: async (): Promise<Asado[]> => {
      const { data, error } = await supabase
        .from("asados")
        .select("*")
        .order("date");
      if (error) throw error;
      return (data as Asado[]) ?? [];
    },
  });
}

export function useAttendees() {
  return useQuery({
    queryKey: ["attendees"],
    queryFn: async (): Promise<AsadoAttendee[]> => {
      const { data, error } = await supabase
        .from("asado_attendees")
        .select("*");
      if (error) throw error;
      return (data as AsadoAttendee[]) ?? [];
    },
  });
}

// ---------------------------------------------------------------------------
// Tabla de posiciones (derivada)
// ---------------------------------------------------------------------------

export function useLeaderboard() {
  const profiles = useProfiles();
  const matches = useMatches();
  const predictions = usePredictions();
  const specials = useSpecials();
  const settings = useSettings();
  const asados = useAsados();
  const attendees = useAttendees();

  const isLoading =
    profiles.isLoading ||
    matches.isLoading ||
    predictions.isLoading ||
    specials.isLoading ||
    settings.isLoading ||
    asados.isLoading ||
    attendees.isLoading;

  const rows = computeLeaderboard({
    profiles: profiles.data ?? [],
    matches: matches.data ?? [],
    predictions: predictions.data ?? [],
    specials: specials.data ?? [],
    settings: settings.data ?? null,
    asados: asados.data ?? [],
    attendees: attendees.data ?? [],
  });

  const entry = settings.data?.entry_amount ?? 0;
  const pot = computePot(profiles.data ?? [], entry);

  return { rows, pot, settings: settings.data ?? null, isLoading };
}

// ---------------------------------------------------------------------------
// Mutaciones
// ---------------------------------------------------------------------------

function useInvalidate(keys: string[]) {
  const qc = useQueryClient();
  return () => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

export function useUpsertPrediction() {
  const invalidate = useInvalidate(["predictions"]);
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      match_id: string;
      home_score: number;
      away_score: number;
    }) => {
      const { error } = await supabase
        .from("predictions")
        .upsert(
          { ...input, updated_at: new Date().toISOString() },
          { onConflict: "user_id,match_id" }
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useUpsertSpecial() {
  const invalidate = useInvalidate(["specials"]);
  return useMutation({
    mutationFn: async (input: {
      user_id: string;
      champion: string | null;
      best_player: string | null;
      top_scorer: string | null;
    }) => {
      const { error } = await supabase
        .from("special_predictions")
        .upsert(
          { ...input, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useCreateAsado() {
  const invalidate = useInvalidate(["asados", "attendees"]);
  return useMutation({
    mutationFn: async (input: {
      title: string;
      date: string;
      host_id: string;
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from("asados")
        .insert(input)
        .select("id")
        .single();
      if (error) throw error;
      // El que crea queda anotado como comensal (la RLS sólo permite
      // anotarse a uno mismo, por eso usamos created_by y no host_id).
      const asadoId = (data as { id: string }).id;
      await supabase
        .from("asado_attendees")
        .insert({ asado_id: asadoId, user_id: input.created_by });
    },
    onSuccess: invalidate,
  });
}

export function useToggleAttendance() {
  const invalidate = useInvalidate(["attendees"]);
  return useMutation({
    mutationFn: async (input: {
      asado_id: string;
      user_id: string;
      attending: boolean;
    }) => {
      if (input.attending) {
        const { error } = await supabase
          .from("asado_attendees")
          .upsert(
            { asado_id: input.asado_id, user_id: input.user_id },
            { onConflict: "asado_id,user_id" }
          );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("asado_attendees")
          .delete()
          .eq("asado_id", input.asado_id)
          .eq("user_id", input.user_id);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useDeleteAsado() {
  const invalidate = useInvalidate(["asados", "attendees"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("asados").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// ---- Admin ----

export function useSaveMatch() {
  const invalidate = useInvalidate(["matches"]);
  return useMutation({
    mutationFn: async (input: Partial<Match> & { id?: string }) => {
      if (input.id) {
        const { error } = await supabase
          .from("matches")
          .update(input)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("matches").insert(input);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });
}

export function useBulkInsertMatches() {
  const invalidate = useInvalidate(["matches"]);
  return useMutation({
    mutationFn: async (rows: Partial<Match>[]) => {
      const { error } = await supabase.from("matches").insert(rows);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteMatch() {
  const invalidate = useInvalidate(["matches", "predictions"]);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSaveSettings() {
  const invalidate = useInvalidate(["settings"]);
  return useMutation({
    mutationFn: async (input: Partial<Settings>) => {
      const { error } = await supabase
        .from("settings")
        .update(input)
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSetAsadoApproved() {
  const invalidate = useInvalidate(["asados"]);
  return useMutation({
    mutationFn: async (input: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("asados")
        .update({ approved: input.approved })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useSetProfileFlags() {
  const invalidate = useInvalidate(["profiles"]);
  return useMutation({
    mutationFn: async (input: {
      id: string;
      paid?: boolean;
      is_admin?: boolean;
    }) => {
      const { id, ...rest } = input;
      const { error } = await supabase
        .from("profiles")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
