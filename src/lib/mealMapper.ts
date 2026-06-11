import { Allergen, Meal } from "@/data/types";
import { parseAllergenText } from "@/lib/allergens";

// Convert Supabase row to TypeScript Meal type
export function mealFromRow(row: any): Meal {
  return {
    id: row.id,
    mealNumber: row.meal_number,
    mealName: row.meal_name,
    mealType: row.meal_type as "Breakfast" | "Lunch / Dinner" | "Snack",
    diet: row.diet as "Veg" | "Non-Veg",
    calBracket: row.cal_bracket,
    quantities: row.quantities,
    calories: row.calories,
    proteinG: parseFloat(row.protein_g),
    carbsG: parseFloat(row.carbs_g),
    fatG: parseFloat(row.fat_g),
    clientTags: row.client_tags || [],
    // Robust to both schemas: text[] (post-migration) or legacy free text.
    allergens: Array.isArray(row.allergens)
      ? (row.allergens as Allergen[])
      : parseAllergenText(row.allergens),
    notes: row.notes || null,
    rating: row.rating || 0,
    baseDescription: row.base_description || null,
    proteinAnchor: row.protein_anchor || null,
    mealSection: row.meal_section || null,
    reelUrl: row.reel_url || null,
    mealCode: row.meal_code || null,
  };
}

// Convert TypeScript Meal to Supabase insert/update format (snake_case)
export function mealToDb(meal: Partial<Meal>): any {
  const db: any = {};

  if (meal.id !== undefined) db.id = meal.id;
  if (meal.mealNumber !== undefined) db.meal_number = meal.mealNumber;
  if (meal.mealName !== undefined) db.meal_name = meal.mealName;
  if (meal.mealType !== undefined) db.meal_type = meal.mealType;
  if (meal.diet !== undefined) db.diet = meal.diet;
  if (meal.calBracket !== undefined) db.cal_bracket = meal.calBracket;
  if (meal.quantities !== undefined) db.quantities = meal.quantities;
  if (meal.calories !== undefined) db.calories = meal.calories;
  if (meal.proteinG !== undefined) db.protein_g = meal.proteinG;
  if (meal.carbsG !== undefined) db.carbs_g = meal.carbsG;
  if (meal.fatG !== undefined) db.fat_g = meal.fatG;
  if (meal.clientTags !== undefined) db.client_tags = meal.clientTags;
  if (meal.allergens !== undefined) db.allergens = meal.allergens;
  if (meal.notes !== undefined) db.notes = meal.notes;
  if (meal.rating !== undefined) db.rating = meal.rating;
  if (meal.baseDescription !== undefined) db.base_description = meal.baseDescription;
  if (meal.proteinAnchor !== undefined) db.protein_anchor = meal.proteinAnchor;
  if (meal.mealSection !== undefined) db.meal_section = meal.mealSection;
  if (meal.reelUrl !== undefined) db.reel_url = meal.reelUrl;
  if (meal.mealCode !== undefined) db.meal_code = meal.mealCode;

  return db;
}
