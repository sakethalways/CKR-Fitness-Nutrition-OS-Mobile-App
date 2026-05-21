import { Client, Meal, Plan, SLOTS, SlotType } from "@/data/types";
import { seedMeals } from "@/data/meals";

const SLOT_SHARE: Record<SlotType, number> = {
  Breakfast: 0.25,
  Lunch: 0.35,
  Dinner: 0.3,
  Snack: 0.1
};

// Build a per-meal effective rating from all prior plan ratings (>=4).
// Ratings <4 demote (per spec: "Ratings < 4 → remove from future rotation").
// Ratings >=8 boost extra (per spec: "Ratings >= 8 → prioritize for similar client types").
const buildEffectiveRatings = (
  plans: Plan[],
  client: Client
): Record<string, { rating: number; demoted: boolean }> => {
  const acc: Record<string, { sum: number; count: number; lowHits: number }> = {};

  for (const p of plans) {
    if (!p.ratings) continue;
    for (const [mealId, score] of Object.entries(p.ratings)) {
      if (!acc[mealId]) acc[mealId] = { sum: 0, count: 0, lowHits: 0 };
      acc[mealId].sum += score;
      acc[mealId].count += 1;
      if (score < 4) acc[mealId].lowHits += 1;
    }
  }

  const out: Record<string, { rating: number; demoted: boolean }> = {};
  for (const [mealId, v] of Object.entries(acc)) {
    const avg = v.sum / v.count;
    out[mealId] = { rating: avg, demoted: v.lowHits >= 1 };
  }
  return out;
};

export type GeneratedSlot = {
  slot: SlotType;
  targetKcal: number;
  meals: Meal[]; // 2 options
};

export type GenerationResult = {
  slots: GeneratedSlot[];
  flatMeals: Meal[]; // length 8
  rangeLow: number;
  rangeHigh: number;
};

export const generateForClient = (
  client: Client,
  priorPlans: Plan[] = []
): GenerationResult => {
  const target = client.calorieTarget ?? 1800;
  const allergenSet = new Set(
    client.allergens.filter((a) => a !== "None")
  );
  const wantsVegOnly = client.foodPref === "Veg";
  const ratingsMap = buildEffectiveRatings(priorPlans, client);

  // Filter pool
  const pool = seedMeals.filter((m) => {
    if (wantsVegOnly && m.foodPref === "Non-Veg") return false;
    if (m.allergens.some((a) => allergenSet.has(a))) return false;
    return true;
  });

  const score = (m: Meal): number => {
    const r = ratingsMap[m.id];
    let base = r ? r.rating : m.baseRating;
    if (r?.demoted) base -= 3; // strong demote
    const overlap = m.clientTypeBoost.filter((t) =>
      client.clientTypes.includes(t)
    ).length;
    base += overlap * 1.2;
    if (r && r.rating >= 8) base += 0.5; // prioritize-for-similar bonus
    if (!m.recipeRef) base -= 0.3; // content gap penalty
    return base;
  };

  const slots: GeneratedSlot[] = SLOTS.map((slot) => {
    const slotTarget = Math.round(target * SLOT_SHARE[slot]);
    const slotMin = slotTarget * 0.78;
    const slotMax = slotTarget * 1.22;

    const inRange = pool.filter(
      (m) => m.slot === slot && m.kcal >= slotMin && m.kcal <= slotMax
    );
    let chosen: Meal[];
    if (inRange.length >= 2) {
      chosen = [...inRange].sort((a, b) => score(b) - score(a)).slice(0, 2);
    } else {
      // Fall back: pick closest-to-target by score, regardless of range
      chosen = pool
        .filter((m) => m.slot === slot)
        .sort((a, b) => {
          const sa = score(a) - Math.abs(a.kcal - slotTarget) / 100;
          const sb = score(b) - Math.abs(b.kcal - slotTarget) / 100;
          return sb - sa;
        })
        .slice(0, 2);
    }

    return { slot, targetKcal: slotTarget, meals: chosen };
  });

  // Calorie range = sum of (min meal kcal) … sum of (max meal kcal) across slots
  let low = 0;
  let high = 0;
  for (const s of slots) {
    const k = s.meals.map((m) => m.kcal);
    if (k.length > 0) {
      low += Math.min(...k);
      high += Math.max(...k);
    }
  }

  const flatMeals = slots.flatMap((s) => s.meals);

  return { slots, flatMeals, rangeLow: low, rangeHigh: high };
};
