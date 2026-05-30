-- Fix plans table RLS policies to properly enforce deletion
-- Trainers can only delete plans for their own clients
-- Admins can delete any plan

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Trainers can select their own client plans" ON plans;
DROP POLICY IF EXISTS "Admins can select all plans" ON plans;
DROP POLICY IF EXISTS "Trainers can delete their own client plans" ON plans;
DROP POLICY IF EXISTS "Admins can delete any plan" ON plans;

-- SELECT: Trainers see plans for their clients, Admins see all
CREATE POLICY "Trainers can select their own client plans" ON plans
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM trainers WHERE is_active = true
        AND id = (SELECT trainer_id FROM clients WHERE clients.id = plans.client_id)
    )
    OR
    auth.uid() IN (SELECT id FROM admins)
  );

-- DELETE: Trainers can only delete plans for their clients, Admins can delete any
CREATE POLICY "Trainers can delete their own client plans" ON plans
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT id FROM trainers WHERE is_active = true
        AND id = (SELECT trainer_id FROM clients WHERE clients.id = plans.client_id)
    )
    OR
    auth.uid() IN (SELECT id FROM admins)
  );

-- UPDATE: Trainers can update plans for their clients, Admins can update any
CREATE POLICY "Trainers can update their own client plans" ON plans
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM trainers WHERE is_active = true
        AND id = (SELECT trainer_id FROM clients WHERE clients.id = plans.client_id)
    )
    OR
    auth.uid() IN (SELECT id FROM admins)
  );

-- INSERT: Trainers can create plans for their clients, Admins can create any
CREATE POLICY "Trainers can insert plans for their clients" ON plans
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM trainers WHERE is_active = true
        AND id = (SELECT trainer_id FROM clients WHERE clients.id = plans.client_id)
    )
    OR
    auth.uid() IN (SELECT id FROM admins)
  );

COMMIT;
