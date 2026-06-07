import { Allergen, MEAL_ALLERGENS } from "@/data/types";

// Best-effort conversion of legacy free-text allergen strings
// (e.g. "Nuts · Dairy if using whey isolate") into structured tags.
// Used to adapt seed data; the DB migration does the same on the server.
export function parseAllergenText(text: string | null | undefined): Allergen[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = MEAL_ALLERGENS.filter((a) => lower.includes(a.toLowerCase()));
  return found;
}

// Do a meal's allergens conflict with the client's flagged allergens?
// Pure set-intersection — reliable, unlike substring matching on free text.
export function mealConflictsWithClient(
  mealAllergens: Allergen[],
  clientAllergens: Allergen[]
): boolean {
  if (mealAllergens.length === 0) return false;
  const avoid = new Set<Allergen>(clientAllergens.filter((a) => a !== "None"));
  return mealAllergens.some((a) => avoid.has(a));
}
