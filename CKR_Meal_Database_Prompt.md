# CKR FITNESS — MEAL DATABASE → SUPABASE SQL PROMPT

## YOUR TASK
Convert the complete meal database below into production-ready PostgreSQL SQL code for Supabase.
Generate:
1. `CREATE TABLE` statements with correct data types
2. `INSERT INTO` statements for every single row — no row skipped
3. A `system_notes` table for all 9 system-level rules

Do NOT skip any column. Do NOT summarise. Output raw SQL only — no markdown fences, no explanations.

---

## DATABASE SCHEMA TO CREATE

### Table 1: `system_notes`
| Column | Type |
|---|---|
| id | SERIAL PRIMARY KEY |
| note_number | INTEGER |
| title | TEXT |
| description | TEXT |

### Table 2: `meals`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PRIMARY KEY | |
| meal_number | INTEGER | e.g. 1 for Overnight Oats |
| meal_name | TEXT | e.g. 'Overnight Oats' |
| meal_type | TEXT | 'Breakfast' or 'Lunch / Dinner' |
| diet | TEXT | 'Veg' or 'Non-Veg' |
| cal_bracket | TEXT | e.g. '350–400 kcal' |
| is_shoot_priority | BOOLEAN | TRUE if ★ present in cal_bracket |
| quantities | TEXT | Full ingredient string exactly as written |
| calories | INTEGER | |
| protein_g | NUMERIC(5,1) | |
| carbs_g | NUMERIC(5,1) | |
| fat_g | NUMERIC(5,1) | |
| client_tags | TEXT[] | Array, e.g. ARRAY['Busy','Standard'] |
| allergens | TEXT | Raw allergen string |
| notes | TEXT | |
| rating | INTEGER | Default 0 |
| base_description | TEXT | The BASE (fixed) line for this meal group |
| protein_anchor | TEXT | The PROTEIN ANCHOR line for this meal group |
| meal_section | TEXT | 'Breakfast' or 'Lunch/Dinner' |

---

## SYSTEM NOTES DATA

| # | Title | Description |
|---|---|---|
| 1 | MIXED VEGETABLES STANDARD | 150g total · Core (pick 3–4): cucumber, carrot, capsicum, beans, broccoli · Optional: spinach, lettuce, onion, zucchini, cherry tomatoes · Approx 55 cal, 3g protein, 10g carbs, 0g fat |
| 2 | SAME MEAL RULE | App must never assign the same meal to both lunch AND dinner slot on the same day. Different meal must show for each slot even if both are tagged Lunch/Dinner. |
| 3 | VEG MEAL PROTEIN | Veg meals may have slightly lower protein in bracket 1 (350–400 kcal). App should prioritise non-veg options for high protein bracket 1 clients. Acceptable for standard and vegetarian clients. |
| 4 | PANEER STANDARD | Use Milky Mist High Protein Paneer (204 cal, 25g protein per 100g). For US clients: use any high protein paneer from Indian grocery store (Patel Brothers, India Bazaar etc). |
| 5 | PROTEIN POWDER STANDARD | Use any whey protein isolate. Macros based on 25g = 94 cal, 20.2g protein (MFP: Protein World Whey Isolate). Use grams not scoops in all recipes. |
| 6 | GREEK YOGURT STANDARD | Use Oikos Triple Zero for US clients (1 cup = 150g = 90 cal, 15g protein). Any plain non-fat Greek yogurt works. Macros may vary slightly by brand. |
| 7 | BREAD STANDARD | Use Dave's Killer Bread Organic Supreme Sourdough. 1 slice = 54g = 140 cal, 6g protein, 25g carbs, 2g fat. |
| 8 | CHICKEN STANDARD | Chicken breast boneless raw. 100g = 125 cal, 24.6g protein, 2.6g carbs, 1.8g fat (MFP verified). |
| 9 | SPICES NOTE | All spices (turmeric, cumin, coriander, chilli powder, salt, ginger) add zero calories. Not listed in quantities. Clients can use freely. |

---

## MEAL DATA — ALL 10 MEALS, ALL 40 ROWS

> Each meal has 4 calorie bracket variants. Every row must become one INSERT.

---

### MEAL 1 — OVERNIGHT OATS
- **Section:** Breakfast (Meals 1–6)
- **Diet:** Veg
- **Meal Type:** Breakfast
- **BASE (fixed):** Unsweetened almond milk 150ml · Chia seeds 8g · Mixed berries 50g · Almonds 8g
- **PROTEIN ANCHOR:** Whey protein isolate — only oats + protein isolate change

| Cal Bracket | Shoot Priority | Quantities | Cal | Protein | Carbs | Fat | Client Tags | Allergens | Notes | Rating |
|---|---|---|---|---|---|---|---|---|---|---|
| 350–400 kcal | FALSE | Rolled oats 40g · Unsweetened almond milk 150ml · Whey protein isolate 25g · Chia seeds 8g · Mixed berries 50g · Almonds 8g | 377 | 30 | 38 | 12 | Sweet Craving, Busy, Standard | Nuts · Dairy if using whey isolate | Verified MFP — 377 cal, 30g protein. | 0 |
| 400–450 kcal ★ | TRUE | Rolled oats 50g · Unsweetened almond milk 150ml · Whey protein isolate 30g · Chia seeds 8g · Mixed berries 50g · Almonds 8g | 434 | 35 | 46 | 13 | Sweet Craving, Busy, Standard | Nuts · Dairy if using whey isolate | SHOOT PRIORITY. Verified MFP — 434 cal, 35g protein. | 0 |
| 450–500 kcal ★ | TRUE | Rolled oats 60g · Unsweetened almond milk 150ml · Whey protein isolate 35g · Chia seeds 8g · Mixed berries 50g · Almonds 8g | 491 | 40 | 53 | 14 | Sweet Craving, Busy, Standard | Nuts · Dairy if using whey isolate | SHOOT PRIORITY. Verified MFP — 491 cal, 40g protein. | 0 |
| 500–550 kcal | FALSE | Rolled oats 70g · Unsweetened almond milk 150ml · Whey protein isolate 40g · Chia seeds 8g · Mixed berries 50g · Almonds 8g | 547 | 46 | 60 | 15 | Sweet Craving, Busy, Standard | Nuts · Dairy if using whey isolate | Verified MFP — 547 cal, 46g protein. Shoot next batch. | 0 |

---

### MEAL 2 — BLUEBERRY CHIA PUDDING
- **Section:** Breakfast
- **Diet:** Veg
- **Meal Type:** Breakfast
- **BASE (fixed):** Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g = 300 cal, 8g protein
- **PROTEIN ANCHOR:** Oikos Triple Zero — only yogurt quantity changes

| Cal Bracket | Shoot Priority | Quantities | Cal | Protein | Carbs | Fat | Client Tags | Allergens | Notes | Rating |
|---|---|---|---|---|---|---|---|---|---|---|
| 350–400 kcal | FALSE | Oikos Triple Zero 150g (1 cup) · Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g | 390 | 23 | 39 | 18 | Sweet Craving, Busy | Dairy · Nuts | Use Oikos Triple Zero. Any plain non-fat Greek yogurt works. | 0 |
| 400–450 kcal ★ | TRUE | Oikos Triple Zero 225g (1.5 cups) · Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g | 435 | 31 | 43 | 18 | Sweet Craving, Busy | Dairy · Nuts | SHOOT PRIORITY. Verified MFP — 435 cal, 31g protein. | 0 |
| 450–500 kcal ★ | TRUE | Oikos Triple Zero 300g (2 cups) · Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g | 480 | 38 | 46 | 18 | Sweet Craving, Busy | Dairy · Nuts | SHOOT PRIORITY. 2 cups Oikos. | 0 |
| 500–550 kcal | FALSE | Oikos Triple Zero 375g (2.5 cups) · Unsweetened almond milk 150ml · Blueberries 125g · Chia seeds 25g · Almonds 10g · Honey 5g | 525 | 45 | 50 | 18 | Sweet Craving, Busy | Dairy · Nuts | 2.5 cups Oikos. Only yogurt increases. | 0 |

---

### MEAL 3 — EGG AVOCADO TOAST
- **Section:** Breakfast
- **Diet:** Non-Veg
- **Meal Type:** Breakfast
- **BASE (fixed):** Dave's Killer Bread 1 slice 54g · Avocado 35g · Oil 5g = 240 cal, 6.7g protein
- **PROTEIN ANCHOR:** Whole eggs + Egg whites — only egg combination changes

| Cal Bracket | Shoot Priority | Quantities | Cal | Protein | Carbs | Fat | Client Tags | Allergens | Notes | Rating |
|---|---|---|---|---|---|---|---|---|---|---|
| 350–400 kcal | FALSE | Whole egg 1 · Egg white 4 · Dave's Killer Bread 1 slice 54g · Avocado 35g · Oil 5g | 380 | 27 | 32 | 17 | Busy, Standard | Eggs · Gluten | Verified MFP — 380 cal, 27g protein. | 0 |
| 400–450 kcal ★ | TRUE | Whole egg 2 · Egg white 3 · Dave's Killer Bread 1 slice 54g · Avocado 35g · Oil 5g | 435 | 31 | 32 | 22 | Busy, Standard | Eggs · Gluten | SHOOT PRIORITY. Verified MFP — 435 cal, 31g protein. | 0 |
| 450–500 kcal ★ | TRUE | Whole egg 2 · Egg white 4 · Dave's Killer Bread 1 slice 54g · Avocado 35g · Oil 5g | 452 | 33 | 32 | 22 | Busy, Standard | Eggs · Gluten | SHOOT PRIORITY. Verified MFP — 452 cal, 33g protein. | 0 |
| 500–550 kcal | FALSE | Whole egg 3 · Egg white 4 · Dave's Killer Bread 1 slice 54g · Avocado 35g · Oil 5g | 524 | 40 | 32 | 27 | Busy, Standard | Eggs · Gluten | Verified MFP — 524 cal, 40g protein. Shoot next batch. | 0 |

---

### MEAL 4 — SCRAMBLED EGG + AVOCADO + SWEET POTATO
- **Section:** Breakfast
- **Diet:** Non-Veg
- **Meal Type:** Breakfast
- **BASE (fixed):** Sweet potato boiled 150g · Avocado 35g · Oil 5g = 229 cal, 3.1g protein
- **PROTEIN ANCHOR:** Whole eggs + Egg whites. Light Indian spicing optional.

| Cal Bracket | Shoot Priority | Quantities | Cal | Protein | Carbs | Fat | Client Tags | Allergens | Notes | Rating |
|---|---|---|---|---|---|---|---|---|---|---|
| 350–400 kcal | FALSE | Whole egg 1 · Egg white 4 · Sweet potato boiled 150g · Avocado 35g · Oil 5g | 369 | 24 | 34 | 15 | Busy, Standard | Eggs | Verified MFP — 369 cal, 24g protein. | 0 |
| 400–450 kcal ★ | TRUE | Whole egg 2 · Egg white 3 · Sweet potato boiled 150g · Avocado 35g · Oil 5g | 424 | 28 | 34 | 20 | Busy, Standard | Eggs | SHOOT PRIORITY. | 0 |
| 450–500 kcal ★ | TRUE | Whole egg 2 · Egg white 4 · Sweet potato boiled 150g · Avocado 35g · Oil 5g | 441 | 31 | 34 | 20 | Busy, Standard | Eggs | SHOOT PRIORITY. | 0 |
| 500–550 kcal | FALSE | Whole egg 3 · Egg white 4 · Sweet potato boiled 150g · Avocado 35g · Oil 5g | 513 | 37 | 34 | 25 | Busy, Standard | Eggs | Shoot next batch. | 0 |

---

### MEAL 5 — MOONG DAL CHILLA + GREEK YOGURT
- **Section:** Breakfast
- **Diet:** Veg
- **Meal Type:** Breakfast
- **BASE (fixed):** Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g = 100 cal, 2g protein
- **PROTEIN ANCHOR:** Green moong dal raw + Oikos Triple Zero
- **Prep Note:** Soak moong dal 2 hours. Blend with ginger. Add veggies + spices.

| Cal Bracket | Shoot Priority | Quantities | Cal | Protein | Carbs | Fat | Client Tags | Allergens | Notes | Rating |
|---|---|---|---|---|---|---|---|---|---|---|
| 350–400 kcal | FALSE | Green moong dal raw 50g · Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g · Oikos Triple Zero 150g (1 cup) | 364 | 28 | 59 | 6 | Standard, Vegetarian | Dairy | Verified MFP — 364 cal, 28g protein. Soak moong 2 hrs. | 0 |
| 400–450 kcal ★ | TRUE | Green moong dal raw 60g · Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g · Oikos Triple Zero 187g (1.25 cups) | 421 | 35 | 69 | 6 | Standard, Vegetarian | Dairy | SHOOT PRIORITY. Verified MFP — 421 cal, 35g protein. | 0 |
| 450–500 kcal ★ | TRUE | Green moong dal raw 70g · Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g · Oikos Triple Zero 187g (1.25 cups) | 456 | 37 | 77 | 6 | Standard, Vegetarian | Dairy | SHOOT PRIORITY. Verified MFP — 456 cal, 37g protein. | 0 |
| 500–550 kcal | FALSE | Green moong dal raw 70g · Oil 5g · Carrots 50g · Red bell pepper 50g · Onion 50g · Oikos Triple Zero 225g (1.5 cups) | 491 | 41 | 78 | 6 | Standard, Vegetarian | Dairy | Verified MFP — 491 cal, 41g protein. Shoot next batch. | 0 |

---

### MEAL 6 — BESAN CHILLA + GREEK YOGURT
- **Section:** Breakfast
- **Diet:** Veg
- **Meal Type:** Breakfast
- **BASE (fixed):** Oil 5g · Onion 50g · Red bell pepper 50g = 80 cal, 1g protein
- **PROTEIN ANCHOR:** Besan + Oikos Triple Zero
- **Prep Note:** No soaking needed. Mix besan with water + spices. Cook on pan 10 mins.

| Cal Bracket | Shoot Priority | Quantities | Cal | Protein | Carbs | Fat | Client Tags | Allergens | Notes | Rating |
|---|---|---|---|---|---|---|---|---|---|---|
| 350–400 kcal | FALSE | Besan 50g · Oil 5g · Onion 50g · Red bell pepper 50g · Oikos Triple Zero 150g (1 cup) | 363 | 27 | 49 | 9 | Busy, Standard, Vegetarian | Dairy | Verified MFP — 363 cal, 27g protein. No soaking needed. | 0 |
| 400–450 kcal ★ | TRUE | Besan 60g · Oil 5g · Onion 50g · Red bell pepper 50g · Oikos Triple Zero 187g (1.25 cups) | 424 | 33 | 58 | 9 | Busy, Standard, Vegetarian | Dairy | SHOOT PRIORITY. Verified MFP — 424 cal, 33g protein. | 0 |
| 450–500 kcal ★ | TRUE | Besan 70g · Oil 5g · Onion 50g · Red bell pepper 50g · Oikos Triple Zero 187g (1.25 cups) | 463 | 35 | 65 | 10 | Busy, Standard, Vegetarian | Dairy | SHOOT PRIORITY. Verified MFP — 463 cal, 35g protein. | 0 |
| 500–550 kcal | FALSE | Besan 70g · Oil 5g · Onion 50g · Red bell pepper 50g · Oikos Triple Zero 225g (1.5 cups) | 486 | 39 | 66 | 10 | Busy, Standard, Vegetarian | Dairy | Verified MFP — 486 cal, 39g protein. Shoot next batch. | 0 |

---

### MEAL 7 — CHICKEN BREAST + RICE + MIXED VEGETABLES
- **Section:** Lunch/Dinner (Meals 7–10)
- **Diet:** Non-Veg
- **Meal Type:** Lunch / Dinner
- **BASE (fixed):** White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein
- **PROTEIN ANCHOR:** Chicken breast boneless raw (100g = 125 cal, 24.6g protein)
- **Prep Note:** Light Indian spicing optional.

| Cal Bracket | Shoot Priority | Quantities | Cal | Protein | Carbs | Fat | Client Tags | Allergens | Notes | Rating |
|---|---|---|---|---|---|---|---|---|---|---|
| 350–400 kcal | FALSE | Chicken breast raw 100g · White rice raw 50g · Oil 5g · Mixed vegetables 150g | 399 | 30 | 55 | 7 | Busy, Standard | None | Verified MFP — 399 cal, 30g protein. Meal prep friendly. | 0 |
| 400–450 kcal ★ | TRUE | Chicken breast raw 120g · White rice raw 50g · Oil 5g · Mixed vegetables 150g | 426 | 35 | 56 | 8 | Busy, Standard | None | SHOOT PRIORITY. Verified MFP — 426 cal, 35g protein. | 0 |
| 450–500 kcal ★ | TRUE | Chicken breast raw 150g · White rice raw 50g · Oil 5g · Mixed vegetables 150g | 464 | 43 | 56 | 8 | Busy, Standard | None | SHOOT PRIORITY. Verified MFP — 464 cal, 43g protein. | 0 |
| 500–550 kcal | FALSE | Chicken breast raw 200g · White rice raw 50g · Oil 5g · Mixed vegetables 150g | 526 | 55 | 58 | 9 | Busy, Standard | None | Verified MFP — 526 cal, 55g protein. Shoot next batch. | 0 |

---

### MEAL 8 — CHICKEN BREAST + QUINOA + MIXED VEGETABLES
- **Section:** Lunch/Dinner
- **Diet:** Non-Veg
- **Meal Type:** Lunch / Dinner
- **BASE (fixed):** Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g = 281 cal, 9g protein
- **PROTEIN ANCHOR:** Chicken breast boneless raw
- **Note:** Higher protein + fiber vs rice version.

| Cal Bracket | Shoot Priority | Quantities | Cal | Protein | Carbs | Fat | Client Tags | Allergens | Notes | Rating |
|---|---|---|---|---|---|---|---|---|---|---|
| 350–400 kcal | FALSE | Chicken breast raw 100g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g | 398 | 34 | 47 | 10 | Busy, Standard | None | Verified MFP — 398 cal, 34g protein. | 0 |
| 400–450 kcal ★ | TRUE | Chicken breast raw 120g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g | 431 | 39 | 48 | 11 | Busy, Standard | None | SHOOT PRIORITY. Verified MFP — 431 cal, 39g protein. | 0 |
| 450–500 kcal ★ | TRUE | Chicken breast raw 150g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g | 469 | 46 | 49 | 11 | Busy, Standard | None | SHOOT PRIORITY. Verified MFP — 469 cal, 46g protein. | 0 |
| 500–550 kcal | FALSE | Chicken breast raw 200g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g | 531 | 59 | 50 | 12 | Busy, Standard | None | Verified MFP — 531 cal, 59g protein. Shoot next batch. | 0 |

---

### MEAL 9 — PANEER RICE + MIXED VEGETABLES
- **Section:** Lunch/Dinner
- **Diet:** Veg
- **Meal Type:** Lunch / Dinner
- **BASE (fixed):** White rice raw 50g · Oil 5g · Mixed vegetables 150g = 276 cal, 6g protein
- **PROTEIN ANCHOR:** Milky Mist High Protein Paneer (100g = 204 cal, 25g protein)
- **Note:** US: any high protein paneer from Indian grocery store. Bracket 1 protein 21g — acceptable. App prioritise non-veg for high protein bracket 1 clients.

| Cal Bracket | Shoot Priority | Quantities | Cal | Protein | Carbs | Fat | Client Tags | Allergens | Notes | Rating |
|---|---|---|---|---|---|---|---|---|---|---|
| 350–400 kcal | FALSE | High protein paneer 60g · White rice raw 50g · Oil 5g · Mixed vegetables 150g | 398 | 21 | 56 | 11 | Standard, Vegetarian | Dairy | Veg meal — bracket 1 protein 21g. Acceptable. Prioritise non-veg for high protein clients. | 0 |
| 400–450 kcal ★ | TRUE | High protein paneer 80g · White rice raw 50g · Oil 5g · Mixed vegetables 150g | 439 | 26 | 57 | 13 | Standard, Vegetarian | Dairy | SHOOT PRIORITY. Verified MFP — 439 cal, 26g protein. | 0 |
| 450–500 kcal ★ | TRUE | High protein paneer 100g · White rice raw 50g · Oil 5g · Mixed vegetables 150g | 480 | 31 | 58 | 15 | Standard, Vegetarian | Dairy | SHOOT PRIORITY. Verified MFP — 480 cal, 31g protein. | 0 |
| 500–550 kcal | FALSE | High protein paneer 120g · White rice raw 50g · Oil 5g · Mixed vegetables 150g | 521 | 36 | 59 | 16 | Standard, Vegetarian | Dairy | Verified MFP — 521 cal, 36g protein. Shoot next batch. | 0 |

---

### MEAL 10 — PANEER QUINOA + MIXED VEGETABLES
- **Section:** Lunch/Dinner
- **Diet:** Veg
- **Meal Type:** Lunch / Dinner
- **BASE (fixed):** Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g = 281 cal, 9g protein
- **PROTEIN ANCHOR:** Milky Mist High Protein Paneer
- **Note:** Higher protein + fiber vs paneer rice. US: any high protein paneer from Indian grocery store.

| Cal Bracket | Shoot Priority | Quantities | Cal | Protein | Carbs | Fat | Client Tags | Allergens | Notes | Rating |
|---|---|---|---|---|---|---|---|---|---|---|
| 350–400 kcal | FALSE | High protein paneer 60g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g | 398 | 24 | 48 | 14 | Standard, Vegetarian | Dairy | Verified MFP — 398 cal, 24g protein. Better protein than paneer rice. | 0 |
| 400–450 kcal ★ | TRUE | High protein paneer 80g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g | 444 | 30 | 49 | 16 | Standard, Vegetarian | Dairy | SHOOT PRIORITY. Verified MFP — 444 cal, 30g protein. | 0 |
| 450–500 kcal ★ | TRUE | High protein paneer 100g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g | 485 | 34 | 51 | 17 | Standard, Vegetarian | Dairy | SHOOT PRIORITY. Verified MFP — 485 cal, 34g protein. | 0 |
| 500–550 kcal | FALSE | High protein paneer 120g · Quinoa uncooked 50g · Oil 5g · Mixed vegetables 150g | 526 | 39 | 52 | 19 | Standard, Vegetarian | Dairy | Verified MFP — 526 cal, 39g protein. Shoot next batch. | 0 |

---

## TOTAL RECORD COUNT TO VERIFY

- system_notes table: **9 rows**
- meals table: **40 rows** (10 meals × 4 calorie brackets each)
- Grand total inserts: **49 rows**

After generating SQL, confirm at the end:
```
-- VERIFICATION: system_notes = 9 rows | meals = 40 rows | Total = 49 rows
```

---

## ADDITIONAL SQL REQUIREMENTS

1. Use `TEXT[]` for `client_tags` — store as a PostgreSQL array literal e.g. `ARRAY['Busy', 'Standard']`
2. Escape all single quotes in text fields using `''` (double single quote)
3. Add `created_at TIMESTAMPTZ DEFAULT NOW()` to both tables
4. Add an index: `CREATE INDEX idx_meals_meal_type ON meals(meal_type);`
5. Add an index: `CREATE INDEX idx_meals_diet ON meals(diet);`
6. Add an index: `CREATE INDEX idx_meals_cal_bracket ON meals(cal_bracket);`
7. Wrap everything in a transaction: `BEGIN;` ... `COMMIT;`
8. Use `-- MEAL 1`, `-- MEAL 2` etc. as comments before each meal's inserts for readability

---

*Source: CKR FITNESS — COMPLETE MEAL DATABASE — All values verified via MyFitnessPal*
*Generated for Supabase PostgreSQL. Database in progress — more meals being added.*
