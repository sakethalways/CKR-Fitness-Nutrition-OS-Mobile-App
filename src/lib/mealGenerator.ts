import { Client, Meal, Plan } from "@/data/types";
import { seedMeals } from "@/data/meals";
import { mealConflictsWithClient } from "@/lib/allergens";

// Four generated slots. Shares sum to 1.0 so the plan targets the FULL daily
// calorie / protein goal.
// Shares sum to 1.0 AND keep each slot's target within the reachable meal
// brackets (main meals cap at 550 kcal, snacks at 300). The old Lunch 0.35
// pushed its target past 550 for typical clients, so the daily total drifted
// under target. These keep Lunch/Dinner ~reachable.
// Exported so display surfaces (e.g. plan-detail slot headers) show the SAME
// per-slot targets the generator actually aimed for.
export const CAL_SHARE: Record<
  "Breakfast" | "Lunch" | "Dinner" | "Snack",
  number
> = {
  Breakfast: 0.28,
  Lunch: 0.3,
  Dinner: 0.3,
  Snack: 0.12
};

// Client "type" vocabulary → meal tag vocabulary, so preference boosts fire
// (e.g. a "Busy Pro" client should match meals tagged "Busy").
const TYPE_TO_TAGS: Record<string, string[]> = {
  "Busy Pro": ["Busy"],
  Vegetarian: ["Vegetarian", "Veg"],
  "Sweet Craving": ["Sweet Craving"],
  Standard: ["Standard"]
};

export type GeneratedSlot = {
  slot: string;
  targetKcal: number;
  meals: Meal[];
};

export type GenerationResult = {
  slots: GeneratedSlot[];
  flatMeals: Meal[];
  rangeLow: number;
  rangeHigh: number;
  proteinLow: number;
  proteinHigh: number;
  // Slots the catalogue HAS meals for, but none survived this client's
  // diet/allergen filter — so the trainer understands why a slot is absent
  // instead of seeing a silent gap.
  missingSlots: string[];
};

const clientTagSet = (client: Client): Set<string> => {
  const set = new Set<string>();
  for (const ct of client.clientTypes) {
    for (const tag of TYPE_TO_TAGS[ct] ?? [ct]) set.add(tag);
  }
  return set;
};

// Higher is better. CALORIE FIT DOMINATES so the picked meals land near each
// slot's target and the daily total ≈ the client's target. Protein is a
// secondary nudge that breaks ties toward higher-protein options WITHIN the
// calorie-appropriate set (rather than overshooting calories to chase protein,
// which is what made breakfast pick a 513 kcal meal for a ~443 slot).
// Repeat-avoidance is handled by the tiered passes in pickSlot, not here.
const scoreVariant = (
  meal: Meal,
  tagSet: Set<string>,
  slotCal: number,
  slotProt: number
): number => {
  const calCost = slotCal > 0 ? Math.abs(meal.calories - slotCal) / slotCal : 0;
  const protShortfall =
    slotProt > 0 ? Math.max(0, slotProt - meal.proteinG) / slotProt : 0;
  const tagMatches = meal.clientTags.filter((t) => tagSet.has(t)).length;

  return (
    -4.0 * calCost - // calorie fit dominates
    1.0 * protShortfall + // protein is a tie-breaker, not an override
    0.3 * tagMatches +
    0.1 * meal.rating
  );
};

// Pick up to 2 DISTINCT meals (best variant of each) for a slot.
// Prefers meal numbers not used elsewhere in the plan (variety), but FALLS
// BACK to reusing them if that's all the (allergen/diet-filtered) catalogue
// offers — so a slot is never silently dropped just because Lunch already
// took the only veg options. As long as the pool has ≥1 meal of this type,
// the slot is populated.
const pickSlot = (
  pool: Meal[],
  type: Meal["mealType"],
  slotCal: number,
  slotProt: number,
  tagSet: Set<string>,
  used: Set<number>,
  recent: Set<number>
): Meal[] => {
  const sorted = pool
    .filter((m) => m.mealType === type)
    .map((m) => ({ m, s: scoreVariant(m, tagSet, slotCal, slotProt) }))
    .sort((a, b) => b.s - a.s);

  const chosen: Meal[] = [];
  const takenNums = new Set<number>();

  const take = (skipUsed: boolean, skipRecent: boolean) => {
    for (const { m } of sorted) {
      if (chosen.length === 2) break;
      if (takenNums.has(m.mealNumber)) continue; // best variant per meal number
      if (skipUsed && used.has(m.mealNumber)) continue;
      if (skipRecent && recent.has(m.mealNumber)) continue;
      chosen.push(m);
      takenNums.add(m.mealNumber);
    }
  };

  // Tiered preference, each relaxing one constraint so a slot is never starved:
  take(true, true); //   freshest: not in this plan AND not in recent plans
  if (chosen.length < 2) take(true, false); // allow meals from recent plans
  if (chosen.length < 2) take(false, false); // last resort: reuse within plan
  chosen.forEach((m) => used.add(m.mealNumber));
  return chosen;
};

export const generateForClient = (
  client: Client,
  priorPlans: Plan[] = [],
  // Live store meals so generated plans reference the SAME ids the rest of the
  // app reads back; falls back to seedMeals only before hydration.
  sourceMeals: Meal[] = seedMeals
): GenerationResult => {
  const target = client.calorieTarget ?? 1800;
  const proteinTarget = client.proteinTarget ?? 0;
  const wantsVegOnly = client.foodPref === "Veg";
  const catalogue = sourceMeals.length > 0 ? sourceMeals : seedMeals;
  const tagSet = clientTagSet(client);

  // Structured allergen + diet filtering (reliable set-intersection).
  const pool = catalogue.filter((m) => {
    if (wantsVegOnly && m.diet === "Non-Veg") return false;
    if (mealConflictsWithClient(m.allergens, client.allergens)) return false;
    return true;
  });

  // Meal numbers used in the last couple of plans → deprioritise for rotation.
  const idToNum = new Map<number, number>();
  catalogue.forEach((m) => idToNum.set(m.id, m.mealNumber));
  const recent = new Set<number>();
  priorPlans.slice(0, 2).forEach((p) =>
    (p.selectedMealIds ?? []).forEach((id) => {
      const num = idToNum.get(Number(id));
      if (num !== undefined) recent.add(num);
    })
  );

  const used = new Set<number>();
  const slots: GeneratedSlot[] = [];
  const missingSlots: string[] = [];

  // Carry-over allocation: each slot starts from its share of the target, PLUS
  // whatever the previous slots couldn't place. If Lunch's share is 612 kcal
  // but its biggest option is 547, the 65 kcal shortfall rolls into Dinner's
  // budget so a bigger dinner is preferred — and vice versa when a slot
  // overshoots. This makes the day's total land as close to the client's
  // target as the catalogue allows, instead of every slot silently keeping its
  // fixed share.
  let carry = 0;

  const addSlot = (
    label: "Breakfast" | "Lunch" | "Dinner" | "Snack",
    type: Meal["mealType"]
  ) => {
    const baseCal = target * CAL_SHARE[label];
    const slotCal = Math.max(0, Math.round(baseCal + carry));
    const slotProt = Math.round(proteinTarget * CAL_SHARE[label]);
    const meals = pickSlot(pool, type, slotCal, slotProt, tagSet, used, recent);
    if (meals.length > 0) {
      // Expected contribution = average of the slot's options (client picks one).
      const avgCal =
        meals.reduce((sum, m) => sum + m.calories, 0) / meals.length;
      carry = slotCal - avgCal;
      slots.push({ slot: label, targetKcal: slotCal, meals });
    } else {
      // Slot has no meals — its whole budget rolls forward so the remaining
      // slots can absorb what the catalogue allows.
      carry = slotCal;
      if (catalogue.some((m) => m.mealType === type)) {
        // The catalogue has meals of this type, but none passed the client's
        // diet/allergen filter → flag it so the UI can explain the gap.
        if (!missingSlots.includes(label)) missingSlots.push(label);
      }
    }
  };

  addSlot("Breakfast", "Breakfast");
  addSlot("Lunch", "Lunch / Dinner");
  addSlot("Dinner", "Lunch / Dinner");
  addSlot("Snack", "Snack");

  let low = 0;
  let high = 0;
  let protLow = 0;
  let protHigh = 0;
  for (const s of slots) {
    const cals = s.meals.map((m) => m.calories);
    const prots = s.meals.map((m) => m.proteinG);
    if (cals.length > 0) {
      low += Math.min(...cals);
      high += Math.max(...cals);
      protLow += Math.min(...prots);
      protHigh += Math.max(...prots);
    }
  }

  const flatMeals = slots.flatMap((s) => s.meals);
  return {
    slots,
    flatMeals,
    rangeLow: low,
    rangeHigh: high,
    proteinLow: Math.round(protLow),
    proteinHigh: Math.round(protHigh),
    missingSlots
  };
};
