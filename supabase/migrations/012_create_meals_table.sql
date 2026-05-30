-- Create meals table for admin management
-- Allows admins to view, edit, add, and delete meals
-- Initially seeded with 54 meals from app data

BEGIN;

-- Create meals table with production schema
CREATE TABLE IF NOT EXISTS meals (
  id SERIAL PRIMARY KEY,
  meal_number INTEGER NOT NULL,
  meal_name TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch / Dinner', 'Snack')),
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
  rating INTEGER DEFAULT 0 CHECK (rating >= 0 AND rating <= 10),
  base_description TEXT,
  protein_anchor TEXT,
  meal_section TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_meals_meal_type ON meals(meal_type);
CREATE INDEX IF NOT EXISTS idx_meals_diet ON meals(diet);
CREATE INDEX IF NOT EXISTS idx_meals_cal_bracket ON meals(cal_bracket);
CREATE INDEX IF NOT EXISTS idx_meals_meal_number ON meals(meal_number);
CREATE INDEX IF NOT EXISTS idx_meals_rating ON meals(rating DESC);

-- Enable RLS for meals table
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all meals" ON meals;
DROP POLICY IF EXISTS "Admins can insert meals" ON meals;
DROP POLICY IF EXISTS "Admins can update meals" ON meals;
DROP POLICY IF EXISTS "Admins can delete meals" ON meals;

-- RLS Policies: Only admins can view/edit meals
CREATE POLICY "Admins can view all meals" ON meals
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  ));

CREATE POLICY "Admins can insert meals" ON meals
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  ));

CREATE POLICY "Admins can update meals" ON meals
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  ));

CREATE POLICY "Admins can delete meals" ON meals
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM admins WHERE admins.id = auth.uid()
  ));

-- Trigger to auto-update updated_at timestamp
DROP TRIGGER IF EXISTS meals_update_timestamp ON meals;

CREATE OR REPLACE FUNCTION update_meals_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meals_update_timestamp
BEFORE UPDATE ON meals
FOR EACH ROW
EXECUTE FUNCTION update_meals_timestamp();

-- Note: Seed data (54 meals) will be inserted via app initialization
-- See: useData.init() calls seedMealsIfEmpty() on app startup

-- Verify structure
-- SELECT COUNT(*) FROM meals; -- Should be 54 after seeding

COMMIT;
