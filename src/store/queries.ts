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
import {
  DEMO,
  demoAsados,
  demoAttendees,
  demoMatches,
  demoPredictions,
  demoProfiles,
  demoSettings,
  demoSpecials,
} from "@/lib/demo";

// ---------------------------------------------------------------------------
// Lecturas
// ---------------------------------------------------------------------------

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async (): Promise<Profile[]> => {
      if (DEMO) return demoProfiles;
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
      if (DEMO) return demoMatches;
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
      if (DEMO) return demoPredictions;
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
      if (DEMO) return demoSpecials;
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
      if (DEMO) return demoSettings;
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
      if (DEMO) return demoAsados;
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
      if (DEMO) return demoAttendees;
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
      if (DEMO) return;
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
      if (DEMO) return;
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
      kind: "asado" | "birra";
      title: string;
      date: string;
      host_id: string | null;
      created_by: string;
    }) => {
      if (DEMO) return;
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
      if (DEMO) return;
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
      if (DEMO) return;
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
      if (DEMO) return;
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
      if (DEMO) return;
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
      if (DEMO) return;
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
      if (DEMO) return;
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
      if (DEMO) return;
      const { error } = await supabase
        .from("asados")
        .update({ approved: input.approved })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/** Dispara la Edge Function que trae los resultados oficiales. */
export function useSyncNow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<{ updated?: number; info?: string }> => {
      if (DEMO)
        return { updated: 6, info: "Demo · 6 partidos actualizados" };
      const { data, error } = await supabase.functions.invoke("sync-results", {
        body: { force: true },
      });
      if (error) throw error;
      return data as { updated?: number; info?: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["matches"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
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
      if (DEMO) return;
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
