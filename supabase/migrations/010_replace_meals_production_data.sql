-- Meal Database Migration: Replace mock data with production meal data
-- This migration creates a new meals table structure with 40 production meals
-- and system notes table with 9 standards/rules.
-- Total records: 40 meals + 9 system notes = 49 rows

BEGIN;

-- Backup old meals table (keep for reference)
ALTER TABLE IF EXISTS meals RENAME TO meals_old_mock;

-- Create system_notes table (9 rows of standards/rules)
CREATE TABLE system_notes (
  id SERIAL PRIMARY KEY,
  note_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create new meals table with production schema
CREATE TABLE meals (
  id SERIAL PRIMARY KEY,
  meal_number INTEGER NOT NULL,
  meal_name TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch / Dinner')),
  diet TEXT NOT NULL CHECK (diet IN ('Veg', 'Non-Veg')),
  cal_bracket TEXT NOT NULL,
  is_shoot_priority BOOLEAN DEFAULT FALSE,
  quantities TEXT NOT NULL,
  calories INTEGER NOT NULL CHECK (calories > 0),
  protein_g NUMERIC(5,1) NOT NULL CHECK (protein_g >= 0),
  carbs_g NUMERIC(5,1) NOT NULL CHECK (carbs_g >= 0),
  fat_g NUMERIC(5,1) NOT NULL CHECK (fat_g >= 0),
  client_tags TEXT[] DEFAULT '{}',
  allergens TEXT,
  notes TEXT,
  rating INTEGER DEFAULT 0,
  base_description TEXT,
  protein_anchor TEXT,
  meal_section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 9 system notes
INSERT INTO system_notes (note_number, title, description) VALUES
(1, 'MIXED VEGETABLES STANDARD', '150g total · Core (pick 3–4): cucumber, carrot, capsicum, beans, broccoli · Optional: spinach, lettuce, onion, zucchini, cherry tomatoes · Approx 55 cal, 3g protein, 10g carbs, 0g fat'),
(2, 'SAME MEAL RULE', 'App must never assign the same meal to both lunch AND dinner slot on the same day. Different meal must show for each slot even if both are tagged Lunch/Dinner.'),
(3, 'VEG MEAL PROTEIN', 'Veg meals may have slightly lower protein in bracket 1 (350–400 kcal). App should prioritise non-veg options for high protein bracket 1 clients. Acceptable for standard and vegetarian clients.'),
(4, 'PANEER STANDARD', 'Use Milky Mist High Protein Paneer (204 cal, 25g protein per 100g). For US clients: use any high protein paneer from Indian grocery store (Patel Brothers, India Bazaar etc).'),
(5, 'PROTEIN POWDER STANDARD', 'Use any whey protein isolate. Macros based on 25g = 94 cal, 20.2g protein (MFP: Protein World Whey Isolate). Use grams not scoops in all recipes.'),
(6, 'GREEK YOGURT STANDARD', 'Use Oikos Triple Zero for US clients (1 cup = 150g = 90 cal, 15g protein). Any plain non-fat Greek yogurt works. Macros may vary slightly by brand.'),
(7, 'BREAD STANDARD', 'Use Dave''s Killer Bread Organic Supreme Sourdough. 1 slice = 54g = 140 cal, 6g protein, 25g carbs, 2g fat.'),
(8, 'CHICKEN STANDARD', 'Chicken breast boneless raw. 100g = 125 cal, 24.6g protein, 2.6g carbs, 1.8g fat (MFP verified).'),
(9, 'SPICES NOTE', 'All spices (turmeric, cumin, coriander, chilli powder, salt, ginger) add zero calories. Not listed in quantities. Clients can use freely.');

-- Insert 40 meal rows (10 meals × 4 calorie brackets each)

-- MEAL 1 - OVERNIGHT OATS
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(1, 'Overnight Oats', 'Breakfast', 'Veg', '350–400 kcal', FALSE, 'Rolled oats 40g · Unsweetened almond milk 150ml · Whey protein isolate 25g · Chia seeds 8g · Mixed berries 50g · Almonds 8g', 377, 30.0, 38.0, 12.0, ARRAY['Sweet Craving', 'Busy', 'Standard'], 'Nuts · Dairy if using whey isolate', 'Verified MFP — 377 cal, 30g protein.', 0, 'Unsweetened almond milk 150ml · Chia seeds 8g · Mixed berries 50g · Almonds 8g', 'Whey protein isolate — only oats + protein isolate change', 'Breakfast'),
(1, 'Overnight Oats', 'Breakfast', 'Veg', '400–450 kcal', TRUE, 'Rolled oats 50g · Unsweetened almond milk 150ml · Whey protein isolate 30g · Chia seeds 8g · Mixed berries 50g · Almonds 8g', 434, 35.0, 46.0, 13.0, ARRAY['Sweet Craving', 'Busy', 'Standard'], 'Nuts · Dairy if using whey isolate', 'SHOOT PRIORITY. Verified MFP — 434 cal, 35g protein.', 0, 'Unsweetened almond milk 150ml · Chia seeds 8g · Mixed berries 50g · Almonds 8g', 'Whey protein isolate — only oats + protein isolate change', 'Breakfast'),
(1, 'Overnight Oats', 'Breakfast', 'Veg', '450–500 kcal', TRUE, 'Rolled oats 60g · Unsweetened almond milk 150ml · Whey protein isolate 35g · Chia seeds 8g · Mixed berries 50g · Almonds 8g', 491, 40.0, 53.0, 14.0, ARRAY['Sweet Craving', 'Busy', 'Standard'], 'Nuts · Dairy if using whey isolate', 'SHOOT PRIORITY. Verified MFP — 491 cal, 40g protein.', 0, 'Unsweetened almond milk 150ml · Chia seeds 8g · Mixed berries 50g · Almonds 8g', 'Whey protein isolate — only oats + protein isolate change', 'Breakfast'),
(1, 'Overnight Oats', 'Breakfast', 'Veg', '500–550 kcal', FALSE, 'Rolled oats 70g · Unsweetened almond milk 150ml · Whey protein isolate 40g · Chia seeds 8g · Mixed berries 50g · Almonds 8g', 547, 46.0, 60.0, 15.0, ARRAY['Sweet Craving', 'Busy', 'Standard'], 'Nuts · Dairy if using whey isolate', 'Verified MFP — 547 cal, 46g protein. Shoot next batch.', 0, 'Unsweetened almond milk 150ml · Chia seeds 8g · Mixed berries 50g · Almonds 8g', 'Whey protein isolate — only oats + protein isolate change', 'Breakfast');

-- MEAL 2 - BLUEBERRY CHIA PUDDING
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(2, 'Blueberry Chia Pudding', 'Breakfast', 'Veg', '350–400 kcal', FALSE, 'Oikos Triple Zero 150g (1 cup) · Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g', 390, 23.0, 39.0, 18.0, ARRAY['Sweet Craving', 'Busy'], 'Dairy · Nuts', 'Use Oikos Triple Zero. Any plain non-fat Greek yogurt works.', 0, 'Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g = 300 cal, 8g protein', 'Oikos Triple Zero — only yogurt quantity changes', 'Breakfast'),
(2, 'Blueberry Chia Pudding', 'Breakfast', 'Veg', '400–450 kcal', TRUE, 'Oikos Triple Zero 225g (1.5 cups) · Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g', 435, 31.0, 43.0, 18.0, ARRAY['Sweet Craving', 'Busy'], 'Dairy · Nuts', 'SHOOT PRIORITY. Verified MFP — 435 cal, 31g protein.', 0, 'Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g = 300 cal, 8g protein', 'Oikos Triple Zero — only yogurt quantity changes', 'Breakfast'),
(2, 'Blueberry Chia Pudding', 'Breakfast', 'Veg', '450–500 kcal', TRUE, 'Oikos Triple Zero 300g (2 cups) · Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g', 480, 38.0, 46.0, 18.0, ARRAY['Sweet Craving', 'Busy'], 'Dairy · Nuts', 'SHOOT PRIORITY. 2 cups Oikos.', 0, 'Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g = 300 cal, 8g protein', 'Oikos Triple Zero — only yogurt quantity changes', 'Breakfast'),
(2, 'Blueberry Chia Pudding', 'Breakfast', 'Veg', '500–550 kcal', FALSE, 'Oikos Triple Zero 375g (2.5 cups) · Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g', 525, 45.0, 50.0, 18.0, ARRAY['Sweet Craving', 'Busy'], 'Dairy · Nuts', '2.5 cups Oikos. Only yogurt increases.', 0, 'Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g = 300 cal, 8g protein', 'Oikos Triple Zero — only yogurt quantity changes', 'Breakfast');

-- MEAL 3 - EGG AVOCADO TOAST
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(3, 'Egg Avocado Toast', 'Breakfast', 'Non-Veg', '350–400 kcal', FALSE, 'Whole egg 1 · Egg white 4 · Dave''s Killer Bread 1 slice 54g · Avocado 35g · Oil 5g', 380, 27.0, 32.0, 17.0, ARRAY['Busy', 'Standard'], 'Eggs · Gluten', 'Verified MFP — 380 cal, 27g protein.', 0, 'Dave''s Killer Bread 1 slice 54g · Avocado 35g · Oil 5g = 240 cal, 6.7g protein', 'Whole eggs + Egg whites — only egg combination changes', 'Breakfast'),
(3, 'Egg Avocado Toast', 'Breakfast', 'Non-Veg', '400–450 kcal', TRUE, 'Whole egg 2 · Egg white 3 · Dave''s Killer Bread 1 slice 54g · Avocado 35g · Oil 5g', 435, 31.0, 32.0, 22.0, ARRAY['Busy', 'Standard'], 'Eggs · Gluten', 'SHOOT PRIORITY. Verified MFP — 435 cal, 31g protein.', 0, 'Dave''s Killer Bread 1 slice 54g · Avocado 35g · Oil 5g = 240 cal, 6.7g protein', 'Whole eggs + Egg whites — only egg combination changes', 'Breakfast'),
(3, 'Egg Avocado Toast', 'Breakfast', 'Non-Veg', '450–500 kcal', TRUE, 'Whole egg 2 · Egg white 4 · Dave''s Killer Bread 1 slice 54g · Avocado 35g · Oil 5g', 452, 33.0, 32.0, 22.0, ARRAY['Busy', 'Standard'], 'Eggs · Gluten', 'SHOOT PRIORITY. Verified MFP — 452 cal, 33g protein.', 0, 'Dave''s Killer Bread 1 slice 54g · Avocado 35g · Oil 5g = 240 cal, 6.7g protein', 'Whole eggs + Egg whites — only egg combination changes', 'Breakfast'),
(3, 'Egg Avocado Toast', 'Breakfast', 'Non-Veg', '500–550 kcal', FALSE, 'Whole egg 3 · Egg white 4 · Dave''s Killer Bread 1 slice 54g · Avocado 35g · Oil 5g', 524, 40.0, 32.0, 27.0, ARRAY['Busy', 'Standard'], 'Eggs · Gluten', 'Verified MFP — 524 cal, 40g protein. Shoot next batch.', 0, 'Dave''s Killer Bread 1 slice 54g · Avocado 35g · Oil 5g = 240 cal, 6.7g protein', 'Whole eggs + Egg whites — only egg combination changes', 'Breakfast');

-- MEAL 4 - SCRAMBLED EGG + AVOCADO + SWEET POTATO
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(4, 'Scrambled Egg + Avocado + Sweet Potato', 'Breakfast', 'Non-Veg', '350–400 kcal', FALSE, 'Whole egg 1 · Egg white 4 · Sweet potato boiled 150g · Avocado 35g · Oil 5g', 369, 24.0, 34.0, 15.0, ARRAY['Busy', 'Standard'], 'Eggs', 'Verified MFP — 369 cal, 24g protein.', 0, 'Sweet potato boiled 150g · Avocado 35g · Oil 5g = 229 cal, 3.1g protein', 'Whole eggs + Egg whites. Light Indian spicing optional.', 'Breakfast'),
(4, 'Scrambled Egg + Avocado + Sweet Potato', 'Breakfast', 'Non-Veg', '400–450 kcal', TRUE, 'Whole egg 2 · Egg white 3 · Sweet potato boiled 150g · Avocado 35g · Oil 5g', 424, 28.0, 34.0, 20.0, ARRAY['Busy', 'Standard'], 'Eggs', 'SHOOT PRIORITY.', 0, 'Sweet potato boiled 150g · Avocado 35g · Oil 5g = 229 cal, 3.1g protein', 'Whole eggs + Egg whites. Light Indian spicing optional.', 'Breakfast'),
(4, 'Scrambled Egg + Avocado + Sweet Potato', 'Breakfast', 'Non-Veg', '450–500 kcal', TRUE, 'Whole egg 2 · Egg white 4 · Sweet potato boiled 150g · Avocado 35g · Oil 5g', 441, 31.0, 34.0, 20.0, ARRAY['Busy', 'Standard'], 'Eggs', 'SHOOT PRIORITY.', 0, 'Sweet potato boiled 150g · Avocado 35g · Oil 5g = 229 cal, 3.1g protein', 'Whole eggs + Egg whites. Light Indian spicing optional.', 'Breakfast'),
(4, 'Scrambled Egg + Avocado + Sweet Potato', 'Breakfast', 'Non-Veg', '500–550 kcal', FALSE, 'Whole egg 3 · Egg white 4 · Sweet potato boiled 150g · Avocado 35g · Oil 5g', 513, 37.0, 34.0, 25.0, ARRAY['Busy', 'Standard'], 'Eggs', 'Shoot next batch.', 0, 'Sweet potato boiled 150g · Avocado 35g · Oil 5g = 229 cal, 3.1g protein', 'Whole eggs + Egg whites. Light Indian spicing optional.', 'Breakfast');

-- MEAL 5 - MOONG DAL CHILLA + GREEK YOGURT
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(5, 'Moong Dal Chilla + Greek Yogurt', 'Breakfast', 'Veg', '350–400 kcal', FALSE, 'Green moong dal raw 50g · Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g · Oikos Triple Zero 150g (1 cup)', 364, 28.0, 59.0, 6.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'Verified MFP — 364 cal, 28g protein. Soak moong 2 hrs.', 0, 'Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g = 100 cal, 2g protein', 'Green moong dal raw + Oikos Triple Zero', 'Breakfast'),
(5, 'Moong Dal Chilla + Greek Yogurt', 'Breakfast', 'Veg', '400–450 kcal', TRUE, 'Green moong dal raw 60g · Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g · Oikos Triple Zero 187g (1.25 cups)', 421, 35.0, 69.0, 6.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'SHOOT PRIORITY. Verified MFP — 421 cal, 35g protein.', 0, 'Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g = 100 cal, 2g protein', 'Green moong dal raw + Oikos Triple Zero', 'Breakfast'),
(5, 'Moong Dal Chilla + Greek Yogurt', 'Breakfast', 'Veg', '450–500 kcal', TRUE, 'Green moong dal raw 70g · Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g · Oikos Triple Zero 187g (1.25 cups)', 456, 37.0, 77.0, 6.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'SHOOT PRIORITY. Verified MFP — 456 cal, 37g protein.', 0, 'Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g = 100 cal, 2g protein', 'Green moong dal raw + Oikos Triple Zero', 'Breakfast'),
(5, 'Moong Dal Chilla + Greek Yogurt', 'Breakfast', 'Veg', '500–550 kcal', FALSE, 'Green moong dal raw 70g · Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g · Oikos Triple Zero 225g (1.5 cups)', 491, 41.0, 78.0, 6.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'Verified MFP — 491 cal, 41g protein. Shoot next batch.', 0, 'Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g = 100 cal, 2g protein', 'Green moong dal raw + Oikos Triple Zero', 'Breakfast');

-- MEAL 6 - BESAN CHILLA + GREEK YOGURT
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(6, 'Besan Chilla + Greek Yogurt', 'Breakfast', 'Veg', '350–400 kcal', FALSE, 'Besan 50g · Oil 5g · Onion 50g · Red bell pepper 50g · Oikos Triple Zero 150g (1 cup)', 363, 27.0, 49.0, 9.0, ARRAY['Busy', 'Standard', 'Vegetarian'], 'Dairy', 'Verified MFP — 363 cal, 27g protein. No soaking needed.', 0, 'Oil 5g · Onion 50g · Red bell pepper 50g = 80 cal, 1g protein', 'Besan + Oikos Triple Zero', 'Breakfast'),
(6, 'Besan Chilla + Greek Yogurt', 'Breakfast', 'Veg', '400–450 kcal', TRUE, 'Besan 60g · Oil 5g · Onion 50g · Red bell pepper 50g · Oikos Triple Zero 187g (1.25 cups)', 424, 33.0, 58.0, 9.0, ARRAY['Busy', 'Standard', 'Vegetarian'], 'Dairy', 'SHOOT PRIORITY. Verified MFP — 424 cal, 33g protein.', 0, 'Oil 5g · Onion 50g · Red bell pepper 50g = 80 cal, 1g protein', 'Besan + Oikos Triple Zero', 'Breakfast'),
(6, 'Besan Chilla + Greek Yogurt', 'Breakfast', 'Veg', '450–500 kcal', TRUE, 'Besan 70g · Oil 5g · Onion 50g · Red bell pepper 50g · Oikos Triple Zero 187g (1.25 cups)', 463, 35.0, 65.0, 10.0, ARRAY['Busy', 'Standard', 'Vegetarian'], 'Dairy', 'SHOOT PRIORITY. Verified MFP — 463 cal, 35g protein.', 0, 'Oil 5g · Onion 50g · Red bell pepper 50g = 80 cal, 1g protein', 'Besan + Oikos Triple Zero', 'Breakfast'),
(6, 'Besan Chilla + Greek Yogurt', 'Breakfast', 'Veg', '500–550 kcal', FALSE, 'Besan 70g · Oil 5g · Onion 50g · Red bell pepper 50g · Oikos Triple Zero 225g (1.5 cups)', 486, 39.0, 66.0, 10.0, ARRAY['Busy', 'Standard', 'Vegetarian'], 'Dairy', 'Verified MFP — 486 cal, 39g protein. Shoot next batch.', 0, 'Oil 5g · Onion 50g · Red bell pepper 50g = 80 cal, 1g protein', 'Besan + Oikos Triple Zero', 'Breakfast');

-- MEAL 7 - CHICKEN BREAST + RICE + MIXED VEGETABLES
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(7, 'Chicken Breast + Rice + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '350–400 kcal', FALSE, 'Chicken breast raw 100g · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 399, 30.0, 55.0, 7.0, ARRAY['Busy', 'Standard'], NULL, 'Verified MFP — 399 cal, 30g protein. Meal prep friendly.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Chicken breast boneless raw (100g = 125 cal, 24.6g protein)', 'Lunch / Dinner'),
(7, 'Chicken Breast + Rice + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '400–450 kcal', TRUE, 'Chicken breast raw 120g · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 426, 35.0, 56.0, 8.0, ARRAY['Busy', 'Standard'], NULL, 'SHOOT PRIORITY. Verified MFP — 426 cal, 35g protein.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Chicken breast boneless raw (100g = 125 cal, 24.6g protein)', 'Lunch / Dinner'),
(7, 'Chicken Breast + Rice + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '450–500 kcal', TRUE, 'Chicken breast raw 150g · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 464, 43.0, 56.0, 8.0, ARRAY['Busy', 'Standard'], NULL, 'SHOOT PRIORITY. Verified MFP — 464 cal, 43g protein.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Chicken breast boneless raw (100g = 125 cal, 24.6g protein)', 'Lunch / Dinner'),
(7, 'Chicken Breast + Rice + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '500–550 kcal', FALSE, 'Chicken breast raw 200g · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 526, 55.0, 58.0, 9.0, ARRAY['Busy', 'Standard'], NULL, 'Verified MFP — 526 cal, 55g protein. Shoot next batch.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Chicken breast boneless raw (100g = 125 cal, 24.6g protein)', 'Lunch / Dinner');

-- MEAL 8 - CHICKEN BREAST + QUINOA + MIXED VEGETABLES
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(8, 'Chicken Breast + Quinoa + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '350–400 kcal', FALSE, 'Chicken breast raw 100g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g', 398, 34.0, 47.0, 10.0, ARRAY['Busy', 'Standard'], NULL, 'Verified MFP — 398 cal, 34g protein.', 0, 'Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g = 281 cal, 9g protein', 'Chicken breast boneless raw', 'Lunch / Dinner'),
(8, 'Chicken Breast + Quinoa + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '400–450 kcal', TRUE, 'Chicken breast raw 120g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g', 431, 39.0, 48.0, 11.0, ARRAY['Busy', 'Standard'], NULL, 'SHOOT PRIORITY. Verified MFP — 431 cal, 39g protein.', 0, 'Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g = 281 cal, 9g protein', 'Chicken breast boneless raw', 'Lunch / Dinner'),
(8, 'Chicken Breast + Quinoa + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '450–500 kcal', TRUE, 'Chicken breast raw 150g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g', 469, 46.0, 49.0, 11.0, ARRAY['Busy', 'Standard'], NULL, 'SHOOT PRIORITY. Verified MFP — 469 cal, 46g protein.', 0, 'Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g = 281 cal, 9g protein', 'Chicken breast boneless raw', 'Lunch / Dinner'),
(8, 'Chicken Breast + Quinoa + Mixed Vegetables', 'Lunch / Dinner', 'Non-Veg', '500–550 kcal', FALSE, 'Chicken breast raw 200g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g', 531, 59.0, 50.0, 12.0, ARRAY['Busy', 'Standard'], NULL, 'Verified MFP — 531 cal, 59g protein. Shoot next batch.', 0, 'Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g = 281 cal, 9g protein', 'Chicken breast boneless raw', 'Lunch / Dinner');

-- MEAL 9 - PANEER RICE + MIXED VEGETABLES
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(9, 'Paneer Rice + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '350–400 kcal', FALSE, 'High protein paneer 60g · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 398, 21.0, 56.0, 11.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'Veg meal — bracket 1 protein 21g. Acceptable. Prioritise non-veg for high protein clients.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Milky Mist High Protein Paneer (100g = 204 cal, 25g protein)', 'Lunch / Dinner'),
(9, 'Paneer Rice + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '400–450 kcal', TRUE, 'High protein paneer 80g · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 439, 26.0, 57.0, 13.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'SHOOT PRIORITY. Verified MFP — 439 cal, 26g protein.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Milky Mist High Protein Paneer (100g = 204 cal, 25g protein)', 'Lunch / Dinner'),
(9, 'Paneer Rice + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '450–500 kcal', TRUE, 'High protein paneer 100g · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 480, 31.0, 58.0, 15.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'SHOOT PRIORITY. Verified MFP — 480 cal, 31g protein.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Milky Mist High Protein Paneer (100g = 204 cal, 25g protein)', 'Lunch / Dinner'),
(9, 'Paneer Rice + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '500–550 kcal', FALSE, 'High protein paneer 120g · White rice raw 50g · Oil 5g · Mixed vegetables 150g', 521, 36.0, 59.0, 16.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'Verified MFP — 521 cal, 36g protein. Shoot next batch.', 0, 'White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein', 'Milky Mist High Protein Paneer (100g = 204 cal, 25g protein)', 'Lunch / Dinner');

-- MEAL 10 - PANEER QUINOA + MIXED VEGETABLES
INSERT INTO meals (meal_number, meal_name, meal_type, diet, cal_bracket, is_shoot_priority, quantities, calories, protein_g, carbs_g, fat_g, client_tags, allergens, notes, rating, base_description, protein_anchor, meal_section) VALUES
(10, 'Paneer Quinoa + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '350–400 kcal', FALSE, 'High protein paneer 60g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g', 398, 24.0, 48.0, 14.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'Verified MFP — 398 cal, 24g protein. Better protein than paneer rice.', 0, 'Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g = 281 cal, 9g protein', 'Milky Mist High Protein Paneer', 'Lunch / Dinner'),
(10, 'Paneer Quinoa + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '400–450 kcal', TRUE, 'High protein paneer 80g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g', 444, 30.0, 49.0, 16.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'SHOOT PRIORITY. Verified MFP — 444 cal, 30g protein.', 0, 'Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g = 281 cal, 9g protein', 'Milky Mist High Protein Paneer', 'Lunch / Dinner'),
(10, 'Paneer Quinoa + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '450–500 kcal', TRUE, 'High protein paneer 100g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g', 485, 34.0, 51.0, 17.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'SHOOT PRIORITY. Verified MFP — 485 cal, 34g protein.', 0, 'Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g = 281 cal, 9g protein', 'Milky Mist High Protein Paneer', 'Lunch / Dinner'),
(10, 'Paneer Quinoa + Mixed Vegetables', 'Lunch / Dinner', 'Veg', '500–550 kcal', FALSE, 'High protein paneer 120g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g', 526, 39.0, 52.0, 19.0, ARRAY['Standard', 'Vegetarian'], 'Dairy', 'Verified MFP — 526 cal, 39g protein. Shoot next batch.', 0, 'Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g = 281 cal, 9g protein', 'Milky Mist High Protein Paneer', 'Lunch / Dinner');

-- Create indexes for query performance
CREATE INDEX idx_meals_meal_type ON meals(meal_type);
CREATE INDEX idx_meals_diet ON meals(diet);
CREATE INDEX idx_meals_cal_bracket ON meals(cal_bracket);
CREATE INDEX idx_meals_meal_number ON meals(meal_number);
CREATE INDEX idx_system_notes_number ON system_notes(note_number);

-- Verify data integrity
-- VERIFICATION: system_notes = 9 rows | meals = 40 rows | Total = 49 rows

COMMIT;
