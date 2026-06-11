import { Meal } from "@/data/types";

/**
 * Single source of truth for turning a plan's flat meal list into day-slots and
 * computing its daily calorie/protein range. Used by the generator, the meal
 * preview, plan-detail display, swap-save, and the self-heal on load — so every
 * surface agrees on the same numbers and a plan's stored range can never drift
 * away from what its meals actually add up to.
 */

export type PlanSlot = { slot: string; meals: Meal[] };

/**
 * Reconstruct the four day-slots from a flat meal list, EXACTLY the way the
 * generator built them. The generator emits options in order
 * [Breakfast…, Lunch…, Dinner…, Snack…] — each slot capped at 2 options, and
 * Lunch is always filled before Dinner — so splitting the "Lunch / Dinner"
 * meals at ceil(n/2) reproduces the original Lunch|Dinner boundary.
 */
export function groupMealsIntoSlots(meals: Meal[]): PlanSlot[] {
  const breakfast = meals.filter((m) => m.mealType === "Breakfast");
  const lunchDinner = meals.filter((m) => m.mealType === "Lunch / Dinner");
  const snack = meals.filter((m) => m.mealType === "Snack");
  const mid = Math.ceil(lunchDinner.length / 2);
  return [
    { slot: "Breakfast", meals: breakfast },
    { slot: "Lunch", meals: lunchDinner.slice(0, mid) },
    { slot: "Dinner", meals: lunchDinner.slice(mid) },
    { slot: "Snack", meals: snack }
  ].filter((s) => s.meals.length > 0);
}

export type PlanRange = {
  rangeLow: number;
  rangeHigh: number;
  proteinLow: number;
  proteinHigh: number;
};

/**
 * Daily range = sum over slots of (lowest option … highest option). This is the
 * same math the generator uses, so a freshly generated plan's stored range
 * equals this exactly (no spurious "self-heal" writes).
 */
export function computeRangeFromSlots(slots: PlanSlot[]): PlanRange {
  let rangeLow = 0;
  let rangeHigh = 0;
  let proteinLow = 0;
  let proteinHigh = 0;
  for (const s of slots) {
    const cals = s.meals.map((m) => m.calories);
    const prots = s.meals.map((m) => m.proteinG);
    if (cals.length > 0) {
      rangeLow += Math.min(...cals);
      rangeHigh += Math.max(...cals);
      proteinLow += Math.min(...prots);
      proteinHigh += Math.max(...prots);
    }
  }
  return {
    rangeLow,
    rangeHigh,
    proteinLow: Math.round(proteinLow),
    proteinHigh: Math.round(proteinHigh)
  };
}

/** Convenience: range straight from a flat meal list. */
export function computeRange(meals: Meal[]): PlanRange {
  return computeRangeFromSlots(groupMealsIntoSlots(meals));
}
