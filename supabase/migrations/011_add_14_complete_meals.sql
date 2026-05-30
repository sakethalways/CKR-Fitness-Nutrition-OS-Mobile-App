-- Expansion Migration: Add 14 complete meals database with Snack category
-- This migration adds:
-- - Meals 11-12 (Lunch/Dinner): Egg Bhurji, Rajma Rice (8 rows)
-- - Meals 13-14 (Snack): Greek Yogurt + Berries, Protein Smoothie (6 rows)
-- - System Notes 10-14 (5 rows)
-- Total new records: 19 rows

BEGIN;

-- Update meal_type constraint to include Snack
ALTER TABLE meals DROP CONSTRAINT meals_meal_type_check;
ALTER TABLE meals ADD CONSTRAINT meals_meal_type_check CHECK (meal_type IN ('Breakfast', 'Lunch / Dinner', 'Snack'));

-- Add System Notes 10-14
INSERT INTO system_notes (note_number, title, description) VALUES
(10, 'EGG MEALS NOTE', 'Slightly lower protein per bracket due to egg fat content. Daily total protein target takes priority.'),
(11, 'RAJMA RICE NOTE', 'High carb comfort meal. Protein naturally lower. App assigns to moderate protein target clients only.'),
(12, 'SNACK BRACKETS', 'Snacks use 3 brackets only: 150-200 / 200-250 / 250-300 kcal. Never assign main meal brackets to snack meals.'),
(13, 'FDOE MATCHING', 'Show FDOE card ONLY when ALL meals in FDOE match client assigned meals AND calories within 150 cal of client daily target.'),
(14, 'RATING SYSTEM', 'Meals rated below 4.0 deprioritised. Top rated meals shown first. Cap at 70 meals maximum. Database self-optimises monthly.');

-- MEAL 11 - EGG BHURJI + RICE + MIXED VEGETABLES
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(11, 'Egg Bhurji + Rice + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '350–400 kcal', FALSE, 'Whole egg 1 · Egg white 3 · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 399, 23.0, 54.0, 11.0, ARRAY['Busy', 'Standard'], 'Eggs', 'Verified MFP — 399 cal, 23g protein.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Whole eggs + Egg whites', 'Lunch / Dinner'),
(11, 'Egg Bhurji + Rice + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '400–450 kcal', TRUE, 'Whole egg 1 · Egg white 4 · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 416, 26.0, 54.0, 11.0, ARRAY['Busy', 'Standard'], 'Eggs', 'SHOOT PRIORITY. Verified MFP — 416 cal, 26g protein.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Whole eggs + Egg whites', 'Lunch / Dinner'),
(11, 'Egg Bhurji + Rice + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '450–500 kcal', TRUE, 'Whole egg 2 · Egg white 4 · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 488, 32.0, 54.0, 16.0, ARRAY['Busy', 'Standard'], 'Eggs', 'SHOOT PRIORITY. Verified MFP — 488 cal, 32g protein.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Whole eggs + Egg whites', 'Lunch / Dinner'),
(11, 'Egg Bhurji + Rice + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '500–550 kcal', FALSE, 'Whole egg 3 · Egg white 3 · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 542, 35.0, 55.0, 21.0, ARRAY['Busy', 'Standard'], 'Eggs', 'Verified MFP — 542 cal, 35g protein. Shoot next batch.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Whole eggs + Egg whites', 'Lunch / Dinner');

-- MEAL 12 - RAJMA RICE + MIXED VEGETABLES
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(12, 'Rajma Rice + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '350–400 kcal', FALSE, 'Red kidney beans raw 50g · White rice raw 30g · Oil 5g · Mixed vegetables 150g', 373, 16.0, 75.0, 6.0, ARRAY['Standard', 'Vegetarian'], NULL, 'Lower protein comfort meal. Client can add yogurt on side.', 0, 'White rice raw 30g · Oil 5g · Mixed vegetables 150g = 222 cal, 3g protein', 'Red kidney beans raw (100g = 337 cal, 23g protein)', 'Lunch / Dinner'),
(12, 'Rajma Rice + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '400–450 kcal', TRUE, 'Red kidney beans raw 70g · White rice raw 30g · Oil 5g · Mixed vegetables 150g', 440, 20.0, 90.0, 6.0, ARRAY['Standard', 'Vegetarian'], NULL, 'SHOOT PRIORITY. Verified MFP — 440 cal, 20g protein.', 0, 'White rice raw 30g · Oil 5g · Mixed vegetables 150g = 222 cal, 3g protein', 'Red kidney beans raw (100g = 337 cal, 23g protein)', 'Lunch / Dinner'),
(12, 'Rajma Rice + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '450–500 kcal', TRUE, 'Red kidney beans raw 80g · White rice raw 30g · Oil 5g · Mixed vegetables 150g', 474, 23.0, 97.0, 6.0, ARRAY['Standard', 'Vegetarian'], NULL, 'SHOOT PRIORITY. Verified MFP — 474 cal, 23g protein.', 0, 'White rice raw 30g · Oil 5g · Mixed vegetables 150g = 222 cal, 3g protein', 'Red kidney beans raw (100g = 337 cal, 23g protein)', 'Lunch / Dinner'),
(12, 'Rajma Rice + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '500–550 kcal', FALSE, 'Red kidney beans raw 100g · White rice raw 30g · Oil 5g · Mixed vegetables 150g', 542, 27.0, 113.0, 6.0, ARRAY['Standard', 'Vegetarian'], NULL, 'Verified MFP — 542 cal, 27g protein. Shoot next batch.', 0, 'White rice raw 30g · Oil 5g · Mixed vegetables 150g = 222 cal, 3g protein', 'Red kidney beans raw (100g = 337 cal, 23g protein)', 'Lunch / Dinner');

-- MEAL 13 - GREEK YOGURT + BERRIES (SNACK)
-- Snacks use 3 brackets only: 150-200 / 200-250 / 250-300 kcal
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(13, 'Greek Yogurt + Berries', 'Snack', 'Veg', '150–200 kcal', FALSE, 'Oikos Triple Zero 150g (1 cup) · Mixed berries 100g · Almonds 10g', 188, 18.0, 19.0, 5.0, ARRAY['Sweet Craving', 'Busy', 'Standard', 'Veg'], 'Dairy · Nuts', 'Verified MFP — 188 cal, 18g protein.', 0, 'Mixed berries 100g · Almonds 10g = 115 cal, 3g protein', 'Oikos Triple Zero', 'Snack'),
(13, 'Greek Yogurt + Berries', 'Snack', 'Veg', '200–250 kcal', TRUE, 'Oikos Triple Zero 225g (1.5 cups) · Mixed berries 100g · Almonds 10g', 233, 25.0, 22.0, 5.0, ARRAY['Sweet Craving', 'Busy', 'Standard', 'Veg'], 'Dairy · Nuts', 'SHOOT PRIORITY. Verified MFP — 233 cal, 25g protein.', 0, 'Mixed berries 100g · Almonds 10g = 115 cal, 3g protein', 'Oikos Triple Zero', 'Snack'),
(13, 'Greek Yogurt + Berries', 'Snack', 'Veg', '250–300 kcal', TRUE, 'Oikos Triple Zero 300g (2 cups) · Mixed berries 100g · Almonds 10g', 278, 33.0, 26.0, 5.0, ARRAY['Sweet Craving', 'Busy', 'Standard', 'Veg'], 'Dairy · Nuts', 'SHOOT PRIORITY. Verified MFP — 278 cal, 33g protein.', 0, 'Mixed berries 100g · Almonds 10g = 115 cal, 3g protein', 'Oikos Triple Zero', 'Snack');

-- MEAL 14 - PROTEIN SMOOTHIE (SNACK)
-- Snacks use 3 brackets only: 150-200 / 200-250 / 250-300 kcal
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(14, 'Protein Smoothie', 'Snack', 'Veg', '150–200 kcal', FALSE, 'Whey protein isolate 25g · Banana 80g · Unsweetened almond milk 200ml', 195, 22.0, 21.0, 3.0, ARRAY['Sweet Craving', 'Busy', 'Standard'], 'Nuts · Dairy if whey', 'Blend all. Verified MFP — 195 cal, 22g protein.', 0, 'Unsweetened almond milk 200ml = 26 cal', 'Whey protein isolate + Banana — both change', 'Snack'),
(14, 'Protein Smoothie', 'Snack', 'Veg', '200–250 kcal', TRUE, 'Whey protein isolate 30g · Banana 100g · Unsweetened almond milk 200ml', 232, 26.0, 26.0, 3.0, ARRAY['Sweet Craving', 'Busy', 'Standard'], 'Nuts · Dairy if whey', 'SHOOT PRIORITY. Verified MFP — 232 cal, 26g protein.', 0, 'Unsweetened almond milk 200ml = 26 cal', 'Whey protein isolate + Banana — both change', 'Snack'),
(14, 'Protein Smoothie', 'Snack', 'Veg', '250–300 kcal', TRUE, 'Whey protein isolate 35g · Banana 120g · Unsweetened almond milk 200ml', 268, 31.0, 31.0, 4.0, ARRAY['Sweet Craving', 'Busy', 'Standard'], 'Nuts · Dairy if whey', 'SHOOT PRIORITY. Verified MFP — 268 cal, 31g protein.', 0, 'Unsweetened almond milk 200ml = 26 cal', 'Whey protein isolate + Banana — both change', 'Snack');

-- Update indexes (no changes needed, existing indexes cover meal_type and meal_number)

-- Verify data integrity
-- VERIFICATION: system_notes = 14 rows | meals = 54 rows (10 previous + 4 new) | Total = 68 rows
-- Meals breakdown: Breakfast (6×4=24) + Lunch/Dinner (6×4=24) + Snack (2×3=6) = 54 rows

COMMIT;
