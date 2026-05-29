import { Client, Meal, Plan } from "@/data/types";
import { seedMeals } from "@/data/meals";

const SLOT_SHARE: Record<string, number> = {
  Breakfast: 0.25,
  Lunch: 0.35,
  Dinner: 0.3,
  Snack: 0.1
};

// Bracket calorie ranges (used to find best matching variant)
const BRACKET_RANGES: Record<string, { low: number; high: number; mid: number }> = {
  "350–400 kcal": { low: 350, high: 400, mid: 375 },
  "400–450 kcal": { low: 400, high: 450, mid: 425 },
  "450–500 kcal": { low: 450, high: 500, mid: 475 },
  "500–550 kcal": { low: 500, high: 550, mid: 525 }
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
};

const scoreMeal = (meal: Meal, client: Client): number => {
  let score = meal.rating + (meal.baseDescription ? 1 : 0);

  const typeBoosts = meal.clientTags.filter((tag) =>
    client.clientTypes.some((ct) => ct === tag)
  ).length;
  score += typeBoosts * 1.5;

  if (meal.isShootPriority) score += 2.0;

  return score;
};

const parseAllergens = (allergenStr: string | null): Set<string> => {
  if (!allergenStr) return new Set();
  return new Set(allergenStr.split(",").map((a) => a.trim()));
};

const findBestBracket = (targetCal: number, meals: Meal[]): string | null => {
  const availableBrackets = [...new Set(meals.map((m) => m.calBracket))];

  const containing = availableBrackets.find((bracket) => {
    const range = BRACKET_RANGES[bracket];
    if (!range) return false;
    return targetCal >= range.low && targetCal <= range.high;
  });

  if (containing) return containing;

  return availableBrackets.reduce((best, bracket) => {
    const bestRange = BRACKET_RANGES[best];
    const currRange = BRACKET_RANGES[bracket];
    if (!bestRange || !currRange) return best;
    const bestDist = Math.abs(bestRange.mid - targetCal);
    const currDist = Math.abs(currRange.mid - targetCal);
    return currDist < bestDist ? bracket : best;
  }, availableBrackets[0] || "400–450 kcal");
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

  const pool = seedMeals.filter((m) => {
    if (wantsVegOnly && m.diet === "Non-Veg") return false;
    const mealAllergens = parseAllergens(m.allergens);
    if ([...allergenSet].some((a) => mealAllergens.has(a))) return false;
    return true;
  });

  const slots: GeneratedSlot[] = [];
  const usedMealNumbers: Set<number> = new Set();

  const breakfastMeals = pool.filter((m) => m.mealType === "Breakfast");
  if (breakfastMeals.length > 0) {
    const slotTarget = Math.round(target * SLOT_SHARE.Breakfast);
    const bracket = findBestBracket(slotTarget, breakfastMeals);
    const variants = breakfastMeals.filter((m) => m.calBracket === bracket)
      .sort((a, b) => scoreMeal(b, client) - scoreMeal(a, client))
      .slice(0, 2);

    slots.push({ slot: "Breakfast", targetKcal: slotTarget, meals: variants });
    variants.forEach((m) => usedMealNumbers.add(m.mealNumber));
  }

  const lunchDinnerMeals = pool.filter((m) => m.mealType === "Lunch / Dinner");
  if (lunchDinnerMeals.length > 0) {
    const slotTarget = Math.round(target * SLOT_SHARE.Lunch);
    const bracket = findBestBracket(slotTarget, lunchDinnerMeals);
    const variants = lunchDinnerMeals.filter((m) => m.calBracket === bracket)
      .sort((a, b) => scoreMeal(b, client) - scoreMeal(a, client))
      .slice(0, 2);

    slots.push({ slot: "Lunch", targetKcal: slotTarget, meals: variants });
  }

  if (lunchDinnerMeals.length > 0) {
    const slotTarget = Math.round(target * SLOT_SHARE.Dinner);
    const bracket = findBestBracket(slotTarget, lunchDinnerMeals);
    const variants = lunchDinnerMeals.filter(
      (m) => m.calBracket === bracket && !usedMealNumbers.has(m.mealNumber)
    )
      .sort((a, b) => scoreMeal(b, client) - scoreMeal(a, client))
      .slice(0, 2);

    slots.push({ slot: "Dinner", targetKcal: slotTarget, meals: variants });
  }

  let low = 0;
  let high = 0;
  for (const s of slots) {
    const cals = s.meals.map((m) => m.calories);
    if (cals.length > 0) {
      low += Math.min(...cals);
      high += Math.max(...cals);
    }
  }

  const flatMeals = slots.flatMap((s) => s.meals);

  return { slots, flatMeals, rangeLow: low, rangeHigh: high };
};
