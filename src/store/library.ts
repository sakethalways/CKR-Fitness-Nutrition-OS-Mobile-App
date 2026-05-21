import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { MealPlanTemplate } from "@/data/types";

const fromRow = (r: any): MealPlanTemplate => ({
  id: r.id,
  name: r.name,
  sourcePlanId: r.source_plan_id,
  sourceClientName: r.source_client_name,
  savedByAdminId: r.saved_by_admin_id,
  selectedMealIds: r.selected_meal_ids ?? [],
  calorieRangeLow: r.calorie_range_low,
  calorieRangeHigh: r.calorie_range_high,
  tagSummary: r.tag_summary ?? "",
  createdAt: r.created_at
});

const toDb = (t: Partial<MealPlanTemplate>) => {
  const out: any = {};
  if (t.name !== undefined) out.name = t.name;
  if (t.sourcePlanId !== undefined) out.source_plan_id = t.sourcePlanId;
  if (t.sourceClientName !== undefined) out.source_client_name = t.sourceClientName;
  if (t.savedByAdminId !== undefined) out.saved_by_admin_id = t.savedByAdminId;
  if (t.selectedMealIds !== undefined) out.selected_meal_ids = t.selectedMealIds;
  if (t.calorieRangeLow !== undefined) out.calorie_range_low = t.calorieRangeLow;
  if (t.calorieRangeHigh !== undefined) out.calorie_range_high = t.calorieRangeHigh;
  if (t.tagSummary !== undefined) out.tag_summary = t.tagSummary ?? null;
  return out;
};

type LibraryState = {
  templates: MealPlanTemplate[];
  hasHydrated: boolean;
  init: () => Promise<void>;
  dispose: () => void;
  saveTemplate: (
    t: Omit<MealPlanTemplate, "id" | "createdAt">
  ) => Promise<MealPlanTemplate>;
  removeTemplate: (id: string) => Promise<void>;
};

let channel: { unsubscribe: () => void } | null = null;

export const useLibrary = create<LibraryState>((set) => ({
  templates: [],
  hasHydrated: false,

  init: async () => {
    try {
      const { data, error } = await supabase
        .from("meal_plan_templates")
        .select("*")
        .order("created_at", { ascending: false });
      // RLS may deny non-admins — that's fine, just show empty.
      if (error) throw error;
      set({ templates: (data ?? []).map(fromRow), hasHydrated: true });
    } catch {
      set({ templates: [], hasHydrated: true });
    }

    if (channel) {
      try {
        await supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
      channel = null;
    }
    const ch = supabase.channel(`rt-library-${Date.now()}`);
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "meal_plan_templates" },
      (payload) => {
        const evt = payload.eventType;
        if (evt === "DELETE") {
          const oldId = payload.old?.id;
          if (!oldId) return;
          set((s) => ({ templates: s.templates.filter((t) => t.id !== oldId) }));
          return;
        }
        const next = fromRow(payload.new);
        set((s) => {
          const idx = s.templates.findIndex((t) => t.id === next.id);
          if (idx === -1) return { templates: [next, ...s.templates] };
          const copy = s.templates.slice();
          copy[idx] = next;
          return { templates: copy };
        });
      }
    );
    ch.subscribe();
    channel = ch;
  },

  dispose: () => {
    if (channel) {
      const ch = channel;
      channel = null;
      supabase.removeChannel(ch).catch(() => {});
    }
    set({ templates: [], hasHydrated: false });
  },

  saveTemplate: async (t) => {
    const { data, error } = await supabase
      .from("meal_plan_templates")
      .insert(toDb(t))
      .select()
      .single();
    if (error) throw error;
    const created = fromRow(data);
    set((s) => ({
      templates: [created, ...s.templates.filter((x) => x.id !== created.id)]
    }));
    return created;
  },

  removeTemplate: async (id) => {
    const { error } = await supabase
      .from("meal_plan_templates")
      .delete()
      .eq("id", id);
    if (error) throw error;
    set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
  }
}));
