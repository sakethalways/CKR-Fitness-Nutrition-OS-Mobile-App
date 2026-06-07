import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import {
  Client,
  Plan,
  Trainer,
  Meal,
  ClientStatus,
  ClientType,
  FoodPref,
  Goal,
  ActivityLevel,
  Gender,
  Allergen,
  Role
} from "@/data/types";
import { mealFromRow, mealToDb } from "@/lib/mealMapper";
import { seedMeals } from "@/data/meals";

// ===========================================================================
// Mappers — Supabase rows (snake_case) ↔ app types (camelCase)
// ===========================================================================

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

const trainerFromRow = (r: any): Trainer => ({
  id: r.id,
  name: r.name,
  mobile: r.mobile,
  age: r.age,
  gender: r.gender,
  password: "",
  isActive: r.is_active,
  createdAt: r.created_at,
  initials: initialsOf(r.name),
  avatarUri: r.avatar_url ?? undefined
});

const trainerToDb = (t: Partial<Trainer>) => {
  const out: any = {};
  if (t.name !== undefined) out.name = t.name;
  if (t.mobile !== undefined) out.mobile = t.mobile;
  if (t.age !== undefined) out.age = t.age;
  if (t.gender !== undefined) out.gender = t.gender;
  if (t.isActive !== undefined) out.is_active = t.isActive;
  if (t.avatarUri !== undefined) out.avatar_url = t.avatarUri ?? null;
  return out;
};

const clientFromRow = (r: any): Client => ({
  id: r.id,
  trainerId: r.trainer_id,
  name: r.name,
  initials: initialsOf(r.name),
  age: r.age,
  gender: r.gender as Gender,
  weight: Number(r.weight),
  height: Number(r.height),
  goal: r.goal as Goal,
  activityLevel: r.activity_level as ActivityLevel,
  clientTypes: (r.client_types ?? []) as ClientType[],
  foodPref: r.food_pref as FoodPref,
  allergens: (r.allergens ?? []) as Allergen[],
  status: r.status as ClientStatus,
  notes: r.notes ?? "",
  phoneCountryCode: r.phone_country_code ?? undefined,
  phoneNumber: r.phone_number ?? undefined,
  calorieTarget: r.calorie_target ?? undefined,
  proteinTarget: r.protein_target ?? undefined,
  lastPlanDate: r.last_plan_date ?? undefined,
  closedAt: r.closed_at ?? undefined,
  deletionRequestedBy: r.deletion_requested_by ?? undefined,
  deletionRequestedAt: r.deletion_requested_at ?? undefined
});

const clientToDb = (c: Partial<Client>) => {
  const out: any = {};
  if (c.trainerId !== undefined) out.trainer_id = c.trainerId;
  if (c.name !== undefined) out.name = c.name;
  if (c.age !== undefined) out.age = c.age;
  if (c.gender !== undefined) out.gender = c.gender;
  if (c.weight !== undefined) out.weight = c.weight;
  if (c.height !== undefined) out.height = c.height;
  if (c.goal !== undefined) out.goal = c.goal;
  if (c.activityLevel !== undefined) out.activity_level = c.activityLevel;
  if (c.clientTypes !== undefined) out.client_types = c.clientTypes;
  if (c.foodPref !== undefined) out.food_pref = c.foodPref;
  if (c.allergens !== undefined) out.allergens = c.allergens;
  if (c.status !== undefined) out.status = c.status;
  if (c.notes !== undefined) out.notes = c.notes;
  if (c.phoneCountryCode !== undefined) out.phone_country_code = c.phoneCountryCode ?? null;
  if (c.phoneNumber !== undefined) out.phone_number = c.phoneNumber ?? null;
  if (c.calorieTarget !== undefined) out.calorie_target = c.calorieTarget ?? null;
  if (c.proteinTarget !== undefined) out.protein_target = c.proteinTarget ?? null;
  if (c.lastPlanDate !== undefined) out.last_plan_date = c.lastPlanDate ?? null;
  if (c.closedAt !== undefined) out.closed_at = c.closedAt ?? null;
  if (c.deletionRequestedBy !== undefined)
    out.deletion_requested_by = c.deletionRequestedBy ?? null;
  if (c.deletionRequestedAt !== undefined)
    out.deletion_requested_at = c.deletionRequestedAt ?? null;
  return out;
};

const planFromRow = (r: any): Plan => ({
  id: r.id,
  clientId: r.client_id,
  weekNumber: r.week_number,
  calorieRangeLow: r.calorie_range_low,
  calorieRangeHigh: r.calorie_range_high,
  status: r.status as "active" | "past",
  avgRating: Number(r.avg_rating),
  createdAt: r.created_at,
  selectedMealIds: r.selected_meal_ids ?? [],
  ratings: r.ratings ?? undefined,
  ratedAt: r.rated_at ?? undefined,
  ratedBy: r.rated_by ?? undefined
});

const planToDb = (p: Partial<Plan>) => {
  const out: any = {};
  if (p.clientId !== undefined) out.client_id = p.clientId;
  if (p.weekNumber !== undefined) out.week_number = p.weekNumber;
  if (p.calorieRangeLow !== undefined) out.calorie_range_low = p.calorieRangeLow;
  if (p.calorieRangeHigh !== undefined) out.calorie_range_high = p.calorieRangeHigh;
  if (p.status !== undefined) out.status = p.status;
  if (p.avgRating !== undefined) out.avg_rating = p.avgRating;
  if (p.createdAt !== undefined) out.created_at = p.createdAt;
  if (p.selectedMealIds !== undefined) out.selected_meal_ids = p.selectedMealIds;
  if (p.ratings !== undefined) out.ratings = p.ratings ?? null;
  if (p.ratedAt !== undefined) out.rated_at = p.ratedAt ?? null;
  if (p.ratedBy !== undefined) out.rated_by = p.ratedBy ?? null;
  return out;
};

// ===========================================================================
// Store
// ===========================================================================

export type AdminStats = {
  activeClients: number;
  critical: number;
  completed: number;
  trainers: number;
  avgRating: number;
};

export type ClientQuery = {
  search?: string;
  status?: ClientStatus;
  limit?: number;
  offset?: number;
};

type DataState = {
  trainers: Trainer[];
  clients: Client[];
  plans: Plan[];
  meals: Meal[];
  hasHydrated: boolean;
  loading: boolean;

  init: (role?: Role) => Promise<void>;
  dispose: () => Promise<void>;

  // Scale helpers — query the server directly instead of holding everything in
  // memory (the in-memory arrays are capped by PostgREST's 1000-row limit).
  fetchAdminStats: () => Promise<AdminStats>;
  searchClients: (q: ClientQuery) => Promise<Client[]>;

  addClient: (c: Omit<Client, "id" | "initials">) => Promise<Client>;
  updateClient: (id: string, patch: Partial<Client>) => Promise<void>;
  removeClient: (id: string) => Promise<void>;

  addPlan: (p: Omit<Plan, "id">) => Promise<Plan>;
  updatePlan: (id: string, patch: Partial<Plan>) => Promise<void>;
  deletePlan: (id: string) => Promise<void>;
  saveRatings: (
    planId: string,
    ratings: Record<string, number>,
    ratedBy: string
  ) => Promise<void>;

  addMeal: (m: Omit<Meal, "id">) => Promise<Meal>;
  updateMeal: (id: number, patch: Partial<Meal>) => Promise<void>;
  deleteMeal: (id: number) => Promise<void>;
  fetchMeals: () => Promise<void>;

  updateTrainer: (id: string, patch: Partial<Trainer>) => Promise<void>;
};

const subscriptions: { unsubscribe: () => void }[] = [];

const average = (xs: number[]) =>
  xs.length === 0
    ? 0
    : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;

export const useData = create<DataState>((set, get) => ({
  trainers: [],
  clients: [],
  plans: [],
  meals: [],
  hasHydrated: false,
  loading: false,

  init: async (role) => {
    if (get().loading) return;
    set({ loading: true });
    const isAdmin = role === "admin";
    try {
      // Initial fetch — RLS scopes results to what the caller can see.
      // Capped at 1000 rows (PostgREST limit). For trainers this is plenty
      // (their own clients); admins use searchClients()/fetchAdminStats() to
      // reach beyond the cap. We surface truncation loudly instead of silently.
      const [tRes, cRes, pRes, mRes] = await Promise.all([
        supabase.from("trainers").select("*").order("created_at").range(0, 999),
        supabase
          .from("clients")
          .select("*")
          .order("created_at", { ascending: false })
          .range(0, 999),
        supabase
          .from("plans")
          .select("*")
          .order("created_at", { ascending: false })
          .range(0, 999),
        supabase.from("meals").select("*").order("meal_number").order("cal_bracket")
      ]);

      if ((cRes.data?.length ?? 0) >= 1000 || (pRes.data?.length ?? 0) >= 1000) {
        // eslint-disable-next-line no-console
        console.warn(
          "[data] init hit the 1000-row cap — admin lists are truncated; use search/stats RPC for full coverage."
        );
      }

      let meals = (mRes.data ?? []).map(mealFromRow);

      // Fallback to seedMeals if DB is empty (first-time setup)
      if (meals.length === 0) {
        meals = seedMeals;
      }

      set({
        trainers: (tRes.data ?? []).map(trainerFromRow),
        clients: (cRes.data ?? []).map(clientFromRow),
        plans: (pRes.data ?? []).map(planFromRow),
        meals,
        hasHydrated: true,
        loading: false
      });

      // Real-time subscriptions — RLS automatically filters.
      // Use unique channel names + removeChannel to avoid "callbacks after
      // subscribe()" errors when init runs more than once.
      await dispose();
      const ts = Date.now();

      const trainersCh = supabase.channel(`rt-trainers-${ts}`);
      trainersCh.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "trainers" },
        (payload) =>
          set((s) => ({
            trainers: handlePayload(s.trainers, payload, trainerFromRow)
          }))
      );
      trainersCh.subscribe();
      subscriptions.push(trainersCh);

      // clients/plans realtime is the high-volume firehose. For TRAINERS, RLS
      // scopes the stream to their own clients (tiny) — safe to keep live. For
      // ADMINS at scale it would be every client/plan change across every
      // trainer, so we skip it; the admin refreshes on demand (pull-to-refresh,
      // search, stats RPC) instead.
      if (!isAdmin) {
        const clientsCh = supabase.channel(`rt-clients-${ts}`);
        clientsCh.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "clients" },
          (payload) =>
            set((s) => ({
              clients: handlePayload(s.clients, payload, clientFromRow)
            }))
        );
        clientsCh.subscribe();
        subscriptions.push(clientsCh);

        const plansCh = supabase.channel(`rt-plans-${ts}`);
        plansCh.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "plans" },
          (payload) =>
            set((s) => ({
              plans: handlePayload(s.plans, payload, planFromRow)
            }))
        );
        plansCh.subscribe();
        subscriptions.push(plansCh);
      }

      const mealsCh = supabase.channel(`rt-meals-${ts}`);
      mealsCh.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meals" },
        (payload) =>
          set((s) => ({
            meals: handlePayload(s.meals, payload, mealFromRow)
          }))
      );
      mealsCh.subscribe();
      subscriptions.push(mealsCh);
    } catch (e) {
      set({ loading: false, hasHydrated: true });
      // eslint-disable-next-line no-console
      console.warn("[data] init failed", e);
    }
  },

  dispose: async () => {
    await dispose();
    set({ trainers: [], clients: [], plans: [], meals: [], hasHydrated: false });
  },

  fetchAdminStats: async () => {
    const { data, error } = await supabase
      .rpc("admin_dashboard_stats")
      .single<{
        active_clients: number;
        critical: number;
        completed: number;
        active_trainers: number;
        avg_rating: number;
      }>();
    if (error || !data) {
      // Fallback to in-memory compute (correct for trainers / small datasets).
      return computeAdminStats();
    }
    return {
      activeClients: data.active_clients ?? 0,
      critical: data.critical ?? 0,
      completed: data.completed ?? 0,
      trainers: data.active_trainers ?? 0,
      avgRating: Number(data.avg_rating ?? 0)
    };
  },

  searchClients: async (q) => {
    const limit = q.limit ?? 30;
    const offset = q.offset ?? 0;
    let query = supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    const term = q.search?.trim();
    if (term) query = query.ilike("name", `%${term}%`);
    if (q.status) query = query.eq("status", q.status);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(clientFromRow);
  },

  addClient: async (c) => {
    const { data, error } = await supabase
      .from("clients")
      .insert(clientToDb(c))
      .select()
      .single();
    if (error) throw error;
    const created = clientFromRow(data);
    // Optimistic merge (real-time will also fire — id-based merge is idempotent)
    set((s) => ({
      clients: upsertById(s.clients, created)
    }));
    return created;
  },

  updateClient: async (id, patch) => {
    const { data, error } = await supabase
      .from("clients")
      .update(clientToDb(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data)
      set((s) => ({
        clients: upsertById(s.clients, clientFromRow(data))
      }));
  },

  removeClient: async (id) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
    set((s) => ({
      clients: s.clients.filter((c) => c.id !== id),
      plans: s.plans.filter((p) => p.clientId !== id)
    }));
  },

  addPlan: async (p) => {
    // Demote any active plan for this client first
    const existingActive = get().plans.filter(
      (pl) => pl.clientId === p.clientId && pl.status === "active"
    );
    if (existingActive.length > 0) {
      await Promise.all(
        existingActive.map((pl) =>
          supabase.from("plans").update({ status: "past" }).eq("id", pl.id)
        )
      );
    }

    const { data, error } = await supabase
      .from("plans")
      .insert(planToDb(p))
      .select()
      .single();
    if (error) throw error;
    const created = planFromRow(data);
    set((s) => ({
      plans: upsertById(
        s.plans.map((pl) =>
          pl.clientId === created.clientId && pl.status === "active"
            ? { ...pl, status: "past" as const }
            : pl
        ),
        created
      )
    }));

    // Stamp the client's last_plan_date
    await supabase
      .from("clients")
      .update({ last_plan_date: created.createdAt })
      .eq("id", created.clientId);

    return created;
  },

  updatePlan: async (id, patch) => {
    const { data, error } = await supabase
      .from("plans")
      .update(planToDb(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data)
      set((s) => ({
        plans: upsertById(s.plans, planFromRow(data))
      }));
  },

  deletePlan: async (id) => {
    const { error } = await supabase
      .from("plans")
      .delete()
      .eq("id", id);
    if (error) throw error;
    set((s) => ({
      plans: s.plans.filter((p) => p.id !== id)
    }));
  },

  saveRatings: async (planId, ratings, ratedBy) => {
    const scores = Object.values(ratings);
    const avg = average(scores);
    const { data, error } = await supabase
      .from("plans")
      .update({
        ratings,
        avg_rating: avg,
        rated_at: new Date().toISOString(),
        rated_by: ratedBy
      })
      .eq("id", planId)
      .select()
      .single();
    if (error) throw error;
    if (data)
      set((s) => ({
        plans: upsertById(s.plans, planFromRow(data))
      }));

    // Feedback loop: roll these scores into each meal's rating so the
    // generator learns. Runs via a SECURITY DEFINER RPC (meals are
    // admin-write-only, but trainers rate). Non-fatal — never block the save.
    if (Object.keys(ratings).length > 0) {
      const { error: rErr } = await supabase.rpc("apply_meal_ratings", {
        meal_ratings: ratings
      });
      if (rErr) {
        // eslint-disable-next-line no-console
        console.warn("[ratings] apply_meal_ratings failed", rErr.message);
      }
    }
  },

  addMeal: async (m) => {
    const { data, error } = await supabase
      .from("meals")
      .insert(mealToDb(m))
      .select()
      .single();
    if (error) throw error;
    const meal = mealFromRow(data);
    set((s) => ({
      meals: upsertById(s.meals, meal)
    }));
    return meal;
  },

  updateMeal: async (id, patch) => {
    const { data, error } = await supabase
      .from("meals")
      .update(mealToDb(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data)
      set((s) => ({
        meals: upsertById(s.meals, mealFromRow(data))
      }));
  },

  deleteMeal: async (id) => {
    const { error } = await supabase
      .from("meals")
      .delete()
      .eq("id", id);
    if (error) throw error;
    set((s) => ({
      meals: s.meals.filter((m) => m.id !== id)
    }));
  },

  fetchMeals: async () => {
    const { data, error } = await supabase
      .from("meals")
      .select("*")
      .order("meal_number", { ascending: true })
      .order("cal_bracket", { ascending: true });
    if (error) {
      console.warn("[fetchMeals] error", error);
      // Fallback to seedMeals if fetch fails
      set({ meals: seedMeals });
      return;
    }
    const meals = (data ?? []).map(mealFromRow);
    set({ meals: meals.length > 0 ? meals : seedMeals });
  },

  updateTrainer: async (id, patch) => {
    const { data, error } = await supabase
      .from("trainers")
      .update(trainerToDb(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (data)
      set((s) => ({
        trainers: upsertById(s.trainers, trainerFromRow(data))
      }));
  }
}));

// ===========================================================================
// Helpers
// ===========================================================================

const dispose = async () => {
  while (subscriptions.length > 0) {
    const ch = subscriptions.pop();
    if (!ch) continue;
    try {
      await supabase.removeChannel(ch as any);
    } catch {
      /* silent */
    }
  }
};

function upsertById<T extends { id: string | number }>(arr: T[], next: T): T[] {
  const idx = arr.findIndex((r) => r.id === next.id);
  if (idx === -1) return [next, ...arr];
  const copy = arr.slice();
  copy[idx] = next;
  return copy;
}

// Apply a Supabase realtime payload to a local array and return the new array.
function handlePayload<T extends { id: string | number }>(
  arr: T[],
  payload: any,
  mapper: (row: any) => T
): T[] {
  if (payload.eventType === "DELETE") {
    const oldId = payload.old?.id;
    if (!oldId) return arr;
    return arr.filter((r) => r.id !== oldId);
  }
  return upsertById(arr, mapper(payload.new));
}

// ===========================================================================
// Selectors (kept for backward compat with existing screens)
// ===========================================================================

export const selectTrainer = (id: string) =>
  useData.getState().trainers.find((t) => t.id === id);

export const selectClient = (id: string) =>
  useData.getState().clients.find((c) => c.id === id);

export const selectPlan = (id: string) =>
  useData.getState().plans.find((p) => p.id === id);

export const selectClientsForTrainer = (trainerId: string) =>
  useData
    .getState()
    .clients.filter(
      (c) => c.trainerId === trainerId && c.status !== "Completed"
    );

export const selectAllActiveClients = () =>
  useData.getState().clients.filter((c) => c.status !== "Completed");

export const selectCompletedClients = () =>
  useData.getState().clients.filter((c) => c.status === "Completed");

export const selectPlansForClient = (clientId: string) =>
  useData
    .getState()
    .plans.filter((p) => p.clientId === clientId)
    .sort((a, b) => b.weekNumber - a.weekNumber);

export const computeTrainerStats = (trainerId: string) => {
  const clients = selectClientsForTrainer(trainerId);
  const clientIds = new Set(clients.map((c) => c.id));
  const plans = useData
    .getState()
    .plans.filter((p) => clientIds.has(p.clientId));
  const sevenDays = 1000 * 60 * 60 * 24 * 7;
  const now = Date.now();
  const plansThisWeek = plans.filter(
    (p) => now - new Date(p.createdAt).getTime() <= sevenDays
  ).length;
  const ratings = plans.map((p) => p.avgRating).filter((r) => r > 0);
  return {
    activeClients: clients.length,
    plansThisWeek,
    avgRating: average(ratings)
  };
};

export const computeAdminStats = (): AdminStats => {
  const allClients = useData.getState().clients;
  const active = allClients.filter((c) => c.status !== "Completed");
  const critical = active.filter((c) => c.status === "Critical").length;
  const completed = allClients.length - active.length;
  const trainers = useData
    .getState()
    .trainers.filter((t) => t.isActive).length;
  const plans = useData.getState().plans;
  const ratedPlans = plans.filter((p) => p.avgRating > 0);
  return {
    activeClients: active.length,
    critical,
    completed,
    trainers,
    avgRating: average(ratedPlans.map((p) => p.avgRating))
  };
};
